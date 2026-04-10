import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Timer, Zap, AlertCircle, CheckCircle2, Loader2, Lock, ChevronRight, Share2, Download, Calendar, User } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs, serverTimestamp, runTransaction } from 'firebase/firestore';
import { getSundayQuestions, Question } from '../lib/github';
import { getWeekNumber, formatTime, seededShuffle, cn, getTier, formatPts } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { soundManager } from '../lib/sounds';
import confetti from 'canvas-confetti';
import html2pdf from 'html2pdf.js';

export default function Sunday() {
  const { user, userData, setShowPrimeModal } = useAuth();
  const navigate = useNavigate();
  const [contest, setContest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<any>(null);
  const [quizState, setQuizState] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(1200); // 20 mins
  const [tabSwitches, setTabSwitches] = useState(0);
  const [achievers, setAchievers] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [participantsList, setParticipantsList] = useState<any[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    const loadContest = async () => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      
      const currentWeek = getWeekNumber(now);
      const targetWeek = day === 0 ? currentWeek : currentWeek + 1;
      const contestId = `sunday_week_${targetWeek}`;
      const previousContestId = `sunday_week_${targetWeek - 1}`;
      
      let derivedStatus = 'upcoming';
      if (day === 0) {
        if (hour >= 10 && hour < 22) derivedStatus = 'live';
        else if (hour >= 22) derivedStatus = 'closed';
      }

      try {
        // Config for prizes
        const cfgSnap = await getDoc(doc(db, 'admin', 'config'));
        if (cfgSnap.exists()) setConfig(cfgSnap.data());

        // Try to fetch or create contest
        const contestSnap = await getDoc(doc(db, 'sundayContests', contestId));
        let contestData: any;

        if (!contestSnap.exists()) {
          // First user of the week creates the contest
          contestData = {
            id: contestId,
            weekNumber: targetWeek,
            status: derivedStatus,
            participants: 0,
            totalPool: 0,
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, 'sundayContests', contestId), contestData);
        } else {
          contestData = contestSnap.data();
          contestData.status = derivedStatus;
        }
        setContest(contestData);

        // Fetch participants list
        const joinsSnap = await getDocs(query(collection(db, 'contestJoins'), where('contestId', '==', contestId)));
        const joins = joinsSnap.docs.map(d => d.data());
        
        // Fetch user details for each join
        const usersData = await Promise.all(joins.map(async (j: any) => {
          const uSnap = await getDoc(doc(db, 'users', j.uid));
          return { ...uSnap.data(), joinedAt: j.joinedAt };
        }));
        setParticipantsList(usersData);

        // Check user status
        if (user) {
          try {
            const joinSnap = await getDoc(doc(db, 'contestJoins', `${contestId}_${user.uid}`));
            if (joinSnap.exists()) setUserStatus(joinSnap.data());
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `contestJoins/${contestId}_${user.uid}`);
          }
          
          try {
            const subSnap = await getDoc(doc(db, 'sundaySubmissions', `${contestId}_${user.uid}`));
            if (subSnap.exists()) setUserStatus((prev: any) => ({ ...prev, submitted: true, result: subSnap.data() }));
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `sundaySubmissions/${contestId}_${user.uid}`);
          }
        }

        // Show previous results automatically
        setShowResults(true);
        const achieversSnap = await getDocs(query(collection(db, 'sundayResults', previousContestId, 'winners'), orderBy('rank')));
        setAchievers(achieversSnap.docs.map(d => d.data()));

      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `sundayContests/${contestId}`);
      } finally {
        setLoading(false);
      }
    };

    loadContest();
  }, [user]);

  const startQuiz = async () => {
    soundManager.play('click');
    if (!userData?.isPrime && !userStatus) {
      toast.error('Sunday Scholarship Test is exclusive to Prime members.');
      return;
    }

    setLoading(true);
    try {
      const week = getWeekNumber(new Date());
      const pool = await getSundayQuestions(week);
      const shuffled = seededShuffle(pool, week);
      const selected = shuffled.slice(0, 50);

      setQuizState({
        questions: selected,
        currentIdx: 0,
        answers: {},
        startTime: Date.now()
      });

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            submitQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Tab switch detection
      const handleVisibility = () => {
        if (document.hidden) {
          setTabSwitches(prev => {
            const next = prev + 1;
            if (next >= 3) {
              submitQuiz();
              toast.error('Test auto-submitted due to multiple tab switches.');
            } else {
              toast.warning(`Warning: Tab switch detected (${next}/3). One more and the test will auto-submit.`);
            }
            return next;
          });
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      setQuizState((prev: any) => ({ ...prev, cleanup: () => document.removeEventListener('visibilitychange', handleVisibility) }));

    } catch (err) {
      toast.error('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!quizState || !user) return;
    
    clearInterval(timerRef.current);
    if (quizState.cleanup) quizState.cleanup();
    soundManager.play('complete');
    confetti({
      particleCount: 200,
      spread: 90,
      origin: { y: 0.6 },
      colors: ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff']
    });

    const timeTaken = Math.round((Date.now() - quizState.startTime) / 1000);
    let correct = 0;
    let wrong = 0;

    quizState.questions.forEach((q: Question, i: number) => {
      const ans = quizState.answers[i];
      if (ans === undefined) return;
      if (ans === q.answer) correct++;
      else wrong++;
    });

    const baseScore = (correct * 10) - (wrong * 3);
    const speedBonus = Math.floor((1200 - timeTaken) / 4);
    const finalScore = Math.max(0, baseScore + speedBonus);

    try {
      const contestId = `sunday_week_${getWeekNumber(new Date())}`;
      const subPath = `sundaySubmissions/${contestId}_${user.uid}`;
      await setDoc(doc(db, 'sundaySubmissions', `${contestId}_${user.uid}`), {
        uid: user.uid,
        name: userData?.name,
        contestId,
        score: finalScore,
        correct,
        wrong,
        timeTaken,
        createdAt: serverTimestamp()
      });

      // Update participant count
      await runTransaction(db, async (transaction) => {
        const cRef = doc(db, 'sundayContests', contestId);
        const cSnap = await transaction.get(cRef);
        if (cSnap.exists()) {
          transaction.update(cRef, { 
            participants: (cSnap.data().participants || 0) + 1,
            totalPool: ((cSnap.data().participants || 0) + 1) * 12
          });
        }
      });

      setUserStatus((prev: any) => ({ ...prev, submitted: true, result: { score: finalScore, correct, wrong } }));
      setQuizState(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `sundaySubmissions/${user.uid}`);
    }
  };

  const joinContest = async () => {
    soundManager.play('click');
    if (!user || !contest) return;
    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const contestRef = doc(db, 'sundayContests', contest.id);
        const joinRef = doc(db, 'contestJoins', `${contest.id}_${user.uid}`);
        
        const contestDoc = await transaction.get(contestRef);
        if (!contestDoc.exists()) throw new Error('Contest not found');
        
        transaction.set(joinRef, {
          uid: user.uid,
          contestId: contest.id,
          joinedAt: serverTimestamp()
        });
        
        transaction.update(contestRef, {
          participants: (contestDoc.data().participants || 0) + 1
        });
      });
      
      setUserStatus({ joinedAt: new Date() });
      setContest((prev: any) => ({ ...prev, participants: (prev.participants || 0) + 1 }));
      toast.success('Successfully registered for the contest!');
    } catch (err: any) {
      console.error('Join failed', err);
      toast.error('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = () => {
    const element = document.getElementById('certificate-template');
    if (!element) return;
    
    const opt = {
      margin: 0,
      filename: `RankDangal_Certificate_${userData?.name}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'landscape' as const }
    };
    
    html2pdf().from(element).set(opt).save();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-bg-0">
        <Loader2 className="w-12 h-12 text-blue animate-spin mb-4" />
        <h2 className="text-xl font-black text-t1">Loading Sunday Dangal</h2>
      </div>
    );
  }

  if (quizState) {
    const q = quizState.questions[quizState.currentIdx];
    return (
      <div className="min-h-screen bg-bg-0 flex flex-col fixed inset-0 z-[100]">
        <div className="px-4 py-6 flex items-center justify-between bg-bg-2 border-b-2 border-bg-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-gold fill-current" />
            <span className="font-black text-t1 text-lg">Sunday Scholarship</span>
          </div>
          <div className="flex items-center gap-2 bg-bg-1 px-4 py-2 rounded-2xl border-2 border-bg-4">
            <Timer className={cn("w-5 h-5", timeLeft <= 60 ? "text-red animate-pulse" : "text-blue")} />
            <span className={cn("text-sm font-black tabular-nums", timeLeft <= 60 ? "text-red" : "text-t1")}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-10">
            <div className="text-[12px] font-black text-t3 uppercase tracking-widest mb-2">Question {quizState.currentIdx + 1} of 50</div>
            <h2 className="text-2xl font-black text-t1 leading-tight">{q.q}</h2>
          </div>

          <div className="space-y-4">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  soundManager.play('click');
                  setQuizState((prev: any) => ({ ...prev, answers: { ...prev.answers, [prev.currentIdx]: i } }));
                }}
                className={cn(
                  "w-full p-5 rounded-2xl border-2 text-left transition-all active:translate-y-[2px] active:shadow-none",
                  quizState.answers[quizState.currentIdx] === i 
                    ? "bg-blue-glow border-blue text-blue shadow-[0_4px_0_var(--blue-dk)]" 
                    : "bg-bg-2 border-bg-4 text-t1 shadow-[0_4px_0_var(--bg-4)]"
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border-2",
                    quizState.answers[quizState.currentIdx] === i ? "bg-blue border-blue text-white" : "bg-bg-2 border-bg-4 text-t3"
                  )}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-black text-[16px]">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 border-t-2 border-bg-4 bg-bg-2 flex gap-4">
          <button 
            disabled={quizState.currentIdx === 0}
            onClick={() => {
              soundManager.play('click');
              setQuizState((prev: any) => ({ ...prev, currentIdx: prev.currentIdx - 1 }));
            }}
            className="flex-1 btn-secondary"
          >
            Previous
          </button>
          {quizState.currentIdx === 49 ? (
            <button 
              onClick={submitQuiz}
              className="flex-[2] btn-primary bg-green shadow-[0_4px_0_var(--green-dk)]"
            >
              Submit Test
            </button>
          ) : (
            <button 
              onClick={() => {
                soundManager.play('click');
                setQuizState((prev: any) => ({ ...prev, currentIdx: prev.currentIdx + 1 }));
              }}
              className="flex-[2] btn-primary bg-blue shadow-[0_4px_0_var(--blue-dk)]"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-8 bg-bg-0 min-h-screen transition-colors duration-300">
      {/* Hero Section */}
      <div className="text-center space-y-3">
        <div className="w-24 h-24 bg-gold-glow rounded-[32px] flex items-center justify-center mx-auto mb-6 border-2 border-gold shadow-[0_4px_0_var(--gold-dk)]">
          <Trophy className="w-12 h-12 text-gold fill-current" />
        </div>
        <h1 className="text-3xl font-black text-t1">Sunday Scholarship</h1>
        <div className="flex items-center justify-center gap-2">
          <p className="text-t3 text-base font-bold uppercase tracking-widest">Weekly Scholarship Test</p>
          {contest?.status === 'live' && (
            <span className="bg-red text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
          )}
        </div>
      </div>

      {/* Contest Info */}
      <div className="bg-bg-2 border-2 border-bg-4 rounded-[32px] overflow-hidden shadow-[0_8px_0_var(--bg-4)]">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-[12px] font-black text-t3 uppercase tracking-widest">Scholarship Reward</div>
              <div className="text-4xl font-black text-green">₹{contest?.totalPool || 0}</div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-[12px] font-black text-t3 uppercase tracking-widest">Participants</div>
              <div className="text-2xl font-black text-t1">{contest?.participants || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gold-glow p-5 rounded-2xl border-2 border-gold shadow-[0_4px_0_var(--gold-dk)]">
              <div className="text-[11px] font-black text-t3 uppercase tracking-widest mb-1 text-center">Rank 1</div>
              <div className="text-xl font-black text-gold text-center">₹{config?.sundayPrize1 || 200}</div>
            </div>
            <div className="bg-bg-1 p-5 rounded-2xl border-2 border-bg-4 shadow-[0_4px_0_var(--bg-4)]">
              <div className="text-[11px] font-black text-t3 uppercase tracking-widest mb-1 text-center">Rank 2</div>
              <div className="text-xl font-black text-t1 text-center">₹{config?.sundayPrize2 || 150}</div>
            </div>
          </div>

          {!userStatus?.submitted ? (
            contest?.status === 'live' ? (
              userData?.isPrime || userStatus ? (
                <button 
                  onClick={startQuiz}
                  className="btn-primary"
                >
                  Start Test Now
                  <ChevronRight className="w-6 h-6" />
                </button>
              ) : (
                <div className="bg-blue-glow border-2 border-blue p-6 rounded-[24px] text-center space-y-4 shadow-[0_6px_0_var(--blue-dk)]">
                  <Lock className="w-10 h-10 text-blue mx-auto" />
                  <p className="text-[15px] text-t1 font-black">This contest is exclusive to Prime members.</p>
                  <button 
                    onClick={() => {
                      soundManager.play('click');
                      setShowPrimeModal(true);
                    }}
                    className="btn-blue"
                  >
                    Join Prime to Unlock
                  </button>
                </div>
              )
            ) : contest?.status === 'upcoming' ? (
              userData?.isPrime ? (
                !userStatus ? (
                  <button 
                    onClick={joinContest}
                    className="btn-primary"
                  >
                    Join Scholarship Test
                    <ChevronRight className="w-6 h-6" />
                  </button>
                ) : (
                  <div className="bg-bg-1 border-2 border-bg-4 p-6 rounded-[24px] text-center space-y-2 shadow-[0_6px_0_var(--bg-4)]">
                    <Calendar className="w-10 h-10 text-green mx-auto" />
                    <h3 className="font-black text-t1 text-lg">Registered Successfully</h3>
                    <p className="text-sm text-t3 font-bold">
                      Test starts on Sunday at 10 AM. Stay tuned!
                    </p>
                  </div>
                )
              ) : (
                <div className="bg-blue-glow border-2 border-blue p-6 rounded-[24px] text-center space-y-4 shadow-[0_6px_0_var(--blue-dk)]">
                  <Lock className="w-10 h-10 text-blue mx-auto" />
                  <p className="text-[15px] text-t1 font-black">This contest is exclusive to Prime members.</p>
                  <button 
                    onClick={() => {
                      soundManager.play('click');
                      setShowPrimeModal(true);
                    }}
                    className="btn-blue"
                  >
                    Join Prime to Unlock
                  </button>
                </div>
              )
            ) : (
              <div className="bg-bg-1 border-2 border-bg-4 p-6 rounded-[24px] text-center space-y-2 shadow-[0_6px_0_var(--bg-4)]">
                <Calendar className="w-10 h-10 text-t3 mx-auto" />
                <h3 className="font-black text-t1 text-lg">Contest Closed</h3>
                <p className="text-sm text-t3 font-bold">
                  Entries for this week are closed.
                </p>
              </div>
            )
          ) : (
            <div className="bg-green-glow border-2 border-green p-6 rounded-[24px] text-center space-y-3 shadow-[0_6px_0_var(--green-dk)]">
              <CheckCircle2 className="w-10 h-10 text-green mx-auto" />
              <h3 className="font-black text-t1 text-xl">Test Submitted!</h3>
              <p className="text-sm text-t3 font-bold">Your score: <span className="text-green font-black">{userStatus.result?.score}</span></p>
              <p className="text-[11px] text-t3 font-black uppercase tracking-widest">Results on Monday 10 AM</p>
            </div>
          )}
        </div>
      </div>

      {/* Rules */}
      <div className="bg-bg-2 border-2 border-bg-4 p-8 rounded-[32px] space-y-6 shadow-[0_4px_0_var(--bg-4)]">
        <h3 className="text-[14px] font-black text-t1 uppercase tracking-widest">Contest Rules</h3>
        <ul className="space-y-4">
          {[
            '50 Questions · 20 Minutes total time',
            'Negative marking: -3 for wrong answers',
            'Speed Bonus: Faster completion = Higher Rank',
            'Anti-Cheat: Auto-submit after 3 tab switches'
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-4 text-[15px] text-t2 font-bold">
              <div className="w-2.5 h-2.5 bg-blue rounded-full mt-1.5 flex-shrink-0" />
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Participants List */}
      <div className="bg-bg-2 border-2 border-bg-4 rounded-[32px] overflow-hidden shadow-[0_4px_0_var(--bg-4)]">
        <button 
          onClick={() => {
            setShowParticipants(!showParticipants);
            soundManager.play('click');
          }}
          className="w-full p-6 flex items-center justify-between hover:bg-bg-1 transition-all"
        >
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-blue" />
            <div className="text-left">
              <h3 className="text-lg font-black text-t1">Joined Participants</h3>
              <p className="text-[11px] text-t3 font-black uppercase tracking-widest">{participantsList.length} Students Joined</p>
            </div>
          </div>
          <ChevronRight className={cn("w-6 h-6 text-t3 transition-transform", showParticipants && "rotate-90")} />
        </button>

        <AnimatePresence>
          {showParticipants && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden border-t-2 border-bg-4"
            >
              <div className="divide-y-2 divide-bg-1">
                {participantsList.length > 0 ? (
                  participantsList.map((p, i) => {
                    const tier = getTier(p.totalPoints || 0);
                    return (
                      <div key={i} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-bg-1 rounded-xl flex items-center justify-center text-sm font-black text-t3 border-2 border-bg-4">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-black text-t1">{p.name}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-t3 font-black uppercase tracking-widest">{p.region}</span>
                            <div className="w-1 h-1 bg-bg-4 rounded-full" />
                            <span className="text-[10px] text-blue font-black uppercase tracking-widest flex items-center gap-0.5">
                              {tier.icon} {tier.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-t1">{formatPts(p.totalPoints || 0)}</div>
                          <div className="text-[10px] text-t3 font-black uppercase tracking-widest">Points</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-t3 font-bold">No participants yet</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Achievers List (Monday Reveal) */}
      {showResults && achievers.length > 0 && (
        <div className="bg-bg-2 border-2 border-bg-4 rounded-[32px] overflow-hidden shadow-[0_8px_0_var(--bg-4)]">
          <div className="p-5 border-b-2 border-bg-4 flex items-center justify-between bg-gold-glow">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold text-t1 uppercase tracking-wider">Top 10 Achievers</h3>
            </div>
            <span className="text-[10px] font-bold text-gold uppercase tracking-widest">Week {getWeekNumber(new Date())}</span>
          </div>
          <div className="divide-y-2 divide-bg-1">
            {achievers.map((w, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black",
                  i === 0 ? "bg-gold text-white" : i === 1 ? "bg-bg-4 text-t1" : i === 2 ? "bg-orange text-white" : "bg-bg-1 text-t3"
                )}>
                  {w.rank}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-t1">{w.name}</div>
                  <div className="text-[10px] text-t3 font-bold uppercase tracking-tighter">Score: {w.score}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-green">₹{w.amount}</div>
                  <div className="text-[10px] text-t3 font-bold uppercase tracking-tighter">
                    {w.status === 'paid' ? 'Received' : 'Reward'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Certificate for Top 10 */}
          {achievers.some(w => w.uid === user?.uid) && (
            <div className="p-4 bg-blue-glow border-t-2 border-bg-4">
              <button 
                onClick={downloadCertificate}
                className="btn-blue"
              >
                <Download className="w-6 h-6" />
                Download Certificate
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden Certificate Template */}
      <div className="hidden">
        <div id="certificate-template" className="w-[800px] h-[600px] bg-slate-950 p-12 text-center relative overflow-hidden flex flex-col items-center justify-center border-[20px] border-blue-600">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <Trophy className="w-96 h-96 text-yellow-500 absolute -bottom-20 -right-20 -rotate-12" />
          </div>
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Logo className="w-16 h-16" />
              <span className="text-4xl font-black text-white tracking-tighter uppercase">Rank Dangal</span>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-5xl font-black text-yellow-500 uppercase tracking-widest">Certificate</h1>
              <p className="text-xl font-bold text-slate-400 uppercase tracking-[0.3em]">of Achievement</p>
            </div>
            
            <div className="py-6">
              <p className="text-slate-400 text-lg mb-2">This is to certify that</p>
              <h2 className="text-4xl font-black text-white underline decoration-blue-500 underline-offset-8">{userData?.name}</h2>
            </div>
            
            <div className="space-y-4">
              <p className="text-xl text-slate-300 font-medium max-w-lg mx-auto leading-relaxed">
                has successfully achieved <span className="text-blue-500 font-black">Rank #{achievers.find(w => w.uid === user?.uid)?.rank}</span> in the 
                Sunday Scholarship Test (Week {getWeekNumber(new Date())}) out of {contest?.participants} students.
              </p>
              
              <div className="flex items-center justify-center gap-12 pt-8">
                <div className="text-center">
                  <div className="w-32 h-0.5 bg-slate-800 mb-2" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="text-center">
                  <div className="w-32 h-0.5 bg-slate-800 mb-2" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Director, Rank Dangal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
