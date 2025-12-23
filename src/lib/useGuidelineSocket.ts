// src/lib/useGuidelineSocket.ts
"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

export function useGuidelineSocket(onUpdated: (payload: any) => void) {
  useEffect(() => {
    // ensure socket server is initialized
    fetch("/api/socket");

    const socket = io({
      path: "/api/socket",
    });

    socket.emit("join-guidelines");

    socket.on("guideline:updated", (payload) => {
      onUpdated(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [onUpdated]);
}
