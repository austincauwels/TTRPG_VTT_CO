// What each circle resource does (rulebook p. 41): behind its "i" on the charter card, and printed in each entry on the
// Lightkeeper's circle page. The player's circle page prints its own words for each inline.
export const RESOURCE_HELP = {
  stitch: "Clears all of one investigator's marks: Body, Brain and Bleed.",
  refresh: "Restores all of one investigator's spent drive and resistance.",
  train: 'One bonus die (+1d) to add to any roll you choose, kept until a roll uses it.',
};

// Resource Management (p. 41): when the circle hits a milestone on the Illumination track,
// it earns back one Stitch, Refresh or Train (the server logs each, _log_illumination in
// backend/vtt/ws/handlers/gm.py). abilities: the circle's abilities, one name each.
const earnsBackAtMilestones = (abilities) =>
  (abilities || []).some(ability => ability.trim() === 'Resource Management');

// When they come back (p. 41): not after an assignment. Each refills when the Illumination
// track fills, to 1 plus the members (fill_resources in backend/vtt/circle_queries.py), and
// a circle with Resource Management earns one back at each milestone. Printed under the
// resources on both circle pages, with the spending limit (p. 45; fix round 4, decision 2:
// spending is open whenever the Lightkeeper opens it, and End Assignment resets the count). The rule comes first and
// the sum after it, with the member count named apart from the result ("now 5" read as five
// members; playtest, 2026-10-09).
export const refillRule = (maxCap, abilities) => (earnsBackAtMilestones(abilities)
  ? `Each player may spend up to two each assignment, whenever the Lightkeeper opens spending; the count starts again when the assignment ends. Spent resources come back only on the Illumination track: Resource Management earns back one Stitch, Refresh or Train, the circle's choice, at each milestone (3, 6 and 9), and each refills to ${maxCap} (1 plus the circle's ${maxCap - 1} member${maxCap - 1 === 1 ? '' : 's'}) when the track fills.`
  : `Each player may spend up to two each assignment, whenever the Lightkeeper opens spending; the count starts again when the assignment ends. Spent resources do not come back after an assignment: each refills to ${maxCap} (1 plus the circle's ${maxCap - 1} member${maxCap - 1 === 1 ? '' : 's'}) when the Illumination track fills.`);

// The same, as the charter card's ledger entry, which shows each maximum already
export const refillEntry = (maxCap, abilities) => (earnsBackAtMilestones(abilities)
  ? `To ${maxCap} each when the Illumination track fills, and one of the circle's choice at each milestone (Resource Management).`
  : `To ${maxCap} each when the Illumination track fills, not after an assignment.`);
