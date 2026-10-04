// Roll modifiers granted by abilities, shared by the dossier (chips under each action) and
// the dice vault (Burn resistance). Moved from components/pc/DiceVault.jsx unchanged.

// ── Ability system ────────────────────────────────────────────────────────────

export const MAX_ABILITY_USES = {
  "I Know a Guy": 1,
  "Death Defy": 1,
  "Field Experience": 1,
  "Not Again": 1,
  "In the Trenches": 1,
  "Steel Mind": 1,
  "Compartmentalization": 1,
  "Saw This Coming": 3,
};

// Maps ability name → roll modifier descriptor.
// actions: array of action keys it qualifies for, or ['any']
// condition(character): optional extra gating
// extraDice(character): number of bonus dice
// extraGild: whether to gild an extra die
// driveSubstitute: alternate drive category string, or 'any'
// autoApply: shown as locked chip, always active when conditions met
export const ABILITY_ROLL_MODS = {
  "Sweet Talk":          { actions: ['sneak'],                   extraDice: () => 1, extraGild: false, gildIfCunningResist2: true, chipLabel: (ch) => `Sweet Talk (+1d${resistRemaining(ch,'cunning') >= 2 ? ', gilded' : ''})` },
  "Open Book":           { actions: ['sway'],                    extraDice: (ch) => resistRemaining(ch,'cunning'), extraGild: false, chipLabel: (ch) => `Open Book (+${resistRemaining(ch,'cunning')}d)` },
  "Lie Detector":        { actions: ['sneak'],                   extraDice: () => 0, extraGild: true,  chipLabel: () => 'Lie Detector (gild extra die)' },
  "Misdirection":        { actions: ['hide'],                    extraDice: () => 1, extraGild: false, chipLabel: () => 'Misdirection (+1d)' },
  "Interrogation":       { actions: ['sneak'],                   extraDice: (ch) => resistRemaining(ch,'cunning'), extraGild: false, chipLabel: (ch) => `Interrogation (+${resistRemaining(ch,'cunning')}d)` },
  "Inspection":          { actions: ['survey'],                  extraDice: () => 0, extraGild: true,  chipLabel: () => 'Inspection (gild extra die)' },
  "Basic Training":      { actions: ['survey'],                  extraDice: (ch) => resistRemaining(ch,'nerve'),   extraGild: false, chipLabel: (ch) => `Basic Training (+${resistRemaining(ch,'nerve')}d)` },
  "Better Part of Valor":{ actions: ['control','move'],          extraDice: () => 0, extraGild: true,  chipLabel: () => 'Better Part of Valor (gild extra die)' },
  "Tenacious":           { actions: ['move','strike','control'], extraDice: () => 0, extraGild: true,  autoApply: true, condition: (ch) => (ch.bleed_marks || 0) >= 1, chipLabel: () => 'Tenacious (auto: gild die)' },
  "Extend Your Senses":  { actions: ['sense'],                   extraDice: (ch) => resistRemaining(ch,'intuition'), extraGild: false, chipLabel: (ch) => `Extend Your Senses (+${resistRemaining(ch,'intuition')}d)` },
  "Meticulous Notes":    { actions: ['read'],                    extraDice: () => 1, extraGild: false, condition: (ch) => resistRemaining(ch,'cunning') >= 2, chipLabel: () => 'Meticulous Notes (+1d)' },
  "Cool Under Pressure": { actions: ['any'],                     extraDice: () => 0, extraGild: false, driveSubstitute: 'cunning', chipLabel: () => 'Cool Under Pressure (use Cunning)' },
  "Practiced Patter":    { actions: ['sway','hide'],             extraDice: () => 0, extraGild: false, driveSubstitute: 'intuition', chipLabel: () => 'Practiced Patter (use Intuition)' },
  "Street Smarts":       { actions: ['survey'],                  extraDice: () => 0, extraGild: false, driveSubstitute: 'any', chipLabel: () => 'Street Smarts (any drive)' },
  "Back Against the Wall":{ actions: ['any'],                    extraDice: () => 0, extraGild: false, costBrainMark: true, chipLabel: () => 'Back Against the Wall (Brain mark → Nerve = +2d)' },
  "Sharpshooter":        { actions: ['strike'],                  extraDice: () => 2, extraGild: false, costDrive: 'nerve', condition: (ch) => (ch.nerve_current || 0) > 0, chipLabel: (ch) => `Sharpshooter (spend 1 Nerve → +2d, ${ch.nerve_current ?? '?'} left)` },
  "Dissection":          { actions: ['read'],                    extraDice: () => 0, extraGild: true,  chipLabel: () => 'Dissection (gild extra die)' },
  "Born in the Shadows": { actions: ['hide'],                    extraDice: () => 0, extraGild: true,  chipLabel: () => 'Born in the Shadows (gild extra die)' },
};

function resistRemaining(character, driveKey) {
  if (!character) return 0;
  const max = Math.floor((character[driveKey + '_max'] || 1) / 3);
  const spent = character[driveKey + '_resistance_spent'] || 0;
  return Math.max(0, max - spent);
}

export function getAvailableRollMods(character, action) {
  if (!character || !action) return [];
  const mods = [];
  const abilities = [character.role_ability, character.specialty_ability].filter(Boolean);
  const uses = character.ability_uses || {};

  abilities.forEach(abilityName => {
    const def = ABILITY_ROLL_MODS[abilityName];
    if (!def) return;
    if (!def.actions.includes(action) && !def.actions.includes('any')) return;
    if (def.condition && !def.condition(character)) return;
    const maxUses = MAX_ABILITY_USES[abilityName];
    if (maxUses && (uses[abilityName] || 0) >= maxUses) return;
    const extra = typeof def.extraDice === 'function' ? def.extraDice(character) : def.extraDice;
    if (!def.autoApply && extra === 0 && !def.extraGild && !def.driveSubstitute && !def.costBrainMark) return;
    mods.push({
      key: abilityName,
      label: def.chipLabel(character),
      autoApply: !!def.autoApply,
      extraDice: extra,
      extraGild: !!def.extraGild,
      driveSubstitute: def.driveSubstitute || null,
      // What the chip shows beside the ability's name, in the sheet's own marks: "+1d", the
      // gilded dot, the drive it lets you spend. The full label names the chip.
      shows: {
        dice: extra > 0 ? extra : 0,
        gild: !!def.extraGild || (!!def.gildIfCunningResist2 && resistRemaining(character, 'cunning') >= 2),
        use: def.driveSubstitute === 'any' ? 'any drive'
          : def.driveSubstitute ? def.driveSubstitute[0].toUpperCase() + def.driveSubstitute.slice(1) : null,
      },
    });
  });
  return mods;
}
