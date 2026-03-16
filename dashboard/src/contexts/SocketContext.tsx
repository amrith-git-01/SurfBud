import React, { createContext, useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
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

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();
  const socketRef = useRef<TypedSocket | null>(null);
  const hasLoggedConnectErrorRef = useRef(false);

  useEffect(() => {
    // Connect whenever a valid access token exists.
    // `isAuthenticated` is not persisted, so token is the reliable source after reload.
    if (!accessToken) {
      // Disconnect if already connected
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get API URL from environment
    const apiUrl =
      (import.meta.env['VITE_API_URL'] as string | undefined) ??
      'http://localhost:3001';

    // Guard against stale duplicate sockets when token refreshes or strict mode remounts.
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    // Create socket connection
    const newSocket: TypedSocket = io(apiUrl, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
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

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};