import type { NextApiRequest } from 'next';
import { Server as IOServer } from 'socket.io';
import { NextApiResponseServerIO } from '../../../types/next';
import prisma from '../../app/lib/prisma';  

export const config = {
  api: {
    bodyParser: false,
  },
};

const onlineUsers = new Map<string, string>(); 

export default async function handler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server);

    const emitOnlineUsers = () => {
      const onlineIds = Array.from(onlineUsers.keys());
      io.emit('online-users', onlineIds);
    };

    io.on('connection', (socket) => {
      const userId = socket.handshake.auth?.userId as string | undefined;

      if (userId) {
        onlineUsers.set(userId, socket.id);
        emitOnlineUsers();
      }

      socket.on('chat message', async (msg) => {
        const timestamp = new Date();

        console.log('Saving message:', {
          fromUserId: msg.fromUserId,
          toUserId: msg.toUserId,
          username: msg.username,
          avatarUrl: msg.avatarUrl || null,
          text: msg.text,
          timestamp,
        });

        try {
          await prisma.chatMessage.create({
            data: {
              fromUserId: msg.fromUserId,
              toUserId: msg.toUserId,
              username: msg.username,
              avatarUrl: msg.avatarUrl || null,
              text: msg.text,
              timestamp,
            },
          });
        } catch (error) {
          console.error('Failed to save chat message:', error);
        }

        const msgWithTimestamp = { ...msg, timestamp: timestamp.toISOString() };

        const toSocketId = onlineUsers.get(msg.toUserId);
        if (toSocketId) {
          io.to(toSocketId).emit('chat message', msgWithTimestamp);
        }

        socket.emit('chat message', msgWithTimestamp);
      });

      socket.on('disconnect', () => {
        if (userId) {
          onlineUsers.delete(userId);
          emitOnlineUsers();
        }
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
