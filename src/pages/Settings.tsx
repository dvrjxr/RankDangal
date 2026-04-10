import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  Zap, 
  ZapOff, 
  Bell, 
  BellOff, 
  LogOut, 
  ChevronLeft,
  Shield,
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { soundManager } from '../lib/sounds';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Settings() {
  const { userData, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const updatePreference = async (key: string, value: any) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [key]: value
      });
      soundManager.play('click');
    } catch (e) {
      toast.error('Failed to update preference');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      soundManager.play('click');
      await signOut(auth);
      navigate('/auth');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  const SettingItem = ({ 
    icon: Icon, 
    label, 
    description, 
    value, 
    onToggle, 
    color = "blue" 
  }: any) => (
    <div className="flex items-center justify-between p-4 bg-bg-2 border-2 border-bg-4 rounded-[24px] shadow-[0_4px_0_var(--bg-4)] transition-all">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
          color === "blue" && "bg-blue-glow text-blue",
          color === "gold" && "bg-gold-glow text-gold",
          color === "green" && "bg-green-glow text-green",
          color === "red" && "bg-red-glow text-red"
        )}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="text-base font-black text-t1">{label}</div>
          <div className="text-[11px] text-t3 font-bold uppercase tracking-wider">{description}</div>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={saving}
        className={cn(
          "w-14 h-8 rounded-full p-1 transition-all relative",
          value ? "bg-green" : "bg-bg-4"
        )}
      >
        <div className={cn(
          "w-6 h-6 bg-white rounded-full shadow-sm transition-all transform",
          value ? "translate-x-6" : "translate-x-0"
        )} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-0 px-4 py-8 pb-32 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl bg-bg-1 border-2 border-bg-4 flex items-center justify-center text-t3 active:translate-y-[2px] shadow-[0_2px_0_var(--bg-4)]"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-black text-t1">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-black text-t3 uppercase tracking-[0.2em] px-2">Appearance</h2>
          <SettingItem 
            icon={theme === 'dark' ? Moon : Sun}
            label="Dark Mode"
            description={theme === 'dark' ? "Dark theme active" : "Light theme active"}
            value={theme === 'dark'}
            onToggle={toggleTheme}
            color="gold"
          />
        </section>

        {/* Preferences */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-black text-t3 uppercase tracking-[0.2em] px-2">Preferences</h2>
          <SettingItem 
            icon={userData?.soundEnabled !== false ? Volume2 : VolumeX}
            label="Sound Effects"
            description="Play sounds during quiz"
            value={userData?.soundEnabled !== false}
            onToggle={() => updatePreference('soundEnabled', userData?.soundEnabled === false)}
            color="blue"
          />
          <SettingItem 
            icon={userData?.hapticsEnabled !== false ? Zap : ZapOff}
            label="Haptic Feedback"
            description="Vibrate on interactions"
            value={userData?.hapticsEnabled !== false}
            onToggle={() => updatePreference('hapticsEnabled', userData?.hapticsEnabled === false)}
            color="green"
          />
          <SettingItem 
            icon={userData?.notificationsEnabled !== false ? Bell : BellOff}
            label="Notifications"
            description="Daily reminders & updates"
            value={userData?.notificationsEnabled !== false}
            onToggle={() => updatePreference('notificationsEnabled', userData?.notificationsEnabled === false)}
            color="gold"
          />
        </section>

        {/* Account */}
        <section className="space-y-4">
          <h2 className="text-[11px] font-black text-t3 uppercase tracking-[0.2em] px-2">Account</h2>
          <button
            onClick={handleLogout}
            className="flex items-center justify-between w-full p-4 bg-bg-2 border-2 border-red/20 rounded-[24px] shadow-[0_4px_0_var(--red-glow)] transition-all active:translate-y-[2px] active:shadow-none group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-glow flex items-center justify-center text-red">
                <LogOut className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="text-base font-black text-red">Logout</div>
                <div className="text-[11px] text-t3 font-bold uppercase tracking-wider">Sign out of your account</div>
              </div>
            </div>
          </button>
        </section>

        {/* App Info */}
        <div className="pt-8 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-t3 font-black text-[10px] uppercase tracking-widest">
            <Shield className="w-3 h-3" />
            Rank Dangal v1.0.0
          </div>
          <p className="text-t3/50 text-[9px] font-bold">Made with ❤️ for Students</p>
        </div>
      </div>
    </div>
  );
}
