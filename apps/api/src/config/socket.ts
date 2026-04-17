import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { verifyAccessToken } from "@/lib/jwt";

interface AuthedSocket extends Socket {
  data: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token as string | undefined) || undefined;
    if (!token) return next(new Error("UNAUTHORIZED"));
    try {
      const payload = verifyAccessToken(token);
      (socket as AuthedSocket).data = {
        userId: payload.sub,
        tenantId: payload.tid,
        role: payload.role,
      };
      next();
    } catch {
      next(new Error("INVALID_TOKEN"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const s = socket as AuthedSocket;
    socket.join(`tenant:${s.data.tenantId}`);
    console.log(`[socket] connected user=${s.data.userId} tenant=${s.data.tenantId}`);

    socket.on("qr:join", (sessionId: string) => {
      if (typeof sessionId === "string" && sessionId.length > 0) {
        socket.join(`tenant:${s.data.tenantId}:qr:${sessionId}`);
      }
    });
    socket.on("qr:leave", (sessionId: string) => {
      if (typeof sessionId === "string" && sessionId.length > 0) {
        socket.leave(`tenant:${s.data.tenantId}:qr:${sessionId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[socket] disconnected user=${s.data.userId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function emitToTenant(tenantId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(event, payload);
}

export function emitToQrRoom(tenantId: string, sessionId: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(`tenant:${tenantId}:qr:${sessionId}`).emit(event, payload);
}
