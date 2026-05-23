import React from 'react';
import useGameStore from '../store/gameStore';

export const CampaignSelector = () => {
  const { setStage, connect, logout } = useGameStore();

  const handleResumeCampaign = (campaignId) => {
    connect(campaignId);
    setStage('DESK');
  };

  const handleLightkeeperAccess = (campaignId) => {
    connect(campaignId);
    setStage('GM_DASH');
  };

  const handleNewInvestigator = () => {
    setStage('CHARACTER_CREATION');
  };

  const handleLogout = () => {
    logout();
    setStage('LOGIN');
  };

  return (
    <div className="scene-container min-h-screen w-full relative overflow-hidden select-none flex flex-col font-serif bg-black">
      
      {/* 1. DYNAMIC ASSET & STYLE INJECTION */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');

        .font-cinzel { font-family: 'Cinzel', serif; }
        .font-garamond { font-family: 'Cormorant Garamond', serif; }
        .font-mono-data { font-family: 'IBM Plex Mono', monospace; }
        .font-playfair { font-family: 'Playfair Display', serif; }

        @keyframes candleSharedGlow {
          0%, 100% { opacity: 0.85; transform: scale(1); filter: blur(40px); }
          50% { opacity: 0.65; transform: scale(0.95); filter: blur(45px); }
          75% { opacity: 0.95; transform: scale(1.02); filter: blur(38px); }
        }

        @keyframes wickFlicker {
          0%, 100% { opacity: 0.9; transform: scale(1) translateX(0px); }
          25% { opacity: 0.7; transform: scale(0.9) translateX(-1px); }
          50% { opacity: 1; transform: scale(1.1) translateX(1px); }
        }

        .desk-surface {
        /* Rich deep-brown mahogany base */
        background-color: #2b170c;
        
        /* 
          1. Radial gradient creates the 'desk lamp' hotspot.
          2. Linear gradient darkens the bottom/edges for desk depth.
          3. The background-image property holds the wood texture, 
              rotated 90 degrees to force a horizontal grain flow.
        */
        background: 
          radial-gradient(circle at 50% 50%, rgba(60, 30, 10, 0.2) 0%, rgba(0, 0, 0, 0.5) 100%),
          linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%),
          url('https://www.transparenttextures.com/patterns/dark-wood.png');
          
        /* Flip the texture pattern to horizontal */
        background-size: auto, auto, 400px 400px;
        background-blend-mode: overlay, multiply, normal;
        /* Rotate the pattern 90deg to ensure horizontal grain */
        transform: rotate(0deg); 
        /* Adding a subtle transform to the whole background container if needed */
      }

      /* To ensure the wood grain pattern itself is horizontal */
      .desk-surface::after {
        content: "";
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
        background: url('https://www.transparenttextures.com/patterns/dark-wood.png');
        background-size: 400px 400px;
        transform: rotate(90deg);
        opacity: 0.3;
        z-index: -1;
      }

        /* Leather Tome Base Styles */
        .thick-book {
          position: relative;
          border-radius: 6px 14px 14px 6px;
          transform-style: preserve-3d;
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
          cursor: pointer;
        }

        .leather-texture {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 150 150' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='leather'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.4' numOctaves='4' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23ffffff' filter='url(%23leather)'/%3E%3C/svg%3E");
          mix-blend-mode: multiply;
          opacity: 0.6;
          pointer-events: none;
          z-index: 1;
        }

        .thick-book::after {
          content: ''; position: absolute; left: 18px; top: 0; bottom: 0; width: 10px;
          background: linear-gradient(to right, rgba(0,0,0,0.8), rgba(255,255,255,0.05), rgba(0,0,0,0.6));
          border-left: 1px solid rgba(0,0,0,0.9); border-right: 1px solid rgba(255,255,255,0.05);
          border-radius: 2px; z-index: 2;
        }

        .thick-book::before {
          content: ''; position: absolute; top: 5px; bottom: 5px; right: -16px; width: 16px;
          background: repeating-linear-gradient(to bottom, #d6c6b0, #d6c6b0 2px, #bfae95 2px, #bfae95 4px);
          border-radius: 0 8px 8px 0; border-right: 1px solid rgba(0,0,0,0.6);
          border-top: 1px solid rgba(0,0,0,0.4); border-bottom: 1px solid rgba(0,0,0,0.4);
          box-shadow: inset -5px 0 15px rgba(0,0,0,0.8); transform: translateZ(-2px); z-index: -1;
        }

        .embossed-gold { color: #c49d47; text-shadow: -1px -1px 1px rgba(0,0,0,0.9), 1px 1px 1px rgba(255,255,255,0.2), inset 0 0 2px rgba(0,0,0,0.5); }
        .embossed-silver { color: #a8a8a8; text-shadow: -1px -1px 1px rgba(0,0,0,0.9), 1px 1px 1px rgba(255,255,255,0.15); }
        .embossed-stamp { box-shadow: inset 1px 1px 3px rgba(0,0,0,0.8), inset -1px -1px 2px rgba(255,255,255,0.1); }

        /* Turn-of-the-Century Pamphlets */
        .pamphlet {
          background-color: #e6dfcc;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.08 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E");
          box-shadow: 4px 6px 15px rgba(0,0,0,0.7), inset 0 0 40px rgba(139, 115, 85, 0.4);
          cursor: pointer;
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
          position: absolute; 
        }

        /* Top-Fold Horizontal Newspaper Emulation */
        .newspaper-top-fold {
          background-color: #dcd2b8;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' result='noise'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.1 0' in='noise' result='coloredNoise'/%3E%3CfeBlend in='SourceGraphic' in2='coloredNoise' mode='multiply'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23dcd2b8' filter='url(%23paper)'/%3E%3C/svg%3E");
          box-shadow: 2px 8px 20px rgba(0,0,0,0.9), inset 0 -30px 40px -10px rgba(0,0,0,0.5);
          color: #2b251e;
          position: absolute;
          border-bottom: 2px solid rgba(0,0,0,0.3);
        }

        /* Simulating the fold dropping off the bottom */
        .newspaper-top-fold::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 15px;
          background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
          pointer-events: none; z-index: 10;
        }

        .aged-paper-img {
          mix-blend-mode: multiply;
          filter: grayscale(80%) sepia(40%) contrast(120%) brightness(95%);
        }
      `}</style>

      {/* 2. DESK BACKGROUND */}
      <div className="absolute inset-0 desk-surface pointer-events-none z-0" />

      {/* 3. SHIFTED TIGHT CANDLE CLUSTER (Perfectly Round, Different Sizes) */}
      <div className="absolute top-[28%] left-[8%] w-[250px] h-[250px] z-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-5 -translate-y-1/2 w-[600px] h-[600px] rounded-full mix-blend-screen bg-[radial-gradient(circle,rgba(240,140,50,0.12)_0%,rgba(200,80,20,0.02)_35%,transparent_60%)] animate-[candleSharedGlow_4s_infinite_alternate]" />
        
        {/* Candle 1 (Massive) */}
        <div className="absolute bottom-[10%] left-[15%] w-32 h-32 rounded-full bg-gradient-to-br from-[#f2ead3] to-[#b3a48c] shadow-[10px_15px_25px_rgba(0,0,0,0.95)] border border-[#fff2d8]/30 flex items-center justify-center rotate-[-2deg]">
          <div className="absolute inset-2.5 rounded-full border border-[#8a7a63]/50 bg-gradient-to-tl from-[#b09e84] to-[#e6d9bf]" />
          <div className="relative w-3.5 h-3.5 rounded-full bg-[#ffeed0] shadow-[0_0_15px_6px_rgba(255,140,40,0.9)] animate-[wickFlicker_0.15s_infinite_alternate]" />
        </div>

        {/* Candle 2 (Medium) */}
        <div className="absolute bottom-[40%] left-[55%] w-20 h-20 rounded-full bg-gradient-to-br from-[#e0d3ba] to-[#9c8e75] shadow-[15px_20px_30px_rgba(0,0,0,0.9)] border border-[#f5ead2]/20 flex items-center justify-center rotate-[4deg]">
          <div className="absolute inset-2 rounded-full border border-[#7a6a53]/60 bg-gradient-to-tl from-[#a08e74] to-[#d6c7ac]" />
          <div className="relative w-2.5 h-2.5 rounded-full bg-[#ffeed0] shadow-[0_0_12px_4px_rgba(255,130,30,0.8)] animate-[wickFlicker_0.2s_infinite_alternate-reverse]" />
        </div>

        {/* Candle 3 (Small) */}
        <div className="absolute bottom-[15%] left-[65%] w-14 h-14 rounded-full bg-gradient-to-br from-[#d1c2a3] to-[#8a7b62] shadow-[5px_10px_15px_rgba(0,0,0,0.8)] border border-[#e0d1b4]/20 flex items-center justify-center rotate-[-6deg]">
          <div className="absolute inset-1.5 rounded-full border border-[#6e5e48]/50 bg-gradient-to-tl from-[#9c896e] to-[#c7b799]" />
          <div className="relative w-2 h-2 rounded-full bg-[#ffeed0] shadow-[0_0_10px_3px_rgba(255,120,20,0.7)] animate-[wickFlicker_0.1s_infinite_alternate]" />
        </div>
      </div>

      {/* 4. MASSIVE SCATTERED CRYPTID IMAGES */}
        {/* Increased container size and adjusted positioning */}
        <div className="absolute bottom-[5%] left-[10%] w-[850px] h-[750px] pointer-events-none z-10">
          
          {/* Cryptid Sheet 1 (Bottom Left) - Scaled Up */}
          <div className="absolute bottom-[10%] left-[5%] w-[320px] aspect-[1/1.4] bg-[#e6d8bc] rotate-[-12deg] shadow-[4px_6px_15px_rgba(0,0,0,0.9)] border border-[#c4b599] p-2 flex flex-col">
            <div className="w-full h-full border border-[#5c4a35]/40 relative overflow-hidden bg-[#d9cdb4]">
              {/* Ensure object-cover fills the container */}
              <img src="/images/cryp1.jpg" alt="Field Sketch 1" className="w-full h-full object-cover aged-paper-img scale-100" />
            </div>
          </div>

          {/* Cryptid Sheet 2 (Center Massive) - Scaled Up */}
          <div className="absolute bottom-[20%] left-[32%] w-[400px] aspect-[4/5] bg-[#dbcdb2] rotate-[8deg] shadow-[5px_8px_20px_rgba(0,0,0,0.95)] border border-[#d1c2a3] p-2 flex flex-col">
            <div className="w-full h-full border border-[#5c4a35]/30 relative overflow-hidden bg-[#ebdcc2]">
              <img src="/images/cryp2.webp" alt="Field Sketch 2" className="w-full h-full object-cover aged-paper-img scale-105" />
            </div>
          </div>

          {/* Cryptid Sheet 3 (Right Under Book) - Scaled Up */}
          <div className="absolute bottom-[5%] left-[60%] w-[330px] aspect-[1/1.3] bg-[#cfc0a3] rotate-[22deg] shadow-[6px_12px_25px_rgba(0,0,0,0.98)] border border-[#b8a98d] p-3 flex flex-col">
            <div className="w-full h-full border-2 border-double border-[#5c4a35]/50 relative overflow-hidden bg-[#e0d3ba]">
              <img src="/images/cryp3.jpg" alt="Field Sketch 3" className="w-full h-full object-cover aged-paper-img" />
            </div>
          </div>
        </div>

      {/* 5. EXACT GM OPERATIONS HEADER */}
      <div className="relative z-50 w-full">
        <div className="absolute top-4 right-6 z-50">
          <button 
            onClick={handleLogout}
            className="text-[10px] uppercase tracking-[0.2em] font-sans text-[#3b82f6] hover:text-white transition-colors border border-transparent hover:border-[#3b82f6]/50 px-2 py-1"
          >
            [ Return to Login ]
          </button>
        </div>
        
        <header className="w-full bg-[#0f172a] py-6 flex flex-col items-center justify-center border-b border-black/60 shadow-xl">
          <h1 className="text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
          <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Chapter Hub Terminal</h2>
        </header>
      </div>

      {/* 6. PHYSICAL DESK LAYOUT */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto flex items-center justify-center gap-12 p-12 z-30 perspective-[1500px]">
        
        {/* LEFT AREA: MASSIVE LEATHER TOMES */}
        <div className="flex gap-6 items-center justify-center w-[50%] ml-4 z-30">
          
          {/* TOME I: YOUR CHARACTERS (Dark Forest Green Leather) */}
          <div 
            onClick={() => handleResumeCampaign('fairelands-01')}
            className="thick-book group w-[28vw] max-w-[400px] aspect-[1/1.4] bg-[#0b1f12] p-6 shadow-[15px_25px_40px_rgba(0,0,0,0.95),inset_8px_0_20px_rgba(0,0,0,0.9),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[-3deg] -translate-y-4 hover:-translate-y-6"
          >
            <div className="leather-texture" />
            <div className="absolute inset-6 border-2 border-black/40 embossed-stamp pointer-events-none rounded-sm z-10" />
            <div className="absolute inset-8 border border-black/30 embossed-stamp pointer-events-none rounded-sm z-10" />

            <div className="z-20 flex flex-col items-center text-center px-4 relative">
              <span className="font-mono-data text-[9px] font-bold tracking-[0.4em] text-[#c49d47]/70 mb-4 uppercase drop-shadow-md">
                Dossier Vol. III
              </span>
              <h2 className="font-playfair text-4xl md:text-5xl font-black embossed-gold tracking-wider leading-[1.1] mb-2 group-hover:text-[#e8c678] transition-colors">
                Active<br/>Roster
              </h2>
              <div className="w-12 h-[1px] bg-[#c49d47]/30 my-5 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
              <p className="font-garamond text-[#a8a8a8] text-sm italic tracking-wide max-w-[80%] leading-relaxed drop-shadow-md">
                Review your assigned identities, trauma marks, and active clearance keys.
              </p>
            </div>
          </div>

          {/* TOME II: ACTIVE ASSIGNMENT */}
          <div 
            onClick={() => handleResumeCampaign('fairelands-01')}
            className="thick-book group w-[30vw] max-w-[440px] aspect-[1/1.3] bg-[#1e0624] p-6 shadow-[20px_30px_50px_rgba(0,0,0,0.98),inset_10px_0_25px_rgba(0,0,0,0.95),inset_-2px_0_5px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center relative rotate-[2deg] translate-y-6 translate-x-4 hover:-translate-y-1 hover:rotate-[1deg]"
          >
            <div className="leather-texture" />
          {/* Burnished Gold Embossing Effect */}
          <div className="absolute inset-5 border-[3px] border-[#c49d47]/40 embossed-stamp pointer-events-none rounded z-10" />
          
          <div className="z-20 flex flex-col items-center text-center relative">
            <span className="font-mono-data text-[10px] font-bold tracking-[0.5em] text-[#c49d47]/60 mb-6 uppercase drop-shadow-md">
              Campaign Log
            </span>
            {/* New Font: Playfair Display Italic/Bold for high-end embossed look */}
            <h2 className="font-playfair italic font-bold text-5xl md:text-6xl embossed-gold tracking-tight leading-[1.05] mb-4 group-hover:text-[#e8c678] transition-colors">
              The<br/>Fairelands
            </h2>
            <div className="flex items-center gap-3 my-4">
              <div className="w-6 h-[1px] bg-[#c49d47]/30" />
              <svg className="w-5 h-5 text-[#c49d47]/50" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="square" strokeLinejoin="miter" d="M12 2l2 4h-4l2-4zm-3 4h6v14H9V6zm1.5 3h3M10.5 12h3M10.5 15h3M5 21h14" />
              </svg>
              <div className="w-6 h-[1px] bg-[#c49d47]/30" />
            </div>
            <p className="font-garamond text-[#c49d47]/80 text-[13px] tracking-wider max-w-[70%] leading-relaxed drop-shadow-md uppercase mt-2">
              Resume your circle's ongoing deployment within the capital sector.
            </p>
            </div>
          </div>

        </div>

        {/* RIGHT AREA: SHIFTED MESSY DESK PAMPHLETS & NEWSPAPER */}
        {/* We use a wider container to ensure everything stays far right and avoids books */}
        <div className="relative w-[50%] min-w-[550px] h-[600px] perspective-[1200px] flex items-center">
          
          {/* THE HALCYON HERALD NEWSPAPER (Top-Fold Horizontal Layout) */}
          <div className="newspaper-top-fold w-[960px] h-[700px] p-7 rotate-[-8deg] top-[-40px] left-[-100px] flex flex-col overflow-hidden">
            
            {/* Elaborate Broadsheet Header */}
            <div className="border-b-[4px] border-double border-[#2b251e] pb-2 mb-3 text-center relative z-20">
              <h1 className="font-cinzel text-[42px] font-black tracking-tight text-[#1f1b15] scale-y-[1.1] mb-1">THE HALCYON HERALD</h1>
              <div className="flex justify-between items-center font-mono-data text-[8px] uppercase tracking-widest font-bold border-t border-[#2b251e] pt-1.5">
                <span>Vol. XCIV, No. 212</span>
                <span>The Fairelands</span>
                <span>Two Pence</span>
              </div>
            </div>
            
            {/* Horizontal Layout - Main Headline spans across top */}
            <div className="border-b-[2px] border-[#2b251e] pb-2 mb-3 text-center z-20">
              <h2 className="font-playfair text-3xl font-black leading-none uppercase tracking-wide text-[#1a1611]">
                TERROR IN THE SIDLE!
              </h2>
              <h3 className="font-garamond text-[15px] italic font-semibold mt-1 text-[#3b3227]">
                Authorities Baffled by Midnight Disappearances
              </h3>
            </div>

            {/* 3-Column Text Layout with Expanded Content */}
            <div className="columns-3 gap-6 font-garamond text-[14.5px] leading-[1.65] text-justify opacity-90 z-20 h-full overflow-hidden">
              <p className="mb-4">
                <span className="text-5xl float-left mr-2 mt-1 leading-none font-cinzel font-bold text-[#1f1b15]">C</span>itizens are strongly urged to remain indoors after nightfall following a staggering series of inexplicable vanishings in the lower wards. The constabulary maintains that there is no cause for mass hysteria. Commissioner Vane stated this morning that the disappearances are likely linked to "migratory patterns of the transient population" and strictly advised the public against spreading sensationalist rumors that might incite unrest.
              </p>
              <p className="mb-4">
                "It took him right out of the alley," claims one docker, visibly shaken, his hands trembling as he gestured toward the dense fog blanketing the canal. "No sound, no struggle. Just swallowed by the damp. One moment he was lighting his pipe, the next, the fog just... closed over him. There was a smell, too—like ozone and wet earth."
              </p>
              <p className="mb-4">
                Officials at the Periphery decline to comment on rumors of occult involvement, citing an ongoing municipal investigation into local infrastructure collapse. Whispers among the working class point to phenomena long dismissed by the aristocracy, suggesting that the very stones of Newfaire are waking up to claim their due.
              </p>
              <p className="mb-4">
                Unconfirmed reports from Southward suggest a similar pattern of events occurred exactly a century prior. Historians at the Antiquarian Society were unavailable for comment, though archived journals unearthed by independent researchers note a "culling of the unworthy" during that frozen, blood-stained winter of 1826.
              </p>
              <p className="mb-4">
                In unrelated news, the Briarbank tram line remains closed following yesterday's "structural anomaly." Passengers are advised to seek alternative routes until further notice, as repair crews refuse to descend into the tunnels after dark, citing "unnatural vibrations" emanating from the bedrock itself.
              </p>
              <p className="mb-4">
                The city council has scheduled a emergency hearing for Tuesday to address the plummeting morale. Attendance is mandatory for all district representatives, though several have already fled to their estates in the High Country.
              </p>

              {/* Robust Advertisement Module */}
              <div className="border-2 border-[#2b251e] p-4 text-center shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] break-inside-avoid mt-2 bg-[#d2c7ac]">
                <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-[#2b251e]" />
                <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-[#2b251e]" />
                <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-[#2b251e]" />
                <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-[#2b251e]" />
                
                <h4 className="font-playfair font-black text-lg mb-1 uppercase leading-none mt-1">Dr. West's</h4>
                <h5 className="font-cinzel text-[10px] font-bold mb-3 border-b border-[#2b251e]/40 pb-1 mx-2">Tincture for Hysteria</h5>
                <p className="font-garamond text-xs leading-tight italic opacity-90 px-1">
                  Calms the frayed nerves of the weary traveler. Restores the essential humors of the blood. Erases dreadful visions of the Unseen. Only available at the apothecary of the Periphery. Beware of cheap imitations!
                </p>
              </div>
            </div>
          </div>

         
          {/* PAMPHLET I: NEW CHARACTER (Turn-of-the-Century Victorian Style) */}
          <div 
            onClick={handleNewInvestigator}
            className="pamphlet w-[210px] h-[390px] rotate-[-2deg] bottom-[40px] left-[40px] hover:-translate-y-3 hover:-translate-x-2 hover:rotate-[-3deg] z-30 p-2"
          >
            {/* Ornate Inner Border */}
            <div className="w-full h-full border-[3px] border-double border-[#3a3228]/80 p-3 flex flex-col items-center text-[#ddd7cf] bg-[rgb(95,114,103)]">
              
              <div className="w-full text-center border-b border-[#3a3228]/40 pb-2 mb-3">
                <span className="font-mono-data text-[8px] font-bold uppercase tracking-[0.3em] opacity-80">
                  Registry Form
                </span>
                <div className="font-garamond text-xs italic tracking-wider opacity-90 mt-1">
                  No. CO-102
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center items-center text-center px-1">
                <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-1 text-[rgb(212,208,202)]">
                  Blank
                </h3>
                <h3 className="font-playfair font-black text-2xl uppercase tracking-widest leading-none mb-4 text-[rgb(212,208,202)]">
                  Intake
                </h3>
                
                {/* Vintage Divider */}
                <div className="flex items-center gap-1 my-2 opacity-70">
                  <div className="w-6 h-[1px] bg-[#3a3228]" />
                  <div className="w-1.5 h-1.5 rounded-full border border-[#3a3228]" />
                  <div className="w-6 h-[1px] bg-[#3a3228]" />
                </div>

                <p className="font-garamond text-xs leading-relaxed italic px-2 mt-4 opacity-90 font-medium">
                  Draft a pristine dossier to register a newly appointed Investigator into the official chapter records.
                </p>
              </div>

              <div className="w-full border-t border-[#3a3228]/40 pt-2 mt-3 text-center">
                 <span className="font-cinzel text-[10px] font-bold tracking-widest">Sign & Date</span>
              </div>
            </div>
          </div>

          {/* PAMPHLET II: GM OPERATIONS (Turn-of-the-Century Victorian Style) */}
          <div 
            onClick={() => handleLightkeeperAccess('fairelands-01')}
            className="pamphlet w-[220px] h-[380px] rotate-[2deg] top-[100px] right-[200px] hover:-translate-y-4 hover:translate-x-4 hover:rotate-[4deg] z-40 p-2 bg-[#dfd6bc]"
          >
            {/* Ornate Inner Border */}
            <div className="w-full h-full border-[3px] border-double border-[#8a2222]/50 p-3 flex flex-col items-center text-[#2b251e] bg-[rgb(186,190,199)]">
              
              <div className="w-full flex justify-between items-start border-b border-[#8a2222]/30 pb-2 mb-4">
                <span className="font-mono-data text-[8px] font-black tracking-widest text-[#8a2222]">TOP SECRET</span>
                <span className="font-mono-data text-[8px] font-bold tracking-[0.2em] opacity-80">LIGHTKEEPER</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <svg className="w-10 h-10 text-[#2b251e] mb-4 opacity-90" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" d="M9 7V5a3 3 0 016 0v2M6 7h12v11a2 2 0 01-2 2H8a2 2 0 01-2-2V7z" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                
                <h3 className="font-cinzel font-black text-[22px] uppercase tracking-[0.15em] text-[#1a1611] border-y-2 border-[#1a1611] py-2 w-full mb-4">
                  Operations
                </h3>

                <p className="font-garamond text-xs leading-relaxed px-3 font-semibold opacity-90">
                  Access campaign parameters, manage chapter standing, and execute local phenomena.
                </p>
              </div>

              <div className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-[#7a1812] shadow-[inset_0_0_12px_rgba(0,0,0,0.8),0_4px_6px_rgba(0,0,0,0.5)] flex items-center justify-center opacity-95">
                <div className="absolute inset-1 rounded-full border border-white/20" />
                <span className="font-cinzel text-[#fdfaf4] text-xs font-black drop-shadow-md">CO</span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* FOREGROUND ATMOSPHERICS */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black pointer-events-none opacity-80 z-50 mix-blend-overlay" />
    </div>
  );
};