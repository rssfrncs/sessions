import "./App.css";

import { Provider } from "react-redux";
import { useCallback, useMemo } from "react";
import { store, useDispatch, useSelector } from ".";
import { selector } from "./state";
import { assertNever } from "./assert-never";
import layout from "opentok-layout-js";

function App() {
  return (
    <Provider store={store}>
      <Session />
    </Provider>
  );
}

function Session() {
  const dispatch = useDispatch();
  const els = useSelector((state) => Object.values(state.publishers.element));
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
  console.log(els, subEls);
  return (
    <div className="bg-slate-800 text-white w-full p-10 grid grid-flow-row auto-rows-max gap-5">
      <h1 className="text-3xl font-bold">Welcome to {sessionName}</h1>
      <ConnectButton />
      {<PublisherControls />}
      <div
        style={{
          display: "grid",
          gridAutoFlow: "column",
        }}
      >
        <Grid els={[...els, ...subEls.map(([, el]) => el)]} />
      </div>
    </div>
  );
}

function Grid({ els }: { els: HTMLVideoElement[] }) {
  const width = 500;
  const height = 500;
  const grid = useMemo(() => {
    const { boxes } = layout({
      containerWidth: width,
      containerHeight: height,
      maxRatio: 1.0 / (16 / 9),
      minRatio: 1,
    }).getLayout(
      els.map(() => ({
        big: false,
        height: 0,
        width: 0,
      }))
    );
    return boxes;
  }, [els, width, height]);
  console.log(grid, els);
  return (
    <div
      style={{
        position: "relative",
        height,
        width,
      }}
    >
      {grid.map((box, id) => (
        <div
          key={id}
          style={{
            position: "absolute",
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
        >
          <SubscriberVideo video={els[id]} />
        </div>
      ))}
    </div>
  );
}

function SubscriberVideo({ video }: { video: HTMLVideoElement }) {
  const setEl = useCallback(
    (containerEl: HTMLDivElement) => {
      if (containerEl && video) {
        video.style.height = "100%";
        video.style.width = "100%";
        video.style.objectFit = "cover";
        containerEl.appendChild(video);
      }
    },
    [video]
  );
  return <div style={{ width: "100%", height: "100%" }} ref={setEl} />;
}

function PublisherControls() {
  const dispatch = useDispatch();
  const sessionState = useSelector(selector.sessionConnectionState);
  const publishingState = useSelector(
    (state) =>
      Object.values(state.publishers.state)[0] ?? ("not publishing" as const)
  );
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
    (state) => Object.values(state.publishers.state)[0] === "publishing"
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
