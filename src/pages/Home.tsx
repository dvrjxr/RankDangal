import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Trophy, Calendar, ChevronRight, CheckCircle2, Flame, Target, Users, Bell, Home as HomeIcon, Trophy as TrophyIcon, User, BookOpen, ChevronRight as ChevronRightIcon, Calculator, Beaker, Globe2, Languages, Divide, Atom, Globe, Star, Check, X, Timer } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, getCountFromServer } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPts, getTier } from '../lib/utils';
import { syncStreak } from '../lib/streak';
import { soundManager } from '../lib/sounds';
import StreakCalendar from '../components/StreakCalendar';
import { TIERS } from '../constants';

const SUBJECTS = [
  { id: 'Math', name: 'Mathematics', color: 'blue', icon: Divide },
  { id: 'Science', name: 'Science', color: 'green', icon: Atom },
  { id: 'SST', name: 'Social Science', color: 'orange', icon: Globe },
  { id: 'Hindi', name: 'Hindi', color: 'purple', icon: Languages },
];

export default function Home() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [streakData, setStreakData] = useState<any>(null);
  const [sundayContest, setSundayContest] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [userRank, setUserRank] = useState<number | null>(null);
  const [config, setConfig] = useState<any>(null);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [derivedSundayStatus, setDerivedSundayStatus] = useState('upcoming');
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      
      let status = 'upcoming';
      if (day === 0) {
        if (hour >= 10 && hour < 22) status = 'live';
        else if (hour >= 22) status = 'closed';
      }
      setDerivedSundayStatus(status);

      if (status === 'live') {
        const end = new Date(now);
        end.setHours(22, 0, 0, 0);
        const diff = end.getTime() - now.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else if (status === 'upcoming') {
        const nextSunday = new Date(now);
        if (day === 0 && hour < 10) {
          // Today is Sunday, before 10 AM
        } else {
          // Next Sunday
          nextSunday.setDate(now.getDate() + ((7 - day) % 7 || 7));
        }
        nextSunday.setHours(10, 0, 0, 0);
        const diff = nextSunday.getTime() - now.getTime();
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (d > 0) {
          setTimeLeftStr(`Starts in ${d}d ${h}h`);
        } else {
          setTimeLeftStr(`Starts in ${h}h ${m}m`);
        }
      } else {
        setTimeLeftStr('Ended');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Config for prizes
      try {
        const cfgSnap = await getDoc(doc(db, 'admin', 'config'));
        if (cfgSnap.exists()) setConfig(cfgSnap.data());
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'admin/config');
      }
      // Sunday Contest (Public)
      try {
        const contestSnap = await getDoc(doc(db, 'public', 'sundayContestCurrent'));
        if (contestSnap.exists()) setSundayContest(contestSnap.data());
      } catch (e) {
        console.warn('Sunday contest load failed:', e);
      }

      if (!user) {
        // Load public leaderboard if not logged in
        try {
          const q = query(
            collection(db, 'users'),
            orderBy('totalPoints', 'desc'),
            limit(3)
          );
          const snap = await getDocs(q);
          setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.warn('Public leaderboard load failed:', e);
        }
        return;
      }

      // Streak
      const s = await syncStreak(user.uid);
      setStreakData(s);

      // User Rank Calculation
      if (userData?.totalPoints !== undefined) {
        try {
          const rankQuery = query(
            collection(db, 'users'),
            where('totalPoints', '>', userData.totalPoints)
          );
          const rankSnap = await getCountFromServer(rankQuery);
          setUserRank(rankSnap.data().count + 1);
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, 'users/count');
        }
      }

      // Leaderboard (Region top 3)
      if (userData?.region) {
        try {
          const q = query(
            collection(db, 'users'),
            where('region', '==', userData.region),
            orderBy('totalPoints', 'desc'),
            limit(3)
          );
          const snap = await getDocs(q);
          setLeaderboard(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.warn('Regional leaderboard load failed:', e);
        }
      }

      // Daily Completions
      const today = new Date().toISOString().split('T')[0];
      try {
        const progSnap = await getDoc(doc(db, 'users', user.uid, 'meta', 'dailyProgress'));
        if (progSnap.exists()) {
          const data = progSnap.data();
          setCompletions(data.completions?.[today] || {});
        }
      } catch (e) {
        console.warn('Daily progress load failed:', e);
      }
    };

    loadData();
  }, [user, userData?.region, userData?.totalPoints]);

  const completedCount = Object.values(completions).filter(Boolean).length;
  const totalSubjects = SUBJECTS.length;
  const progress = (completedCount / totalSubjects) * 100;
  const tier = getTier(userData?.totalPoints || 0);
  
  // Calculate next tier
  const currentPoints = userData?.totalPoints || 0;
  const nextTier = TIERS.find(t => t.min > currentPoints);
  const ptsToNextTier = nextTier ? nextTier.min - currentPoints : 0;

  const handleStartPractice = () => {
    soundManager.play('click');
    // Find first incomplete subject
    const nextSubject = SUBJECTS.find(s => !completions[s.id]);
    if (nextSubject) {
      navigate(`/quiz?subject=${nextSubject.id}`);
    } else {
      navigate(`/quiz?subject=${SUBJECTS[0].id}`);
    }
  };

  const handleSubjectClick = (id: string) => {
    soundManager.play('click');
    navigate(`/quiz?subject=${id}`);
  };

  return (
    <div className="flex flex-col gap-0 pb-12 bg-bg-0 transition-colors duration-300">
      {/* Header Stats */}
      <div className="px-4 pt-4 space-y-4">
        {/* Streak Card */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-2 border-2 border-bg-4 p-5 rounded-[32px] shadow-[0_8px_0_var(--bg-4)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-glow rounded-2xl flex items-center justify-center border-2 border-orange shadow-[0_4px_0_var(--orange-dk)]">
                <Flame className="w-8 h-8 text-orange fill-current" />
              </div>
              <div>
                <div className="text-2xl font-black text-t1 leading-none">{streakData?.streak || 0}</div>
                <div className="text-[11px] text-t3 font-black uppercase tracking-widest mt-1">Day Streak</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-t3 font-black uppercase tracking-widest">Best</div>
              <div className="text-xl font-black text-t1">{streakData?.bestStreak || 0}</div>
            </div>
          </div>
          <StreakCalendar streak={streakData?.streak || 0} lastPracticeDate={streakData?.lastPracticeDate} />
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-bg-2 border-2 border-bg-4 p-4 rounded-[24px] flex items-center gap-3 shadow-[0_4px_0_var(--bg-4)]"
          >
            <div className="w-10 h-10 bg-blue-glow rounded-xl flex items-center justify-center border-2 border-blue">
              <Trophy className="w-6 h-6 text-blue fill-current" />
            </div>
            <div>
              <div className="text-xl font-black text-t1 leading-none">{formatPts(userData?.totalPoints || 0)}</div>
              <div className="text-[10px] text-t3 font-black uppercase tracking-widest mt-1">Points</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-bg-2 border-2 border-bg-4 p-4 rounded-[24px] flex items-center gap-3 shadow-[0_4px_0_var(--bg-4)]"
          >
            <div className="w-10 h-10 bg-gold-glow rounded-xl flex items-center justify-center border-2 border-gold">
              <Target className="w-6 h-6 text-gold fill-current" />
            </div>
            <div>
              <div className="text-xl font-black text-t1 leading-none">#{userRank || '--'}</div>
              <div className="text-[10px] text-t3 font-black uppercase tracking-widest mt-1">Global Rank</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tier Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 mt-4 p-5 rounded-[32px] bg-gradient-to-br from-[#1a1a3a] to-[#2a2a5a] border-2 border-white/10 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full -mr-16 -mt-16" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{tier.icon}</div>
            <div>
              <div className="text-[11px] font-black text-white/60 uppercase tracking-widest">Current Tier</div>
              <div className="text-2xl font-black text-white">{tier.name}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-black text-white/60 uppercase tracking-widest">Next Tier</div>
            <div className="text-sm font-black text-gold mt-1">
              {tier.name === 'Grandmaster' ? 'Max Tier' : `${formatPts(ptsToNextTier)} pts`}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Practice Card */}
      <div className="mx-4 mt-6 p-6 rounded-[32px] bg-bg-2 border-2 border-bg-4 shadow-[0_8px_0_var(--bg-4)]">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[14px] font-black text-t3 uppercase tracking-widest">Daily Progress</span>
          <div className="flex items-center gap-1.5 bg-bg-1 px-3 py-1 rounded-full border-2 border-bg-4">
            <Calendar className="w-4 h-4 text-t3" />
            <span className="text-[11px] font-black text-t1">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        <div className="flex items-center gap-8 mb-8">
          <div 
            className="relative w-[110px] h-[110px] flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
            onClick={() => {
              soundManager.play('click');
              setShowProgressModal(true);
            }}
          >
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" className="stroke-bg-4 fill-none" strokeWidth="12" />
              <circle 
                cx="50" cy="50" r="42" 
                className={cn("fill-none transition-all duration-1000 ease-out", progress === 100 ? "stroke-gold" : "stroke-green")}
                strokeWidth="12" 
                strokeDasharray={264} 
                strokeDashoffset={264 - (progress / 100) * 264}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-[36px] font-black text-t1">{completedCount}</span>
              <span className="text-[12px] font-black text-t3 mt-1">of {totalSubjects}</span>
            </div>
          </div>

          <div className="flex-1 space-y-5">
            <div className="flex gap-2 flex-wrap">
              {SUBJECTS.map(s => (
                <div 
                  key={s.id}
                  onClick={() => {
                    soundManager.play('click');
                    setShowProgressModal(true);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black border-2 transition-all cursor-pointer active:scale-95",
                    completions[s.id] 
                      ? "bg-green-glow text-green border-green" 
                      : "bg-bg-1 text-t3 border-bg-4"
                  )}
                >
                  {s.id}
                </div>
              ))}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-black text-t3 uppercase tracking-widest">Daily Goal</span>
                <span className="text-[12px] font-black text-green">{completedCount * 10} / 40 questions</span>
              </div>
              <div className="h-[14px] bg-bg-1 rounded-full overflow-hidden border-2 border-bg-4">
                <div 
                  className="h-full bg-green transition-all duration-1000" 
                  style={{ width: `${(completedCount * 10 / 40) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          onClick={handleStartPractice}
          className={cn(
            "btn-primary text-xl py-5",
            progress === 100 && "bg-gold shadow-[0_6px_0_var(--gold-dk)]"
          )}
        >
          {progress === 100 ? (
            <><CheckCircle2 className="w-7 h-7" /> Goal Achieved!</>
          ) : (
            <><Zap className="w-7 h-7 fill-current" /> Start Practice</>
          )}
        </button>
      </div>

      {/* Subject Grid */}
      <div className="px-4 mt-10">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[14px] font-black text-t3 uppercase tracking-widest">Practice Subjects</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {SUBJECTS.map((s, i) => (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => handleSubjectClick(s.id)}
              className={cn(
                "relative p-6 rounded-[32px] border-2 flex flex-col gap-4 text-left transition-all overflow-hidden active:translate-y-[2px] active:shadow-none",
                completions[s.id] 
                  ? "bg-bg-2 border-green shadow-[0_4px_0_var(--green-dk)]" 
                  : "bg-bg-2 border-bg-4 shadow-[0_4px_0_var(--bg-4)]"
              )}
            >
              <div className={cn(
                "w-[56px] h-[56px] rounded-2xl flex items-center justify-center border-2",
                s.color === 'blue' ? "bg-blue-glow border-blue text-blue" :
                s.color === 'green' ? "bg-green-glow border-green text-green" :
                s.color === 'orange' ? "bg-gold-glow border-orange text-orange" :
                "bg-purple-glow border-purple text-purple"
              )}>
                <s.icon className="w-7 h-7" />
              </div>
              <div>
                <div className="text-lg font-black text-t1">{s.name}</div>
                <div className="flex items-center gap-1.5 text-[11px] font-black mt-1">
                  {completions[s.id] ? (
                    <><CheckCircle2 className="w-4 h-4 text-green" /> <span className="text-green">Done</span></>
                  ) : (
                    <><Target className="w-4 h-4 text-t3" /> <span className="text-t3">10 Questions</span></>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Sunday Banner */}
      {sundayContest && (
        <div className="px-4 mt-10">
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              soundManager.play('click');
              navigate('/sunday');
            }}
            className={cn(
              "relative overflow-hidden p-6 rounded-[32px] flex flex-col gap-5 bg-[#1a1a3a] border-2 border-gold shadow-[0_8px_0_var(--gold-dk)] cursor-pointer group",
              derivedSundayStatus === 'live' && "ring-4 ring-gold ring-offset-4"
            )}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gold opacity-[0.15] blur-3xl -mr-24 -mt-24" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-[64px] h-[64px] rounded-2xl bg-gradient-to-br from-gold to-orange flex items-center justify-center text-white flex-shrink-0 shadow-[0_4px_0_#e5a400]">
                <Trophy className="w-8 h-8 fill-current" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-gold uppercase tracking-tight">Sunday Dangal</span>
                  {derivedSundayStatus === 'live' && (
                    <span className="bg-red text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                  )}
                </div>
                <p className="text-[13px] font-black text-white/70 mt-1">Win up to <span className="text-white">₹{config?.sundayPrize1 || 200}</span> · <span className="text-green">FREE for Prime</span></p>
              </div>
              
              <div className="bg-gold text-white p-2 rounded-xl group-hover:translate-x-1 transition-transform">
                <ChevronRight className="w-6 h-6" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-black/20 rounded-2xl p-3 border border-white/10 flex items-center gap-3">
                <Users className="w-5 h-5 text-blue" />
                <div>
                  <div className="text-[10px] text-white/50 font-black uppercase tracking-widest">Participants</div>
                  <div className="text-sm font-black text-white">{sundayContest.participants || 0} Joined</div>
                </div>
              </div>
              <div className="bg-black/20 rounded-2xl p-3 border border-white/10 flex items-center gap-3">
                <Timer className="w-5 h-5 text-orange" />
                <div>
                  <div className="text-[10px] text-white/50 font-black uppercase tracking-widest">
                    {derivedSundayStatus === 'live' ? 'Ends In' : derivedSundayStatus === 'upcoming' ? 'Starts In' : 'Status'}
                  </div>
                  <div className={cn("text-sm font-black", derivedSundayStatus === 'live' ? "text-red animate-pulse" : "text-white")}>
                    {timeLeftStr}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mini Leaderboard */}
      <div className="mx-4 mt-10 rounded-[32px] bg-bg-2 border-2 border-bg-4 shadow-[0_8px_0_var(--bg-4)] overflow-hidden">
        <div className="p-6 border-b-2 border-bg-4 flex items-center justify-between bg-bg-1/50">
          <div>
            <div className="text-[14px] font-black text-t3 uppercase tracking-widest">Regional Board</div>
            <div className="text-[12px] font-bold text-t3 mt-1">{userData?.region || 'Buxar'} Region</div>
          </div>
          <div className="bg-green-glow border-2 border-green px-5 py-2 rounded-full text-[14px] font-black text-green">
            Rank: #{userRank || '--'}
          </div>
        </div>
        <div className="divide-y-2 divide-bg-4">
          {leaderboard.map((u, i) => (
            <div key={u.id} className="p-5 flex items-center gap-6">
              <div className={cn(
                "w-10 text-center text-base font-black text-t3",
                i === 0 ? "text-gold" : i === 1 ? "text-t3" : i === 2 ? "text-orange" : "text-t3"
              )}>
                #{i + 1}
              </div>
              <div className="flex-1">
                <div className="text-lg font-black text-t1">{u.name}</div>
                <div className="text-[11px] font-black text-t3 uppercase tracking-widest">{u.region}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-green">{formatPts(u.totalPoints)}</div>
                <div className="text-[10px] text-t3 font-black uppercase tracking-widest">Points</div>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={() => {
            soundManager.play('click');
            navigate('/rank');
          }}
          className="w-full p-5 text-[14px] font-black text-blue hover:bg-bg-1 transition-colors flex items-center justify-center gap-2"
        >
          View Full Leaderboard <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Point System Explanation */}
      <div className="mx-4 mt-10 bg-bg-2 border-2 border-bg-4 rounded-[32px] p-8 shadow-[0_8px_0_var(--bg-4)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gold rounded-xl flex items-center justify-center shadow-[0_4px_0_var(--gold-dk)]">
            <Star className="w-6 h-6 text-white fill-current" />
          </div>
          <h3 className="text-xl font-black text-t1">How to Earn Points?</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {[
            { icon: <Check className="w-5 h-5 text-white" />, color: 'bg-green', shadow: 'shadow-[0_4px_0_var(--green-dk)]', label: 'Correct Answer', pts: '+4 Pts', desc: 'Earn points for every right answer' },
            { icon: <X className="w-5 h-5 text-white" />, color: 'bg-red', shadow: 'shadow-[0_4px_0_var(--red-dk)]', label: 'Wrong Answer', pts: '-1 Pt', desc: 'Be careful! Accuracy matters' },
            { icon: <Trophy className="w-5 h-5 text-white" />, color: 'bg-gold', shadow: 'shadow-[0_4px_0_var(--gold-dk)]', label: 'Subject Bonus', pts: '+10 Pts', desc: 'Complete all 10 questions in a subject' },
            { icon: <Flame className="w-5 h-5 text-white" />, color: 'bg-orange', shadow: 'shadow-[0_4px_0_var(--orange-dk)]', label: 'Daily Goal', pts: '+40 Pts', desc: 'Complete all 4 subjects today' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-5 bg-bg-1 rounded-[24px] border-2 border-bg-4">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", item.color, item.shadow)}>
                  {item.icon}
                </div>
                <div>
                  <div className="font-black text-t1 text-sm">{item.label}</div>
                  <div className="text-[10px] text-t3 font-bold uppercase tracking-widest">{item.desc}</div>
                </div>
              </div>
              <span className={cn("font-black text-lg whitespace-nowrap ml-4", item.pts.startsWith('+') ? 'text-green' : 'text-red')}>
                {item.pts}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-t3 text-[11px] font-black uppercase tracking-widest">
          Points help you climb Tiers and Ranks!
        </p>
      </div>

      {/* Progress Modal */}
      <AnimatePresence>
        {showProgressModal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProgressModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-sm bg-bg-0 rounded-[32px] overflow-hidden shadow-2xl border-2 border-bg-4"
            >
              <div className="p-6 border-b-2 border-bg-4 flex items-center justify-between bg-bg-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-glow rounded-xl flex items-center justify-center border-2 border-green">
                    <Target className="w-6 h-6 text-green fill-current" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-t1">Daily Goals</h3>
                    <p className="text-[11px] font-black text-t3 uppercase tracking-widest">Your progress today</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowProgressModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-1 text-t3 hover:text-t1 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 bg-bg-1">
                {SUBJECTS.map(s => {
                  const isDone = completions[s.id];
                  return (
                    <div key={s.id} className={cn(
                      "flex items-center justify-between p-4 rounded-[24px] border-2 transition-all",
                      isDone ? "bg-green-glow border-green" : "bg-bg-0 border-bg-4"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center border-2",
                          isDone ? "bg-green border-green-dk text-white shadow-[0_2px_0_var(--green-dk)]" : "bg-bg-2 border-bg-4 text-t3"
                        )}>
                          <s.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-black text-t1 text-base">{s.name}</div>
                          <div className={cn("text-[10px] font-black uppercase tracking-widest", isDone ? "text-green" : "text-t3")}>
                            {isDone ? 'Completed (+10 Pts)' : '10 Questions Left'}
                          </div>
                        </div>
                      </div>
                      {isDone ? (
                        <CheckCircle2 className="w-6 h-6 text-green" />
                      ) : (
                        <button 
                          onClick={() => {
                            setShowProgressModal(false);
                            handleSubjectClick(s.id);
                          }}
                          className="px-4 py-2 bg-blue text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-[0_2px_0_var(--blue-dk)] active:translate-y-[2px] active:shadow-none"
                        >
                          Start
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
