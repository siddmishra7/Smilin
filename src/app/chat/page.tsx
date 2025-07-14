import { Suspense } from 'react';
import ChatClient from './ChatClient';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="text-center p-4 text-white">Loading chat...</div>}>
      <ChatClient />
    </Suspense>
  );
}
