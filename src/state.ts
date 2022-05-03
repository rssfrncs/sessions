import "./index.css";
import "./App.css";
import produce from "immer";

import {
  useDispatch as _useDispatch,
  useSelector as _useSelector,
} from "react-redux";
import { AppEvent } from "./event";

export type State = {
  publishers: {
    element: Record<string, HTMLVideoElement>;
    state: Record<
      string,
      "publishing" | "not publishing" | "attempting to publish"
    >;
  };
  session: {
    state: "connected" | "reconnecting" | "connecting" | "disconnected";
  };
  subscribers: {
    elements: Record<string, HTMLVideoElement>;
  };
  devices: MediaDeviceInfo[];
  selectedDevice: string;
  sharingVideo: boolean;
  sharingAudio: boolean;
};

export function reducer(
  state: State = {
    publishers: {
      element: {},
      state: {},
    },
    session: { state: "disconnected" },
    subscribers: {
      elements: {},
    },
    devices: [],
    selectedDevice: "",
    sharingVideo: false,
    sharingAudio: false,
  },
  event: AppEvent
): State {
  return produce(state, (draft) => {
    switch (event.type) {
      case "[saga] publisher published": {
        // @ts-ignore
        draft.publishers.state[event.payload.publisher.streamId] =
          "attempting to publish" as const;
        break;
      }
      case "[saga] session reconnecting": {
        draft.session.state = "reconnecting";
        break;
      }
      case "[saga] session reconnected": {
        draft.session.state = "connected";
        break;
      }
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
        console.log("el created", event.payload);
        // @ts-ignore
        draft.publishers.element[event.payload.publisher.streamId] =
          event.payload.el;
        break;
      }
      case "[saga] subscriber stream video element created": {
        // @ts-ignore
        draft.subscribers.elements[event.payload.subscriber.id!] =
          event.payload.el;
        break;
      }
      case "[saga] stream destroyed": {
        delete draft.subscribers.elements[event.payload.stream.streamId];
        break;
      }
      case "[saga] connected to session": {
        draft.session.state = "connected";
        break;
      }
      case "[saga] publisher stream created": {
        // @ts-ignore
        draft.publishers.state[event.payload.publisher.streamId] =
          "publishing" as const;
        break;
      }
      case "[saga] publisher stream destroyed": {
        // @ts-ignore
        draft.publishers.state[event.payload.publisher.streamId] =
          "not publishing" as const;
        break;
      }
      case "[ui] device selector changed": {
        draft.selectedDevice = event.payload.value;
        break;
      }
      case "[saga] session initialized": {
        draft.session.state = "connecting";
        break;
      }
      case "[saga] disconnected from session": {
        draft.session.state = "disconnected";
        draft.publishers = {
          state: {},
          element: {},
        };
        draft.subscribers = {
          elements: {},
        };
        break;
      }
    }
  });
}

export const selector = {
  sessionConnectionState: (state: State) => state.session.state,
} as const;
