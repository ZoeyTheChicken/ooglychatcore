import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";

export type WsEvent =
  | { type: "new_message"; payload: unknown }
  | { type: "delete_message"; payload: { id: number } }
  | { type: "reaction_update"; payload: { messageId: number } }
  | { type: "announcement"; payload: unknown }
  | { type: "ping" };

let wss: WebSocketServer | null = null;

export function createWss(server: import("http").Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    ws.on("error", () => {});
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg?.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
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
