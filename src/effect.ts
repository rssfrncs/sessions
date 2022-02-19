import "./index.css";
import "./App.css";
import * as OT from "@opentok/client";
import SM, { eventChannel, Task } from "redux-saga";
import {
  call,
  cancel,
  fork,
  put as _put,
  select,
  take as _take,
  takeEvery,
  takeLatest,
} from "typed-redux-saga";

import {
  useDispatch as _useDispatch,
  useSelector as _useSelector,
} from "react-redux";
import { State } from "./state";
import { AppEvent } from "./event";

export const sagaMiddleware = SM();

const put = (event: AppEvent) => _put(event);
const take = (type: AppEvent["type"]) =>
  // @ts-ignore
  _take(type);

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
    const channel = eventChannel<AppEvent>((emit) => {
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
    yield* put({
      type: "[saga] publisher published",
    });
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

function* sagaSessionEvents(session: OT.Session) {
  const channel = eventChannel<AppEvent>((emit) => {
    session.on({
      connectionCreated: (event: any) => {
        console.log("connectionCreated", event);
      },
      streamCreated: (event: any) => {
        emit({
          type: "[saga] stream created",
          payload: {
            stream: event.stream,
          },
        });
      },
      streamDestroyed: (event: any) => {
        emit({
          type: "[saga] stream destroyed",
          payload: {
            stream: event.stream,
          },
        });
      },
      sessionReconnecting: function () {
        emit({
          type: "[saga] session reconnecting",
        });
      },
      sessionReconnected: function () {
        emit({
          type: "[saga] session reconnected",
        });
      },
      sessionDisconnected: function () {
        emit({
          type: "[saga] disconnected from session",
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
  yield* takeEvery("[saga] stream created", function* (event: any) {
    const subscriber = session.subscribe(event.payload.stream, {
      // @ts-ignore
      insertDefaultUI: false,
    });
    subscriber.restrictFrameRate(false);
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
    // @ts-ignore
    const { devices } = yield* take(changeChannel);
    yield* put({
      type: "[saga] devices changed",
      payload: {
        devices,
      },
    });
  }
}

export function* sagaSession() {
  while (true) {
    let tasks: Task[] = [];
    yield* take("[ui] clicked connect button");
    const session = OT.initSession(
      process.env.REACT_APP_OT_API_KEY!,
      process.env.REACT_APP_OT_SESSION_ID!
    );
    yield* put({
      type: "[saga] session initialized",
    });
    tasks.push(yield* fork(sagaSessionEvents, session));
    tasks.push(yield* fork(sagaSubscriberCreator, session));
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
    tasks.push(yield* fork(sagaPublisher, session));
    yield* take("[ui] clicked disconnect button");
    session.disconnect();
    yield* cancel(tasks);
    yield* put({
      type: "[saga] disconnected from session",
    });
  }
}
