import React, { useState } from 'react';
import { toast } from 'sonner';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { ShieldCheck, FileText, Lock, Loader2, Mail, Key, User, Phone, Eye, EyeOff, Zap } from 'lucide-react';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';

type AuthMode = 'login' | 'signup';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    referralCode: ''
  });

  const [consent, setConsent] = useState({
    parental: false,
    terms: false,
    privacy: false
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent.parental || !consent.terms || !consent.privacy) {
      toast.error('Please agree to all terms and parental consent to continue.');
      return;
    }

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup' && (!formData.name || !formData.phone)) {
      toast.error('Please fill in all fields for signup.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        let referredByUid = null;
        if (formData.referralCode.trim()) {
          const q = query(collection(db, 'users'), where('referralCode', '==', formData.referralCode.trim().toUpperCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            referredByUid = snap.docs[0].id;
          } else {
            toast.error('Invalid referral code.');
            setLoading(false);
            return;
          }
        }

        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        // Initial user data will be handled by Onboarding, but we can set some basics here
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          createdAt: serverTimestamp(),
          totalPoints: 0,
          streak: 0,
          isAdmin: false,
          referredBy: referredByUid,
          referralCount: 0
        });
        toast.success('Account created successfully!');
      }
    } catch (err: any) {
      console.error('Auth failed', err);
      if (err.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please log in instead.');
      } else if (err.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters.');
      } else {
        toast.error(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!consent.parental || !consent.terms || !consent.privacy) {
      toast.error('Please agree to all terms and parental consent to continue.');
      return;
    }

    setLoading(true);
    try {
      await signInAnonymously(auth);
      toast.success('Logged in as Guest');
    } catch (err: any) {
      console.error('Guest login failed', err);
      toast.error('Guest login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, formData.email);
      toast.success('Password reset email sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-0 flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
      <div className="w-full max-w-sm space-y-10 animate-slide-up">
        <div className="space-y-4">
          <Logo size={80} className="mx-auto" />
          <h1 className="text-4xl font-black text-t1 tracking-tight uppercase">Rank Dangal</h1>
          <p className="text-t3 font-black uppercase tracking-widest text-[11px]">Study Daily. Rank Higher.</p>
        </div>

        <div className="bg-bg-2 border-2 border-bg-4 p-8 rounded-[32px] space-y-8 shadow-[0_8px_0_var(--bg-4)]">
          <div className="flex bg-bg-1 p-1.5 rounded-2xl border-2 border-bg-4">
            <button 
              onClick={() => setMode('login')}
              className={cn(
                "flex-1 py-3 text-sm font-black rounded-xl transition-all uppercase tracking-widest",
                mode === 'login' ? "bg-green text-white shadow-[0_4px_0_var(--green-dk)]" : "text-t3 hover:text-t1"
              )}
            >
              Login
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={cn(
                "flex-1 py-3 text-sm font-black rounded-xl transition-all uppercase tracking-widest",
                mode === 'signup' ? "bg-green text-white shadow-[0_4px_0_var(--green-dk)]" : "text-t3 hover:text-t1"
              )}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6 text-left">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
                    <input 
                      type="text"
                      placeholder="Your Name"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
                    <input 
                      type="tel"
                      placeholder="10-digit mobile"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Referral Code (Optional)</label>
                  <div className="relative">
                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
                    <input 
                      type="text"
                      placeholder="Enter referral code"
                      value={formData.referralCode}
                      onChange={e => setFormData({...formData, referralCode: e.target.value})}
                      className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all uppercase"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
                <input 
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-t3" />
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl py-4 pl-12 pr-12 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-t3 hover:text-t1 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {mode === 'login' && (
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] font-black text-blue hover:underline ml-1 mt-1 uppercase tracking-widest"
                >
                  Forgot Password?
                </button>
              )}
            </div>

            <div className="pt-4 space-y-6">
              <div className="space-y-4">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={consent.parental}
                    onChange={e => setConsent({...consent, parental: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded-lg border-2 border-bg-4 bg-bg-2 text-green focus:ring-green"
                  />
                  <span className="text-[12px] text-t2 font-bold group-hover:text-t1 transition-colors text-left leading-tight">
                    I confirm I have parental consent to use this app.
                  </span>
                </label>
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={consent.terms}
                    onChange={e => setConsent({...consent, terms: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded-lg border-2 border-bg-4 bg-bg-2 text-green focus:ring-green"
                  />
                  <span className="text-[12px] text-t2 font-bold group-hover:text-t1 transition-colors text-left leading-tight">
                    I agree to the <span className="text-blue hover:underline">Terms & Conditions</span>.
                  </span>
                </label>
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={consent.privacy}
                    onChange={e => setConsent({...consent, privacy: e.target.checked})}
                    className="mt-1 w-5 h-5 rounded-lg border-2 border-bg-4 bg-bg-2 text-green focus:ring-green"
                  />
                  <span className="text-[12px] text-t2 font-bold group-hover:text-t1 transition-colors text-left leading-tight">
                    I agree to the <span className="text-blue hover:underline">Privacy Policy</span>.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : (
                  mode === 'login' ? 'Login' : 'Create Account'
                )}
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="h-0.5 flex-1 bg-bg-4" />
                <span className="text-[11px] font-black text-t3 uppercase tracking-widest">or</span>
                <div className="h-0.5 flex-1 bg-bg-4" />
              </div>

              <button
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="btn-secondary"
              >
                Continue as Guest
              </button>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-center gap-8 text-t3">
          <div className="flex flex-col items-center gap-2">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Secure</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Educational</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Lock className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest">Private</span>
          </div>
        </div>
      </div>
    </div>
  );
}
