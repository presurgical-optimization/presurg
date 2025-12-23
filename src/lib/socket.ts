// src/lib/socket.ts
import { Server as IOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var io: IOServer | undefined;
}

export function getIO(): IOServer | undefined {
  return global.io;
}

export function initIO(httpServer: any): IOServer {
  if (!global.io) {
    global.io = new IOServer(httpServer, {
      path: "/api/socket",
      cors: { origin: "*", methods: ["GET", "POST"] },
    });
  }
  return global.io;
}
