import React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '../lib/utils';

interface StreakCalendarProps {
  streak: number;
  lastPracticeDate: string | null;
}

export default function StreakCalendar({ streak, lastPracticeDate }: StreakCalendarProps) {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();
  
  // Generate the last 7 days
  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    weekDays.push(d);
  }

  return (
    <div className="flex justify-between items-center mt-4 pt-4 border-t-2 border-bg-4">
      {weekDays.map((date, i) => {
        let isActive = false;
        if (streak > 0 && lastPracticeDate) {
          const lastDate = new Date(lastPracticeDate);
          lastDate.setHours(0, 0, 0, 0);
          const checkDate = new Date(date);
          checkDate.setHours(0, 0, 0, 0);
          
          const diffDays = Math.floor((lastDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays >= 0 && diffDays < streak) {
            isActive = true;
          }
        }

        const isToday = i === 6;

        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span className={cn("text-[10px] font-black uppercase", isToday ? "text-t1" : "text-t3")}>
              {days[date.getDay()]}
            </span>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all",
              isActive 
                ? "bg-orange-glow border-orange text-orange shadow-[0_2px_0_var(--orange-dk)]" 
                : "bg-bg-1 border-bg-4 text-t4"
            )}>
              {isActive ? <Flame className="w-4 h-4 fill-current" /> : <div className="w-2 h-2 rounded-full bg-bg-4" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
