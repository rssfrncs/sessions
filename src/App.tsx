import "./App.css";

import { Provider } from "react-redux";
import { useCallback } from "react";
import { store, useDispatch, useSelector } from ".";
import { selector } from "./state";
import { assertNever } from "./assert-never";

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
    Object.entries(state.subscribers.elements)
  );
  const sessionState = useSelector(selector.sessionConnectionState);
  const sessionName = "room 001";
  const ConnectButton = () => {
    switch (sessionState) {
      case "connected": {
        return (
          <button
            className="w-min bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
            onClick={() =>
              void dispatch({ type: "[ui] clicked disconnect button" })
            }
          >
            disconnect
          </button>
        );
      }
      case "connecting": {
        return (
          <button
            disabled
            className="w-min bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
          >
            connecting
          </button>
        );
      }
      case "disconnected": {
        return (
          <button
            className="w-min bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
            onClick={() =>
              void dispatch({ type: "[ui] clicked connect button" })
            }
          >
            connect
          </button>
        );
      }
      case "reconnecting": {
        return (
          <button
            disabled
            className="w-min bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
          >
            re-connecting!
          </button>
        );
      }
      default: {
        assertNever(sessionState);
      }
    }
  };
  return (
    <div className="bg-slate-800 text-white w-full p-10 grid grid-flow-row auto-rows-max gap-5">
      <h1 className="text-3xl font-bold">Welcome to {sessionName}</h1>
      <ConnectButton />
      <PublisherControls />
      <div
        style={{
          display: "grid",
          gridAutoFlow: "column",
        }}
      >
        {el ? <SubscriberVideo video={el} /> : null}
        {subEls.map(([id, el]) => (
          <SubscriberVideo key={id} video={el} />
        ))}
      </div>
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
  return <div ref={setEl} />;
}

function PublisherControls() {
  const dispatch = useDispatch();
  const sessionState = useSelector(selector.sessionConnectionState);
  const publishingState = useSelector((state) => state.publisher.state);
  const sharingVideo = useSelector((state) => state.sharingVideo);
  const sharingAudio = useSelector((state) => state.sharingAudio);
  const PublishButton = () => {
    switch (publishingState) {
      case "publishing": {
        return (
          <button
            className="bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
            onClick={() =>
              void dispatch({
                type: "[ui] clicked stop publishing button",
              })
            }
          >
            leave
          </button>
        );
      }
      case "not publishing": {
        return (
          <button
            className="bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
            onClick={() =>
              void dispatch({
                type: "[ui] clicked start publishing button",
              })
            }
          >
            join
          </button>
        );
      }
      case "attempting to publish": {
        return (
          <button
            disabled
            className="bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
          >
            starting
          </button>
        );
      }
      default: {
        assertNever(publishingState);
      }
    }
  };
  return (
    <div className="grid grid-flow-col auto-cols-max gap-5">
      {sessionState === "connected" ? <PublishButton /> : null}
      {publishingState === "publishing" ? (
        <>
          <button
            className="bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
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
            className="bg-transparent hover:bg-slate-900 text-white font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded"
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
          <Devices kind="videoinput" />
          <Devices kind="audioinput" />
        </>
      ) : null}
    </div>
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
      className="font-semibold py-2 px-4 border text-white bg-slate-900 border-blue-500 hover:border-transparent rounded"
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
