// pages/api/messages/save.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../app/lib/prisma'; // adjust path if needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messageId, fromUserId, toUserId, username, avatarUrl, text, timestamp } = req.body;

  if (!messageId || !fromUserId || !toUserId || !text || !timestamp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const savedMessage = await prisma.chatMessage.create({
      data: {
        fromUserId,
        toUserId,
        username,
        avatarUrl,
        text,
        timestamp: new Date(timestamp),
      },
    });

    return res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Failed to save message:', error);
    return res.status(500).json({ error: 'Failed to save message' });
  }
}
