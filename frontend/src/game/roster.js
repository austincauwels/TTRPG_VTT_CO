// A dead investigator stays on the campaign's roster (active, flagged is_dead) until their
// player's new investigator is approved, so the Lightkeeper can open the sheet: a fourth
// scar taken by mistake is removed there, which lifts the death. The desk shows them apart.
// Everything that counts the circle's members, or offers them as allies or note recipients,
// takes the living only.
export const livingMembers = (list) => (Array.isArray(list) ? list.filter(inv => !inv.is_dead) : []);
export const deceasedMembers = (list) => (Array.isArray(list) ? list.filter(inv => inv.is_dead) : []);
