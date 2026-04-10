import { doc, getDoc, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface StreakData {
  streak: number;
  bestStreak: number;
  lastPracticeDate: string | null;
  updatedAt: any;
}

const CACHE_KEY = 'rd_streak_data';

export function getLocalStreak(): StreakData | null {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (e) {
    return null;
  }
}

export function setLocalStreak(data: StreakData) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

export async function syncStreak(uid: string) {
  const local = getLocalStreak();
  const today = new Date().toISOString().split('T')[0];

  // If local is missing or outdated, fetch from Firestore
  if (!local || local.lastPracticeDate !== today) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      const streakData: StreakData = {
        streak: data.streak || 0,
        bestStreak: data.bestStreak || 0,
        lastPracticeDate: data.lastPracticeDate || null,
        updatedAt: data.updatedAt
      };
      setLocalStreak(streakData);
      return streakData;
    }
  }
  return local;
}

export async function updateStreakOnCompletion(uid: string) {
  const today = new Date().toISOString().split('T')[0];
  const local = getLocalStreak();
  
  if (local?.lastPracticeDate === today) return local;

  let newStreak = 1;
  let newBestStreak = local?.bestStreak || 0;

  if (local?.lastPracticeDate) {
    const lastDate = new Date(local.lastPracticeDate);
    const todayDate = new Date(today);
    
    // Check if lastPracticeDate is in the future
    if (lastDate > todayDate) {
      newStreak = 1;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (local.lastPracticeDate === yesterdayStr) {
        newStreak = (local.streak || 0) + 1;
      } else {
        // If not yesterday and not today, it's a skip
        newStreak = 1;
      }
    }
  }

  if (newStreak > newBestStreak) newBestStreak = newStreak;

  const newData: StreakData = {
    streak: newStreak,
    bestStreak: newBestStreak,
    lastPracticeDate: today,
    updatedAt: new Date().toISOString()
  };

  setLocalStreak(newData);

  // Update Firestore (Write is cheap)
  await updateDoc(doc(db, 'users', uid), {
    streak: newStreak,
    bestStreak: newBestStreak,
    lastPracticeDate: today,
    updatedAt: serverTimestamp()
  });

  return newData;
}
