import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import "./index.css";

import store from "./app/store/store.ts";
import App from "./App.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
const Id = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={Id}>
        <App />
      </GoogleOAuthProvider>
    </Provider>
  </StrictMode>,
);
