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
  username: string;
  imageUrl: string;
};

function getAblyClient(apiKey: string, clientId: string) {
  return new Ably.Realtime({ key: apiKey, clientId });
}

export default function ChatPageClient({ peerUsername }: { peerUsername: string }) {
  const { isLoaded, user } = useUser();
  const [peerUser, setPeerUser] = useState<User | null>(null);
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);
  const [ablyChannel, setAblyChannel] = useState<Ably.RealtimeChannel | null>(null);
  const [onlineUsernames, setOnlineUsernames] = useState<Set<string>>(new Set());
  const [presenceClients, setPresenceClients] = useState<Map<string, Ably.PresenceMessage>>(new Map());

  const ABLY_API_KEY = process.env.NEXT_PUBLIC_ABLY_API_KEY || '';

  const clientIdRef = useRef<string | null>(null);
  const [clientIdReady, setClientIdReady] = useState(false);


  const ablyClientRef = useRef<Ably.Realtime | null>(null);
  const ablyChannelRef = useRef<Ably.RealtimeChannel | null>(null);

  const [showFallback, setShowFallback] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);


  useEffect(() => {
    if (!user || !peerUser || ablyClientRef.current) return; 

    const client = getAblyClient(ABLY_API_KEY, clientId!);
    ablyClientRef.current = client;

    const channelName = [(user?.username ?? '').toLowerCase(), peerUser.username.toLowerCase()].sort().join(':');
    const channel = client.channels.get(channelName);
    ablyChannelRef.current = channel;


  }, [user, peerUser]);


  const [channelAttached, setChannelAttached] = useState(false);

  useEffect(() => {
    if (!ablyChannel) return;

    const onStateChange = () => {
      setChannelAttached(ablyChannel.state === 'attached');
    };

    ablyChannel.on('attached', onStateChange);
    ablyChannel.on('detached', onStateChange);
    ablyChannel.on('failed', onStateChange);

    setChannelAttached(ablyChannel.state === 'attached');

    if (ablyChannel.state !== 'attached') {
      ablyChannel.attach().catch(console.error);
    }

    return () => {
      ablyChannel.off('attached', onStateChange);
      ablyChannel.off('detached', onStateChange);
      ablyChannel.off('failed', onStateChange);
    };
  }, [ablyChannel]);





  const [isChannelReady, setIsChannelReady] = useState(false);
  const detachTimeout = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    if (!ablyChannel) return;

    if (ablyChannel.state === 'attached') {
      if (detachTimeout.current) {
        clearTimeout(detachTimeout.current);
        detachTimeout.current = null;
      }
      setIsChannelReady(true);
    }

    const onAttached = () => {
      if (detachTimeout.current) {
        clearTimeout(detachTimeout.current);
        detachTimeout.current = null;
      }
      setIsChannelReady(true);
    };

    const onDetachedOrFailed = () => {
      detachTimeout.current = setTimeout(() => setIsChannelReady(false), 300);
    };

    ablyChannel.on('attached', onAttached);
    ablyChannel.on('detached', onDetachedOrFailed);
    ablyChannel.on('failed', onDetachedOrFailed);

    return () => {
      ablyChannel.off('attached', onAttached);
      ablyChannel.off('detached', onDetachedOrFailed);
      ablyChannel.off('failed', onDetachedOrFailed);
      if (detachTimeout.current) {
        clearTimeout(detachTimeout.current);
        detachTimeout.current = null;
      }
    };
  }, [ablyChannel]);


  useEffect(() => {
    if (!clientIdRef.current && user && user.username) {
      clientIdRef.current = `${user.username}-${Math.random().toString(36).slice(2, 8)}`;
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

  useEffect(() => {
    const fetchPeerUser = async () => {
      try {
        const res = await fetch('/api/users');
        const users: User[] = await res.json();

        const cleanPeerUsername = peerUsername.replace(/^@/, '').toLowerCase();

        const found = users.find((u) => u.username.toLowerCase() === cleanPeerUsername);
        if (found) setPeerUser(found);
      } catch (err) {
        console.error('Error fetching peer user:', err);
      }
    };
    if (peerUsername) fetchPeerUser();
  }, [peerUsername]);


  function onPresenceUpdate(presenceMsg: Ably.PresenceMessage) {
    const onlineUsername = presenceMsg.clientId.split('-')[0].toLowerCase();
    setOnlineUsernames((prev) => {
      const updated = new Set(prev);
      if (['enter', 'update'].includes(presenceMsg.action)) {
        updated.add(onlineUsername);
        setPresenceClients((pc) => new Map(pc.set(onlineUsername, presenceMsg)));
      } else if (['leave', 'absent'].includes(presenceMsg.action)) {
        updated.delete(onlineUsername);
        setPresenceClients((pc) => {
          const newMap = new Map(pc);
          newMap.delete(onlineUsername);
          return newMap;
        });
      }
      return updated;
    });
  }




  useEffect(() => {
    if (
      !isLoaded ||
      !user ||
      !user.username ||
      !ABLY_API_KEY ||
      !clientIdReady ||
      !clientId ||
      !peerUser
    )
      return;

    console.log('[Ably Init] Creating Ably client...');
    const client = getAblyClient(ABLY_API_KEY, clientId);
    clientRef.current = client;
    setAblyClient(client);

    const channelName = [user.username.toLowerCase(), peerUser.username.toLowerCase()]
      .sort()
      .join(':');
    const channel = client.channels.get(channelName);

    const presenceChannel = client.channels.get('global-presence');
    presenceChannelRef.current = presenceChannel;

    (async () => {
      try {
        if (channel.state !== 'attached') {
          await channel.attach();
          console.log('[Ably] Chat channel attached');
        }
        setAblyChannel(channel);
      } catch (err) {
        console.error('Error attaching chat channel:', err);
      }

      client.connection.once('connected', async () => {
        console.log('[Ably] Client connected. Setting up presence...');
        try {
          if (presenceChannel.state !== 'attached') await presenceChannel.attach();
          presenceChannel.presence.subscribe(onPresenceUpdate);

          await presenceChannel.presence.enter({
            userId: user.username ? user.username.toLowerCase() : 'anonymous',
            inChatWith: peerUser.username.toLowerCase(),
            timestamp: Date.now(),
          });

          const members = await presenceChannel.presence.get();
          const onlineSet = new Set<string>();
          const presenceMap = new Map<string, Ably.PresenceMessage>();
          members.forEach((m) => {
            const onlineUsername = m.clientId.split('-')[0].toLowerCase();
            onlineSet.add(onlineUsername);
            presenceMap.set(onlineUsername, m);
          });

          setOnlineUsernames(onlineSet);
          setPresenceClients(presenceMap);
        } catch (err) {
          console.error('Error during presence setup:', err);
        }
      });
    })();

    return () => {
      (async () => {
        try {
          await safePresenceLeave(presenceChannel, clientId);
          presenceChannel.presence.unsubscribe();
          if (channel.state === 'attached') await channel.detach();
          if (presenceChannel.state === 'attached') await presenceChannel.detach();
          if (client.connection.state !== 'closed' && client.connection.state !== 'closing') {
           try {
  if (
    (client.connection.state as any) !== 'closing' &&
  (client.connection.state as any) !== 'closed'
  ) {
    try {
      client.close();
    } catch (e: any) {
      if (
        e.message !== 'Connection closed' &&
        e.message !== 'Cannot call close() on a closed connection'
      ) {
        console.warn('[Ably Cleanup] Unexpected error while closing client:', e);
      }
    }
  }
} catch (outerError) {
  console.warn('[Ably Cleanup] Failed to clean up client:', outerError);
}
          }

        } catch (err) {
          console.error('Error during cleanup:', err);
        }
        setAblyChannel(null);
        setAblyClient(null);
        setOnlineUsernames(new Set());
        setPresenceClients(new Map());
        clientRef.current = null;
        channelRef.current = null;
        presenceChannelRef.current = null;
      })();
    };
  }, [isLoaded, user, user?.username, ABLY_API_KEY, clientIdReady, clientId, peerUser]);


  useEffect(() => {
    if (!ablyClient || !user || !user.username) return;

    const presenceChannel = ablyClient.channels.get('global-presence');

    const updatePresence = async (inChatWith: string | null) => {
      try {
        if (presenceChannel.state !== 'attached') {
          await presenceChannel.attach();
        }
        await presenceChannel.presence.update({
          userId: user.username ? user.username.toLowerCase() : 'anonymous',
          inChatWith,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Error updating presence:', err);
      }
    };

    updatePresence(peerUsername.toLowerCase());

    return () => {
      (async () => {
        await updatePresence(null);
      })();
    };
  }, [ablyClient, user, user?.username, peerUsername]);

  const peerIsOnline = onlineUsernames.has(peerUsername.toLowerCase());
  const peerPresence = presenceClients.get(peerUsername.toLowerCase());
  const peerInChatWithYou = peerPresence?.data?.inChatWith === (user?.username ?? '').toLowerCase();

  if (!isLoaded)
    return <div className="text-white text-center p-6">Loading chat...</div>;

  const isChatReady =
    ablyChannel?.state === 'attached' &&
    user &&
    peerUser &&
    isLoaded;


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
                    className={`text-sm ${peerInChatWithYou
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
          {isChatReady ? (
            <ChatBox
              userId={user.id}
              username={user.username || user.fullName || 'Anonymous'}
              avatarUrl={user.imageUrl || '/default-avatar.png'}
              peerId={peerUser?.username || ''}
              ablyChannel={ablyChannel}
              peerStatus={{
                online: peerIsOnline,
                inChatWithYou: peerInChatWithYou,
              }}
            />
          ) : showFallback ? (
            <div className="flex items-center justify-center flex-grow text-white text-sm">
              Hey {user?.username}, Just loading..
            </div>
          ) : null}

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
