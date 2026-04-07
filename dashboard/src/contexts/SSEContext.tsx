import React, { createContext, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { waitForApiHealth } from "@/utils/waitForApiHealth";

interface SSEContextValue {
  source: EventSource | null;
  isConnected: boolean;
}

export const SSEContext = createContext<SSEContextValue>({
  source: null,
  isConnected: false,
});

const API_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:3001";

export const SSEProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [source, setSource] = useState<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();
  const sourceRef = useRef<EventSource | null>(null);
  const genRef = useRef(0);

  useEffect(() => {
    if (!accessToken) {
      genRef.current += 1;
      sourceRef.current?.close();
      sourceRef.current = null;
      setSource(null);
      setIsConnected(false);
      return;
    }

    const gen = ++genRef.current;
    const token = accessToken;

    void (async () => {
      const healthy = await waitForApiHealth(API_URL);
      if (gen !== genRef.current || !healthy) return;

      sourceRef.current?.close();

      const url = `${API_URL}/api/sse?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);

      es.addEventListener("connection:ack", () => {
        if (gen !== genRef.current) {
          es.close();
          return;
        }
        setIsConnected(true);
      });

      es.onerror = () => {
        setIsConnected(false);
        // EventSource auto-reconnects on transient errors
      };

      if (gen !== genRef.current) {
        es.close();
        return;
      }

      sourceRef.current = es;
      setSource(es);
    })();

    return () => {
      genRef.current += 1;
      sourceRef.current?.close();
      sourceRef.current = null;
      setSource(null);
      setIsConnected(false);
    };
  }, [accessToken]);

  return (
    <SSEContext.Provider value={{ source, isConnected }}>
      {children}
    </SSEContext.Provider>
  );
};
