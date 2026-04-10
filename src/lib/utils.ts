import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function getDayOfWeek(date: Date): number {
  // 1 = Monday, 7 = Sunday
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let m = shuffled.length, t, i;
  while (m) {
    i = Math.floor(random(seed) * m--);
    t = shuffled[m];
    shuffled[m] = shuffled[i];
    shuffled[i] = t;
    seed++;
  }
  return shuffled;
}

function random(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function formatPts(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n || 0);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

import { TIERS } from '../constants';

export function getTier(points: number) {
  return [...TIERS].reverse().find(t => points >= t.min) || TIERS[0];
}
