import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import AppProviders from "./providers/AppProviders";
import ErrorBoundary from "./ErrorBoundary";
import { initGlobalErrorHandlers } from "./telemetry/initGlobalErrorHandlers";
import "../styles.css";

initGlobalErrorHandlers();
registerSW({ immediate: true });

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </React.StrictMode>,
);
