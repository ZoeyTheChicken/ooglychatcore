// 🚀 Universal Frontend WebSocket Interceptor Override
if (typeof window !== "undefined") {
  const OriginalWebSocket = window.WebSocket;
  
  // Hijack the native browser WebSocket constructor globally
  window.WebSocket = function (url, protocols) {
    if (typeof url === "string") {
      // If it tries to hit Vercel, force it to your DigitalOcean Droplet
      if (url.includes("ooglychatlearning.vercel.app") || url.startsWith("ws://") || url.startsWith("wss://")) {
        console.log("⚡ Intercepted WebSocket connection! Rerouting to DigitalOcean Droplet...");
        
        // Force the destination to use your secure backend subdomain and your required path
        url = "wss://://zoeyaviation.com";
      }
    }
    return new OriginalWebSocket(url, protocols);
  } as any;
}


import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
