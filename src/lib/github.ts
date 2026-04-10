import { getWeekNumber } from './utils';

export interface Question {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
  subject: string;
  day: number;
}

export interface WeeklyData {
  week: number;
  questions: Question[];
}

const GITHUB_BASE = 'https://raw.githubusercontent.com/dvrjxr/RD-MCQ';
const BRANCHES = ['main', 'master'];
const SUBJECTS = ['Math', 'Science', 'SST', 'Hindi'];

export async function fetchWeeklyQuestions(week: number, subject: string): Promise<Question[]> {
  const cacheKey = `rd_mcq_week${week}_${subject}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (data.week === week) return data.questions;
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  // Try current week, then fallback to week 1
  const weeksToTry = [week, 1];
  const subjectVariations = [subject, subject.toLowerCase()];
  let lastError: any = null;

  for (const w of weeksToTry) {
    for (const branch of BRANCHES) {
      for (const sVar of subjectVariations) {
        // Retry logic for each attempt
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const url = `${GITHUB_BASE}/${branch}/${sVar}/week${w}.json`;
            const response = await fetch(url);
            
            if (response.ok) {
              const data: WeeklyData = await response.json();
              if (w === week) {
                localStorage.setItem(cacheKey, JSON.stringify(data));
              }
              return data.questions;
            }
            
            // If 404, don't retry this specific URL
            if (response.status === 404) break;
            
          } catch (e) {
            lastError = e;
            if (attempt === 2) break;
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      }
    }
  }

  // Final fallback: try a root questions.json or subject.json
  for (const branch of BRANCHES) {
    try {
      const urls = [
        `${GITHUB_BASE}/${branch}/${subject}.json`,
        `${GITHUB_BASE}/${branch}/${subject.toLowerCase()}.json`,
        `${GITHUB_BASE}/${branch}/questions.json`
      ];
      
      for (const url of urls) {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const questions = Array.isArray(data) ? data : (data.questions || []);
          return questions;
        }
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(`Failed to fetch ${subject} questions after trying multiple sources. ${lastError?.message || ''}`);
}

export async function getDailyQuestions(day: number, week: number): Promise<Question[]> {
  const allQuestions: Question[] = [];
  
  for (const subject of SUBJECTS) {
    try {
      const questions = await fetchWeeklyQuestions(week, subject);
      const daily = questions.filter(q => q.day === day).slice(0, 10);
      allQuestions.push(...daily);
    } catch (e) {
      console.error(`Error fetching ${subject} questions:`, e);
    }
  }
  
  return allQuestions;
}

export async function getSundayQuestions(week: number): Promise<Question[]> {
  let pool: Question[] = [];
  
  for (const subject of SUBJECTS) {
    try {
      const questions = await fetchWeeklyQuestions(week, subject);
      pool.push(...questions);
    } catch (e) {
      console.error(`Error fetching ${subject} questions:`, e);
    }
  }
  
  return pool;
}
