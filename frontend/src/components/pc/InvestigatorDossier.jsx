import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { SheetDivider } from '../shared/Decorations';
import { SafeIcon } from '../shared/SafeIcon';
import { ScarIcon } from '../shared/ScarIcon';
import { getAvailableRollMods } from './DiceVault';
import { ACTION_LABEL, scarDisplayText } from '../../game/actions';
import { useMarkUndo, MARK_NAME } from './useMarkUndo';
import { useDialog } from '../shared/useDialog';
import { tiltFor } from '../shared/handPlaced';
import { FormLine, SerialNo, PrinterMark, serialFor } from '../shared/PrintMarks';
import { PhotoMount } from '../shared/PhotoMount';
import { usePortraitChange } from './usePortraitChange';

// A die face (three pips). The whole action row is the roll; this die only shows on hover
// or keyboard focus (.action-die in index.css), never as a standing icon on every row.
const DieGlyph = ({ className = '' }) => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false" className={className}>
    <rect x="1.25" y="1.25" width="13.5" height="13.5" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="4.9" cy="4.9" r="1.25" fill="currentColor" />
    <circle cx="8" cy="8" r="1.25" fill="currentColor" />
    <circle cx="11.1" cy="11.1" r="1.25" fill="currentColor" />
  </svg>
);

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
  nerve: 'Raw physicality: force, endurance, and the will to act with your body.',
  cunning: 'Subtle control: deception, concealment, and unseen manipulation.',
  intuition: 'Heightened awareness: perception, empathy, and the supernatural sense.',
};

const ACTION_FLAVOR = {
  move:    'Run, dodge, or navigate: raw movement through danger.',
  strike:  'Punch, break, or knock down: direct physical force.',
  control: 'Drive, shoot, or finesse: precise command of tools and situations.',
  sway:    'Convince, command, or consort: social pressure and persuasion.',
  sneak:   'Interpret body language, spot lies, gather motives.',
  hide:    'Sneak, distract, or sleight of hand: concealment and misdirection.',
  survey:  'Search, track, or spot: reading an environment for detail.',
  read:    'Inspect, analyze, or remember: focused mental examination.',
  sense:   'Attune, channel, or reveal: perception of the supernatural.',
};

const DRIVE_PIP_TOTAL = 9;

// Filled mark boxes are inked by hand: each box keeps its own small lean
const MARK_TILT = [-2, 1.5, -1];

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
  const { character: storeChar, updateDrive, rollAction, takeMark, reviveCharacter, socket, accessSession, setStage, pendingGildedChoice, isRolling, setLocalCharacter } = useGameStore(useShallow(s => ({
    character: s.character,
    setLocalCharacter: s.setLocalCharacter,
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
  const { held: heldMark, hold: holdMark, undo: undoMark, secondsLeft: markSecondsLeft, sendError: markSendError } = useMarkUndo(takeMark);
  // The player's own photo: the answer to a change is the sheet as the table now has it
  const photoInputRef = useRef(null);
  const portrait = usePortraitChange({
    characterId: storeChar?.id,
    current: storeChar ? (storeChar.profile_pic ?? storeChar.profilePic ?? null) : null,
    onSaved: (saved) => {
      if (saved?.id != null && useGameStore.getState().character?.id === saved.id) setLocalCharacter(saved);
    },
  });
  const [infoTab, setInfoTab] = useState('role'); // 'role' | 'specialty' | 'profile'
  const [showGearModal, setShowGearModal] = useState(false);
  const [pendingGear, setPendingGear] = useState([]);
  const gearDialogRef = useDialog({ open: showGearModal, onClose: () => setShowGearModal(false) });
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
        { key: 'move', label: ACTION_LABEL.move },
        { key: 'strike', label: ACTION_LABEL.strike },
        { key: 'control', label: ACTION_LABEL.control }
      ]
    },
    {
      name: 'Cunning',
      driveKey: 'cunning',
      actions: [
        { key: 'sway', label: ACTION_LABEL.sway },
        { key: 'sneak', label: ACTION_LABEL.sneak },
        { key: 'hide', label: ACTION_LABEL.hide }
      ]
    },
    {
      name: 'Intuition',
      driveKey: 'intuition',
      actions: [
        { key: 'survey', label: ACTION_LABEL.survey },
        { key: 'read', label: ACTION_LABEL.read },
        { key: 'sense', label: ACTION_LABEL.sense }
      ]
    }
  ];

  if (!character) return null;

  // The photo. On the player's own desk it can be added or changed (owner's item 15); the
  // GM's copy of the sheet only shows it.
  const canChangePhoto = !readOnly && character.id != null && character.id === storeChar?.id;
  const photo = canChangePhoto ? portrait.shown : (character.profile_pic ?? character.profilePic ?? null);
  const pickPhoto = () => photoInputRef.current?.click();
  const onPhotoPicked = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be picked again
    if (file) portrait.change(file);
  };
  const photoInside = photo ? (
    <img src={photo} className={`w-full h-full object-cover grayscale contrast-125 sepia-[0.25] transition-opacity ${portrait.busy ? 'opacity-60' : ''}`} alt={`Portrait of ${character.name}`} />
  ) : (
    <PhotoMount className="w-full h-full">
      {canChangePhoto && !portrait.busy && (
        <span aria-hidden="true" className="absolute z-[3] inset-x-1 bottom-1.5 md:inset-x-3 md:bottom-3 border border-oxblood/70 bg-cream/85 px-1 py-1 md:py-1.5 rounded-sm font-sans text-xs font-black uppercase tracking-wider leading-tight text-oxblood group-hover:bg-oxblood group-hover:text-cream transition-colors">
          Add portrait
        </span>
      )}
    </PhotoMount>
  );
  // Saving, then Undo for a few seconds; or what went wrong
  const photoNote = !canChangePhoto ? null
    : portrait.error ? (
      <p role="alert" className="font-serif text-base text-oxblood leading-snug">{portrait.error}</p>
    ) : portrait.phase === 'changed' ? (
      <div className="flex flex-wrap items-center justify-between gap-2 border border-oxblood/40 bg-oxblood/5 px-3 py-2 rounded-sm">
        <p className="font-serif text-base text-ink leading-snug min-w-0 flex-1 basis-24">Portrait changed.</p>
        <button
          type="button"
          onClick={portrait.undo}
          className="shrink-0 min-h-[40px] px-3 font-sans text-xs font-black uppercase tracking-widest border border-oxblood text-oxblood hover:bg-oxblood hover:text-cream rounded-sm transition-colors"
        >
          Undo <span className="font-mono tabular-nums">{portrait.secondsLeft}s</span>
        </button>
      </div>
    ) : null;

  const gear = character.gear || [];
  const openGearModal = () => {
    const available = [...STANDARD_GEAR, ...(character.specialty ? (SPECIALTY_GEAR[character.specialty] || []) : [])];
    setPendingGear(gear.filter(item => available.includes(item)));
    setShowGearModal(true);
  };
  const displayRole = character.role || ROLE_FROM_ABILITY[character.role_ability] || '';
  const displaySpecialty = character.specialty || SPECIALTY_FROM_ABILITY[character.specialty_ability] || '';
  const roleIcon = ROLE_ICONS[displayRole] || 'GiEyeShield';

  // The sheet is one column on a phone and a ledger page from 44rem of its own width; the
  // .dossier rules in index.css place the parts (container query, so the GM's copy of the
  // sheet follows its own column, not the window).
  return (
    <div className="dossier-c relative z-10 animate-fadeIn">
    <div className="dossier space-y-6">

      {/* Investigator Portrait Frame: a photograph taped to the sheet. On the player's own
          desk it is a button: tap it to add a photo or change it, with Undo after. */}
      <div className="dossier-photo-cell">
        <div className="dossier-photo relative float-right ml-3 mb-2 w-24 h-[120px] p-1.5 md:float-none md:m-0 md:absolute md:top-0 md:right-0 md:w-44 md:h-[220px] md:p-2 bg-cream border border-ink/10 shadow-[4px_10px_24px_rgba(0,0,0,0.5)] transform rotate-2 hover:rotate-0 hover:scale-105 duration-200 transition-all z-30 group">
          <div className="absolute z-10 -top-3 md:-top-3.5 left-1/2 -translate-x-1/2 w-12 md:w-20 h-3 md:h-4 bg-parchment-deep/80 -rotate-3 border border-ink/5 mix-blend-multiply shadow-sm" />
          {canChangePhoto ? (
            <button
              type="button"
              onClick={pickPhoto}
              disabled={portrait.busy}
              aria-busy={portrait.busy || undefined}
              aria-label={photo ? 'Change portrait' : 'Add portrait'}
              className="photo-button relative block w-full h-full overflow-hidden text-center disabled:cursor-wait"
            >
              {photoInside}
              {(photo || portrait.busy) && (
                <span aria-hidden="true" className="photo-caption absolute z-[3] inset-x-0 bottom-0 bg-cream/90 border-t border-ink/15 px-1 py-1 font-sans text-xs font-black uppercase tracking-wider leading-tight text-ink">
                  {portrait.phase === 'undoing' ? 'Undoing…'
                    : portrait.busy ? 'Saving…'
                    : <><span className="md:hidden">Change</span><span className="hidden md:inline">Change portrait</span></>}
                </span>
              )}
            </button>
          ) : (
            <div className="relative w-full h-full overflow-hidden">
              {photoInside}
              {!photo && <span className="sr-only">No portrait</span>}
            </div>
          )}
        </div>
        {canChangePhoto && <div className="dossier-photo-note-wide">{photoNote}</div>}
      </div>
      {canChangePhoto && (
        <>
          <input ref={photoInputRef} type="file" accept="image/*" tabIndex={-1} aria-hidden="true" className="hidden" onChange={onPhotoPicked} />
          <p role="status" className="sr-only">
            {portrait.busy ? (portrait.phase === 'undoing' ? 'Putting the last portrait back.' : 'Saving the portrait.')
              : portrait.phase === 'changed' ? 'Portrait changed.' : ''}
          </p>
        </>
      )}

      {/* The form's printed head: its number, and the registry's serial in red */}
      <div className="dossier-form flex items-center gap-2 md:w-2/3 -mt-1" aria-hidden="true">
        <PrinterMark size={13} />
        <FormLine>Form C.O. 7<span className="hidden sm:inline"> · Investigator record</span></FormLine>
        <SerialNo value={serialFor(character.id)} className="ml-auto" />
      </div>

      {/* Investigator Identity Headers: the name with the role and specialty under it,
          the pronouns beside them */}
      <div data-desk="identity" className="dossier-ident grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-x-6 sm:gap-y-2 md:w-2/3 pb-2">
        <div className="sm:col-span-2 min-w-0">
          <span className="block font-sans text-xs font-black uppercase tracking-normal text-sepia leading-tight">Investigator</span>
          <div className="text-xl font-serif font-black border-b border-ink pb-0.5 text-ink uppercase mt-1 truncate">{character.name}</div>
        </div>
        {/* Role class + specialty badges */}
        {(displayRole || displaySpecialty) ? (
          <div className="sm:col-span-2 sm:row-start-2 flex flex-wrap gap-2 sm:gap-2.5">
            {displayRole && (
              <span className="dossier-badge font-sans text-sm font-black uppercase tracking-widest bg-ink text-parchment px-2.5 py-1 flex items-center gap-1.5">
                <SafeIcon name={roleIcon} size={14} />
                {displayRole}
              </span>
            )}
            {displaySpecialty && (
              <span className="dossier-badge font-sans font-bold text-sm uppercase tracking-widest border border-ink/30 text-sepia px-2.5 py-1 flex items-center gap-1.5">
                <SafeIcon name="GiMagnifyingGlass" size={14} />
                {displaySpecialty}
              </span>
            )}
          </div>
        ) : null}
        <div className="min-w-0 sm:col-start-3 sm:row-start-1">
          <span className="block font-sans text-xs font-black uppercase tracking-normal text-sepia leading-tight">Pronouns</span>
          <div className="text-sm font-bold italic border-b border-ink pb-1 text-ink/70 mt-1.5 truncate">{character.pronouns || 'Not given'}</div>
        </div>
      </div>

      {/* The photo's note, under the name while the sheet is one column */}
      {canChangePhoto && photoNote && <div className="dossier-photo-note-narrow flow-root md:w-2/3">{photoNote}</div>}

      {/* Gear: a requisition slip from the chapter stores laid on the sheet under the name,
          a little crooked, its bottom edge torn off the pad. Each item is drawn large. */}
      <div data-desk="gear" className="dossier-gear md:w-2/3 clear-both md:clear-none"
        style={{ filter: 'drop-shadow(2px 5px 5px rgba(0,0,0,0.22))' }}>
        <div
          className="hand-placed deckle-bottom bg-parchment border-x border-t border-sepia/25 px-3 pt-2 pb-4"
          style={{ '--tilt': `${tiltFor(`gear-${character.id ?? ''}`, { min: 0.5, max: 1.2, sign: 1 })}deg` }}
        >
          <div className="flex items-center gap-2 border-b border-dashed border-sepia/45 pb-1.5 mb-2">
            <h3 className="font-sans text-sm font-black uppercase tracking-widest text-ink flex items-center gap-2 whitespace-nowrap">
              <SafeIcon name="GiBriefcase" size={18} /> Gear
            </h3>
            {!readOnly && (
              <button
                type="button"
                onClick={openGearModal}
                className="ml-auto whitespace-nowrap min-h-[32px] [@media(pointer:coarse)]:min-h-[40px] text-xs font-sans font-black uppercase tracking-wider border border-ink/30 px-2.5 py-1 hover:bg-black/5 hover:border-ink/50 transition-colors rounded-sm"
              >
                Change gear
              </button>
            )}
          </div>
          <ul className="grid grid-cols-3 gap-1.5">
            {gear.map(item => (
              <li key={item} className="flex flex-col items-center gap-1 text-center px-1 pt-1.5 pb-1 min-h-[4.75rem] min-w-0">
                <SafeIcon name={GEAR_ICONS[item] || 'GiSuitcase'} size={30} className="text-ink shrink-0" />
                <span className="font-serif font-semibold text-sm leading-tight text-ink break-words">{item}</span>
              </li>
            ))}
            {/* The gear slots not yet filled, printed on the slip and left blank */}
            {Array.from({ length: Math.max(0, 3 - gear.length) }).map((_, i) => (
              <li key={`slot-${i}`} aria-hidden="true" className="min-h-[4.75rem] border border-dashed border-sepia/35 rounded-sm" />
            ))}
          </ul>
          {gear.length === 0 && <span className="sr-only">No gear</span>}
        </div>
      </div>

      {/* Index card: the role ability, the specialty ability, then catalyst and question */}
      <div data-desk="abilities" className="dossier-ability w-full md:pr-48 relative clear-both md:clear-none" style={{ perspective: '1000px' }}>
        {/* Tab row — index card style tabs sticking up from behind */}
        <div className="flex gap-0 mb-0 relative z-10">
          {/* One scheme for every tab: the open one in oxblood, the others older paper */}
          {[
            { key: 'role', label: 'Role ability' },
            { key: 'specialty', label: 'Specialty ability' },
            { key: 'profile', label: 'Catalyst' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              aria-pressed={infoTab === tab.key}
              onClick={() => setInfoTab(tab.key)}
              className="max-sm:flex-1 max-sm:min-h-[36px] leading-tight px-2 sm:px-3 py-1.5 text-xs font-sans font-black uppercase tracking-wider sm:tracking-widest transition-all duration-150 rounded-t-sm mr-0.5"
              style={{
                background: infoTab === tab.key ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-parchment-deep))',
                color: infoTab === tab.key ? 'rgb(var(--c-cream))' : 'rgb(var(--c-sepia))',
                transform: infoTab === tab.key ? 'translateY(1px)' : 'translateY(3px)',
                zIndex: infoTab === tab.key ? 20 : 10,
                position: 'relative',
                boxShadow: infoTab === tab.key ? 'inset 0 -2px 0 rgb(var(--c-cream)/0.15)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Card body — looks like an index card sitting on the desk */}
        <div
          className="dossier-ability-card relative rounded-sm rounded-tl-none"
          style={{
            background: 'rgb(var(--c-cream))',
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgb(var(--c-sepia) / 0.12) 24px)',
            backgroundSize: '100% 24px',
            lineHeight: '24px',
            boxShadow: '3px 5px 18px rgba(0,0,0,0.28), inset 0 0 30px rgb(var(--c-sepia) / 0.08)',
            border: '1px solid rgba(0,0,0,0.12)',
            minHeight: '110px',
            padding: '12px 16px',
          }}
        >
          {/* Red margin line like a real index card */}
          <div className="absolute top-0 bottom-0 left-8 sm:left-10 w-[1px] bg-oxblood-lit/25 pointer-events-none" />

          <div className="pl-4 sm:pl-6 font-serif text-base text-ink break-words">
            {infoTab === 'role' && (
              <div>
                <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood block mb-1">{character.role || 'Role'} ability</span>
                <p className="leading-relaxed">
                  <span className="font-bold uppercase text-ink">{character.role_ability || "Ability"}:</span>{' '}
                  {ABILITY_TEXTS[character.role_ability] || <span className="text-sepia italic">None chosen</span>}
                </p>
              </div>
            )}
            {infoTab === 'specialty' && (
              <div>
                <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood block mb-1">{character.specialty || 'Specialty'} ability</span>
                <p className="leading-relaxed">
                  <span className="font-bold uppercase text-ink">{character.specialty_ability || "Specialty"}:</span>{' '}
                  {ABILITY_TEXTS[character.specialty_ability] || <span className="text-sepia italic">None chosen</span>}
                </p>
              </div>
            )}
            {infoTab === 'profile' && (
              <div>
                <span className="font-sans text-xs font-black uppercase tracking-widest text-oxblood block mb-1">Catalyst and question</span>
                {character.catalyst ? (
                  <p className="leading-relaxed">
                    <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia mr-2">Catalyst</span>
                    {character.catalyst}
                  </p>
                ) : null}
                {character.question ? (
                  <p className="leading-relaxed mt-1">
                    <span className="font-sans text-xs font-black uppercase tracking-widest text-sepia mr-2">Question</span>
                    {character.question}
                  </p>
                ) : null}
                {!character.catalyst && !character.question && (
                  <span className="text-sepia italic">Not written</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <SheetDivider className="dossier-divider" />

      <section className="dossier-actions space-y-4" aria-labelledby={`actions-${character.id ?? 'sheet'}`}>
      {/* Actions section header */}
      <div className="flex items-center justify-between">
        <h3 id={`actions-${character.id ?? 'sheet'}`} className="font-sans text-sm font-black uppercase tracking-widest text-ink flex items-center gap-2">
          <SafeIcon name="GiCrossedSwords" size={15} /> Actions
        </h3>
        {/* Train bonus active indicator */}
        {character?.train_bonus && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-candle-gold/15 border border-candle-gold/50 text-ink font-sans font-bold text-xs uppercase tracking-widest rounded-sm">
            <SafeIcon name="GiDiceSixFacesSix" size={11} />
            Train: +1d on your next roll
          </span>
        )}
      </div>

      {/* Action and Drive Pools Grid */}
      <div data-desk="drives" className="dossier-drives grid grid-cols-1 gap-4 bg-black/[0.02] border border-ink/10 p-3 rounded-sm shadow-inner">
        {domainCategories.map((cat) => {
          const currentDrive = character[`${cat.driveKey}_current`] || 0;
          const maxDrive = character[`${cat.driveKey}_max`] || 1;
          const resistMax = Math.floor(maxDrive / 3);
          const resistSpent = character[`${cat.driveKey}_resistance_spent`] || 0;

          return (
            <div key={cat.name} className="dossier-drive border p-3 rounded-sm grid grid-cols-1 sm:grid-cols-2 gap-3"
              style={{ background: `rgb(var(--c-drive-${cat.driveKey}) / 0.07)`, borderColor: `rgb(var(--c-drive-${cat.driveKey}) / 0.3)` }}>

              {/* LEFT: Drive section */}
              <div className="dossier-drive-panel group/drive bg-cream/60 border border-ink/20 p-2.5 rounded-sm shadow-sm flex flex-col gap-2">
                {/* Drive title + pre-spend buttons */}
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-lg uppercase tracking-wide" style={{ color: `rgb(var(--c-drive-${cat.driveKey}))` }} title={DRIVE_FLAVOR[cat.driveKey]}>{cat.name}</span>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreSpend(p => ({ ...p, [cat.driveKey]: Math.max(0, (p[cat.driveKey] || 0) - 1) }))}
                        disabled={(preSpend[cat.driveKey] || 0) <= 0}
                        aria-label={`Spend one less ${cat.name}`}
                        className="w-5 h-5 [@media(pointer:coarse)]:w-8 [@media(pointer:coarse)]:h-8 bg-black/10 border border-ink/20 text-xs font-black rounded-sm flex items-center justify-center hover:bg-black/20 disabled:opacity-30 transition-colors"
                      >−</button>
                      <span className={`font-mono tabular-nums text-xs font-black w-7 text-center ${(preSpend[cat.driveKey] || 0) > 0 ? 'text-oxblood' : 'text-sepia'}`}>+{preSpend[cat.driveKey] || 0}d</span>
                      <button
                        onClick={() => setPreSpend(p => {
                          const maxSpend = Math.min(currentDrive, 6 - 1);
                          return { ...p, [cat.driveKey]: Math.min(maxSpend, (p[cat.driveKey] || 0) + 1) };
                        })}
                        disabled={(preSpend[cat.driveKey] || 0) >= Math.min(currentDrive, 5)}
                        aria-label={`Spend one more ${cat.name} for +1d`}
                        className="w-5 h-5 [@media(pointer:coarse)]:w-8 [@media(pointer:coarse)]:h-8 bg-black/10 border border-ink/20 text-xs font-black rounded-sm flex items-center justify-center hover:bg-black/20 disabled:opacity-30 transition-colors"
                      >+</button>
                    </div>
                  )}
                </div>
                {/* Available row */}
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs text-sepia uppercase font-bold shrink-0 mr-2" id={`drive-avail-${cat.driveKey}`}>Available</span>
                  <div className="drive-pips flex gap-0.5 flex-wrap justify-end" role="group" aria-labelledby={`drive-avail-${cat.driveKey}`}>
                    <span className="sr-only">{cat.name}: {currentDrive} of {maxDrive} available.</span>
                    {Array.from({ length: DRIVE_PIP_TOTAL }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={!(!readOnly && i < maxDrive && i >= currentDrive)}
                        aria-label={`Set ${cat.name} available to ${i + 1}`}
                        aria-hidden={!readOnly && i < maxDrive && i >= currentDrive ? undefined : true}
                        onClick={!readOnly && i < maxDrive && i >= currentDrive ? () => handleSpendDrive(cat.driveKey, i + 1) : undefined}
                        className={`drive-pip w-3.5 h-3.5 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 rounded-sm border transition-all ${
                          i < currentDrive
                            ? ''
                            : i < maxDrive
                              ? 'bg-transparent border-ink/40 hover:border-oxblood/50'
                              : 'bg-transparent border-ink/15 opacity-30'
                        } ${!readOnly && i < maxDrive && i >= currentDrive ? 'cursor-pointer' : 'cursor-default'}`}
                        style={i < currentDrive ? { background: `rgb(var(--c-drive-${cat.driveKey}))`, borderColor: `rgb(var(--c-drive-${cat.driveKey}))` } : undefined}
                      />
                    ))}
                  </div>
                </div>

                {/* Maximum row */}
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs text-sepia uppercase font-bold shrink-0 mr-2">Maximum</span>
                  <div className="drive-pips flex gap-0.5 flex-wrap justify-end" role="img" aria-label={`${cat.name} maximum: ${maxDrive}`}>
                    {Array.from({ length: DRIVE_PIP_TOTAL }).map((_, i) => (
                      <div
                        key={i}
                        className={`drive-pip w-3.5 h-3.5 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 rounded-sm border ${
                          i < maxDrive
                            ? 'border-dashed border-ink/35 bg-ink/5'
                            : 'border-dotted border-ink/10 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Resistance pips */}
                <div className="flex items-center justify-between pt-1.5 border-t border-ink/10">
                  <span className="font-sans text-xs text-sepia uppercase font-bold">Resistance</span>
                  <div className="flex gap-2" role="img" aria-label={resistMax === 0 ? `${cat.name} resistance: none` : `${cat.name} resistance: ${resistSpent} of ${resistMax} spent`}>
                    {Array.from({ length: resistMax }).map((_, i) => (
                      <svg key={i} aria-hidden="true" width="14" height="12" viewBox="0 0 14 12">
                        <polygon
                          points="7,1 1,11 13,11"
                          style={{
                            fill: i < resistSpent ? 'rgb(var(--c-oxblood))' : 'transparent',
                            stroke: i < resistSpent ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-ink))',
                          }}
                          strokeWidth="1.5"
                        />
                      </svg>
                    ))}
                    {resistMax === 0 && (
                      <span className="font-mono text-xs text-sepia italic">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Actions section */}
              <div className="space-y-1.5 flex flex-col justify-center">
                {cat.actions.map((act) => {
                  const actionValue = character[act.key] || 0;
                  const isGilded = character[`gilded_${act.key}`] === true || character[`gilded_${act.key}`] === 1 || character[`gilded_${act.key}`] === "true";

                  const availMods = !readOnly ? getAvailableRollMods(character, act.key) : [];
                  const selectedMods = activeMods[act.key] || [];

                  const ratingPips = (
                    <span className="flex gap-1 shrink-0" role="img" aria-label={`${act.label} rating: ${actionValue} of 3`}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <span
                          key={i}
                          className={`block w-3 h-3 rounded-full border border-ink ${i < actionValue ? 'bg-oxblood' : 'bg-transparent'}`}
                        />
                      ))}
                    </span>
                  );
                  const rollBlocked = !!pendingGildedChoice || !!isRolling;

                  return (
                    <div key={act.key} className="group/action" title={ACTION_FLAVOR[act.key]}>
                      {readOnly ? (
                        <div className="flex justify-between items-center py-0.5">
                          <span className="font-sans text-sm font-bold uppercase tracking-tight flex items-center gap-1.5 text-ink">
                            {isGilded && <span aria-hidden="true" className="w-2 h-2 bg-candle-gold border border-sepia rounded-full" />}
                            {act.label}
                            {isGilded && <span className="sr-only">(gilded)</span>}
                          </span>
                          {ratingPips}
                        </div>
                      ) : (
                        // The whole row is the roll: a paper chit that lifts and gets a pen
                        // underline under its name on hover, and sinks when pressed
                        <button
                          disabled={rollBlocked}
                          onClick={() => {
                            const spend = preSpend[cat.driveKey] || 0;
                            const actionRating = character[act.key] || 0;
                            const effectiveSpend = Math.min(spend, Math.max(0, 6 - actionRating));
                            setPreSpend(p => ({ ...p, [cat.driveKey]: 0 }));
                            setActiveMods(p => ({ ...p, [act.key]: [] }));
                            rollAction(act.key, effectiveSpend, false, selectedMods);
                          }}
                          className={`action-chit pen-host group/roll w-full flex items-center gap-2 pl-2.5 pr-2.5 py-1.5 min-h-[34px] [@media(pointer:coarse)]:min-h-[44px] text-left rounded-sm border transition-[color,background-color,border-color,box-shadow,transform] duration-150 ${
                            rollBlocked
                              ? 'opacity-40 cursor-not-allowed border-ink/15 bg-transparent'
                              : 'border-ink/25 bg-cream shadow-[0_1px_0_rgb(var(--c-ink)/0.18),1px_2px_4px_rgb(var(--c-ink)/0.08)] [@media(hover:hover)]:hover:-translate-y-px [@media(hover:hover)]:hover:border-oxblood/60 [@media(hover:hover)]:hover:text-oxblood [@media(hover:hover)]:hover:shadow-[0_1px_0_rgb(var(--c-ink)/0.2),2px_5px_9px_rgb(var(--c-ink)/0.16)] active:translate-y-px active:shadow-none active:bg-oxblood/[0.05]'
                          }`}
                          style={{ touchAction: 'manipulation' }}
                          aria-label={`Roll ${act.label}${isGilded ? ', gilded' : ''}, rating ${actionValue}${preSpend[cat.driveKey] > 0 ? `, plus ${preSpend[cat.driveKey]} from ${cat.name}` : ''}`}
                        >
                          <span className="flex-1 min-w-0 font-sans text-sm font-bold uppercase tracking-tight flex items-center gap-1.5">
                            {isGilded && <span aria-hidden="true" className="w-2 h-2 shrink-0 bg-candle-gold border border-sepia rounded-full" />}
                            <span className={rollBlocked ? undefined : 'pen-underline'}>{act.label}</span>
                            {preSpend[cat.driveKey] > 0 && (
                              <span className="font-mono tabular-nums text-xs text-oxblood font-black">+{preSpend[cat.driveKey]}d</span>
                            )}
                          </span>
                          {!rollBlocked && <DieGlyph className="action-die shrink-0 text-oxblood" />}
                          {ratingPips}
                        </button>
                      )}
                      {availMods.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {availMods.map(mod => {
                            const on = selectedMods.includes(mod.key);
                            return (
                              <button
                                key={mod.key}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleMod(act.key, mod.key)}
                                className={`font-sans font-bold text-xs uppercase tracking-wider px-1.5 py-0.5 border transition-colors ${
                                  on ? 'bg-candle-gold/20 border-candle-gold/70 text-ink' : 'border-ink/20 text-sepia hover:border-ink/40 hover:text-ink'
                                }`}
                              >
                                {on && (
                                  <svg aria-hidden="true" viewBox="0 0 12 12" className="inline-block w-2.5 h-2.5 mr-1 -mt-px">
                                    <path d="M2 6.4l2.6 2.6L10 3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}{mod.label}
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
      </section>

      <SheetDivider className="dossier-divider" />

      {/* Vital Damage & Post-Mortem Ledger */}
      <div className="dossier-trauma grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">

        {/* Damage Tracks Column */}
        <div data-desk="marks" className="dossier-marks md:col-span-5 bg-black/[0.02] border-2 border-ink p-4 rounded-sm flex flex-col justify-between shadow-inner">
          <div>
            <h3 className="mark-head font-sans text-sm font-black uppercase tracking-widest text-ink border-b border-ink/30 pb-1 mb-4 flex items-center gap-2">
              <SafeIcon name="GiBleedingEye" size={22} className="text-oxblood" /> Marks
            </h3>
            {/* Each box is its own target: only the next empty box takes a mark. A mark is
                held for a few seconds with an Undo before it goes to the table. */}
            <div className={readOnly ? 'space-y-4' : 'space-y-1'}>
              {['body', 'brain', 'bleed'].map((type) => {
                const name = MARK_NAME[type];
                const marked = character?.[`${type}_marks`] || 0;
                const heldHere = !readOnly && heldMark?.type === type;
                const next = marked + (heldHere ? 1 : 0); // index of the box the next tap fills
                const trackFull = next >= 3;
                // 44px targets on phones; in the two-column sheet (md up) 36px keeps the
                // label on one line beside three boxes.
                const cell = readOnly ? 'w-7 h-9' : 'w-11 h-11 md:w-9';
                return (
                  <div key={type} className="mark-row flex justify-between items-center gap-2">
                    {readOnly ? (
                      <span className="mark-label font-sans font-black uppercase tracking-widest text-sm text-ink">{name}</span>
                    ) : (
                      <button
                        onClick={() => holdMark(type)}
                        aria-label={trackFull
                          ? `Take a ${name} mark. The track is full, so this mark brings a scar.`
                          : `Take a ${name} mark`}
                        className="mark-label min-h-[44px] whitespace-nowrap font-sans font-black uppercase tracking-widest text-sm text-ink hover:text-oxblood transition-colors border-b border-dashed border-transparent hover:border-oxblood"
                      >
                        {name} <span aria-hidden="true">+</span>
                      </button>
                    )}
                    <div className="flex" role="group" aria-label={`${name} marks: ${marked} of 3`}>
                      {[0, 1, 2].map((i) => {
                        const filled = i < marked;
                        const isHeld = heldHere && i === marked;
                        const isNext = !readOnly && i === next;
                        // A filled mark is inked by hand, so each box sits a little askew
                        const box = (
                          <span
                            aria-hidden="true"
                            style={filled ? { transform: `rotate(${MARK_TILT[i]}deg)` } : undefined}
                            className={`block w-5 h-7 border-2 shadow-inner rounded-sm transition-colors duration-150 ${
                              filled ? 'bg-oxblood border-ink'
                                : isHeld ? 'bg-oxblood/45 border-oxblood border-dashed'
                                : isNext ? 'border-ink group-hover/box:bg-oxblood/15 group-hover/box:border-oxblood'
                                : 'border-ink/70'
                            }`}
                          />
                        );
                        return isNext ? (
                          <button
                            key={i}
                            onClick={() => holdMark(type)}
                            aria-label={`Take ${name} mark ${i + 1} of 3`}
                            className={`mark-cell group/box ${cell} flex items-center justify-center rounded-sm`}
                          >
                            {box}
                          </button>
                        ) : (
                          <span key={i} className={`mark-cell ${cell} flex items-center justify-center`}>{box}</span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            {!readOnly && heldMark && (
              <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-oxblood/40 bg-oxblood/5 px-3 py-2 rounded-sm">
                <p className="font-serif text-base text-ink leading-snug min-w-0 flex-1 basis-40">
                  {(character?.[`${heldMark.type}_marks`] || 0) >= 3
                    ? `${MARK_NAME[heldMark.type]} track is full: this mark brings a scar.`
                    : `${MARK_NAME[heldMark.type]} mark taken.`}
                </p>
                <button
                  onClick={undoMark}
                  className="shrink-0 min-h-[40px] px-3 font-sans text-xs font-black uppercase tracking-widest border border-oxblood text-oxblood hover:bg-oxblood hover:text-cream rounded-sm transition-colors"
                >
                  Undo <span className="font-mono tabular-nums">{markSecondsLeft}s</span>
                </button>
              </div>
            )}
            {!readOnly && markSendError && (
              <p role="alert" className="mt-3 font-serif text-base text-oxblood leading-snug">{markSendError}</p>
            )}
          </div>

          <div className="mark-status mt-4 pt-2 border-t border-ink/10 text-xs font-sans font-bold text-sepia flex flex-wrap gap-x-2 justify-between items-center uppercase">
            <span>Status</span>
            <span className={`font-bold ${character?.is_dead ? 'text-ink' : character?.incapacitated ? 'text-oxblood' : 'text-ink'}`}>
              {character?.is_dead ? "Dead" : character?.incapacitated ? "Incapacitated" : "Able to act"}
            </span>
          </div>
          {character?.is_dead && !readOnly && (
            <button
              onClick={() => setStage('CHARACTER_CREATION')}
              className="mt-2 w-full py-1.5 font-sans text-xs font-black uppercase tracking-widest border-2 border-ink text-ink hover:bg-ink hover:text-cream transition-all rounded-sm"
            >
              Create a new investigator
            </button>
          )}
          {character?.incapacitated && !character?.is_dead && !readOnly && (
            <button
              onClick={reviveCharacter}
              className="mt-2 w-full py-1.5 font-sans text-xs font-black uppercase tracking-widest border border-oxblood/60 text-oxblood hover:bg-oxblood hover:text-cream transition-all rounded-sm"
            >
              Revive
            </button>
          )}
        </div>

        {/* Scars — editable textarea for players, list view for GM readOnly */}
        <div data-desk="scars" className="dossier-scars md:col-span-7 bg-cream border-2 border-dashed border-ink/60 p-4 pt-5 rounded-sm relative shadow-sm flex flex-col justify-between overflow-hidden">
          <FormLine className="absolute top-1.5 right-3">Form C.O. 14 · Trauma record</FormLine>
          <div>
            <div className="flex flex-wrap gap-2 justify-between items-center border-b border-ink/40 pb-1 mb-2 mt-3 sm:mt-0">
              <h3 className="font-sans text-sm font-black uppercase tracking-widest text-ink flex items-center gap-2">
                <ScarIcon size={22} className="text-ink" /> Scars
              </h3>
              <span className="font-mono tabular-nums text-sm font-bold bg-ink text-cream px-2.5 py-0.5 rounded-sm" aria-label={`${character?.scars_count || 0} of 4 scars`}>
                {character?.scars_count || 0} / 4
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-1.5 pt-1"
               style={{
                 backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgb(var(--c-sepia) / 0.14) 24px)',
                 backgroundSize: '100% 24px',
                 lineHeight: '24px'
               }}>
            {character?.scars_list?.length > 0 ? (
              character.scars_list.map((scar, i) => (
                <p key={i} className="font-serif text-base text-ink italic pl-1">{scarDisplayText(scar)}</p>
              ))
            ) : (
              <span className="sr-only">No scars</span>
            )}
          </div>
        </div>
      </div>

      {/* Gear Change Modal: in a portal, so the sheet's stacking context (z-10), its
          space-y margin and its overflow cannot place or clip it */}
      {showGearModal && createPortal(
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" style={{ background: 'rgb(var(--c-night) / 0.85)' }}
          onClick={() => setShowGearModal(false)}>
          <div ref={gearDialogRef} role="dialog" aria-modal="true" aria-labelledby="gear-dialog-title" className="relative rounded-sm overflow-y-auto w-full max-w-[520px] max-h-[85dvh] px-5 py-6 sm:px-9 sm:py-8" onClick={e => e.stopPropagation()}
            style={{ background: 'rgb(var(--c-parchment))', border: '3px double rgb(var(--c-sepia)/0.7)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
            <h2 id="gear-dialog-title" className="text-2xl font-serif font-black text-ink mb-5">Change Gear</h2>

            {character.specialty && SPECIALTY_GEAR[character.specialty] && (
              <div className="mb-4">
                <p className="text-xs font-sans font-black uppercase tracking-wider text-oxblood mb-2">{character.specialty} gear</p>
                <div className="space-y-1.5">
                  {SPECIALTY_GEAR[character.specialty].map(item => {
                    const sel = pendingGear.includes(item);
                    return (
                      <button type="button" key={item} aria-pressed={sel} onClick={() => sel ? setPendingGear(g => g.filter(x=>x!==item)) : pendingGear.length < 3 && setPendingGear(g=>[...g,item])}
                        className="w-full text-left flex items-center gap-3 p-2.5 cursor-pointer transition-all select-none rounded-sm"
                        style={{ background: sel ? 'rgb(var(--c-oxblood)/0.1)' : 'rgb(var(--c-parchment-deep)/0.3)', border:`1px solid ${sel?'rgb(var(--c-oxblood))':'rgb(var(--c-sepia)/0.22)'}` }}>
                        <div className={`w-4 h-4 border flex items-center justify-center text-xs shrink-0 ${sel?'bg-oxblood border-oxblood text-cream':'border-sepia/40'}`}>{sel&&'✓'}</div>
                        <SafeIcon name={GEAR_ICONS[item]||'GiSuitcase'} size={15} style={{ color: sel?'rgb(var(--c-oxblood))':'rgb(var(--c-sepia))', flexShrink:0 }} />
                        <span className={`text-sm font-serif ${sel?'font-bold text-ink':'text-ink/75'}`}>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-xs font-sans font-black uppercase tracking-wider text-sepia mb-2">Standard gear</p>
              <div className="space-y-1.5">
                {STANDARD_GEAR.map(item => {
                  const sel = pendingGear.includes(item);
                  return (
                    <button type="button" key={item} aria-pressed={sel} onClick={() => sel ? setPendingGear(g => g.filter(x=>x!==item)) : pendingGear.length < 3 && setPendingGear(g=>[...g,item])}
                      className="w-full text-left flex items-center gap-3 p-2.5 cursor-pointer transition-all select-none rounded-sm"
                      style={{ background: sel ? 'rgb(var(--c-oxblood)/0.08)' : 'rgb(var(--c-parchment-deep)/0.15)', border:`1px solid ${sel?'rgb(var(--c-oxblood) / 0.5)':'rgb(var(--c-sepia)/0.15)'}` }}>
                      <div className={`w-4 h-4 border flex items-center justify-center text-xs shrink-0 ${sel?'bg-oxblood border-oxblood text-cream':'border-sepia/35'}`}>{sel&&'✓'}</div>
                      <SafeIcon name={GEAR_ICONS[item]||'GiSuitcase'} size={15} style={{ color: sel?'rgb(var(--c-oxblood))':'rgb(var(--c-sepia))', flexShrink:0 }} />
                      <span className={`text-sm font-serif ${sel?'font-bold text-ink':'text-sepia'}`}>{item}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4" style={{ borderTop: '1px solid rgb(var(--c-sepia)/0.18)' }}>
              <span className="text-sm font-sans font-black text-sepia whitespace-nowrap">{pendingGear.length} / 3 selected</span>
              <div className="flex gap-3 max-sm:flex-1 max-sm:justify-end">
                <button onClick={() => setShowGearModal(false)}
                  className="px-4 py-2 min-h-[44px] sm:min-h-0 whitespace-nowrap text-xs font-sans font-black uppercase tracking-widest border border-sepia/25 hover:border-sepia/50 text-sepia transition-colors rounded-sm">
                  Cancel
                </button>
                <button onClick={sendGearUpdate}
                  className="px-6 py-2 min-h-[44px] sm:min-h-0 whitespace-nowrap text-xs font-sans font-black uppercase tracking-widest rounded-sm shadow transition-all"
                  style={{ background: 'rgb(var(--c-oxblood))', color: 'rgb(var(--c-cream))' }}>
                  Save gear
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
    </div>
  );
};
