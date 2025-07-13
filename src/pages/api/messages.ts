// pages/api/messages.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../app/lib/prisma'; // adjust path if needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId, peerId } = req.query;

  if (!userId || !peerId || typeof userId !== 'string' || typeof peerId !== 'string') {
    return res.status(400).json({ error: 'Missing userId or peerId' });
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: peerId },
          { fromUserId: peerId, toUserId: userId },
        ],
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    return res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
