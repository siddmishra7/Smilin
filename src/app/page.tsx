'use client';

import { useEffect, useState, useRef } from 'react';
import { useUser, SignedIn, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Ably from 'ably';
import { FiSearch } from 'react-icons/fi';
import type { RealtimeChannel } from 'ably';
import SignInPrompt from './components/Home';

type User = {
  id: string;
  fullName: string;
  username: string;
  imageUrl: string;
};

function getUniqueClientId(userId: string) {
  return `${userId}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const [onlineMap, setOnlineMap] = useState<Map<string, Set<string>>>(new Map());
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
  const ablyClientRef = useRef<Ably.Realtime | null>(null);

  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);


  useEffect(() => {
    if (!isLoaded) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data: User[] = await res.json();
        if (user) {
          setUsers(data.filter((u) => u.id !== user.id));
        } else {
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
      }
    };

    fetchUsers();
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user || users.length === 0) return;

    const clientId = getUniqueClientId(user.id);
    const client = new Ably.Realtime({
      key: process.env.NEXT_PUBLIC_ABLY_API_KEY!,
      clientId,
    });

    ablyClientRef.current = client;

    const presenceChannel = client.channels.get('global-presence');
    const channelMap: Record<string, RealtimeChannel> = {};

    const handleMessage = (msg: Ably.Message) => {
      const senderId = msg.data?.fromUserId;
      if (!senderId || senderId === user.id) return;

      setMessageCounts((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
    };

    let isMounted = true;

    async function setupChannels() {
      try {
        await presenceChannel.attach();
        await presenceChannel.presence.enter('online');

        presenceChannel.presence.subscribe((presenceMsg: Ably.PresenceMessage) => {
          if (!isMounted) return;

          const fullClientId = presenceMsg.clientId;
          const userId = fullClientId.split('-')[0];

          setOnlineMap((prevMap) => {
            const newMap = new Map(prevMap);
            const clientSet = newMap.get(userId) || new Set();

            if (['enter', 'update'].includes(presenceMsg.action)) {
              clientSet.add(fullClientId);
              newMap.set(userId, clientSet);
            } else if (['leave', 'absent'].includes(presenceMsg.action)) {
              clientSet.delete(fullClientId);
              if (clientSet.size === 0) {
                newMap.delete(userId);
              } else {
                newMap.set(userId, clientSet);
              }
            }

            return newMap;
          });
        });

        users.forEach((u) => {
          const channelName = [user!.id, u.id].sort().join(':');
          const channel = client.channels.get(channelName);
          channel.subscribe('chat-message', handleMessage);
          channelMap[channelName] = channel;
        });
      } catch (err) {
        console.error('Error setting up Ably:', err);
      }
    }

    setupChannels();

    return () => {
      isMounted = false;

      if (presenceChannel.state === 'attached') {
        presenceChannel.presence.leave().catch(console.error);
      }

      presenceChannel.presence.unsubscribe();

      Object.values(channelMap).forEach((channel) => {
        channel.unsubscribe('chat-message', handleMessage);
      });

      try {
  if (
    client.connection.state !== 'closed' &&
    client.connection.state !== 'closing'
  ) {
    client.close();
  }
} catch (error) {
  console.warn('[Ably Cleanup] Error closing connection:', error);
}
    };
  }, [isLoaded, user, users]);

  const handleChatOpen = (username: string) => {
    setMessageCounts((prev) => {
      const updated = { ...prev };
      delete updated[username];
      return updated;
    });

    router.push(`/chat/${username}`);
  };


const filteredUsers = users.filter((u) => {
  const term = searchTerm.toLowerCase();
  return (
    u.fullName.toLowerCase().includes(term) ||
    u.username.toLowerCase().includes(term)
  );
});

  if (!isLoaded) {
    return <div className="text-center p-10 text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#1e1e2f] via-[#48005ec4] to-[#1e1e2f] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <SignedIn>
          <header className="flex items-center justify-between mb-10">
            <h1 className="text-4xl font-bold tracking-tight drop-shadow-sm">Smilin</h1>
            <div className="flex items-center gap-4">
              <div ref={searchRef} className="relative transition-all duration-300 ease-in-out">
                <button
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className="text-white text-xl p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
                >
                  <FiSearch />
                </button>

                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`absolute right-0 top-full mt-2 w-64 bg-[#2a2c4b] text-white px-4 py-2 rounded-md border border-gray-600 transition-all duration-300 ease-in-out shadow-md ${isSearchOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                    }`}
                />
              </div>

              <UserButton />
            </div>
          </header>

          <h2 className="text-xl font-semibold mb-4 text-white/90">Available Users</h2>

          {filteredUsers.length === 0 ? (
            <p className="text-white/70 italic">No users found.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredUsers.map((u) => {
                const isOnline = onlineMap.has(u.id);
                const unreadCount = messageCounts[u.id] || 0;

                return (
                  <div
                    key={u.id}
                    onClick={() => handleChatOpen(u.username)}
                    className="group cursor-pointer bg-white/10 hover:bg-white/5 transition-all duration-200 p-5 rounded-xl shadow-md hover:shadow-xl flex flex-col items-center text-center relative"
                  >
                    <div className="relative">
                      <img
                        src={u.imageUrl || '/default-avatar.png'}
                        alt={u.fullName}
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20 group-hover:scale-105 transition"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#2a2c4b] ${isOnline ? 'bg-green-400' : 'bg-gray-500'
                          }`}
                      ></span>

                      {unreadCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow">
                          {unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <p className="font-semibold text-lg">{u.fullName}</p>
                      <p className="text-xs">@{u.username}</p>
                      <p className="text-sm text-white/60">{isOnline ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SignedIn>

        <SignInPrompt />
      </div>
    </main>
  );
}
