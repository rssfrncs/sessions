import "./App.css";

import { Provider } from "react-redux";
import { useCallback } from "react";
import { store, useDispatch, useSelector } from ".";

function App() {
  return (
    <Provider store={store}>
      <Session />
    </Provider>
  );
}

function Session() {
  const dispatch = useDispatch();
  const el = useSelector((state) => state.publisher.element);
  const subEls = useSelector((state) =>
    Object.values(state.subscribers.elements)
  );
  const connected = useSelector((state) => state.session.state === "connected");

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
  const connected = useSelector((state) => state.session.state === "connected");
  const publishing = useSelector(
    (state) => state.publisher.state === "publishing"
  );
  const sharingVideo = useSelector((state) => state.sharingVideo);
  const sharingAudio = useSelector((state) => state.sharingAudio);
  return (
    <>
      {connected ? (
        <button
          onClick={() =>
            void dispatch({
              // @ts-ignore ???
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
    (state) => state.publisher.state === "publishing"
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
