import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "", size = 40 }: LogoProps) {
  return (
    <div 
      className={`relative flex items-center justify-center rounded-[22%] overflow-hidden ${className}`}
      style={{ width: size, height: size, backgroundColor: '#58cc02' }}
    >
      <svg className="w-full h-full scale-[0.8]" viewBox="0 0 100 100">
        <rect x="33" y="13" width="34" height="6" rx="3" fill="#ffffff"/>
        <path d="M27 38C27 27 36 22 50 22C64 22 73 27 73 38V49C73 60 62 67 50 67C38 67 27 60 27 49V38Z" fill="#ffffff"/>
        <path d="M27 40C17 42 17 55 27 58" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round"/>
        <path d="M73 40C83 42 83 55 73 58" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round"/>
        <path d="M43 33H50C57.5 33 62.5 38 62.5 45C62.5 52 57.5 57 50 57H43V33Z" fill="#58cc02"/>
        <rect x="43" y="33" width="5" height="24" rx="2.5" fill="#58cc02"/>
        <path d="M50 38C54.5 38 57.8 41 57.8 45C57.8 49 54.5 52 50 52H48V38H50Z" fill="#ffffff"/>
        <rect x="43" y="67" width="14" height="8.5" rx="2.5" fill="#ffffff"/>
        <rect x="33" y="75.5" width="34" height="8" rx="4" fill="#ffffff"/>
      </svg>
    </div>
  );
}
