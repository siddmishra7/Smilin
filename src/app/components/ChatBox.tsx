'use client';

import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { RealtimeChannel, Message } from 'ably';
import MessageInput from './MessageInput';

type ChatMessage = {
  messageId: string;
  fromUserId: string;
  toUserId: string;
  username: string;
  avatarUrl?: string;
  text: string;
  timestamp: string;
};

type PeerStatus = {
  online: boolean;
  inChatWithYou: boolean;
};

export default function ChatBox({
  userId,
  username,
  avatarUrl,
  peerId,
  ablyChannel,
}: {
  userId: string;
  username: string;
  avatarUrl?: string;
  peerId?: string;
  ablyChannel: RealtimeChannel;
  peerStatus: PeerStatus;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Peer avatar from last message by peer
  const peerAvatar = [...messages]
    .reverse()
    .find((m) => m.fromUserId === peerId)?.avatarUrl;

  useEffect(() => {
    if (!peerId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?userId=${userId}&peerId=${peerId}`);
        const data = await res.json();
        if (Array.isArray(data)) setMessages(data);
        else setMessages([]);
      } catch (err) {
        console.error('Fetch error:', err);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [userId, peerId]);

  useEffect(() => {
    if (!ablyChannel) return;

    let isSubscribed = true;

    async function subscribeToChannel() {
      if (ablyChannel.state !== 'attached') {
        try {
          await ablyChannel.attach();
        } catch (err) {
          console.error('Error attaching channel:', err);
          return;
        }
      }

      const receivedMessages = new Set<string>();

      const handleMessage = (msg: Message) => {
        if (!isSubscribed) return;

        if (msg.name === 'chat-message') {
          const data = msg.data as ChatMessage;
          if (
            (data.fromUserId === userId && data.toUserId === peerId) ||
            (data.fromUserId === peerId && data.toUserId === userId)
          ) {
            if (!receivedMessages.has(data.messageId)) {
              receivedMessages.add(data.messageId);
              setMessages((prev) => [...prev, data]);
            }
          }
        } else if (msg.name === 'typing') {
          const { fromUserId, toUserId } = msg.data;
          if (fromUserId === peerId && toUserId === userId) {
            setIsTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
          }
        }
      };

      ablyChannel.subscribe(handleMessage);

      return () => {
        isSubscribed = false;
        ablyChannel.unsubscribe(handleMessage);
      };
    }

    const unsubscribePromise = subscribeToChannel();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      unsubscribePromise.then((cleanup) => {
        cleanup?.();
      });
    };
  }, [ablyChannel, userId, peerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!peerId) return;

    if (ablyChannel.state !== 'attached') {
      try {
        await ablyChannel.attach();
      } catch (err) {
        console.error('Error attaching channel before publish:', err);
        return;
      }
    }

    const msg: ChatMessage = {
      messageId: crypto.randomUUID(),
      fromUserId: userId,
      toUserId: peerId,
      username,
      avatarUrl,
      text,
      timestamp: new Date().toISOString(),
    };

    try {
      await ablyChannel.publish('chat-message', msg);

      await fetch('/api/messages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleTyping = () => {
    if (!peerId) return;

    if (ablyChannel.state !== 'attached') {
      ablyChannel
        .attach()
        .then(() => {
          ablyChannel.publish('typing', { fromUserId: userId, toUserId: peerId });
        })
        .catch((err) => {
          console.error('Error attaching channel before typing:', err);
        });
    } else {
      ablyChannel.publish('typing', { fromUserId: userId, toUserId: peerId });
    }
  };

  return (
    <div className="flex flex-col grow h-[80vh]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map(({ messageId, fromUserId, username: name, avatarUrl: avatar, text, timestamp }) => {
          const isOwn = fromUserId === userId;
          return (
            <div
              key={messageId || `${fromUserId}-${timestamp}`}
              className={`flex items-end gap-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {!isOwn && (
                <img
                  title={name}
                  src={avatar || '/default-avatar.png'}
                  alt={`${name}'s avatar`}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <div
                className={`max-w-[80%] p-3 rounded-lg break-words ${
                  isOwn
                    ? 'bg-purple-600 text-white font-semibold rounded'
                    : 'bg-gray-700 text-white font-semibold rounded-bl-none'
                }`}
              >
                <div>{text}</div>
                <div className="text-xs text-gray-300 mt-1 text-right">
                  {formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true })}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-end gap-3 justify-start">
            <img
              src={peerAvatar || '/default-avatar.png'}
              alt="Typing..."
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="bg-gray-700 text-white rounded-bl-none font-semibold rounded-lg px-4 py-2 max-w-[80%] animate-pulse">
              <span className="opacity-80">Typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-1 border-t border-black border-4">
        <div className="flex items-center gap-2">
          <MessageInput onSend={sendMessage} onTyping={handleTyping} />
        </div>
      </div>
    </div>
  );
}
