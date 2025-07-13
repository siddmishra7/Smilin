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
import { io, Socket } from 'socket.io-client';

type User = {
  id: string;
  fullName: string;
  imageUrl: string;
};

let socket: Socket | null = null;

function connectSocket(userId: string): Socket {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io',
      auth: { userId },
    });
  }
  return socket;
}

export default function ChatPageClient({ peerId }: { peerId: string }) {
  const { isLoaded, user } = useUser();
  const [peerUser, setPeerUser] = useState<User | null>(null);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [socketState, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    fetch('/api/socket');
  }, []);

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
    if (isLoaded && user) {
      const socketInstance = connectSocket(user.id);
      setSocket(socketInstance);
      socketInstance.on('online-users', (ids: string[]) => {
        setOnlineIds(ids);
      });

      return () => {
        socketInstance.off('online-users');
      };
    }
  }, [isLoaded, user]);

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
                    className={`text-sm ${
                      onlineIds.includes(peerId)
                        ? 'text-green-400'
                        : 'text-gray-300'
                    }`}
                  >
                    {onlineIds.includes(peerId) ? 'Online' : 'Offline'}
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
            {socketState ? (
              <ChatBox
                userId={user!.id}
                username={user!.fullName || 'Anonymous'}
                avatarUrl={user!.imageUrl || '/default-avatar.png'}
                peerId={peerId}
                socket={socketState}
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
