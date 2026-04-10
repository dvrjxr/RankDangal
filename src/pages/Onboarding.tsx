import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { User, Phone, MapPin, ChevronRight, Loader2, Zap } from 'lucide-react';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';

import { REGIONS } from '../constants';

export default function Onboarding() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    phone: '',
    region: 'Buxar (Sadar)',
    referralCode: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.name || !formData.phone) {
      toast.error('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const code = 'RD' + Math.random().toString(36).substring(2, 7).toUpperCase();
      
      let referredByUid = null;
      if (formData.referralCode.trim()) {
        const q = query(collection(db, 'users'), where('referralCode', '==', formData.referralCode.trim().toUpperCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
          referredByUid = snap.docs[0].id;
        } else {
          toast.error('Invalid referral code');
          setLoading(false);
          return;
        }
      }

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: formData.name,
        phone: formData.phone,
        region: formData.region,
        isPrime: false,
        primeExpiry: null,
        streak: 0,
        bestStreak: 0,
        totalPoints: 0,
        lastPracticeDate: null,
        upi: '',
        soundEnabled: true,
        hapticsEnabled: true,
        isAdmin: user.email === 'dvrjxr@gmail.com', // Set admin based on email
        referralCode: code,
        referredBy: referredByUid,
        referralCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      // Page will auto-redirect due to userData being set in AuthContext
    } catch (err) {
      console.error('Onboarding failed', err);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-0 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <Logo size={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-black text-t1">Complete Profile</h1>
          <p className="text-t3 text-sm font-black uppercase tracking-widest">Help us personalize your experience</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-bg-2 border-2 border-bg-4 p-8 rounded-[32px] space-y-6 shadow-[0_8px_0_var(--bg-4)]">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
              <input 
                type="text" 
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Your full name"
                className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl pl-12 pr-4 py-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
              <input 
                type="tel" 
                required
                pattern="[0-9]{10}"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="10-digit mobile number"
                className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl pl-12 pr-4 py-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">District Block</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
              <select 
                value={formData.region}
                onChange={e => setFormData({...formData, region: e.target.value})}
                className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl pl-12 pr-4 py-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all appearance-none"
              >
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
            <div className="relative">
              <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
              <input 
                type="text" 
                value={formData.referralCode}
                onChange={e => setFormData({...formData, referralCode: e.target.value})}
                placeholder="Enter referral code"
                className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl pl-12 pr-4 py-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all uppercase"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-blue mt-4"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                Start Preparation
                <ChevronRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
