import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import "./App.css";
import { applyMiddleware, createStore } from "redux";
import { composeWithDevTools } from "redux-devtools-extension";

import {
  useDispatch as _useDispatch,
  useSelector as _useSelector,
  TypedUseSelectorHook,
} from "react-redux";
import logger from "redux-logger";
import { AppEvent } from "./event";
import { sagaMiddleware, sagaSession } from "./effect";
import { reducer, State } from "./state";

export const useSelector: TypedUseSelectorHook<State> = _useSelector;
export const useDispatch = _useDispatch as () => (event: AppEvent) => void;

export const store = createStore(
  reducer,
  composeWithDevTools(applyMiddleware(sagaMiddleware, logger))
);

sagaMiddleware.run(sagaSession);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
