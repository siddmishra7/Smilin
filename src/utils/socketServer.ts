import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

interface ExtendedServer extends HTTPServer {
  io?: Server;
}

export const setupSocketServer = (server: ExtendedServer) => {
  if (!server.io) {
    const io = new Server(server, {
      path: '/socket.io',
      cors: {
        origin: ['https://smilin.vercel.app'],  
      },
    });

    io.on('connection', (socket) => {
      console.log('New client connected');

      socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });

    server.io = io;
  }

  return server.io;
};
