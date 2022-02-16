import "./App.css";
import * as OT from "@opentok/client";
import produce from "immer";
import { applyMiddleware, createStore, Middleware, MiddlewareAPI } from "redux";
import SM, { eventChannel } from "redux-saga";
import {
  all,
  call,
  fork,
  put,
  select,
  take,
  takeEvery,
  takeLatest,
} from "typed-redux-saga";
import { composeWithDevTools } from "redux-devtools-extension";

import {
  Provider,
  useDispatch,
  useSelector as _useSelector,
  TypedUseSelectorHook,
} from "react-redux";
import { useCallback } from "react";
import logger from "redux-logger";

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
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  sharingVideo: boolean;
  sharingAudio: boolean;
};

const useSelector: TypedUseSelectorHook<State> = _useSelector;

type Event =
  | {
      type: "[saga] publisher video element created";
      payload: {
        el: HTMLVideoElement;
      };
    }
  | {
      type: "[saga] subscriber stream video element created";
      payload: {
        subscriber: OT.Subscriber;
        el: HTMLVideoElement;
      };
    }
  | {
      type: "[ui] device selector changed";
      payload: {
        value: string;
      };
    }
  | {
      type: "[saga] devices changed" | "[saga] devices loaded";
      payload: {
        devices: MediaDeviceInfo[];
      };
    }
  | {
      type:
        | "[saga] connected to session"
        | "[saga] publisher stream created"
        | "[saga] publisher stream destroyed"
        | "[ui] clicked stop publishing button"
        | "[ui] clicked connect button"
        | "[ui] clicked mute video"
        | "[ui] clicked share video"
        | "[ui] clicked mute audio"
        | "[ui] clicked share audio";
    };

function reducer(
  state: State = {
    publisher: { state: "not publishing", element: null },
    session: { state: "disconnected" },
    subscribers: {
      elements: {},
    },
    devices: [],
    selectedDevice: "",
    sharingVideo: false,
    sharingAudio: false,
  },
  event: Event
) {
  return produce(state, (draft) => {
    switch (event.type) {
      case "[ui] clicked mute video": {
        draft.sharingVideo = false;
        break;
      }
      case "[ui] clicked share video": {
        draft.sharingVideo = true;
        break;
      }
      case "[ui] clicked mute audio": {
        draft.sharingAudio = false;
        break;
      }
      case "[ui] clicked share audio": {
        draft.sharingAudio = true;
        break;
      }
      case "[saga] devices changed":
      case "[saga] devices loaded": {
        draft.devices = event.payload.devices;
        break;
      }
      case "[saga] publisher video element created": {
        // @ts-ignore
        draft.publisher.element = event.payload.el;
        break;
      }
      case "[saga] subscriber stream video element created": {
        // @ts-ignore
        draft.subscribers.elements[event.payload.subscriber.id!] =
          event.payload.el;
        break;
      }
      case "[saga] connected to session": {
        draft.session.state = "connected";
        break;
      }
      case "[saga] publisher stream created": {
        draft.publisher.state = "publishing";
        break;
      }
      case "[saga] publisher stream destroyed": {
        draft.publisher.state = "not publishing";
        break;
      }
      case "[ui] device selector changed": {
        draft.selectedDevice = event.payload.value;
        break;
      }
    }
  });
}

const sagaMiddleware = SM();

type PublisherEvent =
  | {
      type: "[saga] publisher stream created";
      payload: {
        stream: OT.Stream;
      };
    }
  | {
      type: "[saga] publisher video element created";
      payload: {
        el: HTMLVideoElement;
      };
    }
  | { type: "[saga] publisher stream destroyed" };
function* sagaPublisher(session: OT.Session) {
  while (true) {
    yield* take("[ui] clicked start publishing button");
    yield* fork(deviceWatcher);
    const publishVideo = yield* select((state: State) => state.sharingVideo);
    const publishAudio = yield* select((state: State) => state.sharingAudio);
    const publisher = OT.initPublisher({
      // @ts-ignore
      insertDefaultUI: false,
      publishVideo,
      publishAudio,
    });
    const channel = eventChannel<PublisherEvent>((emit) => {
      publisher.on({
        streamCreated: (event: any) => {
          emit({
            type: "[saga] publisher stream created",
            payload: {
              stream: event.stream,
            },
          });
        },
        videoElementCreated: (event: any) => {
          emit({
            type: "[saga] publisher video element created",
            payload: {
              el: event.element,
            },
          });
        },
        streamDestroyed: () => {
          emit({
            type: "[saga] publisher stream destroyed",
          });
        },
      });
      return () => void session.off();
    });
    session.publish(publisher);
    yield* takeEvery(channel, function* (event) {
      yield* put(event);
    });
    yield* takeLatest("[ui] clicked mute video", function* mutePublisher() {
      publisher.publishVideo(false);
    });
    yield* takeLatest("[ui] clicked share video", function* unmutePublisher() {
      publisher.publishVideo(true);
    });
    yield* takeLatest("[ui] clicked mute audio", function* mutePublisher() {
      publisher.publishAudio(false);
    });
    yield* takeLatest("[ui] clicked share audio", function* unmutePublisher() {
      publisher.publishAudio(true);
    });
    yield* take("[ui] clicked stop publishing button");
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
      type: "[saga] subscriber stream video element created",
      payload: {
        subscriber,
        el,
      },
    });
  });
}

function* deviceWatcher() {
  console.log("go");
  yield* call(() =>
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })
  );
  const devices = yield* call(() => navigator.mediaDevices.enumerateDevices());
  yield* put({
    type: "[saga] devices loaded",
    payload: {
      devices,
    },
  });
  const changeChannel = eventChannel<{ devices: MediaDeviceInfo[] }>((emit) => {
    navigator.mediaDevices.ondevicechange = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      emit({ devices });
    };
    return () => {
      navigator.mediaDevices.ondevicechange = null;
    };
  });
  while (true) {
    const { devices } = yield* take(changeChannel);
    yield* put({
      type: "[saga] devices changed",
      payload: {
        devices,
      },
    });
  }
}

function* sagaSession() {
  yield* take("[ui] clicked connect button");
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
    type: "[saga] connected to session",
  });
  yield* fork(sagaPublisher, session);
}

const store = createStore(
  reducer,
  composeWithDevTools(applyMiddleware(sagaMiddleware, logger))
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
      <button
        onClick={() => void dispatch({ type: "[ui] clicked connect button" })}
      >
        {connected ? "disconnect" : "connect"}
      </button>
      <PublisherControls />
      <Devices kind="videoinput" />
      <Devices kind="audioinput" />
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

function PublisherControls() {
  const dispatch = useDispatch();
  const connected = useSelector(
    (state: State) => state.session.state === "connected"
  );
  const publishing = useSelector(
    (state: State) => state.publisher.state === "publishing"
  );
  const sharingVideo = useSelector((state) => state.sharingVideo);
  const sharingAudio = useSelector((state) => state.sharingAudio);
  return (
    <>
      {connected ? (
        <button
          onClick={() =>
            void dispatch({
              type: publishing
                ? "[ui] clicked stop publishing button"
                : "[ui] clicked start publishing button",
            })
          }
        >
          {publishing ? "leave" : "join"}
        </button>
      ) : null}
      {publishing ? (
        <>
          <button
            onClick={() =>
              void dispatch({
                type: sharingVideo
                  ? "[ui] clicked mute video"
                  : "[ui] clicked share video",
              })
            }
          >
            {sharingVideo ? "mute" : "share"} video
          </button>
          <button
            onClick={() =>
              void dispatch({
                type: sharingAudio
                  ? "[ui] clicked mute audio"
                  : "[ui] clicked share audio",
              })
            }
          >
            {sharingAudio ? "mute" : "share"} audio
          </button>
        </>
      ) : null}
    </>
  );
}

function Devices({ kind }: { kind: MediaDeviceKind }) {
  const publishing = useSelector(
    (state: State) => state.publisher.state === "publishing"
  );
  const devices = useSelector((state) => state.devices);
  const dispatch = useDispatch();
  return publishing ? (
    <select
      onChange={(e) =>
        void dispatch({
          type: "[ui] device selector changed",
          payload: {
            value: e.target.value,
          },
        })
      }
    >
      {devices
        .filter((device) => device.kind === kind)
        .map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
    </select>
  ) : null;
}

export default App;
