import React from 'react';

// Three calm candles seen from above. Each flame has a small warm halo of its own and a
// slow, gentle flicker that stops under prefers-reduced-motion (index.css).
export const CandleCluster = () => (
  <div className="absolute top-[100px] left-[6%] w-[8vw] max-w-[120px] min-w-[60px] h-[110px] z-20 pointer-events-none">
    {/* Candle 1 (Large): bottom-left anchor */}
    <div className="absolute bottom-[0%] left-[3%] w-[4.5vw] max-w-[68px] min-w-[36px] aspect-square rounded-full bg-gradient-to-br from-[#f2ead3] to-[#b3a48c] shadow-[10px_15px_25px_rgba(0,0,0,0.95)] border border-[#fff2d8]/30 flex items-center justify-center">
      <div className="absolute inset-[10%] rounded-full border border-[#8a7a63]/50 bg-gradient-to-tl from-[#b09e84] to-[#e6d9bf]" />
      <div className="relative w-2.5 h-2.5 rounded-full bg-[#ffeed0] shadow-[0_0_6px_2px_rgba(255,170,80,0.55)] animate-[wickFlicker_2.6s_ease-in-out_infinite_alternate]" />
    </div>

    {/* Candle 2 (Medium): upper-right of large */}
    <div className="absolute top-[4%] left-[52%] w-[2.8vw] max-w-[44px] min-w-[26px] aspect-square rounded-full bg-gradient-to-br from-[#e0d3ba] to-[#9c8e75] shadow-[15px_20px_30px_rgba(0,0,0,0.9)] border border-[#f5ead2]/20 flex items-center justify-center">
      <div className="absolute inset-[10%] rounded-full border border-[#7a6a53]/60 bg-gradient-to-tl from-[#a08e74] to-[#d6c7ac]" />
      <div className="relative w-1.5 h-1.5 rounded-full bg-[#ffeed0] shadow-[0_0_5px_1px_rgba(255,170,80,0.5)] animate-[wickFlicker_3.1s_ease-in-out_infinite_alternate-reverse]" />
    </div>

    {/* Candle 3 (Small): lower-right, tucked in */}
    <div className="absolute top-[60%] right-[4%] w-[2vw] max-w-[32px] min-w-[18px] aspect-square rounded-full bg-gradient-to-br from-[#d1c2a3] to-[#8a7b62] shadow-[5px_10px_15px_rgba(0,0,0,0.8)] border border-[#e0d1b4]/20 flex items-center justify-center">
      <div className="absolute inset-[10%] rounded-full border border-[#6e5e48]/50 bg-gradient-to-tl from-[#9c896e] to-[#c7b799]" />
      <div className="relative w-1 h-1 rounded-full bg-[#ffeed0] shadow-[0_0_4px_1px_rgba(255,170,80,0.45)] animate-[wickFlicker_2.2s_ease-in-out_infinite_alternate]" />
    </div>
  </div>
);
