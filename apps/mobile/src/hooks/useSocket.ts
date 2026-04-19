import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { WS_URL } from '@/config/constants';
import { SecureStorage } from '@/auth/SecureStorage';
import { useAuth } from '@/auth/AuthContext';

export type SocketHandlers = Record<string, (...args: unknown[]) => void>;

export function useSocket(eventHandlers: SocketHandlers) {
  const socketRef = useRef<Socket | null>(null);
  const { user, tenantSlug } = useAuth();

  useEffect(() => {
    if (!user) return undefined;

    let cancelled = false;

    (async () => {
      const token = await SecureStorage.getAccessToken();
      if (!token || cancelled) return;

      const socket = io(WS_URL, {
        auth: { token, tenantSlug },
        transports: ['websocket'],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {
        socket.emit('join:user', user.id);
      });

      for (const [event, handler] of Object.entries(eventHandlers)) {
        socket.on(event, handler);
      }

      socketRef.current = socket;
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    // We only want to re-establish on user identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tenantSlug]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit };
}
