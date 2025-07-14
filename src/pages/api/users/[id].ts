import type { NextApiRequest, NextApiResponse } from 'next';
import { clerkClient } from '@clerk/nextjs/server';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clerkClient();
    const usersResponse = await client.users.getUserList({
      limit: 100,
      orderBy: '-created_at',
    });

    const users = usersResponse.data; 

    const filteredUsers = users.map(u => ({
      id: u.id,
      fullName: u.fullName || 'Unknown',
      imageUrl: u.imageUrl,
    }));

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
