'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  UserButton,
} from '@clerk/nextjs';
import ChatBox from '../components/ChatBox';
import Ably from 'ably';
import type { RealtimeChannel } from 'ably';

type User = { id: string; fullName: string; imageUrl: string };

export default function ChatClient() {
  const searchParams = useSearchParams();
  const peerId = searchParams?.get('peerId') ?? undefined;

  const { isLoaded, user } = useUser();
  const [peerUser, setPeerUser] = useState<User | null>(null);
  const [ablyChannel, setAblyChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    const fetchPeerUser = async () => {
      if (!peerId) return;
      const res = await fetch('/api/users');
      const users: User[] = await res.json();
      const p = users.find((u) => u.id === peerId);
      if (p) setPeerUser(p);
    };
    fetchPeerUser();
  }, [peerId]);

  useEffect(() => {
    if (isLoaded && user && peerId) {
      const client = new Ably.Realtime({
        key: process.env.NEXT_PUBLIC_ABLY_KEY!,
        clientId: user.id,
      });

      const channelName = [user.id, peerId].sort().join('-');
      const channel = client.channels.get(channelName);
      setAblyChannel(channel);

      return () => {
        channel.detach();
        client.close();
      };
    }
  }, [isLoaded, user, peerId]);

  if (!isLoaded) return <div>Loading…</div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-700 via-pink-600 to-red-500">
      <div className="max-w-lg mx-auto bg-black h-screen flex flex-col">
        <SignedIn>
          <header className="flex items-center gap-4 p-4 bg-gray-700 border-b">
            {peerUser ? (
              <>
                <img
                  src={peerUser.imageUrl || '/default-avatar.png'}
                  alt={peerUser.fullName}
                  className="w-10 h-10 rounded-full object-cover border"
                />
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    {peerUser.fullName}
                  </h1>
                </div>
              </>
            ) : (
              <h1 className="text-lg text-white">Select a user to chat</h1>
            )}
            <div className="ml-auto">
              <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10 rounded-full border' }}}/>
            </div>
          </header>

          <div className="flex grow overflow-hidden">
            {ablyChannel && peerId ? (
              <ChatBox
                userId={user!.id}
                username={user!.fullName || 'Anonymous'}
                avatarUrl={user!.imageUrl || '/default-avatar.png'}
                peerId={peerId}
                ablyChannel={ablyChannel}
              />
            ) : (
              <div className="flex grow items-center justify-center text-gray-400 italic">
                Connecting to chat…
              </div>
            )}
          </div>
        </SignedIn>

        <SignedOut>
          <div className="p-4 text-center text-white">
            <p>You must be signed in to access this page.</p>
            <SignInButton mode="modal">Sign In</SignInButton>
          </div>
        </SignedOut>
      </div>
    </main>
  );
}
