import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Home, Trophy, Calendar, BookOpen, User, Bell, Zap, Flame, Star, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import PrimeModal from './PrimeModal';
import Logo from './Logo';
import { cn } from '../lib/utils';
import { soundManager } from '../lib/sounds';

export default function Layout() {
  const { userData, showPrimeModal, setShowPrimeModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSundayLive, setIsSundayLive] = useState(false);

  useEffect(() => {
    const handleOpenPrime = () => setShowPrimeModal(true);
    window.addEventListener('open-prime-modal', handleOpenPrime);
    return () => window.removeEventListener('open-prime-modal', handleOpenPrime);
  }, [setShowPrimeModal]);

  useEffect(() => {
    const checkSunday = async () => {
      try {
        const now = new Date();
        if (now.getDay() === 0) { // Sunday
          const contestSnap = await getDoc(doc(db, 'public', 'sundayContestCurrent'));
          if (contestSnap.exists() && contestSnap.data().status === 'live') {
            setIsSundayLive(true);
          }
        }
      } catch (e) {
        console.warn('Sunday check failed:', e);
      }
    };
    checkSunday();
  }, []);

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/rank', icon: Trophy, label: 'Rank' },
    { path: '/sunday', icon: Calendar, label: 'Sunday' },
    { path: '/pyq', icon: BookOpen, label: 'PYQ' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-bg-0 text-t1 pb-24 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-[100] w-full bg-bg-0 border-b-2 border-bg-4 px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Logo size={40} />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-black text-t1">Rank Dangal</span>
            <span className="text-[10px] font-black text-t3 uppercase tracking-widest">Study Daily. Rank Higher.</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!userData ? (
            <button 
              onClick={() => {
                soundManager.play('click');
                navigate('/auth');
              }}
              className="btn-primary text-[11px] px-5 py-2.5"
            >
              Login
            </button>
          ) : (
            <>
              {/* Prime Badge/Button */}
              {userData?.isPrime ? (
                <motion.div 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    soundManager.play('click');
                    setShowPrimeModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-gradient-to-br from-green to-green-dk border-2 border-green px-3 py-1.5 rounded-2xl font-black text-sm text-white cursor-pointer shadow-[0_2px_0_#2d6a01] relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
                  <Zap className="w-4 h-4 fill-current" />
                  <span className="text-[10px] uppercase tracking-widest">Prime</span>
                </motion.div>
              ) : (
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    soundManager.play('click');
                    setShowPrimeModal(true);
                  }}
                  className="relative overflow-hidden bg-gradient-to-br from-gold to-orange border-2 border-gold px-4 py-1.5 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-[0_2px_0_#e5a400] group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    Join Prime
                  </span>
                </motion.button>
              )}

              {/* Admin Panel */}
              {userData?.isAdmin && (
                <button 
                  onClick={() => {
                    soundManager.play('click');
                    navigate('/admin');
                  }}
                  className="w-10 h-10 rounded-2xl bg-bg-1 border-2 border-gold flex items-center justify-center text-gold hover:bg-gold hover:text-white transition-all active:translate-y-[1px] shadow-[0_2px_0_var(--gold-dk)]"
                >
                  <ShieldAlert className="w-5 h-5" />
                </button>
              )}

              {/* Notifications */}
              <button 
                onClick={() => {
                  soundManager.play('click');
                  navigate('/notifications');
                }}
                className="relative w-10 h-10 rounded-2xl bg-bg-1 border-2 border-bg-4 flex items-center justify-center text-t3 hover:text-t1 transition-all active:translate-y-[1px] shadow-[0_2px_0_var(--bg-4)]"
              >
                <Bell className="w-5 h-5" />
                <span className={cn("absolute top-1 right-1 w-3 h-3 bg-red rounded-full border-2 border-white animate-pulse hidden", userData?.hasUnread && "block")} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[480px] mx-auto">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[200] w-full max-w-[480px] bg-bg-0 border-t-2 border-bg-4 flex items-stretch px-2 py-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => {
                soundManager.play('click');
                navigate(item.path);
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 px-1 transition-all relative rounded-2xl",
                isActive ? "bg-blue-glow text-blue border-2 border-blue" : "text-t3 border-2 border-transparent"
              )}
            >
              <item.icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              
              {item.path === '/sunday' && isSundayLive && (
                <span className="absolute top-1 right-2 bg-red text-white text-[8px] font-black px-1.5 py-0.5 rounded-full tracking-widest animate-pulse">LIVE</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      {showPrimeModal && <PrimeModal onClose={() => setShowPrimeModal(false)} />}
    </div>
  );
}
