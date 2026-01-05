import React, { createContext, useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { waitForApiHealth } from '@/utils/waitForApiHealth';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/types/shared/websocket.types';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: TypedSocket | null;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

interface SocketProviderProps {
  children: React.ReactNode;
}

const SOCKET_RECONNECT_ATTEMPTS = 15;
const SOCKET_RECONNECT_DELAY_MS = 1000;
const SOCKET_RECONNECT_DELAY_MAX_MS = 8000;

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();
  const socketRef = useRef<TypedSocket | null>(null);
  const hasLoggedConnectErrorRef = useRef(false);
  const connectGenerationRef = useRef(0);

  useEffect(() => {
    if (!accessToken) {
      connectGenerationRef.current += 1;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const apiUrl =
      (import.meta.env['VITE_API_URL'] as string | undefined) ??
      'http://localhost:3001';

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    const gen = ++connectGenerationRef.current;

    void (async () => {
      const healthy = await waitForApiHealth(apiUrl);
      if (gen !== connectGenerationRef.current) return;

      if (!healthy) {
        if (!hasLoggedConnectErrorRef.current) {
          console.warn(
            '[Socket.IO] API not reachable (health check failed); live updates disabled until refresh.',
          );
          hasLoggedConnectErrorRef.current = true;
        }
        return;
      }

      hasLoggedConnectErrorRef.current = false;

      const newSocket: TypedSocket = io(apiUrl, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: SOCKET_RECONNECT_DELAY_MS,
        reconnectionDelayMax: SOCKET_RECONNECT_DELAY_MAX_MS,
        reconnectionAttempts: SOCKET_RECONNECT_ATTEMPTS,
        randomizationFactor: 0.5,
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        hasLoggedConnectErrorRef.current = false;
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        if (!hasLoggedConnectErrorRef.current) {
          console.warn('[Socket.IO] Connection error:', error.message);
          hasLoggedConnectErrorRef.current = true;
        }
        setIsConnected(false);
      });

      if (gen !== connectGenerationRef.current) {
        newSocket.disconnect();
        return;
      }

      socketRef.current = newSocket;
      setSocket(newSocket);
    })();

    return () => {
      connectGenerationRef.current += 1;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
