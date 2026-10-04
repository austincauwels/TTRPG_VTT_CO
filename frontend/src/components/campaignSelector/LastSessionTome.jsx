import React from 'react';

// Renders the brass lock SVG with id="brassGrad"; render this tome once only.
export const LastSessionTome = ({ lastPlayedCampaign, onResume }) => (
  lastPlayedCampaign ? (
      <div
        onClick={onResume}
        className="thick-book group w-[30vw] max-w-[440px] aspect-[1/1.3] bg-[#1e0624] p-6 shadow-[20px_30px_50px_rgba(0,0,0,0.98),inset_10px_0_25px_rgba(0,0,0,0.95),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[2deg] translate-y-6 translate-x-4 hover:-translate-y-1 hover:rotate-[1deg] cursor-pointer"
      >
        <div className="leather-texture" />
        <div className="absolute inset-5 border-[3px] border-[#c49d47]/40 embossed-stamp pointer-events-none rounded z-10" />
        <div className="z-20 flex flex-col items-center text-center relative">
          <span className="font-mono-data text-xl font-bold tracking-[0.5em] text-[#c49d47]/60 mb-6 uppercase drop-shadow-md">
            {lastPlayedCampaign.type === 'gm' ? 'List of Campaigns' : 'Campaign Log'}
          </span>
          <h2 className="font-playfair italic font-bold text-4xl md:text-5xl embossed-gold tracking-tight leading-[1.1] mb-4 group-hover:text-[#e8c678] transition-colors">
            {lastPlayedCampaign.campaignName || 'Last Session'}
          </h2>
          <div className="flex items-center gap-3 my-4">
            <div className="w-6 h-[1px] bg-[#c49d47]/30" />
            <svg className="w-5 h-5 text-[#c49d47]/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" d="M12 2l2 4h-4l2-4zm-3 4h6v14H9V6zm1.5 3h3M10.5 12h3M10.5 15h3M5 21h14" />
            </svg>
            <div className="w-6 h-[1px] bg-[#c49d47]/30" />
          </div>
          <p className="font-garamond text-[#c49d47]/80 text-[26px] tracking-wider max-w-[70%] leading-relaxed drop-shadow-md uppercase mt-2">
            {lastPlayedCampaign.type === 'gm'
              ? "Resume command of your active investigation."
              : "Resume your circle's ongoing assignment."}
          </p>
        </div>
      </div>
  ) : (
      <div className="thick-book w-[30vw] max-w-[440px] aspect-[1/1.3] bg-[#120614] p-6 shadow-[20px_30px_50px_rgba(0,0,0,0.98),inset_10px_0_25px_rgba(0,0,0,0.95),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[2deg] translate-y-6 translate-x-4 cursor-not-allowed">
        <div className="leather-texture" />
        <div className="absolute inset-5 border-[3px] border-[#c49d47]/20 embossed-stamp pointer-events-none rounded z-10" />

        <div className="z-20 flex flex-col items-center text-center relative w-full" style={{ marginBottom: '60px' }}>
          <span className="font-mono-data text-xl font-bold tracking-[0.5em] text-[#c49d47]/50 mb-4 uppercase drop-shadow-md">Campaign Log</span>
          <h2 className="font-playfair italic font-bold text-5xl md:text-6xl embossed-gold tracking-tight leading-[1.05]">
            Last<br/>Session
          </h2>
        </div>

        {/* Leather strap with brass lock */}
        <div className="absolute inset-x-0 z-30" style={{ top: '44%', height: '38px' }}>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, #7a5228 0%, #3e2410 30%, #4a2c14 55%, #3e2410 72%, #7a5228 100%)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.07), inset 0 -3px 7px rgba(0,0,0,0.75), 0 5px 14px rgba(0,0,0,0.7)',
            borderTop: '2px solid rgba(15,8,3,0.92)',
            borderBottom: '2px solid rgba(15,8,3,0.92)',
          }} />
          <div className="absolute inset-x-3" style={{ top: '7px', height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(210,165,75,0.5) 0px, rgba(210,165,75,0.5) 5px, transparent 5px, transparent 11px)' }} />
          <div className="absolute inset-x-3" style={{ bottom: '7px', height: '1px', backgroundImage: 'repeating-linear-gradient(to right, rgba(210,165,75,0.5) 0px, rgba(210,165,75,0.5) 5px, transparent 5px, transparent 11px)' }} />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 40 }}>
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

        <div className="z-20 absolute bottom-7 flex flex-col items-center gap-2 w-full px-6">
          <p className="font-garamond text-[#c49d47]/55 text-2xl tracking-wider text-center leading-relaxed uppercase">
            No Recent Sessions
          </p>
        </div>
      </div>
  )
);
