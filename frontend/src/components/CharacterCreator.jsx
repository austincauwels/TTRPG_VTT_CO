// src/components/CharacterCreator.jsx
import React, { useState } from 'react';
import * as Gi from "react-icons/gi";

const STANDARD_GEAR = [
  "Bleed Detector", "Bleed Containment Vial", "Hand Weapon", "Lantern", "Matches & Candles", "First Aid Kit"
];

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

// Muted, moody role palette
const ROLE_COLORS = {
  Face:    { primary: '#9a8235', secondary: '#5a4a1a', rgb: '154,130,53',  cardBg: '#1a150a' },
  Muscle:  { primary: '#7a4822', secondary: '#452310', rgb: '122,72,34',   cardBg: '#150e08' },
  Scholar: { primary: '#1e4f72', secondary: '#0e2940', rgb: '30,79,114',   cardBg: '#08111a' },
  Slink:   { primary: '#2a4d25', secondary: '#152710', rgb: '42,77,37',    cardBg: '#0a1208' },
  Weird:   { primary: '#4a2870', secondary: '#26123c', rgb: '74,40,112',   cardBg: '#110a18' },
};

const CARD_IMAGES = {
  Journalist: '/images/Journalist.png',
  Magician:   '/images/magician.jpg',
  Explorer:   '/images/explorer.png',
  Soldier:    '/images/soldier.png',
  Doctor:     '/images/doctor.png',
  Professor:  '/images/professor.png',
  Criminal:   '/images/criminal.webp',
  Detective:  '/images/detective.jpg',
  Medium:     '/images/medium.jpg',
  Occultist:  '/images/occult.jpg',
};

const GEAR_ICONS = {
  "Bleed Detector":        "GiRadarSweep",
  "Bleed Containment Vial":"GiChemicalDrop",
  "Hand Weapon":           "GiKnifeThrust",
  "Lantern":               "GiLantern",
  "Matches & Candles":     "GiLitCandelabra",
  "First Aid Kit":         "GiFirstAidKit",
  "Press Credentials":     "GiPapers",
  "Camera":                "GiFilmProjector",
  "Hidden Recording Device":"GiMicrophone",
  "Flash Powder":          "GiFireworkRocket",
  "Lockpicks":             "GiLockpicks",
  "Trick Deck of Cards":   "GiCardRandom",
  "Heavy Climbing Gear":   "GiWhip",
  "Machete":               "GiMachete",
  "Vintage Map Collection":"GiTreasureMap",
  "Heavy Firearm":         "GiRevolver",
  "Tactical Armor":        "GiArmorVest",
  "Trench Whistle":        "GiWhistle",
  "Surgical Tools":        "GiScalpel",
  "Heavy Sedatives":       "GiSyringe",
  "Medical Journals":      "GiNotebook",
  "Thick Reference Tome":  "GiBookCover",
  "Chemical Kit":          "GiTestTubes",
  "University Keys":       "GiKey",
  "Advanced Lockpicks":    "GiLockpicks",
  "Forged Documents":      "GiScrollUnfurled",
  "Concealed Blade":       "GiStiletto",
  "Magnifying Glass":      "GiMagnifyingGlass",
  "Evidence Bags":         "GiSuitcase",
  "Concealed Pistol":      "GiPistolGun",
  "Spirit Board":          "GiCrystalBall",
  "Ectoplasm Vial":        "GiGhost",
  "Tarot Deck":            "GiCardRandom",
  "Arcane Texts":          "GiSpellBook",
  "Occult Supplies":       "GiCauldron",
  "Ritual Dagger":         "GiKnifeThrust",
};

const ACTION_DRIVES = [
  { drive: 'Nerve',     color: '#7a4822', bgColor: 'rgba(122,72,34,0.1)',   statsKey: 'nerve',
    actions: [{ key: 'move', label: 'Drive' }, { key: 'strike', label: 'Strike' }, { key: 'control', label: 'Control' }] },
  { drive: 'Cunning',   color: '#2a4d25', bgColor: 'rgba(42,77,37,0.1)',    statsKey: 'cunning',
    actions: [{ key: 'hide', label: 'Tinker' }, { key: 'sneak', label: 'Sneak' }, { key: 'sway', label: 'Swindle' }] },
  { drive: 'Intuition', color: '#4a2870', bgColor: 'rgba(74,40,112,0.1)',   statsKey: 'intuition',
    actions: [{ key: 'survey', label: 'Survey' }, { key: 'read', label: 'Read' }, { key: 'sense', label: 'Sense' }] },
];

function statsToActions(stats) {
  return {
    move: stats.nerve.move, strike: stats.nerve.strike, control: stats.nerve.control,
    hide: stats.cunning.hide, sneak: stats.cunning.read, sway: stats.cunning.sway,
    survey: stats.intuition.survey, read: stats.intuition.focus, sense: stats.intuition.sense,
  };
}

const SafeIcon = ({ name, size = 18, className = "", style: s }) => {
  if (!name || !Gi[name]) return <div style={{ width: size, height: size, ...s }} className="opacity-20 rounded-full border border-dashed border-current" />;
  return React.createElement(Gi[name], { size, className, style: s });
};

// Art-deco SVG corner ornament — rotated for each corner
const DecoCorner = ({ color, rot = 0 }) => (
  <svg viewBox="0 0 44 44" width="50" height="50" fill="none"
    style={{ display: 'block', transform: `rotate(${rot}deg)` }}>
    <path d="M1 1L1 22L4 19L4 4L19 4L22 1Z" fill={color} opacity="0.9"/>
    <path d="M1 1L32 1" stroke={color} strokeWidth="1.2" opacity="0.55"/>
    <path d="M1 1L1 32" stroke={color} strokeWidth="1.2" opacity="0.55"/>
    <circle cx="1" cy="1" r="2.5" fill={color}/>
    <rect x="4" y="4" width="11" height="11" stroke={color} strokeWidth="0.9" fill="none" opacity="0.6"/>
    <rect x="6.5" y="6.5" width="6" height="6" fill={color} opacity="0.2"/>
    <path d="M22 1L22 4L26 4" stroke={color} strokeWidth="0.8" opacity="0.5"/>
    <path d="M28 1L28 3" stroke={color} strokeWidth="0.7" opacity="0.35"/>
    <path d="M1 22L4 22L4 26" stroke={color} strokeWidth="0.8" opacity="0.5"/>
    <path d="M1 28L3 28" stroke={color} strokeWidth="0.7" opacity="0.35"/>
    <path d="M19 4L22 1L25 4L22 7Z" fill={color} opacity="0.65"/>
    <path d="M4 19L1 22L4 25L7 22Z" fill={color} opacity="0.65"/>
    <circle cx="11" cy="11" r="1.8" fill={color} opacity="0.55"/>
  </svg>
);

// Mid-edge diamond ornament
const EdgeDiamond = ({ color }) => (
  <svg viewBox="0 0 14 14" width="17" height="17" fill="none">
    <path d="M7 0L14 7L7 14L0 7Z" fill={color} opacity="0.7"/>
    <path d="M7 3L11 7L7 11L3 7Z" fill="none" stroke={color} strokeWidth="0.6" opacity="0.5"/>
    <circle cx="7" cy="7" r="1.2" fill={color} opacity="0.8"/>
  </svg>
);

// Skeuomorphic parchment wrapper with watermarks, tea stains, fold lines
const PaperSheet = ({ children, className = "" }) => (
  <div className={`paper-bg paper-texture relative ${className}`}
    style={{ border: '3px double #3e2a1a', boxShadow: '0 14px 36px rgba(0,0,0,0.65), inset 0 0 80px rgba(139,90,43,0.07)' }}>
    {/* Tea stains */}
    <div className="tea-stain" style={{ width: 320, height: 240, top: -60, left: -80, background: 'radial-gradient(ellipse at center, rgba(139,90,43,0.12) 0%, transparent 70%)' }} />
    <div className="tea-stain" style={{ width: 260, height: 200, bottom: -40, right: -50, background: 'radial-gradient(ellipse at center, rgba(100,60,20,0.10) 0%, transparent 70%)' }} />
    <div className="tea-stain" style={{ width: 160, height: 120, top: '45%', right: '10%', background: 'radial-gradient(ellipse at center, rgba(120,70,30,0.07) 0%, transparent 70%)' }} />
    <div className="tea-stain" style={{ width: 90, height: 70, top: '20%', left: '8%', background: 'radial-gradient(ellipse at center, rgba(100,55,15,0.06) 0%, transparent 70%)' }} />
    {/* Fold lines */}
    <div className="fold-line" style={{ top: '34%' }} />
    <div className="fold-line" style={{ top: '67%' }} />
    {/* Corner filigrees */}
    <div className="absolute top-2 left-2 w-7 h-7 border-t-2 border-l-2 border-[#3e2a1a]/50" />
    <div className="absolute top-2 right-2 w-7 h-7 border-t-2 border-r-2 border-[#3e2a1a]/50" />
    <div className="absolute bottom-2 left-2 w-7 h-7 border-b-2 border-l-2 border-[#3e2a1a]/50" />
    <div className="absolute bottom-2 right-2 w-7 h-7 border-b-2 border-r-2 border-[#3e2a1a]/50" />
    {/* Text watermark */}
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0"
      style={{ transform: 'rotate(-28deg)' }}>
      <span className="text-[100px] font-serif font-black text-[#3e2a1a] whitespace-nowrap select-none"
        style={{ opacity: 0.032, letterSpacing: '0.08em' }}>CANDELA OBSCURA</span>
    </div>
    {/* Circular seal watermark */}
    <div className="absolute bottom-8 right-8 pointer-events-none z-0" style={{ opacity: 0.06 }}>
      <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
        style={{ border: '3px solid #3e2a1a' }}>
        <span className="text-[7px] font-sans font-black tracking-[0.35em] text-[#3e2a1a] uppercase">Candela</span>
        <Gi.GiWaxSeal size={30} className="text-[#3e2a1a] my-1" />
        <span className="text-[7px] font-sans font-black tracking-[0.35em] text-[#3e2a1a] uppercase">Archive</span>
      </div>
    </div>
    <div className="relative z-10 p-8">{children}</div>
  </div>
);

// ── Individual specialty card ──────────────────────────────────────────────────
const CARD_W = 230;
const CARD_H = 370;

const SpecialtyCard = ({ roleName, specialtyName, index, total, isSelected, isAnySelected, isHovered }) => {
  const roleData = ROLES[roleName];
  const spec = roleData.specialties[specialtyName];
  const color = ROLE_COLORS[roleName];
  const img = CARD_IMAGES[specialtyName];

  const angle  = -22 + (index / (total - 1)) * 44;
  const xOff   = (index - (total - 1) / 2) * 28;
  const yDip   = Math.abs(index - (total - 1) / 2) * 4;

  let transform, zIndex, opacity;
  if (isSelected) {
    transform = `translateX(-50%) translateY(-55px) scale(1.18) rotate(0deg)`;
    zIndex = 80; opacity = 1;
  } else if (isAnySelected) {
    transform = `translateX(calc(-50% + ${xOff}px)) translateY(150px) scale(0.7) rotate(${angle * 0.4}deg)`;
    zIndex = 1; opacity = 0;
  } else if (isHovered) {
    transform = `translateX(calc(-50% + ${xOff}px)) translateY(${yDip - 72}px) rotate(0deg) scale(1.1)`;
    zIndex = 90; opacity = 1;
  } else {
    transform = `translateX(calc(-50% + ${xOff}px)) translateY(${yDip}px) rotate(${angle}deg)`;
    zIndex = index + 1; opacity = 1;
  }

  return (
    <div style={{
      position: 'absolute', bottom: 0, left: '50%',
      width: CARD_W, height: CARD_H,
      transform, zIndex, opacity,
      transition: 'transform 380ms cubic-bezier(0.34,1.2,0.64,1), opacity 320ms ease',
      pointerEvents: isAnySelected && !isSelected ? 'none' : 'auto',
      cursor: isSelected ? 'default' : 'pointer',
    }}>
      {/* Outer frame — double border */}
      <div style={{
        width: '100%', height: '100%', position: 'relative', borderRadius: 5, overflow: 'hidden',
        border: `3px solid ${color.primary}`,
        boxShadow: `inset 0 0 0 2px ${color.secondary}, inset 0 0 0 5px ${color.primary}22, 0 12px 30px rgba(0,0,0,0.7)`,
        background: color.cardBg,
      }}>
        {/* Artwork */}
        {img
          ? <img src={img} alt={specialtyName} draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                filter: 'sepia(0.82) brightness(0.72) contrast(1.14) saturate(0.48)' }} />
          : <div style={{ width: '100%', height: '100%', background: `radial-gradient(ellipse at center, rgba(${color.rgb},0.18), ${color.cardBg})` }} />
        }

        {/* Vignette overlay */}
        <div style={{ position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(0,0,0,0.72) 100%)`,
          pointerEvents: 'none', zIndex: 2 }} />

        {/* Top gradient + role label */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.88) 55%, transparent 100%)',
          padding: '10px 8px 14px' }}>
          <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${color.primary}, transparent)`, marginBottom: 5 }} />
          <p style={{ textAlign: 'center', fontSize: 11, fontFamily: 'sans-serif', fontWeight: 900,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: color.primary }}>
            {roleName}
          </p>
        </div>

        {/* Bottom gradient + specialty name */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 60%, transparent 100%)',
          padding: '14px 8px 10px' }}>
          <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${color.primary}, transparent)`, marginBottom: 6 }} />
          <p style={{ textAlign: 'center', fontSize: 16, fontFamily: 'serif', fontWeight: 700,
            color: '#f8f0e4', textShadow: '0 1px 6px rgba(0,0,0,0.9)', lineHeight: 1.2 }}>
            {specialtyName}
          </p>
        </div>

        {/* Horizontal edge rules */}
        <div style={{ position: 'absolute', left: 38, right: 38, top: 34, height: 1, zIndex: 4,
          background: `linear-gradient(to right, transparent, ${color.primary}80, transparent)` }} />
        <div style={{ position: 'absolute', left: 38, right: 38, bottom: 34, height: 1, zIndex: 4,
          background: `linear-gradient(to right, transparent, ${color.primary}80, transparent)` }} />

        {/* Corner ornaments — all 4 corners */}
        <div style={{ position: 'absolute', top: 2, left: 2, zIndex: 10 }}><DecoCorner color={color.primary} rot={0} /></div>
        <div style={{ position: 'absolute', top: 2, right: 2, zIndex: 10 }}><DecoCorner color={color.primary} rot={90} /></div>
        <div style={{ position: 'absolute', bottom: 2, left: 2, zIndex: 10 }}><DecoCorner color={color.primary} rot={270} /></div>
        <div style={{ position: 'absolute', bottom: 2, right: 2, zIndex: 10 }}><DecoCorner color={color.primary} rot={180} /></div>

        {/* Mid-edge diamonds */}
        <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <EdgeDiamond color={color.primary} />
        </div>
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <EdgeDiamond color={color.primary} />
        </div>
        <div style={{ position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          <EdgeDiamond color={color.primary} />
        </div>
        <div style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          <EdgeDiamond color={color.primary} />
        </div>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
export const CharacterCreator = ({ onSubmit }) => {
  const [step, setStep] = useState(1);

  // Card deck state
  const [expandedCard, setExpandedCard] = useState(null); // selected
  const [hoveredCard,  setHoveredCard]  = useState(null); // hover preview

  // Identity
  const [profilePic, setProfilePic] = useState(null);
  const [name,       setName]       = useState("");
  const [pronouns,   setPronouns]   = useState("");
  const [style,      setStyle]      = useState("");
  const [catalyst,   setCatalyst]   = useState("");
  const [question,   setQuestion]   = useState("");

  // Chosen role/specialty (locked in when "Choose This Specialty" clicked)
  const [role,     setRole]     = useState("");
  const [specialty,setSpecialty]= useState("");

  // Abilities — chosen in Step 1 panel
  const [selectedRoleAbility,      setSelectedRoleAbility]      = useState("");
  const [selectedSpecialtyAbility, setSelectedSpecialtyAbility] = useState("");

  // Actions & gear
  const [actions, setActions] = useState({ move:0,strike:0,control:0,hide:0,sneak:0,sway:0,survey:0,read:0,sense:0 });
  const [gildedActions, setGildedActions] = useState({ nerve:'', cunning:'', intuition:'' });
  const [selectedGear, setSelectedGear] = useState([]);

  // Finalize routing
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [campaignCode,  setCampaignCode]  = useState("");

  const handleImageUpload = (e) => {
    if (e.target.files?.[0]) setProfilePic(URL.createObjectURL(e.target.files[0]));
  };

  // Expand a card — reset ability picks if switching specialty
  const handleExpandCard = (roleName, specialtyName) => {
    const switching = expandedCard?.roleName !== roleName || expandedCard?.specialtyName !== specialtyName;
    setExpandedCard({ roleName, specialtyName });
    if (switching) { setSelectedRoleAbility(""); setSelectedSpecialtyAbility(""); }
    setHoveredCard(null);
  };

  // Confirm specialty choice and advance to step 2
  const chooseSpecialty = () => {
    if (!expandedCard || !selectedRoleAbility || !selectedSpecialtyAbility) return;
    setRole(expandedCard.roleName);
    setSpecialty(expandedCard.specialtyName);
    const stats = ROLES[expandedCard.roleName].specialties[expandedCard.specialtyName].stats;
    setActions(statsToActions(stats));
    setSelectedGear([]);
    setExpandedCard(null);
    setStep(2);
  };

  const toggleGear = (item) => {
    if (selectedGear.includes(item)) setSelectedGear(selectedGear.filter(g => g !== item));
    else if (selectedGear.length < 3) setSelectedGear([...selectedGear, item]);
  };

  const getDriveTotal = (di) => di.actions.reduce((s, a) => s + (actions[a.key] || 0), 0);
  const getDriveMax   = (di) => role && specialty ? (ROLES[role]?.specialties[specialty]?.stats?.[di.statsKey]?.max ?? 9) : 9;

  const adjustAction = (key, delta, di) => {
    const v = (actions[key] || 0) + delta;
    if (v < 0 || v > 4) return;
    if (delta > 0 && getDriveTotal(di) >= getDriveMax(di)) return;
    setActions(p => ({ ...p, [key]: v }));
  };

  const toggleGilded = (driveKey, actionKey) => {
    setGildedActions(p => ({ ...p, [driveKey]: p[driveKey] === actionKey ? '' : actionKey }));
  };

  const handleComplete = (mode, code) => {
    if (onSubmit) onSubmit({
      name, pronouns, style, catalyst, question, role, specialty,
      roleAbility: selectedRoleAbility, specialtyAbility: selectedSpecialtyAbility,
      gear: selectedGear, profilePic, actions, gildedActions,
      mode: mode || 'save',
      campaignCode: code || '',
    });
  };

  // Step unlock logic
  const step2Unlocked = !!(role && specialty && selectedRoleAbility && selectedSpecialtyAbility);
  const step3Unlocked = step2Unlocked && !!name;
  const step4Unlocked = step3Unlocked && !!catalyst;

  const canAdvance = step === 2 ? !!(name && catalyst) : step === 3;

  const allCards = Object.entries(ROLES).flatMap(([rn, rd]) =>
    Object.keys(rd.specialties).map(sn => ({ roleName: rn, specialtyName: sn }))
  );

  // What to show in right panel (selected takes priority over hover)
  const panelTarget = expandedCard || hoveredCard;
  const panelRoleData    = panelTarget ? ROLES[panelTarget.roleName] : null;
  const panelSpecData    = panelTarget ? panelRoleData?.specialties[panelTarget.specialtyName] : null;
  const panelColor       = panelTarget ? ROLE_COLORS[panelTarget.roleName] : null;
  const isFullPanel      = !!expandedCard; // full ability selection vs hover preview

  const STEP_LABELS = ["1. CHOOSE PATH", "2. PROFILE", "3. ACTION RATINGS", "4. GEAR & DOSSIER"];
  const STEP_UNLOCKED = [true, step2Unlocked, step3Unlocked, step4Unlocked];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 font-serif text-[#1a1311]">

      {/* ── PROGRESS NAV ── */}
      <div className="flex border border-[#3e2f29] bg-[#1a1311] text-sm font-sans font-black tracking-widest text-center select-none rounded mb-6 shadow-md overflow-hidden">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const unlocked = STEP_UNLOCKED[i];
          const active = step === n;
          return (
            <div key={n} onClick={() => unlocked && setStep(n)}
              className={`flex-1 py-3 border-r border-[#3e2f29] last:border-r-0 transition-colors ${
                active   ? 'bg-[#721c15] text-[#fdfaf4]' :
                unlocked ? 'text-[#fdfaf4]/50 hover:bg-black/20 cursor-pointer' :
                           'opacity-25 cursor-not-allowed text-[#fdfaf4]/20'
              }`}>
              {label}
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1 — CHOOSE YOUR PATH
          ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="animate-fadeIn">
          <div className="text-center mb-5">
            <h2 className="text-3xl font-black uppercase tracking-widest text-[#fdfaf4]"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>Choose Your Path</h2>
            <p className="text-sm font-sans tracking-[0.2em] text-[#fdfaf4]/35 uppercase mt-1">
              Draw from the deck — hover to preview, click to select
            </p>
          </div>

          <div className="flex gap-6 items-start" style={{ minHeight: 540 }}>

            {/* ── LEFT: card fan ── */}
            <div className="shrink-0" style={{ width: 530 }}>
              {/* Group container with gentle tilt */}
              <div style={{
                position: 'relative', height: 590,
                transform: expandedCard ? 'rotate(0deg)' : 'rotate(-7deg)',
                transition: 'transform 480ms cubic-bezier(0.4,0,0.2,1)',
              }}>
                {allCards.map(({ roleName, specialtyName }, idx) => {
                  const isSel  = expandedCard?.roleName === roleName && expandedCard?.specialtyName === specialtyName;
                  const isHov  = hoveredCard?.roleName  === roleName && hoveredCard?.specialtyName  === specialtyName;
                  const anySel = !!expandedCard;
                  return (
                    <div
                      key={`${roleName}-${specialtyName}`}
                      onMouseEnter={() => !anySel && setHoveredCard({ roleName, specialtyName })}
                      onMouseLeave={() => !anySel && setHoveredCard(null)}
                      onClick={() => {
                        if (isSel) { setExpandedCard(null); setHoveredCard(null); }
                        else handleExpandCard(roleName, specialtyName);
                      }}
                    >
                      <SpecialtyCard
                        roleName={roleName} specialtyName={specialtyName}
                        index={idx} total={allCards.length}
                        isSelected={isSel} isAnySelected={anySel} isHovered={isHov}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Return to deck */}
              {expandedCard && (
                <div className="text-center mt-2">
                  <button
                    onClick={() => { setExpandedCard(null); setHoveredCard(null); }}
                    className="text-[11px] font-sans font-black uppercase tracking-widest px-4 py-1.5 rounded transition-all border border-[#fdfaf4]/15 text-[#fdfaf4]/40 hover:text-[#fdfaf4]/70 hover:border-[#fdfaf4]/30"
                  >
                    ← Return to Deck
                  </button>
                </div>
              )}
            </div>

            {/* ── RIGHT: description panel ── */}
            <div className="flex-1" style={{ minHeight: 460 }}>
              {!panelTarget ? (
                /* Empty state */
                <div className="h-full flex flex-col items-center justify-center text-center px-8"
                  style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, background: 'rgba(10,6,4,0.5)' }}>
                  <Gi.GiCardRandom size={48} className="text-[#fdfaf4]/10 mb-4" />
                  <p className="text-xl font-serif text-[#fdfaf4]/20 italic">Hover a card to preview</p>
                  <p className="text-sm font-sans tracking-widest text-[#fdfaf4]/10 uppercase mt-1">Click to enter selection</p>
                </div>
              ) : (
                <div className="h-full flex flex-col rounded overflow-hidden"
                  style={{ border: `1px solid ${panelColor.primary}33`, background: '#0a0705', boxShadow: `0 4px 20px rgba(0,0,0,0.6), inset 0 0 0 1px ${panelColor.secondary}44` }}>

                  {/* Panel header */}
                  <div className="px-5 pt-5 pb-4 shrink-0"
                    style={{ borderBottom: `1px solid ${panelColor.primary}25`, background: `linear-gradient(to bottom, rgba(${panelColor.rgb},0.1), transparent)` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `rgba(${panelColor.rgb},0.15)`, border: `1px solid ${panelColor.primary}` }}>
                        <SafeIcon name={panelSpecData?.icon} size={22} style={{ color: panelColor.primary }} />
                      </div>
                      <div>
                        <p className="text-sm font-sans font-black tracking-[0.22em] uppercase" style={{ color: panelColor.primary }}>
                          {panelTarget.roleName}
                        </p>
                        <h3 className="text-2xl font-black text-[#fdfaf4] leading-tight">{panelTarget.specialtyName}</h3>
                        <p className="text-base italic text-[#fdfaf4]/55 mt-0.5">{panelSpecData?.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Panel body — scrollable */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-5">

                    {/* ── Specialty Abilities ── */}
                    <div>
                      <p className="text-sm font-sans font-black tracking-[0.2em] uppercase mb-2.5" style={{ color: panelColor.primary }}>
                        {isFullPanel ? "Choose a Specialty Ability" : "Specialty Abilities"}
                      </p>
                      <div className="space-y-2">
                        {Object.entries(panelSpecData?.abilities || {}).map(([aN, aD]) => {
                          const picked = isFullPanel && selectedSpecialtyAbility === aN;
                          return (
                            <div key={aN}
                              onClick={() => isFullPanel && setSelectedSpecialtyAbility(aN)}
                              className={`flex items-start gap-3 p-3 rounded transition-all ${isFullPanel ? 'cursor-pointer' : ''}`}
                              style={{
                                background: picked ? `rgba(${panelColor.rgb},0.22)` : `rgba(255,255,255,0.03)`,
                                border: `1px solid ${picked ? panelColor.primary : (isFullPanel ? `rgba(${panelColor.rgb},0.18)` : 'rgba(255,255,255,0.06)')}`,
                                boxShadow: picked ? `0 0 8px rgba(${panelColor.rgb},0.25)` : 'none',
                              }}>
                              <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center"
                                style={{ background: picked ? panelColor.primary : `rgba(${panelColor.rgb},0.15)`, border: `1px solid ${panelColor.primary}55` }}>
                                <SafeIcon name={aD.icon} size={14} style={{ color: picked ? '#0f0805' : panelColor.primary }} />
                              </div>
                              <div>
                                <p className="text-base font-black text-[#fdfaf4] leading-tight">{aN}</p>
                                <p className="text-sm text-[#fdfaf4]/60 leading-snug mt-0.5">{aD.text}</p>
                              </div>
                              {picked && <Gi.GiCheckMark size={14} className="ml-auto shrink-0 mt-1" style={{ color: panelColor.primary }} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Role Abilities (full panel only) ── */}
                    {isFullPanel && (
                      <div>
                        <p className="text-sm font-sans font-black tracking-[0.2em] uppercase mb-2.5" style={{ color: panelColor.primary }}>
                          Choose a {panelTarget.roleName} Role Ability
                        </p>
                        <div className="space-y-2">
                          {Object.entries(panelRoleData?.baseAbilities || {}).map(([aN, aD]) => {
                            const picked = selectedRoleAbility === aN;
                            return (
                              <div key={aN}
                                onClick={() => setSelectedRoleAbility(aN)}
                                className="flex items-start gap-3 p-3 rounded cursor-pointer transition-all"
                                style={{
                                  background: picked ? `rgba(${panelColor.rgb},0.22)` : `rgba(255,255,255,0.03)`,
                                  border: `1px solid ${picked ? panelColor.primary : `rgba(${panelColor.rgb},0.18)`}`,
                                  boxShadow: picked ? `0 0 8px rgba(${panelColor.rgb},0.25)` : 'none',
                                }}>
                                <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ background: picked ? panelColor.primary : `rgba(${panelColor.rgb},0.15)`, border: `1px solid ${panelColor.primary}55` }}>
                                  <SafeIcon name={aD.icon} size={14} style={{ color: picked ? '#0f0805' : panelColor.primary }} />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-[#fdfaf4] leading-tight">{aN}</p>
                                  <p className="text-xs text-[#fdfaf4]/55 leading-snug mt-0.5">{aD.text}</p>
                                </div>
                                {picked && <Gi.GiCheckMark size={14} className="ml-auto shrink-0 mt-1" style={{ color: panelColor.primary }} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Starting gear preview */}
                    <div>
                      <p className="text-sm font-sans font-black tracking-[0.2em] uppercase mb-2" style={{ color: panelColor.primary }}>
                        Starting Gear
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {panelSpecData?.gear.map(g => (
                          <span key={g} className="text-xs font-serif italic text-[#fdfaf4]/60 px-2.5 py-1 rounded"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Panel footer CTA */}
                  <div className="px-5 py-4 shrink-0"
                    style={{ borderTop: `1px solid ${panelColor.primary}20` }}>
                    {isFullPanel ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[#fdfaf4]/35 italic">
                          {(!selectedSpecialtyAbility || !selectedRoleAbility) ? 'Select both abilities above to continue' : 'Ready to proceed'}
                        </p>
                        <button
                          onClick={chooseSpecialty}
                          disabled={!selectedRoleAbility || !selectedSpecialtyAbility}
                          className="px-5 py-2 text-base font-sans font-black uppercase tracking-wider rounded transition-all shrink-0"
                          style={{
                            background: (selectedRoleAbility && selectedSpecialtyAbility) ? panelColor.primary : 'rgba(255,255,255,0.06)',
                            color: (selectedRoleAbility && selectedSpecialtyAbility) ? '#0a0705' : 'rgba(255,255,255,0.2)',
                            boxShadow: (selectedRoleAbility && selectedSpecialtyAbility) ? `0 2px 12px rgba(${panelColor.rgb},0.45)` : 'none',
                            cursor: (selectedRoleAbility && selectedSpecialtyAbility) ? 'pointer' : 'not-allowed',
                          }}>
                          Choose Specialty →
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleExpandCard(panelTarget.roleName, panelTarget.specialtyName)}
                        className="w-full py-2 text-base font-sans font-black uppercase tracking-wider rounded transition-all"
                        style={{ background: `rgba(${panelColor.rgb},0.15)`, border: `1px solid ${panelColor.primary}55`, color: panelColor.primary }}>
                        Select this Specialty →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2 — INVESTIGATOR PROFILE (Registration + Interview combined)
          ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <PaperSheet>
          <div className="animate-fadeIn space-y-7">
            <div className="text-center pb-5" style={{ borderBottom: '1px solid rgba(62,42,26,0.22)' }}>
              <h2 className="text-3xl font-black uppercase tracking-wide text-[#721c15]">Investigator Profile</h2>
              <p className="text-sm font-sans font-black uppercase tracking-[0.18em] text-black/40 mt-1">
                {specialty} · {role} — Complete identity and background record
              </p>
            </div>

            {/* ── Identity Section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              {/* Portrait */}
              <div className="lg:col-span-4">
                <label className="block text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-2">Portrait</label>
                <label className="w-full aspect-[3/4] border-2 border-dashed border-[#5a3a28]/40 bg-[#e4cfa0]/30 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-[#e4cfa0]/55 hover:border-[#721c15]/50 transition-all relative overflow-hidden shadow-inner group">
                  {profilePic
                    ? <img src={profilePic} alt="Portrait" className="w-full h-full object-cover" />
                    : <div className="text-center p-5">
                        <Gi.GiIdCard size={48} className="mx-auto text-[#1a1311]/22 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="block text-sm font-sans font-black tracking-widest text-[#1a1311]/35 uppercase">[+] Affix Portrait</span>
                        <span className="block text-xs font-sans italic text-[#1a1311]/25 mt-1">Recent likeness required</span>
                      </div>
                  }
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>

              {/* Fields */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1">Full Name *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Full Nomenclature Name…"
                      className="w-full bg-transparent font-serif font-bold text-xl focus:outline-none placeholder-black/20 pb-1"
                      style={{ borderBottom: '1px solid rgba(90,58,40,0.38)' }} />
                  </div>
                  <div>
                    <label className="block text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1">Gender / Pronouns</label>
                    <input type="text" value={pronouns} onChange={e => setPronouns(e.target.value)}
                      placeholder="e.g., He/They, She/Her…"
                      className="w-full bg-transparent font-serif italic text-xl focus:outline-none placeholder-black/20 pb-1"
                      style={{ borderBottom: '1px solid rgba(90,58,40,0.38)' }} />
                  </div>
                </div>

                <div>
                  <label className="block text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1">Identifying Characteristics</label>
                  <textarea rows={3} value={style} onChange={e => setStyle(e.target.value)}
                    placeholder="Detail apparel, distinguishing marks, tailored suits, or signature items that set this investigator apart from the common crowd…"
                    className="w-full bg-transparent font-serif text-base focus:outline-none resize-none placeholder-black/20 leading-7 paper-ruled"
                    style={{ borderBottom: '1px solid rgba(90,58,40,0.25)' }} />
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1" style={{ borderTop: '1px dashed rgba(62,42,26,0.25)' }} />
              <Gi.GiWaxSeal size={18} className="text-[#721c15]/30 shrink-0" />
              <div className="flex-1" style={{ borderTop: '1px dashed rgba(62,42,26,0.25)' }} />
            </div>

            {/* ── Interview Section ── */}
            <div className="space-y-5">
              <h3 className="text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15]">Examination Record — Interview Transcript</h3>

              <div className="bg-[#e4cfa0]/30 p-5 rounded-sm shadow-inner" style={{ border: '1px solid rgba(90,58,40,0.18)' }}>
                <label className="block text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-2 pb-1.5"
                  style={{ borderBottom: '1px solid rgba(90,58,40,0.15)' }}>
                  Record Your Catalyst — Why do you seek Candela Obscura? *
                </label>
                <textarea rows={3} value={catalyst} onChange={e => setCatalyst(e.target.value)}
                  placeholder="Document the specific event or supernatural rupture that tore away the mundane world and drew you into the dark…"
                  className="w-full bg-transparent font-serif text-base focus:outline-none resize-none placeholder-black/22 leading-7 paper-ruled" />
              </div>

              <div className="bg-[#e4cfa0]/30 p-5 rounded-sm shadow-inner" style={{ border: '1px solid rgba(90,58,40,0.18)' }}>
                <label className="block text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-2 pb-1.5"
                  style={{ borderBottom: '1px solid rgba(90,58,40,0.15)' }}>
                  Convey Your Curiosity — What answers are you demanding?
                </label>
                <textarea rows={3} value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="What is the central question or haunting mystery your investigator pursues into the dark, whatever the cost…"
                  className="w-full bg-transparent font-serif text-base focus:outline-none resize-none placeholder-black/22 leading-7 paper-ruled" />
              </div>
            </div>
          </div>
        </PaperSheet>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 3 — ACTION RATINGS
          ══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <PaperSheet>
          <div className="animate-fadeIn space-y-6">
            <div className="text-center pb-5" style={{ borderBottom: '1px solid rgba(62,42,26,0.22)' }}>
              <h2 className="text-3xl font-black uppercase tracking-wide text-[#721c15]">Determine Action Ratings</h2>
              <p className="text-sm font-sans font-black uppercase tracking-[0.18em] text-black/40 mt-1">
                Distribute your points across the nine actions — pre-set from your {specialty} specialty
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {ACTION_DRIVES.map(di => {
                const dTotal = getDriveTotal(di);
                const dMax   = getDriveMax(di);
                const gKey   = di.drive.toLowerCase();
                return (
                  <div key={di.drive} className="rounded-sm p-5" style={{ background: di.bgColor, border: `1px solid ${di.color}30` }}>
                    <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: `1px solid ${di.color}28` }}>
                      <span className="text-lg font-black uppercase tracking-wider" style={{ color: di.color }}>{di.drive}</span>
                      <span className="text-xs font-sans font-black opacity-55">{dTotal} / {dMax}</span>
                    </div>
                    <div className="space-y-4">
                      {di.actions.map(({ key, label }) => {
                        const val = actions[key] || 0;
                        const isGilded = gildedActions[gKey] === key;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <button onClick={() => toggleGilded(gKey, key)} title={isGilded ? "Remove gild" : "Gild action"}
                              className="shrink-0 w-6 h-6 flex items-center justify-center focus:outline-none transition-opacity hover:opacity-100"
                              style={{ opacity: isGilded ? 1 : 0.2 }}>
                              <Gi.GiStarFormation size={15} style={{ color: isGilded ? '#d4af37' : '#5a3a28' }} />
                            </button>
                            <span className="text-base font-serif font-bold text-[#1a1311] w-20 shrink-0">{label}</span>
                            <div className="flex gap-1.5 flex-1">
                              {[1,2,3,4].map(n => (
                                <div key={n} className={`action-pip ${n <= val ? (isGilded && n === val ? 'gilded' : 'filled') : ''}`} />
                              ))}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={() => adjustAction(key, -1, di)} disabled={val <= 0}
                                className="w-6 h-6 flex items-center justify-center font-black text-base rounded hover:bg-[#721c15]/10 disabled:opacity-20 focus:outline-none transition-colors"
                                style={{ color: '#721c15' }}>−</button>
                              <button onClick={() => adjustAction(key, 1, di)} disabled={val >= 4 || dTotal >= dMax}
                                className="w-6 h-6 flex items-center justify-center font-black text-base rounded hover:bg-[#721c15]/10 disabled:opacity-20 focus:outline-none transition-colors"
                                style={{ color: '#721c15' }}>+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-sm font-sans italic text-[#5a3a28]/55 text-center">
              ☆ Click the star beside an action to gild it — gilded actions roll an extra die on their first result.
            </p>
          </div>
        </PaperSheet>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 4 — GEAR & DOSSIER
          ══════════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <PaperSheet>
          <div className="animate-fadeIn space-y-7">
            <div className="text-center pb-5" style={{ borderBottom: '1px solid rgba(62,42,26,0.22)' }}>
              <h2 className="text-3xl font-black uppercase tracking-wide text-[#721c15]">Starting Gear &amp; Final Dossier</h2>
              <p className="text-sm font-sans font-black uppercase tracking-[0.18em] text-black/40 mt-1">
                Select up to 3 items — then review and submit your dossier for Archive transmission
              </p>
            </div>

            {/* Gear ledger */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-sans font-black uppercase tracking-[0.15em] text-[#721c15] flex items-center gap-2">
                  <Gi.GiBriefcase size={16} /> Equipment Ledger
                </h3>
                <span className="text-sm font-sans font-black text-black/45">{selectedGear.length} / 3 selected</span>
              </div>

              {/* Specialty gear */}
              <div className="mb-4">
                <p className="text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15]/70 mb-2">Signature Equipment — {specialty}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ROLES[role]?.specialties[specialty]?.gear.map(item => (
                    <div key={item} onClick={() => toggleGear(item)}
                      className={`flex items-center gap-3 p-3 rounded-sm cursor-pointer transition-all select-none ${selectedGear.includes(item) ? 'shadow-sm' : 'hover:bg-[#e4cfa0]/40'}`}
                      style={{
                        background: selectedGear.includes(item) ? 'rgba(114,28,21,0.1)' : 'rgba(228,207,160,0.2)',
                        border: `1px solid ${selectedGear.includes(item) ? '#721c15' : 'rgba(90,58,40,0.22)'}`,
                      }}>
                      <div className={`w-4 h-4 border flex items-center justify-center rounded-sm text-xs shrink-0 ${selectedGear.includes(item) ? 'bg-[#721c15] border-[#721c15] text-white' : 'border-[#5a3a28]/40'}`}>
                        {selectedGear.includes(item) && "✓"}
                      </div>
                      <SafeIcon name={GEAR_ICONS[item]} size={18} style={{ color: selectedGear.includes(item) ? '#721c15' : '#5a3a28', opacity: selectedGear.includes(item) ? 1 : 0.55, flexShrink: 0 }} />
                      <span className={`text-base font-serif ${selectedGear.includes(item) ? 'font-bold text-[#1a1311]' : 'text-[#1a1311]/75'}`}>{item}</span>
                      <span className="ml-auto text-[8px] font-sans font-black uppercase text-[#721c15]/60 tracking-tighter shrink-0">[Sig]</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standard gear */}
              <div>
                <p className="text-sm font-sans font-black uppercase tracking-[0.18em] text-[#5a3a28]/55 mb-2">Standard Issue Equipment</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {STANDARD_GEAR.map(item => (
                    <div key={item} onClick={() => toggleGear(item)}
                      className={`flex items-center gap-3 p-3 rounded-sm cursor-pointer transition-all select-none ${selectedGear.includes(item) ? '' : 'hover:bg-[#e4cfa0]/30'}`}
                      style={{
                        background: selectedGear.includes(item) ? 'rgba(114,28,21,0.08)' : 'rgba(228,207,160,0.1)',
                        border: `1px solid ${selectedGear.includes(item) ? '#721c1580' : 'rgba(90,58,40,0.15)'}`,
                      }}>
                      <div className={`w-4 h-4 border flex items-center justify-center rounded-sm text-xs shrink-0 ${selectedGear.includes(item) ? 'bg-[#721c15] border-[#721c15] text-white' : 'border-[#5a3a28]/35'}`}>
                        {selectedGear.includes(item) && "✓"}
                      </div>
                      <SafeIcon name={GEAR_ICONS[item]} size={18} style={{ color: selectedGear.includes(item) ? '#721c15' : '#5a3a28', opacity: selectedGear.includes(item) ? 0.9 : 0.45, flexShrink: 0 }} />
                      <span className={`text-base font-serif ${selectedGear.includes(item) ? 'font-bold text-[#1a1311]' : 'text-[#1a1311]/60'}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dossier summary */}
            <div style={{ borderTop: '2px dashed rgba(62,42,26,0.2)' }} className="pt-5 space-y-4">
              <h3 className="text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15]">Candela Archive Ledger — Investigator Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Investigator", value: name },
                  { label: "Pronouns",     value: pronouns || '—' },
                  { label: "Role · Specialty", value: `${role} · ${specialty}` },
                  { label: "Gear Selected", value: `${selectedGear.length} of 3 items` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-sm" style={{ background: 'rgba(228,207,160,0.28)', border: '1px solid rgba(90,58,40,0.15)' }}>
                    <span className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-0.5">{label}</span>
                    <span className="text-base font-bold text-[#1a1311] block truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-sm" style={{ background: 'rgba(228,207,160,0.18)', border: '1px dashed rgba(90,58,40,0.22)' }}>
                <span className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1">Administrative Catalyst</span>
                <p className="text-base italic text-[#1a1311]/80 leading-relaxed">"{catalyst}"</p>
              </div>
            </div>

            <div className="text-center pt-1 text-xs font-sans font-black tracking-widest uppercase text-[#5a3a28]/38 animate-pulse">
              ⚠ Pending final review — verify all fields before submission to the Archive
            </div>
          </div>
        </PaperSheet>
      )}

      {/* ── BOTTOM NAV BUTTONS ── */}
      {step > 1 && (
        <div className="flex justify-between items-center mt-5">
          <button onClick={() => setStep(step - 1)}
            className="px-5 py-2 text-base border border-[#fdfaf4]/18 font-sans font-black uppercase tracking-widest text-[#fdfaf4]/50 hover:bg-white/5 hover:text-[#fdfaf4]/75 transition-all rounded">
            ← Back
          </button>
          {step < 4 ? (
            <button
              onClick={() => canAdvance && setStep(step + 1)}
              disabled={!canAdvance}
              className="px-7 py-2 text-base font-sans font-black uppercase tracking-widest rounded transition-all shadow"
              style={{
                background: canAdvance ? '#721c15' : 'rgba(26,19,17,0.6)',
                color: canAdvance ? '#fdfaf4' : 'rgba(253,250,244,0.2)',
                cursor: canAdvance ? 'pointer' : 'not-allowed',
              }}>
              Advance →
            </button>
          ) : (
            <div className="flex flex-col items-end gap-3">
              {showJoinInput && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={campaignCode}
                    onChange={e => setCampaignCode(e.target.value)}
                    placeholder="Enter circle code..."
                    className="px-3 py-2 text-base font-serif bg-transparent border-b-2 border-[#8b5a2b] text-[#1a1311] placeholder-[#8b5a2b]/50 focus:outline-none w-52"
                  />
                  <button
                    onClick={() => campaignCode.trim() && handleComplete('join', campaignCode.trim())}
                    disabled={!campaignCode.trim()}
                    className="px-5 py-2 text-sm border-2 border-[#1a1311] font-sans font-black uppercase tracking-widest rounded shadow-md transition-all"
                    style={{
                      background: campaignCode.trim() ? '#1e4f72' : 'rgba(26,19,17,0.4)',
                      color: campaignCode.trim() ? '#fdfaf4' : 'rgba(253,250,244,0.3)',
                      cursor: campaignCode.trim() ? 'pointer' : 'not-allowed',
                    }}>
                    Join Circle →
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleComplete('save')}
                  className="px-6 py-2.5 text-sm border border-[#8b5a2b] font-sans font-black uppercase tracking-widest rounded transition-all"
                  style={{ background: 'rgba(245,235,214,0.6)', color: '#3e2a1a' }}>
                  Save for Later
                </button>
                <button
                  onClick={() => setShowJoinInput(v => !v)}
                  className="px-6 py-2.5 text-sm border-2 border-[#1a1311] font-sans font-black uppercase tracking-widest rounded shadow-md transition-all"
                  style={{ background: '#721c15', color: '#fdfaf4' }}>
                  {showJoinInput ? 'Cancel' : 'Enter Campaign Code'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
