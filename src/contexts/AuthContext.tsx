import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { soundManager } from '../lib/sounds';

// Helper to generate a random referral code
const generateReferralCode = (name: string) => {
  const prefix = name.slice(0, 3).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${random}`;
};

interface UserData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  region: string;
  isPrime: boolean;
  primeExpiry: any;
  streak: number;
  bestStreak: number;
  totalPoints: number;
  lastPracticeDate: string;
  upi: string;
  isAdmin: boolean;
  hapticsEnabled?: boolean;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  hasUnread?: boolean;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  isAuthReady: boolean;
  showPrimeModal: boolean;
  setShowPrimeModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showPrimeModal, setShowPrimeModal] = useState(false);

  useEffect(() => {
    // Load cached data first
    const cached = localStorage.getItem('rd_user_data');
    if (cached) {
      try {
        setUserData(JSON.parse(cached));
      } catch (e) {}
    }

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthReady(true);
      
      if (user) {
        // Only fetch if not cached or to refresh
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            if (!data.referralCode) {
              const newCode = generateReferralCode(data.name || 'USER');
              await updateDoc(doc(db, 'users', user.uid), { referralCode: newCode });
              data.referralCode = newCode;
            }
            const finalData = { ...data, uid: user.uid }; // Ensure uid is present
            setUserData(finalData);
            localStorage.setItem('rd_user_data', JSON.stringify(finalData));
          }
        } catch (err) {
          console.warn('Initial user data fetch failed (offline?):', err);
        }
      } else {
        setUserData(null);
        localStorage.removeItem('rd_user_data');
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Real-time listener for prime status and notifications (cheap)
  useEffect(() => {
    if (!user) return;
    
    const unsub = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        
        // Check prime expiry
        if (data.isPrime && data.primeExpiry) {
          if (new Date(data.primeExpiry) < new Date()) {
            data.isPrime = false;
            try {
              await updateDoc(doc(db, 'users', user.uid), { isPrime: false });
            } catch (e) {
              console.error('Failed to revoke expired prime', e);
            }
          }
        }

        setUserData(prev => {
          const newData = { ...prev, ...data, uid: user.uid }; // Ensure uid is present
          localStorage.setItem('rd_user_data', JSON.stringify(newData));
          return newData;
        });

        // Sync sound/haptic preferences
        soundManager.soundEnabled = data.soundEnabled !== false;
        soundManager.hapticsEnabled = data.hapticsEnabled !== false;
      }
    });

    return () => unsub();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAuthReady, showPrimeModal, setShowPrimeModal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
