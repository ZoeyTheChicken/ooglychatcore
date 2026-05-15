import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";

export type WsEvent =
  | { type: "new_message"; payload: unknown }
  | { type: "delete_message"; payload: { id: number } }
  | { type: "reaction_update"; payload: { messageId: number } }
  | { type: "announcement"; payload: unknown }
  | { type: "troll_effect"; payload: { targetUsername: string; effect: string } }
  | { type: "typing"; payload: { username: string; timestamp: number } }
  | { type: "pong" };

let wss: WebSocketServer | null = null;

export function createWss(server: import("http").Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    ws.on("error", () => {});
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg?.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        } else if (msg?.type === "typing" && msg?.payload?.username) {
          // Relay typing indicators to all other clients
          const event = JSON.stringify({ type: "typing", payload: { username: msg.payload.username, timestamp: Date.now() } });
          wss!.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(event);
            }
          });
        }
      } catch {}
    });
  });

  return wss;
}

export function broadcast(event: WsEvent): void {
  if (!wss) return;
  const payload = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
