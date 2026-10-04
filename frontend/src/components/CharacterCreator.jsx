import React, { useEffect, useState } from 'react';
import * as Gi from "react-icons/gi";
import { JoinCampaignForm } from './shared/JoinCampaignForm';
import { ConfirmAction } from './shared/ConfirmAction';
import { radioArrows } from './shared/a11y';
import { useDialog } from './shared/useDialog';
import { PaperSheet } from './shared/PaperSheet';

const ILLUMINATION_KEYS = {
  Journalist: ['Gather Statements', 'Hunt Down a Lead', 'Speak Truth to Power'],
  Magician:   ['Perform a Trick', 'Spot a Ruse', 'Seek Out Real Magick'],
  Explorer:   ['Study an Artifact', 'Discuss History', 'Run into Danger'],
  Soldier:    ['Use Violence of Action', 'Protect Someone', 'Act Tactically'],
  Doctor:     ['Avoid a Fight', 'Aid an Ally', 'Comfort Someone'],
  Professor:  ['Mentor an Ally', 'Reference Research', 'Make a Plan'],
  Criminal:   ['Do Something Illegal', 'Make a Deal', 'Stand Up to Authority'],
  Detective:  ['Probe a Witness', 'Track a Target', 'Reveal a Clue'],
  Medium:     ['Connect with Someone', 'Sense Phenomena', 'Make a Scene'],
  Occultist:  ['Consult Arcane Texts', 'Collect Oddities', 'Act Bizarre'],
};

const SPECIALTY_GILDED = {
  Journalist: 'survey',
  Magician:   'sway',
  Explorer:   'move',
  Soldier:    'strike',
  Doctor:     'read',
  Professor:  'read',
  Criminal:   'hide',
  Detective:  'control',
  Medium:     'sense',
  Occultist:  'read',
};

const DRIVE_FLAVOR = {
  nerve:     'Raw physicality — force, endurance, and the will to act with your body.',
  cunning:   'Subtle control — deception, concealment, and unseen manipulation.',
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

const STANDARD_GEAR = [
  "Bleed Detector", "Bleed Containment Vial", "Hand Weapon", "Lantern", "Matches & Candles", "First Aid Kit"
];

const ROLES = {
  "Face": {
    icon: "GiDramaMasks",
    description: "You are the charming, manipulative, and social expert of the Circle.",
    keys: ["Gather Statements", "Hunt Down a Lead", "Speak Truth to Power"],
    baseAbilities: {
      "I Know a Guy": { icon: "GiThreeFriends", text: "Once per assignment, ask the GM who you know nearby that could help you. The GM will tell you who they are, and explain why this NPC might have insight into the investigation." },
      "Sweet Talk": { icon: "GiLips", text: "You know how to work the room. After you make small talk with someone, you may add +1d on any Read rolls you make in which they are the target. If your current Cunning resistance is 2 or higher, that die is gilded." },
      "Cool Under Pressure": { icon: "GiIciclesAura", text: "On any high-stakes roll, you may always spend Cunning instead of the drive the action falls under." }
    },
    specialties: {
      "Journalist": {
        icon: "GiNewspaper",
        description: "You chase the truth, no matter what shadows it hides in.",
        gear: ["Press Credentials", "Camera", "Hidden Recording Device"],
        startActions: { sneak:1, survey:2, read:1, sense:1 },
        startDrives:  { cunning:3 },
        abilities: {
          "Insider Access": { icon: "GiOrganigram", text: "Your line of work offers you special privileges. Once per assignment, automatically gain access to an important person or place by using the Press Credentials gear." },
          "Open Book": { icon: "GiNotebook", text: "You can get people to open up to you very quickly. When you attempt to connect with others by sharing something deeply personal, add a number of dice equal to your current Cunning resistance to a Sway roll. On a success, they will reciprocate." },
          "Lie Detector": { icon: "GiAmplitude", text: "When you make a Read roll in an attempt to figure out whether a person is telling the truth, gild an additional die. The first Cunning you spend on the roll is worth +2d instead of +1d." },
          "Press Conference": { icon: "GiPublicSpeaker", text: "You can spend 1 Cunning to gather a large group of people together to make announcements, ask questions, or stage a distraction. All Cunning rolls you make at this assembly take +1d." },
          "In the Trenches": { icon: "GiTrenchAssault", text: "You've done enough dangerous journalism work to know how to keep yourself safe. Once per assignment, you may burn 1 Cunning resistance to soak a Body mark." },
          "Well-Researched": { icon: "GiArchiveResearch", text: "You can spend 1 Intuition to ask the GM a specific question about a place, group, or concept that you may have researched before the assignment. They will tell you what you know from that preparation." }
        }
      },
      "Magician": {
        icon: "GiMagickTrick",
        description: "You are a master of illusion, misdirection, and sleight of hand.",
        gear: ["Flash Powder", "Lockpicks", "Trick Deck of Cards"],
        startActions: { sway:2, sneak:1, hide:1, read:1 },
        startDrives:  { cunning:1, intuition:2 },
        abilities: {
          "Misdirection": { icon: "GiDistraction", text: "When you use your words or actions to distract a target from what is actually happening here, make a Hide roll. The first Cunning you or an ally spends on this roll is worth +2d instead of +1d." },
          "Escape Artist": { icon: "GiBreakingChain", text: "Spend 1 Nerve to automatically escape ropes, cuffs, manacles, or a creature that has grappled you." },
          "Practiced Patter": { icon: "GiDiscussion", text: "You've long rehearsed for a moment like this. When making a Sway or Hide roll, you may spend Intuition instead of Cunning." },
          "Uncanny Eye": { icon: "GiSunkenEye", text: "You may spend 1 Intuition to ask the GM a question: How can I leverage something here to my advantage? What here doesn't work the way it appears? What is out of place here?" },
          "Flourish": { icon: "GiJuggler", text: "You know how to cover your mistakes with flair. On a roll where you could spend Cunning, if you fail or get a mixed success, you may spend 2 Cunning to push the result up one tier — from a miss to mixed success or mixed success to full success." },
          "The Prestige": { icon: "GiMedallist", text: "Your magic is usually all smoke and mirrors, but you have one trick you've learned that's real. Roll Sense when you perform it, and on a success, take a Bleed mark. Circle one option when you take this ability: change appearance, levitate, summon mundane object, teleport a short distance, or throw your voice." }
        }
      }
    }
  },
  "Muscle": {
    icon: "GiBiceps",
    description: "You are the physical powerhouse. You break things and stand between your Circle and danger.",
    keys: ["Solve a problem with physical force", "Protect an ally from harm", "Endure extreme hardship"],
    baseAbilities: {
      "Behind Me": { icon: "GiRosaShield", text: "Spend 1 Nerve to choose an ally in the same scene who is about to take a mark from a phenomenon, then describe what you do that allows you to take the mark instead." },
      "Adrenaline Rush": { icon: "GiMountainClimbing", text: "For each mark you take, you may immediately refresh a drive point of your choice." },
      "Endurance": { icon: "GiPathDistance", text: "When you take enough marks to become incapacitated, instead, roll a number of d6 equal to your current Nerve resistance. On a 6, you aren't incapacitated and don't take a scar." }
    },
    specialties: {
      "Explorer": {
        icon: "GiCompass",
        description: "You are accustomed to surviving in harsh environments and uncovering lost secrets.",
        gear: ["Heavy Climbing Gear", "Machete", "Vintage Map Collection"],
        startActions: { move:1, strike:2, survey:1, read:1 },
        startDrives:  { nerve:3 },
        abilities: {
          "Obscure Lexicon": { icon: "GiCompanionCube", text: "When you encounter an ancient or esoteric language, you can spend 1 Intuition to understand what it says." },
          "Field Experience": { icon: "GiDigHole", text: "You've traveled the world and been in many dangerous positions before. Once per assignment, describe to the group how a previous adventure is similar to your current situation and refresh 1 Nerve for everyone in your circle." },
          "Mind Over Matter": { icon: "GiHelmetHeadShot", text: "When you are told to use a specific action on a roll, you may take a Brain mark to utilize an alternative action instead. You may also spend the drive that corresponds with your chosen action. Describe how you adapt to your situation." },
          "Tenacious": { icon: "GiLifeBar", text: "When you have 1 or more Bleed marks, gild an additional die on Move, Strike, and Control rolls while in danger." },
          "Narrow Escape": { icon: "GiHourglass", text: "You've been in numerous hairy situations during your fearless exploits. Add +1d to your Move roll when you attempt to escape a trap or ambush." },
          "Not Again": { icon: "GiDread", text: "Once per assignment, you may take a scar to have an automatic full success on an action. If you do, it's as if you've had this scar all along — tell your circle how you got it, and why the lesson you learned is helping you succeed here. Don't adjust your action ratings when you take this scar." }
        }
      },
      "Soldier": {
        icon: "GiRevolver",
        description: "You are a trained combatant, disciplined and lethal.",
        gear: ["Heavy Firearm", "Tactical Armor", "Trench Whistle"],
        startActions: { move:2, strike:2, control:1 },
        startDrives:  { nerve:1, intuition:2 },
        abilities: {
          "Basic Training": { icon: "GiOnSight", text: "You have tactical experience in high-pressure situations. When you make a Survey roll in a dangerous place, also add a number of dice equal to your current Nerve resistance." },
          "Geared Up": { icon: "GiCrestedHelmet", text: "You and one ally in your circle may mark an additional gear slot during each assignment." },
          "Sharpshooter": { icon: "GiHeadshot", text: "When you want to make a ranged attack with a weapon, you may spend 1 Nerve to steady your aim before shooting, and add +2d to your next shot at this target." },
          "Tactician": { icon: "GiMinions", text: "When you are in a dangerous scenario, you may spend 1 Nerve to ask the GM a question: How do I get to safety? What poses the largest immediate threat to my circle? Where is the target going to move next?" },
          "Compartmentalization": { icon: "GiCrenulatedShield", text: "You have trained to detach yourself from the horrors of violence. Once per assignment, you may burn 1 Nerve resistance to soak a Brain mark." },
          "Volunteer Duty": { icon: "GiHeartTower", text: "Between assignments, instead of spending resources, you can offer a helping hand to your Lightkeeper. Describe how you aid the organization, and refill 1 point in any Candela Obscura resource on your circle sheet. You may not spend any resources during this downtime." }
        }
      }
    }
  },
  "Scholar": {
    icon: "GiBookmarklet",
    description: "You are the academic heart of the Circle, relying on research, science, and intellect over brute force.",
    keys: ["Discover a hidden truth", "Apply academic knowledge to a problem", "Preserve a piece of history"],
    baseAbilities: {
      "Well-Read": { icon: "GiBookPile", text: "You're highly educated and retain knowledge better than most. When you spend Intuition while making a roll, on a result of 3 or less, earn back any of the Intuition you spent." },
      "Occult Researcher": { icon: "GiDeathNote", text: "Take 1 Brain mark to ask the GM for an important occult detail that you would recognize from your studies, but has not yet been revealed in the scene. If there are none, clear the Brain mark." },
      "Meticulous Notes": { icon: "GiPapers", text: "If your current Cunning resistance is 2 or more, add +1d to all Focus rolls. After an assignment, increase your Illumination track 1 additional point because of the detailed notes your character returns with." }
    },
    specialties: {
      "Doctor": {
        icon: "GiCaduceus",
        description: "You heal the broken and study the anatomy of both the mundane and the monstrous.",
        gear: ["Surgical Tools", "Heavy Sedatives", "Medical Journals"],
        startActions: { control:1, sneak:1, survey:1, read:2 },
        startDrives:  { intuition:3 },
        abilities: {
          "Patch Up": { icon: "GiHandBandage", text: "When you have a few moments of calm, you can make a Focus roll to heal 1 Body mark on an ally. On a 4–5, spend 2 Intuition to accomplish this. On a 6, spend 1 Intuition. On a 3 or less, you may take a Brain mark to take the 4–5 result instead." },
          "Non-Combatant": { icon: "GiHeartInside", text: "Your pain spurs others to action. If you haven't hurt anyone yet during this assignment, when you take a mark, each of your allies in the scene can recover 1 drive point of their choice." },
          "Dissection": { icon: "GiRaggedWound", text: "When you make a Focus roll to dissect a piece of organic matter affected by bleed, gild an additional die. You cannot take Bleed marks from this inspection." },
          "Resuscitation": { icon: "GiHalfDead", text: "When a nearby ally takes a scar, you can make a Focus roll in an attempt to immediately revive them. On a 6, it works. Though they still receive the scar, they're back on their feet. On a 4–5, it will cost 3 drive points of your choosing. This cannot be used when a PC takes their fourth scar." },
          "Lifesaver": { icon: "GiHealthPotion", text: "Between assignments, you can spend 1 Stitch to work on healing an ally's scar. When you do, make a Focus roll. On a critical success, fill three. On a 6, fill two. On a 4–5, fill one. When the track is full, the scar is healed and 1 action point may be shifted." },
          "Anatomical Strike": { icon: "GiHeartStake", text: "You know where the body is most vulnerable. When attacking an enemy, you may roll Focus instead of Strike." }
        }
      },
      "Professor": {
        icon: "GiSpectacles",
        description: "You are a master of theory, history, and the rigid rules of the academic world.",
        gear: ["Thick Reference Tome", "Chemical Kit", "University Keys"],
        startActions: { sway:1, survey:2, read:2 },
        startDrives:  { cunning:2, intuition:1 },
        abilities: {
          "Steel Mind": { icon: "GiRearAura", text: "Once per assignment, when you should take a Brain mark, you may instead burn 1 Intuition resistance to soak it." },
          "University Resources": { icon: "GiEnlightenment", text: "Your university has alumni all over the world. Once per session, describe a person you know from your tenure as a professor, and ask the GM where they can be found locally." },
          "Learn from My Mistakes": { icon: "GiEyepatch", text: "Any time you get a result of 3 or less on a roll, describe what lesson you learned from your failure, and refresh 1 drive point of your choice." },
          "Better Part of Valor": { icon: "GiOppositeHearts", text: "When making a Control or Move roll to flee danger, gild a die. On this roll, the first Nerve you spend is worth +2d instead of +1d." },
          "Verbose": { icon: "GiShouting", text: "When you make a speech or hold a conversation to assist an ally, the die you give them is gilded." },
          "Chemical Concoction": { icon: "GiBubblingFlask", text: "You know how to mix chemicals together to achieve particular effects. When you take Laboratory Equipment as gear, you may spend a few minutes concocting a mixture that is: acidic, explosive, flammable, loud, sleep-inducing, sticky, or toxic." }
        }
      }
    }
  },
  "Slink": {
    icon: "GiDominoMask",
    description: "You operate in the shadows. You bypass security, find what is hidden, and strike from the dark.",
    keys: ["Bypass security undetected", "Acquire something illicitly", "Discover what someone is hiding"],
    baseAbilities: {
      "Scout": { icon: "GiWatchtower", text: "If you have time to observe a location, you can spend 1 Intuition to ask a question: What do I notice here that others do not see? What in this place might be of use to us? What path should we follow?" },
      "Saw This Coming": { icon: "GiFrontalLobe", text: "Three times per assignment, you may add +1d to a circle member's roll without spending drive by saying how you prepared for this kind of situation together." },
      "Death Defy": { icon: "GiChainedHeart", text: "Once per assignment, when you should take 1 or more marks from an enemy, you instead escape unscathed. Describe how your quick thinking keeps you safe from harm." }
    },
    specialties: {
      "Criminal": {
        icon: "GiLockpicks",
        description: "You know the underworld and the illegal trades that keep the city running.",
        gear: ["Advanced Lockpicks", "Forged Documents", "Concealed Blade"],
        startActions: { control:1, hide:2, survey:1, read:1 },
        startDrives:  { nerve:1, cunning:2 },
        abilities: {
          "Street Smarts": { icon: "GiChoice", text: "You know how to keep an eye on your surroundings. Whenever you make a Survey roll, you may spend any drive instead of only Intuition." },
          "Leverage": { icon: "GiHumanEar", text: "On a successful Read roll, you may ask the GM what your target truly wants. On any Sway rolls you make using this information, also add a number of dice equal to your current Cunning resistance." },
          "Hardened": { icon: "GiImprisoned", text: "When you take a scar, you may choose not to shift any action points as a result." },
          "Born in the Shadows": { icon: "GiHoodedAssassin", text: "When attempting to avoid security or detection, gild an additional Hide die." },
          "Tricks of the Trade": { icon: "GiCoinflip", text: "You've learned how to navigate tricky or dangerous situations to keep yourself out of harm's way. On any Hide or Sway roll you make, you may spend 1 Nerve to lower the stakes before rolling. If this is already a low-stakes roll, you may not use this ability." },
          "Sticky Fingers": { icon: "GiSnatch", text: "After a successful melee attack, you can spend 1 Cunning to pilfer an item from your target undetected. This could be their wallet, a weapon they're carrying, an important document, etc." }
        }
      },
      "Detective": {
        icon: "GiMagnifyingGlass",
        description: "You piece together clues and see the connections others miss.",
        gear: ["Magnifying Glass", "Evidence Bags", "Concealed Pistol"],
        startActions: { control:1, hide:1, survey:2, read:1 },
        startDrives:  { nerve:2, cunning:1 },
        abilities: {
          "Mind Palace": { icon: "GiCastle", text: "When you want to figure out how two clues might relate or what path they should point you toward, burn 1 Intuition resistance. The GM will give you the information you've deduced." },
          "Interrogation": { icon: "GiTabletopPlayers", text: "When you are questioning someone about information they are resistant to revealing, add a number of dice equal to your current Cunning resistance to your Read roll." },
          "Back Against the Wall": { icon: "GiSinkingShip", text: "When you are making a high-stakes roll, you may take a Brain mark to make any Nerve you spend worth +2d instead of +1d." },
          "Inspection": { icon: "GiCrimeSceneTape", text: "You have experience examining crime scenes. When you make a Survey roll to gather evidence about what might have happened in this location, gild an additional die on the roll." },
          "Stakeout": { icon: "GiParanoia", text: "You are good at collecting information while remaining undetected. When you are tailing a suspect or conducting surveillance, you may use Survey instead of Hide." },
          "One Step Ahead": { icon: "GiMeshNetwork", text: "Once per assignment, you can produce a useful mundane object you've had with you all along. When you do, fill in the empty gear slot and write the object in this space. This does not count toward your gear limit." }
        }
      }
    }
  },
  "Weird": {
    icon: "GiSemiClosedEye",
    description: "You are touched by the phenomena you investigate. You understand the magick and monsters of the world natively.",
    keys: ["Consult arcane texts", "Collect oddities", "Act bizarre"],
    baseAbilities: {
      "Great Wards": { icon: "GiRuneStone", text: "You can inscribe and maintain a warding symbol on one person at a time. Describe the material they must hold to bind it (salt, sand, etc.). They take +1d on Move rolls against phenomena." },
      "Let Them In": { icon: "GiThirdEye", text: "Whenever you take 1 or more Bleed marks, you also gain additional information about the phenomenon that harmed you. Ask the GM one question about the source of the bleed." },
      "Ritual": { icon: "GiCircleClaws", text: "When you have a few minutes to prepare, you may take a Bleed mark to perform a ritual on yourself or an ally: Circle of Protection (soaks 1 Body mark for the person within), Reinvigorate (refresh 1 resistance), or Remote Viewing (one moment)." }
    },
    specialties: {
      "Medium": {
        icon: "GiMagicPalm",
        description: "You bridge the gap between the living and the dead.",
        gear: ["Spirit Board", "Ectoplasm Vial", "Tarot Deck"],
        startActions: { sneak:2, survey:1, sense:2 },
        startDrives:  { cunning:1, intuition:2 },
        abilities: {
          "Miasma": { icon: "GiFluffyCloud", text: "You can spend 1 Intuition to tell if and how a person or object has been affected by bleed." },
          "Bending Spoons": { icon: "GiSpoon", text: "You can make a Sense roll to control an object in the room with your mind: flip a switch, knock something over, move a small object, put out a light, etc. On a mixed success, you may take a Bleed mark to make it a full success instead." },
          "Cold Read": { icon: "GiFrozenOrb", text: "On a successful Sense roll, you know what ailment, stress, or loss a person has in their life, even if they're trying to hide it." },
          "Premonitions": { icon: "GiCrystalBall", text: "When an ally is about to take 1 or more marks, burn an Intuition resistance to warn them about the coming danger. Then, soak one of these marks." },
          "Last Moments": { icon: "GiChewedHeart", text: "While touching a corpse, you can burn an Intuition resistance to hear, smell, and feel that creature's last few moments of life. By taking a Bleed mark, you can push yourself to see a still image of the last thing they saw before death." },
          "Commune": { icon: "GiCandleLight", text: "You can make a connection with a nearby sentient phenomenon in order to communicate with it. Take a Brain mark and make a Sense roll to open an empathetic or telepathic connection to ask a question. On a success, you get an answer. On a 4–5 result, the phenomenon will ask a question in return." }
        }
      },
      "Occultist": {
        icon: "GiCandleSkull",
        description: "You wield the dangerous, forbidden magicks of the world.",
        gear: ["Arcane Texts", "Occult Supplies", "Ritual Dagger"],
        startActions: { control:1, sneak:1, read:1, sense:2 },
        startDrives:  { intuition:3 },
        abilities: {
          "Ghostblade": { icon: "GiDaggerRose", text: "You can attune a ritual knife to yourself. If you coat it in your blood (take a Body mark), it is particularly effective against magickal beings and can strike invisible or ethereal enemies." },
          "Blood of the Covenant": { icon: "GiCauldron", text: "The first time a dangerous phenomenon inflicts a mark on anyone in your circle, you refresh a number of points, in any drive, equal to your current Intuition resistance." },
          "Speak Their Language": { icon: "GiBrokenTablet", text: "You can speak the supernatural language of any phenomenon you encounter. Describe what strange or terrifying way you communicate with each other." },
          "Play the Bait": { icon: "GiRabbit", text: "You know how to draw the attention of a phenomenon — you just have to play the bait. Make a Sense roll to bring a nearby phenomenon toward you." },
          "Extend Your Senses": { icon: "GiBleedingEye", text: "When you make a Sense roll to understand more about a phenomenon you've encountered, also add a number of dice equal to your current Intuition resistance to the roll." },
          "Forbidden Ritual": { icon: "GiMagicSwirl", text: "You know a highly complex and extremely dangerous ritual that will achieve a desired outcome. When you use this ritual, immediately take a Bleed scar. Determine what the ritual is and what its effects are: change the environment, conjure a phenomenon, or save a dying person." }
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

// A role color lifted toward cream so it reads as text or as an icon on the dark stage
// (the role colors themselves fall under 3:1 there). The hue stays the role's own.
const roleInk = (hex) => `color-mix(in srgb, ${hex} 60%, rgb(var(--c-cream)))`;

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
    actions: [{ key: 'move', label: 'Move' }, { key: 'strike', label: 'Strike' }, { key: 'control', label: 'Control' }] },
  { drive: 'Cunning',   color: '#2a4d25', bgColor: 'rgba(42,77,37,0.1)',    statsKey: 'cunning',
    actions: [{ key: 'sway', label: 'Sway' }, { key: 'sneak', label: 'Read' }, { key: 'hide', label: 'Hide' }] },
  { drive: 'Intuition', color: '#4a2870', bgColor: 'rgba(74,40,112,0.1)',   statsKey: 'intuition',
    actions: [{ key: 'survey', label: 'Survey' }, { key: 'read', label: 'Focus' }, { key: 'sense', label: 'Sense' }] },
];

const EMPTY_ACTIONS = { move:0, strike:0, control:0, hide:0, sneak:0, sway:0, survey:0, read:0, sense:0 };
const EMPTY_DRIVES  = { nerve:0, cunning:0, intuition:0 };

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

// ── Individual specialty card ──────────────────────────────────────────────────
const CARD_W = 275;
const CARD_H = 430;
// The deck is sized by the CSS variable --card-w (set per breakpoint on the stack), keeping
// the card's 275:430 proportion; CARD_W is the full desktop width.
const CARD_SIZE = { width: 'var(--card-w)', height: `calc(var(--card-w) * ${CARD_H} / ${CARD_W})` };

// CardFace — pure visual card, no positional logic (container handles placement & animation)
const CardFace = ({ roleName, specialtyName }) => {
  const color = ROLE_COLORS[roleName];
  const img   = CARD_IMAGES[specialtyName];
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative', borderRadius: 5, overflow: 'hidden',
      border: `3px solid ${color.primary}`,
      boxShadow: `inset 0 0 0 2px ${color.secondary}, inset 0 0 0 5px ${color.primary}22, 0 12px 30px rgba(0,0,0,0.7)`,
      background: color.cardBg,
    }}>
      {img
        ? <img src={img} alt={specialtyName} draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block',
              filter: 'sepia(0.82) brightness(0.72) contrast(1.14) saturate(0.48)' }} />
        : <div style={{ width: '100%', height: '100%', background: `radial-gradient(ellipse at center, rgba(${color.rgb},0.18), ${color.cardBg})` }} />
      }
      <div style={{ position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(0,0,0,0.72) 100%)',
        pointerEvents: 'none', zIndex: 2 }} />

      {/* Top: specialty name */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.92) 62%, transparent 100%)',
        padding: '12px 8px 18px' }}>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${color.primary}, transparent)`, marginBottom: 7 }} />
        <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 700,
          color: 'rgb(var(--c-cream))', textShadow: '0 1px 6px rgba(0,0,0,0.9)', lineHeight: 1.2 }}>
          {specialtyName}
        </p>
      </div>

      {/* Bottom: role label */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 55%, transparent 100%)',
        padding: '10px 8px 10px' }}>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${color.primary}, transparent)`, marginBottom: 5 }} />
        <p className="font-sans" style={{ textAlign: 'center', fontSize: 12, fontWeight: 900,
          letterSpacing: '0.16em', textTransform: 'uppercase', color: roleInk(color.primary) }}>
          {roleName}
        </p>
      </div>

      <div style={{ position: 'absolute', left: 38, right: 38, top: 34, height: 1, zIndex: 4,
        background: `linear-gradient(to right, transparent, ${color.primary}80, transparent)` }} />
      <div style={{ position: 'absolute', left: 38, right: 38, bottom: 34, height: 1, zIndex: 4,
        background: `linear-gradient(to right, transparent, ${color.primary}80, transparent)` }} />

      <div style={{ position: 'absolute', top: 2, left: 2, zIndex: 10 }}><DecoCorner color={color.primary} rot={0} /></div>
      <div style={{ position: 'absolute', top: 2, right: 2, zIndex: 10 }}><DecoCorner color={color.primary} rot={90} /></div>
      <div style={{ position: 'absolute', bottom: 2, left: 2, zIndex: 10 }}><DecoCorner color={color.primary} rot={270} /></div>
      <div style={{ position: 'absolute', bottom: 2, right: 2, zIndex: 10 }}><DecoCorner color={color.primary} rot={180} /></div>
      <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}><EdgeDiamond color={color.primary} /></div>
      <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}><EdgeDiamond color={color.primary} /></div>
      <div style={{ position: 'absolute', left: 2, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}><EdgeDiamond color={color.primary} /></div>
      <div style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}><EdgeDiamond color={color.primary} /></div>
    </div>
  );
};

// ── Draft ──────────────────────────────────────────────────────────────────────
// The investigator in progress is kept in this browser, so a reload or a phone call does
// not lose it. Storage can be full, blocked or missing (private windows), so every access
// is wrapped and the creator works the same without it. The portrait has its own key: it
// is large, and a portrait that does not fit must not cost the rest of the draft.
const DRAFT_VERSION = 1;
const readDraft = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || draft.v !== DRAFT_VERSION) return null;
    draft.profilePic = window.localStorage.getItem(`${key}:portrait`) || null;
    return draft;
  } catch {
    return null;
  }
};
const writeDraft = (key, data) => {
  try { window.localStorage.setItem(key, JSON.stringify({ v: DRAFT_VERSION, ...data })); } catch { /* the draft is a convenience */ }
};
const writeDraftPortrait = (key, dataUrl) => {
  try {
    if (dataUrl) window.localStorage.setItem(`${key}:portrait`, dataUrl);
    else window.localStorage.removeItem(`${key}:portrait`);
  } catch { /* too large for storage: the rest of the draft is still kept */ }
};
const clearDraft = (key) => {
  try {
    window.localStorage.removeItem(key);
    window.localStorage.removeItem(`${key}:portrait`);
  } catch { /* nothing to clear */ }
};

// ── Main component ─────────────────────────────────────────────────────────────
export const CharacterCreator = ({ onSubmit, rejoinContext, draftKey = 'candela-creator-draft' }) => {
  // Read once, on the first render
  const [draft] = useState(() => readDraft(draftKey));
  const d = (field, fallback) => (draft && draft[field] !== undefined && draft[field] !== null ? draft[field] : fallback);
  const [restoredDraft, setRestoredDraft] = useState(() => !!(draft && (draft.role || draft.name)));

  const [step, setStep] = useState(() => d('step', 1));

  // Card deck state
  const [currentIndex, setCurrentIndex] = useState(() => d('currentIndex', 0));
  // 'idle' | 'out-forward' | 'in-forward' | 'out-backward' | 'in-backward'
  const [animState, setAnimState] = useState('idle');

  // Identity
  const [profilePic, setProfilePic] = useState(() => d('profilePic', null));
  const [name,       setName]       = useState(() => d('name', ""));
  const [pronouns,   setPronouns]   = useState(() => d('pronouns', ""));
  const [style,      setStyle]      = useState(() => d('style', ""));
  const [catalyst,   setCatalyst]   = useState(() => d('catalyst', ""));
  const [question,   setQuestion]   = useState(() => d('question', ""));

  // Chosen role/specialty (locked in when "Choose This Specialty" clicked)
  const [role,     setRole]     = useState(() => d('role', ""));
  const [specialty,setSpecialty]= useState(() => d('specialty', ""));

  // Abilities — chosen in Step 1 panel
  const [selectedRoleAbility,      setSelectedRoleAbility]      = useState(() => d('selectedRoleAbility', ""));
  const [selectedSpecialtyAbility, setSelectedSpecialtyAbility] = useState(() => d('selectedSpecialtyAbility', ""));

  // Actions & drives — step 3 state
  const [lockedActions, setLockedActions] = useState(() => ({ ...EMPTY_ACTIONS, ...d('lockedActions', {}) }));
  const [freeRaiseKey,  setFreeRaiseKey]  = useState(() => d('freeRaiseKey', null));
  const [freeAdditions, setFreeAdditions] = useState(() => ({ ...EMPTY_ACTIONS, ...d('freeAdditions', {}) }));
  const [lockedDrives,  setLockedDrives]  = useState(() => ({ ...EMPTY_DRIVES, ...d('lockedDrives', {}) }));
  const [driveDistrib,  setDriveDistrib]  = useState(() => ({ ...EMPTY_DRIVES, ...d('driveDistrib', {}) }));
  const [lockedGilded, setLockedGilded] = useState(() => d('lockedGilded', ''));
  const [freeGilded,   setFreeGilded]   = useState(() => d('freeGilded', ''));
  const [selectedGear, setSelectedGear] = useState(() => d('selectedGear', []));

  // Finalize routing
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [campaignCode,  setCampaignCode]  = useState(() => d('campaignCode', ""));
  const [selectedPen,   setSelectedPen]   = useState(() => d('selectedPen', 'Caveat'));

  // Saving: which button is saving, the last error, and the id of an investigator that was
  // saved even though joining or rejoining afterwards failed (a retry then skips the save).
  const [savingMode, setSavingMode] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [savedCharacterId, setSavedCharacterId] = useState(null);
  const [lastAttempt, setLastAttempt] = useState(null);

  // Keep the draft up to date. Nothing chosen yet means nothing to keep.
  useEffect(() => {
    if (savedCharacterId) return;
    if (!role && !name && currentIndex === 0) { clearDraft(draftKey); return; }
    writeDraft(draftKey, {
      step, currentIndex, name, pronouns, style, catalyst, question, role, specialty,
      selectedRoleAbility, selectedSpecialtyAbility, lockedActions, freeRaiseKey, freeAdditions,
      lockedDrives, driveDistrib, lockedGilded, freeGilded, selectedGear, campaignCode, selectedPen,
    });
  }, [step, currentIndex, name, pronouns, style, catalyst, question, role, specialty,
      selectedRoleAbility, selectedSpecialtyAbility, lockedActions, freeRaiseKey, freeAdditions,
      lockedDrives, driveDistrib, lockedGilded, freeGilded, selectedGear, campaignCode, selectedPen, savedCharacterId]);
  useEffect(() => {
    if (!savedCharacterId) writeDraftPortrait(draftKey, profilePic);
  }, [profilePic, savedCharacterId]);

  const startOver = () => {
    clearDraft(draftKey);
    setRestoredDraft(false);
    setStep(1); setCurrentIndex(0); setAnimState('idle');
    setProfilePic(null); setName(''); setPronouns(''); setStyle(''); setCatalyst(''); setQuestion('');
    setRole(''); setSpecialty(''); setSelectedRoleAbility(''); setSelectedSpecialtyAbility('');
    setLockedActions({ ...EMPTY_ACTIONS }); setFreeRaiseKey(null); setFreeAdditions({ ...EMPTY_ACTIONS });
    setLockedDrives({ ...EMPTY_DRIVES }); setDriveDistrib({ ...EMPTY_DRIVES });
    setLockedGilded(''); setFreeGilded(''); setSelectedGear([]);
    setShowJoinInput(false); setCampaignCode(''); setSelectedPen('Caveat');
    setSaveError(''); setLastAttempt(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePic(ev.target.result);
    reader.readAsDataURL(file);
  };

  const flip = (dir) => {
    const atStart = currentIndex <= 0;
    const atEnd   = currentIndex >= allCards.length - 1;
    if (animState !== 'idle' || (dir === 'forward' && atEnd) || (dir === 'backward' && atStart)) return;
    setSelectedRoleAbility('');
    setSelectedSpecialtyAbility('');
    setAnimState(`out-${dir}`);
    setTimeout(() => {
      setCurrentIndex(i => dir === 'forward' ? i + 1 : i - 1);
      setAnimState(`in-${dir}`);
      setTimeout(() => setAnimState('idle'), 300);
    }, 300);
  };

  const chooseSpecialty = () => {
    if (!selectedRoleAbility || !selectedSpecialtyAbility) return;
    const card = allCards[currentIndex];
    setRole(card.roleName);
    setSpecialty(card.specialtyName);
    const { startActions, startDrives } = ROLES[card.roleName].specialties[card.specialtyName];
    setLockedActions({ ...EMPTY_ACTIONS, ...startActions });
    setLockedDrives({ ...EMPTY_DRIVES, ...startDrives });
    setFreeRaiseKey(null);
    setFreeAdditions({ ...EMPTY_ACTIONS });
    setDriveDistrib({ ...EMPTY_DRIVES });
    setLockedGilded(SPECIALTY_GILDED[card.specialtyName] || '');
    setFreeGilded('');
    setSelectedGear([]);
    setStep(2);
  };

  const toggleGear = (item) => {
    if (selectedGear.includes(item)) setSelectedGear(selectedGear.filter(g => g !== item));
    else if (selectedGear.length < 3) setSelectedGear([...selectedGear, item]);
  };

  const getActionTotal = (key) =>
    (lockedActions[key]||0) + (freeRaiseKey===key?1:0) + (freeAdditions[key]||0);

  const getDriveValue = (driveKey) =>
    (lockedDrives[driveKey]||0) + (driveDistrib[driveKey]||0);

  const freePtsUsed   = Object.values(freeAdditions).reduce((s,v)=>s+v,0);
  const drivesPtsUsed = Object.values(driveDistrib).reduce((s,v)=>s+v,0);

  const adjustFreePoints = (key, delta) => {
    const cur = freeAdditions[key] || 0;
    if (delta < 0 && cur <= 0) return;
    if (delta > 0 && getActionTotal(key) >= 2) return;
    if (delta > 0 && freePtsUsed >= 3) return;
    setFreeAdditions(p => ({ ...p, [key]: cur + delta }));
  };

  const adjustDrive = (driveKey, delta) => {
    const cur = driveDistrib[driveKey] || 0;
    if (delta < 0 && cur <= 0) return;
    if (delta > 0 && drivesPtsUsed >= 6) return;
    setDriveDistrib(p => ({ ...p, [driveKey]: cur + delta }));
  };

  const toggleFreeGilded = (actionKey) => {
    if (actionKey === lockedGilded) return;
    setFreeGilded(k => k === actionKey ? '' : actionKey);
  };

  const step3Complete = freeRaiseKey !== null && freePtsUsed === 3 && drivesPtsUsed === 6 && freeGilded !== '';

  const handleComplete = async (mode, code) => {
    if (savingMode || !onSubmit) return;
    const computedActions = Object.fromEntries(
      Object.keys(EMPTY_ACTIONS).map(k => [k, getActionTotal(k)])
    );
    setSavingMode(mode || 'save');
    setSaveError('');
    setLastAttempt({ mode, code });
    let result;
    try {
      result = await onSubmit({
        name, pronouns, style, catalyst, question, role, specialty,
        roleAbility: selectedRoleAbility, specialtyAbility: selectedSpecialtyAbility,
        gear: selectedGear, profilePic, actions: computedActions,
        gildedActions: [lockedGilded, freeGilded].filter(Boolean),
        nerve_max:     getDriveValue('nerve'),
        cunning_max:   getDriveValue('cunning'),
        intuition_max: getDriveValue('intuition'),
        mode: mode || 'save',
        campaignCode: code || '',
        penFont: selectedPen,
        existingCharacterId: savedCharacterId || undefined,
      });
    } catch {
      result = { ok: false, error: 'Something went wrong while saving. Your choices are kept; try again.' };
    }
    // Saved, and the app has moved on to the hub or the desk
    if (!result || result.ok) { clearDraft(draftKey); return; }
    if (result.savedCharacterId) {
      setSavedCharacterId(result.savedCharacterId);
      clearDraft(draftKey);
    }
    setSaveError(result.error || 'The investigator was not saved. Your choices are kept; try again.');
    setSavingMode(null);
  };
  const retrySave = () => lastAttempt && handleComplete(lastAttempt.mode, lastAttempt.code);
  const joinDialogRef = useDialog({ open: showJoinInput, onClose: () => { if (!savingMode) setShowJoinInput(false); } });
  const savedNote = savedCharacterId ? `${name || 'Your investigator'} is saved. ` : '';

  // Step unlock logic
  const step2Unlocked = !!(role && specialty && selectedRoleAbility && selectedSpecialtyAbility);
  const step3Unlocked = step2Unlocked && !!name;
  const step4Unlocked = step3Unlocked && step3Complete;

  const canAdvance = step === 2 ? !!(name && catalyst) : step === 3 ? step3Complete : true;

  const allCards = Object.entries(ROLES).flatMap(([rn, rd]) =>
    Object.keys(rd.specialties).map(sn => ({ roleName: rn, specialtyName: sn }))
  );

  // Current card drives all step-1 rendering
  const currentCard     = allCards[currentIndex];
  const currentRoleData = ROLES[currentCard.roleName];
  const currentSpecData = currentRoleData.specialties[currentCard.specialtyName];
  const currentColor    = ROLE_COLORS[currentCard.roleName];

  const STEP_LABELS = ["1. CHOOSE PATH", "2. PROFILE", "3. ACTION RATINGS", "4. GEAR & DOSSIER"];
  const STEP_UNLOCKED = [true, step2Unlocked, step3Unlocked, step4Unlocked];

  // A draft from an older build could name a step its choices no longer unlock.
  useEffect(() => { if (!STEP_UNLOCKED[step - 1]) setStep(1); }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-6 font-serif text-ink">

      {restoredDraft && !savedCharacterId && (
        <ConfirmAction
          className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 bg-parchment border border-sepia/40 rounded-sm px-4 py-3 shadow-md"
          hintClassName="basis-full"
          onConfirm={startOver}
          cancelLabel="Keep it"
          armedHint="Press again to clear every choice and start from the first card."
          renderButton={(armed, props) => (
            <>
              <p className="font-serif text-base text-ink leading-snug min-w-0 flex-1 basis-60">
                This is the investigator you were making{name ? `, ${name}` : ''}. Your choices were kept in this browser.
              </p>
              <button
                {...props}
                className={`shrink-0 min-h-[40px] px-4 font-sans text-xs font-black uppercase tracking-widest border rounded transition-colors ${
                  armed ? 'bg-oxblood text-cream border-ink' : 'text-sepia border-sepia/50 hover:text-oxblood hover:border-oxblood/50'
                }`}
              >
                {armed ? 'Yes, start over' : 'Start over'}
              </button>
            </>
          )}
        />
      )}

      {/* ── PROGRESS NAV ── */}
      <nav aria-label="Steps" className="flex border border-sepia/50 bg-ink text-xs sm:text-sm lg:text-base font-sans font-black tracking-wider sm:tracking-widest text-center select-none rounded mb-6 sm:mb-8 shadow-md overflow-hidden">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const unlocked = STEP_UNLOCKED[i];
          const active = step === n;
          const [num, ...words] = label.split(' ');
          return (
            <button key={n} type="button" onClick={() => unlocked && setStep(n)}
              disabled={!unlocked}
              aria-current={active ? 'step' : undefined}
              aria-label={`Step ${n}, ${words.join(' ').toLowerCase()}${unlocked ? '' : ', locked until the earlier steps are done'}`}
              className={`${active ? 'flex-[3] sm:flex-1' : 'flex-1'} py-3 sm:py-4 px-1 border-r border-sepia/50 last:border-r-0 transition-colors font-black tracking-wider sm:tracking-widest uppercase ${
                active   ? 'bg-oxblood text-cream' :
                unlocked ? 'text-cream/75 hover:bg-black/20 hover:text-cream cursor-pointer' :
                           'cursor-not-allowed text-cream/55'
              }`}>
              {!unlocked && <Gi.GiPadlock aria-hidden="true" size={12} className="inline-block mr-1 -mt-0.5" />}
              {num}<span className={active ? '' : 'hidden sm:inline'}> {words.join(' ')}</span>
            </button>
          );
        })}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1 — CHOOSE YOUR PATH
          ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="animate-fadeIn pb-28 lg:pb-0">
          <style>{`
            @keyframes cardFlipOutForward  { from { transform: rotateY(0deg);    } to { transform: rotateY(-90deg); } }
            @keyframes cardFlipInForward   { from { transform: rotateY(90deg);   } to { transform: rotateY(0deg);   } }
            @keyframes cardFlipOutBackward { from { transform: rotateY(0deg);    } to { transform: rotateY(90deg);  } }
            @keyframes cardFlipInBackward  { from { transform: rotateY(-90deg);  } to { transform: rotateY(0deg);   } }
          `}</style>

          <div className="text-center mb-6">
            <h2 className="font-display text-3xl sm:text-5xl uppercase tracking-[0.08em] text-cream"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>Choose Your Path</h2>
            <p className="text-base sm:text-lg font-serif italic text-cream/70 mt-2">
              Flip through the deck, then choose one specialty ability and one role ability to continue.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-center lg:items-start">

            {/* ── LEFT: stacked card deck ── */}
            <div className="shrink-0 flex flex-col items-center gap-4 lg:gap-5 w-full lg:w-[340px] [--card-w:190px] sm:[--card-w:240px] lg:[--card-w:275px]">

              {/* Card stack */}
              <div style={{ position: 'relative', width: 'calc(var(--card-w) + 30px)', height: `calc(${CARD_SIZE.height} + 25px)` }}>

                {/* Depth shadow cards beneath */}
                {[4, 3, 2, 1].map(n => (
                  <div key={n} style={{
                    position: 'absolute', bottom: 0, left: '50%',
                    ...CARD_SIZE,
                    transform: `translateX(calc(-50% + ${n * 5}px)) translateY(${n * 4}px)`,
                    borderRadius: 5,
                    background: currentColor.cardBg,
                    border: `2px solid ${currentColor.primary}${n < 3 ? '22' : '44'}`,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                    zIndex: n,
                  }} />
                ))}

                {/* Top card — animated on flip */}
                <div style={{
                  position: 'absolute', bottom: 0, left: '50%',
                  ...CARD_SIZE,
                  transform: 'translateX(-50%)',
                  zIndex: 10, perspective: '1000px',
                }}>
                  <div style={{
                    width: '100%', height: '100%',
                    animation:
                      animState === 'out-forward'  ? 'cardFlipOutForward  300ms ease-in  forwards' :
                      animState === 'in-forward'   ? 'cardFlipInForward   300ms ease-out forwards' :
                      animState === 'out-backward' ? 'cardFlipOutBackward 300ms ease-in  forwards' :
                      animState === 'in-backward'  ? 'cardFlipInBackward  300ms ease-out forwards' : 'none',
                  }}>
                    <CardFace roleName={currentCard.roleName} specialtyName={currentCard.specialtyName} />
                  </div>
                </div>
              </div>

              {/* Prev / counter / Next */}
              <div className="flex items-center gap-5">
                <button type="button" aria-label="Previous card" onClick={() => flip('backward')} disabled={currentIndex === 0 || animState !== 'idle'}
                  className="w-11 h-11 flex items-center justify-center rounded-full font-black text-2xl transition-all disabled:opacity-20 hover:bg-white/10"
                  style={{ border: '1px solid rgb(var(--c-cream)/0.2)', color: 'rgb(var(--c-cream))' }}>
                  ‹
                </button>
                <span className="text-sm font-mono tabular-nums text-cream/70 min-w-[56px] text-center">
                  {currentIndex + 1} / {allCards.length}
                </span>
                <button type="button" aria-label="Next card" onClick={() => flip('forward')} disabled={currentIndex >= allCards.length - 1 || animState !== 'idle'}
                  className="w-11 h-11 flex items-center justify-center rounded-full font-black text-2xl transition-all disabled:opacity-20 hover:bg-white/10"
                  style={{ border: '1px solid rgb(var(--c-cream)/0.2)', color: 'rgb(var(--c-cream))' }}>
                  ›
                </button>
              </div>

              {/* Role description blurb */}
              <p className="text-base font-serif italic text-cream/70 text-center leading-relaxed px-3 max-w-[280px]">
                {currentRoleData.description}
              </p>
            </div>

            {/* ── RIGHT: always-visible panel ── */}
            <div className="w-full lg:w-auto lg:flex-1 flex flex-col rounded lg:overflow-hidden lg:min-h-[455px]"
              style={{ border: `1px solid ${currentColor.primary}33`, background: 'rgb(var(--c-night))',
                boxShadow: `0 4px 20px rgba(0,0,0,0.6), inset 0 0 0 1px ${currentColor.secondary}44` }}>

              {/* Header */}
              <div className="px-4 sm:px-6 pt-5 pb-4 shrink-0"
                style={{ borderBottom: `1px solid ${currentColor.primary}25`, background: `linear-gradient(to bottom, rgba(${currentColor.rgb},0.1), transparent)` }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `rgba(${currentColor.rgb},0.15)`, border: `2px solid ${currentColor.primary}` }}>
                    <SafeIcon name={currentSpecData.icon} size={46} style={{ color: roleInk(currentColor.primary) }} />
                  </div>
                  <div>
                    <p className="text-sm font-sans font-black tracking-[0.16em] uppercase" style={{ color: roleInk(currentColor.primary) }}>
                      {currentCard.roleName}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-black text-cream leading-tight">{currentCard.specialtyName}</h3>
                    <p className="text-base italic text-cream/70 mt-0.5">{currentSpecData.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(ILLUMINATION_KEYS[currentCard.specialtyName] || []).map(k => (
                        <span key={k} className="px-2 py-0.5 rounded-sm text-xs font-sans font-black uppercase tracking-wide"
                          style={{ background: `rgba(${currentColor.rgb},0.22)`, border: `1px solid ${currentColor.primary}55`, color: roleInk(currentColor.primary) }}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-side abilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-y-auto custom-scrollbar">

                {/* Left col — specialty abilities */}
                <div className="px-4 sm:px-5 py-4 space-y-2 border-b md:border-b-0 md:border-r"
                  style={{ borderColor: `${currentColor.primary}18` }}>
                  <p id="creator-specialty-abilities" className="text-sm font-sans font-black tracking-[0.14em] uppercase mb-3" style={{ color: roleInk(currentColor.primary) }}>
                    Specialty Ability: choose one
                  </p>
                  <div role="radiogroup" aria-labelledby="creator-specialty-abilities" className="space-y-2">
                  {Object.entries(currentSpecData.abilities).map(([aN, aD], idx, all) => {
                    const picked = selectedSpecialtyAbility === aN;
                    return (
                      <button type="button" key={aN} role="radio" aria-checked={picked}
                        tabIndex={picked || (!selectedSpecialtyAbility && idx === 0) ? 0 : -1}
                        onClick={() => setSelectedSpecialtyAbility(aN)}
                        onKeyDown={e => radioArrows(e, i => setSelectedSpecialtyAbility(all[i][0]))}
                        className="w-full text-left flex items-start gap-2.5 p-3 rounded cursor-pointer transition-all"
                        style={{
                          background: picked ? `rgba(${currentColor.rgb},0.22)` : 'rgb(var(--c-cream)/0.03)',
                          border: `1px solid ${picked ? currentColor.primary : `rgba(${currentColor.rgb},0.18)`}`,
                        }}>
                        <div className="shrink-0 mt-0.5 w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: picked ? currentColor.primary : `rgba(${currentColor.rgb},0.15)`, border: `1px solid ${currentColor.primary}55` }}>
                          <SafeIcon name={aD.icon} size={22} style={{ color: picked ? 'rgb(var(--c-cream))' : roleInk(currentColor.primary) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-cream leading-tight">{aN}</p>
                          <p className="text-base text-cream/75 leading-snug mt-0.5">{aD.text}</p>
                        </div>
                        {picked && <Gi.GiCheckMark aria-hidden="true" size={14} className="ml-auto shrink-0 mt-1" style={{ color: roleInk(currentColor.primary) }} />}
                      </button>
                    );
                  })}
                  </div>
                </div>

                {/* Right col — role abilities + specialty gear */}
                <div className="px-4 sm:px-5 py-4 space-y-2 flex flex-col">
                  <p id="creator-role-abilities" className="text-sm font-sans font-black tracking-[0.14em] uppercase mb-3" style={{ color: roleInk(currentColor.primary) }}>
                    {currentCard.roleName} Role Ability: choose one
                  </p>
                  <div role="radiogroup" aria-labelledby="creator-role-abilities" className="space-y-2">
                  {Object.entries(currentRoleData.baseAbilities).map(([aN, aD], idx, all) => {
                    const picked = selectedRoleAbility === aN;
                    return (
                      <button type="button" key={aN} role="radio" aria-checked={picked}
                        tabIndex={picked || (!selectedRoleAbility && idx === 0) ? 0 : -1}
                        onClick={() => setSelectedRoleAbility(aN)}
                        onKeyDown={e => radioArrows(e, i => setSelectedRoleAbility(all[i][0]))}
                        className="w-full text-left flex items-start gap-2.5 p-3 rounded cursor-pointer transition-all"
                        style={{
                          background: picked ? `rgba(${currentColor.rgb},0.22)` : 'rgb(var(--c-cream)/0.03)',
                          border: `1px solid ${picked ? currentColor.primary : `rgba(${currentColor.rgb},0.18)`}`,
                        }}>
                        <div className="shrink-0 mt-0.5 w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: picked ? currentColor.primary : `rgba(${currentColor.rgb},0.15)`, border: `1px solid ${currentColor.primary}55` }}>
                          <SafeIcon name={aD.icon} size={22} style={{ color: picked ? 'rgb(var(--c-cream))' : roleInk(currentColor.primary) }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-cream leading-tight">{aN}</p>
                          <p className="text-base text-cream/75 leading-snug mt-0.5">{aD.text}</p>
                        </div>
                        {picked && <Gi.GiCheckMark aria-hidden="true" size={14} className="ml-auto shrink-0 mt-1" style={{ color: roleInk(currentColor.primary) }} />}
                      </button>
                    );
                  })}
                  </div>

                  {/* Specialty Gear — under role abilities */}
                  <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${currentColor.primary}20` }}>
                    <p className="text-sm font-sans font-black tracking-[0.14em] uppercase mb-2" style={{ color: roleInk(currentColor.primary) }}>
                      Specialty Gear
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentSpecData.gear.map(g => (
                        <span key={g} className="text-base font-serif italic text-cream/80 px-2.5 py-1 rounded"
                          style={{ background: 'rgb(var(--c-cream)/0.05)', border: '1px solid rgb(var(--c-cream)/0.12)' }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer — CTA only */}
              <div className="fixed inset-x-0 bottom-0 z-40 bg-night shadow-[0_-10px_24px_rgba(0,0,0,0.75)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:z-auto lg:bg-transparent lg:shadow-none lg:px-6 lg:py-4 shrink-0"
                style={{ borderTop: `1px solid ${currentColor.primary}20` }}>
                <div className="flex items-center justify-between gap-3 max-w-[1500px] mx-auto">
                  <p className="text-sm sm:text-base italic text-cream/70">
                    {(!selectedSpecialtyAbility || !selectedRoleAbility) ? 'Select one ability from each column to continue' : 'Ready to proceed'}
                  </p>
                  <button onClick={chooseSpecialty} disabled={!selectedRoleAbility || !selectedSpecialtyAbility}
                    className="px-4 sm:px-6 py-3 lg:py-2.5 text-sm sm:text-base font-sans font-black uppercase tracking-wider rounded transition-all shrink-0"
                    style={{
                      background: (selectedRoleAbility && selectedSpecialtyAbility) ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-cream)/0.06)',
                      color: (selectedRoleAbility && selectedSpecialtyAbility) ? 'rgb(var(--c-cream))' : 'rgb(var(--c-cream)/0.45)',
                      boxShadow: (selectedRoleAbility && selectedSpecialtyAbility) ? '0 2px 6px rgba(0,0,0,0.5)' : 'none',
                      cursor: (selectedRoleAbility && selectedSpecialtyAbility) ? 'pointer' : 'not-allowed',
                    }}>
                    Select this Path →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2 — INVESTIGATOR PROFILE (Registration + Interview combined)
          ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <PaperSheet>
          <div className="animate-fadeIn space-y-6">
            <div className="text-center pb-4" style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.22)' }}>
              <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-[0.06em] text-oxblood">Investigator Profile</h2>
              <p className="text-base sm:text-lg font-serif italic text-sepia mt-1">
                {specialty} · {role}. Who they are, and why they came to Candela Obscura.
              </p>
            </div>

            {/* ── Two-column layout: Demographics (left) | Psychological Evaluation (right) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* LEFT: Portrait + Name/Pronouns/Characteristics */}
              <div className="space-y-4">
                {/* Portrait + Name row */}
                <div className="flex gap-3 sm:gap-4 items-start">
                  <div className="shrink-0">
                    <label className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-oxblood mb-1.5">Portrait</label>
                    <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-parchment-deep/55 hover:border-oxblood/50 transition-all relative overflow-hidden shadow-inner group rounded w-[112px] h-[140px] sm:w-[160px] sm:h-[200px] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-candle-gold"
                      style={{ border: '2px dashed rgb(var(--c-sepia)/0.4)', background: 'rgb(var(--c-parchment-deep)/0.3)' }}>
                      {profilePic
                        ? <img src={profilePic} alt={`Portrait of ${name || 'your investigator'}`} className="w-full h-full object-cover" />
                        : <div className="text-center px-3">
                            <Gi.GiIdCard size={36} className="mx-auto text-sepia/50 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="block text-xs font-sans font-black tracking-wider text-sepia uppercase leading-tight">[+] Affix Portrait</span>
                          </div>
                      }
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" aria-label={profilePic ? 'Change the portrait' : 'Add a portrait'} />
                    </label>
                  </div>

                  <div className="flex-1 min-w-0 space-y-3 pt-5">
                    <div>
                      <label htmlFor="creator-name" className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-oxblood mb-1">Full Name *</label>
                      <input id="creator-name" type="text" required aria-required="true" value={name} onChange={e => setName(e.target.value)}
                        placeholder="e.g. Ada Whitlock"
                        className="w-full bg-transparent font-serif font-bold text-lg placeholder-sepia/90 placeholder:font-normal placeholder:italic pb-1"
                        style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.38)' }} />
                    </div>
                    <div>
                      <label htmlFor="creator-pronouns" className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-oxblood mb-1">Gender / Pronouns</label>
                      <input id="creator-pronouns" type="text" value={pronouns} onChange={e => setPronouns(e.target.value)}
                        placeholder="e.g., He/They, She/Her…"
                        className="w-full bg-transparent font-serif italic text-lg placeholder-sepia/90 pb-1"
                        style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.38)' }} />
                    </div>
                  </div>
                </div>

                {/* Identifying Characteristics */}
                <div>
                  <label htmlFor="creator-style" className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-oxblood mb-1">Style</label>
                  <textarea id="creator-style" rows={3} value={style} onChange={e => setStyle(e.target.value)}
                    placeholder="Detail apparel, distinguishing marks, tailored suits, or signature items that set this investigator apart…"
                    className="w-full bg-transparent font-serif text-base resize-none placeholder-sepia/90 placeholder:italic leading-7 paper-ruled"
                    style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.25)' }} />
                </div>
              </div>

              {/* RIGHT: Psychological Evaluation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1" style={{ borderTop: '1px dashed rgb(var(--c-sepia)/0.25)' }} />
                  <span className="text-sm font-sans font-black uppercase tracking-[0.14em] text-oxblood shrink-0">Psychological Evaluation</span>
                  <div className="flex-1" style={{ borderTop: '1px dashed rgb(var(--c-sepia)/0.25)' }} />
                </div>

                <div className="bg-parchment-deep/30 p-4 rounded-sm shadow-inner" style={{ border: '1px solid rgb(var(--c-sepia)/0.18)' }}>
                  <label htmlFor="creator-catalyst" className="block text-lg font-serif font-bold text-oxblood mb-2 pb-1.5"
                    style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.15)' }}>
                    Catalyst: why do you seek Candela Obscura? *
                  </label>
                  <textarea id="creator-catalyst" required aria-required="true" rows={4} value={catalyst} onChange={e => setCatalyst(e.target.value)}
                    placeholder="The specific event or rupture that drew you into the dark…"
                    className="w-full bg-transparent font-serif text-base resize-none placeholder-sepia/90 placeholder:italic leading-7 paper-ruled" />
                </div>

                <div className="bg-parchment-deep/30 p-4 rounded-sm shadow-inner" style={{ border: '1px solid rgb(var(--c-sepia)/0.18)' }}>
                  <label htmlFor="creator-question" className="block text-lg font-serif font-bold text-oxblood mb-2 pb-1.5"
                    style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.15)' }}>
                    Question: what answer do you seek?
                  </label>
                  <textarea id="creator-question" rows={4} value={question} onChange={e => setQuestion(e.target.value)}
                    placeholder="The central question or haunting mystery your investigator pursues…"
                    className="w-full bg-transparent font-serif text-base resize-none placeholder-sepia/90 placeholder:italic leading-7 paper-ruled" />
                </div>
              </div>
            </div>
          </div>
        </PaperSheet>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 3 — ACTION RATINGS & DRIVES
          ══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && (() => {
        const zeroStartKeys = Object.entries(lockedActions).filter(([,v])=>v===0).map(([k])=>k);
        const actionKeyLabel = {};
        ACTION_DRIVES.forEach(di => di.actions.forEach(({key,label}) => { actionKeyLabel[key]=label; }));
        return (
        <PaperSheet>
          <div className="animate-fadeIn space-y-6">
            <div className="text-center pb-5" style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.22)' }}>
              <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-[0.06em] text-oxblood">Action Ratings &amp; Drive</h2>
              <p className="text-base sm:text-lg font-serif italic text-sepia mt-1">
                {specialty} starting values are set. Raise one action from 0, add 3 free action points, and assign 6 drive points.
              </p>
            </div>

            {/* ── Step A: Free Raise ── */}
            <div className="rounded-sm p-4" style={{ background:'rgb(var(--c-parchment-deep)/0.2)', border:'1px solid rgb(var(--c-sepia)/0.18)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-serif font-bold text-oxblood">
                  A. Raise One Starting-Zero Action to 1
                </h3>
                {freeRaiseKey
                  ? <span className="text-xs font-sans font-black uppercase tracking-widest text-seal-green">✓ {actionKeyLabel[freeRaiseKey]}</span>
                  : <span className="text-xs font-sans font-black uppercase tracking-widest text-sepia">choose one</span>
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {zeroStartKeys.map(k => {
                  const sel = freeRaiseKey === k;
                  return (
                    <button key={k} onClick={() => setFreeRaiseKey(sel ? null : k)}
                      className="px-3 py-1.5 text-sm font-sans font-black uppercase tracking-wider rounded-sm transition-all"
                      style={{
                        background: sel ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-parchment-deep)/0.5)',
                        color: sel ? 'rgb(var(--c-cream))' : 'rgb(var(--c-sepia))',
                        border: `1px solid ${sel ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-sepia)/0.3)'}`,
                      }}>
                      {actionKeyLabel[k]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Step B: Action distribution grid ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-serif font-bold text-oxblood">
                  B. Distribute 3 Free Action Points (max 2 per action)
                </h3>
                <span className={`text-xs font-sans font-black uppercase tracking-widest ${freePtsUsed===3?'text-seal-green':'text-sepia'}`}>
                  {freePtsUsed}/3 placed
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {ACTION_DRIVES.map(di => {
                  const gKey = di.drive.toLowerCase();
                  return (
                    <div key={di.drive} className="rounded-sm p-4" style={{ background: di.bgColor, border:`1px solid ${di.color}30` }}>
                      <div className="mb-3 pb-2" style={{ borderBottom:`1px solid ${di.color}28` }}>
                        <span className="text-sm font-black uppercase tracking-wider" style={{ color: di.color }}>{di.drive}</span>
                      </div>
                      <div className="space-y-3">
                        {di.actions.map(({ key, label }) => {
                          const locked  = lockedActions[key] || 0;
                          const raised  = freeRaiseKey === key ? 1 : 0;
                          const free    = freeAdditions[key] || 0;
                          const total   = locked + raised + free;
                          const isLockedGilded = lockedGilded === key;
                          const isFreeGilded   = freeGilded === key;
                          const isGilded       = isLockedGilded || isFreeGilded;
                          return (
                            <div key={key} className="flex items-center gap-2">
                              {isLockedGilded ? (
                                <span className="shrink-0 w-5 h-5 flex items-center justify-center" title="Specialty gilded action (locked)" role="img" aria-label={`${label} is gilded by your specialty`}>
                                  <Gi.GiStarFormation aria-hidden="true" size={13} style={{ color: 'rgb(var(--c-candle-gold))' }} />
                                </span>
                              ) : (
                                <button type="button" onClick={() => toggleFreeGilded(key)}
                                  aria-pressed={isFreeGilded}
                                  aria-label={isFreeGilded ? `${label} is your free gilded action. Remove the gild` : freeGilded ? `Move your free gild to ${label}` : `Gild ${label} (free choice)`}
                                  title={isFreeGilded ? 'Remove free gild' : freeGilded ? 'Replace free gild' : 'Gild this action (free choice)'}
                                  className="shrink-0 w-7 h-7 -m-1 flex items-center justify-center rounded-sm transition-opacity hover:opacity-100"
                                  style={{ opacity: isFreeGilded ? 1 : 0.7 }}>
                                  <Gi.GiStarFormation aria-hidden="true" size={13} style={{ color: isFreeGilded ? 'rgb(var(--c-candle-gold))' : 'rgb(var(--c-sepia))' }} />
                                </button>
                              )}
                              <span className="text-sm font-serif font-bold text-ink w-16 shrink-0 group/act relative cursor-help">
                                {label}
                                <span className="hidden group-hover/act:block absolute left-0 top-full mt-1 z-10 w-64 text-base font-serif font-normal italic text-ink bg-cream border border-sepia/40 rounded px-2 py-1 shadow pointer-events-none leading-snug">
                                  {ACTION_FLAVOR[key]}
                                </span>
                              </span>
                              <div className="flex gap-1 flex-1" role="img" aria-label={`${label}: ${total} of 3${isGilded ? ', gilded' : ''}`}>
                                {[1,2,3].map(n => {
                                  let cls = '';
                                  if (n <= locked) cls = 'action-pip filled opacity-50';
                                  else if (n === locked+1 && raised===1) cls = isGilded&&n===total ? 'action-pip gilded' : 'action-pip filled';
                                  else if (n <= total) cls = isGilded&&n===total ? 'action-pip gilded' : 'action-pip filled';
                                  else cls = 'action-pip';
                                  return <div key={n} className={cls} style={n<=locked?{outline:'2px solid rgb(var(--c-sepia)/0.5)', outlineOffset:'-1px'}:{}} />;
                                })}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={() => adjustFreePoints(key,-1)} disabled={free<=0} aria-label={`Take a free point off ${label}`}
                                  className="w-7 h-7 [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:h-9 flex items-center justify-center font-black text-base rounded hover:opacity-80 disabled:opacity-20 border"
                                  style={{ color:'rgb(var(--c-oxblood))', borderColor:'rgb(var(--c-oxblood) / 0.31)' }}>−</button>
                                <button type="button" onClick={() => adjustFreePoints(key,1)} disabled={total>=2||freePtsUsed>=3} aria-label={`Put a free point on ${label}`}
                                  className="w-7 h-7 [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:h-9 flex items-center justify-center font-black text-base rounded hover:opacity-80 disabled:opacity-20 border"
                                  style={{ color:'rgb(var(--c-oxblood))', borderColor:'rgb(var(--c-oxblood) / 0.31)' }}>+</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Step C: Drive distribution ── */}
            <div className="rounded-sm p-4" style={{ background:'rgb(var(--c-parchment-deep)/0.15)', border:'1px solid rgb(var(--c-sepia)/0.18)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif font-bold text-oxblood">
                  C. Distribute 6 Drive Points
                </h3>
                <span className={`text-xs font-sans font-black uppercase tracking-widest ${drivesPtsUsed===6?'text-seal-green':'text-sepia'}`}>
                  {drivesPtsUsed}/6 placed
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {key:'nerve',     label:'Nerve',     color:'#7a4822'},
                  {key:'cunning',   label:'Cunning',   color:'#2a4d25'},
                  {key:'intuition', label:'Intuition', color:'#4a2870'},
                ].map(({key,label,color}) => {
                  const startVal = lockedDrives[key] || 0;
                  const addVal   = driveDistrib[key] || 0;
                  const total    = startVal + addVal;
                  return (
                    <div key={key} className="flex flex-col items-center gap-2 p-3 rounded-sm"
                      style={{ background:`rgba(${color==='#7a4822'?'122,72,34':color==='#2a4d25'?'42,77,37':'74,40,112'},0.08)`, border:`1px solid ${color}22` }}>
                      <span className="text-sm font-black uppercase tracking-wider" style={{ color }}>{label}</span>
                      <span className="text-base font-serif italic text-center leading-snug" style={{ color }}>{DRIVE_FLAVOR[key]}</span>
                      <span className="text-xl font-black" style={{ color }}>{total}</span>
                      <div className="flex gap-1" role="img" aria-label={`${label}: ${total} drive points, ${startVal} from your specialty`}>
                        {Array.from({length:7}).map((_,i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-sm border transition-all"
                            style={{
                              background: i<startVal ? color : i<total ? color+'99' : 'transparent',
                              borderColor: i<total ? color : 'rgb(var(--c-sepia))',
                              opacity: i<startVal ? 0.5 : 1,
                            }} />
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <button type="button" onClick={() => adjustDrive(key,-1)} disabled={addVal<=0} aria-label={`Take a point off ${label}`}
                          className="w-7 h-7 [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:h-9 flex items-center justify-center font-black text-base rounded hover:opacity-80 disabled:opacity-20 border"
                          style={{ color, borderColor:`${color}50` }}>−</button>
                        <span className="text-sm font-sans font-black w-8 text-center" style={{ color }}>+{addVal}</span>
                        <button type="button" onClick={() => adjustDrive(key,1)} disabled={drivesPtsUsed>=6} aria-label={`Put a point on ${label}`}
                          className="w-7 h-7 [@media(pointer:coarse)]:w-9 [@media(pointer:coarse)]:h-9 flex items-center justify-center font-black text-base rounded hover:opacity-80 disabled:opacity-20 border"
                          style={{ color, borderColor:`${color}50` }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validation status */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-sans font-black uppercase tracking-widest">
              {[
                {label:'Free Raise', done: !!freeRaiseKey},
                {label:'3 Action Pts', done: freePtsUsed===3},
                {label:'6 Drive Pts', done: drivesPtsUsed===6},
                {label:'Free Gild', done: !!freeGilded},
              ].map(({label,done}) => (
                <span key={label} style={{ color: done ? 'rgb(var(--c-seal-green))' : 'rgb(var(--c-sepia))' }}>
                  {done ? '✓' : '○'} {label}
                </span>
              ))}
            </div>

            <p className="text-base font-serif italic text-sepia text-center">
              ★ Your specialty gilds one action. Click ☆ beside any other action to gild it too. When you roll a gilded action, one die is gold; if you keep its result, you refresh 1 drive.
            </p>
          </div>
        </PaperSheet>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 4 — GEAR & DOSSIER
          ══════════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <PaperSheet>
          <div className="animate-fadeIn space-y-7">
            <div className="text-center pb-5" style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.22)' }}>
              <h2 className="font-display text-3xl sm:text-4xl uppercase tracking-[0.06em] text-oxblood">Specialty Gear &amp; Final Dossier</h2>
              <p className="text-base sm:text-lg font-serif italic text-sepia mt-1">
                Pick up to 3 items, then check your investigator below and save.
              </p>
              <p className="text-base font-serif italic text-oxblood mt-2">
                You can change gear later from your investigator's sheet.
              </p>
            </div>

            {/* Gear ledger */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-sans font-black uppercase tracking-[0.14em] text-oxblood flex items-center gap-2">
                  <Gi.GiBriefcase size={16} /> Equipment Ledger
                </h3>
                <span className="text-sm font-sans font-black text-sepia">{selectedGear.length} / 3 selected</span>
              </div>

              {/* Specialty gear */}
              <div className="mb-4">
                <p className="text-sm font-sans font-black uppercase tracking-[0.12em] text-oxblood mb-2">{specialty} gear</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ROLES[role]?.specialties[specialty]?.gear.map(item => (
                    <button type="button" key={item} onClick={() => toggleGear(item)} aria-pressed={selectedGear.includes(item)}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-sm cursor-pointer transition-all select-none ${selectedGear.includes(item) ? 'shadow-sm' : 'hover:bg-parchment-deep/40'}`}
                      style={{
                        background: selectedGear.includes(item) ? 'rgb(var(--c-oxblood)/0.1)' : 'rgb(var(--c-parchment-deep)/0.2)',
                        border: `1px solid ${selectedGear.includes(item) ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-sepia)/0.22)'}`,
                      }}>
                      <div className={`w-4 h-4 border flex items-center justify-center rounded-sm text-xs shrink-0 ${selectedGear.includes(item) ? 'bg-oxblood border-oxblood text-cream' : 'border-sepia/50'}`}>
                        {selectedGear.includes(item) && "✓"}
                      </div>
                      <SafeIcon name={GEAR_ICONS[item]} size={18} style={{ color: selectedGear.includes(item) ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-sepia))', opacity: selectedGear.includes(item) ? 1 : 0.55, flexShrink: 0 }} />
                      <span className={`text-base font-serif ${selectedGear.includes(item) ? 'font-bold text-ink' : 'text-ink/80'}`}>{item}</span>
                      <span className="ml-auto text-xs font-sans font-black uppercase text-oxblood/80 shrink-0">[Sig]</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard gear */}
              <div>
                <p className="text-sm font-sans font-black uppercase tracking-[0.12em] text-sepia mb-2">Standard Issue Equipment</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {STANDARD_GEAR.map(item => (
                    <button type="button" key={item} onClick={() => toggleGear(item)} aria-pressed={selectedGear.includes(item)}
                      className={`w-full text-left flex items-center gap-3 p-3 rounded-sm cursor-pointer transition-all select-none ${selectedGear.includes(item) ? '' : 'hover:bg-parchment-deep/30'}`}
                      style={{
                        background: selectedGear.includes(item) ? 'rgb(var(--c-oxblood)/0.08)' : 'rgb(var(--c-parchment-deep)/0.1)',
                        border: `1px solid ${selectedGear.includes(item) ? 'rgb(var(--c-oxblood) / 0.5)' : 'rgb(var(--c-sepia)/0.15)'}`,
                      }}>
                      <div className={`w-4 h-4 border flex items-center justify-center rounded-sm text-xs shrink-0 ${selectedGear.includes(item) ? 'bg-oxblood border-oxblood text-cream' : 'border-sepia/50'}`}>
                        {selectedGear.includes(item) && "✓"}
                      </div>
                      <SafeIcon name={GEAR_ICONS[item]} size={18} style={{ color: selectedGear.includes(item) ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-sepia))', opacity: selectedGear.includes(item) ? 0.9 : 0.45, flexShrink: 0 }} />
                      <span className={`text-base font-serif ${selectedGear.includes(item) ? 'font-bold text-ink' : 'text-ink/80'}`}>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dossier summary */}
            <div style={{ borderTop: '2px dashed rgb(var(--c-sepia)/0.2)' }} className="pt-5 space-y-4">
              <h3 className="text-lg font-serif font-bold text-oxblood">Your investigator</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Investigator", value: name },
                  { label: "Pronouns",     value: pronouns || '—' },
                  { label: "Role · Specialty", value: `${role} · ${specialty}` },
                  { label: "Gear Selected", value: `${selectedGear.length} of 3 items` },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-sm" style={{ background: 'rgb(var(--c-parchment-deep)/0.28)', border: '1px solid rgb(var(--c-sepia)/0.15)' }}>
                    <span className="block text-xs sm:text-sm font-sans font-black uppercase tracking-[0.12em] text-oxblood mb-0.5">{label}</span>
                    <span className="text-lg font-bold text-ink block break-words sm:truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-sm" style={{ background: 'rgb(var(--c-parchment-deep)/0.18)', border: '1px dashed rgb(var(--c-sepia)/0.22)' }}>
                <span className="block text-xs sm:text-sm font-sans font-black uppercase tracking-[0.12em] text-oxblood mb-1">Catalyst</span>
                <p className="text-base italic text-ink/80 leading-relaxed">"{catalyst}"</p>
              </div>
            </div>

            <div className="text-center pt-1 text-base font-serif italic text-sepia">
              Check the details above. You can go back to any step before you save.
            </div>
          </div>
        </PaperSheet>
      )}

      {/* ── BOTTOM NAV BUTTONS ── */}
      {step > 1 && (
        <div className="flex flex-wrap justify-between items-center gap-3 mt-5">
          <button onClick={() => setStep(step - 1)}
            className="px-5 py-2 text-base border border-cream/25 font-sans font-black uppercase tracking-widest text-cream/75 hover:bg-cream/5 hover:text-cream transition-all rounded">
            ← Back
          </button>
          {step < 4 ? (
            <button
              onClick={() => canAdvance && setStep(step + 1)}
              disabled={!canAdvance}
              className="px-7 py-2 text-base font-sans font-black uppercase tracking-widest rounded transition-all shadow"
              style={{
                background: canAdvance ? 'rgb(var(--c-oxblood))' : 'rgb(var(--c-ink)/0.6)',
                color: canAdvance ? 'rgb(var(--c-cream))' : 'rgb(var(--c-cream)/0.45)',
                cursor: canAdvance ? 'pointer' : 'not-allowed',
              }}>
              Advance →
            </button>
          ) : rejoinContext ? (
            <div className="w-full bg-night border-2 border-oxblood p-5 shadow-[0_10px_30px_rgba(0,0,0,0.7)]">
                            <p className="text-parchment-deep font-serif text-base mb-4">
                Your GM invited you back to <strong className="text-cream">{rejoinContext.campaignName}</strong>. Rejoin it with this investigator?
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleComplete('rejoin')}
                  disabled={!!savingMode}
                  className="px-6 py-2.5 text-sm font-sans font-black uppercase tracking-widest border border-ink rounded hover:brightness-125 transition disabled:opacity-60 disabled:cursor-wait"
                  style={{ background: 'rgb(var(--c-oxblood))', color: 'rgb(var(--c-cream))' }}>
                  {savingMode === 'rejoin' ? 'Saving…' : savedCharacterId ? `Rejoin ${rejoinContext.campaignName}` : `Save and rejoin ${rejoinContext.campaignName}`}
                </button>
                <button
                  onClick={() => handleComplete('save')}
                  disabled={!!savingMode}
                  className="px-6 py-2.5 text-sm border border-cream/25 text-cream/75 hover:text-cream hover:bg-cream/5 rounded font-sans font-black uppercase tracking-widest transition-colors disabled:opacity-60 disabled:cursor-wait"
                  style={{ background: 'transparent' }}>
                  {savingMode === 'save' ? 'Saving…' : savedCharacterId ? 'Go to the chapter hub' : 'Save for later'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleComplete('save')}
                disabled={!!savingMode}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-sm leading-tight border border-sepia font-sans font-black uppercase tracking-widest rounded transition-all disabled:opacity-60 disabled:cursor-wait"
                style={{ background: 'rgb(var(--c-parchment)/0.6)', color: 'rgb(var(--c-sepia))' }}>
                {savingMode === 'save' ? 'Saving…' : savedCharacterId ? 'Go to the chapter hub' : 'Save for Later'}
              </button>
              <button
                onClick={() => { setSaveError(''); setShowJoinInput(true); }}
                disabled={!!savingMode}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 text-sm leading-tight border-2 border-ink font-sans font-black uppercase tracking-widest rounded shadow-md transition-all disabled:opacity-60 disabled:cursor-wait"
                style={{ background: 'rgb(var(--c-oxblood))', color: 'rgb(var(--c-cream))' }}>
                {savedCharacterId ? 'Join a campaign' : 'Save and join a campaign'}
              </button>
            </div>
          )}

          {/* A failed save: the reason, what is kept, and a retry */}
          {step === 4 && saveError && !showJoinInput && (
            <div role="alert" className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-parchment text-ink border-2 border-oxblood rounded-sm px-4 py-3 shadow-md">
              <p className="font-serif text-base leading-snug min-w-0 flex-1 basis-60">
                {savedNote && <strong className="font-bold">{savedNote}</strong>}{saveError}
              </p>
              {lastAttempt?.mode !== 'join' && (
                <button
                  onClick={retrySave}
                  disabled={!!savingMode}
                  className="shrink-0 min-h-[40px] px-4 font-sans text-xs font-black uppercase tracking-widest text-cream bg-oxblood border border-ink rounded hover:brightness-125 transition disabled:opacity-60"
                >
                  {savingMode ? 'Saving…' : 'Try again'}
                </button>
              )}
            </div>
          )}

          {/* JOIN CAMPAIGN MODAL */}
          {showJoinInput && (
            <div
              className="fixed inset-0 z-[500] flex items-center justify-center p-4"
              style={{ background: 'rgb(var(--c-night) / 0.85)' }}
              onClick={() => { if (!savingMode) setShowJoinInput(false); }}
            >
              <div
                ref={joinDialogRef}
                role="dialog" aria-modal="true" aria-labelledby="join-campaign-title"
                className="relative flex flex-col gap-5 rounded-sm w-full max-w-[480px] max-h-[calc(100dvh-32px)] overflow-y-auto px-5 pt-6 pb-5 sm:px-10 sm:pt-9 sm:pb-8"
                style={{
                  background: 'rgb(var(--c-cream))',
                  border: '3px double rgba(0,0,0,0.3)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ borderBottom: '1px solid rgb(var(--c-sepia)/0.2)', paddingBottom: 16 }}>
                  <h2 id="join-campaign-title" className="font-display text-4xl text-ink">Join a Campaign</h2>
                  <p className="text-base font-serif text-ink/80 mt-1.5 leading-relaxed">
                    {savedCharacterId
                      ? `${name || 'Your investigator'} is saved. Check the code and ask again, or join later from the chapter hub.`
                      : `${name || 'Your investigator'} is saved first, then asks to join. You can also join later from the chapter hub.`}
                  </p>
                </div>

                <JoinCampaignForm
                  idPrefix="creator-join"
                  autoFocus
                  code={campaignCode}
                  onCodeChange={setCampaignCode}
                  pen={selectedPen}
                  onPenChange={setSelectedPen}
                  onSubmit={(code) => handleComplete('join', code)}
                  onCancel={() => { if (!savingMode) setShowJoinInput(false); }}
                  error={saveError ? `${savedNote}${saveError}` : ''}
                  busy={savingMode === 'join'}
                  busyLabel="Saving…"
                  submitLabel={savedCharacterId ? 'Ask to join' : 'Save and ask to join'}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
