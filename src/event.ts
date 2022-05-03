import { Publisher } from "@opentok/client";

export type AppEvent =
  | {
      type: "[saga] publisher video element created";
      payload: {
        publisher: Publisher;
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
      type: "[saga] stream created" | "[saga] stream destroyed";
      payload: {
        stream: OT.Stream;
      };
    }
  | {
      type: "[saga] publisher stream created";
      payload: {
        publisher: Publisher;
        stream: OT.Stream;
      };
    }
  | {
      type:
        | "[saga] publisher published"
        | "[saga] publisher stream destroyed"
        | "[saga] publisher stream created";

      payload: {
        publisher: Publisher;
      };
    }
  | {
      type:
        | "[saga] session initialized"
        | "[saga] connected to session"
        | "[saga] session reconnecting"
        | "[saga] session reconnected"
        | "[saga] session disconnected"
        | "[saga] disconnected from session"
        | "[ui] clicked start publishing button"
        | "[ui] clicked stop publishing button"
        | "[ui] clicked disconnect button"
        | "[ui] clicked connect button"
        | "[ui] clicked mute video"
        | "[ui] clicked share video"
        | "[ui] clicked mute audio"
        | "[ui] clicked share audio";
    };
