import "./index.css";
import "./App.css";
import produce from "immer";

import {
  useDispatch as _useDispatch,
  useSelector as _useSelector,
} from "react-redux";
import { AppEvent } from "./event";

export type State = {
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

export function reducer(
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
  event: AppEvent
): State {
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
