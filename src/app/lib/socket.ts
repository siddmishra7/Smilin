import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;


if (typeof window !== 'undefined') {
  socket = io('/', {
    path: '/socket.io',
  });
}

export default socket!;
