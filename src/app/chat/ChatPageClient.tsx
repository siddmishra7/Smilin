'use client';

import { useEffect, useState, useRef } from 'react';
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
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);
  const [ablyChannel, setAblyChannel] = useState<Ably.RealtimeChannel | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [presenceClients, setPresenceClients] = useState<Map<string, Ably.PresenceMessage>>(new Map());

  const ABLY_API_KEY = process.env.NEXT_PUBLIC_ABLY_API_KEY || '';

  const clientIdRef = useRef<string | null>(null);
  const [clientIdReady, setClientIdReady] = useState(false);

  useEffect(() => {
    if (!clientIdRef.current && user) {
      clientIdRef.current = `${user.id}-${Math.random().toString(36).slice(2, 8)}`;
      setClientIdReady(true);
    }
  }, [user]);

  const clientId = clientIdRef.current;

  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<Ably.RealtimeChannel | null>(null);

  const safePresenceLeave = async (
    channel: Ably.RealtimeChannel | null,
    clientId: string
  ) => {
    if (!channel || !clientId) return;
    try {
      if (channel.state !== 'attached') await channel.attach();
      await channel.presence.leaveClient(clientId);
    } catch (err) {
      console.error('Error during safePresenceLeave:', err);
    }
  };

  // Fetch peer user info
  useEffect(() => {
    const fetchPeerUser = async () => {
      try {
        const res = await fetch('/api/users');
        const users: User[] = await res.json();
        const found = users.find((u) => u.id === peerId);
        if (found) setPeerUser(found);
      } catch (err) {
        console.error('Error fetching peer user:', err);
      }
    };
    fetchPeerUser();
  }, [peerId]);

  // Initialize Ably and presence
  useEffect(() => {
    if (!isLoaded || !user || !ABLY_API_KEY || !clientIdReady || !clientId) return;

    console.log('[Ably Init] Creating Ably client...');
    const client = getAblyClient(ABLY_API_KEY, clientId);
    clientRef.current = client;
    setAblyClient(client);

    const channelName = [user.id, peerId].sort().join(':');
    const channel = client.channels.get(channelName);
    channelRef.current = channel;
    setAblyChannel(channel);

    const presenceChannel = client.channels.get('global-presence');
    presenceChannelRef.current = presenceChannel;

    const onPresenceUpdate = (presenceMsg: Ably.PresenceMessage) => {
      const onlineUserId = presenceMsg.clientId.split('-')[0];
      setOnlineUserIds((prev) => {
        const updated = new Set(prev);
        if (['enter', 'update'].includes(presenceMsg.action)) {
          updated.add(onlineUserId);
          setPresenceClients((pc) => new Map(pc.set(onlineUserId, presenceMsg)));
        } else if (['leave', 'absent'].includes(presenceMsg.action)) {
          updated.delete(onlineUserId);
          setPresenceClients((pc) => {
            const newMap = new Map(pc);
            newMap.delete(onlineUserId);
            return newMap;
          });
        }
        return updated;
      });
    };

    client.connection.once('connected', async () => {
      console.log('[Ably] Client connected. Setting up presence...');
      try {
        if (presenceChannel.state !== 'attached') await presenceChannel.attach();
        presenceChannel.presence.subscribe(onPresenceUpdate);

        await presenceChannel.presence.enter({
          userId: user.id,
          inChatWith: peerId,
          timestamp: Date.now(),
        });

        const members = await presenceChannel.presence.get();
        const onlineSet = new Set<string>();
        const presenceMap = new Map<string, Ably.PresenceMessage>();
        members.forEach((m) => {
          const onlineUserId = m.clientId.split('-')[0];
          onlineSet.add(onlineUserId);
          presenceMap.set(onlineUserId, m);
        });

        setOnlineUserIds(onlineSet);
        setPresenceClients(presenceMap);
      } catch (err) {
        console.error('Error during presence setup:', err);
      }
    });

    return () => {
      (async () => {
        try {
          await safePresenceLeave(presenceChannel, clientId);
          presenceChannel.presence.unsubscribe();
          if (channel.state === 'attached') await channel.detach();
          if (presenceChannel.state === 'attached') await presenceChannel.detach();
          if (client.connection.state !== 'closed') client.close();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
        setAblyChannel(null);
        setAblyClient(null);
        setOnlineUserIds(new Set());
        setPresenceClients(new Map());
        clientRef.current = null;
        channelRef.current = null;
        presenceChannelRef.current = null;
      })();
    };
  }, [isLoaded, user, ABLY_API_KEY, peerId, clientIdReady, clientId]);

  // Update presence when peerId changes
  useEffect(() => {
    if (!ablyClient || !user) return;

    const presenceChannel = ablyClient.channels.get('global-presence');

    const updatePresence = async (inChatWith: string | null) => {
      try {
        if (presenceChannel.state !== 'attached') {
          await presenceChannel.attach();
        }
        await presenceChannel.presence.update({
          userId: user.id,
          inChatWith,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    };

    updatePresence(peerId);

    return () => {
      (async () => {
        await updatePresence(null);
      })();
    };
  }, [ablyClient, user, peerId]);

  const peerIsOnline = onlineUserIds.has(peerId);
  const peerPresence = presenceClients.get(peerId);
  const peerInChatWithYou = peerPresence?.data?.inChatWith === user?.id;

  if (!isLoaded)
    return <div className="text-white text-center p-6">Loading chat...</div>;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e1e2f] via-[#2a2c4b] to-[#1e1e2f]">
      <div className="max-w-3xl mx-auto h-screen flex flex-col shadow-xl bg-[#101222]">
        <SignedIn>
          <header className="flex items-center gap-4 px-4 py-3 border-b border-gray-700 bg-[#181a2f]">
            {peerUser ? (
              <>
                <img
                  src={peerUser.imageUrl || '/default-avatar.png'}
                  alt={peerUser.fullName}
                  className="w-10 h-10 rounded-full object-cover border border-white/20"
                />
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-white">
                    {peerUser.fullName}
                  </span>
                  <span
                    className={`text-sm ${
                      peerInChatWithYou
                        ? 'text-green-500'
                        : peerIsOnline
                        ? 'text-green-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {peerInChatWithYou
                      ? 'In chat now'
                      : peerIsOnline
                      ? 'Online'
                      : 'Offline'}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-white text-lg">Loading user...</span>
            )}
            <div className="ml-auto">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox:
                      'w -9 h-9 rounded-full border border-white/20',
},
}}
/>
</div>
</header>
      {ablyChannel && user ? (
        <ChatBox
          userId={user.id}
          username={user.fullName || 'Anonymous'}
          avatarUrl={user.imageUrl || '/default-avatar.png'}
          peerId={peerId}
          ablyChannel={ablyChannel}
          peerStatus={{
            online: peerIsOnline,
            inChatWithYou: peerInChatWithYou,
          }}
        />
      ) : (
        <div className="flex items-center justify-center flex-grow text-gray-500 text-sm">
          ⏳ Connecting to chat server...
        </div>
      )}
    </SignedIn>

    <SignedOut>
      <div className="flex flex-col items-center justify-center h-full gap-4 text-white px-4 text-center">
        <p>You must be signed in to chat</p>
        <SignInButton mode="modal">
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-white">
            Sign In
          </button>
        </SignInButton>
      </div>
    </SignedOut>
  </div>
</main>
);
}
