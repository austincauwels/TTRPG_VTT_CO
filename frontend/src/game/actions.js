export function driveKeyFor(action) {
  return ['move','strike','control'].includes(action) ? 'nerve'
       : ['hide','sneak','sway'].includes(action)    ? 'cunning'
       : 'intuition';
}

// Rulebook labels for the action keys (the keys sneak and read are labelled Read and Focus).
export const ACTION_LABEL = {
  move: 'Move', strike: 'Strike', control: 'Control',
  sway: 'Sway', sneak: 'Read', hide: 'Hide',
  survey: 'Survey', read: 'Focus', sense: 'Sense',
};

// The note a scar adds to its description: which action went down and which went up, or
// the ability that kept the ratings (Hardened, or Not Again).
export const scarShiftNote = (down, up, keptBy = 'Hardened') =>
  (down && up ? `(-1 ${ACTION_LABEL[down]}, +1 ${ACTION_LABEL[up]})` : `(${keptBy}: no action shift)`);

// The longest scar the server keeps (backend/vtt/ws/access.py SCAR_TEXT_MAX). The scar
// form's description stops 40 characters short of it, room for the space and the shift note
// after it (the longest note, "(Not Again: no action shift)", is 28).
export const SCAR_TEXT_MAX = 500;
export const SCAR_DESCRIPTION_MAX = SCAR_TEXT_MAX - 40;

// Scars recorded before 2026-10-04 end in "[SCAR SHIFT: -1 SNEAK / +1 READ]", written with
// the internal action keys. Show those in the rulebook's names; the stored text is unchanged.
export const scarDisplayText = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\[SCAR SHIFT: -1 (\w+) \/ \+1 (\w+)\]/, (m, down, up) => {
      const d = down.toLowerCase();
      const u = up.toLowerCase();
      return ACTION_LABEL[d] && ACTION_LABEL[u] ? scarShiftNote(d, u) : m;
    })
    .replace('[HARDENED — no action shift]', scarShiftNote(null, null));
};
