import React from 'react';

// The felt tray. dieSkews, getIsCandidate and onDieClick come from DiceVault, so every
// tray that shows the same roll lands its dice at the same angles.
export const DiceTray = ({ lastRoll, isRolling, gildedPending, dieSkews, getIsCandidate, onDieClick }) => (
  <div className="bg-[#12241b] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.95),inset_0_10px_20px_rgba(0,0,0,0.95)] relative h-[270px] flex flex-col justify-between border-[12px] border-[#2e1d15] rounded-sm before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] before:opacity-20 before:pointer-events-none">
    <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
      {isRolling ? (
        <div className="text-center flex flex-col items-center justify-center">
          <span className="font-serif italic text-[#d4af37] animate-pulse tracking-widest uppercase text-xs">Casting Lots...</span>
        </div>
      ) : lastRoll && lastRoll.dice ? (
        <div className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
          <div className="flex flex-wrap justify-center gap-3 max-w-[190px]">
            {lastRoll.dice.map((die, idx) => {
              const isCandidate = getIsCandidate(die, idx);
              const delayMs = idx * 75;
              const randomSkew = dieSkews[idx] || '0deg';

              let extraClasses = '';
              let clickHandler = undefined;

              if (gildedPending) {
                if (isCandidate) {
                  extraClasses = 'animate-liftShimmy cursor-pointer ring-2 ring-white/50 hover:ring-white hover:scale-110 transition-transform';
                  clickHandler = () => onDieClick(die);
                } else {
                  extraClasses = 'opacity-35';
                }
              } else if (isCandidate) {
                extraClasses = 'ring-1 ring-emerald-400/60';
              }

              const tumbleClass = gildedPending ? '' : 'animate-dieTumble opacity-0';

              return (
                <div
                  key={`${lastRoll.id || idx}-${idx}`}
                  onClick={clickHandler}
                  onTouchEnd={clickHandler ? (e) => { e.preventDefault(); clickHandler(); } : undefined}
                  className={`w-11 h-11 border rounded font-serif font-black text-xl flex items-center justify-center shadow-2xl ${tumbleClass}
                    ${die.is_gilded
                      ? 'border-2 border-[#d4af37] bg-gradient-to-br from-[#e5c158] to-[#b8860b] text-[#1a1311] shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-105'
                      : 'border border-[#1a1311]/20 bg-[#fdfaf4] text-[#1a1311]'}
                    ${extraClasses}`}
                  style={{ animationDelay: gildedPending ? '0ms' : `${delayMs}ms`, '--random-skew': randomSkew }}
                >
                  {die.value}
                </div>
              );
            })}
          </div>

          {gildedPending && (
            <p className="text-[10px] font-serif italic text-[#d4af37]/70 tracking-wide animate-pulse mt-1">
              Choose your die
            </p>
          )}

        </div>
      ) : (
        <div className="text-center text-emerald-100/20 text-sm italic font-serif px-4 leading-normal">
          Awaiting dice drops.
        </div>
      )}
    </div>
  </div>
);
