import React, { useState } from 'react';
import useGameStore from './store/gameStore';

//Components
import { CampaignGatekeeper } from './components/CampaignGatekeeper';
import ScarModal from './components/ScarModal';
import { CharacterCreator } from './components/CharacterCreator';
import { SafeIcon } from './components/SafeIcon';
import { ArtDecoCorner, BrassCornerFiligree } from './components/Decorations';
import { InvestigatorDossier } from './components/InvestigatorDossier';
import { CircleView } from './components/CircleView';
import { ArchivesView } from './components/ArchivesView';

// Double-Sized Pocket Watch Tension Tracker Component (Used in Sidebar)
const PocketWatchClock = ({ title, current, max, colorHex, className = "" }) => {
  const fillPercentage = (current / max) * 100;
  const conicBg = `conic-gradient(${colorHex} ${fillPercentage}%, transparent 0)`;

  return (
    <div className={`flex flex-col items-center select-none transition-transform duration-300 hover:scale-105 ${className}`} title={`${title}: ${current}/${max}`}>
      <div className="flex flex-col items-center -mb-2 z-10">
        <div className="w-6 h-6 rounded-full border-4 border-[#cc9a29] shadow-md" />
        <div className="w-8 h-3 bg-[#cc9a29] border border-black/30 rounded-t-sm -mt-1" />
      </div>
      
      <div className="w-28 h-28 rounded-full border-[6px] border-[#cc9a29] bg-[#fcf8ef] relative flex items-center justify-center p-1 shadow-[0_12px_24px_rgba(0,0,0,0.75)]">
        <div className="absolute top-1 left-1 w-12 h-12 bg-white/20 rounded-full blur-[1px] z-10" />
        <div className="w-full h-full rounded-full border border-black/20 overflow-hidden relative shadow-inner bg-[#f6ecd2]" style={{ background: conicBg }}>
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
    lastRoll, 
    isRolling,
    setLocalCharacter
  } = useGameStore();
  
  // App routing states
  const [accessSession, setAccessSession] = useState(null);
  const [isCreating, setIsCreating] = useState(true); 
  const [activeTab, setActiveTab] = useState('character');

  // --- 1. GATEKEEPER LOGIN ---
  if (!accessSession) {
    return <CampaignGatekeeper onAccessGranted={(session) => {
      setAccessSession(session);
      connect(session.campaignCode); // Uses the campaign code for the websocket room
    }} />;
  }

  // --- 2. LIGHTKEEPER (GM) HUB ---
  if (accessSession.role === 'GM') {
    return (
      <div className="min-h-screen bg-[#0d0908] bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] p-8 text-amber-100 font-mono flex flex-col items-center justify-center">
        <h1 className="text-4xl text-[#d4af37] font-serif font-black uppercase tracking-widest mb-4">Operations Room</h1>
        <p className="text-sm opacity-50 uppercase tracking-widest text-center max-w-lg">
          Connection established to <span className="text-white font-bold">{accessSession.campaignCode}</span>. <br/><br/>
          (The Lightkeeper Campaign Builder module will be constructed here in a future phase.)
        </p>
      </div>
    );
  }

  // --- 3. INVESTIGATOR CREATION ---
  if (isCreating || !character) {
    return (
      <div className="min-h-screen bg-[#110a08] py-8 font-serif" style={{ color: accessSession.pen.color, fontFamily: accessSession.pen.font }}>
        <header className="max-w-6xl mx-auto mb-6 text-center">
          <h1 className="text-5xl mb-2 font-serif font-black tracking-tight text-[#fdfaf4]" style={{ fontFamily: 'serif' }}>CANDELA OBSCURA</h1>
          <p className="text-sm font-sans font-black tracking-widest text-[#a82222] uppercase" style={{ fontFamily: 'sans-serif' }}>Virtual Tabletop Staging Archive</p>
        </header>
        
        <CharacterCreator 
          globalPenStyle={accessSession.pen}
          onSubmit={async (characterData) => {
            try {
              const response = await fetch('/api/investigators/forge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(characterData)
              });

              if (!response.ok) throw new Error("Forge Failed");

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
  
  // =========================================================================
  // CHARACTER CREATION GATEWAY (RESTORED API HANDSHAKE)
  // =========================================================================
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
              // 1. Map frontend UI names to Backend expected snake_case formats
              const payload = {
                name: characterData.name || "Unknown Investigator",
                pronouns: characterData.pronouns || "Unlisted",
                style: characterData.style || "",
                catalyst: characterData.catalyst || "",
                question: characterData.question || "",
                role_ability: characterData.roleAbility || "None",
                specialty_ability: characterData.specialtyAbility || "None",
                gear: characterData.gear || [],
                profile_pic: characterData.profilePic || null 
              };

              // 2. Transmit to the backend to mint the database row
              const response = await fetch('/api/investigators/forge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              if (!response.ok) {
                console.error("Database Forge Failed:", await response.text());
                return;
              }

              // 3. Receive the real, database-backed character object (including the genuine ID)
              const savedCharacter = await response.json();
              setLocalCharacter(savedCharacter);
              setIsCreating(false); 
              
              // 4. Securely establish WebSocket with the real authenticated ID
              connect(savedCharacter.id);

            } catch (err) {
              console.error("Network Error during Forge:", err);
            }
          }} 
        />
      </div>
    );
  }

  // =========================================================================
  // MAIN APPLICATION DESKTOP UI
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#160e0b] text-[#fdfaf4] font-serif selection:bg-[#721c15] selection:text-white antialiased bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12">
      
      {/* HEADER */}
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

      {/* STAMPED REGISTRY SLIP NAVIGATION TOOLBAR */}
      <div className="max-w-[1500px] mx-auto mt-6 px-4 relative z-30">
        <div className="absolute -left-3 sm:left-2 top-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br from-[#9c1c1c] via-[#7d1414] to-[#4a0808] rounded-[48%] shadow-[4px_10px_20px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.2)] flex items-center justify-center border border-[#5c0f0f] transform rotate-12 z-40 select-none cursor-help group" title="Official Seal of the Order">
          <div className="w-20 h-20 rounded-full border border-dashed border-black/20 flex items-center justify-center p-0.5 shadow-inner">
            <div className="text-[#641010] drop-shadow-[0_1.5px_1px_rgba(255,255,255,0.1)] shadow-inner transform -translate-y-[1px]">
              <SafeIcon name="GiCandleHolder" size={62} />
            </div>
          </div>
          <div className="absolute -bottom-1.5 -left-1 w-8 h-6 bg-[#7d1414] rounded-full blur-[0.5px] opacity-50 -z-10" />
          <div className="absolute -top-1.5 -right-1 w-6 h-8 bg-[#7d1414] rounded-full blur-[0.5px] opacity-50 -z-10" />
        </div>

        <div className="w-full bg-[#ebdcb9] border-4 border-double border-black p-5 relative shadow-[0_12px_30px_rgba(0,0,0,0.9)] flex flex-col md:flex-row justify-between items-center gap-4 text-black pl-32 pr-6 rounded-sm overflow-hidden">
          <div className="absolute top-2 left-6 text-4xl font-mono font-black text-[#1a1311] opacity-5 tracking-tighter transform -rotate-2 select-none pointer-events-none">
            REGISTRY FILE // NO. 00843-CO
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div>
              <span className="block font-sans text-[10px] font-black tracking-widest uppercase text-gray-600 leading-none">Candela Obscura Member ID</span>
              <span className="block font-mono text-sm font-bold tracking-tight text-black mt-1.5">
                {character.id ? `ASSIGNED RECORD MATRIX: SEC #${character.id}` : "RANDOM ASSIGNMENT INDEX"}
              </span>
            </div>
          </div>

          <div className="flex gap-2 font-sans text-[11px] font-black uppercase tracking-wider relative z-10">
            {['character', 'circle', 'archives'].map((tabName) => {
              const labels = { character: "Investigator Dossier", circle: "Circle Progress Report", archives: "Archive" };
              const isActive = activeTab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
                  className={`px-4 py-1.5 rounded transition-all duration-150 ${
                    isActive ? 'bg-black text-[#ebdcb9] shadow-md border border-black' : 'bg-transparent text-black/60 hover:bg-black/5 hover:text-black'
                  }`}
                >
                  {labels[tabName]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DYNAMIC VIEW ROUTING */}
      <main className="max-w-[1500px] mx-auto p-4 mt-2">
        {activeTab === 'archives' ? (
          <ArchivesView />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUMN 1: TACTILE SIDEBAR */}
            <div className="lg:col-span-3 space-y-6 mt-2">
              <div className="bg-[#fcfaf2] text-[#1a1311] border border-[#d2c9b9] p-5 shadow-[5px_8px_20px_rgba(0,0,0,0.65)] relative transform -rotate-1 hover:rotate-0 transition-transform duration-200"
                   style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(43, 108, 176, 0.12) 24px)', backgroundSize: '100% 24px', lineHeight: '24px' }}>
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
                        <div key={i} className={`w-2.5 h-2.5 rounded-full border border-black shadow-inner transition-colors ${i < 3 ? 'bg-black' : 'bg-transparent'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

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

              <div className="pt-4 pb-2 px-1 flex flex-row gap-4 justify-center items-center relative z-20">
                <PocketWatchClock title="Guard Patrol" current={3} max={4} colorHex="#d97706" className="transform rotate-6 translate-y-1" />
                <PocketWatchClock title="Miasma Bleed" current={1} max={6} colorHex="#b91c1c" className="transform -rotate-12 -translate-y-2" />
              </div>
            </div>

            {/* COLUMN 2: CENTER PAPER LAYOUT */}
            <div className="lg:col-span-6">
              <div className="bg-[#fbf6eb] text-black px-8 pt-8 pb-8 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] min-h-[850px] border-2 border-black relative font-serif overflow-hidden">
                <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
                <BrassCornerFiligree />
                <div className="absolute bottom-24 right-12 font-sans font-black text-7xl uppercase text-black/[0.02] tracking-widest select-none pointer-events-none transform -rotate-12">
                  OFFICIAL FORM
                </div>

                {activeTab === 'character' && <InvestigatorDossier />}
                {activeTab === 'circle' && <CircleView />}
              </div>
            </div>

            {/* COLUMN 3: DICE TRADING VAULT */}
            <div className="lg:col-span-3 space-y-6 mt-2">
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

              <div className="font-sans">
                <h3 className="text-[10px] font-sans font-black uppercase tracking-widest text-[#d4af37] border-b border-[#d4af37]/20 pb-1.5 mb-3 flex items-center gap-1.5">
                  <SafeIcon name="GiScroll" size={12} /> Staging Activity Log
                </h3>
                <div className="h-[280px] overflow-y-auto space-y-3 text-xs font-serif leading-normal pr-1.5 text-white/50 custom-scrollbar">
                  {lastRoll && !isRolling && (
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