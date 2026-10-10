// Circle formation (Form C.O. 4): the questions and insignia the papers offer, and what the
// Lightkeeper's desk reads from the state every desk of the campaign is sent (votes by
// character, each member's answer, the relationships): who has voted, written or proposed,
// what the seal would take, and which relationships still wait for an answer.
import { leadingVote } from './votes';

export const CIRCLE_QUESTIONS = [
  { key: 'q1', text: 'You have all known one another for a long time, but your circle was recently formed. Why were you brought together, and how do you each feel about it?' },
  { key: 'q2', text: "You all share a common goal that's secret to the Lightkeepers of Candela Obscura. What is it?" },
  { key: 'q3', text: "You've never met, but members of your circle are infamous. What did they do, and how do you each feel about it?" },
  { key: 'q4', text: 'Your circle was retired, but Candela Obscura recently brought you back. Why were you all dismissed, and why did they call you in again?' },
  { key: 'q5', text: 'Your circle once did something incredibly heroic. What did you do, and do other people know about it?' },
  { key: 'q6', text: 'Your circle once did something horribly evil. What did you do, and how do you seek absolution?' },
];

export const INSIGNIA_OPTIONS = [
  { key: 'GiOuroboros',    label: 'Ouroboros' },
  { key: 'GiOrbital',      label: 'Orbital Ring' },
  { key: 'GiCompass',      label: 'Compass' },
  { key: 'GiOilySpiral',   label: 'Oily Spiral' },
  { key: 'GiMoon',         label: 'Moon' },
  { key: 'GiGoldShell',    label: 'Gilded Shell' },
  { key: 'GiGlowingHands', label: 'Radiant Hands' },
  { key: 'GiCandleLight',  label: 'Candlelight' },
];

// "Question 5" for q5
export const questionName = (key) => `Question ${String(key ?? '').replace(/^q/, '')}`;
export const questionText = (key) => CIRCLE_QUESTIONS.find(q => q.key === key)?.text || '';
export const insigniaLabel = (key) => INSIGNIA_OPTIONS.find(i => i.key === key)?.label || String(key ?? '').replace(/^Gi/, '');

// The ids of the characters with a vote of this kind
export const voterIds = (votes) => new Set((votes || []).map(v => v.character_id));

// The name the seal would write now ({ value, count, voted }): the name voted for most, or
// with no name votes the name suggested most, a tie going to the first in each case
// (finalize_roster)
export function nameOnTheSeal(votes) {
  const voted = leadingVote(votes?.name_vote);
  if (voted) return { ...voted, voted: true };
  const suggested = leadingVote(votes?.name_suggest);
  return suggested ? { ...suggested, voted: false } : null;
}

// The relationships between these members (a member's id on both ends)
export const relationshipsAmong = (relationships, members) => {
  const ids = new Set((members || []).map(m => m.id));
  return (relationships || []).filter(r => ids.has(r.from_character_id) && ids.has(r.to_character_id));
};

// Those still waiting for an answer: proposed or countered, not yet accepted. They keep
// their Accept and Counter after the seal, on the players' Circle tab.
export const waitingRelationships = (relationships) => (relationships || []).filter(r => r.status !== 'accepted');

// Who answers a relationship next: the party that did not act last, or with no one
// recorded the one it was proposed to (the server's rule, circle_relationship_respond)
export const answererOf = (rel) => (rel.last_actor_id == null || rel.last_actor_id === rel.from_character_id
  ? rel.to_character_id : rel.from_character_id);

// "Iris", "Iris and Edith", "Iris, Edith and Tom"
export const nameList = (names) => {
  const list = (names || []).filter(Boolean);
  if (list.length < 2) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
};
