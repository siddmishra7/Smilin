'use client';

import { useEffect, useState } from 'react';
import { useUser, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createSocket, disconnectSocket } from './lib/socketClient';
import { SmileIcon } from 'lucide-react';

type User = {
  id: string;
  fullName: string;
  imageUrl: string;
};

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [, setSocket] = useState<ReturnType<typeof createSocket> | null>(null);

  useEffect(() => {
    fetch('/api/socket');
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
      const socketInstance = createSocket(user.id);
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        console.log('✅ Connected to socket server');
      });

      socketInstance.on('online-users', (ids: string[]) => {
        setOnlineIds(ids);
      });

      return () => {
        disconnectSocket();
      };
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isLoaded) return;

    const fetchUsers = async () => {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (user) {
        setUsers(data.filter((u: User) => u.id !== user.id));
      } else {
        setUsers(data);
      }
    };

    fetchUsers();
  }, [isLoaded, user]);

  if (!isLoaded) {
    return <div className="text-center p-10 text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#3a0ca3] via-[#7209b7] to-[#f72585] p-6 text-white">
      <div className="max-w-4xl mx-auto">
        <SignedIn>
          <header className="flex items-center justify-between mb-8">
            <h1 className="flex gap-2 items-center text-4xl font-extrabold tracking-tight"><SmileIcon size={36}/> Smilin</h1>
            <UserButton />
          </header>

          {users.length === 0 ? (
            <p className="text-white/80 italic">No other users are available right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {users.map((u) => {
                const isOnline = onlineIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => router.push(`/chat/${u.id}`)}
                    className="cursor-pointer bg-white/10 hover:bg-white/20 transition-all duration-200 p-5 rounded-xl flex flex-col items-center text-center group"
                  >
                    <div className="relative">
                      <img
                        src={u.imageUrl || '/default-avatar.png'}
                        alt={u.fullName}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white/30 group-hover:scale-105 transition"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-black ${
                          isOnline ? 'bg-green-400' : 'bg-gray-500'
                        }`}
                      ></span>
                    </div>
                    <div className="mt-3">
                      <div className="font-semibold text-lg">{u.fullName}</div>
                      <div className="text-sm text-white/70">
                        {isOnline ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SignedIn>

        <SignedOut>
          <div className="text-center mt-12">
            <p className="mb-4 text-lg">You must be signed in to start chatting.</p>
            <SignInButton mode="modal">
              <button className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition font-semibold text-white">
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>
      </div>
    </main>
  );
}
