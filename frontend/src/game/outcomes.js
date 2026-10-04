import { ACTION_LABEL } from './actions';

// The rulebook's outcome words for the server's outcome keys (engine.OUTCOME_LABELS),
// each with its own color on the dark felt. The word always appears with the color, so
// the color never carries the outcome alone.
export const OUTCOME = {
  failure:          { word: 'Failure',          className: 'text-oxblood-lit' },
  mixed_success:    { word: 'Mixed success',    className: 'text-parchment-deep' },
  full_success:     { word: 'Success',          className: 'text-seal-green-lit' },
  critical_success: { word: 'Critical success', className: 'text-candle-gold' },
};

// After a gilded choice the server scores the kept die alone (engine.calculate_outcome
// with no dice list, so never a critical): 6 is a success, 4 or 5 mixed, else failure.
export const outcomeForKept = (value) => (value === 6 ? 'full_success' : value >= 4 ? 'mixed_success' : 'failure');

// "Read, 3 dice" for an investigator's roll, "4 dice" for the Lightkeeper's. A zero-rating
// roll throws two dice but its pool is 0.
export const rollPoolText = (roll) => {
  if (!roll) return '';
  const pool = roll.type === 'zero' ? 0 : (roll.dice?.length || 0);
  const dice = `${pool} ${pool === 1 ? 'die' : 'dice'}`;
  const action = ACTION_LABEL[roll.action];
  return action ? `${action}, ${dice}` : dice;
};

const ACTION_KEYS = Object.keys(ACTION_LABEL).join('|');
const LOGGED_ACTION = new RegExp(`\\b(rolled|resistance on) (${ACTION_KEYS})\\b`, 'g');
const LOGGED_OUTCOME = { 'Critical Success': 'Critical success', 'Full Success': 'Success', 'Mixed Success': 'Mixed success' };

// The server writes roll log lines with its internal action keys ("rolled sneak") and its
// own outcome labels. Show the rulebook's names instead; the stored text is unchanged.
export const rulebookLogText = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(LOGGED_ACTION, (_, verb, key) => `${verb} ${ACTION_LABEL[key]}`)
    .replace(/(Critical|Full|Mixed) Success/g, (m) => LOGGED_OUTCOME[m] || m)
    .replace(/ — (\d+) · /g, ': $1, ');
};
