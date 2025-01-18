import React from "react";
import ReactDOM from "react-dom/client"; // Import ReactDOM from react-dom/client 
import App from "./App"; // Import the main App component
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
