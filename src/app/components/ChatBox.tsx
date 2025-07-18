'use client';

import { useEffect, useState, useRef } from 'react';
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
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!peerId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?userId=${userId}&peerId=${peerId}`);
        if (!res.ok) {
          const text = await res.text();
          console.error('Failed to fetch messages:', text);
          setMessages([]);
          return;
        }
        const data = await res.json();

        if (Array.isArray(data)) {
          setMessages(data);
          console.log('Fetched messages:', data);
        } else {
          console.error('Messages data is not an array:', data);
          setMessages([]);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [userId, peerId]);

  useEffect(() => {
    if (!ablyChannel) return;

    const receivedMessages = new Set<string>();

    const handleMessage = (msg: Message) => {
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
    };

    ablyChannel.subscribe(handleMessage);

    return () => {
      ablyChannel.unsubscribe(handleMessage);
    };
  }, [userId, peerId, ablyChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Optional: log channel state changes for debugging
  useEffect(() => {
    if (!ablyChannel) return;

    const onUpdate = () => {
      console.log('Channel state updated:', ablyChannel.state);
    };

    ablyChannel.on('update', onUpdate);

    return () => {
      ablyChannel.off('update', onUpdate);
    };
  }, [ablyChannel]);

  const sendMessage = async (text: string) => {
    if (!peerId) return;

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
      // Ensure channel is attached before publishing
      if (ablyChannel.state !== 'attached') {
        await ablyChannel.attach();
      }

      // Publish realtime message
      await ablyChannel.publish('chat-message', msg);

      // Save message to DB
      const res = await fetch('/api/messages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to save message: ${text}`);
      }
    } catch (err) {
      console.error('Failed to send or save message:', err);
    }
  };

  if (!peerId) {
    return (
      <div className="flex grow items-center justify-center text-gray-400 italic">
        Select a user to start chatting.
      </div>
    );
  }

  return (
    <div className="flex flex-col grow">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {Array.isArray(messages) && messages.length > 0 ? (
          messages.map(({ fromUserId, username: name, avatarUrl: avatar, text, timestamp }, i) => {
            const isOwn = fromUserId === userId;
            return (
              <div
                key={i}
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
                      ? 'bg-purple-600 text-white font-semibold rounded-br-none'
                      : 'bg-gray-700 text-white font-semibold rounded-bl-none'
                  }`}
                >
                  <div>{text}</div>
                  <div className="text-xs text-gray-300 mt-1 text-right">
                    {formatDistanceToNowStrict(new Date(timestamp), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                {isOwn && (
                  <img
                    title={username}
                    src={avatarUrl || '/default-avatar.png'}
                    alt="Your avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center grow text-gray-400 italic">
            Hey {username}, send something to start a chat!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-1 border-t border-black border-4">
        <div className="flex items-center gap-2">
          <MessageInput onSend={sendMessage} />
        </div>
      </div>
    </div>
  );
}
