/**
 * main.tsx - React Application Entry Point
 *
 * This is where React starts. It mounts the App component
 * to the DOM element with id="root".
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Find the root element in index.html
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Failed to find root element. Make sure index.html has <div id="root"></div>',
  );
}

// Create React root and render the app
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

console.log("React app mounted successfully");
