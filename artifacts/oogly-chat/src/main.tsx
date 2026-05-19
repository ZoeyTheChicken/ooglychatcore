// /var/www/ooglychatcore/artifacts/oogly-chat/src/main.tsx
import { setBaseUrl } from "@workspace/api-client-react";

// Set the API base URL BEFORE creating any API calls
setBaseUrl("https://chatapi.zoeyaviation.com");

// 🚀 Self-Cleaning Global WebSocket Interceptor
if (typeof window !== "undefined") {
  const OriginalWebSocket = window.WebSocket;

  window.WebSocket = function (url, protocols) {
    let finalUrl = "wss://chatapi.zoeyaviation.com/api/ws";

    if (typeof url === "string" && url.trim().length > 0) {
      if (!url.includes("ooglychatlearning.vercel.app/api/ws")) {
        let cleanInput = url.replace(/^wss?:\/\//i, "").replace(/^\/\//, "").replace(/^:/, "");
        
        if (cleanInput.includes("chatapi.zoeyaviation.com")) {
          finalUrl = `wss://${cleanInput}`;
        }
      }
    }

    console.log("⚡ WebSocket Router Sync Target:", finalUrl);
    return new OriginalWebSocket(finalUrl, protocols);
  } as any;
}

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
