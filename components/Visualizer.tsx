
import React from 'react';

interface VisualizerProps {
  volume: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({ volume }) => {
  return (
    <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden bg-black">
      <div className="relative w-full flex justify-center items-center">
        {/* Base Static Text (Ghost) */}
        <h1 className="text-[18vw] font-black text-white/[0.04] tracking-tighter leading-none translate-y-[-10%]">
          KAREN
        </h1>
        
        {/* Active Shimmering Text (Overlay) */}
        <h1 
          className="absolute text-[18vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-fuchsia-500 to-indigo-500 tracking-tighter leading-none translate-y-[-10%] transition-opacity duration-300 ease-out blur-sm"
          style={{ opacity: Math.min(1, volume * 6) }}
        >
          KAREN
        </h1>
        
        {/* Sharper Overlay for core readability */}
        <h1 
          className="absolute text-[18vw] font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-fuchsia-300 to-indigo-400 tracking-tighter leading-none translate-y-[-10%] transition-opacity duration-300 ease-out"
          style={{ opacity: Math.min(1, volume * 6) }}
        >
          KAREN
        </h1>
      </div>
    </div>
  );
};
