import { useEffect, useRef, useCallback } from "react";

type WsEvent =
  | { type: "new_message"; payload: unknown }
  | { type: "delete_message"; payload: { id: number } }
  | { type: "reaction_update"; payload: { messageId: number } }
  | { type: "announcement"; payload: unknown }
  | { type: "pong" };

type Handlers = {
  onNewMessage?: (payload: unknown) => void;
  onDeleteMessage?: (payload: { id: number }) => void;
  onReactionUpdate?: (payload: { messageId: number }) => void;
  onAnnouncement?: (payload: unknown) => void;
};

export function useChatSocket(handlers: Handlers, enabled = true) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${protocol}//${window.location.host}${base}/api/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (evt) => {
      try {
        const event: WsEvent = JSON.parse(evt.data);
        switch (event.type) {
          case "new_message":
            handlersRef.current.onNewMessage?.(event.payload);
            break;
          case "delete_message":
            handlersRef.current.onDeleteMessage?.(event.payload);
            break;
          case "reaction_update":
            handlersRef.current.onReactionUpdate?.(event.payload);
            break;
          case "announcement":
            handlersRef.current.onAnnouncement?.(event.payload);
            break;
        }
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (enabled) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
