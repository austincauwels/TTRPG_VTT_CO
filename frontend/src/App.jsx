// src/App.jsx
import React, { useEffect, useState } from 'react';
import useGameStore from './store/gameStore';
import ScarModal from './components/ScarModal';
import { CharacterCreator } from './components/CharacterCreator';
import * as Gi from "react-icons/gi";

// Art Deco Corner SVG Component for the Website Header
const ArtDecoCorner = ({ position }) => {
  const rotation = {
    'top-left': 'rotate-0',
    'top-right': 'rotate-90',
    'bottom-right': 'rotate-180',
    'bottom-left': '-rotate-90',
  }[position];

  return (
    <div className={`absolute w-16 h-16 ${position.includes('top') ? 'top-0' : 'bottom-0'} ${position.includes('left') ? 'left-0' : 'right-0'} ${rotation}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full fill-none stroke-[#d4af37]/40" strokeWidth="1.5">
        <path d="M 10 0 L 10 10 L 0 10" />
        <path d="M 25 0 L 25 25 L 0 25" />
        <path d="M 40 0 L 40 40 L 0 40" />
        <line x1="0" y1="0" x2="40" y2="40" />
      </svg>
    </div>
  );
};

// Intricate Antique Corner Brackets for Document Sheets
const BrassCornerFiligree = () => (
  <>
    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-black opacity-30" />
    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-black opacity-30" />
    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-black opacity-30" />
    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-black opacity-30" />
  </>
);

// Clean Divider Rule for Parchment Sheet Spacing
const SheetDivider = () => (
  <div className="w-full h-0.5 border-t border-black/20 my-6 border-dashed" />
);

const SafeIcon = ({ name, size = 18, className = "" }) => {
  if (!name || !Gi[name]) return null;
  return React.createElement(Gi[name], { size, className });
};

// Double-Sized Pocket Watch Tension Tracker Component
const PocketWatchClock = ({ title, current, max, colorHex, className = "" }) => {
  const fillPercentage = (current / max) * 100;
  const conicBg = `conic-gradient(${colorHex} ${fillPercentage}%, transparent 0)`;

  return (
    <div className={`flex flex-col items-center select-none transition-transform duration-300 hover:scale-105 ${className}`} title={`${title}: ${current}/${max}`}>
      {/* Pocket Watch Ring Attachment */}
      <div className="flex flex-col items-center -mb-2 z-10">
        <div className="w-6 h-6 rounded-full border-4 border-[#cc9a29] shadow-md" />
        <div className="w-8 h-3 bg-[#cc9a29] border border-black/30 rounded-t-sm -mt-1" />
      </div>
      
      {/* Double-Sized Metallic Gold Casing */}
      <div className="w-28 h-28 rounded-full border-[6px] border-[#cc9a29] bg-[#fcf8ef] relative flex items-center justify-center p-1 shadow-[0_12px_24px_rgba(0,0,0,0.75)]">
        <div className="absolute top-1 left-1 w-12 h-12 bg-white/20 rounded-full blur-[1px] z-10" />
        
        {/* Inside Dial Face */}
        <div 
          className="w-full h-full rounded-full border border-black/20 overflow-hidden relative shadow-inner bg-[#f6ecd2]" 
          style={{ background: conicBg }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#1a1311] rounded-full z-20 shadow" />
        </div>
      </div>
      
      <span className="mt-2.5 block font-mono text-[10px] font-black text-white/50 tracking-widest uppercase text-center">{title}</span>
    </div>
  );
};

function App() {
  const { 
    connect, 
    character, 
    circle, 
    lastRoll, 
    takeMark, 
    setLocalCharacter,
    rollAction,
    updateDrive
  } = useGameStore();
  
  const [isCreating, setIsCreating] = useState(true); 
  const [activeTab, setActiveTab] = useState('character');
  const [scarDescription, setScarDescription] = useState("");
  // --- SIMULATED REAL-TIME CIRCLE PROGRESS STATES ---
  const [stampVotes, setStampVotes] = useState({ 
    GiOuroboros: 0, 
    GiOrbital: 0, 
    GiCompass: 0, 
    GiOilySpiral: 0, 
    GiCabbage: 0, 
    GiFullMoon: 0, 
    GiGoldShell: 0, 
    GiGlowingHands: 0 
  });
  const [gmVote, setGmVote] = useState(null); // Lightkeeper absolute dictation override
  const [circleResourceAvail, setCircleResourceAvail] = useState({ Stitch: 2, Refresh: 1, Train: 1 });
  const [illuminationPips, setIlluminationPips] = useState(3);
  const [questionBallots, setQuestionBallots] = useState([
    [true, false, true, false],  // Question 1 member votes
    [false, true, false, false], // Question 2 member votes
    [true, true, false, false]   // Question 3 member votes
  ]);

  // Compute active rubber stamp icon based on majority pool tally or GM dictate
  let activeInsignia = "GiCandleLight"; // Baseline default placeholder
  if (gmVote) {
    activeInsignia = gmVote;
  } else {
    let maxVotes = 0;
    Object.entries(stampVotes).forEach(([icon, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        activeInsignia = icon;
      }
    });
  }

  if (isCreating || !character) {
    return (
      <div className="min-h-screen bg-[#110a08] py-8 font-serif">
        <header className="max-w-6xl mx-auto mb-6 text-center">
          <h1 className="text-5xl mb-2 font-serif font-black tracking-tight text-[#fdfaf4]">CANDELA OBSCURA</h1>
          <p className="text-sm font-sans font-black tracking-widest text-[#a82222] uppercase">Virtual Tabletop Staging Archive</p>
        </header>
        
        <CharacterCreator 
          onSubmit={async (characterData) => {
            try {
              const payload = {
                name: characterData.name || "Unknown Investigator",
                pronouns: characterData.pronouns || "Unlisted",
                style: characterData.style || "",
                catalyst: characterData.catalyst || "",
                question: characterData.question || "",
                role_ability: characterData.roleAbility || "None",
                specialty_ability: characterData.specialtyAbility || "None",
                gear: characterData.gear || [],
                
                // Map the frontend data to the snake_case backend property
                profile_pic: characterData.profilePic || null 
              };

              const response = await fetch('/api/investigators/forge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              if (!response.ok) {
                console.error("Database Forge Failed:", await response.text());
                return;
              }

              const savedCharacter = await response.json();
              setLocalCharacter(savedCharacter);
              setIsCreating(false); 
              connect(savedCharacter.id);

            } catch (err) {
              console.error("Network Error during Forge:", err);
            }
          }} 
        />
      </div>
    );
  }

  const handleSpendDrive = (pool) => {
    const currentDrive = character[`${pool}_current`] || 0;
    if (currentDrive > 0) {
      updateDrive(pool, currentDrive - 1);
    }
  };

  const domainCategories = [
    {
      name: 'Nerve',
      driveKey: 'nerve',
      actions: [
        { key: 'move', label: 'Move' },
        { key: 'strike', label: 'Strike' },
        { key: 'control', label: 'Control' }
      ]
    },
    {
      name: 'Cunning',
      driveKey: 'cunning',
      actions: [
        { key: 'hide', label: 'Hide' },
        { key: 'sneak', label: 'Sneak' },
        { key: 'sway', label: 'Sway' }
      ]
    },
    {
      name: 'Intuition',
      driveKey: 'intuition',
      actions: [
        { key: 'survey', label: 'Survey' },
        { key: 'read', label: 'Read' },
        { key: 'sense', label: 'Sense' }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#160e0b] text-[#fdfaf4] font-serif selection:bg-[#721c15] selection:text-white antialiased bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12">
      
      {/* =========================================================================
          CANDELA OBSCURA WEBSITE HEADER
          ========================================================================= */}
      <header className="w-full bg-[#090504] relative py-6 flex flex-col items-center justify-center border-b border-black/40 shadow-xl">
        <ArtDecoCorner position="top-left" />
        <ArtDecoCorner position="top-right" />
        
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-[0.15em] text-white uppercase drop-shadow-md">
          CANDELA OBSCURA
        </h1>
        <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#a82222] uppercase mt-1.5">
          Virtual Tabletop Staging Archive
        </h2>
        
        <div className="flex items-center gap-4 mt-3 w-56">
          <div className="h-[1px] flex-1 bg-[#d4af37]/40" />
          <div className="text-[#d4af37]/70 relative flex items-center justify-center">
             <SafeIcon name="GiCompass" size={18} className="relative z-10" />
          </div>
          <div className="h-[1px] flex-1 bg-[#d4af37]/40" />
        </div>
      </header>

      {/* =========================================================================
          STAMPED REGISTRY SLIP NAVIGATION TOOLBAR (WITH OVERSIZED WAX SEAL)
          ========================================================================= */}
      <div className="max-w-[1500px] mx-auto mt-6 px-4 relative z-30">
        
        {/* Upscaled 1.5x Crimson 3D Wax Seal Overlapping Left Section to Affix Card to Background */}
        <div className="absolute -left-3 sm:left-2 top-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br from-[#9c1c1c] via-[#7d1414] to-[#4a0808] rounded-[48%] shadow-[4px_10px_20px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center border border-[#5c0f0f] transform rotate-12 z-40 select-none cursor-help group" title="Official Seal of the Order">
          <div className="w-20 h-20 rounded-full border border-dashed border-black/20 flex items-center justify-center p-0.5 shadow-inner">
            {/* Deep Red Embossed Inset Candle Design */}
            <div className="text-[#641010] drop-shadow-[0_1.5px_1px_rgba(255,255,255,0.1)] shadow-inner transform -translate-y-[1px]">
              <SafeIcon name="GiCandleHolder" size={62} />
            </div>
          </div>
          <div className="absolute -bottom-1.5 -left-1 w-8 h-6 bg-[#7d1414] rounded-full blur-[0.5px] opacity-50 -z-10" />
          <div className="absolute -top-1.5 -right-1 w-6 h-8 bg-[#7d1414] rounded-full blur-[0.5px] opacity-50 -z-10" />
        </div>

        <div className="w-full bg-[#ebdcb9] border-4 border-double border-black p-5 relative shadow-[0_12px_30px_rgba(0,0,0,0.9)] flex flex-col md:flex-row justify-between items-center gap-4 text-black pl-32 pr-6 rounded-sm overflow-hidden">
          
          {/* Restored Massive Background Watermark Header */}
          <div className="absolute top-2 left-6 text-4xl font-mono font-black text-[#1a1311] opacity-5 tracking-tighter transform -rotate-2 select-none pointer-events-none">
            REGISTRY FILE // NO. 00843-CO
          </div>

          {/* Left Side: Restored Member Card Details Typography */}
          <div className="flex items-center gap-3 relative z-10">
            <div>
              <span className="block font-sans text-[10px] font-black tracking-widest uppercase text-gray-600 leading-none">Candela Obscura Member ID</span>
              <span className="block font-mono text-sm font-bold tracking-tight text-black mt-1.5">
                {character.id ? `ASSIGNED RECORD MATRIX: SEC #${character.id}` : "RANDOM ASSIGNMENT INDEX"}
              </span>
            </div>
          </div>

          {/* Right Side: Scooted Navigation Tab Folders */}
          <div className="flex gap-2 font-sans text-[11px] font-black uppercase tracking-wider relative z-10">
            {['character', 'circle', 'archives'].map((tabName) => {
              const labels = {
                character: "Investigator Dossier",
                circle: "Circle Progress Report",
                archives: "Archive"
              };
              const isActive = activeTab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
                  className={`px-4 py-1.5 rounded transition-all duration-150 ${
                    isActive 
                      ? 'bg-black text-[#ebdcb9] shadow-md border border-black' 
                      : 'bg-transparent text-black/60 hover:bg-black/5 hover:text-black'
                  }`}
                >
                  {labels[tabName]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

     {/* =========================================================================
          DYNAMIC ENVIRONMENT ENVIRONMENT (THREE-PANEL GRID VS. WIDE OPEN NOTEBOOK)
          ========================================================================= */}
      <main className="max-w-[1500px] mx-auto p-4 mt-2">
        {activeTab === 'archives' ? (
          /* =========================================================================
              FULL-PAGE TWO-PAGE SPREAD OPEN NOTEBOOK ARCHIVE ARCHITECTURE
             ========================================================================= */
          <div className="bg-[#2a1a13] p-4 sm:p-6 rounded-sm shadow-[0_25px_55px_rgba(0,0,0,0.95)] border-[14px] border-[#1c110c] relative min-h-[850px] animate-fadeIn bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
            
            {/* Inside Double Page Grid Layout Layout */}
            <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 bg-[#fdfaf2] text-black relative shadow-inner border border-black/30 overflow-hidden min-h-[800px] rounded-sm">
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
              
              {/* --- LEFT PAGE: BUREAU REGISTRY INDEX MATRIX --- */}
              <div className="p-8 lg:pr-12 relative flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-black/20">
                <div className="absolute top-3 left-3 font-mono text-[7px] text-black/30 tracking-widest uppercase">Section I // Dossier Index Slip</div>
                
                <div>
                  <header className="border-b-2 border-black/80 pb-4 mb-6">
                    <h2 className="text-3xl font-serif font-black tracking-tight text-black uppercase">Collective Campaign Archive</h2>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#721c15] font-black mt-1">Classified Phenomenon Investigation Manifest</p>
                  </header>

                  {/* Dynamic Interactive Case Logs */}
                  <div className="space-y-4">
                    <span className="block font-sans text-[9px] font-black text-black/40 uppercase tracking-widest border-b border-black/5 pb-1">Unresolved Investigation Files</span>
                    
                    {[
                      { id: "CASE-001", title: "The Redfield Library Leak", status: "CONTAINED", date: "MAR 2026" },
                      { id: "CASE-002", title: "The Bridged Bleed Anomaly", status: "ACTIVE INQUIRY", date: "APR 2026" },
                      { id: "CASE-003", title: "Autopsy Vector Tissue Degradation", status: "REDACTED", date: "MAY 2026" }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-black/[0.02] border border-black/10 p-3 rounded-sm flex items-center justify-between shadow-sm transition-all hover:bg-black/[0.04] cursor-pointer">
                        <div className="font-mono">
                          <span className="text-[9px] text-[#721c15] font-black tracking-tighter block">{item.id}</span>
                          <span className="text-sm font-serif font-bold text-black/90">{item.title}</span>
                        </div>
                        <div className="text-right font-mono text-[9px]">
                          <span className={`inline-block px-1.5 py-0.5 rounded-sm font-black text-white ${item.status === 'CONTAINED' ? 'bg-emerald-800' : item.status === 'REDACTED' ? 'bg-gray-800' : 'bg-[#721c15]'}`}>{item.status}</span>
                          <span className="block text-black/40 mt-1 font-bold">{item.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Page Branding Footer */}
                <div className="mt-8 pt-4 border-t border-black/10 flex justify-between items-center font-mono text-[9px] text-black/40">
                  <span>© ORDER MATRIX RECORD ARCHIVE</span>
                  <span className="font-bold">PAGE 142</span>
                </div>
              </div>

              {/* --- NOTEBOOK REINFORCED SPINE SHADOW GUTTER SEPARATION --- */}
              <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/15 via-black/35 to-black/15 pointer-events-none border-l border-r border-black/5 z-20" />

              {/* --- RIGHT PAGE: REDACTED intelligence INTEL FIELD RECORDS --- */}
              <div className="p-8 lg:pl-12 relative flex flex-col justify-between bg-[#faf5e8]">
                <div className="absolute top-3 right-3 font-mono text-[7px] text-black/30 tracking-widest uppercase">Section II // Field Operations Matrix</div>

                <div>
                  <header className="border-b-2 border-black/80 pb-4 mb-6 flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-serif font-black tracking-tight text-black uppercase">Active Operation Field Notes</h3>
                      <p className="text-[9px] font-mono uppercase tracking-wider text-black/40 mt-0.5">Subject Mutation & Extraction Matrix Logs</p>
                    </div>
                    <span className="font-mono text-xs bg-black text-[#faf5e8] px-2 py-0.5 font-bold rounded-sm tracking-tighter">SECURED INDEX</span>
                  </header>

                  <div className="space-y-4">
                    {/* Lined Paper Transcription Sheet Area */}
                    <div className="border border-black/10 p-4 bg-white/40 shadow-inner rounded-sm relative">
                      <div className="absolute top-2 right-2 text-black/10 pointer-events-none"><SafeIcon name="GiPaperClip" size={20} /></div>
                      
                      <p className="font-serif text-sm leading-relaxed text-black/80 mb-3 italic">
                        "Anomalous contamination traces discovered during investigation routines must be cataloged immediately. Physical contact vectors carry extreme cell degradation risks unless treated through targeted Stitch procedures before secondary permanent trauma structures harden into place permanently..."
                      </p>
                      
                      <div className="space-y-2 pt-3 border-t border-dashed border-black/20 font-mono text-[11px] text-black/70">
                        <p><span className="font-black text-[#721c15] mr-1">[!] FIELD ALERT:</span> Faction parameters identified outside normal operational thresholds.</p>
                        <p><span className="font-black text-black mr-1">[✓] EXTRACTION:</span> Artifact retrieval verified through deep sub-vault network extraction channels.</p>
                      </div>
                    </div>

                    {/* Threat Anomaly Analysis Box Matrix */}
                    <div className="bg-[#721c15]/5 border border-[#721c15]/20 p-3.5 rounded-sm">
                      <span className="block font-mono text-[9px] font-black text-[#721c15] uppercase tracking-widest mb-2 border-b border-[#721c15]/10 pb-1">Toxicity Bleed Parameter Warnings</span>
                      <p className="font-serif text-xs leading-normal text-black/70">
                        Active structural anomalies maintain a constant radiation emission rhythm. Operative units deployed in nearby perimeters are instructed to cycle active protection relays to minimize long-term psychological scarring.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Page Branding Footer */}
                <div className="mt-8 pt-4 border-t border-black/10 flex justify-between items-center font-mono text-[9px] text-black/40">
                  <span className="font-bold">CLASSIFIED OUTPOST REGISTER</span>
                  <span className="font-bold">PAGE 143</span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* =========================================================================
              STANDARD THREE COLUMN DESK MAT ENVIRONMENT (INVESTIGATOR & CIRCLE VIEWS)
             ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* =========================================================================
                COLUMN 1: TACTILE OFFICE ARTIFACTS SIDEBAR
                ========================================================================= */}
            <div className="lg:col-span-3 space-y-6 mt-2">
              
              {/* Weathered Library Index Checkout Card */}
              <div className="bg-[#fcfaf2] text-[#1a1311] border border-[#d2c9b9] p-5 shadow-[5px_8_20px_rgba(0,0,0,0.65)] relative transform -rotate-1 hover:rotate-0 transition-transform duration-200"
                   style={{
                     backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(43, 108, 176, 0.12) 24px)',
                     backgroundSize: '100% 24px',
                     lineHeight: '24px'
                   }}>
                <div className="absolute top-0 bottom-0 left-6 w-[1.5px] bg-red-700/20 pointer-events-none" />
                
                <div className="pl-6 pt-1 relative z-10 text-xs">
                  <span className="block font-mono text-[9px] uppercase tracking-widest text-[#1a1311]/50 font-black leading-none mb-1.5">Circle Maintenance Card</span>
                  <div className="space-y-1.5 font-bold font-serif">
                    <p className="text-sm font-black border-b border-black/10 pb-0.5 leading-tight"><span className="font-sans text-[10px] uppercase font-black text-black/40 mr-1">TARGET:</span> The Red Tide</p>
                    <p className="text-xs leading-tight"><span className="font-sans text-[10px] uppercase font-black text-black/40 mr-1">SANCTUM:</span> Redfield Library</p>
                  </div>

                  <div className="mt-4 border-t border-black/20 border-dashed pt-2.5">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-black/60 font-black block mb-1">Illumination Track Pips</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-2.5 h-2.5 rounded-full border border-black shadow-inner transition-colors ${
                            i < 3 ? 'bg-black' : 'bg-transparent'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Typewriter Torn Scrap Name Labels */}
              <div className="space-y-2.5 px-1">
                <span className="block font-sans text-[9px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Active Circle Registry</span>
                
                <div className="bg-[#f2ebd9] border border-black/10 px-3 py-2.5 shadow-md transform rotate-1 relative select-none">
                  <div className="absolute top-0.5 right-1 text-black/20 pointer-events-none"><SafeIcon name="GiPaperClip" size={12} /></div>
                  <p className="font-mono font-black text-xs text-black truncate">{character.name}</p>
                  <p className="font-mono text-[9px] text-[#721c15] uppercase tracking-tighter mt-0.5">{character.style || 'Agent Identity'}</p>
                  <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-sm" />
                </div>

                <div className="bg-[#ece5d0] border border-black/10 px-3 py-2.5 shadow-md transform -rotate-1 relative select-none opacity-85">
                  <div className="absolute top-0.5 right-1 text-black/20 pointer-events-none"><SafeIcon name="GiPaperClip" size={12} /></div>
                  <p className="font-mono font-bold text-xs text-black/80 truncate">Arthur Vance</p>
                  <p className="font-mono text-[9px] text-black/50 uppercase tracking-tighter mt-0.5">Scholar - Doctor</p>
                </div>
              </div>

              {/* Double-Sized Pocket Watches Countdown Area */}
              <div className="pt-4 pb-2 px-1 flex flex-row gap-4 justify-center items-center relative z-20">
                <PocketWatchClock title="Guard Patrol" current={3} max={4} colorHex="#d97706" className="transform rotate-6 translate-y-1" />
                <PocketWatchClock title="Miasma Bleed" current={1} max={6} colorHex="#b91c1c" className="transform -rotate-12 -translate-y-2" />
              </div>

            </div>

            {/* =========================================================================
                COLUMN 2: REGULATION GOVERNMENT DESK PARCHMENT WORKSPACE SHEET
                ========================================================================= */}
            <div className="lg:col-span-6">
              <div className="bg-[#fbf6eb] text-black px-8 pt-8 pb-8 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] min-h-[850px] border-2 border-black relative font-serif overflow-hidden">
                <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
                <BrassCornerFiligree />

                <div className="absolute bottom-24 right-12 font-sans font-black text-7xl uppercase text-black/[0.02] tracking-widest select-none pointer-events-none transform -rotate-12">
                  OFFICIAL FORM
                </div>

                {/* DOSSIER INVESTIGATOR CONTENT LAYOUT */}
                {activeTab === 'character' && (
                  <div className="relative z-10 animate-fadeIn space-y-6">
                    
                    <div className="absolute top-0 right-0 w-44 h-[220px] bg-[#fefcf7] p-2 border border-black/10 shadow-[4px_10px_24px_rgba(0,0,0,0.5)] transform rotate-2 hover:rotate-0 hover:scale-105 duration-200 transition-all z-30 group">
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#d2b48c]/70 -rotate-3 border border-black/5 mix-blend-multiply shadow-sm" />
                      
                      <div className="w-full h-full bg-black/5 border border-black/5 flex flex-col items-center justify-center overflow-hidden text-center">
                        {character.profilePic || character.profile_pic ? (
                          <img src={character.profilePic || character.profile_pic} className="w-full h-full object-cover grayscale contrast-125 sepia-[0.25]" alt="Subject Manifest Photo" />
                        ) : (
                          <div className="opacity-25 p-1">
                            <SafeIcon name="GiPerson" size={44} className="mx-auto" />
                            <span className="block text-[8px] font-mono font-black uppercase mt-1 tracking-tight">AFFIX PORTRAIT</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 w-2/3 pb-2 font-mono">
                      <div className="col-span-2">
                        <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ INVESTIGATOR APPELLATION RECORD ]</span>
                        <div className="text-xl font-serif font-black border-b border-black pb-0.5 text-black uppercase mt-1 truncate">{character.name}</div>
                      </div>
                      <div>
                        <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ NOMENCLATURE PRONOUNS ]</span>
                        <div className="text-sm font-bold italic border-b border-black pb-1 text-black/70 mt-1.5 truncate">{character.pronouns || 'UNLISTED'}</div>
                      </div>
                    </div>

                    <div className="w-full pr-48 pt-1 font-mono text-xs text-black/90 rounded-sm relative p-3 border border-black/10 bg-black/[0.01]"
                         style={{ 
                           backgroundImage: 'repeating-linear-gradient(transparent, transparent 21px, rgba(0, 0, 0, 0.06) 22px)', 
                           backgroundSize: '100% 22px', 
                           lineHeight: '22px' 
                         }}>
                      <div className="whitespace-normal break-words">
                        <span className="font-sans text-[8px] font-black uppercase tracking-widest text-[#721c15] block leading-none mb-0.5">I. Guild Core Specialty Trait Asset Matrix</span>
                        <p className="pl-2 pb-1 text-black/85 leading-normal"><span className="font-bold uppercase text-black">{character.role_ability || "Ability"}:</span> {character.role_ability === "I Know a Guy" ? "Once per assignment, you can produce a contact who possesses specialized knowledge or resources." : "Grants administrative access to custom faction connection profiles or resource mapping paths."}</p>
                      </div>
                      <div className="mt-2 whitespace-normal break-words">
                        <span className="font-sans text-[8px] font-black uppercase tracking-widest text-[#721c15] block leading-none mb-0.5">II. Vocational Specialization Mastery Parameter</span>
                        <p className="pl-2 pb-1 text-black/85 leading-normal"><span className="font-bold uppercase text-black">{character.specialty_ability || "Specialty"}:</span> {character.specialty_ability === "Insider Access" ? "Your line of work offers you special privileges. Once per assignment, automatically gain clearance." : "Overrides local validation limitations once per active operation scene phase."}</p>
                      </div>
                    </div>

                    <SheetDivider />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/[0.02] border border-black/10 p-3 rounded-sm shadow-inner">
                      {domainCategories.map((cat) => {
                        const currentDrive = character[`${cat.driveKey}_current`] || 0;
                        const maxDrive = character[`${cat.driveKey}_max`] || 1;

                        return (
                          <div key={cat.name} className="bg-white/40 border border-black/20 p-2.5 rounded-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center border-b border-black/10 pb-1.5 mb-2">
                              <span className="font-serif font-black text-xs uppercase tracking-wide text-black">{cat.name}</span>
                              <div 
                                onClick={() => handleSpendDrive(cat.driveKey)}
                                className="flex items-center gap-1 cursor-pointer select-none group"
                                title={`Click to burn 1 point of ${cat.name} Drive`}
                              >
                                <div className="flex gap-0.5">
                                  {Array.from({ length: maxDrive }).map((_, i) => (
                                    <div 
                                      key={i} 
                                      className={`w-2.5 h-2.5 border border-black transform rotate-45 transition-colors shadow-sm ${
                                        i < currentDrive ? 'bg-black' : 'bg-transparent'
                                      }`} 
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              {cat.actions.map((act) => {
                                const actionValue = character[act.key] || 0;
                                const isGilded = character[`gilded_${act.key}`] === true || character[`gilded_${act.key}`] === 1 || character[`gilded_${act.key}`] === "true";

                                return (
                                  <div key={act.key} className="flex justify-between items-center text-xs py-0.5">
                                    <button 
                                      onClick={() => rollAction(act.key, 0)}
                                      className="font-mono text-[10px] font-bold uppercase hover:text-red-800 transition-colors tracking-tight flex items-center gap-1"
                                    >
                                      {isGilded && <div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />}
                                      {act.label}
                                    </button>
                                    <div className="flex gap-0.5">
                                      {Array.from({ length: 3 }).map((_, i) => (
                                        <div 
                                          key={i} 
                                          className={`w-2 h-2 rounded-full border border-black ${
                                            i < actionValue ? 'bg-[#721c15]' : 'bg-transparent'
                                          }`} 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <SheetDivider />

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                      <div className="md:col-span-5 bg-black/[0.02] border-2 border-black p-4 rounded-sm flex flex-col justify-between shadow-inner">
                        <div>
                          <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-3 flex items-center gap-1.5">
                            <SafeIcon name="GiBleedingEye" size={14} className="text-[#721c15]" /> Vital Damage Tracks
                          </h3>
                          
                          <div className="space-y-3">
                            {['body', 'brain', 'bleed'].map((type) => (
                              <div key={type} className="flex justify-between items-center text-xs">
                                <button 
                                  onClick={() => takeMark(type)} 
                                  className="font-sans font-black uppercase tracking-widest text-[10px] text-black hover:text-red-800 transition-colors border-b border-dashed border-transparent hover:border-red-800"
                                >
                                  {type} [+]
                                </button>
                                <div className="flex gap-1.5">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <div 
                                      key={i} 
                                      className={`w-3.5 h-5 border-2 border-black shadow-inner rounded-sm transition-all ${
                                        character && i < character[`${type}_marks`] 
                                          ? 'bg-black transform rotate-3 scale-105' 
                                          : 'bg-transparent'
                                      }`} 
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-2 border-t border-black/10 text-[9px] font-mono text-black/50 flex justify-between uppercase">
                          <span>Trauma Status:</span>
                          <span className="font-bold text-black">{character?.incapacitated ? "INCAPACITATED" : "OPERATIONAL"}</span>
                        </div>
                      </div>

                      <div className="md:col-span-7 bg-[#fcf9f2] border-2 border-dashed border-black/60 p-4 rounded-sm relative shadow-sm flex flex-col justify-between overflow-hidden">
                        <div className="absolute top-1 right-2 font-mono text-[7px] text-black/30 tracking-tight">AUTOPSY_REF_DEGRADATION_772</div>
                        <div>
                          <div className="flex justify-between items-center border-b border-black/40 pb-1 mb-2">
                            <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                              <SafeIcon name="GiQuillInk" size={12} /> Post-Mortem Trauma Ledger
                            </h3>
                            <span className="font-mono text-[9px] font-bold bg-black text-white px-1.5 py-0.5 rounded-sm">
                              SCARS: {character?.scars_count || 0} / 4
                            </span>
                          </div>
                        </div>

                        <textarea 
                          rows={4}
                          value={scarDescription}
                          onChange={(e) => setScarDescription(e.target.value)}
                          placeholder="[ CAPTURE PHYSICAL OR PSYCHOLOGICAL CELL MUTATION DISSECTION DATA HERE... ]"
                          className="w-full flex-1 bg-transparent border-none rounded-none p-0 text-xs font-mono leading-relaxed text-black/90 resize-none focus:outline-none focus:ring-0 shadow-none placeholder-black/30"
                          style={{ 
                            backgroundImage: 'repeating-linear-gradient(transparent, transparent 19px, rgba(0, 0, 0, 0.08) 20px)', 
                            backgroundSize: '100% 20px', 
                            lineHeight: '20px' 
                          }}
                        />
                      </div>
                    </div>

                  </div>
                )}

                {/* PROGRESS REPORT SLIP CONTENT LAYOUT */}
                {activeTab === 'circle' && (
                  <div className="relative z-10 animate-sheetDrop space-y-6 text-black">
                    
                    {/* Top Nomenclature Layout Panel */}
                    <div className="border-b-2 border-black/80 pb-5 flex flex-col lg:flex-row justify-between items-start gap-6">
                      <div className="flex-1 space-y-4 w-full">
                        <div className="flex flex-col space-y-3 font-mono">
                          <div>
                            <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ CIRCLE DESIGNATION REGISTRY ]</span>
                            <div className="text-xl font-serif font-black text-black uppercase mt-1.5 truncate border-b border-black/20 pb-0.5">{circle?.name || "The Order of Light"}</div>
                          </div>
                          <div>
                            <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ REGIONAL HOUSE COORDS ]</span>
                            <div className="text-xs font-mono font-bold text-[#721c15] mt-1.5 uppercase tracking-widest bg-black/[0.03] p-1.5 border border-black/5 rounded-sm inline-block">
                              Redfield Library Vaults
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Single Blank Ballot Insignia Rubber Stamp Component */}
                      <div className="w-full lg:w-[310px] shrink-0 bg-[#f1e6cc] border-2 border-dashed border-black/40 p-3 shadow-inner relative transform rotate-1 rounded-sm">
                        <span className="block font-sans text-[8px] font-black uppercase tracking-widest text-[#721c15] mb-2 border-b border-black/20 pb-1">
                          [ SYSTEM INSIGNIA BALLOT ]
                        </span>
                        
                        <div className="flex items-center gap-4 bg-white/40 border border-black/10 p-2 rounded-sm shadow-sm">
                          <div className="w-16 h-16 rounded-full border-2 border-black/70 flex flex-col items-center justify-center bg-[#ebdcb9]/40 relative shrink-0 shadow-inner mix-blend-multiply transform -rotate-6">
                            <div className="absolute inset-0 rounded-full border border-black/20 m-0.5 border-dashed" />
                            <SafeIcon name={activeInsignia} size={32} className="text-black/85 drop-shadow-sm opacity-95" />
                          </div>

                          <div className="flex-1 font-mono text-[9px] space-y-1">
                            <span className="text-black/40 uppercase block text-[8px] tracking-tighter">Cast Insignia Vote:</span>
                            <select 
                              className="w-full bg-[#ebdcb9]/20 border border-black/30 rounded px-1 py-0.5 font-bold focus:outline-none focus:ring-0 text-xs text-black"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  setStampVotes(prev => ({ ...prev, [val]: prev[val] + 1 }));
                                }
                              }}
                              defaultValue=""
                            >
                              <option value="" disabled>Select Vector...</option>
                              <option value="GiOuroboros">Ouroboros ({stampVotes.GiOuroboros}v)</option>
                              <option value="GiOrbital">Orbital Ring ({stampVotes.GiOrbital}v)</option>
                              <option value="GiCompass">Compass ({stampVotes.GiCompass}v)</option>
                              <option value="GiOilySpiral">Oily Spiral ({stampVotes.GiOilySpiral}v)</option>
                              <option value="GiCabbage">Alchemical Cabbage ({stampVotes.GiCabbage}v)</option>
                              <option value="GiFullMoon">Full Moon ({stampVotes.GiFullMoon}v)</option>
                              <option value="GiGoldShell">Gilded Shell ({stampVotes.GiGoldShell}v)</option>
                              <option value="GiGlowingHands">Radiant Hands ({stampVotes.GiGlowingHands}v)</option>
                            </select>
                            
                            <div className="pt-1 flex items-center gap-1.5 border-t border-black/10 mt-1">
                              <input 
                                type="checkbox" 
                                id="gmOverride" 
                                className="w-2.5 h-2.5 text-[#721c15] focus:ring-0 rounded-sm bg-transparent border-black/40 cursor-pointer"
                                onChange={(e) => setGmVote(e.target.checked ? "GiOuroboros" : null)} 
                              />
                              <label htmlFor="gmOverride" className="text-[#721c15] font-black text-[8px] cursor-pointer uppercase tracking-tight">GM Force Override (Ouroboros)</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Core Document Row Content Elements */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
                      <div className="md:col-span-7 space-y-6">
                        <div>
                          <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-3 flex items-center gap-1.5">
                            <SafeIcon name="GiCandleLight" size={14} className="text-[#d4af37]" /> Illumination Registry
                          </h3>
                          <div className="flex gap-2.5 flex-wrap mb-4 px-2">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const isFilled = i < illuminationPips;
                              const isMilestone = (i + 1) % 3 === 0;
                              return (
                                <div 
                                  key={i} 
                                  onClick={() => setIlluminationPips(i + 1)}
                                  className={`w-5 h-5 rounded-full border border-black flex items-center justify-center shadow-inner cursor-pointer transition-all ${
                                    isFilled ? 'bg-black text-white' : 'bg-transparent'
                                  } ${isMilestone ? 'ring-2 ring-offset-2 ring-black/80' : ''}`}
                                >
                                  {isMilestone && <div className={`w-1.5 h-1.5 bg-[#d4af37] rounded-full ${isFilled ? 'opacity-100' : 'opacity-40'}`} />}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Question Ballots Slip Tracker - Bureau Index Card Style */}
                        <div className="bg-[#fefcf5] border border-[#d6cbbe] p-5 shadow-md rounded-sm relative transform -rotate-[0.5deg] border-t-4 border-t-[#721c15]/70">
                          <div className="absolute top-1.5 right-2 font-mono text-[7px] text-black/30 uppercase tracking-wider">Form No. 84-Illum</div>
                          <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-[#721c15] mb-4 flex items-center gap-1.5 border-b border-black/10 pb-1">
                            <SafeIcon name="GiQuillInk" size={12} /> Illumination Questions & Keys Ballot
                          </h3>
                          <div className="space-y-4">
                            {[
                              "Did you contain or destroy a source of bleed?",
                              "Did you provide comfort or support for those affected by a phenomena?",
                              "Did you bring something of importance back for Candela Obscura to protect or study?"
                            ].map((question, qIdx) => (
                              <div key={qIdx} className="border-b border-black/5 pb-3.5 last:border-0 last:pb-0">
                                <p className="font-serif text-sm leading-tight text-black/90 mb-2.5 italic">"{question}"</p>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono text-[8px] text-black/40 uppercase tracking-tighter">Member Ballots:</span>
                                  <div className="flex gap-1.5">
                                    {questionBallots[qIdx].map((voted, pIdx) => (
                                      <button 
                                        key={pIdx} 
                                        onClick={() => {
                                          const updated = [...questionBallots];
                                          updated[qIdx][pIdx] = !updated[qIdx][pIdx];
                                          setQuestionBallots(updated);
                                        }}
                                        className={`w-5 h-5 border border-black/60 flex items-center justify-center font-mono text-[10px] font-bold transition-all relative rounded-sm ${
                                          voted ? 'bg-[#721c15] text-[#fefcf5] border-[#721c15] scale-105 shadow-sm' : 'bg-transparent text-black/30 hover:bg-black/5'
                                        }`}
                                      >
                                        {voted ? '✕' : pIdx + 1}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Frame Window Area: Circle Logistical Assets */}
                      <div className="md:col-span-5 space-y-4">
                        <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-3 flex items-center gap-1.5">
                          <SafeIcon name="GiScroll" size={14} className="text-[#721c15]" /> Circle Logistical Assets
                        </h3>
                        <div className="space-y-3 bg-black/[0.02] border border-black/10 p-3 rounded-sm shadow-inner">
                          {['Stitch', 'Refresh', 'Train'].map((res) => {
                            const current = circleResourceAvail[res] || 0;
                            return (
                              <div key={res} className="bg-white/40 border border-black/20 p-2.5 rounded-sm flex flex-col justify-between shadow-sm">
                                <div className="flex justify-between items-center border-b border-black/10 pb-1.5 mb-2">
                                  <span className="font-serif font-black text-xs uppercase tracking-wide text-black">{res}</span>
                                </div>
                                <div className="space-y-1.5 font-mono text-[10px]">
                                  <div className="flex justify-between items-center py-0.5">
                                    <span className="text-black/50 uppercase font-bold tracking-tight">Available</span>
                                    <div className="flex gap-1">
                                      {Array.from({ length: 6 }).map((_, i) => (
                                        <div 
                                          key={i} 
                                          onClick={() => setCircleResourceAvail(prev => ({ ...prev, [res]: i + 1 }))}
                                          className={`w-2.5 h-2.5 rounded-sm border border-black cursor-pointer transition-all ${
                                            i < current ? 'bg-[#721c15]' : 'bg-transparent hover:bg-[#721c15]/10'
                                          }`} 
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5">
                                    <span className="text-black/40 uppercase font-bold tracking-tight">Max Cap</span>
                                    <div className="flex gap-1">
                                      {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="w-2.5 h-2.5 rounded-sm border border-black bg-transparent border-dashed border-black/40 opacity-70" />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <SheetDivider />

                    <div className="bg-[#fcf9f2] border-2 border-dashed border-black/60 p-4 rounded-sm relative shadow-sm overflow-hidden">
                      <div className="absolute top-1 right-2 font-mono text-[7px] text-black/30 tracking-tight">FORM_ADV_AUTH_001</div>
                      <div className="flex justify-between items-center border-b border-black/40 pb-1 mb-2">
                        <h3 className="font-sans text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                          <SafeIcon name="GiBriefcase" size={12} /> Circle Abilities & Advancement Vault
                        </h3>
                      </div>
                      <div className="mb-4">
                        <span className="font-sans text-[8px] font-black uppercase tracking-widest text-[#721c15] block leading-none mb-1.5">Active Circle Asset Profile</span>
                        <p className="font-serif text-sm leading-relaxed text-black/90">
                          <span className="font-bold uppercase">Stamina Training:</span> Your circle has three gilded dice at the beginning of every assignment that anyone may add as +1d to any roll. Once a die has been rolled, it is expended.
                        </p>
                      </div>
                      <div className="bg-[#721c15]/10 border border-[#721c15]/30 p-4 rounded-sm relative">
                        <span className="font-mono text-[10px] font-black text-[#721c15] uppercase tracking-[0.2em] block mb-3 border-b border-[#721c15]/20 pb-1">ADVANCEMENT SELECTION AVAILABLE // POLL SYSTEM</span>
                        <div className="space-y-2.5">
                          {[
                            "Nobody Left Behind: +1d to protect incapacitated members.",
                            "In This Together: Earn 1 drive when helping on a result of 3 or less.",
                            "One Last Run: Next assignment is your last. Take all 4 advancement options."
                          ].map((opt, i) => (
                            <div key={i} className="flex items-center gap-3 cursor-pointer group">
                              <input type="radio" name="advancement_vote" className="w-3.5 h-3.5 text-[#721c15] focus:ring-[#721c15] border-black/40 bg-transparent cursor-pointer" />
                              <span className="font-serif text-sm text-black/80 group-hover:text-black transition-colors">{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            </div>

            {/* =========================================================================
                COLUMN 3: MAHOGANY DICE TRADING VAULT HUD
                ========================================================================= */}
            <div className="lg:col-span-3 space-y-6 mt-2">
              <div className="bg-[#12241b] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.95),inset_0_10px_20px_rgba(0,0,0,0.95)] relative h-[270px] flex flex-col justify-between border-[12px] border-[#2e1d15] rounded-sm before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] before:opacity-20 before:pointer-events-none">
                <div className="border-b border-black/30 pb-1.5 text-center relative z-10">
                  <span className="font-sans text-[9px] font-black uppercase tracking-widest text-emerald-100/40 block drop-shadow">Mahogany Tumbler Vault Tray</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
                  {lastRoll ? (
                    <div className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
                      <div className="flex flex-wrap justify-center gap-3 max-w-[190px]">
                        {lastRoll.dice.map((die, idx) => (
                          <div 
                            key={idx} 
                            className={`w-11 h-11 border-2 rounded font-black text-xl flex items-center justify-center shadow-2xl transform ${idx % 2 === 0 ? 'rotate-[-6deg]' : 'rotate-[8deg]'} ${
                              die.is_gilded ? 'bg-[#d4af37] border-[#9e7d1b] text-black scale-105 shadow-[0_4px_12px_rgba(212,175,55,0.4)]' : 'bg-white border-gray-300 text-black'
                            }`}
                          >
                            {die.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-emerald-100/20 text-xs italic font-serif px-4 leading-normal">Felt interior clear. Awaiting action trigger dice drops...</div>
                  )}
                </div>
              </div>

              <div className="font-sans">
                <h3 className="text-[10px] font-sans font-black uppercase tracking-widest text-[#d4af37] border-b border-[#d4af37]/20 pb-1.5 mb-3 flex items-center gap-1.5">
                  <SafeIcon name="GiScroll" size={12} /> Staging Activity Log
                </h3>
                <div className="h-[280px] overflow-y-auto space-y-3 text-xs font-serif leading-normal pr-1.5 text-white/50 custom-scrollbar">
                  {lastRoll && (
                    <p className="animate-fadeIn text-white border-l-2 border-emerald-500/50 pl-2 italic">
                      <span className="text-emerald-400 font-sans font-black text-[9px] uppercase tracking-tight mr-1.5">[ROLL]</span> {character.name} evaluated an active rolling check calculation.
                    </p>
                  )}
                  <p><span className="text-[#d4af37] font-sans font-black text-[9px] uppercase tracking-tight mr-1.5">[22:01]</span> Circle forged entry logs into the apothecary laboratory basement.</p>
                  <p><span className="text-[#a82222] font-sans font-black text-[9px] uppercase tracking-tight mr-1.5">[21:48]</span> Arthur Vance absorbed structural shock trace impacts during security sweep.</p>
                  <p><span className="text-[#d4af37] font-sans font-black text-[9px] uppercase tracking-tight mr-1.5">[21:42]</span> Active websocket tunnel synchronized cleanly with local staging server.</p>
                </div>
              </div>
            </div>

          </div>
        )}

        <ScarModal />
      </main>
    </div>
  );
}

export default App;