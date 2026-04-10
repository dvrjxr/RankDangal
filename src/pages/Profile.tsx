import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, CreditCard, Edit2, Check, Zap, Trophy, Flame, Save, X, Star, Volume2, VolumeX, Smartphone, SmartphoneNfc, Copy, Share2, ShieldCheck, BookOpen, Sparkles, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { cn, formatPts, getTier } from '../lib/utils';
import { soundManager } from '../lib/sounds';
import StreakCalendar from '../components/StreakCalendar';

import { REGIONS } from '../constants';

export default function Profile() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    region: 'Buxar (Sadar)',
    upi: ''
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        phone: userData.phone || '',
        region: userData.region || 'Buxar (Sadar)',
        upi: userData.upi || ''
      });
    }
  }, [userData]);

  const handleSave = async () => {
    if (!userData?.uid) {
      toast.error('User session expired. Please login again.');
      return;
    }
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error('Name and Phone are required');
      return;
    }

    setSaving(true);
    soundManager.play('click');
    try {
      // Filter out empty strings if necessary, but here we want to allow clearing fields
      const updateData: any = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        region: formData.region,
        upi: formData.upi.trim(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'users', userData.uid), updateData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = async (key: 'soundEnabled' | 'hapticsEnabled') => {
    if (!userData?.uid) {
      console.error('Preference update error: No user ID found');
      toast.error('Please login again to update preferences');
      return;
    }
    // Default to true if undefined
    const currentValue = userData[key] !== false;
    const newValue = !currentValue;
    soundManager.play('click');
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        [key]: newValue,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Preference update error:', err);
      toast.error('Failed to update preference');
    }
  };

  const tier = getTier(userData?.totalPoints || 0);

  return (
    <div className="px-4 py-8 space-y-8 pb-12 bg-bg-0 min-h-screen transition-colors duration-300">
      {/* Profile Header */}
      <div className="bg-bg-2 border-2 border-bg-4 rounded-[32px] p-8 text-center relative overflow-hidden shadow-[0_8px_0_var(--bg-4)]">
        <div className="absolute top-0 right-0 p-4 flex gap-2">
          <button 
            onClick={() => {
              soundManager.play('click');
              navigate('/settings');
            }}
            className="w-10 h-10 bg-bg-1 hover:bg-bg-4 text-t3 rounded-2xl flex items-center justify-center transition-all border-2 border-bg-4"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
            className="w-10 h-10 bg-bg-1 hover:bg-bg-4 text-t3 rounded-2xl flex items-center justify-center transition-all border-2 border-bg-4"
          >
            {isEditing ? <X className="w-5 h-5" /> : <Edit2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative inline-block mb-6">
          <div className="w-28 h-28 bg-blue rounded-[32px] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-blue/20 rotate-3 group hover:rotate-0 transition-transform duration-500">
            {userData?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          {userData?.isPrime && (
            <div className="absolute -bottom-2 -right-2 bg-gold text-white p-2 rounded-2xl border-4 border-white dark:border-bg-2 shadow-lg">
              <Zap className="w-5 h-5 fill-current" />
            </div>
          )}
        </div>

        <h2 className="text-3xl font-black text-t1">{userData?.name}</h2>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="text-t3 text-sm font-black uppercase tracking-widest">{userData?.region}</span>
          <div className="w-1.5 h-1.5 bg-bg-4 rounded-full" />
          <span className="text-blue text-sm font-black uppercase tracking-widest flex items-center gap-1">
            {tier.icon} {tier.name}
          </span>
        </div>
        
        {userData?.isPrime && (
          <div className="mt-6 inline-flex items-center gap-2 bg-gold-glow border-2 border-gold px-5 py-2 rounded-full">
            <Zap className="w-4 h-4 text-gold fill-current" />
            <span className="text-[11px] font-black text-gold uppercase tracking-widest">Prime Member</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="bg-bg-2 border-2 border-bg-4 p-6 rounded-[32px] shadow-[0_8px_0_var(--bg-4)] space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <Trophy className="w-6 h-6 text-blue mx-auto mb-2" />
            <div className="text-xl font-black text-t1">{formatPts(userData?.totalPoints || 0)}</div>
            <div className="text-[10px] text-t3 font-black uppercase tracking-widest">Points</div>
          </div>
          <div className="text-center">
            <Flame className="w-6 h-6 text-orange mx-auto mb-2" />
            <div className="text-xl font-black text-t1">{userData?.streak || 0}</div>
            <div className="text-[10px] text-t3 font-black uppercase tracking-widest">Streak</div>
          </div>
          <div className="text-center">
            <Check className="w-6 h-6 text-green mx-auto mb-2" />
            <div className="text-xl font-black text-t1">{userData?.bestStreak || 0}</div>
            <div className="text-[10px] text-t3 font-black uppercase tracking-widest">Best</div>
          </div>
        </div>
        <StreakCalendar streak={userData?.streak || 0} lastPracticeDate={userData?.lastPracticeDate || null} />
      </div>

      {/* Details / Edit Form */}
      <div className="bg-bg-2 border-2 border-bg-4 rounded-[32px] overflow-hidden shadow-[0_4px_0_var(--bg-4)]">
        <div className="p-8 space-y-8">
          {isEditing ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl px-5 py-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl px-5 py-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">District Block</label>
                <select 
                  value={formData.region}
                  onChange={e => setFormData({...formData, region: e.target.value})}
                  className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl px-5 py-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all appearance-none"
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-t3 uppercase tracking-widest ml-1">UPI ID (for scholarship)</label>
                <input 
                  type="text" 
                  value={formData.upi}
                  onChange={e => setFormData({...formData, upi: e.target.value})}
                  placeholder="yourname@upi"
                  className="w-full bg-bg-1 border-2 border-bg-4 rounded-2xl px-5 py-4 text-base font-bold text-t1 focus:border-blue outline-none transition-all"
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Saving...' : <><Save className="w-6 h-6" /> Save Changes</>}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-bg-1 rounded-2xl flex items-center justify-center text-t3 border-2 border-bg-4">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-t3 uppercase tracking-widest">Full Name</div>
                  <div className="text-base font-black text-t1">{userData?.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-bg-1 rounded-2xl flex items-center justify-center text-t3 border-2 border-bg-4">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-t3 uppercase tracking-widest">Phone</div>
                  <div className="text-base font-black text-t1">{userData?.phone || 'Not set'}</div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-bg-1 rounded-2xl flex items-center justify-center text-t3 border-2 border-bg-4">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-t3 uppercase tracking-widest">Region</div>
                  <div className="text-base font-black text-t1">{userData?.region}</div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-bg-1 rounded-2xl flex items-center justify-center text-t3 border-2 border-bg-4">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-black text-t3 uppercase tracking-widest">UPI ID</div>
                  <div className="text-base font-black text-t1">{userData?.upi || 'Not set'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Referral System */}
      <div className="bg-bg-2 border-2 border-bg-4 rounded-[32px] overflow-hidden shadow-[0_4px_0_var(--bg-4)]">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Share2 className="w-6 h-6 text-blue" />
            <h3 className="text-lg font-black text-t1">Refer & Earn</h3>
          </div>
          <p className="text-sm text-t2 font-bold">
            Share your code with friends. When they join Prime, you get <span className="text-green font-black">2 Days Prime</span> for free!
          </p>
          
          <div className="flex items-center gap-3 p-4 bg-bg-1 rounded-2xl border-2 border-bg-4">
            <div className="flex-1">
              <div className="text-[10px] text-t3 font-black uppercase tracking-widest">Your Referral Code</div>
              <div className="text-xl font-black text-t1 tracking-wider">{userData?.referralCode || '------'}</div>
            </div>
            <button 
              onClick={() => {
                if (userData?.referralCode) {
                  navigator.clipboard.writeText(userData.referralCode);
                  toast.success('Code copied to clipboard!');
                  soundManager.play('click');
                }
              }}
              className="w-12 h-12 bg-bg-2 border-2 border-bg-4 rounded-xl flex items-center justify-center text-blue hover:bg-blue-glow hover:border-blue transition-all"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center justify-between text-sm font-bold text-t3">
            <span>Successful Referrals</span>
            <span className="text-t1 font-black">{userData?.referralCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Prime Benefits */}
      <div className="bg-gold-glow border-2 border-gold rounded-[32px] overflow-hidden shadow-[0_4px_0_var(--gold-dk)]">
        <div className="p-8 space-y-6">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-gold fill-current" />
            <h3 className="text-lg font-black text-t1">Prime Benefits</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-bg-2 rounded-xl flex items-center justify-center text-gold border-2 border-gold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-t1">Ad-Free Experience</div>
                <div className="text-[11px] text-t3 font-bold">No interruptions during your study sessions</div>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-bg-2 rounded-xl flex items-center justify-center text-gold border-2 border-gold shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-t1">Weekly Scholarship</div>
                <div className="text-[11px] text-t3 font-bold">Weekly scholarship on your UPI account</div>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-bg-2 rounded-xl flex items-center justify-center text-gold border-2 border-gold shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-t1">Detailed Explanations</div>
                <div className="text-[11px] text-t3 font-bold">Deep dive into every answer with expert notes</div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-bg-2 rounded-xl flex items-center justify-center text-gold border-2 border-gold shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-t1">Priority Support</div>
                <div className="text-[11px] text-t3 font-bold">Get your doubts cleared faster by our team</div>
              </div>
            </div>
          </div>
          
          {!userData?.isPrime && (
            <button 
              onClick={() => {
                soundManager.play('click');
                // Open prime modal logic usually in Layout or App
                window.dispatchEvent(new CustomEvent('open-prime-modal'));
              }}
              className="w-full bg-gold hover:bg-orange text-white font-black py-4 rounded-2xl shadow-[0_4px_0_var(--gold-dk)] transition-all active:translate-y-[2px] active:shadow-none"
            >
              Unlock All Benefits
            </button>
          )}
        </div>
      </div>

      {/* Settings Link (Mobile Friendly) */}
      <button 
        onClick={() => {
          soundManager.play('click');
          navigate('/settings');
        }}
        className="flex items-center justify-between w-full p-6 bg-bg-2 border-2 border-bg-4 rounded-[32px] shadow-[0_4px_0_var(--bg-4)] active:translate-y-[2px] active:shadow-none transition-all"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-bg-1 rounded-2xl flex items-center justify-center text-t3 border-2 border-bg-4">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="text-base font-black text-t1">App Settings</div>
            <div className="text-[11px] text-t3 font-bold uppercase tracking-widest">Theme, Sound & Preferences</div>
          </div>
        </div>
        <ChevronRight className="w-6 h-6 text-t3" />
      </button>
    </div>
  );
}
