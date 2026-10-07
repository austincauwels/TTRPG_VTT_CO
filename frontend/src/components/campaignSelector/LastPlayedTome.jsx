import React from 'react';
import { pressable } from '../shared/a11y';
import { CampaignMark } from '../shared/CampaignMark';
import { Tome } from './Tome';

const SIZE = 'w-full lg:landscape:w-[clamp(250px,20.5vw,380px)] max-w-[400px]';

// The cover's head panel: its heading tooled in gold, over a fine rule with a lozenge
const Head = ({ children }) => (
  <span className="flex flex-col items-center w-full">
    <span className="font-display uppercase embossed-gold tracking-[0.14em] leading-tight text-[clamp(12px,5.6cqw,21px)]">
      {children}
    </span>
    <span aria-hidden="true" className="flex items-center gap-[3%] w-[70%] mt-[5%] text-gold-leaf/40">
      <span className="flex-1 h-px bg-current" />
      <svg viewBox="0 0 10 10" className="w-[6%] min-w-[6px]"><path d="M5 0.6 9.4 5 5 9.4 0.6 5Z" fill="currentColor" /></svg>
      <span className="flex-1 h-px bg-current" />
    </span>
  </span>
);

// The plum tome: the last campaign played, with its own mark (owner's round 3 item 7).
// Without one it lies strapped and locked.
export const LastPlayedTome = ({ lastPlayedCampaign, onResume }) => {
  if (!lastPlayedCampaign) {
    return (
      <Tome
        role="img"
        aria-label="Last Played: no session yet"
        leather="#120614"
        className={`${SIZE} rotate-[2deg] translate-y-3 lg:landscape:translate-y-2 lg:landscape:translate-x-3 cursor-not-allowed`}
        frames={<span className="tome-frame tome-frame-gilt opacity-50" data-part="frame" style={{ '--fi': '5%' }} />}
        overlay={<Strap />}
      >
        <span className="absolute inset-x-0 top-[7%] flex justify-center">
          <span className="font-display embossed-gold text-center leading-[1.1] tracking-[0.04em] text-[clamp(20px,11cqw,48px)]">Last<br />Played</span>
        </span>
        <span aria-hidden="true" className="absolute bottom-[4%] left-1/2 -translate-x-1/2 block w-[58%] h-[9%] rounded-sm border border-gold-leaf/35 shadow-[inset_0_1px_3px_rgba(0,0,0,0.7)]" />
      </Tome>
    );
  }

  const gm = lastPlayedCampaign.type === 'gm';
  const heading = gm ? 'Last Played (Lightkeeper)' : 'Last Played';
  const name = lastPlayedCampaign.campaignName || 'Last Session';
  // The longest word fits on its line: a long one-word name used to break mid-word on a
  // phone, where the title's 18px floor is wider than the cover ("GREATWARD / S"). The
  // floor gives way for a long word (the face's capitals are about 0.72em wide).
  const longest = Math.max(...name.split(/\s+/).map((w) => w.length));
  const titleSize = longest > 7 ? `clamp(min(18px, ${(78 / (0.72 * longest)).toFixed(1)}cqw), 9.5cqw, 40px)` : undefined;
  return (
    <Tome
      {...pressable(onResume, `${heading}: ${name}`)}
      leather="#1e0624"
      className={`${SIZE} cursor-pointer rotate-[2deg] translate-y-3 lg:landscape:translate-y-2 lg:landscape:translate-x-3 lg:landscape:hover:-translate-y-1 lg:landscape:hover:rotate-[1deg]`}
      frames={<span className="tome-frame tome-frame-gilt" data-part="frame" style={{ '--fi': '5%' }} />}
    >
      <span className="flex flex-col items-center justify-between h-full w-full py-[4%]">
        <Head>{heading}</Head>
        <span className="flex-1 flex flex-col items-center justify-center gap-[7%] w-full min-h-0">
          <span data-glow className="gilt-glow embossed-gold font-display leading-[1.15] tracking-[0.03em] [text-wrap:balance] break-words max-w-full text-[clamp(18px,9.5cqw,40px)]"
            style={titleSize ? { fontSize: titleSize } : undefined}>
            {name}
          </span>
          <CampaignMark name={name} className="gilt-mark mark-emboss text-gold-leaf/80 w-[clamp(34px,19cqw,72px)] h-auto" />
        </span>
      </span>
    </Tome>
  );
};

// A leather strap across the cover with a brass padlock (the locked tome)
const Strap = () => (
  <div aria-hidden="true" className="absolute inset-x-0 z-[4]" style={{ top: '44%', height: '38px' }}>
    <div className="absolute inset-0" style={{
      background: 'linear-gradient(to bottom, #7a5228 0%, #3e2410 30%, #4a2c14 55%, #3e2410 72%, #7a5228 100%)',
      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.07), inset 0 -3px 7px rgba(0,0,0,0.75), 0 5px 14px rgba(0,0,0,0.7)',
      borderTop: '2px solid rgba(15,8,3,0.92)',
      borderBottom: '2px solid rgba(15,8,3,0.92)',
    }} />
    <div className="absolute inset-x-3" style={{ top: '7px', height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(210,165,75,0.5) 0px, rgba(210,165,75,0.5) 5px, transparent 5px, transparent 11px)' }} />
    <div className="absolute inset-x-3" style={{ bottom: '7px', height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(210,165,75,0.5) 0px, rgba(210,165,75,0.5) 5px, transparent 5px, transparent 11px)' }} />
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-75 sm:scale-100" style={{ zIndex: 40 }}>
      <svg width="42" height="56" viewBox="0 0 42 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 24V14C12 8.48 16.48 4 22 4C27.52 4 32 8.48 32 14V24" stroke="#1a0e04" strokeWidth="7" strokeLinecap="round" fill="none"/>
        <path d="M12 24V14C12 8.48 16.48 4 22 4C27.52 4 32 8.48 32 14V24" stroke="#c49d47" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M12 24V14C12 8.48 16.48 4 22 4" stroke="rgba(255,220,120,0.35)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <rect x="5" y="23" width="34" height="30" rx="4" fill="rgba(0,0,0,0.55)" transform="translate(1.5,2.5)"/>
        <rect x="5" y="23" width="34" height="30" rx="4" fill="url(#brassGrad)"/>
        <rect x="5" y="23" width="34" height="30" rx="4" stroke="#1a0e04" strokeWidth="1.5"/>
        <rect x="6" y="24" width="32" height="5" rx="2" fill="rgba(255,255,255,0.1)"/>
        <rect x="5" y="23" width="5" height="30" rx="4" fill="rgba(0,0,0,0.2)"/>
        <circle cx="22" cy="35" r="5" fill="rgba(10,5,2,0.9)"/>
        <rect x="20" y="38" width="4" height="9" rx="2" fill="rgba(10,5,2,0.9)"/>
        <defs>
          <linearGradient id="brassGrad" x1="5" y1="23" x2="39" y2="53" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c49d47"/>
            <stop offset="35%" stopColor="#7a5c18"/>
            <stop offset="70%" stopColor="#9a7828"/>
            <stop offset="100%" stopColor="#5a4010"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  </div>
);
