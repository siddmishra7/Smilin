'use client'

import { SignedOut, SignInButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import Header from './Header';

export default function SignInPrompt() {
  return (
    <SignedOut >
        <Header/>
      <motion.div
        className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.h1
          className="text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-indigo-400 via-pink-500 to-yellow-400 bg-clip-text text-transparent tracking-tight"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Welcome to <span className="drop-shadow-sm text-white tracking-tight">Smilin</span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-white/70 max-w-xl mb-10 font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Sign in to join real-time conversations and connect with people who make you smile.
        </motion.p>

        <SignInButton mode="modal">
          <motion.button
            whileHover={{
              scale: 1.1,
              boxShadow: '0 0 25px rgba(236, 72, 153, 0.6)', // pink glow
            }}
            whileTap={{ scale: 0.95 }}
            className="relative inline-flex items-center justify-center px-8 py-3 font-semibold text-white bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-500 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:brightness-110 overflow-hidden cursor-grabbing"
          >
            <span className="relative z-10">Sign In</span>
            <span
              className="absolute inset-0 bg-white/10 rounded-2xl blur-md opacity-30 hover:opacity-50 transition duration-300"
              aria-hidden="true"
            />
          </motion.button>
        </SignInButton>
      </motion.div>
    </SignedOut>
  );
}
