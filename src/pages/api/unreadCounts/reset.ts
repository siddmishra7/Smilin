// /pages/api/unreadCounts/reset.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, fromUserId } = req.body;
  if (!userId || !fromUserId) return res.status(400).json({ error: 'Missing userId or fromUserId' });

  // Reset unread count to zero in DB:
  // await db.unreadCounts.deleteMany({ where: { userId, fromUserId } });

  res.status(200).json({ success: true });
}
