import "./App.css";
import * as OT from "@opentok/client";
import produce from "immer";
import { applyMiddleware, createStore } from "redux";
import SM, { eventChannel } from "redux-saga";
import { all, call, fork, put, take, takeEvery } from "typed-redux-saga";
import { composeWithDevTools } from "redux-devtools-extension";

import { Provider, useDispatch, useSelector } from "react-redux";
import { useCallback } from "react";

type State = {
  publisher: {
    state: "publishing" | "not publishing";
    element: HTMLVideoElement | null;
  };
  session: {
    state: "connected" | "disconnected";
  };
  subscribers: {
    elements: Record<string, HTMLVideoElement>;
  };
};

type Event =
  | {
      type: "publisher video element created";
      payload: {
        el: HTMLVideoElement;
      };
    }
  | {
      type: "subscriber stream video element created";
      payload: {
        subscriber: OT.Subscriber;
        el: HTMLVideoElement;
      };
    }
  | {
      type:
        | "connected to session"
        | "publisher stream created"
        | "publisher stream destroyed";
    };

function reducer(
  state: State = {
    publisher: { state: "not publishing", element: null },
    session: { state: "disconnected" },
    subscribers: {
      elements: {},
    },
  },
  event: Event
) {
  return produce(state, (draft) => {
    switch (event.type) {
      case "publisher video element created": {
        // @ts-ignore
        draft.publisher.element = event.payload.el;
        break;
      }
      case "subscriber stream video element created": {
        // @ts-ignore
        draft.subscribers.elements[event.payload.subscriber.id!] =
          event.payload.el;
        break;
      }
      case "connected to session": {
        draft.session.state = "connected";
        break;
      }
      case "publisher stream created": {
        draft.publisher.state = "publishing";
        break;
      }
      case "publisher stream destroyed": {
        draft.publisher.state = "not publishing";
        break;
      }
    }
  });
}

const sagaMiddleware = SM();

type PublisherEvent =
  | {
      type: "publisher stream created";
      payload: {
        stream: OT.Stream;
      };
    }
  | {
      type: "publisher video element created";
      payload: {
        el: HTMLVideoElement;
      };
    }
  | { type: "publisher stream destroyed" };
function* sagaPublisher(session: OT.Session) {
  while (true) {
    yield* take("clicked start publishing button");
    // @ts-ignore
    const publisher = OT.initPublisher({ insertDefaultUI: false });
    const channel = eventChannel<PublisherEvent>((emit) => {
      publisher.on({
        streamCreated: (event: any) => {
          emit({
            type: "publisher stream created",
            payload: {
              stream: event.stream,
            },
          });
        },
        videoElementCreated: (event: any) => {
          emit({
            type: "publisher video element created",
            payload: {
              el: event.element,
            },
          });
        },
        streamDestroyed: () => {
          emit({
            type: "publisher stream destroyed",
          });
        },
      });
      return () => void session.off();
    });
    session.publish(publisher);
    yield* takeEvery(channel, function* (event) {
      yield* put(event);
    });
    yield* take("clicked stop publishing button");
    session.unpublish(publisher);
    publisher.destroy();
  }
}

type SessionEvent =
  | {
      type: "stream created" | "stream destroyed";
      payload: {
        stream: OT.Stream;
      };
    }
  | {
      type:
        | "session reconnecting"
        | "session reconnected"
        | "session disconnected";
    };
function* sagaSessionEvents(session: OT.Session) {
  const channel = eventChannel<SessionEvent>((emit) => {
    session.on({
      streamCreated: (event: any) => {
        console.log("stream created:", event.stream);
        emit({
          type: "stream created",
          payload: {
            stream: event.stream,
          },
        });
      },
      streamDestroyed: (event: any) => {
        emit({
          type: "stream destroyed",
          payload: {
            stream: event.stream,
          },
        });
      },
      sessionReconnecting: function () {
        emit({
          type: "session reconnecting",
        });
      },
      sessionReconnected: function () {
        emit({
          type: "session reconnected",
        });
      },
      sessionDisconnected: function () {
        emit({
          type: "session disconnected",
        });
      },
    });
    return () => void session.off();
  });
  yield* takeEvery(channel, function* (event) {
    yield* put(event);
  });
}

function* sagaSubscriberCreator(session: OT.Session) {
  yield* takeEvery("stream created", function* (event: any) {
    const subscriber = session.subscribe(event.payload.stream, {
      // @ts-ignore
      insertDefaultUI: false,
    });
    const el = yield* call(
      () =>
        new Promise<HTMLVideoElement>((res) =>
          subscriber.on("videoElementCreated", function (event: any) {
            res(event.element);
          })
        )
    );
    yield* put({
      type: "subscriber stream video element created",
      payload: {
        subscriber,
        el,
      },
    });
  });
}

function* sagaSession() {
  yield* take("clicked connect button");
  const session = OT.initSession(
    process.env.REACT_APP_OT_API_KEY!,
    process.env.REACT_APP_OT_SESSION_ID!
  );
  yield* fork(sagaSessionEvents, session);
  yield* fork(sagaSubscriberCreator, session);
  yield* call(() => {
    return new Promise<OT.Session>((res) => {
      session.connect(process.env.REACT_APP_OT_SESSION_TOKEN!, (err) => {
        if (err) {
          console.error(err);
        } else {
          console.log("connected");
        }
      });
      session.on("sessionConnected", () => void res(session));
    });
  });
  yield* put({
    type: "connected to session",
  });
  yield* fork(sagaPublisher, session);
}

const store = createStore(
  reducer,
  composeWithDevTools(applyMiddleware(sagaMiddleware))
);

sagaMiddleware.run(sagaSession);

function App() {
  return (
    <Provider store={store}>
      <Session />
    </Provider>
  );
}

function Session() {
  const dispatch = useDispatch();
  const el = useSelector((state: State) => state.publisher.element);
  const subEls = useSelector((state: State) =>
    Object.values(state.subscribers.elements)
  );
  const connected = useSelector(
    (state: State) => state.session.state === "connected"
  );
  const publishing = useSelector(
    (state: State) => state.publisher.state === "publishing"
  );
  const setEl = useCallback(
    (containerEl: HTMLDivElement) => {
      if (containerEl && el) {
        containerEl.appendChild(el);
      }
    },
    [el]
  );
  return (
    <div>
      session
      <button onClick={() => void dispatch({ type: "clicked connect button" })}>
        {connected ? "disconnect" : "connect"}
      </button>
      <button
        onClick={() =>
          void dispatch({
            type: publishing
              ? "clicked stop publishing button"
              : "clicked start publishing button",
          })
        }
      >
        {publishing ? "stop" : "start"}
      </button>
      <div ref={setEl}></div>
      {subEls.map((el) => (
        <SubscriberVideo video={el} />
      ))}
    </div>
  );
}

function SubscriberVideo({ video }: { video: HTMLVideoElement }) {
  const setEl = useCallback(
    (containerEl: HTMLDivElement) => {
      if (containerEl && video) {
        containerEl.appendChild(video);
      }
    },
    [video]
  );
  return <div ref={setEl}></div>;
}

export default App;
