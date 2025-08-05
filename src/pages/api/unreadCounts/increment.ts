// /pages/api/unreadCounts/increment.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, fromUserId } = req.body;
  if (!userId || !fromUserId) return res.status(400).json({ error: 'Missing userId or fromUserId' });

  // Pseudo DB logic:
  // const existing = await db.unreadCounts.findFirst({ where: { userId, fromUserId } });
  // if (existing) {
  //   await db.unreadCounts.update({ where: { id: existing.id }, data: { count: existing.count + 1 } });
  // } else {
  //   await db.unreadCounts.create({ data: { userId, fromUserId, count: 1 } });
  // }

  res.status(200).json({ success: true });
}
