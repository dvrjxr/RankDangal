import React from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] bg-bg-0 flex flex-col items-center justify-center transition-colors duration-300">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          duration: 0.6
        }}
        className="flex flex-col items-center"
      >
        <div className="relative">
          <Logo size={120} />
          <motion.div 
            className="absolute -inset-4 border-4 border-green rounded-[40px]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          />
        </div>
        
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
        >
          <h1 className="text-4xl font-black text-t1 tracking-tight">Rank Dangal</h1>
          <p className="text-t3 text-sm font-black uppercase tracking-[0.2em] mt-2">Study Daily. Rank Higher.</p>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-16 w-full max-w-[200px] px-4">
        <div className="h-3 bg-bg-4 rounded-full overflow-hidden border-2 border-bg-4">
          <motion.div 
            className="h-full bg-green"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ 
              duration: 2,
              ease: "easeInOut",
              repeat: Infinity
            }}
          />
        </div>
        <p className="text-center text-[10px] font-black text-t3 uppercase tracking-widest mt-4 animate-pulse">
          Loading your progress...
        </p>
      </div>
    </div>
  );
}
