// src/pages/api/socket.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { initIO } from "@/lib/socket";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    const io = initIO(res.socket.server);
    // attach for reuse
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      // optional: join a room for guideline updates
      socket.on("join-guidelines", () => {
        socket.join("guidelines");
      });
    });
  }

  res.status(200).json({ ok: true });
}
