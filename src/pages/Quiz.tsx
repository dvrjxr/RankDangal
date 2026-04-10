import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { X, Timer, Zap, ChevronRight, CheckCircle2, AlertCircle, Loader2, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDailyQuestions, Question } from '../lib/github';
import { getWeekNumber, getDayOfWeek, cn } from '../lib/utils';
import { updateStreakOnCompletion } from '../lib/streak';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import confetti from 'canvas-confetti';

export default function Quiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const subject = searchParams.get('subject');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!subject) {
      navigate('/');
      return;
    }

    const loadQuestions = async () => {
      try {
        const now = new Date();
        const week = getWeekNumber(now);
        const day = getDayOfWeek(now);
        const all = await getDailyQuestions(day, week);
        const filtered = all.filter(q => q.subject === subject);
        
        if (filtered.length === 0) {
          setError('No questions available for this subject today.');
        } else {
          setQuestions(filtered);
        }
      } catch (err) {
        setError('Failed to load questions. Please check your connection.');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [subject, navigate]);

  useEffect(() => {
    if (loading || isFinished || questions.length === 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleNext();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [loading, isFinished, currentIdx, questions]);

  const handleAnswer = (optionIdx: number) => {
    if (answers[currentIdx] !== undefined) return;
    
    setAnswers(prev => ({ ...prev, [currentIdx]: optionIdx }));
    
    const q = questions[currentIdx];
    if (optionIdx === q.answer) {
      soundManager.play('correct');
      setScore(prev => prev + 4);
    } else {
      soundManager.play('incorrect');
      setScore(prev => prev - 1);
    }
    
    // Auto next after 1s
    setTimeout(handleNext, 1000);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setTimeLeft(30);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setIsFinished(true);
    clearInterval(timerRef.current);
    soundManager.play('complete');
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#ce82ff']
    });
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Update Points
        await setDoc(doc(db, 'users', user.uid), {
          totalPoints: increment(score),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update Daily Progress
        await setDoc(doc(db, 'users', user.uid, 'meta', 'dailyProgress'), {
          completions: {
            [today]: {
              [subject!]: true
            }
          }
        }, { merge: true });

        // Update Streak
        await updateStreakOnCompletion(user.uid);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-0 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-blue animate-spin mb-4" />
        <h2 className="text-xl font-black text-t1">Loading Questions</h2>
        <p className="text-t3 text-sm mt-2 font-bold uppercase tracking-widest">Preparing your challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-0 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-glow rounded-3xl flex items-center justify-center mb-6 border-2 border-red">
          <AlertCircle className="w-10 h-10 text-red" />
        </div>
        <h2 className="text-2xl font-black text-t1">Oops!</h2>
        <p className="text-t3 text-[15px] font-bold mt-2 mb-8 leading-relaxed">{error}</p>
        <button 
          onClick={() => {
            soundManager.play('click');
            navigate('/');
          }}
          className="btn-secondary w-full max-w-xs mx-auto"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-bg-0 p-6 flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm"
        >
          <div className="w-28 h-28 bg-green-glow rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-green shadow-xl">
            <Trophy className="w-14 h-14 text-green fill-current" />
          </div>
          <h2 className="text-4xl font-black text-t1 mb-3">Subject Done!</h2>
          <p className="text-t3 text-lg font-bold mb-10">You've completed {subject} practice for today.</p>
          
          <div className="bg-bg-2 border-2 border-bg-4 rounded-[32px] p-8 mb-10 shadow-[0_8px_0_var(--bg-4)]">
            <div className="grid grid-cols-2 gap-8">
              <div className="text-left border-r-2 border-bg-4">
                <div className="text-[12px] text-t3 font-black uppercase tracking-widest mb-1">Score</div>
                <div className="text-3xl font-black text-blue">+{score}</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] text-t3 font-black uppercase tracking-widest mb-1">Accuracy</div>
                <div className="text-3xl font-black text-green">
                  {Math.round((Object.values(answers).filter((a, i) => a === questions[i].answer).length / questions.length) * 100)}%
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              soundManager.play('click');
              navigate('/');
            }}
            className="btn-primary"
          >
            Continue Practice
          </button>
        </motion.div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const selected = answers[currentIdx];

  return (
    <div className="min-h-screen bg-bg-0 flex flex-col transition-colors duration-300">
      {/* Header */}
      <div className="px-4 py-6 flex items-center gap-4 bg-bg-0 sticky top-0 z-10">
        <button 
          onClick={() => {
            soundManager.play('click');
            navigate('/');
          }} 
          className="text-t3 hover:text-t1 transition-colors"
        >
          <X className="w-8 h-8" />
        </button>
        
        {/* Progress Bar */}
        <div className="flex-1 h-4 bg-bg-4 rounded-full overflow-hidden border-2 border-bg-4">
          <motion.div 
            className="h-full bg-green"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          />
        </div>

        <div className="flex items-center gap-1.5 bg-bg-1 px-3 py-1.5 rounded-2xl border-2 border-bg-4">
          <Timer className={cn("w-5 h-5", timeLeft <= 5 ? "text-red animate-pulse" : "text-blue")} />
          <span className={cn("text-sm font-black tabular-nums", timeLeft <= 5 ? "text-red" : "text-t1")}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-6 py-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIdx}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            className="space-y-10"
          >
            <h2 className="text-2xl font-black text-t1 leading-tight">
              {q.q}
            </h2>

            <div className="space-y-4">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.answer;
                const isSelected = selected === i;
                const showResult = selected !== undefined;
                
                return (
                  <button
                    key={i}
                    disabled={showResult}
                    onClick={() => handleAnswer(i)}
                    className={cn(
                      "w-full p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group active:translate-y-[2px] active:shadow-none",
                      !showResult && "bg-bg-2 border-bg-4 hover:bg-bg-1 shadow-[0_4px_0_var(--bg-4)]",
                      showResult && isCorrect && "bg-green-glow border-green text-green shadow-[0_4px_0_var(--green-dk)]",
                      showResult && isSelected && !isCorrect && "bg-red-glow border-red text-red shadow-[0_4px_0_var(--red-dk)]",
                      showResult && !isSelected && !isCorrect && "bg-bg-2 border-bg-4 opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-5 relative z-10">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border-2 transition-colors",
                        !showResult && "bg-bg-2 border-bg-4 text-t3 group-hover:border-blue group-hover:text-blue",
                        showResult && isCorrect && "bg-green border-green text-white",
                        showResult && isSelected && !isCorrect && "bg-red border-red text-white",
                        showResult && !isSelected && !isCorrect && "bg-bg-2 border-bg-4 text-t3"
                      )}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="font-black text-[16px]">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selected !== undefined && q.explanation && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-blue-glow border-2 border-blue p-6 rounded-[24px] shadow-[0_4px_0_var(--blue-dk)]"
              >
                <div className="flex items-center gap-2 text-blue mb-3">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-[12px] font-black uppercase tracking-widest">Explanation</span>
                </div>
                <p className="text-[15px] text-t1 leading-relaxed font-bold italic">
                  {q.explanation}
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
