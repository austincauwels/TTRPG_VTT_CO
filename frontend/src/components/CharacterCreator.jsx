// src/components/CharacterCreator.jsx
import React, { useState } from 'react';
import * as Gi from "react-icons/gi";

// Standard equipment issue ledger available to all investigators
const STANDARD_GEAR = [
  "Bleed Detector", "Bleed Containment Vial", "Hand Weapon", "Lantern", "Matches & Candles", "First Aid Kit"
];

// Complete Thematic Mapping Configuration Built Directly From Your Codebase
const ROLES = {
  "Face": {
    icon: "GiDramaMasks",
    description: "You are the charming, manipulative, and social expert of the Circle.",
    keys: ["Gather Statements", "Hunt Down a Lead", "Speak Truth to Power"],
    baseAbilities: {
      "I Know a Guy": { icon: "GiThreeFriends", text: "Once per assignment, you can produce a contact who possesses specialized knowledge or resources." },
      "Sweet Talk": { icon: "GiLips", text: "When you Sway someone by flattering them or offering them something they want, add +1d." },
      "Cool Under Pressure": { icon: "GiIciclesAura", text: "You may spend 1 Drive to take a Brain mark instead of a Bleed mark." }
    },
    specialties: {
      "Journalist": {
        icon: "GiNewspaper",
        description: "You chase the truth, no matter what shadows it hides in.",
        gear: ["Press Credentials", "Camera", "Hidden Recording Device"],
        stats: { nerve: { move: 0, strike: 0, control: 1, max: 2 }, cunning: { sway: 2, read: 2, hide: 0, max: 4 }, intuition: { survey: 1, focus: 1, sense: 0, max: 3 } },
        abilities: {
          "Insider Access": { icon: "GiOrganigram", text: "You can get into places others can't using your press credentials." },
          "Open Book": { icon: "GiNotebook", text: "When you Read a person by asking probing questions, heal 1 Brain mark." },
          "Lie Detector": { icon: "GiAmplitude", text: "You always know when someone is lying to you." },
          "Press Conference": { icon: "GiPublicSpeaker", text: "You can gather a crowd of people to listen to you speak, no matter the location." },
          "In the Trenches": { icon: "GiTrenchAssault", text: "Take 1 Bleed mark to add +1d to a roll when you are in physical danger to get a story." },
          "Well-Researched": { icon: "GiArchiveResearch", text: "When you spend time researching a topic in an archive or library, ask the GM one question they must answer truthfully." }
        }
      },
      "Magician": {
        icon: "GiMagickTrick",
        description: "You are a master of illusion, misdirection, and sleight of hand.",
        gear: ["Flash Powder", "Lockpicks", "Trick Deck of Cards"],
        stats: { nerve: { move: 1, strike: 0, control: 1, max: 3 }, cunning: { sway: 2, read: 0, hide: 2, max: 4 }, intuition: { survey: 0, focus: 1, sense: 0, max: 2 } },
        abilities: {
          "Misdirection": { icon: "GiDistraction", text: "When you create a distraction, all eyes are on you. You or an ally may Hide or Sneak with +1d." },
          "Escape Artist": { icon: "GiBreakingChain", text: "You can easily slip out of any physical restraints." },
          "Practiced Patter": { icon: "GiDiscussion", text: "When you Sway a crowd of three or more people, add +1d." },
          "Uncanny Eye": { icon: "GiSunkenEye", text: "You can spot hidden compartments, trap doors, and vanished targets without needing to Survey." },
          "Flourish": { icon: "GiJuggler", text: "When you critically succeed on an action, heal 1 Brain mark." },
          "The Prestige": { icon: "GiMedallist", text: "Once per assignment, you can reveal that an item you are holding is actually a fake." }
        }
      }
    }
  },
  "Muscle": {
    icon: "GiBiceps",
    description: "You are the physical powerhouse. You break things and stand between your Circle and danger.",
    keys: ["Solve a problem with physical force", "Protect an ally from harm", "Endure extreme hardship"],
    baseAbilities: {
      "Behind Me": { icon: "GiRosaShield", text: "When an ally takes a mark, you may choose to take that mark instead." },
      "Adrenaline Rush": { icon: "GiMountainClimbing", text: "When you take a Body mark, you may immediately clear 1 mark from your Brain or Bleed track." },
      "Endurance": { icon: "GiPathDistance", text: "You have 1 extra Body mark box." }
    },
    specialties: {
      "Explorer": {
        icon: "GiCompass",
        description: "You are accustomed to surviving in harsh environments and uncovering lost secrets.",
        gear: ["Heavy Climbing Gear", "Machete", "Vintage Map Collection"],
        stats: { nerve: { move: 2, strike: 1, control: 0, max: 4 }, cunning: { sway: 0, read: 0, hide: 1, max: 2 }, intuition: { survey: 2, focus: 0, sense: 1, max: 3 } },
        abilities: {
          "Obscure Lexicon": { icon: "GiCompanionCube", text: "You can understand and translate ancient or obscure languages." },
          "Field Experience": { icon: "GiDigHole", text: "When you Survey a wild or overgrown environment, add +1d." },
          "Mind Over Matter": { icon: "GiHelmetHeadShot", text: "You can spend 1 Drive to ignore the effects of a Body mark for a scene." },
          "Tenacious": { icon: "GiLifeBar", text: "When you critically succeed on a physical action, gain 1 Drive point." },
          "Narrow Escape": { icon: "GiHourglass", text: "Once per assignment, you can completely avoid a physical trap or hazard." },
          "Not Again": { icon: "GiDread", text: "When you face a creature or hazard you have encountered before, add +1d to your rolls against it." }
        }
      },
      "Soldier": {
        icon: "GiRevolver",
        description: "You are a trained combatant, disciplined and lethal.",
        gear: ["Heavy Firearm", "Tactical Armor", "Trench Whistle"],
        stats: { nerve: { move: 1, strike: 2, control: 2, max: 5 }, cunning: { sway: 1, read: 0, hide: 0, max: 2 }, intuition: { survey: 1, focus: 0, sense: 0, max: 2 } },
        abilities: {
          "Basic Training": { icon: "GiOnSight", text: "When you Strike with a standard weapon, add +1d." },
          "Geared Up": { icon: "GiCrestedHelmet", text: "You always have the right mundane tool or weapon for the job on your person." },
          "Sharpshooter": { icon: "GiHeadshot", text: "When you Strike from a hidden or elevated position, you may roll twice and keep the better result." },
          "Tactician": { icon: "GiMinions", text: "When you Survey a combat situation, the GM will tell you the enemy's greatest weakness." },
          "Compartmentalization": { icon: "GiCrenulatedShield", text: "You have 1 extra Brain mark box." },
          "Volunteer Duty": { icon: "GiHeartTower", text: "Take 1 Body mark to add +1d to an ally's action roll." }
        }
      }
    }
  },
  "Scholar": {
    icon: "GiBookmarklet",
    description: "You are the academic heart of the Circle, relying on research, science, and intellect over brute force.",
    keys: ["Discover a hidden truth", "Apply academic knowledge to a problem", "Preserve a piece of history"],
    baseAbilities: {
      "Well-Read": { icon: "GiBookPile", text: "When you come across an esoteric or obscure subject, you always know a basic fact about it." },
      "Occult Researcher": { icon: "GiDeathNote", text: "When you Read a magical artifact or text, add +1d." },
      "Meticulous Notes": { icon: "GiPapers", text: "Once per assignment, you may produce a note or sketch that perfectly details a previously visited location." }
    },
    specialties: {
      "Doctor": {
        icon: "GiCaduceus",
        description: "You heal the broken and study the anatomy of both the mundane and the monstrous.",
        gear: ["Surgical Tools", "Heavy Sedatives", "Medical Journals"],
        stats: { nerve: { move: 0, strike: 0, control: 1, max: 2 }, cunning: { sway: 0, read: 2, hide: 0, max: 3 }, intuition: { survey: 1, focus: 2, sense: 1, max: 4 } },
        abilities: {
          "Patch Up": { icon: "GiHandBandage", text: "Once per scene, you can heal 1 Body mark on an ally without needing a Stitch." },
          "Non-Combatant": { icon: "GiHeartInside", text: "Enemies will always target you last in a physical confrontation unless provoked." },
          "Dissection": { icon: "GiRaggedWound", text: "When you examine a corpse or monstrous remain, the GM will tell you exactly how it died." },
          "Resuscitation": { icon: "GiHalfDead", text: "Once per assignment, you can bring an incapacitated ally back to 1 Body mark." },
          "Lifesaver": { icon: "GiHealthPotion", text: "When you take a Body mark to protect an ally, you both heal 1 Brain mark." },
          "Anatomical Strike": { icon: "GiHeartStake", text: "When you Strike a living creature, you can choose to inflict a specific condition." }
        }
      },
      "Professor": {
        icon: "GiSpectacles",
        description: "You are a master of theory, history, and the rigid rules of the academic world.",
        gear: ["Thick Reference Tome", "Chemical Kit", "University Keys"],
        stats: { nerve: { move: 0, strike: 0, control: 1, max: 2 }, cunning: { sway: 2, read: 1, hide: 0, max: 3 }, intuition: { survey: 1, focus: 2, sense: 0, max: 4 } },
        abilities: {
          "Steel Mind": { icon: "GiRearAura", text: "You have 1 extra Brain mark box." },
          "University Resources": { icon: "GiEnlightenment", text: "You have access to a massive library, laboratory, and network of academic peers." },
          "Learn from My Mistakes": { icon: "GiEyepatch", text: "When you fail a roll, your next roll on the same action gains +1d." },
          "Better Part of Valor": { icon: "GiOppositeHearts", text: "When you choose to flee from a conflict, you and your allies automatically escape." },
          "Verbose": { icon: "GiShouting", text: "When you Sway someone by confusing them with academic jargon, add +1d." },
          "Chemical Concoction": { icon: "GiBubblingFlask", text: "Once per assignment, you can produce a specialized chemical compound." }
        }
      }
    }
  },
  "Slink": {
    icon: "GiDominoMask",
    description: "You operate in the shadows. You bypass security, find what is hidden, and strike from the dark.",
    keys: ["Bypass security undetected", "Acquire something illicitly", "Discover what someone is hiding"],
    baseAbilities: {
      "Scout": { icon: "GiWatchtower", text: "When you Sneak ahead of the group to gather information, add +1d." },
      "Saw This Coming": { icon: "GiFrontalLobe", text: "Once per assignment, you can reveal that you previously sabotaged an enemy's weapon or plan." },
      "Death Defy": { icon: "GiChainedHeart", text: "When you take a mark that would incapacitate you, roll 1d6. On a 4+, you ignore the mark." }
    },
    specialties: {
      "Criminal": {
        icon: "GiLockpicks",
        description: "You know the underworld and the illegal trades that keep the city running.",
        gear: ["Advanced Lockpicks", "Forged Documents", "Concealed Blade"],
        stats: { nerve: { move: 1, strike: 1, control: 1, max: 3 }, cunning: { sway: 1, read: 0, hide: 2, max: 4 }, intuition: { survey: 0, focus: 1, sense: 0, max: 2 } },
        abilities: {
          "Street Smarts": { icon: "GiChoice", text: "You always know the fastest and safest route through the city slums and alleys." },
          "Leverage": { icon: "GiHumanEar", text: "When you Sway someone by threatening them or their livelihood, add +1d." },
          "Hardened": { icon: "GiImprisoned", text: "You have 1 extra Bleed mark box." },
          "Born in the Shadows": { icon: "GiHoodedAssassin", text: "When you Hide in complete darkness, you are entirely invisible." },
          "Tricks of the Trade": { icon: "GiCoinflip", text: "You can pick any standard mechanical lock without needing to roll." },
          "Sticky Fingers": { icon: "GiSnatch", text: "When you critically succeed on a physical action, you may secretly steal a small item." }
        }
      },
      "Detective": {
        icon: "GiMagnifyingGlass",
        description: "You piece together clues and see the connections others miss.",
        gear: ["Magnifying Glass", "Evidence Bags", "Concealed Pistol"],
        stats: { nerve: { move: 0, strike: 1, control: 1, max: 2 }, cunning: { sway: 1, read: 2, hide: 1, max: 4 }, intuition: { survey: 2, focus: 0, sense: 0, max: 3 } },
        abilities: {
          "Mind Palace": { icon: "GiCastle", text: "You perfectly remember every detail of a crime scene or location you have Surveyed." },
          "Interrogation": { icon: "GiTabletopPlayers", text: "When you Read a captive or willing subject, they cannot lie to you." },
          "Back Against the Wall": { icon: "GiSinkingShip", text: "When you have 3 marks in any category, add +1d to all action rolls." },
          "Inspection": { icon: "GiCrimeSceneTape", text: "When you Survey a scene, you always find one hidden clue, even if you fail the roll." },
          "Stakeout": { icon: "GiParanoia", text: "When you observe a location for an extended period, you learn its security patrol routes." },
          "One Step Ahead": { icon: "GiMeshNetwork", text: "Once per assignment, you can declare that you already anticipated the GM's current twist." }
        }
      }
    }
  },
  "Weird": {
    icon: "GiSemiClosedEye",
    description: "You are touched by the phenomena you investigate. You understand the magick and monsters of the world natively.",
    keys: ["Consult arcane texts", "Collect oddities", "Act bizarre"],
    baseAbilities: {
      "Great Wards": { icon: "GiRuneStone", text: "You can create a protective circle that mundane creatures and low-level phenomena cannot cross." },
      "Let Them In": { icon: "GiThirdEye", text: "When you allow a phenomenon to temporarily possess or influence you, you learn its immediate goal." },
      "Ritual": { icon: "GiCircleClaws", text: "You know a specific magical ritual that takes 10 minutes to cast (determined with the GM)." }
    },
    specialties: {
      "Medium": {
        icon: "GiMagicPalm",
        description: "You bridge the gap between the living and the dead.",
        gear: ["Spirit Board", "Ectoplasm Vial", "Tarot Deck"],
        stats: { nerve: { move: 0, strike: 0, control: 0, max: 2 }, cunning: { sway: 2, read: 2, hide: 0, max: 3 }, intuition: { survey: 0, focus: 1, sense: 2, max: 4 } },
        abilities: {
          "Miasma": { icon: "GiFluffyCloud", text: "You can sense the lingering emotional residue of a location or object." },
          "Bending Spoons": { icon: "GiSpoon", text: "You can subtly manipulate small objects with your mind." },
          "Cold Read": { icon: "GiFrozenOrb", text: "When you Read a person, you immediately know their greatest fear." },
          "Premonitions": { icon: "GiCrystalBall", text: "Once per session, the GM will give you a vision of a likely future danger." },
          "Last Moments": { icon: "GiChewedHeart", text: "You can touch a corpse to see the last 10 seconds of its life from its perspective." },
          "Commune": { icon: "GiCandleLight", text: "Take 1 Brain mark to summon and speak with the spirit of a specific deceased person." }
        }
      },
      "Occultist": {
        icon: "GiCandleSkull",
        description: "You wield the dangerous, forbidden magicks of the world.",
        gear: ["Arcane Texts", "Occult Supplies", "Ritual Dagger"],
        stats: { nerve: { move: 0, strike: 1, control: 0, max: 2 }, cunning: { sway: 0, read: 1, hide: 1, max: 2 }, intuition: { survey: 1, focus: 2, sense: 2, max: 5 } },
        abilities: {
          "Ghostblade": { icon: "GiDaggerRose", text: "You have a weapon that can strike incorporeal phenomena and spirits." },
          "Blood of the Covenant": { icon: "GiCauldron", text: "Take 1 Bleed mark to automatically succeed on a magical action without rolling." },
          "Speak Their Language": { icon: "GiBrokenTablet", text: "You can communicate with any monstrous entity or phenomenon." },
          "Play the Bait": { icon: "GiRabbit", text: "When you intentionally draw the attention of a phenomenon, your allies gain +1d to act against it." },
          "Extend Your Senses": { icon: "GiBleedingEye", text: "You can see in complete darkness and see invisible entities." },
          "Forbidden Ritual": { icon: "GiMagicSwirl", text: "Once per assignment, you can perform a powerful, dangerous ritual." }
        }
      }
    }
  }
};

const SafeIcon = ({ name, size = 18, className = "" }) => {
  if (!name || !Gi[name]) return <div style={{ width: size, height: size }} className="bg-[#160f0d]/10 border border-dashed border-[#721c15]/30 rounded-full" />;
  return React.createElement(Gi[name], { size, className });
};

export const CharacterCreator = ({ onSubmit }) => {
  const [step, setStep] = useState(1);
  
  const [profilePic, setProfilePic] = useState(null);
  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [style, setStyle] = useState("");
  const [catalyst, setCatalyst] = useState("");
  const [question, setQuestion] = useState("");
  const [role, setRole] = useState("");
  const [specialty, setSpecialty] = useState("");
  
  const [selectedRoleAbility, setSelectedRoleAbility] = useState("");
  const [selectedSpecialtyAbility, setSelectedSpecialtyAbility] = useState("");
  const [selectedGear, setSelectedGear] = useState([]);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProfilePic(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole); 
    setSpecialty(""); 
    setSelectedRoleAbility(""); 
    setSelectedSpecialtyAbility(""); 
    setSelectedGear([]);
  };

  const toggleGear = (item) => {
    if (selectedGear.includes(item)) setSelectedGear(selectedGear.filter(g => g !== item));
    else if (selectedGear.length < 3) setSelectedGear([...selectedGear, item]);
  };

  const handleComplete = () => {
    if (onSubmit) onSubmit({ 
      name, pronouns, style, catalyst, question, role, specialty, 
      roleAbility: selectedRoleAbility, specialtyAbility: selectedSpecialtyAbility, 
      gear: selectedGear, profilePic 
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 font-serif text-[#1a1311]">
      
      {/* =========================================================================
          THEMATIC 3-STEP PROGRESS NAVIGATION LANE
          ========================================================================= */}
      <div className="flex border border-[#3e2f29] bg-[#1a1311] text-xs font-sans font-black tracking-widest text-center select-none rounded mb-8 shadow-md">
        <div 
          onClick={() => setStep(1)}
          className={`flex-1 py-3 cursor-pointer border-r border-[#3e2f29] transition-colors ${step === 1 ? 'bg-[#721c15] text-[#fdfaf4]' : 'text-[#fdfaf4]/40 hover:bg-black/20'}`}
        >
          1. REGISTRATION
        </div>
        <div 
          onClick={() => name && role && specialty && setStep(2)}
          className={`flex-1 py-3 cursor-pointer border-r border-[#3e2f29] transition-colors ${
            (!name || !role || !specialty) ? 'opacity-30 cursor-not-allowed text-[#fdfaf4]/20' : step === 2 ? 'bg-[#721c15] text-[#fdfaf4]' : 'text-[#fdfaf4]/40 hover:bg-black/20'
          }`}
        >
          2. INTERVIEW
        </div>
        <div 
          onClick={() => name && role && specialty && catalyst && selectedRoleAbility && selectedSpecialtyAbility && setStep(3)}
          className={`flex-1 py-3 cursor-pointer transition-colors ${
            (!name || !role || !specialty || !catalyst || !selectedRoleAbility || !selectedSpecialtyAbility) ? 'opacity-30 cursor-not-allowed text-[#fdfaf4]/20' : step === 3 ? 'bg-[#721c15] text-[#fdfaf4]' : 'text-[#fdfaf4]/40 hover:bg-black/20'
          }`}
        >
          3. CANDELA DOSSIER
        </div>
      </div>

      {/* =========================================================================
          MAIN PARCHMENT RECORD CARD FRAME
          ========================================================================= */}
      <div className="bg-[#f5ebd6] border-4 border-double border-[#1a1311] shadow-[0_15px_35px_rgba(0,0,0,0.7)] p-8 relative rounded-sm min-h-[550px] flex flex-col justify-between">
        
        {/* Intricate Antique Corner Filigrees */}
        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#1a1311]/40" />
        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#1a1311]/40" />
        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#1a1311]/40" />
        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#1a1311]/40" />

        {/* =========================================================================
            STEP 1: REGISTRATION (Identity + Career & Profession Selection)
            ========================================================================= */}
        {step === 1 && (
          <div className="animate-fadeIn space-y-8 flex-1">
            <div className="text-center border-b border-[#1a1311]/20 pb-4">
              <h2 className="text-2xl font-black uppercase tracking-wide text-[#721c15]">Applicant Registration</h2>
              <p className="text-[10px] font-sans font-black uppercase tracking-widest text-black/50 mt-1">Please provide vital identity details for prompt evaluation</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Passport Portrait */}
              <div className="lg:col-span-4 flex flex-col items-center">
                <label className="w-full aspect-[3/4] border-2 border-dashed border-[#1a1311]/40 bg-[#ebdcb9]/50 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-[#ebdcb9]/80 hover:border-[#721c15]/60 transition-all relative overflow-hidden shadow-inner group">
                  {profilePic ? (
                    <img src={profilePic} alt="Dossier headshot" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Gi.GiIdCard size={40} className="mx-auto text-[#1a1311]/30 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="block text-[10px] font-sans font-black tracking-widest text-[#1a1311]/50 uppercase">[+] AFFIX PORTRAIT</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                <span className="text-[9px] font-sans italic opacity-50 mt-2 text-center">Recent portraits are required for identity verification</span>
              </div>

              {/* Right Column: Lined Form Fields + Dropdowns */}
              <div className="lg:col-span-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative border-b border-[#1a1311]/30 pb-1">
                    <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Nomenclature Name..." 
                      className="w-full bg-transparent font-serif font-bold text-base border-none focus:outline-none placeholder-black/20"
                    />
                  </div>

                  <div className="relative border-b border-[#1a1311]/30 pb-1">
                    <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1">Gender</label>
                    <input 
                      type="text" 
                      value={pronouns} 
                      onChange={(e) => setPronouns(e.target.value)}
                      placeholder="e.g., He/They, She/Her..." 
                      className="w-full bg-transparent font-serif italic text-base border-none focus:outline-none placeholder-black/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1">Profession</label>
                    <select 
                      value={role} 
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full bg-[#ebdcb9] border border-[#1a1311]/30 rounded p-2 text-xs font-sans font-bold focus:outline-none"
                    >
                      <option value="">-- Choose Profession --</option>
                      {Object.keys(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {role && (
                    <div className="animate-fadeIn">
                      <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1">Field of Focus</label>
                      <select 
                        value={specialty} 
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full bg-[#ebdcb9] border border-[#1a1311]/30 rounded p-2 text-xs font-sans font-bold focus:outline-none"
                      >
                        <option value="">-- Choose Field Specialty --</option>
                        {Object.keys(ROLES[role].specialties).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="relative border-b border-[#1a1311]/30 pb-1 pt-2">
                  <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1">Identifying Characteristics</label>
                  <textarea 
                    rows={2}
                    value={style} 
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="Detail apparel, tailored suits, ink-stained marks, or signature items..." 
                    className="w-full bg-transparent font-serif text-xs border-none focus:outline-none resize-none placeholder-black/20 leading-relaxed"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: INTERVIEW (Narrative Questions + Assets Section)
            ========================================================================= */}
        {step === 2 && (
          <div className="animate-fadeIn space-y-6 flex-1 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            <div className="text-center border-b border-[#1a1311]/20 pb-3">
              <h2 className="text-2xl font-black uppercase tracking-wide text-[#721c15]">Applicant Examination Logs</h2>
              <p className="text-[10px] font-sans font-black uppercase tracking-widest text-black/50 mt-1">Notes from Interviews Conducted with Applicants</p>
            </div>

            {/* Top Row: Narrative Prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#ebdcb9]/40 border border-[#1a1311]/20 p-3 rounded shadow-inner">
                <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1 border-b border-[#1a1311]/10 pb-1">
                  RECORD YOUR CATALYST: WHY DO YOU SEEK CANDELA OBSCURA?
                </label>
                <textarea 
                  rows={2}
                  value={catalyst} 
                  onChange={(e) => setCatalyst(e.target.value)}
                  placeholder="Document the specific event or supernatural puncture that tore away the mundane world..." 
                  className="w-full bg-transparent font-serif text-xs border-none focus:outline-none resize-none placeholder-black/30 leading-relaxed"
                />
              </div>

              <div className="bg-[#ebdcb9]/40 border border-[#1a1311]/20 p-3 rounded shadow-inner">
                <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15] mb-1 border-b border-[#1a1311]/10 pb-1">
                  CONVEY YOUR CURIOSITY: WHAT ANSWERS ARE YOU DEMANDING?
                </label>
                <textarea 
                  rows={2}
                  value={question} 
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What is the central question or haunting mystery your investigator pursues into the dark?" 
                  className="w-full bg-transparent font-serif text-xs border-none focus:outline-none resize-none placeholder-black/30 leading-relaxed"
                />
              </div>
            </div>

            {/* Bottom Row: The Assets Section */}
            <div className="border-t-2 border-dashed border-[#1a1311]/20 pt-4">
              <h3 className="text-sm font-sans font-black uppercase tracking-wider text-[#721c15] mb-3 flex items-center gap-1">
                <Gi.GiBriefcase size={14} /> Record of Professional Assets
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                
                {/* 1. Role Ability */}
                <div className="bg-[#ebdcb9]/60 border border-[#1a1311]/20 p-3 rounded space-y-2">
                  <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15]">Role Ability</span>
                  <div className="space-y-1.5">
                    {Object.entries(ROLES[role].baseAbilities).map(([name, data]) => (
                      <div 
                        key={name}
                        onClick={() => setSelectedRoleAbility(name)}
                        className={`p-2 border rounded cursor-pointer transition-all flex items-start gap-2 ${
                          selectedRoleAbility === name ? 'bg-white border-[#721c15] shadow-sm' : 'border-[#1a1311]/10 hover:bg-white/40'
                        }`}
                      >
                        <div className={`p-1 rounded-full shrink-0 ${selectedRoleAbility === name ? 'bg-[#721c15] text-[#fdfaf4]' : 'bg-[#ebdcb9] text-[#1a1311]'}`}>
                          <SafeIcon name={data.icon} size={12} />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] font-black tracking-tight leading-none">{name}</span>
                          <span className="block text-[10px] opacity-70 leading-tight font-serif mt-0.5">{data.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Specialty Ability */}
                <div className="bg-[#ebdcb9]/60 border border-[#1a1311]/20 p-3 rounded space-y-2">
                  <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15]">Specialty Ability</span>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {ROLES[role].specialties[specialty] ? (
                      Object.entries(ROLES[role].specialties[specialty].abilities).map(([name, data]) => (
                        <div 
                          key={name}
                          onClick={() => setSelectedSpecialtyAbility(name)}
                          className={`p-2 border rounded cursor-pointer transition-all flex items-start gap-2 ${
                            selectedSpecialtyAbility === name ? 'bg-white border-[#721c15] shadow-sm' : 'border-[#1a1311]/10 hover:bg-white/40'
                          }`}
                        >
                          <div className={`p-1 rounded-full shrink-0 ${selectedSpecialtyAbility === name ? 'bg-[#721c15] text-[#fdfaf4]' : 'bg-[#ebdcb9] text-[#1a1311]'}`}>
                            <SafeIcon name={data.icon} size={12} />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[11px] font-black tracking-tight leading-none">{name}</span>
                            <span className="block text-[10px] opacity-70 leading-tight font-serif mt-0.5">{data.text}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] italic opacity-50">Select Profession to populate asset parameters</span>
                    )}
                  </div>
                </div>

                {/* 3. Gear Ledger */}
                <div className="bg-[#ebdcb9]/60 border border-[#1a1311]/20 p-3 rounded space-y-2">
                  <div className="flex justify-between items-center border-b border-[#1a1311]/10 pb-0.5">
                    <span className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#721c15]">Ledger of Starting Gear</span>
                    <span className="text-[9px] font-sans font-black opacity-60">({selectedGear.length}/3)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[11px] max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {ROLES[role].specialties[specialty] && ROLES[role].specialties[specialty].gear.map(item => (
                      <div 
                        key={item} 
                        onClick={() => toggleGear(item)}
                        className={`flex items-center gap-1.5 p-1 rounded cursor-pointer select-none transition-colors ${
                          selectedGear.includes(item) ? 'bg-[#721c15]/10 font-bold' : 'hover:bg-white/30'
                        }`}
                      >
                        <div className={`w-3 h-3 border border-[#1a1311] flex items-center justify-center rounded-sm text-[8px] ${selectedGear.includes(item) ? 'bg-[#721c15] text-white' : 'bg-transparent'}`}>
                          {selectedGear.includes(item) && "✓"}
                        </div>
                        <span className="opacity-90 truncate">{item} <span className="text-[8px] text-[#721c15] font-sans uppercase font-black tracking-tighter">[Sig]</span></span>
                      </div>
                    ))}
                    {STANDARD_GEAR.map(item => (
                      <div 
                        key={item} 
                        onClick={() => toggleGear(item)}
                        className={`flex items-center gap-1.5 p-1 rounded cursor-pointer select-none transition-colors ${
                          selectedGear.includes(item) ? 'bg-[#721c15]/10 font-bold' : 'hover:bg-white/30'
                        }`}
                      >
                        <div className={`w-3 h-3 border border-[#1a1311] flex items-center justify-center rounded-sm text-[8px] ${selectedGear.includes(item) ? 'bg-[#721c15] text-white' : 'bg-transparent'}`}>
                          {selectedGear.includes(item) && "✓"}
                        </div>
                        <span className="opacity-80 truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            STEP 3: CANDELA DOSSIER (Finalized Bureaucratic Statement Preview)
            ========================================================================= */}
        {step === 3 && (
          <div className="animate-fadeIn space-y-6 flex-1 text-sm font-serif">
            <div className="text-center border-b-2 border-[#1a1311] pb-3">
              <h2 className="text-3xl font-black uppercase tracking-tight text-[#1a1311]">Candela Archive Ledger Dossier</h2>
              <p className="text-[10px] font-sans font-black uppercase tracking-widest text-black/50 mt-1">Verified administrative record ready for formal transmission</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-[#1a1311]/20 pb-4">
              <div className="space-y-1 bg-[#ebdcb9]/30 p-3 rounded border border-[#1a1311]/10">
                <span className="block text-[8px] font-sans font-black uppercase tracking-widest text-[#721c15]">01. Core Nomenclature</span>
                <p className="font-bold text-base text-[#1a1311]">{name}</p>
                <p className="text-xs italic opacity-70">{pronouns}</p>
              </div>
              <div className="space-y-1 bg-[#ebdcb9]/30 p-3 rounded border border-[#1a1311]/10">
                <span className="block text-[8px] font-sans font-black uppercase tracking-widest text-[#721c15]">02. Profession</span>
                <p className="font-bold text-base text-[#1a1311]">{role}</p>
                <p className="text-xs font-sans font-black tracking-wide text-[#721c15]/80 uppercase">{specialty}</p>
              </div>
              <div className="space-y-1 bg-[#ebdcb9]/30 p-3 rounded border border-[#1a1311]/10">
                <span className="block text-[8px] font-sans font-black uppercase tracking-widest text-[#721c15]">03. Summary of Value to Institute</span>
                <p className="font-bold text-base text-[#1a1311]">2 Assets Identified</p>
                <p className="text-xs opacity-70 truncate">{selectedGear.length} Equipment Items Noted</p>
              </div>
            </div>

            <div className="space-y-3 bg-[#ebdcb9]/20 p-4 border border-dashed border-[#1a1311]/30 rounded">
              <div>
                <span className="block text-[8px] font-sans font-black uppercase tracking-widest text-[#721c15]">Administrative Catalyst Record</span>
                <p className="text-xs italic leading-relaxed text-[#1a1311]/90 mt-0.5">"{catalyst}"</p>
              </div>
              <div className="pt-2 border-t border-[#1a1311]/10">
                <span className="block text-[8px] font-sans font-black uppercase tracking-widest text-[#721c15]">Core Inquiry Matrix</span>
                <p className="text-xs leading-relaxed text-[#1a1311]/90 mt-0.5">"{question}"</p>
              </div>
            </div>

            <div className="text-center py-2 opacity-60 font-sans font-black tracking-widest text-[9px] uppercase animate-pulse">
              ⚠️ Warning: This dossier is pending final review. Ensure all information is accurate and complete before submission.
            </div>
          </div>
        )}

        {/* =========================================================================
            MECHANICAL ROW CONTROLLER NAVIGATION BUTTONS
            ========================================================================= */}
        <div className="flex justify-between items-center border-t border-[#1a1311]/20 pt-4 mt-6">
          <div>
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-4 py-1.5 border border-[#1a1311] font-sans font-black text-xs uppercase tracking-widest hover:bg-[#1a1311] hover:text-[#fdfaf4] transition-all rounded shadow-sm"
              >
                Back Log
              </button>
            )}
          </div>

          <div>
            {step < 3 ? (
              <button 
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? (!name || !role || !specialty) : (!catalyst || !selectedRoleAbility || !selectedSpecialtyAbility)}
                className={`px-5 py-1.5 bg-[#1a1311] text-[#fdfaf4] font-sans font-black text-xs uppercase tracking-widest hover:bg-[#721c15] transition-all rounded shadow shadow-black/20 ${
                  (step === 1 ? (!name || !role || !specialty) : (!catalyst || !selectedRoleAbility || !selectedSpecialtyAbility)) ? 'opacity-30 cursor-not-allowed' : ''
                }`}
              >
                Advance
              </button>
            ) : (
              <button 
                onClick={handleComplete}
                className="px-6 py-2 bg-[#721c15] text-[#fdfaf4] border-2 border-[#1a1311] font-sans font-black text-xs uppercase tracking-widest hover:bg-red-800 transition-all rounded shadow-md shadow-black/30"
              >
                Finalize Dossier Ledger
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};