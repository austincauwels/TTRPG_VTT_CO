// What each circle resource does (rulebook p. 41): behind its "i" on the charter card, and printed in each entry on the
// Lightkeeper's circle page. The player's circle page prints its own words for each inline.
export const RESOURCE_HELP = {
  stitch: "Clears all of one investigator's marks: Body, Brain and Bleed.",
  refresh: "Restores all of one investigator's spent drive and resistance.",
  train: 'One bonus die (+1d) to add to any roll you choose, kept until a roll uses it.',
};

// Resource Management (p. 41): when the circle hits a milestone on the Illumination track,
// it earns back one Stitch, Refresh or Train. The server counts each milestone passed
// (_count_earn_backs in backend/vtt/ws/handlers/gm.py) and the Lightkeeper's desk asks for
// the circle's choice (gm/EarnBackAsk.jsx). abilities: the circle's abilities, one name each.
const earnsBackAtMilestones = (abilities) =>
  (abilities || []).some(ability => ability.trim() === 'Resource Management');

// When they come back (p. 41): not after an assignment, and never by a press of the
// Lightkeeper's. Each refills to 1 plus the members when the circle advances on a full
// Illumination track (fill_resources in backend/vtt/circle_queries.py; Robert's issue
// #66.4 removed the refill button), and a circle with Resource Management earns one back
// at each milestone. Printed under the resources on both circle pages, with the spending
// limit (p. 45; fix round 4, decision 2: spending is open whenever the Lightkeeper opens
// it, and End Assignment resets the count). The rule comes first and the sum after it,
// with the member count named apart from the result ("now 5" read as five members;
// playtest, 2026-10-09).
const members = (maxCap) => `1 plus the circle's ${maxCap - 1} member${maxCap - 1 === 1 ? '' : 's'}`;
export const refillRule = (maxCap, abilities) => (earnsBackAtMilestones(abilities)
  ? `Each player may spend up to two each assignment, whenever the Lightkeeper opens spending; the count starts again when the assignment ends. Spent resources come back on the Illumination track: at each milestone (3, 6 and 9) Resource Management earns back one, the circle's choice, and when the circle advances on a full track each refills to ${maxCap} (${members(maxCap)}).`
  : `Each player may spend up to two each assignment, whenever the Lightkeeper opens spending; the count starts again when the assignment ends. Spent resources do not come back after an assignment: when the circle advances on a full Illumination track, each refills to ${maxCap} (${members(maxCap)}).`);

// The same, as the charter card's ledger entry, which shows each maximum already
export const refillEntry = (maxCap, abilities) => (earnsBackAtMilestones(abilities)
  ? `To ${maxCap} each when the circle advances on a full track, and one of the circle's choice at each milestone (Resource Management).`
  : `To ${maxCap} each when the circle advances on a full track, not after an assignment.`);
