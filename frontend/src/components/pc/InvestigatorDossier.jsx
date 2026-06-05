import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { SheetDivider } from '../shared/Decorations';
import { SafeIcon } from '../shared/SafeIcon';
import { getAvailableRollMods } from './DiceVault';

const ROLE_ICONS = {
  'Face': 'GiDramaMasks',
  'Muscle': 'GiMuscleUp',
  'Scholar': 'GiSpellBook',
  'Slink': 'GiNinjaMask',
  'Weird': 'GiCrystalBall',
};

const ABILITY_TEXTS = {
  // ── FACE (role) ────────────────────────────────────────────────────────────
  "I Know a Guy": "Once per assignment, ask the GM who you know nearby that could help you. The GM will tell you who they are, and explain why this NPC might have insight into the investigation.",
  "Sweet Talk": "You know how to work the room. After you make small talk with someone, you may add +1d on any Read rolls you make in which they are the target. If your current Cunning resistance is 2 or higher, that die is gilded.",
  "Cool Under Pressure": "On any high-stakes roll, you may always spend Cunning instead of the drive the action falls under.",
  // ── MUSCLE (role) ──────────────────────────────────────────────────────────
  "Behind Me": "Spend 1 Nerve to choose an ally in the same scene who is about to take a mark from a phenomenon, then describe what you do that allows you to take the mark instead.",
  "Adrenaline Rush": "For each mark you take, you may immediately refresh a drive point of your choice.",
  "Endurance": "When you take enough marks to become incapacitated, instead, roll a number of d6 equal to your current Nerve resistance. On a 6, you aren't incapacitated and don't take a scar.",
  // ── SCHOLAR (role) ─────────────────────────────────────────────────────────
  "Well-Read": "You're highly educated and retain knowledge better than most. When you spend Intuition while making a roll, on a result of 3 or less, earn back any of the Intuition you spent.",
  "Occult Researcher": "Take 1 Brain mark to ask the GM for an important occult detail that you would recognize from your studies, but has not yet been revealed in the scene. If there are none, clear the Brain mark.",
  "Meticulous Notes": "If your current Cunning resistance is 2 or more, add +1d to all Focus rolls. After an assignment, increase your Illumination track 1 additional point because of the detailed notes your character returns with.",
  // ── SLINK (role) ───────────────────────────────────────────────────────────
  "Scout": "If you have time to observe a location, you can spend 1 Intuition to ask a question: What do I notice here that others do not see? What in this place might be of use to us? What path should we follow?",
  "Saw This Coming": "Three times per assignment, you may add +1d to a circle member's roll without spending drive by saying how you prepared for this kind of situation together.",
  "Death Defy": "Once per assignment, when you should take 1 or more marks from an enemy, you instead escape unscathed. Describe how your quick thinking keeps you safe from harm.",
  // ── WEIRD (role) ───────────────────────────────────────────────────────────
  "Great Wards": "You can inscribe and maintain a warding symbol on one person at a time. Describe the material they must hold to bind it (salt, sand, etc.). They take +1d on Move rolls against phenomena.",
  "Let Them In": "Whenever you take 1 or more Bleed marks, you also gain additional information about the phenomenon that harmed you. Ask the GM one question about the source of the bleed.",
  "Ritual": "When you have a few minutes to prepare, you may take a Bleed mark to perform a ritual on yourself or an ally: Circle of Protection (soaks 1 Body mark for the person within), Reinvigorate (refresh 1 resistance), or Remote Viewing (one moment).",
  // ── JOURNALIST (specialty) ─────────────────────────────────────────────────
  "Insider Access": "Your line of work offers you special privileges. Once per assignment, automatically gain access to an important person or place by using the Press Credentials gear.",
  "Open Book": "You can get people to open up to you very quickly. When you attempt to connect with others by sharing something deeply personal, add a number of dice equal to your current Cunning resistance to a Sway roll. On a success, they will reciprocate.",
  "Lie Detector": "When you make a Read roll in an attempt to figure out whether a person is telling the truth, gild an additional die. The first Cunning you spend on the roll is worth +2d instead of +1d.",
  "Press Conference": "You can spend 1 Cunning to gather a large group of people together to make announcements, ask questions, or stage a distraction. All Cunning rolls you make at this assembly take +1d.",
  "In the Trenches": "You've done enough dangerous journalism work to know how to keep yourself safe. Once per assignment, you may burn 1 Cunning resistance to soak a Body mark.",
  "Well-Researched": "You can spend 1 Intuition to ask the GM a specific question about a place, group, or concept that you may have researched before the assignment. They will tell you what you know from that preparation.",
  // ── MAGICIAN (specialty) ───────────────────────────────────────────────────
  "Misdirection": "When you use your words or actions to distract a target from what is actually happening here, make a Hide roll. The first Cunning you or an ally spends on this roll is worth +2d instead of +1d.",
  "Escape Artist": "Spend 1 Nerve to automatically escape ropes, cuffs, manacles, or a creature that has grappled you.",
  "Practiced Patter": "You've long rehearsed for a moment like this. When making a Sway or Hide roll, you may spend Intuition instead of Cunning.",
  "Uncanny Eye": "You may spend 1 Intuition to ask the GM a question: How can I leverage something here to my advantage? What here doesn't work the way it appears? What is out of place here?",
  "Flourish": "You know how to cover your mistakes with flair. On a roll where you could spend Cunning, if you fail or get a mixed success, you may spend 2 Cunning to push the result up one tier — from a miss to mixed success or mixed success to full success.",
  "The Prestige": "Your magic is usually all smoke and mirrors, but you have one trick you've learned that's real. Roll Sense when you perform it, and on a success, take a Bleed mark. Circle one option when you take this ability: change appearance, levitate, summon mundane object, teleport a short distance, or throw your voice.",
  // ── EXPLORER (specialty) ───────────────────────────────────────────────────
  "Obscure Lexicon": "When you encounter an ancient or esoteric language, you can spend 1 Intuition to understand what it says.",
  "Field Experience": "You've traveled the world and been in many dangerous positions before. Once per assignment, describe to the group how a previous adventure is similar to your current situation and refresh 1 Nerve for everyone in your circle.",
  "Mind Over Matter": "When you are told to use a specific action on a roll, you may take a Brain mark to utilize an alternative action instead. You may also spend the drive that corresponds with your chosen action. Describe how you adapt to your situation.",
  "Tenacious": "When you have 1 or more Bleed marks, gild an additional die on Move, Strike, and Control rolls while in danger.",
  "Narrow Escape": "You've been in numerous hairy situations during your fearless exploits. Add +1d to your Move roll when you attempt to escape a trap or ambush.",
  "Not Again": "Once per assignment, you may take a scar to have an automatic full success on an action. If you do, it's as if you've had this scar all along — tell your circle how you got it, and why the lesson you learned is helping you succeed here. Don't adjust your action ratings when you take this scar.",
  // ── SOLDIER (specialty) ────────────────────────────────────────────────────
  "Basic Training": "You have tactical experience in high-pressure situations. When you make a Survey roll in a dangerous place, also add a number of dice equal to your current Nerve resistance.",
  "Geared Up": "You and one ally in your circle may mark an additional gear slot during each assignment.",
  "Sharpshooter": "When you want to make a ranged attack with a weapon, you may spend 1 Nerve to steady your aim before shooting, and add +2d to your next shot at this target.",
  "Tactician": "When you are in a dangerous scenario, you may spend 1 Nerve to ask the GM a question: How do I get to safety? What poses the largest immediate threat to my circle? Where is the target going to move next?",
  "Compartmentalization": "You have trained to detach yourself from the horrors of violence. Once per assignment, you may burn 1 Nerve resistance to soak a Brain mark.",
  "Volunteer Duty": "Between assignments, instead of spending resources, you can offer a helping hand to your Lightkeeper. Describe how you aid the organization, and refill 1 point in any Candela Obscura resource on your circle sheet. You may not spend any resources during this downtime.",
  // ── DOCTOR (specialty) ────────────────────────────────────────────────────
  "Patch Up": "When you have a few moments of calm, you can make a Focus roll to heal 1 Body mark on an ally. On a 4–5, spend 2 Intuition to accomplish this. On a 6, spend 1 Intuition. On a 3 or less, you may take a Brain mark to take the 4–5 result instead.",
  "Non-Combatant": "Your pain spurs others to action. If you haven't hurt anyone yet during this assignment, when you take a mark, each of your allies in the scene can recover 1 drive point of their choice.",
  "Dissection": "When you make a Focus roll to dissect a piece of organic matter affected by bleed, gild an additional die. You cannot take Bleed marks from this inspection.",
  "Resuscitation": "When a nearby ally takes a scar, you can make a Focus roll in an attempt to immediately revive them. On a 6, it works. Though they still receive the scar, they're back on their feet. On a 4–5, it will cost 3 drive points of your choosing. This cannot be used when a PC takes their fourth scar.",
  "Lifesaver": "Between assignments, you can spend 1 Stitch to work on healing an ally's scar. When you do, make a Focus roll. On a critical success, fill three. On a 6, fill two. On a 4–5, fill one. When the track is full, the scar is healed and 1 action point may be shifted.",
  "Anatomical Strike": "You know where the body is most vulnerable. When attacking an enemy, you may roll Focus instead of Strike.",
  // ── PROFESSOR (specialty) ─────────────────────────────────────────────────
  "Steel Mind": "Once per assignment, when you should take a Brain mark, you may instead burn 1 Intuition resistance to soak it.",
  "University Resources": "Your university has alumni all over the world. Once per session, describe a person you know from your tenure as a professor, and ask the GM where they can be found locally.",
  "Learn from My Mistakes": "Any time you get a result of 3 or less on a roll, describe what lesson you learned from your failure, and refresh 1 drive point of your choice.",
  "Better Part of Valor": "When making a Control or Move roll to flee danger, gild a die. On this roll, the first Nerve you spend is worth +2d instead of +1d.",
  "Verbose": "When you make a speech or hold a conversation to assist an ally, the die you give them is gilded.",
  "Chemical Concoction": "You know how to mix chemicals together to achieve particular effects. When you take Laboratory Equipment as gear, you may spend a few minutes concocting a mixture that is: acidic, explosive, flammable, loud, sleep-inducing, sticky, or toxic.",
  // ── CRIMINAL (specialty) ──────────────────────────────────────────────────
  "Street Smarts": "You know how to keep an eye on your surroundings. Whenever you make a Survey roll, you may spend any drive instead of only Intuition.",
  "Leverage": "On a successful Read roll, you may ask the GM what your target truly wants. On any Sway rolls you make using this information, also add a number of dice equal to your current Cunning resistance.",
  "Hardened": "When you take a scar, you may choose not to shift any action points as a result.",
  "Born in the Shadows": "When attempting to avoid security or detection, gild an additional Hide die.",
  "Tricks of the Trade": "You've learned how to navigate tricky or dangerous situations to keep yourself out of harm's way. On any Hide or Sway roll you make, you may spend 1 Nerve to lower the stakes before rolling. If this is already a low-stakes roll, you may not use this ability.",
  "Sticky Fingers": "After a successful melee attack, you can spend 1 Cunning to pilfer an item from your target undetected. This could be their wallet, a weapon they're carrying, an important document, etc.",
  // ── DETECTIVE (specialty) ─────────────────────────────────────────────────
  "Mind Palace": "When you want to figure out how two clues might relate or what path they should point you toward, burn 1 Intuition resistance. The GM will give you the information you've deduced.",
  "Interrogation": "When you are questioning someone about information they are resistant to revealing, add a number of dice equal to your current Cunning resistance to your Read roll.",
  "Back Against the Wall": "When you are making a high-stakes roll, you may take a Brain mark to make any Nerve you spend worth +2d instead of +1d.",
  "Inspection": "You have experience examining crime scenes. When you make a Survey roll to gather evidence about what might have happened in this location, gild an additional die on the roll.",
  "Stakeout": "You are good at collecting information while remaining undetected. When you are tailing a suspect or conducting surveillance, you may use Survey instead of Hide.",
  "One Step Ahead": "Once per assignment, you can produce a useful mundane object you've had with you all along. When you do, fill in the empty gear slot and write the object in this space. This does not count toward your gear limit.",
  // ── MEDIUM (specialty) ────────────────────────────────────────────────────
  "Miasma": "You can spend 1 Intuition to tell if and how a person or object has been affected by bleed.",
  "Bending Spoons": "You can make a Sense roll to control an object in the room with your mind: flip a switch, knock something over, move a small object, put out a light, etc. On a mixed success, you may take a Bleed mark to make it a full success instead.",
  "Cold Read": "On a successful Sense roll, you know what ailment, stress, or loss a person has in their life, even if they're trying to hide it.",
  "Premonitions": "When an ally is about to take 1 or more marks, burn an Intuition resistance to warn them about the coming danger. Then, soak one of these marks.",
  "Last Moments": "While touching a corpse, you can burn an Intuition resistance to hear, smell, and feel that creature's last few moments of life. By taking a Bleed mark, you can push yourself to see a still image of the last thing they saw before death.",
  "Commune": "You can make a connection with a nearby sentient phenomenon in order to communicate with it. Take a Brain mark and make a Sense roll to open an empathetic or telepathic connection to ask a question. On a success, you get an answer. On a 4–5 result, the phenomenon will ask a question in return.",
  // ── OCCULTIST (specialty) ─────────────────────────────────────────────────
  "Ghostblade": "You can attune a ritual knife to yourself. If you coat it in your blood (take a Body mark), it is particularly effective against magickal beings and can strike invisible or ethereal enemies.",
  "Blood of the Covenant": "The first time a dangerous phenomenon inflicts a mark on anyone in your circle, you refresh a number of points, in any drive, equal to your current Intuition resistance.",
  "Speak Their Language": "You can speak the supernatural language of any phenomenon you encounter. Describe what strange or terrifying way you communicate with each other.",
  "Play the Bait": "You know how to draw the attention of a phenomenon — you just have to play the bait. Make a Sense roll to bring a nearby phenomenon toward you.",
  "Extend Your Senses": "When you make a Sense roll to understand more about a phenomenon you've encountered, also add a number of dice equal to your current Intuition resistance to the roll.",
  "Forbidden Ritual": "You know a highly complex and extremely dangerous ritual that will achieve a desired outcome. When you use this ritual, immediately take a Bleed scar. Determine what the ritual is and what its effects are: change the environment, conjure a phenomenon, or save a dying person.",
};

const ROLE_FROM_ABILITY = {
  "I Know a Guy": "Face", "Sweet Talk": "Face", "Cool Under Pressure": "Face",
  "Behind Me": "Muscle", "Adrenaline Rush": "Muscle", "Endurance": "Muscle",
  "Well-Read": "Scholar", "Occult Researcher": "Scholar", "Meticulous Notes": "Scholar",
  "Scout": "Slink", "Saw This Coming": "Slink", "Death Defy": "Slink",
  "Great Wards": "Weird", "Let Them In": "Weird", "Ritual": "Weird",
};

const SPECIALTY_FROM_ABILITY = {
  "Insider Access": "Journalist", "Open Book": "Journalist", "Lie Detector": "Journalist",
  "Press Conference": "Journalist", "In the Trenches": "Journalist", "Well-Researched": "Journalist",
  "Misdirection": "Magician", "Escape Artist": "Magician", "Practiced Patter": "Magician",
  "Uncanny Eye": "Magician", "Flourish": "Magician", "The Prestige": "Magician",
  "Obscure Lexicon": "Explorer", "Field Experience": "Explorer", "Mind Over Matter": "Explorer",
  "Tenacious": "Explorer", "Narrow Escape": "Explorer", "Not Again": "Explorer",
  "Basic Training": "Soldier", "Geared Up": "Soldier", "Sharpshooter": "Soldier",
  "Tactician": "Soldier", "Compartmentalization": "Soldier", "Volunteer Duty": "Soldier",
  "Patch Up": "Doctor", "Non-Combatant": "Doctor", "Dissection": "Doctor",
  "Resuscitation": "Doctor", "Lifesaver": "Doctor", "Anatomical Strike": "Doctor",
  "Steel Mind": "Professor", "University Resources": "Professor", "Learn from My Mistakes": "Professor",
  "Better Part of Valor": "Professor", "Verbose": "Professor", "Chemical Concoction": "Professor",
  "Street Smarts": "Criminal", "Leverage": "Criminal", "Hardened": "Criminal",
  "Born in the Shadows": "Criminal", "Tricks of the Trade": "Criminal", "Sticky Fingers": "Criminal",
  "Mind Palace": "Detective", "Interrogation": "Detective", "Back Against the Wall": "Detective",
  "Inspection": "Detective", "Stakeout": "Detective", "One Step Ahead": "Detective",
  "Miasma": "Medium", "Bending Spoons": "Medium", "Cold Read": "Medium",
  "Premonitions": "Medium", "Last Moments": "Medium", "Commune": "Medium",
  "Ghostblade": "Occultist", "Blood of the Covenant": "Occultist", "Speak Their Language": "Occultist",
  "Play the Bait": "Occultist", "Extend Your Senses": "Occultist", "Forbidden Ritual": "Occultist",
};

const DRIVE_FLAVOR = {
  nerve: 'Raw physicality — force, endurance, and the will to act with your body.',
  cunning: 'Subtle control — deception, concealment, and unseen manipulation.',
  intuition: 'Heightened awareness — perception, empathy, and the supernatural sense.',
};

const ACTION_FLAVOR = {
  move:    'Run, dodge, or navigate — raw movement through danger.',
  strike:  'Punch, break, or knock down — direct physical force.',
  control: 'Drive, shoot, or finesse — precise command of tools and situations.',
  sway:    'Convince, command, or consort — social pressure and persuasion.',
  sneak:   'Interpret body language, spot lies, gather motives.',
  hide:    'Sneak, distract, or sleight of hand — concealment and misdirection.',
  survey:  'Search, track, or spot — reading an environment for detail.',
  read:    'Inspect, analyze, or remember — focused mental examination.',
  sense:   'Attune, channel, or reveal — perception of the supernatural.',
};

const DRIVE_PIP_TOTAL = 9;

const STANDARD_GEAR = [
  "Bleed Detector", "Bleed Containment Vial", "Hand Weapon", "Lantern", "Matches & Candles", "First Aid Kit"
];

const SPECIALTY_GEAR = {
  Journalist: ["Press Credentials", "Camera", "Hidden Recording Device"],
  Magician:   ["Flash Powder", "Lockpicks", "Trick Deck of Cards"],
  Explorer:   ["Heavy Climbing Gear", "Machete", "Vintage Map Collection"],
  Soldier:    ["Heavy Firearm", "Tactical Armor", "Trench Whistle"],
  Doctor:     ["Surgical Tools", "Heavy Sedatives", "Medical Journals"],
  Professor:  ["Thick Reference Tome", "Chemical Kit", "University Keys"],
  Criminal:   ["Advanced Lockpicks", "Forged Documents", "Concealed Blade"],
  Detective:  ["Magnifying Glass", "Evidence Bags", "Concealed Pistol"],
  Medium:     ["Spirit Board", "Ectoplasm Vial", "Tarot Deck"],
  Occultist:  ["Arcane Texts", "Occult Supplies", "Ritual Dagger"],
};

const GEAR_ICONS = {
  "Bleed Detector": "GiRadarSweep", "Bleed Containment Vial": "GiChemicalDrop",
  "Hand Weapon": "GiKnifeThrust", "Lantern": "GiLantern",
  "Matches & Candles": "GiLitCandelabra", "First Aid Kit": "GiFirstAidKit",
  "Press Credentials": "GiPapers", "Camera": "GiFilmProjector",
  "Hidden Recording Device": "GiMicrophone", "Flash Powder": "GiFireworkRocket",
  "Lockpicks": "GiLockpicks", "Trick Deck of Cards": "GiCardRandom",
  "Heavy Climbing Gear": "GiWhip", "Machete": "GiMachete",
  "Vintage Map Collection": "GiTreasureMap", "Heavy Firearm": "GiRevolver",
  "Tactical Armor": "GiArmorVest", "Trench Whistle": "GiWhistle",
  "Surgical Tools": "GiScalpel", "Heavy Sedatives": "GiSyringe",
  "Medical Journals": "GiNotebook", "Thick Reference Tome": "GiBookCover",
  "Chemical Kit": "GiTestTubes", "University Keys": "GiKey",
  "Advanced Lockpicks": "GiLockpicks", "Forged Documents": "GiScrollUnfurled",
  "Concealed Blade": "GiStiletto", "Magnifying Glass": "GiMagnifyingGlass",
  "Evidence Bags": "GiSuitcase", "Concealed Pistol": "GiPistolGun",
  "Spirit Board": "GiCrystalBall", "Ectoplasm Vial": "GiGhost",
  "Tarot Deck": "GiCardRandom", "Arcane Texts": "GiSpellBook",
  "Occult Supplies": "GiCauldron", "Ritual Dagger": "GiKnifeThrust",
};

export const InvestigatorDossier = ({ character: charProp = null, readOnly = false }) => {
  const { character: storeChar, updateDrive, rollAction, takeMark, reviveCharacter, socket, accessSession, setStage, pendingGildedChoice, isRolling } = useGameStore(useShallow(s => ({
    character: s.character,
    updateDrive: s.updateDrive,
    rollAction: s.rollAction,
    takeMark: s.takeMark,
    reviveCharacter: s.reviveCharacter,
    socket: s.socket,
    accessSession: s.accessSession,
    setStage: s.setStage,
    pendingGildedChoice: s.pendingGildedChoice,
    isRolling: s.isRolling,
  })));
  const character = charProp || storeChar;
  const [infoTab, setInfoTab] = useState('role'); // 'role' | 'specialty' | 'profile'
  const [showGearModal, setShowGearModal] = useState(false);
  const [pendingGear, setPendingGear] = useState([]);
  // Pre-spend drive before rolling — keyed by drive category
  const [preSpend, setPreSpend] = useState({ nerve: 0, cunning: 0, intuition: 0 });
  // Toggled ability mods per action key
  const [activeMods, setActiveMods] = useState({});
  const toggleMod = (actionKey, modKey) => setActiveMods(prev => {
    const cur = prev[actionKey] || [];
    return { ...prev, [actionKey]: cur.includes(modKey) ? cur.filter(k => k !== modKey) : [...cur, modKey] };
  });

  const handleSpendDrive = (pool, value) => {
    if (readOnly) return;
    const maxDrive = character[`${pool}_max`] || 1;
    if (value >= 0 && value <= maxDrive) updateDrive(pool, value);
  };

  const sendGearUpdate = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      type: 'update_gear',
      payload: { character_id: character.id, gear: pendingGear },
    }));
    setShowGearModal(false);
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
        { key: 'sway', label: 'Sway' },
        { key: 'sneak', label: 'Read' },
        { key: 'hide', label: 'Hide' }
      ]
    },
    {
      name: 'Intuition',
      driveKey: 'intuition',
      actions: [
        { key: 'survey', label: 'Survey' },
        { key: 'read', label: 'Focus' },
        { key: 'sense', label: 'Sense' }
      ]
    }
  ];

  if (!character) return null;

  return (
    <div className="relative z-10 animate-fadeIn space-y-6">

      {/* Investigator Portrait Frame */}
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

      {/* Investigator Identity Headers */}
      <div className="grid grid-cols-3 gap-6 w-2/3 pb-2 font-mono">
        <div className="col-span-2">
          <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ INVESTIGATOR APPELLATION RECORD ]</span>
          <div className="text-xl font-serif font-black border-b border-black pb-0.5 text-black uppercase mt-1 truncate">{character.name}</div>
          {/* Role class + specialty badges */}
          {(() => {
            const displayRole = character.role || ROLE_FROM_ABILITY[character.role_ability] || '';
            const displaySpecialty = character.specialty || SPECIALTY_FROM_ABILITY[character.specialty_ability] || '';
            const roleIcon = ROLE_ICONS[displayRole] || 'GiEyeShield';
            return (displayRole || displaySpecialty) ? (
              <div className="flex flex-wrap gap-2.5 mt-2">
                {displayRole && (
                  <span className="font-mono text-sm font-black uppercase tracking-widest bg-[#1a1311] text-[#ebdcb9] px-2.5 py-1 flex items-center gap-1.5">
                    <SafeIcon name={roleIcon} size={14} />
                    {displayRole}
                  </span>
                )}
                {displaySpecialty && (
                  <span className="font-mono text-sm uppercase tracking-widest border border-black/30 text-black/60 px-2.5 py-1 flex items-center gap-1.5">
                    <SafeIcon name="GiMagnifyingGlass" size={14} />
                    {displaySpecialty}
                  </span>
                )}
              </div>
            ) : null;
          })()}
        </div>
        <div>
          <span className="block font-sans text-[8px] font-black uppercase tracking-wider text-black/40 leading-none">[ NOMENCLATURE PRONOUNS ]</span>
          <div className="text-sm font-bold italic border-b border-black pb-1 text-black/70 mt-1.5 truncate">{character.pronouns || 'UNLISTED'}</div>
        </div>
      </div>

      {/* Skeuomorphic Index Card — toggles between Role Asset, Specialty Asset, Motivational Profile */}
      <div className="w-full pr-48 relative" style={{ perspective: '1000px' }}>
        {/* Tab row — index card style tabs sticking up from behind */}
        <div className="flex gap-0 mb-0 relative z-10">
          {[
            { key: 'role', label: 'Role Asset', color: '#721c15' },
            { key: 'specialty', label: 'Specialty Asset', color: '#1a3a6a' },
            { key: 'profile', label: 'Motivational Profile', color: '#2d4a2a' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setInfoTab(tab.key)}
              className="px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-widest transition-all duration-150 rounded-t-sm mr-0.5"
              style={{
                background: infoTab === tab.key ? tab.color : `${tab.color}55`,
                color: infoTab === tab.key ? '#fdfaf4' : `${tab.color}bb`,
                transform: infoTab === tab.key ? 'translateY(1px)' : 'translateY(3px)',
                zIndex: infoTab === tab.key ? 20 : 10,
                position: 'relative',
                boxShadow: infoTab === tab.key ? 'inset 0 -2px 0 rgba(255,255,255,0.15)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card body — looks like an index card sitting on the desk */}
        <div
          className="relative rounded-sm rounded-tl-none"
          style={{
            background: '#fdfaf4',
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(0,0,100,0.07) 24px)',
            backgroundSize: '100% 24px',
            lineHeight: '24px',
            boxShadow: '3px 5px 18px rgba(0,0,0,0.28), inset 0 0 30px rgba(139,115,85,0.08)',
            border: '1px solid rgba(0,0,0,0.12)',
            minHeight: '110px',
            padding: '12px 16px',
          }}
        >
          {/* Red margin line like a real index card */}
          <div className="absolute top-0 bottom-0 left-10 w-[1px] bg-red-400/25 pointer-events-none" />

          <div className="pl-6 font-mono text-sm text-black/85">
            {infoTab === 'role' && (
              <div>
                <span className="font-sans text-[10px] font-black uppercase tracking-widest text-[#721c15] block mb-1">I. Role Asset</span>
                <p className="leading-relaxed">
                  <span className="font-bold uppercase text-black">{character.role_ability || "Ability"}:</span>{' '}
                  {ABILITY_TEXTS[character.role_ability] || <span className="text-black/30 italic">No ability recorded.</span>}
                </p>
              </div>
            )}
            {infoTab === 'specialty' && (
              <div>
                <span className="font-sans text-[10px] font-black uppercase tracking-widest text-[#1a3a6a] block mb-1">II. Specialty Asset</span>
                <p className="leading-relaxed">
                  <span className="font-bold uppercase text-black">{character.specialty_ability || "Specialty"}:</span>{' '}
                  {ABILITY_TEXTS[character.specialty_ability] || <span className="text-black/30 italic">No specialty recorded.</span>}
                </p>
              </div>
            )}
            {infoTab === 'profile' && (
              <div>
                <span className="font-sans text-[10px] font-black uppercase tracking-widest text-[#2d4a2a] block mb-1">III. Motivational Profile</span>
                {character.catalyst ? (
                  <p className="leading-relaxed">
                    <span className="font-sans text-[10px] font-black uppercase tracking-widest text-black/50 mr-2">Catalyst</span>
                    {character.catalyst}
                  </p>
                ) : null}
                {character.question ? (
                  <p className="leading-relaxed mt-1">
                    <span className="font-sans text-[10px] font-black uppercase tracking-widest text-black/50 mr-2">Question</span>
                    {character.question}
                  </p>
                ) : null}
                {!character.catalyst && !character.question && (
                  <span className="text-black/30 italic">No motivational profile recorded.</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <SheetDivider />

      {/* Actions section header */}
      <div className="flex items-center justify-between">
        <h3 className="font-sans text-sm font-black uppercase tracking-widest text-black flex items-center gap-2">
          <SafeIcon name="GiCrossedSwords" size={15} /> Actions
        </h3>
      </div>

      {/* Train bonus active indicator */}
      {character?.train_bonus && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#d4af37]/15 border border-[#d4af37]/50 text-[#7a5800] font-mono text-[9px] uppercase tracking-widest rounded-sm">
          <SafeIcon name="GiD6" size={11} />
          Train +1d active — bonus die consumed on next roll
        </div>
      )}

      {/* Action and Drive Pools Grid */}
      <div className="grid grid-cols-1 gap-4 bg-black/[0.02] border border-black/10 p-3 rounded-sm shadow-inner">
        {domainCategories.map((cat) => {
          const currentDrive = character[`${cat.driveKey}_current`] || 0;
          const maxDrive = character[`${cat.driveKey}_max`] || 1;
          const resistMax = Math.floor(maxDrive / 3);
          const resistSpent = character[`${cat.driveKey}_resistance_spent`] || 0;

          return (
            <div key={cat.name} className="bg-white/40 border border-black/20 p-3 rounded-sm grid grid-cols-2 gap-3">

              {/* LEFT: Drive section */}
              <div className="group/drive bg-white/60 border border-black/20 p-2.5 rounded-sm shadow-sm flex flex-col gap-2">
                {/* Drive title + pre-spend buttons */}
                <div className="flex items-center justify-between">
                  <span className="font-serif font-black text-base uppercase tracking-wide text-black" title={DRIVE_FLAVOR[cat.driveKey]}>{cat.name}</span>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreSpend(p => ({ ...p, [cat.driveKey]: Math.max(0, (p[cat.driveKey] || 0) - 1) }))}
                        disabled={(preSpend[cat.driveKey] || 0) <= 0}
                        className="w-5 h-5 bg-black/10 border border-black/20 text-[10px] font-black rounded-sm flex items-center justify-center hover:bg-black/20 disabled:opacity-30 transition-colors"
                      >−</button>
                      <span className="font-mono text-[10px] text-[#b8860b] font-black w-3 text-center">{preSpend[cat.driveKey] || 0}</span>
                      <button
                        onClick={() => setPreSpend(p => {
                          const maxSpend = Math.min(currentDrive, 6 - 1);
                          return { ...p, [cat.driveKey]: Math.min(maxSpend, (p[cat.driveKey] || 0) + 1) };
                        })}
                        disabled={(preSpend[cat.driveKey] || 0) >= Math.min(currentDrive, 5)}
                        className="w-5 h-5 bg-black/10 border border-black/20 text-[10px] font-black rounded-sm flex items-center justify-center hover:bg-black/20 disabled:opacity-30 transition-colors"
                      >+</button>
                    </div>
                  )}
                </div>
                {/* Available row */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-black/50 uppercase font-bold shrink-0 mr-2">Available</span>
                  <div className="flex gap-0.5 flex-wrap justify-end">
                    {Array.from({ length: DRIVE_PIP_TOTAL }).map((_, i) => (
                      <button
                        key={i}
                        onClick={!readOnly && i < maxDrive && i >= currentDrive ? () => handleSpendDrive(cat.driveKey, i + 1) : undefined}
                        className={`w-3.5 h-3.5 rounded-sm border transition-all focus:outline-none ${
                          i < currentDrive
                            ? 'bg-[#721c15] border-[#721c15]'
                            : i < maxDrive
                              ? 'bg-transparent border-black/40 hover:border-[#721c15]/50'
                              : 'bg-transparent border-black/15 opacity-30'
                        } ${!readOnly && i < maxDrive && i >= currentDrive ? 'cursor-pointer' : 'cursor-default'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Maximum row */}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-black/30 uppercase font-bold shrink-0 mr-2">Maximum</span>
                  <div className="flex gap-0.5 flex-wrap justify-end">
                    {Array.from({ length: DRIVE_PIP_TOTAL }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3.5 h-3.5 rounded-sm border ${
                          i < maxDrive
                            ? 'border-dashed border-black/35 bg-black/8'
                            : 'border-dotted border-black/10 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Resistance pips */}
                <div className="flex items-center justify-between pt-1.5 border-t border-black/10">
                  <span className="font-mono text-xs text-black/50 uppercase font-bold">Resistance</span>
                  <div className="flex gap-2">
                    {Array.from({ length: resistMax }).map((_, i) => (
                      <svg key={i} width="14" height="12" viewBox="0 0 14 12" title={i < resistSpent ? 'Spent' : 'Available'}>
                        <polygon
                          points="7,1 1,11 13,11"
                          fill={i < resistSpent ? '#721c15' : 'transparent'}
                          stroke={i < resistSpent ? '#721c15' : '#1a1311'}
                          strokeWidth="1.5"
                        />
                      </svg>
                    ))}
                    {resistMax === 0 && (
                      <span className="font-mono text-xs text-black/25 italic">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Actions section */}
              <div className="space-y-2 flex flex-col justify-center">
                {cat.actions.map((act) => {
                  const actionValue = character[act.key] || 0;
                  const isGilded = character[`gilded_${act.key}`] === true || character[`gilded_${act.key}`] === 1 || character[`gilded_${act.key}`] === "true";

                  const availMods = !readOnly ? getAvailableRollMods(character, act.key) : [];
                  const selectedMods = activeMods[act.key] || [];

                  return (
                    <div key={act.key} className="py-0.5 group/action" title={ACTION_FLAVOR[act.key]}>
                      <div className="flex justify-between items-center">
                        {readOnly ? (
                          <span className="font-mono text-sm font-bold uppercase tracking-tight flex items-center gap-1.5 text-black/70">
                            {isGilded && <div className="w-2 h-2 bg-[#d4af37] rounded-full" />}
                            {act.label}
                          </span>
                        ) : (
                          <button
                            disabled={!!pendingGildedChoice || !!isRolling}
                            onClick={() => {
                              const spend = preSpend[cat.driveKey] || 0;
                              const actionRating = character[act.key] || 0;
                              const effectiveSpend = Math.min(spend, Math.max(0, 6 - actionRating));
                              setPreSpend(p => ({ ...p, [cat.driveKey]: 0 }));
                              setActiveMods(p => ({ ...p, [act.key]: [] }));
                              rollAction(act.key, effectiveSpend, false, selectedMods);
                            }}
                            className={`font-mono text-sm font-bold uppercase tracking-tight flex items-center gap-1.5 text-left transition-colors ${(pendingGildedChoice || isRolling) ? 'opacity-40 cursor-not-allowed' : 'hover:text-red-800'}`}
                            style={{ touchAction: 'manipulation' }}
                          >
                            {isGilded && <div className="w-2 h-2 bg-[#d4af37] rounded-full" />}
                            {act.label}
                            {preSpend[cat.driveKey] > 0 && (
                              <span className="font-mono text-xs text-[#d4af37] font-black">+{preSpend[cat.driveKey]}d</span>
                            )}
                          </button>
                        )}
                        <div className="flex gap-1">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full border border-black ${i < actionValue ? 'bg-[#721c15]' : 'bg-transparent'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {availMods.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {availMods.map(mod => {
                            const on = selectedMods.includes(mod.key);
                            return (
                              <button
                                key={mod.key}
                                onClick={() => toggleMod(act.key, mod.key)}
                                className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border transition-colors ${
                                  on ? 'bg-[#d4af37]/20 border-[#d4af37]/70 text-[#7a5800]' : 'border-black/20 text-black/35 hover:border-black/40 hover:text-black/50'
                                }`}
                              >
                                {mod.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <SheetDivider />

      {/* Vital Damage & Post-Mortem Ledger */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

        {/* Damage Tracks Column */}
        <div className="md:col-span-5 bg-black/[0.02] border-2 border-black p-4 rounded-sm flex flex-col justify-between shadow-inner">
          <div>
            <h3 className="font-sans text-sm font-black uppercase tracking-widest text-black border-b border-black/30 pb-1 mb-4 flex items-center gap-2">
              <SafeIcon name="GiBleedingEye" size={22} className="text-[#721c15]" /> Marks
            </h3>
            <div className="space-y-4">
              {['body', 'brain', 'bleed'].map((type) => (
                <div key={type} className="flex justify-between items-center">
                  {readOnly ? (
                    <span className="font-sans font-black uppercase tracking-widest text-sm text-black">{type}</span>
                  ) : (
                    <button
                      onClick={() => takeMark(type)}
                      className="font-sans font-black uppercase tracking-widest text-sm text-black hover:text-red-800 transition-colors border-b border-dashed border-transparent hover:border-red-800"
                    >
                      {type} [+]
                    </button>
                  )}
                  <div className={`flex gap-2 ${!readOnly ? 'cursor-pointer group' : ''}`} onClick={readOnly ? undefined : () => takeMark(type)}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-7 border-2 border-black shadow-inner rounded-sm transition-all duration-150 ${
                          character && i < character[`${type}_marks`]
                            ? 'bg-black transform rotate-3 scale-105'
                            : readOnly ? 'bg-transparent' : 'bg-transparent group-hover:bg-black/20 group-hover:border-red-800/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-black/10 text-xs font-mono text-black/50 flex justify-between items-center uppercase">
            <span>Trauma Status:</span>
            <span className={`font-bold ${character?.is_dead ? 'text-black' : character?.incapacitated ? 'text-[#721c15]' : 'text-black'}`}>
              {character?.is_dead ? "DECEASED" : character?.incapacitated ? "INCAPACITATED" : "OPERATIONAL"}
            </span>
          </div>
          {character?.is_dead && !readOnly && (
            <button
              onClick={() => setStage('CHARACTER_CREATION')}
              className="mt-2 w-full py-1.5 font-mono text-[10px] font-black uppercase tracking-widest border-2 border-black text-black hover:bg-black hover:text-white transition-all rounded-sm"
            >
              Select New Investigator →
            </button>
          )}
          {character?.incapacitated && !character?.is_dead && !readOnly && (
            <button
              onClick={reviveCharacter}
              className="mt-2 w-full py-1.5 font-mono text-[10px] font-black uppercase tracking-widest border border-[#721c15]/60 text-[#721c15] hover:bg-[#721c15] hover:text-white transition-all rounded-sm"
            >
              Revive — Return to Operational
            </button>
          )}
        </div>

        {/* Scars — editable textarea for players, list view for GM readOnly */}
        <div className="md:col-span-7 bg-[#fcf9f2] border-2 border-dashed border-black/60 p-4 rounded-sm relative shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="absolute top-1 right-2 font-mono text-[9px] text-black/30 tracking-tight uppercase">Official Worker Accident Form</div>
          <div>
            <div className="flex justify-between items-center border-b border-black/40 pb-1 mb-2">
              <h3 className="font-sans text-sm font-black uppercase tracking-widest text-black flex items-center gap-2">
                <SafeIcon name="GiQuillInk" size={18} /> Medical Trauma Report
              </h3>
              <span className="font-mono text-xs font-bold bg-black text-white py-1 rounded-sm inline-flex items-center justify-between min-w-[9rem] px-3">
                <span className="uppercase tracking-widest">Scars</span>
                <span className="tracking-normal">{character?.scars_count || 0} / 4</span>
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-1.5 pt-1"
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 19px, rgba(0, 0, 0, 0.08) 20px)',
                 backgroundSize: '100% 20px',
                 lineHeight: '20px'
               }}>
            {character?.scars_list?.length > 0 ? (
              character.scars_list.map((scar, i) => (
                <p key={i} className="font-mono text-xs text-black/80 italic pl-1">— {scar}</p>
              ))
            ) : (
              <p className="font-mono text-xs text-black/30 italic">No accidents on record.</p>
            )}
          </div>
        </div>
      </div>

      <SheetDivider />

      {/* Equipment Ledger */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-sans text-sm font-black uppercase tracking-widest text-black flex items-center gap-2">
            <SafeIcon name="GiBriefcase" size={18} /> Equipment Ledger
          </h3>
          {!readOnly && (
            <button
              onClick={() => {
            const available = [...STANDARD_GEAR, ...(character.specialty ? (SPECIALTY_GEAR[character.specialty] || []) : [])];
            setPendingGear((character.gear || []).filter(item => available.includes(item)));
            setShowGearModal(true);
          }}
              className="text-[10px] font-mono font-black uppercase tracking-wider border border-black/30 px-3 py-1.5 hover:bg-black/5 transition-colors rounded-sm"
            >
              Change Gear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(character.gear || []).length > 0 ? (
            (character.gear || []).map(item => (
              <span key={item} className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-tight bg-black/5 border border-black/15 px-2.5 py-1.5 rounded-sm">
                <SafeIcon name={GEAR_ICONS[item] || 'GiSuitcase'} size={13} />
                {item}
              </span>
            ))
          ) : (
            <span className="font-mono text-xs italic text-black/30">No equipment on record.</span>
          )}
        </div>
      </div>

      {/* Gear Change Modal */}
      {showGearModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center" style={{ background: 'rgba(10,6,4,0.82)' }}
          onClick={() => setShowGearModal(false)}>
          <div className="relative rounded-sm overflow-y-auto" onClick={e => e.stopPropagation()}
            style={{ width: 500, maxHeight: '80vh', background: '#f5ead0', border: '3px double rgba(62,42,26,0.7)', padding: '32px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
            <h2 className="text-2xl font-serif font-black text-[#1a1311] mb-1">Change Equipment</h2>
            <p className="text-sm font-sans text-[#5a3a28]/60 mb-5">Select up to 3 items. Gear can be changed freely between assignments.</p>

            {character.specialty && SPECIALTY_GEAR[character.specialty] && (
              <div className="mb-4">
                <p className="text-xs font-sans font-black uppercase tracking-wider text-[#721c15] mb-2">Signature Equipment — {character.specialty}</p>
                <div className="space-y-1.5">
                  {SPECIALTY_GEAR[character.specialty].map(item => {
                    const sel = pendingGear.includes(item);
                    return (
                      <div key={item} onClick={() => sel ? setPendingGear(g => g.filter(x=>x!==item)) : pendingGear.length < 3 && setPendingGear(g=>[...g,item])}
                        className="flex items-center gap-3 p-2.5 cursor-pointer transition-all select-none rounded-sm"
                        style={{ background: sel ? 'rgba(114,28,21,0.1)' : 'rgba(228,207,160,0.3)', border:`1px solid ${sel?'#721c15':'rgba(90,58,40,0.22)'}` }}>
                        <div className={`w-4 h-4 border flex items-center justify-center text-xs shrink-0 ${sel?'bg-[#721c15] border-[#721c15] text-white':'border-[#5a3a28]/40'}`}>{sel&&'✓'}</div>
                        <SafeIcon name={GEAR_ICONS[item]||'GiSuitcase'} size={15} style={{ color: sel?'#721c15':'#5a3a28', flexShrink:0 }} />
                        <span className={`text-sm font-serif ${sel?'font-bold text-[#1a1311]':'text-[#1a1311]/75'}`}>{item}</span>
                        <span className="ml-auto text-[9px] font-sans font-black uppercase text-[#721c15]/60 tracking-tight shrink-0">[Sig]</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-xs font-sans font-black uppercase tracking-wider text-[#5a3a28]/55 mb-2">Standard Issue Equipment</p>
              <div className="space-y-1.5">
                {STANDARD_GEAR.map(item => {
                  const sel = pendingGear.includes(item);
                  return (
                    <div key={item} onClick={() => sel ? setPendingGear(g => g.filter(x=>x!==item)) : pendingGear.length < 3 && setPendingGear(g=>[...g,item])}
                      className="flex items-center gap-3 p-2.5 cursor-pointer transition-all select-none rounded-sm"
                      style={{ background: sel ? 'rgba(114,28,21,0.08)' : 'rgba(228,207,160,0.15)', border:`1px solid ${sel?'#721c1580':'rgba(90,58,40,0.15)'}` }}>
                      <div className={`w-4 h-4 border flex items-center justify-center text-xs shrink-0 ${sel?'bg-[#721c15] border-[#721c15] text-white':'border-[#5a3a28]/35'}`}>{sel&&'✓'}</div>
                      <SafeIcon name={GEAR_ICONS[item]||'GiSuitcase'} size={15} style={{ color: sel?'#721c15':'#5a3a28', flexShrink:0 }} />
                      <span className={`text-sm font-serif ${sel?'font-bold text-[#1a1311]':'text-[#1a1311]/60'}`}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid rgba(62,42,26,0.18)' }}>
              <span className="text-sm font-sans font-black text-[#5a3a28]/60">{pendingGear.length} / 3 selected</span>
              <div className="flex gap-3">
                <button onClick={() => setShowGearModal(false)}
                  className="px-4 py-2 text-xs font-sans font-black uppercase tracking-widest border border-[#5a3a28]/25 hover:border-[#5a3a28]/50 text-[#5a3a28]/60 transition-colors rounded-sm">
                  Cancel
                </button>
                <button onClick={sendGearUpdate}
                  className="px-6 py-2 text-xs font-sans font-black uppercase tracking-widest rounded-sm shadow transition-all"
                  style={{ background: '#721c15', color: '#fdfaf4' }}>
                  Confirm →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
