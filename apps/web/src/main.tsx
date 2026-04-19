import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { initSentry } from "./lib/sentry";
import "./styles/global.css";

initSentry();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
