import { io, type Socket } from 'socket.io-client';
import { WS_URL } from '@/config/constants';
import { SecureStorage } from '@/auth/SecureStorage';

// Singleton socket instance shared across the app. Most screens prefer
// useSocket() but services that need to emit outside React (e.g. push
// notification tap handlers) can grab the singleton directly.

let socket: Socket | null = null;

export async function connectSocket(userId: string): Promise<Socket | null> {
  if (socket?.connected) return socket;

  const token = await SecureStorage.getAccessToken();
  const tenantSlug = await SecureStorage.getTenantSlug();
  if (!token) return null;

  socket = io(WS_URL, {
    auth: { token, tenantSlug },
    transports: ['websocket'],
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    socket?.emit('join:user', userId);
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}
