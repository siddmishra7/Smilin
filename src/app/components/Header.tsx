'use client';

import { useState } from 'react';
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="w-full backdrop-blur-lg bg-white/5 border-b border-white/10 shadow-md sticky top-0 z-50 rounded-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          {/* Logo / App Name */}
          <Link
            href="/"
            className="text-2xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent tracking-tight hover:brightness-200 transition duration-300 ease-in-out"
          >
            Smilin
          </Link>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition shadow"
            >
              Get Help
            </button>
          </div>
        </div>
      </header>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/80 text-black p-6 rounded-lg w-full max-w-md shadow-lg relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>

            <h2 className="text-xl font-semibold mb-4">How to Use the Chat</h2>
            <ol className="list-decimal list-inside space-y-2">
              <li>Sign in using your account.</li>
              <li>Navigate to the chat section.</li>
              <li>Select or Search the user you wants to chat with.</li>
              <li>Type your message and press Enter to send.</li>
              <li>Click your profile icon to log out or manage account settings.</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}

