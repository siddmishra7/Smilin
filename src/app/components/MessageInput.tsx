// MessageInput.tsx
'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

type Props = {
  onSend: (msg: string) => void;
  onTyping?: () => void;
};

export default function MessageInput({ onSend, onTyping }: Props) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (onTyping) onTyping();
  };

  return (
    <div className="w-full flex gap-3">
      <input
        type="text"
        placeholder="send message.."
        className="flex-1 border-2 outline-none px-2 py-3 bg-black rounded-lg"
        value={message}
        onChange={handleChange}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <button
        className="bg-black rounded-full border-2 text-white px-3 py-1 cursor-pointer"
        onClick={handleSend}
      >
        <Send strokeWidth={2} className="size-5 hover:text-purple-500" />
      </button>
    </div>
  );
}
