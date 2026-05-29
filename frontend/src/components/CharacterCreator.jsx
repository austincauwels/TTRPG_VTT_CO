import React, { useState } from 'react';
import * as Gi from "react-icons/gi";

const PEN_FONTS = [
  'Reenie Beenie', 'Caveat', 'Shadows Into Light', 'Zeyada', 'Sacramento',
  'Homemade Apple', 'Alex Brush', 'Cedarville Cursive', 'La Belle Aurore',
  'Charm', 'Dawning of a New Day', 'Gaegu', 'Grape Nuts', 'Moondance',
  'Long Cang', 'Indie Flower', 'Kalam', 'Patrick Hand', 'Rock Salt', 'Gochi Hand'
];

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
const CARD_W = 275;
const CARD_H = 430;

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
        <p style={{ textAlign: 'center', fontSize: 17, fontFamily: 'serif', fontWeight: 700,
          color: '#f8f0e4', textShadow: '0 1px 6px rgba(0,0,0,0.9)', lineHeight: 1.2 }}>
          {specialtyName}
        </p>
      </div>

      {/* Bottom: role label */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 55%, transparent 100%)',
        padding: '10px 8px 10px' }}>
        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${color.primary}, transparent)`, marginBottom: 5 }} />
        <p style={{ textAlign: 'center', fontSize: 11, fontFamily: 'sans-serif', fontWeight: 900,
          letterSpacing: '0.22em', textTransform: 'uppercase', color: color.primary }}>
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

// ── Main component ─────────────────────────────────────────────────────────────
export const CharacterCreator = ({ onSubmit, rejoinContext }) => {
  const [step, setStep] = useState(1);

  // Card deck state
  const [currentIndex, setCurrentIndex] = useState(0);
  // 'idle' | 'out-forward' | 'in-forward' | 'out-backward' | 'in-backward'
  const [animState, setAnimState] = useState('idle');

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

  // Actions & drives — step 3 state
  const [lockedActions, setLockedActions] = useState({ ...EMPTY_ACTIONS });
  const [freeRaiseKey,  setFreeRaiseKey]  = useState(null);
  const [freeAdditions, setFreeAdditions] = useState({ ...EMPTY_ACTIONS });
  const [lockedDrives,  setLockedDrives]  = useState({ ...EMPTY_DRIVES });
  const [driveDistrib,  setDriveDistrib]  = useState({ ...EMPTY_DRIVES });
  const [lockedGilded, setLockedGilded] = useState('');
  const [freeGilded,   setFreeGilded]   = useState('');
  const [selectedGear, setSelectedGear] = useState([]);

  // Finalize routing
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [campaignCode,  setCampaignCode]  = useState("");
  const [penDropdownOpen, setPenDropdownOpen] = useState(false);
  const [selectedPen,   setSelectedPen]   = useState('Caveat');

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

  const handleComplete = (mode, code) => {
    const computedActions = Object.fromEntries(
      Object.keys(EMPTY_ACTIONS).map(k => [k, getActionTotal(k)])
    );
    if (onSubmit) onSubmit({
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
    });
  };

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

  return (
    <div className="w-full px-10 py-6 font-serif text-[#1a1311]">

      {/* ── PROGRESS NAV ── */}
      <div className="flex border border-[#3e2f29] bg-[#1a1311] text-base font-sans font-black tracking-widest text-center select-none rounded mb-8 shadow-md overflow-hidden">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const unlocked = STEP_UNLOCKED[i];
          const active = step === n;
          return (
            <div key={n} onClick={() => unlocked && setStep(n)}
              className={`flex-1 py-4 border-r border-[#3e2f29] last:border-r-0 transition-colors ${
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
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat&family=Cedarville+Cursive&family=Charm&family=Dawning+of+a+New+Day&family=Gaegu&family=Gochi+Hand&family=Grape+Nuts&family=Homemade+Apple&family=Indie+Flower&family=Kalam&family=La+Belle+Aurore&family=Long+Cang&family=Moondance&family=Patrick+Hand&family=Reenie+Beenie&family=Rock+Salt&family=Sacramento&family=Shadows+Into+Light&family=Zeyada&display=swap');
            @keyframes cardFlipOutForward  { from { transform: rotateY(0deg);    } to { transform: rotateY(-90deg); } }
            @keyframes cardFlipInForward   { from { transform: rotateY(90deg);   } to { transform: rotateY(0deg);   } }
            @keyframes cardFlipOutBackward { from { transform: rotateY(0deg);    } to { transform: rotateY(90deg);  } }
            @keyframes cardFlipInBackward  { from { transform: rotateY(-90deg);  } to { transform: rotateY(0deg);   } }
          `}</style>

          <div className="text-center mb-6">
            <h2 className="text-4xl font-black uppercase tracking-widest text-[#fdfaf4]"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>Choose Your Path</h2>
            <p className="text-base font-sans tracking-[0.2em] text-[#fdfaf4]/35 uppercase mt-2">
              Flip through the deck — choose one specialty ability and one role ability to continue
            </p>
          </div>

          <div className="flex gap-10 items-start">

            {/* ── LEFT: stacked card deck ── */}
            <div className="shrink-0 flex flex-col items-center gap-5" style={{ width: 340 }}>

              {/* Card stack */}
              <div style={{ position: 'relative', width: CARD_W + 30, height: CARD_H + 25 }}>

                {/* Depth shadow cards beneath */}
                {[4, 3, 2, 1].map(n => (
                  <div key={n} style={{
                    position: 'absolute', bottom: 0, left: '50%',
                    width: CARD_W, height: CARD_H,
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
                  width: CARD_W, height: CARD_H,
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
                <button onClick={() => flip('backward')} disabled={currentIndex === 0 || animState !== 'idle'}
                  className="w-11 h-11 flex items-center justify-center rounded-full font-black text-2xl transition-all disabled:opacity-20 hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#fdfaf4' }}>
                  ‹
                </button>
                <span className="text-sm font-sans font-black tracking-widest text-[#fdfaf4]/40 uppercase min-w-[56px] text-center">
                  {currentIndex + 1} / {allCards.length}
                </span>
                <button onClick={() => flip('forward')} disabled={currentIndex >= allCards.length - 1 || animState !== 'idle'}
                  className="w-11 h-11 flex items-center justify-center rounded-full font-black text-2xl transition-all disabled:opacity-20 hover:bg-white/10"
                  style={{ border: '1px solid rgba(255,255,255,0.2)', color: '#fdfaf4' }}>
                  ›
                </button>
              </div>

              {/* Role description blurb */}
              <p className="text-base font-sans italic text-[#fdfaf4]/40 text-center leading-relaxed px-3 max-w-[280px]">
                {currentRoleData.description}
              </p>
            </div>

            {/* ── RIGHT: always-visible panel ── */}
            <div className="flex-1 flex flex-col rounded overflow-hidden"
              style={{ border: `1px solid ${currentColor.primary}33`, background: '#0a0705',
                boxShadow: `0 4px 20px rgba(0,0,0,0.6), inset 0 0 0 1px ${currentColor.secondary}44`,
                minHeight: CARD_H + 25 }}>

              {/* Header */}
              <div className="px-6 pt-5 pb-4 shrink-0"
                style={{ borderBottom: `1px solid ${currentColor.primary}25`, background: `linear-gradient(to bottom, rgba(${currentColor.rgb},0.1), transparent)` }}>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `rgba(${currentColor.rgb},0.15)`, border: `2px solid ${currentColor.primary}` }}>
                    <SafeIcon name={currentSpecData.icon} size={46} style={{ color: currentColor.primary }} />
                  </div>
                  <div>
                    <p className="text-sm font-sans font-black tracking-[0.22em] uppercase" style={{ color: currentColor.primary }}>
                      {currentCard.roleName}
                    </p>
                    <h3 className="text-3xl font-black text-[#fdfaf4] leading-tight">{currentCard.specialtyName}</h3>
                    <p className="text-base italic text-[#fdfaf4]/55 mt-0.5">{currentSpecData.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(ILLUMINATION_KEYS[currentCard.specialtyName] || []).map(k => (
                        <span key={k} className="px-2 py-0.5 rounded-sm text-xs font-sans font-black uppercase tracking-wide"
                          style={{ background: `rgba(${currentColor.rgb},0.22)`, border: `1px solid ${currentColor.primary}55`, color: currentColor.primary }}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-side abilities */}
              <div className="grid grid-cols-2 flex-1 overflow-y-auto custom-scrollbar">

                {/* Left col — specialty abilities */}
                <div className="px-5 py-4 space-y-2"
                  style={{ borderRight: `1px solid ${currentColor.primary}18` }}>
                  <p className="text-base font-sans font-black tracking-[0.2em] uppercase mb-3" style={{ color: currentColor.primary }}>
                    Specialty Ability — Choose One
                  </p>
                  {Object.entries(currentSpecData.abilities).map(([aN, aD]) => {
                    const picked = selectedSpecialtyAbility === aN;
                    return (
                      <div key={aN} onClick={() => setSelectedSpecialtyAbility(aN)}
                        className="flex items-start gap-2.5 p-3 rounded cursor-pointer transition-all"
                        style={{
                          background: picked ? `rgba(${currentColor.rgb},0.22)` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${picked ? currentColor.primary : `rgba(${currentColor.rgb},0.18)`}`,
                          boxShadow: picked ? `0 0 8px rgba(${currentColor.rgb},0.25)` : 'none',
                        }}>
                        <div className="shrink-0 mt-0.5 w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: picked ? currentColor.primary : `rgba(${currentColor.rgb},0.15)`, border: `1px solid ${currentColor.primary}55` }}>
                          <SafeIcon name={aD.icon} size={22} style={{ color: picked ? '#0f0805' : currentColor.primary }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-[#fdfaf4] leading-tight">{aN}</p>
                          <p className="text-base text-[#fdfaf4]/65 leading-snug mt-0.5">{aD.text}</p>
                        </div>
                        {picked && <Gi.GiCheckMark size={12} className="ml-auto shrink-0 mt-1" style={{ color: currentColor.primary }} />}
                      </div>
                    );
                  })}
                </div>

                {/* Right col — role abilities + specialty gear */}
                <div className="px-5 py-4 space-y-2 flex flex-col">
                  <p className="text-base font-sans font-black tracking-[0.2em] uppercase mb-3" style={{ color: currentColor.primary }}>
                    {currentCard.roleName} Role Ability — Choose One
                  </p>
                  {Object.entries(currentRoleData.baseAbilities).map(([aN, aD]) => {
                    const picked = selectedRoleAbility === aN;
                    return (
                      <div key={aN} onClick={() => setSelectedRoleAbility(aN)}
                        className="flex items-start gap-2.5 p-3 rounded cursor-pointer transition-all"
                        style={{
                          background: picked ? `rgba(${currentColor.rgb},0.22)` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${picked ? currentColor.primary : `rgba(${currentColor.rgb},0.18)`}`,
                          boxShadow: picked ? `0 0 8px rgba(${currentColor.rgb},0.25)` : 'none',
                        }}>
                        <div className="shrink-0 mt-0.5 w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: picked ? currentColor.primary : `rgba(${currentColor.rgb},0.15)`, border: `1px solid ${currentColor.primary}55` }}>
                          <SafeIcon name={aD.icon} size={22} style={{ color: picked ? '#0f0805' : currentColor.primary }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-[#fdfaf4] leading-tight">{aN}</p>
                          <p className="text-base text-[#fdfaf4]/65 leading-snug mt-0.5">{aD.text}</p>
                        </div>
                        {picked && <Gi.GiCheckMark size={12} className="ml-auto shrink-0 mt-1" style={{ color: currentColor.primary }} />}
                      </div>
                    );
                  })}

                  {/* Specialty Gear — under role abilities */}
                  <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${currentColor.primary}20` }}>
                    <p className="text-sm font-sans font-black tracking-[0.18em] uppercase mb-2" style={{ color: currentColor.primary }}>
                      Specialty Gear
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {currentSpecData.gear.map(g => (
                        <span key={g} className="text-sm font-serif italic text-[#fdfaf4]/70 px-2.5 py-1 rounded"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer — CTA only */}
              <div className="px-6 py-4 shrink-0"
                style={{ borderTop: `1px solid ${currentColor.primary}20` }}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base italic text-[#fdfaf4]/35">
                    {(!selectedSpecialtyAbility || !selectedRoleAbility) ? 'Select one ability from each column to continue' : 'Ready to proceed'}
                  </p>
                  <button onClick={chooseSpecialty} disabled={!selectedRoleAbility || !selectedSpecialtyAbility}
                    className="px-6 py-2.5 text-base font-sans font-black uppercase tracking-wider rounded transition-all shrink-0"
                    style={{
                      background: (selectedRoleAbility && selectedSpecialtyAbility) ? currentColor.primary : 'rgba(255,255,255,0.06)',
                      color: (selectedRoleAbility && selectedSpecialtyAbility) ? '#0a0705' : 'rgba(255,255,255,0.2)',
                      boxShadow: (selectedRoleAbility && selectedSpecialtyAbility) ? `0 2px 12px rgba(${currentColor.rgb},0.45)` : 'none',
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
            <div className="text-center pb-4" style={{ borderBottom: '1px solid rgba(62,42,26,0.22)' }}>
              <h2 className="text-3xl font-black uppercase tracking-wide text-[#721c15]">Investigator Profile</h2>
              <p className="text-base font-sans font-black uppercase tracking-[0.18em] text-black/40 mt-1">
                {specialty} · {role} — Complete identity and examination record
              </p>
            </div>

            {/* ── Two-column layout: Demographics (left) | Psychological Evaluation (right) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

              {/* LEFT: Portrait + Name/Pronouns/Characteristics */}
              <div className="space-y-4">
                {/* Portrait + Name row */}
                <div className="flex gap-4 items-start">
                  <div className="shrink-0">
                    <label className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1.5">Portrait</label>
                    <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-[#e4cfa0]/55 hover:border-[#721c15]/50 transition-all relative overflow-hidden shadow-inner group rounded"
                      style={{ width: 160, height: 200, border: '2px dashed rgba(90,58,40,0.4)', background: 'rgba(228,207,160,0.3)' }}>
                      {profilePic
                        ? <img src={profilePic} alt="Portrait" className="w-full h-full object-cover" />
                        : <div className="text-center px-3">
                            <Gi.GiIdCard size={36} className="mx-auto text-[#1a1311]/22 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="block text-xs font-sans font-black tracking-wider text-[#1a1311]/35 uppercase leading-tight">[+] Affix Portrait</span>
                          </div>
                      }
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>

                  <div className="flex-1 space-y-3 pt-5">
                    <div>
                      <label className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1">Full Name *</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder="Full Nomenclature Name…"
                        className="w-full bg-transparent font-serif font-bold text-lg focus:outline-none placeholder-black/20 pb-1"
                        style={{ borderBottom: '1px solid rgba(90,58,40,0.38)' }} />
                    </div>
                    <div>
                      <label className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1">Gender / Pronouns</label>
                      <input type="text" value={pronouns} onChange={e => setPronouns(e.target.value)}
                        placeholder="e.g., He/They, She/Her…"
                        className="w-full bg-transparent font-serif italic text-lg focus:outline-none placeholder-black/20 pb-1"
                        style={{ borderBottom: '1px solid rgba(90,58,40,0.38)' }} />
                    </div>
                  </div>
                </div>

                {/* Identifying Characteristics */}
                <div>
                  <label className="block text-sm font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1">Identifying Characteristics</label>
                  <textarea rows={3} value={style} onChange={e => setStyle(e.target.value)}
                    placeholder="Detail apparel, distinguishing marks, tailored suits, or signature items that set this investigator apart…"
                    className="w-full bg-transparent font-serif text-base focus:outline-none resize-none placeholder-black/20 leading-7 paper-ruled"
                    style={{ borderBottom: '1px solid rgba(90,58,40,0.25)' }} />
                </div>
              </div>

              {/* RIGHT: Psychological Evaluation */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1" style={{ borderTop: '1px dashed rgba(62,42,26,0.25)' }} />
                  <span className="text-sm font-sans font-black uppercase tracking-[0.18em] text-[#721c15]/60 shrink-0">Psychological Evaluation</span>
                  <div className="flex-1" style={{ borderTop: '1px dashed rgba(62,42,26,0.25)' }} />
                </div>

                <div className="bg-[#e4cfa0]/30 p-4 rounded-sm shadow-inner" style={{ border: '1px solid rgba(90,58,40,0.18)' }}>
                  <label className="block text-base font-sans font-black uppercase tracking-[0.15em] text-[#721c15] mb-2 pb-1.5"
                    style={{ borderBottom: '1px solid rgba(90,58,40,0.15)' }}>
                    Catalyst — Why do you seek Candela Obscura? *
                  </label>
                  <textarea rows={4} value={catalyst} onChange={e => setCatalyst(e.target.value)}
                    placeholder="The specific event or rupture that drew you into the dark…"
                    className="w-full bg-transparent font-serif text-base focus:outline-none resize-none placeholder-black/22 leading-7 paper-ruled" />
                </div>

                <div className="bg-[#e4cfa0]/30 p-4 rounded-sm shadow-inner" style={{ border: '1px solid rgba(90,58,40,0.18)' }}>
                  <label className="block text-base font-sans font-black uppercase tracking-[0.15em] text-[#721c15] mb-2 pb-1.5"
                    style={{ borderBottom: '1px solid rgba(90,58,40,0.15)' }}>
                    Curiosity — What answers are you demanding?
                  </label>
                  <textarea rows={4} value={question} onChange={e => setQuestion(e.target.value)}
                    placeholder="The central question or haunting mystery your investigator pursues…"
                    className="w-full bg-transparent font-serif text-base focus:outline-none resize-none placeholder-black/22 leading-7 paper-ruled" />
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
            <div className="text-center pb-5" style={{ borderBottom: '1px solid rgba(62,42,26,0.22)' }}>
              <h2 className="text-3xl font-black uppercase tracking-wide text-[#721c15]">Action Ratings &amp; Drive</h2>
              <p className="text-base font-sans font-black uppercase tracking-[0.18em] text-black/40 mt-1">
                {specialty} starting values locked — raise one, add 3 free action points, assign 6 drive points
              </p>
            </div>

            {/* ── Step A: Free Raise ── */}
            <div className="rounded-sm p-4" style={{ background:'rgba(228,207,160,0.2)', border:'1px solid rgba(90,58,40,0.18)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-sans font-black uppercase tracking-[0.15em] text-[#721c15]">
                  A — Raise One Starting-Zero Action to 1
                </h3>
                {freeRaiseKey
                  ? <span className="text-xs font-sans font-black uppercase tracking-widest text-[#2a7a2a]">✓ {actionKeyLabel[freeRaiseKey]}</span>
                  : <span className="text-xs font-sans font-black uppercase tracking-widest text-[#721c15]/50">choose one</span>
                }
              </div>
              <div className="flex flex-wrap gap-2">
                {zeroStartKeys.map(k => {
                  const sel = freeRaiseKey === k;
                  return (
                    <button key={k} onClick={() => setFreeRaiseKey(sel ? null : k)}
                      className="px-3 py-1.5 text-sm font-sans font-black uppercase tracking-wider rounded-sm transition-all"
                      style={{
                        background: sel ? '#721c15' : 'rgba(228,207,160,0.5)',
                        color: sel ? '#fdfaf4' : '#5a3a28',
                        border: `1px solid ${sel ? '#721c15' : 'rgba(90,58,40,0.3)'}`,
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
                <h3 className="text-base font-sans font-black uppercase tracking-[0.15em] text-[#721c15]">
                  B — Distribute 3 Free Action Points (max 2 per action)
                </h3>
                <span className={`text-xs font-sans font-black uppercase tracking-widest ${freePtsUsed===3?'text-[#2a7a2a]':'text-[#721c15]/50'}`}>
                  {freePtsUsed}/3 placed
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                <span className="shrink-0 w-5 h-5 flex items-center justify-center" title="Specialty gilded action (locked)">
                                  <Gi.GiStarFormation size={13} style={{ color: '#d4af37' }} />
                                </span>
                              ) : (
                                <button onClick={() => toggleFreeGilded(key)}
                                  title={isFreeGilded ? 'Remove free gild' : freeGilded ? 'Replace free gild' : 'Gild this action (free choice)'}
                                  className="shrink-0 w-5 h-5 flex items-center justify-center focus:outline-none transition-opacity hover:opacity-100"
                                  style={{ opacity: isFreeGilded ? 1 : 0.2 }}>
                                  <Gi.GiStarFormation size={13} style={{ color: isFreeGilded ? '#d4af37' : '#5a3a28' }} />
                                </button>
                              )}
                              <span className="text-sm font-serif font-bold text-[#1a1311] w-16 shrink-0 group/act relative cursor-help">
                                {label}
                                <span className="hidden group-hover/act:block absolute left-0 top-full mt-1 z-10 w-64 text-[20px] font-sans font-normal italic text-[#5a3a28]/70 bg-[#fdfaf4] border border-[#c4a870]/50 rounded px-2 py-1 shadow pointer-events-none leading-snug">
                                  {ACTION_FLAVOR[key]}
                                </span>
                              </span>
                              <div className="flex gap-1 flex-1">
                                {[1,2,3].map(n => {
                                  let cls = '';
                                  if (n <= locked) cls = 'action-pip filled opacity-50';
                                  else if (n === locked+1 && raised===1) cls = isGilded&&n===total ? 'action-pip gilded' : 'action-pip filled';
                                  else if (n <= total) cls = isGilded&&n===total ? 'action-pip gilded' : 'action-pip filled';
                                  else cls = 'action-pip';
                                  return <div key={n} className={cls} style={n<=locked?{outline:'2px solid rgba(90,58,40,0.5)', outlineOffset:'-1px'}:{}} />;
                                })}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => adjustFreePoints(key,-1)} disabled={free<=0}
                                  className="w-7 h-7 flex items-center justify-center font-black text-base rounded hover:opacity-80 disabled:opacity-20 focus:outline-none border"
                                  style={{ color:'#721c15', borderColor:'#721c1550' }}>−</button>
                                <button onClick={() => adjustFreePoints(key,1)} disabled={total>=2||freePtsUsed>=3}
                                  className="w-7 h-7 flex items-center justify-center font-black text-base rounded hover:opacity-80 disabled:opacity-20 focus:outline-none border"
                                  style={{ color:'#721c15', borderColor:'#721c1550' }}>+</button>
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
            <div className="rounded-sm p-4" style={{ background:'rgba(228,207,160,0.15)', border:'1px solid rgba(90,58,40,0.18)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-sans font-black uppercase tracking-[0.15em] text-[#721c15]">
                  C — Distribute 6 Drive Points
                </h3>
                <span className={`text-xs font-sans font-black uppercase tracking-widest ${drivesPtsUsed===6?'text-[#2a7a2a]':'text-[#721c15]/50'}`}>
                  {drivesPtsUsed}/6 placed
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
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
                      <span className="text-[18px] font-sans italic text-center leading-snug" style={{ color, opacity: 0.6 }}>{DRIVE_FLAVOR[key]}</span>
                      <span className="text-xl font-black" style={{ color }}>{total}</span>
                      <div className="flex gap-1">
                        {Array.from({length:7}).map((_,i) => (
                          <div key={i} className="w-2.5 h-2.5 rounded-sm border transition-all"
                            style={{
                              background: i<startVal ? color : i<total ? color+'99' : 'transparent',
                              borderColor: i<total ? color : '#b0a090',
                              opacity: i<startVal ? 0.5 : 1,
                            }} />
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <button onClick={() => adjustDrive(key,-1)} disabled={addVal<=0}
                          className="w-7 h-7 flex items-center justify-center font-black text-base rounded hover:opacity-80 disabled:opacity-20 focus:outline-none border"
                          style={{ color, borderColor:`${color}50` }}>−</button>
                        <span className="text-sm font-sans font-black w-8 text-center" style={{ color }}>+{addVal}</span>
                        <button onClick={() => adjustDrive(key,1)} disabled={drivesPtsUsed>=6}
                          className="w-7 h-7 flex items-center justify-center font-black text-base rounded hover:opacity-80 disabled:opacity-20 focus:outline-none border"
                          style={{ color, borderColor:`${color}50` }}>+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validation status */}
            <div className="flex justify-center gap-6 text-xs font-sans font-black uppercase tracking-widest">
              {[
                {label:'Free Raise', done: !!freeRaiseKey},
                {label:'3 Action Pts', done: freePtsUsed===3},
                {label:'6 Drive Pts', done: drivesPtsUsed===6},
                {label:'Free Gild', done: !!freeGilded},
              ].map(({label,done}) => (
                <span key={label} style={{ color: done ? '#2a7a2a' : 'rgba(90,58,40,0.4)' }}>
                  {done ? '✓' : '○'} {label}
                </span>
              ))}
            </div>

            <p className="text-base font-sans italic text-[#5a3a28]/55 text-center">
              ★ Your specialty auto-gilds one action. Click ☆ beside any other action to add your free gild — gilded actions roll an extra die on their first result.
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
            <div className="text-center pb-5" style={{ borderBottom: '1px solid rgba(62,42,26,0.22)' }}>
              <h2 className="text-3xl font-black uppercase tracking-wide text-[#721c15]">Specialty Gear &amp; Final Dossier</h2>
              <p className="text-lg font-sans font-black uppercase tracking-[0.18em] text-black/40 mt-1">
                Select up to 3 items — then review and submit your dossier for Archive transmission
              </p>
              <p className="text-sm font-sans italic text-[#721c15]/60 mt-2">
                Starting gear can be changed at any time from your Investigator Dossier.
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
                <p className="text-lg font-sans font-black uppercase tracking-[0.18em] text-[#721c15]/70 mb-2">Signature Equipment — {specialty}</p>
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
                <p className="text-lg font-sans font-black uppercase tracking-[0.18em] text-[#5a3a28]/55 mb-2">Standard Issue Equipment</p>
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
                    <span className="block text-lg font-sans font-black uppercase tracking-[0.15em] text-[#721c15] mb-0.5">{label}</span>
                    <span className="text-lg font-bold text-[#1a1311] block truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-sm" style={{ background: 'rgba(228,207,160,0.18)', border: '1px dashed rgba(90,58,40,0.22)' }}>
                <span className="block text-base font-sans font-black uppercase tracking-[0.18em] text-[#721c15] mb-1">Administrative Catalyst</span>
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
          ) : rejoinContext ? (
            <div className="w-full bg-[#0d0807] border-2 border-[#5c1010] p-5 shadow-[0_0_30px_rgba(120,10,10,0.5)]">
              <p className="font-mono text-xs text-[#8b4a4a] uppercase tracking-[0.2em] mb-1">Lightkeeper Invitation</p>
              <p className="text-[#c9b89a] font-serif text-base mb-4">
                Rejoin <strong className="text-white">{rejoinContext.campaignName}</strong> with this investigator?
              </p>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleComplete('rejoin')}
                  className="px-6 py-2.5 text-sm font-sans font-black uppercase tracking-[0.2em] border border-[#5c0f0f] transition-colors"
                  style={{ background: '#8b1a1a', color: '#fdfaf4' }}>
                  [ Rejoin {rejoinContext.campaignName} ]
                </button>
                <button
                  onClick={() => handleComplete('save')}
                  className="px-6 py-2.5 text-sm border border-zinc-600 text-zinc-400 hover:text-zinc-200 font-sans font-black uppercase tracking-[0.15em] transition-colors"
                  style={{ background: 'transparent' }}>
                  [ Save for Later ]
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleComplete('save')}
                className="px-6 py-2.5 text-sm border border-[#8b5a2b] font-sans font-black uppercase tracking-widest rounded transition-all"
                style={{ background: 'rgba(245,235,214,0.6)', color: '#3e2a1a' }}>
                Save for Later
              </button>
              <button
                onClick={() => setShowJoinInput(true)}
                className="px-6 py-2.5 text-sm border-2 border-[#1a1311] font-sans font-black uppercase tracking-widest rounded shadow-md transition-all"
                style={{ background: '#721c15', color: '#fdfaf4' }}>
                Join a Campaign
              </button>
            </div>
          )}

          {/* JOIN CAMPAIGN MODAL */}
          {showJoinInput && (
            <div
              className="fixed inset-0 z-[500] flex items-center justify-center"
              style={{ background: 'rgba(10,6,4,0.82)' }}
              onClick={() => { setShowJoinInput(false); setPenDropdownOpen(false); }}
            >
              <div
                className="relative flex flex-col gap-5 rounded-sm"
                style={{
                  width: 480,
                  background: '#ffffff',
                  border: '3px double rgba(0,0,0,0.3)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
                  padding: '36px 40px 32px',
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ borderBottom: '1px solid rgba(62,42,26,0.2)', paddingBottom: 16 }}>
                  <p className="text-xs font-sans font-black uppercase tracking-[0.35em] text-[#721c15]/60 mb-1">Chapter Admission</p>
                  <h2 className="text-3xl font-serif font-black text-[#1a1311] tracking-wide">Join a Circle</h2>
                  <p className="text-sm font-sans text-[#1a1311] mt-1.5 leading-relaxed opacity-70">
                    Enter the campaign cipher provided by your Lightkeeper to request admission.
                  </p>
                </div>

                {/* Campaign Cipher input */}
                <div>
                  <label className="block text-xs font-sans font-black uppercase tracking-[0.25em] text-[#721c15] mb-2">Campaign Cipher</label>
                  <input
                    autoFocus
                    type="text"
                    value={campaignCode}
                    onChange={e => setCampaignCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && campaignCode.trim() && handleComplete('join', campaignCode.trim())}
                    placeholder="e.g. fairelands-01"
                    className="w-full bg-[#f8f8f8] px-4 py-3 text-lg font-serif text-[#1a1311] placeholder-black/30 focus:outline-none"
                    style={{ border: '1px solid rgba(0,0,0,0.2)', borderBottom: '2px solid rgba(114,28,21,0.5)' }}
                  />
                </div>

                {/* Pen font picker */}
                <div>
                  <label className="block text-xs font-sans font-black uppercase tracking-[0.25em] text-[#721c15] mb-2">Writing Instrument</label>
                  <div>
                    <button
                      type="button"
                      onClick={() => setPenDropdownOpen(v => !v)}
                      className="w-full bg-[#f8f8f8] px-4 py-3 flex items-center justify-between hover:bg-[#f0f0f0] transition-colors"
                      style={{ border: '1px solid rgba(0,0,0,0.2)', borderBottom: penDropdownOpen ? '1px solid rgba(0,0,0,0.2)' : '2px solid rgba(114,28,21,0.5)' }}
                    >
                      <span className="text-xl text-[#1a1311]" style={{ fontFamily: selectedPen }}>{selectedPen}</span>
                      <span className="text-sm text-[#5a3a28]/50 ml-2 shrink-0">{penDropdownOpen ? '▲' : '▼'}</span>
                    </button>
                    {penDropdownOpen && (
                      <div className="max-h-52 overflow-y-auto" style={{ border: '1px solid rgba(0,0,0,0.2)', borderTop: 'none', background: '#f8f8f8' }}>
                        {PEN_FONTS.map(font => (
                          <button
                            key={font}
                            type="button"
                            onClick={() => { setSelectedPen(font); setPenDropdownOpen(false); }}
                            className="w-full px-4 py-2.5 text-left hover:bg-[#5a3a28]/10 transition-colors"
                            style={{
                              fontFamily: font, fontSize: 20, color: '#1a1311',
                              background: selectedPen === font ? 'rgba(90,58,40,0.12)' : undefined,
                              borderBottom: '1px solid rgba(90,58,40,0.07)',
                            }}
                          >
                            {font}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-base text-[#3a2010]/75 italic" style={{ fontFamily: selectedPen }}>
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-1" style={{ borderTop: '1px solid rgba(62,42,26,0.15)' }}>
                  <button
                    onClick={() => { setShowJoinInput(false); setPenDropdownOpen(false); }}
                    className="px-5 py-2.5 text-sm font-sans font-black uppercase tracking-widest text-[#1a1311]/60 hover:text-[#1a1311] transition-colors border border-black/20 hover:border-black/40 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => campaignCode.trim() && handleComplete('join', campaignCode.trim())}
                    disabled={!campaignCode.trim()}
                    className="px-7 py-2.5 text-sm font-sans font-black uppercase tracking-widest rounded shadow transition-all"
                    style={{
                      background: campaignCode.trim() ? '#721c15' : 'rgba(26,19,17,0.25)',
                      color: campaignCode.trim() ? '#fdfaf4' : 'rgba(26,19,17,0.3)',
                      cursor: campaignCode.trim() ? 'pointer' : 'not-allowed',
                      border: '2px solid rgba(26,19,17,0.15)',
                    }}
                  >
                    Join Circle →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
