// What each circle resource does (rulebook p. 41; p. 45 for spending them between
// assignments): behind its "i" on the charter card, and printed in each entry on the
// Lightkeeper's circle page. The player's circle page prints its own words for each inline.
export const RESOURCE_HELP = {
  stitch: "Clears all of one investigator's marks: Body, Brain and Bleed.",
  refresh: "Restores all of one investigator's spent drive and resistance.",
  train: 'One bonus die (+1d) to add to any roll in the next assignment.',
};

// Resource Management (p. 41): when the circle hits a milestone on the Illumination track,
// it earns back one Stitch, Refresh or Train (the server logs each, _log_illumination in
// backend/vtt/ws/handlers/gm.py). abilities: the circle's abilities, one name each.
const earnsBackAtMilestones = (abilities) =>
  (abilities || []).some(ability => ability.trim() === 'Resource Management');

// When they come back (p. 41): not after an assignment. Each refills when the Illumination
// track fills, to 1 plus the members (fill_resources in backend/vtt/circle_queries.py), and
// a circle with Resource Management earns one back at each milestone. Printed under the
// resources on both circle pages, with the spending limit (p. 45). The rule comes first and
// the number after it: "refills to 1 (1 plus the circle's members)" read as a contradiction
// (playtest, 2026-10-09).
export const refillRule = (maxCap, abilities) => (earnsBackAtMilestones(abilities)
  ? `Each player may spend up to two between assignments. Spent resources come back only on the Illumination track: Resource Management earns back one Stitch, Refresh or Train, the circle's choice, at each milestone (3, 6 and 9), and each refills to 1 plus the circle's members (now ${maxCap}) when the track fills.`
  : `Each player may spend up to two between assignments. Spent resources do not come back after an assignment: each refills to 1 plus the circle's members (now ${maxCap}) when the Illumination track fills.`);

// The same, as the charter card's ledger entry, which shows each maximum already
export const refillEntry = (maxCap, abilities) => (earnsBackAtMilestones(abilities)
  ? `To ${maxCap} each when the Illumination track fills, and one of the circle's choice at each milestone (Resource Management).`
  : `To ${maxCap} each when the Illumination track fills, not after an assignment.`);
