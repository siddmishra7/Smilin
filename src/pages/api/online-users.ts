import type { NextApiRequest, NextApiResponse } from 'next';

const onlineUsers = new Set<string>();

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[]>
) {
  res.status(200).json(Array.from(onlineUsers));
}
