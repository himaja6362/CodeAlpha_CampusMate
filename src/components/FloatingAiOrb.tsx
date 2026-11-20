import React from 'react';

interface FloatingAiOrbProps {
  size?: 'sm' | 'md' | 'lg';
  thinking?: boolean;
}

export const FloatingAiOrb: React.FC<FloatingAiOrbProps> = ({
  size = 'lg',
  thinking = false,
}) => {
  if (size === 'sm') {
    return (
      <div
        className="relative flex h-6 w-6 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        <span
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-violet-400 opacity-75 blur-[3px] ${
            thinking ? 'animate-pulse' : ''
          }`}
        />
        <span className="relative h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-400 shadow-inner ring-1 ring-white/50" />
      </div>
    );
  }

  const dimensionClass = size === 'md' ? 'h-20 w-20' : 'h-36 w-36 sm:h-44 sm:w-44';

  return (
    <div
      className={`relative flex items-center justify-center ${dimensionClass} animate-orb-float select-none`}
      aria-hidden="true"
    >
      {/* Ambient Electric Blue + Lavender Halo */}
      <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-blue-500/25 via-violet-500/20 to-indigo-400/25 blur-2xl dark:from-blue-500/35 dark:via-violet-500/30 dark:to-indigo-400/25" />

      {/* Slow Orbital Ring */}
      <div className="absolute inset-1 rounded-full border border-indigo-400/30 dark:border-violet-400/25 animate-orb-spin">
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-blue-500 shadow-sm dark:bg-violet-300" />
      </div>

      {/* Core Glassmorphic Sphere */}
      <div className="relative h-[76%] w-[76%] overflow-hidden rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/25 ring-1 ring-white/40 dark:ring-white/20">
        {/* Specular Pearl Highlight */}
        <div className="absolute left-[14%] top-[12%] h-[36%] w-[46%] rounded-full bg-gradient-to-br from-white/55 to-transparent blur-[2px]" />
        {/* Inner Lavender Refraction */}
        <div className="absolute bottom-[8%] right-[10%] h-[44%] w-[44%] rounded-full bg-violet-300/35 blur-md" />
      </div>
    </div>
  );
};
