// Circle formation votes. The server sends each kind's votes in the order they were first
// cast, and a tie goes to the option voted for first, at the seal as on every desk
// (playtest, vote-tie-leading: the seal broke ties by the database's row order, and the
// papers called every tied option "leading").

// [[value, count], ...] in the order each value was first voted for
export function tallyVotes(votes) {
  const tally = new Map();
  for (const v of votes || []) tally.set(v.value, (tally.get(v.value) || 0) + 1);
  return [...tally.entries()];
}

// The value that leads ({ value, count }), the first voted for among equal counts, or null
export function leadingVote(votes) {
  let lead = null;
  for (const [value, count] of tallyVotes(votes)) {
    if (!lead || count > lead.count) lead = { value, count };
  }
  return lead;
}

// Every value that shares the most votes, in the order each was first voted for (so the
// first is the one that leads); empty with no votes
export function leaders(votes) {
  const tally = tallyVotes(votes);
  const top = Math.max(0, ...tally.map(([, count]) => count));
  return top ? tally.filter(([, count]) => count === top).map(([value]) => value) : [];
}

// The words the papers print under a vote
export const TIE_RULE = 'A tie goes to the option voted for first.';

// True when two or more values share the most votes
export function isTied(votes) {
  const counts = tallyVotes(votes).map(([, count]) => count).sort((a, b) => b - a);
  return counts.length > 1 && counts[0] === counts[1];
}
