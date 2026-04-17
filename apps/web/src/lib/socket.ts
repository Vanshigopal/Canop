import { type Socket, io } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket && socket.connected) {
    socket.auth = { token };
    socket.disconnect().connect();
    return socket;
  }
  socket = io(API_BASE, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    withCredentials: true,
  });
  socket.on("connect_error", (err) => {
    if (err.message === "UNAUTHORIZED" || err.message === "INVALID_TOKEN") {
      socket?.disconnect();
    }
  });
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinQrRoom(sessionId: string): void {
  socket?.emit("qr:join", sessionId);
}
export function leaveQrRoom(sessionId: string): void {
  socket?.emit("qr:leave", sessionId);
}
