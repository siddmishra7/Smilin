'use client';

import { useEffect, useState } from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useUser,
  UserButton,
} from '@clerk/nextjs';
import ChatBox from '@/app/components/ChatBox';
import Ably from 'ably';

type User = {
  id: string;
  fullName: string;
  imageUrl: string;
};

function getAblyClient(apiKey: string, clientId: string) {
  return new Ably.Realtime({ key: apiKey, clientId });
}

export default function ChatPageClient({ peerId }: { peerId: string }) {
  const { isLoaded, user } = useUser();
  const [peerUser, setPeerUser] = useState<User | null>(null);
  const [ablyChannel, setAblyChannel] = useState<Ably.RealtimeChannel | null>(null);

  // Online users tracked here:
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  const ABLY_API_KEY = process.env.NEXT_PUBLIC_ABLY_API_KEY || '';

  useEffect(() => {
    const fetchPeerUser = async () => {
      const res = await fetch('/api/users');
      const users: User[] = await res.json();
      const found = users.find((u) => u.id === peerId);
      if (found) setPeerUser(found);
    };

    fetchPeerUser();
  }, [peerId]);

  useEffect(() => {
    if (!isLoaded || !user || !ABLY_API_KEY) return;

    const clientId = `${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const client = getAblyClient(ABLY_API_KEY, clientId);

    // Channel for chat messages between this user and peer
    const channelName = [user.id, peerId].sort().join(':');
    const channel = client.channels.get(channelName);
    setAblyChannel(channel);

    // Presence channel to track who's online (global presence)
    const presenceChannel = client.channels.get('global-presence');

    client.connection.once('connected', () => {
      // Enter presence on the presence channel (mark yourself online)
      presenceChannel.presence.enter({ userId: user.id, timestamp: Date.now() }).catch(console.error);
    });

    // Subscribe to presence updates
    presenceChannel.presence.subscribe((presenceMsg) => {
      setOnlineUserIds((prev) => {
        const updated = new Set(prev);
        const onlineUserId = presenceMsg.clientId.split('-')[0]; // strip random suffix

        if (presenceMsg.action === 'enter' || presenceMsg.action === 'update') {
          updated.add(onlineUserId);
        } else if (presenceMsg.action === 'leave' || presenceMsg.action === 'absent') {
          updated.delete(onlineUserId);
        }
        return updated;
      });
    });

    (async () => {
      try {
        const members = await presenceChannel.presence.get();
        const currentOnline = new Set<string>();
        members.forEach((member) => {
          currentOnline.add(member.clientId.split('-')[0]);
        });
        setOnlineUserIds(currentOnline);
      } catch (err) {
        console.error('Error getting presence members:', err);
      }
    })();

    return () => {
      presenceChannel.presence.leave().catch(console.error);
      presenceChannel.presence.unsubscribe();
      channel.detach();
      client.close();
      setAblyChannel(null);
      setOnlineUserIds(new Set());
    };
  }, [isLoaded, user, peerId, ABLY_API_KEY]);

  const peerIsOnline = onlineUserIds.has(peerId);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-700 via-pink-600 to-red-500">
      <div className="max-w-lg mx-auto bg-black h-screen flex flex-col">
        <SignedIn>
          <header className="flex items-center gap-4 p-4 bg-gray-700 border-b shadow-sm">
            {peerUser ? (
              <>
                <img
                  src={peerUser.imageUrl || '/default-avatar.png'}
                  alt={peerUser.fullName}
                  className="w-10 h-10 rounded-full object-cover border"
                />
                <div className="flex flex-col">
                  <h1 className="text-lg font-semibold">{peerUser.fullName}</h1>
                  <p
                    className={`text-sm ${peerIsOnline ? 'text-green-400' : 'text-gray-500'
                      } font-medium`}
                  >
                    {peerIsOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </>
            ) : (
              <h1 className="text-lg text-white">Select a user to chat</h1>
            )}
            <div className="ml-auto">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-10 h-10 rounded-full border',
                  },
                }}
              />
            </div>
          </header>

          <div className="flex grow overflow-hidden">
            {ablyChannel ? (
              <ChatBox
                userId={user!.id}
                username={user!.fullName || 'Anonymous'}
                avatarUrl={user!.imageUrl || '/default-avatar.png'}
                peerId={peerId}
                ablyChannel={ablyChannel}
              />
            ) : (
              <div className="flex grow items-center justify-center text-gray-400 italic">
                Connecting to chat server...
              </div>
            )}
          </div>
        </SignedIn>

        <SignedOut>
          <div className="p-4 text-center">
            <p className="mb-4">You must be signed in to access this page.</p>
            <SignInButton mode="modal">Sign In</SignInButton>
          </div>
        </SignedOut>
      </div>
    </main>
  );
}
