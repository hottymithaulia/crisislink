import { io, type Socket } from "socket.io-client";
import { BACKEND_URL, getDeviceId } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      query: { deviceId: getDeviceId() },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
    });
  }
  return socket;
}
