// 🚀 Self-Cleaning Global WebSocket Interceptor
if (typeof window !== "undefined") {
  const OriginalWebSocket = window.WebSocket;

  window.WebSocket = function (url, protocols) {
    // If the incoming URL is empty or corrupted, catch it before it can crash the tab
    let finalUrl = "wss://://zoeyaviation.com";

    if (typeof url === "string" && url.trim().length > 0) {
      // If it looks like a valid target domain, clean out any double-protocol symbols
      if (!url.includes("ooglychatlearning.vercel.app")) {
        // Strip out bad prefix symbols, formatting it down to a clean domain string
        let cleanInput = url.replace(/^wss?:\/\//i, "").replace(/^\/\//, "").replace(/^:/, "");
        
        // If the resulting clean domain points to your backend server, apply it safely
        if (cleanInput.includes("zoeyaviation.com")) {
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
