'use client';

import { useEffect, useState, useRef } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Socket } from 'socket.io-client';
import MessageInput from './MessageInput';

type Message = {
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
    socket,
}: {
    userId: string;
    username: string;
    avatarUrl?: string;
    peerId?: string;
    socket: Socket;
}) {
    const [messages, setMessages] = useState<Message[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ✅ Fetch previous messages from API
    useEffect(() => {
        const fetchMessages = async () => {
            if (!peerId) return;

            try {
                const res = await fetch(`/api/messages?userId=${userId}&peerId=${peerId}`);
                const data = await res.json();
                setMessages(data);
            } catch (err) {
                console.error('Failed to fetch messages:', err);
            }
        };

        fetchMessages();
    }, [userId, peerId]);

    // ✅ Handle real-time incoming messages
    useEffect(() => {
        if (!socket) return;

        const handleChatMessage = (msg: Message) => {
            if (
                (msg.fromUserId === userId && msg.toUserId === peerId) ||
                (msg.fromUserId === peerId && msg.toUserId === userId)
            ) {
                setMessages((prev) => [...prev, msg]);
            }
        };

        socket.on('chat message', handleChatMessage);

        return () => {
            socket.off('chat message', handleChatMessage);
        };
    }, [userId, peerId, socket]);

    // ✅ Auto-scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (text: string) => {
        if (!peerId) return;

        const msg: Message = {
            fromUserId: userId,
            toUserId: peerId,
            username,
            avatarUrl,
            text,
            timestamp: new Date().toISOString(),
        };

        if (!socket.connected) {
            socket.connect();
            socket.once('connect', () => {
                socket.emit('chat message', msg);
            });
        } else {
            socket.emit('chat message', msg);
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
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center grow text-gray-400 italic">
                        Hey {username}, send something to start a chat!
                    </div>
                ) : (
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
                                    className={`max-w-[80%] p-3 rounded-lg break-words ${isOwn
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
