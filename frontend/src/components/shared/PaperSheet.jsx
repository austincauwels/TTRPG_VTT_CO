import React from 'react';
import { GiWaxSeal } from 'react-icons/gi';

// The creator's paper stock: parchment with a double sepia rule, tea stains, two fold
// lines, corner brackets and faint CANDELA OBSCURA and seal watermarks. The creator's
// Profile, Actions and Circle sheets use it, and so does the login screen's admission
// slip, so both are cut from the same sheet. bodyClassName sets the padding inside.
export const PaperSheet = ({ children, className = '', bodyClassName = 'p-4 sm:p-8', ...rest }) => (
  <div className={`paper-bg paper-texture relative ${className}`}
    style={{ border: '3px double rgb(var(--c-sepia))', boxShadow: '0 14px 36px rgba(0,0,0,0.65), inset 0 0 80px rgb(var(--c-sepia)/0.07)' }}
    {...rest}>
    {/* Tea stains */}
    <div className="tea-stain" style={{ width: 320, height: 240, top: -60, left: -80, background: 'radial-gradient(ellipse at center, rgb(var(--c-sepia)/0.12) 0%, transparent 70%)' }} />
    <div className="tea-stain" style={{ width: 260, height: 200, bottom: -40, right: -50, background: 'radial-gradient(ellipse at center, rgb(var(--c-sepia)/0.10) 0%, transparent 70%)' }} />
    <div className="tea-stain" style={{ width: 160, height: 120, top: '45%', right: '10%', background: 'radial-gradient(ellipse at center, rgb(var(--c-sepia)/0.07) 0%, transparent 70%)' }} />
    <div className="tea-stain" style={{ width: 90, height: 70, top: '20%', left: '8%', background: 'radial-gradient(ellipse at center, rgb(var(--c-sepia)/0.06) 0%, transparent 70%)' }} />
    {/* Fold lines */}
    <div className="fold-line" style={{ top: '34%' }} />
    <div className="fold-line" style={{ top: '67%' }} />
    {/* Corner filigrees */}
    <div className="absolute top-2 left-2 w-7 h-7 border-t-2 border-l-2 border-sepia/50" />
    <div className="absolute top-2 right-2 w-7 h-7 border-t-2 border-r-2 border-sepia/50" />
    <div className="absolute bottom-2 left-2 w-7 h-7 border-b-2 border-l-2 border-sepia/50" />
    <div className="absolute bottom-2 right-2 w-7 h-7 border-b-2 border-r-2 border-sepia/50" />
    {/* Text watermark */}
    <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0"
      style={{ transform: 'rotate(-28deg)' }}>
      <span className="text-[100px] font-serif font-black text-sepia whitespace-nowrap select-none"
        style={{ opacity: 0.032, letterSpacing: '0.08em' }}>CANDELA OBSCURA</span>
    </div>
    {/* Circular seal watermark */}
    <div aria-hidden="true" className="absolute bottom-8 right-8 pointer-events-none z-0" style={{ opacity: 0.06 }}>
      <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
        style={{ border: '3px solid rgb(var(--c-sepia))' }}>
        <span className="text-[7px] font-sans font-black tracking-[0.35em] text-sepia uppercase">Candela</span>
        <GiWaxSeal size={30} className="text-sepia my-1" />
        <span className="text-[7px] font-sans font-black tracking-[0.35em] text-sepia uppercase">Archive</span>
      </div>
    </div>
    <div className={`relative z-10 ${bodyClassName}`}>{children}</div>
  </div>
);
