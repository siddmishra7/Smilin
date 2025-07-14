import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function createSocket(userId: string): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      auth: { userId },
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
