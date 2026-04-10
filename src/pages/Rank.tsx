import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Users, MapPin, Calendar, Loader2, ChevronUp } from 'lucide-react';
import { cn, formatPts } from '../lib/utils';
import { motion } from 'motion/react';

export default function Rank() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overall' | 'region' | 'weekly'>('overall');
  const [ranks, setRanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    const fetchRanks = async () => {
      setLoading(true);
      try {
        let q;
        if (activeTab === 'overall') {
          q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50));
        } else if (activeTab === 'region') {
          if (!userData?.region) {
            setRanks([]);
            setLoading(false);
            return;
          }
          q = query(collection(db, 'users'), where('region', '==', userData?.region), orderBy('totalPoints', 'desc'), limit(50));
        } else {
          q = query(collection(db, 'users'), orderBy('weeklyPoints', 'desc'), limit(50));
        }

        const snap = await getDocs(q);
        const data = snap.docs.map((d, i) => ({ id: d.id, ...(d.data() as any), rank: i + 1 }));
        setRanks(data);

        const mine = data.find(r => r.id === user?.uid);
        if (mine) setMyRank(mine.rank);
        else setMyRank(null);

      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      } finally {
        setLoading(false);
      }
    };

    fetchRanks();
  }, [activeTab, userData?.region, user?.uid]);

  const top3 = ranks.slice(0, 3);
  const others = ranks.slice(3);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-bg-0">
      <Loader2 className="w-12 h-12 text-blue animate-spin mb-4" />
      <h2 className="text-xl font-black text-t1">Loading Leaderboard</h2>
    </div>
  );

  return (
    <div className="px-4 py-8 space-y-8 pb-32 bg-bg-0 min-h-screen transition-colors duration-300">
      {/* Tabs */}
      <div className="flex bg-bg-1 p-1.5 rounded-[24px] border-2 border-bg-4 shadow-[0_4px_0_var(--bg-4)]">
        {[
          { id: 'overall', icon: Trophy, label: 'Overall' },
          { id: 'region', icon: MapPin, label: 'Region' },
          { id: 'weekly', icon: Calendar, label: 'Weekly' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all active:translate-y-[2px] active:shadow-none",
              activeTab === tab.id ? "bg-blue text-white shadow-[0_4px_0_var(--blue-dk)]" : "text-t3 hover:text-t1"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Podium */}
      {top3.length > 0 && (
        <div className="flex items-end justify-center gap-2 pt-16 pb-8 px-2">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="flex flex-col items-center gap-4 flex-1 max-w-[100px]">
              <div className="relative">
                <div className="w-20 h-20 bg-bg-2 rounded-[24px] flex items-center justify-center text-3xl font-black text-t3 border-2 border-bg-4 shadow-xl">
                  {top3[1].name?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -top-4 -right-4 w-10 h-10 bg-bg-4 text-t1 rounded-full flex items-center justify-center font-black text-sm border-4 border-bg-0 shadow-lg">2</div>
              </div>
              <div className="text-center">
                <div className="text-[13px] font-black text-t1 truncate w-20">{top3[1].name}</div>
                <div className="text-[11px] font-black text-blue uppercase tracking-widest">{formatPts(top3[1].totalPoints)}</div>
              </div>
              <div className="w-full h-16 bg-bg-2 rounded-t-[24px] border-x-2 border-t-2 border-bg-4" />
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="flex flex-col items-center gap-4 flex-1 max-w-[120px] -mt-12">
              <div className="relative">
                <div className="w-24 h-24 bg-gold rounded-[32px] flex items-center justify-center text-4xl font-black text-white border-4 border-gold shadow-2xl shadow-gold/20">
                  {top3[0].name?.charAt(0).toUpperCase()}
                </div>
                <Trophy className="absolute -top-10 left-1/2 -translate-x-1/2 w-10 h-10 text-gold fill-current drop-shadow-xl" />
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-gold text-white rounded-full flex items-center justify-center font-black text-lg border-4 border-bg-0 shadow-lg">1</div>
              </div>
              <div className="text-center">
                <div className="text-[15px] font-black text-t1 truncate w-24">{top3[0].name}</div>
                <div className="text-[12px] font-black text-blue uppercase tracking-widest">{formatPts(top3[0].totalPoints)}</div>
              </div>
              <div className="w-full h-24 bg-gold-glow rounded-t-[32px] border-x-2 border-t-2 border-gold" />
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="flex flex-col items-center gap-4 flex-1 max-w-[100px]">
              <div className="relative">
                <div className="w-20 h-20 bg-bg-2 rounded-[24px] flex items-center justify-center text-3xl font-black text-purple border-2 border-bg-4 shadow-xl">
                  {top3[2].name?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -top-4 -right-4 w-10 h-10 bg-purple text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-bg-0 shadow-lg">3</div>
              </div>
              <div className="text-center">
                <div className="text-[13px] font-black text-t1 truncate w-20">{top3[2].name}</div>
                <div className="text-[11px] font-black text-blue uppercase tracking-widest">{formatPts(top3[2].totalPoints)}</div>
              </div>
              <div className="w-full h-12 bg-bg-2 rounded-t-[24px] border-x-2 border-t-2 border-bg-4" />
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {activeTab === 'region' && !userData?.region ? (
          <div className="p-12 text-center space-y-6 bg-bg-2 rounded-[32px] border-4 border-dashed border-bg-4">
            <MapPin className="w-16 h-16 text-t3 mx-auto" />
            <div className="space-y-2">
              <p className="text-t1 text-xl font-black">Region Ranking Hidden</p>
              <p className="text-t3 text-sm font-bold">Please login to see rankings for your specific region.</p>
            </div>
            <button 
              onClick={() => navigate('/auth')}
              className="btn-secondary"
            >
              Login Now
            </button>
          </div>
        ) : others.length === 0 && top3.length === 0 ? (
          <div className="p-12 text-center text-t3 font-bold italic">No rankings available yet.</div>
        ) : (
          others.map((u, i) => (
            <div key={u.id} className={cn(
              "bg-bg-2 border-2 border-bg-4 p-5 rounded-[24px] flex items-center gap-5 transition-all shadow-[0_4px_0_var(--bg-4)]",
              u.id === user?.uid && "border-blue bg-blue-glow shadow-[0_4px_0_var(--blue-dk)]"
            )}>
              <div className="w-10 text-center text-sm font-black text-t3">#{u.rank}</div>
              <div className="w-12 h-12 bg-bg-1 rounded-2xl flex items-center justify-center text-lg font-black text-t1 border-2 border-bg-4">
                {u.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-black text-t1">{u.name}</div>
                <div className="text-[11px] text-t3 font-black uppercase tracking-widest">{u.region}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-blue">{formatPts(u.totalPoints)}</div>
                <div className="text-[10px] text-t3 font-black uppercase tracking-widest">Points</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pinned Your Rank */}
      {myRank && myRank > 3 && (
        <div className="fixed bottom-24 left-4 right-4 z-30">
          <div className="max-w-md mx-auto bg-blue p-5 rounded-[24px] flex items-center gap-5 shadow-[0_8px_0_var(--blue-dk)] border-2 border-blue">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-lg font-black text-white backdrop-blur-md">
              #{myRank}
            </div>
            <div className="flex-1">
              <div className="text-base font-black text-white">Your Rank</div>
              <div className="text-[11px] text-white/80 font-black uppercase tracking-widest">Keep practicing to climb!</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-white">{formatPts(userData?.totalPoints)}</div>
              <div className="text-[10px] text-white/80 font-black uppercase tracking-widest">Points</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
