// pages/api/unread-counts.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import prisma from "../../app/lib/prisma"; // ✅ adjust to your actual path if different

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch unread message counts grouped by sender
    const counts = await prisma.unreadMessageCount.findMany({
      where: { userId },
      select: {
        fromUserId: true,
        count: true,
      },
    });

    // Convert to simple object: { [fromUserId]: count }
    const result: Record<string, number> = {};
    for (const { fromUserId, count } of counts) {
      result[fromUserId] = count;
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('[Unread Counts Error]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
