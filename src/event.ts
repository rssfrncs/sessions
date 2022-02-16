export type AppEvent =
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
