import React, { useState } from 'react';
import * as Gi from "react-icons/gi";

// Standard equipment issue ledger available to all investigators
const STANDARD_GEAR = [
  "Bleed Detector", "Bleed Containment Vial", "Hand Weapon", "Lantern", "Matches & Candles", "First Aid Kit"
];

// Complete Thematic Mapping Configuration Built from Spreadsheet Records
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

const BrassCornerFiligree = () => (
  <>
    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#d4af37]" />
    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#d4af37]" />
    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#d4af37]" />
    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#d4af37]" />
  </>
);

const SafeIcon = ({ name, size = 24, className = "" }) => {
  if (!name || !Gi[name]) return <div style={{ width: size, height: size }} className="bg-[#b8860b]/10 border border-dashed border-[#b8860b]/40 rounded" />;
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

  const handleRoleChange = (e) => {
    setRole(e.target.value); setSpecialty(""); 
    setSelectedRoleAbility(""); setSelectedSpecialtyAbility(""); setSelectedGear([]);
  };

  const toggleGear = (item) => {
    if (selectedGear.includes(item)) setSelectedGear(selectedGear.filter(g => g !== item));
    else if (selectedGear.length < 3) setSelectedGear([...selectedGear, item]);
  };

  const handleComplete = () => {
    if (onSubmit) onSubmit({ name, pronouns, style, catalyst, question, role, specialty, roleAbility: selectedRoleAbility, specialtyAbility: selectedSpecialtyAbility, gear: selectedGear, profilePic });
  };

  const renderDots = (count, max = 3, color = "bg-[#e5c158]") => (
    <div className="flex gap-2 bg-black/50 p-2 rounded-md border border-[#3e2f29]">
      {[...Array(max)].map((_, i) => (
        <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 border-[#160f0d] ${i < count ? color : 'bg-[#1c1412]'}`} />
      ))}
    </div>
  );

  const renderBoxes = (count = 3) => (
    <div className="flex gap-2">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="w-6 h-6 border-2 border-[#1a1311] bg-white/70 shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)] rounded-sm" />
      ))}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#1c1311] via-[#0f0a09] to-[#050303] text-[#1a1311] flex flex-col font-sans">
      
      {/* =========================================================================
          THE DNDBEYOND-STYLE WEBSITE HEADER
          ========================================================================= */}
      <header className="w-full bg-gradient-to-r from-[#211714] via-[#2d201c] to-[#211714] border-b-4 border-[#e5c158] px-6 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.8)] z-30 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black/40 border border-[#e5c158]/50 rounded-lg text-[#e5c158]">
            <Gi.GiCandleSkull size={32} />
          </div>
          <div>
            <span className="font-serif text-2xl font-black tracking-widest text-[#f6f3eb] uppercase block">Candela Obscura</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#e5c158]/80 block">Order Management Hub v4.26</span>
          </div>
        </div>
        <nav className="flex items-center gap-6 text-xs font-black uppercase tracking-wider text-[#f6f3eb]/70">
          <a href="#dashboard" className="hover:text-[#e5c158] transition-colors border-b-2 border-transparent hover:border-[#e5c158] pb-1">Campaign Grid</a>
          <a href="#dossier" className="text-[#e5c158] border-b-2 border-[#e5c158] pb-1">Character Forge</a>
          <a href="#archives" className="hover:text-[#e5c158] transition-colors border-b-2 border-transparent hover:border-[#e5c158] pb-1">Lore Vault</a>
        </nav>
      </header>

      {/* Main Structural Body Viewport */}
      <div className="w-full flex-1 flex flex-col lg:flex-row shadow-[inset_0_4px_30px_rgba(0,0,0,0.5)]">
        
        {/* =========================================================================
            THEMATIC CAMPAIGN STATUS SIDEBAR PANEL (LEFT)
            ========================================================================= */}
        <aside className="w-full lg:w-64 bg-[#1e1513] border-b-2 lg:border-b-0 lg:border-r-2 border-[#3e2f29] p-5 text-[#f6f3eb]/80 flex flex-col gap-6 z-20">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#e5c158] border-b border-[#3e2f29] pb-2 mb-3">Circle Status</h3>
            <div className="bg-black/30 border border-[#3e2f29] p-3 rounded space-y-2 text-xs font-bold">
              <div className="flex justify-between"><span>Current Target:</span> <span className="text-[#e5c158]">The Red Tide</span></div>
              <div className="flex justify-between"><span>Sanctum:</span> <span className="text-white">Redfield Library</span></div>
              <div className="flex justify-between"><span>Active Illumination:</span> <span className="text-emerald-400">3 / 12</span></div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#e5c158] border-b border-[#3e2f29] pb-2 mb-3">Circle Operatives</h3>
            <div className="space-y-2">
              <div className="p-2.5 bg-black/20 border-l-4 border-emerald-500 rounded text-xs flex justify-between items-center">
                <span className="font-bold text-white">Arthur Vance</span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 bg-emerald-900 text-emerald-200 rounded">Doctor</span>
              </div>
              <div className="p-2.5 bg-black/40 border-l-4 border-[#e5c158] rounded text-xs flex justify-between items-center">
                <span className="font-bold text-white">{name || "New Registry"}</span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 bg-[#b8860b]/40 text-[#e5c158] rounded">{specialty || "Unset"}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER CONSOLE WORKSPACE (MAHOGANY BUREAU VISUAL PAD) */}
        <main className="flex-1 bg-gradient-to-br from-[#261b18] via-[#16100e] to-[#0f0a09] p-3 md:p-8 flex items-center justify-center relative shadow-[inset_0_0_80px_rgba(0,0,0,0.8)]">
          <div className="w-full max-w-5xl bg-[#1d2726] p-2 md:p-5 rounded-xl border-4 border-[#3e2c21] shadow-[0_30px_70px_rgba(0,0,0,0.9)] relative">
            <div className="absolute inset-0 bg-black/20 rounded-lg pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.7)]" />

            {/* HIGH-CONTRAST PARCHMENT INTERACTIVE SHEET */}
            <div className="bg-[#f5ebd6] relative shadow-2xl border-4 border-double border-[#1a1311] p-5 md:p-8 flex flex-col min-h-[820px] rounded-sm">
              <BrassCornerFiligree />
              
              {/* Card Header Pipeline */}
              <div className="text-center mb-6 border-b-4 border-double border-[#1a1311] pb-5 relative">
                <h1 className="text-3xl md:text-4xl font-serif text-[#1a1311] tracking-wider uppercase font-black">
                  {step === 1 ? "I. Registration" : step === 2 ? "II. Interview" : "III. Candela Dossier"}
                </h1>
                
                {/* HIGH-CONTRAST SEPARATOR BRIDGES */}
                <div className="w-64 h-0.5 bg-gradient-to-r from-transparent via-[#721c15] to-transparent mx-auto mt-2" />
                
                <div className="flex justify-center gap-6 mt-4 text-[11px] font-black uppercase tracking-widest text-[#1a1311]/70">
                  <span className={step === 1 ? 'text-[#721c15] scale-105 border-b-2 border-[#721c15] pb-0.5 font-black' : ''}>1.Registration </span>
                  <span>•</span>
                  <span className={step === 2 ? 'text-[#721c15] scale-105 border-b-2 border-[#721c15] pb-0.5 font-black' : ''}>2.Interview </span>
                  <span>•</span>
                  <span className={step === 3 ? 'text-[#721c15] scale-105 border-b-2 border-[#721c15] pb-0.5 font-black' : ''}>3.Candela Dossier </span>
                </div>
              </div>

              {/* Module Flow Controls */}
              <div className="flex-1 overflow-y-auto pr-2">
                
                {/* --- STEP 1: IDENTITY SCHEMA --- */}
                {step === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 flex flex-col items-center md:border-r-2 border-dashed border-[#1a1311]/20 md:pr-6">
                      <div className="w-48 h-64 border-4 border-double border-[#1a1311] bg-[#1a1311]/5 mb-3 relative flex items-center justify-center overflow-hidden bg-[#eadecd] shadow-inner">
                        {profilePic ? (
                          <img src={profilePic} alt="Affixed likeness" className="object-cover w-full h-full grayscale transition-all duration-300" />
                        ) : (
                          <div className="text-center p-4">
                            <span className="text-5xl block font-black text-[#721c15] mb-2">[ + ]</span>
                            <span className="font-serif text-xs font-black text-[#1a1311] tracking-widest uppercase">Affix Portrait</span>
                          </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#721c15]/80 text-center leading-tight">Portrait or Headshot Required for Prompt Applicant Registration</p>
                    </div>
                    
                    <div className="md:col-span-2 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-[#ebdcb9] p-3 border-2 border-[#1a1311]/60 rounded shadow-inner">
                          <label className="block text-xs font-black uppercase mb-1 text-[#721c15] tracking-wider">Investigator Appellation</label>
                          <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 bg-transparent border-b border-[#1a1311] font-serif text-lg font-black focus:border-[#721c15] focus:outline-none text-[#1a1311]" placeholder="Full Name" />
                        </div>
                        <div className="bg-[#ebdcb9] p-3 border-2 border-[#1a1311]/60 rounded shadow-inner">
                          <label className="block text-xs font-black uppercase mb-1 text-[#721c15] tracking-wider">Gender</label>
                          <input type="text" value={pronouns} onChange={e => setPronouns(e.target.value)} className="w-full p-2 bg-transparent border-b border-[#1a1311] font-serif text-lg font-black focus:border-[#721c15] focus:outline-none text-[#1a1311]" placeholder="e.g. He/They" />
                        </div>
                      </div>

                      <div className="bg-[#ebdcb9] p-4 border-2 border-[#1a1311]/60 rounded-lg shadow-inner transition-all hover:border-[#721c15]">
                          <label className="text-xs font-black uppercase mb-2 text-[#721c15] tracking-wider flex items-center gap-2">
                            <span>Attributes</span>
                          </label>
                          <textarea 
                            value={style} 
                            onChange={e => setStyle(e.target.value)} 
                            className="w-full p-2.5 bg-[#fdfaf4]/40 border-2 border-[#1a1311]/20 rounded font-serif text-sm font-bold focus:border-[#721c15] focus:bg-[#fdfaf4] focus:outline-none text-[#1a1311] h-20 resize-none leading-relaxed shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] transition-colors placeholder-[#1a1311]/40" 
                            placeholder="e.g., A tailored but frayed charcoal overcoat, heavy shadows beneath fatigued eyes, ink-stained knuckles, and a silver pocket watch that ticks slightly out of sync..." 
                          />
                          <span className="text-[10px] font-bold text-[#721c15]/70 mt-1 block italic">
                            * Note down any notable scars, unique garments, or strange personal heirlooms carried on your person.
                          </span>
                        </div>`

                      <div className="bg-[#ebdcb9] p-3 border-2 border-[#1a1311]/60 rounded shadow-inner">
                        <label className="block text-xs font-black uppercase mb-1 text-[#721c15] tracking-wider">Record your Catalyst: Why do you seek Candela Obscura?</label>
                        <textarea value={catalyst} onChange={e => setCatalyst(e.target.value)} className="w-full p-2 bg-transparent border border-[#1a1311]/40 font-serif text-sm focus:border-[#721c15] font-medium focus:outline-none h-14 resize-none text-[#1a1311] leading-relaxed" placeholder="Record the incident that tore down the structural veil..." />
                      </div>

                      <div className="bg-[#ebdcb9] p-3 border-2 border-[#1a1311]/60 rounded shadow-inner">
                        <label className="block text-xs font-black uppercase mb-1 text-[#721c15] tracking-wider">Convey your Curiosity: What answers are you demanding?</label>
                        <textarea value={question} onChange={e => setQuestion(e.target.value)} className="w-full p-2 bg-transparent border border-[#1a1311]/40 font-serif text-sm focus:border-[#721c15] font-medium focus:outline-none h-14 resize-none text-[#1a1311] leading-relaxed" placeholder="What core revelation demands your complete sacrifice?" />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-double border-[#1a1311]/20">
                        <div className="bg-[#1a1311] p-4 rounded-lg border-2 border-[#e5c158] shadow-xl">
                          <label className="block text-xs font-bold uppercase mb-2 text-[#f5ebd6] tracking-widest">Select Core Archetype</label>
                          <select value={role} onChange={handleRoleChange} className="w-full p-3 bg-[#261b18] text-[#e5c158] font-serif text-md rounded border border-[#e5c158]/30 focus:outline-none cursor-pointer font-black tracking-wide">
                            <option value="" disabled>-- Choose Role --</option>
                            {Object.keys(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        {role && (
                          <div className="bg-[#1a1311] p-4 rounded-lg border-2 border-[#e5c158] shadow-xl">
                            <label className="block text-xs font-bold uppercase mb-2 text-[#f5ebd6] tracking-widest">Select Specialized Field</label>
                            <select value={specialty} onChange={e => {setSpecialty(e.target.value); setSelectedGear([]); setSelectedSpecialtyAbility("")}} className="w-full p-3 bg-[#261b18] text-[#e5c158] font-serif text-md rounded border border-[#e5c158]/30 focus:outline-none cursor-pointer font-black tracking-wide">
                              <option value="" disabled>-- Choose Specialty --</option>
                              {Object.keys(ROLES[role].specialties).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        )}
                      </div>

                      {role && specialty && (
                        <div className="bg-white/60 border-2 border-[#1a1311]/40 rounded-lg p-4 flex gap-4 items-center shadow-sm">
                          <div className="text-[#721c15] p-2 bg-black/5 rounded border border-black/10">
                            <SafeIcon name={ROLES[role].specialties[specialty].icon} size={36} />
                          </div>
                          <div>
                            <h4 className="font-serif font-black text-[#721c15] text-lg uppercase tracking-wider">{specialty} Field Overview</h4>
                            <p className="text-xs font-bold text-[#1a1311] mt-0.5 leading-relaxed">{ROLES[role].specialties[specialty].description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- STEP 2: MECHANICS CONFIGURATIONS --- */}
                {step === 2 && role && specialty && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h2 className="font-serif text-xl font-black text-[#721c15] border-b-2 border-[#1a1311] pb-1.5 uppercase tracking-wide">Traits</h2>
                      
                      <div className="space-y-3">
                        <span className="text-xs font-black uppercase text-[#1a1311] tracking-wider block">1. Core Role Asset ({role})</span>
                        {Object.entries(ROLES[role].baseAbilities).map(([aName, aDesc]) => (
                          <button key={aName} onClick={() => setSelectedRoleAbility(aName)} className={`w-full text-left p-4 border-2 transition-all rounded-lg flex gap-4 items-start ${selectedRoleAbility === aName ? 'bg-[#1a1311] text-[#f5ebd6] border-[#e5c158] shadow-2xl' : 'border-[#1a1311]/30 text-[#1a1311] hover:border-[#721c15] bg-white/50'}`}>
                            <div className={`mt-0.5 p-1.5 rounded border ${selectedRoleAbility === aName ? 'bg-black/40 text-[#e5c158] border-[#e5c158]/30' : 'bg-black/5 text-[#721c15] border-black/10'}`}>
                              <SafeIcon name={aDesc.icon} size={28} /> {/* INCREASED SIZE */}
                            </div>
                            <div>
                              <span className={`font-serif font-black text-base block ${selectedRoleAbility === aName ? 'text-[#e5c158]' : 'text-[#721c15]'}`}>{aName}</span>
                              <span className="text-xs mt-1 block font-bold leading-relaxed opacity-95">{aDesc.text}</span>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="space-y-3 pt-2">
                        <span className="text-xs font-black uppercase text-[#1a1311] tracking-wider block">2. Specialty Asset ({specialty})</span>
                        {Object.entries(ROLES[role].specialties[specialty].abilities).map(([aName, aDesc]) => (
                          <button key={aName} onClick={() => setSelectedSpecialtyAbility(aName)} className={`w-full text-left p-4 border-2 transition-all rounded-lg flex gap-4 items-start ${selectedSpecialtyAbility === aName ? 'bg-[#1a1311] text-[#f5ebd6] border-[#e5c158] shadow-2xl' : 'border-[#1a1311]/30 text-[#1a1311] hover:border-[#721c15] bg-white/50'}`}>
                            <div className={`mt-0.5 p-1.5 rounded border ${selectedSpecialtyAbility === aName ? 'bg-black/40 text-[#e5c158] border-[#e5c158]/30' : 'bg-black/5 text-[#721c15] border-black/10'}`}>
                              <SafeIcon name={aDesc.icon} size={28} /> {/* INCREASED SIZE */}
                            </div>
                            <div>
                              <span className={`font-serif font-black text-base block ${selectedSpecialtyAbility === aName ? 'text-[#e5c158]' : 'text-[#721c15]'}`}>{aName}</span>
                              <span className="text-xs mt-1 block font-bold leading-relaxed opacity-95">{aDesc.text}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h2 className="font-serif text-xl font-black text-[#721c15] border-b-2 border-[#1a1311] pb-1.5 uppercase tracking-wide">Gear Request</h2>
                      <div className="text-xs font-bold text-[#1a1311] my-3 bg-[#ebdcb9] p-3 border-2 border-[#1a1311]/40 rounded shadow-inner leading-relaxed">
                        Every Assignment you may request three items from Candela Obscura ({selectedGear.length}/3 verified).
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-white/60 p-4 border-2 border-[#1a1311]/30 rounded-lg shadow-sm">
                          <span className="text-xs font-black uppercase tracking-wider mb-2 block text-[#721c15]">{specialty} Specific Loadout</span>
                          <div className="grid grid-cols-1 gap-2">
                            {ROLES[role].specialties[specialty].gear.map(item => (
                              <button key={item} onClick={() => toggleGear(item)} className={`p-3 text-left border rounded-md transition-all text-sm font-black flex justify-between items-center ${selectedGear.includes(item) ? 'bg-[#1a1311] text-[#f5ebd6] border-[#1a1311] shadow-xl' : 'bg-[#f5ebd6]/60 border-[#1a1311]/20 text-[#1a1311] hover:bg-white hover:border-[#1a1311]'}`}>
                                <span>{item}</span>
                                {selectedGear.includes(item) && <span className="text-xs text-[#e5c158] tracking-widest font-black">[ READY ]</span>}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="bg-white/60 p-4 border-2 border-[#1a1311]/30 rounded-lg shadow-sm">
                          <span className="text-xs font-black uppercase tracking-wider mb-2 block text-[#1a1311]/70">Standard Gear</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {STANDARD_GEAR.map(item => (
                              <button key={item} onClick={() => toggleGear(item)} className={`p-2.5 text-left text-xs border rounded-md transition-all font-black flex justify-between items-center ${selectedGear.includes(item) ? 'bg-[#1a1311] text-[#f5ebd6] border-[#1a1311] shadow-xl' : 'bg-transparent border-[#1a1311]/20 text-[#1a1311] hover:bg-white hover:border-[#1a1311]'}`}>
                                <span>{item}</span>
                                {selectedGear.includes(item) && <span className="text-[#e5c158] text-xs font-black">[✓]</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* --- STEP 3: HIGH-CONTRAST VISUAL LEDGER SHEET --- */}
                {step === 3 && (
                  <div className="bg-[#fdfaf4] border-4 border-double border-[#1a1311] p-5 md:p-6 shadow-2xl relative text-[#1a1311] rounded-lg flex flex-col gap-5">
                    
                    {/* FULL ROW HEADER WITH PORTRAIT MATCHING DESTINATION HEIGHT */}
                    <div className="border-b-4 border-[#1a1311] pb-5 flex flex-col md:flex-row gap-6 items-stretch relative">
                      
                      {/* LEFT COLUMN: Full Height Portrait */}
                      <div className="flex flex-col justify-stretch flex-shrink-0">
                        {profilePic ? (
                          <img 
                            src={profilePic} 
                            alt="Dossier portrait" 
                            className="w-32 md:w-36 h-full object-cover border-2 border-[#1a1311] grayscale bg-white shadow-xl rounded-md" 
                          />
                        ) : (
                          <div className="w-32 md:w-36 h-full min-h-[180px] border-2 border-dashed border-[#1a1311]/40 flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-center p-3 bg-black/5 rounded-md leading-relaxed">
                            Portrait Not Affixed
                          </div>
                        )}
                      </div>
                      
                      {/* RIGHT COLUMN: Attributes & Narrative Data stacked vertically */}
                      <div className="flex-1 flex flex-col justify-between gap-4">
                        
                        {/* Row 1: Core Identity Marks */}
                        <div className="border-b border-[#1a1311]/10 pb-2">
                          <h2 className="text-3xl md:text-4xl font-serif uppercase tracking-wide font-black m-0 text-[#1a1311] leading-tight">
                            {name || "Anonymous Active Agent"}
                          </h2>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-black uppercase tracking-widest text-[#721c15] mt-1">
                            <span>Gender: {pronouns || "Unlisted"}</span>
                            <span>Role: {role}</span>
                            <span>Specialty: {specialty}</span>
                          </div>
                        </div>
                        
                        {/* Row 2: Shared Motivations Enclosures */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold leading-relaxed">
                          <div className="bg-[#ebdcb9]/20 p-2.5 border border-[#1a1311]/20 rounded-md">
                            <span className="font-black uppercase tracking-widest block text-[9px] text-[#721c15] mb-0.5">Origin Catalyst</span>
                            <p className="italic font-medium text-[#1a1311]">{catalyst || "No narrative parameter logged."}</p>
                          </div>
                          <div className="bg-[#ebdcb9]/20 p-2.5 border border-[#1a1311]/20 rounded-md">
                            <span className="font-black uppercase tracking-widest block text-[9px] text-[#721c15] mb-0.5">Focus Target Question</span>
                            <p className="italic font-medium text-[#1a1311]">{question || "No narrative parameter logged."}</p>
                          </div>
                        </div>

                        {/* Row 3: Physical Description Banner Panel */}
                        <div className="bg-[#ebdcb9]/40 p-3 border border-[#1a1311]/30 rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] text-left">
                          <span className="font-black uppercase tracking-widest text-[9px] text-[#721c15] block mb-1">Attire & Physical Appearance</span> 
                          <p className="text-[#1a1311] font-bold font-serif text-xs leading-relaxed whitespace-pre-line">
                            {style || "No specific physical descriptions cataloged in active files."}
                          </p>
                        </div>

                      </div>

                    </div>

                    {/* FAUX-LEATHER ENCLOSURES WITH Monumental 40px SPECIFIC ATTRIBUTE TOKENS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-bold">
                      
                      {/* NERVE MODULE MATRIX */}
                      <div className="bg-gradient-to-b from-[#1e1412] to-[#120b0a] border-2 border-[#31221e] text-[#f6f3eb] p-4 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.85),0_8px_16px_rgba(0,0,0,0.4)] relative">
                        {/*Monumental Attribute Token Added */}
                        <div className="absolute top-3 right-3 text-[#e5c158]/20"><SafeIcon name="GiGauntlet" size={40} /></div>
                        <div className="border-b border-[#e5c158]/30 pb-2 mb-3">
                          <span className="text-base font-serif font-black uppercase tracking-widest text-[#e5c158] block">Nerve</span>
                          <div className="flex justify-between items-center mt-1 text-[10px] font-black uppercase tracking-wider text-white/60">
                            <span>Drive Maximum: {ROLES[role].specialties[specialty].stats.nerve.max}</span>
                            <span>Resistance: {Math.floor(ROLES[role].specialties[specialty].stats.nerve.max / 3)}</span>
                          </div>
                        </div>
                        <div className="space-y-2.5 text-sm font-serif font-black">
                          <div className="flex justify-between items-center"><span>Move</span> {renderDots(ROLES[role].specialties[specialty].stats.nerve.move, 3, "bg-[#e5c158]")}</div>
                          <div className="flex justify-between items-center"><span>Strike</span> {renderDots(ROLES[role].specialties[specialty].stats.nerve.strike, 3, "bg-[#e5c158]")}</div>
                          <div className="flex justify-between items-center"><span>Control</span> {renderDots(ROLES[role].specialties[specialty].stats.nerve.control, 3, "bg-[#e5c158]")}</div>
                        </div>
                      </div>

                      {/* CUNNING MODULE MATRIX */}
                      <div className="bg-gradient-to-b from-[#1e1412] to-[#120b0a] border-2 border-[#31221e] text-[#f6f3eb] p-4 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.85),0_8px_16px_rgba(0,0,0,0.4)] relative">
                        {/*Monumental Attribute Token Added */}
                        <div className="absolute top-3 right-3 text-[#e5c158]/20"><SafeIcon name="GiSmokeBomb" size={40} /></div>
                        <div className="border-b border-[#e5c158]/30 pb-2 mb-3">
                          <span className="text-base font-serif font-black uppercase tracking-widest text-[#e5c158] block">Cunning</span>
                          <div className="flex justify-between items-center mt-1 text-[10px] font-black uppercase tracking-wider text-white/60">
                            <span>Drive Maximum: {ROLES[role].specialties[specialty].stats.cunning.max}</span>
                            <span>Resistance: {Math.floor(ROLES[role].specialties[specialty].stats.cunning.max / 3)}</span>
                          </div>
                        </div>
                        <div className="space-y-2.5 text-sm font-serif font-black">
                          <div className="flex justify-between items-center"><span>Sway</span> {renderDots(ROLES[role].specialties[specialty].stats.cunning.sway, 3, "bg-[#e5c158]")}</div>
                          <div className="flex justify-between items-center"><span>Read</span> {renderDots(ROLES[role].specialties[specialty].stats.cunning.read, 3, "bg-[#e5c158]")}</div>
                          <div className="flex justify-between items-center"><span>Hide</span> {renderDots(ROLES[role].specialties[specialty].stats.cunning.hide, 3, "bg-[#e5c158]")}</div>
                        </div>
                      </div>

                      {/* INTUITION MODULE MATRIX */}
                      <div className="bg-gradient-to-b from-[#1e1412] to-[#120b0a] border-2 border-[#31221e] text-[#f6f3eb] p-4 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.85),0_8px_16px_rgba(0,0,0,0.4)] relative">
                        {/*Monumental Attribute Token Added */}
                        <div className="absolute top-3 right-3 text-[#e5c158]/20"><SafeIcon name="GiStarSwirl" size={40} /></div>
                        <div className="border-b border-[#e5c158]/30 pb-2 mb-3">
                          <span className="text-base font-serif font-black uppercase tracking-widest text-[#e5c158] block">Intuition</span>
                          <div className="flex justify-between items-center mt-1 text-[10px] font-black uppercase tracking-wider text-white/60">
                            <span>Drive Maximum: {ROLES[role].specialties[specialty].stats.intuition.max}</span>
                            <span>Resistance: {Math.floor(ROLES[role].specialties[specialty].stats.intuition.max / 3)}</span>
                          </div>
                        </div>
                        <div className="space-y-2.5 text-sm font-serif font-black">
                          <div className="flex justify-between items-center"><span>Survey</span> {renderDots(ROLES[role].specialties[specialty].stats.intuition.survey, 3, "bg-[#e5c158]")}</div>
                          <div className="flex justify-between items-center"><span>Focus</span> {renderDots(ROLES[role].specialties[specialty].stats.intuition.focus, 3, "bg-[#e5c158]")}</div>
                          <div className="flex justify-between items-center"><span>Sense</span> {renderDots(ROLES[role].specialties[specialty].stats.intuition.sense, 3, "bg-[#e5c158]")}</div>
                        </div>
                      </div>
                    </div>

                    {/* Split Infrastructure Layout Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t-2 border-[#1a1311] pt-5 mt-1">
                      <div className="space-y-5">
                        <div>
                          <div className="uppercase font-black tracking-widest text-xs border-b-2 border-[#1a1311] pb-1 mb-2.5 text-[#721c15]">Marks</div>
                          <div className="space-y-2.5 font-serif text-sm font-bold bg-white/50 p-3 rounded border border-[#1a1311]/20 shadow-inner">
                            <div className="flex justify-between items-center"><span>Body (Physical Harm)</span> {renderBoxes(3)}</div>
                            <div className="flex justify-between items-center"><span>Brain (Mental Chaos)</span> {renderBoxes(3)}</div>
                            <div className="flex justify-between items-center"><span>Bleed (Arcane Infection)</span> {renderBoxes(3)}</div>
                          </div>
                        </div>
                        <div>
                          <div className="uppercase font-black tracking-widest text-xs border-b-2 border-[#1a1311] pb-1 mb-2 text-[#721c15]">Illumination Keys</div>
                          <ul className="list-disc pl-5 text-xs italic font-black space-y-1 text-[#1a1311]/90 leading-relaxed">
                            {ROLES[role].keys.map(k => <li key={k}>{k}</li>)}
                          </ul>
                        </div>
                      </div>

                      {/* Capabilities Matrix Viewport */}
                      <div className="space-y-5">
                        <div>
                          <div className="uppercase font-black tracking-widest text-xs border-b-2 border-[#1a1311] pb-1 mb-2.5 text-[#721c15]">Traits</div>
                          <div className="space-y-3.5 bg-white/50 p-3 rounded border border-[#1a1311]/20 shadow-inner">
                            <div className="text-sm">
                              <span className="font-serif font-black text-[#1a1311] text-base flex items-center gap-2">
                                <SafeIcon name={ROLES[role].baseAbilities[selectedRoleAbility].icon} size={20} className="text-[#721c15]" />
                                {selectedRoleAbility}
                              </span> 
                              <span className="font-bold block mt-1 text-xs text-[#1a1311]/90 leading-relaxed">{ROLES[role].baseAbilities[selectedRoleAbility].text}</span>
                            </div>
                            
                            {/* CRISP ACCENT DIVIDERS */}
                            <div className="border-t border-[#721c15]/20 my-1.5" />
                            
                            <div className="text-sm">
                              <span className="font-serif font-black text-[#1a1311] text-base flex items-center gap-2">
                                <SafeIcon name={ROLES[role].specialties[specialty].abilities[selectedSpecialtyAbility].icon} size={20} className="text-[#721c15]" />
                                {selectedSpecialtyAbility}
                              </span> 
                              <span className="font-bold block mt-1 text-xs text-[#1a1311]/90 leading-relaxed">{ROLES[role].specialties[specialty].abilities[selectedSpecialtyAbility].text}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="uppercase font-black tracking-widest text-xs border-b-2 border-[#1a1311] pb-1 mb-2 text-[#721c15]">Equipped Gear</div>
                          <div className="flex flex-wrap gap-1.5 bg-white/50 p-3 rounded border border-[#1a1311]/20 shadow-inner">
                            {selectedGear.map(g => (
                              <span key={g} className="px-3 py-1.5 bg-[#1a1311] border border-[#e5c158]/50 text-[#f5ebd6] text-xs font-black uppercase rounded shadow-md tracking-wider">{g}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Steppers Footer */}
              <div className="mt-6 pt-4 border-t-2 border-[#1a1311] flex justify-between items-center z-10">
                <button 
                  onClick={() => setStep(step - 1)}
                  disabled={step === 1}
                  className="px-5 py-2 border-2 border-[#1a1311] bg-[#eadecd]/60 hover:bg-[#1a1311] hover:text-[#f5ebd6] text-[#1a1311] font-black uppercase tracking-widest text-xs rounded transition-all disabled:opacity-10"
                >
                  &lt; Back
                </button>
                
                {step < 3 ? (
                  <button 
                    onClick={() => setStep(step + 1)}
                    disabled={(step === 1 && (!name || !role || !specialty)) || (step === 2 && (!selectedRoleAbility || !selectedSpecialtyAbility || selectedGear.length !== 3))}
                    className="px-7 py-3 bg-[#1a1311] text-[#f5ebd6] font-serif tracking-widest uppercase hover:bg-white hover:text-[#1a1311] border-2 border-[#1a1311] transition-all font-black rounded shadow-xl disabled:opacity-20 text-xs"
                  >
                    {step === 2 && selectedGear.length !== 3 ? `Equip Kit (${selectedGear.length}/3)` : "Next Phase"}
                  </button>
                ) : (
                  <button 
                    onClick={handleComplete}
                    className="px-10 py-3.5 bg-[#721c15] text-white font-serif text-lg tracking-widest uppercase hover:bg-[#1a1311] hover:text-[#e5c158] border-2 border-[#721c15] transition-all shadow-xl font-black rounded"
                  >
                    Finalize Dossier
                  </button>
                )}
              </div>

            </div>
          </div>
        </main>

        {/* =========================================================================
            CAMPAIGN ASSIGNMENT PROGRESS REPORT SIDEBAR PANEL (RIGHT)
            ========================================================================= */}
        <aside className="w-full lg:w-64 bg-[#1e1513] border-t-2 lg:border-t-0 lg:border-l-2 border-[#3e2f29] p-5 text-[#f6f3eb]/80 flex flex-col gap-6 z-20">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#e5c158] border-b border-[#3e2f29] pb-2 mb-3">Active Clocks</h3>
            <div className="space-y-3 text-xs font-bold">
              <div>
                <div className="flex justify-between mb-1"><span>Guard Patrol:</span> <span className="text-amber-400">3 / 4 Boxes</span></div>
                <div className="w-full h-2.5 bg-black/50 rounded overflow-hidden border border-[#3e2f29]">
                  <div className="w-3/4 h-full bg-amber-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1"><span>Bleed Exposure:</span> <span className="text-red-400">1 / 6 Boxes</span></div>
                <div className="w-full h-2.5 bg-black/50 rounded overflow-hidden border border-[#3e2f29]">
                  <div className="w-1/6 h-full bg-red-600" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#e5c158] border-b border-[#3e2f29] pb-2 mb-3">Live Feed Log</h3>
            <div className="p-3 bg-black/30 border border-[#3e2f29] rounded text-[11px] font-medium leading-relaxed font-serif h-48 overflow-y-auto space-y-2 text-[#f6f3eb]/60">
              <p><span className="text-[#e5c158] font-sans font-black">[21:42]</span> Circle forged entry into the apothecary laboratory basement.</p>
              <p><span className="text-[#e5c158] font-sans font-black">[21:48]</span> Arthur Vance resisted a major Bleed puncture mark shock trace.</p>
              <p><span className="text-[#e5c158] font-sans font-black">[22:01]</span> A strange artifact silhouette was securely cataloged.</p>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};