import React from 'react';
import useGameStore from '../../store/gameStore'; 
import { SafeIcon } from '../shared/SafeIcon';

export const DiceVault = () => {
  const { character, lastRoll, isRolling } = useGameStore();

  return (
    <div className="lg:col-span-3 space-y-6 mt-2">
      {/* DICE TRADING VAULT */}
      <div className="bg-[#12241b] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.95),inset_0_10px_20px_rgba(0,0,0,0.95)] relative h-[270px] flex flex-col justify-between border-[12px] border-[#2e1d15] rounded-sm before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] before:opacity-20 before:pointer-events-none">
        <div className="border-b border-black/30 pb-1.5 text-center relative z-10">
          <span className="font-sans text-[9px] font-black uppercase tracking-widest text-emerald-100/40 block drop-shadow">
            Mahogany Tumbler Vault Tray
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
          {isRolling ? (
            <div className="text-center flex flex-col items-center justify-center">
              <span className="font-serif italic text-[#d4af37] animate-pulse tracking-widest uppercase text-xs">Casting Lots...</span>
            </div>
          ) : lastRoll && lastRoll.dice ? (
            <div className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
              <div className="flex flex-wrap justify-center gap-3 max-w-[190px]">
                {lastRoll.dice.map((die, idx) => {
                  const delayMs = idx * 75;
                  const randomSkew = `${Math.floor(Math.random() * 40) - 20}deg`;
                  return (
                    <div 
                      key={`${lastRoll.id || idx}-${idx}`} 
                      className={`w-11 h-11 border rounded font-serif font-black text-xl flex items-center justify-center shadow-2xl animate-dieTumble opacity-0
                        ${die.is_gilded ? 'border-2 border-[#d4af37] bg-gradient-to-br from-[#e5c158] to-[#b8860b] text-[#1a1311] shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-105' : 'border border-[#1a1311]/20 bg-[#fdfaf4] text-[#1a1311]'}`}
                      style={{ animationDelay: `${delayMs}ms`, '--random-skew': randomSkew }}
                    >
                      {die.value}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-emerald-100/20 text-xs italic font-serif px-4 leading-normal">
              Felt interior clear. Awaiting action trigger dice drops...
            </div>
          )}
        </div>
      </div>

      {/* STAGING ACTIVITY LOG */}
      <div className="font-sans">
        <h3 className="text-[10px] font-sans font-black uppercase tracking-widest text-[#d4af37] border-b border-[#d4af37]/20 pb-1.5 mb-3 flex items-center gap-1.5">
          <SafeIcon name="GiScroll" size={12} /> Staging Activity Log
        </h3>
        <div className="h-[280px] overflow-y-auto space-y-3 text-xs font-serif leading-normal pr-1.5 text-white/50 custom-scrollbar">
          {lastRoll && !isRolling && (
            <p className="animate-fadeIn text-white border-l-2 border-emerald-500/50 pl-2 italic">
              <span className="text-emerald-400 font-sans font-black text-[9px] uppercase tracking-tight mr-1.5">[ROLL]</span> {character?.name || 'Investigator'} evaluated an active rolling check calculation.
            </p>
          )}
          <p><span className="text-[#d4af37] font-sans font-black text-[9px] uppercase tracking-tight mr-1.5">[22:01]</span> Circle forged entry logs into the apothecary laboratory basement.</p>
          <p><span className="text-[#a82222] font-sans font-black text-[9px] uppercase tracking-tight mr-1.5">[21:48]</span> Arthur Vance absorbed structural shock trace impacts during security sweep.</p>
          <p><span className="text-[#d4af37] font-sans font-black text-[9px] uppercase tracking-tight mr-1.5">[21:42]</span> Active websocket tunnel synchronized cleanly with local staging server.</p>
        </div>
      </div>
    </div>
  );
};