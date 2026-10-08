// What each circle resource does (rulebook p. 41; p. 45 for spending them between
// assignments): behind its "i" on the charter card, and printed in each entry on the
// Lightkeeper's circle page. The player's circle page prints its own words for each inline.
export const RESOURCE_HELP = {
  stitch: "Clears all of one investigator's marks: Body, Brain and Bleed.",
  refresh: "Restores all of one investigator's spent drive and resistance.",
  train: 'One bonus die (+1d) to add to any roll in the next assignment.',
};

// When they come back (p. 41): not after an assignment, only when the Illumination track
// fills, each to 1 plus the members (fill_resources in backend/vtt/circle_queries.py).
// Printed under the resources on both circle pages, with the spending limit (p. 45).
export const refillRule = (maxCap) =>
  `Each player may spend up to two between assignments. Spent resources do not come back after an assignment: each refills to ${maxCap} (1 plus the circle's members) when the Illumination track fills.`;

// The same, as the charter card's ledger entry, which shows each maximum already
export const refillEntry = (maxCap) =>
  `To ${maxCap} each when the Illumination track fills, not after an assignment.`;
