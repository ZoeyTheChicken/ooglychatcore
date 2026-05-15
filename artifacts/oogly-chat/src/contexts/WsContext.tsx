import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";

export type WsEvent = { type: string; payload: any };

type WsContextType = {
  isConnected: boolean;
  connectionFailed: boolean;
  sendWsMessage: (msg: object) => void;
  subscribe: (handler: (event: WsEvent) => void) => () => void;
};

const WsContext = createContext<WsContextType>({
  isConnected: false,
  connectionFailed: false,
  sendWsMessage: () => {},
  subscribe: () => () => {},
});

export function WsProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failureRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<Set<(event: WsEvent) => void>>(new Set());
  const disconnectedAt = useRef<number | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const url = `${protocol}//${window.location.host}${base}/api/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionFailed(false);
      disconnectedAt.current = null;
      if (failureRef.current) { clearTimeout(failureRef.current); failureRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    };

    ws.onmessage = (evt) => {
      try {
        const event = JSON.parse(evt.data);
        handlersRef.current.forEach((h) => h(event));
      } catch {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      if (disconnectedAt.current === null) {
        disconnectedAt.current = Date.now();
        failureRef.current = setTimeout(() => setConnectionFailed(true), 10000);
      }
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (failureRef.current) clearTimeout(failureRef.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [connect]);

  const sendWsMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const subscribe = useCallback((handler: (event: WsEvent) => void) => {
    handlersRef.current.add(handler);
    return () => { handlersRef.current.delete(handler); };
  }, []);

  return (
    <WsContext.Provider value={{ isConnected, connectionFailed, sendWsMessage, subscribe }}>
      {children}
    </WsContext.Provider>
  );
}

export const useWs = () => useContext(WsContext);
