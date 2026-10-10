import { ACTION_LABEL, driveKeyFor } from './actions';

// The rulebook's outcome words for the server's outcome keys (engine.OUTCOME_LABELS),
// each with its own color on the dark felt. The word always appears with the color, so
// the color never carries the outcome alone.
export const OUTCOME = {
  failure:          { word: 'Failure',          className: 'text-oxblood-lit' },
  mixed_success:    { word: 'Mixed success',    className: 'text-parchment-deep' },
  full_success:     { word: 'Success',          className: 'text-seal-green-lit' },
  critical_success: { word: 'Critical success', className: 'text-candle-gold' },
};

// After a gilded choice the server scores the kept die (engine.calculate_outcome): a kept
// 6 among two or more 6s is a critical success, a 6 a success, 4 or 5 mixed, else failure.
// The roller's desk also hears the server's own outcome (roll_kept); this covers the
// moment before it arrives and the GM's felt.
export const outcomeForKept = (value, dice = []) => {
  if (value === 6) return dice.filter(d => d.value === 6).length >= 2 ? 'critical_success' : 'full_success';
  return value >= 4 ? 'mixed_success' : 'failure';
};

// What was thrown, in the rulebook's terms, for the line under the dice:
//   zero rating (two dice, the lower one counts)  "Move: 2 dice, lowest counts"
//   one die                                       "Sway: 1 die", "Sway: 1 gilded die"
//   a pool of several                             "Focus: 3 dice, highest counts"
//   a gilded pool, before and after the choice    "Survey: 3 dice, 1 gilded"
//                                                 "Survey: 3 dice, 1 gilded, kept the gilded 5"
//                                                 "Survey: 3 dice, 1 gilded, kept the 4"
//   dice added to the rating                      "Sway +2d: 3 dice, highest counts"
//   a resistance reroll                           "Move, resistance burned: 2 dice, highest counts"
//   the Lightkeeper's roll (no action)            "4 dice, highest counts"
// The count is what the server threw (capped at 6). rating is the roller's rating in the
// action when this desk knows it (the roller's own desk, or the GM's felt from dice_thrown): dice thrown beyond it (drive
// spent, an ability, a Train bonus) show as "+2d" after the action, the way the sheet's
// drive stepper writes them. A resistance reroll throws the rating alone.
// keptDie is the die kept in a gilded choice ({ value, idx }), when there was one.
export const rollPoolText = (roll, keptDie = null, rating = null) => {
  if (!roll) return '';
  const dice = roll.dice || [];
  const count = dice.length;
  const gilded = dice.filter(d => d.is_gilded).length;

  let thrown;
  if (count === 1) {
    thrown = gilded ? '1 gilded die' : '1 die';
  } else {
    const parts = [`${count} dice`];
    if (gilded) parts.push(`${gilded} gilded`);
    if (roll.type === 'zero') {
      parts.push('lowest counts');
    } else if (roll.needs_gilded_choice || keptDie) {
      const kept = keptDie ? dice[keptDie.idx] : null;
      if (kept) parts.push(`kept the ${kept.is_gilded ? 'gilded ' : ''}${kept.value}`);
    } else {
      parts.push('highest counts');
    }
    thrown = parts.join(', ');
  }

  const label = ACTION_LABEL[roll.action];
  if (!label) return thrown;
  const added = !roll.is_resistance_roll && roll.type !== 'zero' && Number.isFinite(rating) ? count - rating : 0;
  return `${label}${added > 0 ? ` +${added}d` : ''}${roll.is_resistance_roll ? ', resistance burned' : ''}: ${thrown}`;
};

const ACTION_KEYS = Object.keys(ACTION_LABEL).join('|');
const LOGGED_ACTION = new RegExp(`\\b(rolled|resistance on) (${ACTION_KEYS})\\b`, 'g');
const LOGGED_OUTCOME = { 'Critical Success': 'Critical success', 'Full Success': 'Success', 'Mixed Success': 'Mixed success' };
const capital = (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

// The server writes its log lines with internal action keys ("rolled sneak"), its own
// outcome labels and long dashes ("rolled sneak", dash, "4 · Mixed Success. [gilded",
// dash, "cunning Drive refreshed]"). Show them in the rulebook's words instead: "rolled
// Read, a 4: Mixed success. (Gilded die kept: 1 Cunning refreshed)". The stored text is
// unchanged.
export const rulebookLogText = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(LOGGED_ACTION, (_, verb, key) => `${verb} ${ACTION_LABEL[key]}`)
    .replace(/(Critical|Full|Mixed) Success/g, (m) => LOGGED_OUTCOME[m] || m)
    .replace(/\brolled \u2014 (\d+) \u00b7 /g, 'rolled a $1: ')
    .replace(/ \u2014 (\d+) \u00b7 /g, ', a $1: ')
    .replace(/\[gilded \u2014 (\w+) Drive refreshed\]/g, (_, drive) => `(Gilded die kept: 1 ${capital(drive)} refreshed)`)
    .replace(/\[Well-Read \u2014 (\d+) Intuition refunded\]/g, '(Well-Read: $1 Intuition back)')
    .replace(/ \u2014 /g, ': ');
};

// The two dice a gilded roll offers, each with what keeping it does (playtest,
// gilded-choice-unexplained): keeping the gilded die gives one point back to the action's
// drive, and the regular die does not. One wording for the slip and the phone's bar:
//   "Keep the gilded 4: Mixed success, 1 Nerve back"   "Keep the 4: Mixed success"
const DRIVE_NAME = { nerve: 'Nerve', cunning: 'Cunning', intuition: 'Intuition' };
export const keepChoices = (roll) => {
  const dice = roll?.dice || [];
  const choices = [];
  const add = (idx, gilded) => {
    const die = dice[idx];
    if (!die) return;
    const word = OUTCOME[outcomeForKept(die.value, dice)].word;
    const back = gilded ? `, 1 ${DRIVE_NAME[driveKeyFor(roll.action)]} back` : '';
    choices.push({ idx, die, label: `Keep the ${gilded ? 'gilded ' : ''}${die.value}: ${word}${back}` });
  };
  add(roll?.gilded_idx, true);
  add(roll?.highest_regular_idx, false);
  return choices;
};
