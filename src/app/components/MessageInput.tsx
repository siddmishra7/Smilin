'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';


export default function MessageInput({ onSend }: { onSend: (msg: string) => void }) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <div className="w-full flex gap-3">
      <input
        type="text"
        placeholder='send message..'
        className="flex-1 border-2 outline-none px-2 py-3 bg-black rounded-lg"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
      />
      <button className="bg-black rounded-full border-2  text-white px-3 py-1" onClick={handleSend}>
        <Send size={20} strokeWidth={2} />
      </button>
    </div>
  );
}
