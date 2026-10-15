// Abilities used outside a roll, with the cost the rulebook gives each (pp. 27 to 32). The
// "Use" button on the sheet's ability card sends use_ability; the server pays the cost
// (backend/vtt/ability_uses.py, which names the same abilities; tests/test_creation.py
// checks that the two tables agree). cost is what the button says; options is a choice
// the player makes; ask: the player writes the question the ability asks, any question
// (issue #63), in a box that starts empty, so Use waits for one (playtest,
// tactician-one-tap), and examples are the rulebook's questions, a tap away; needs is a
// further choice (a resource, an object to write in, an ally, or a split of drive
// points); target lets the player name an ally instead of themselves (Ritual, Great
// Wards).
export const ABILITY_USES = {
  'Scout':               { cost: '1 Intuition', ask: true, examples: [
    'What do I notice here that others do not see?',
    'What in this place might be of use to us?',
    'What path should we follow?'] },
  'Uncanny Eye':         { cost: '1 Intuition', ask: true, examples: [
    'How can I leverage something here to my advantage?',
    "What here doesn't work the way it appears?",
    'What is out of place here?'] },
  'Well-Researched':     { cost: '1 Intuition' },
  'Obscure Lexicon':     { cost: '1 Intuition' },
  'Miasma':              { cost: '1 Intuition' },
  'Escape Artist':       { cost: '1 Nerve' },
  'Tactician':           { cost: '1 Nerve', ask: true, examples: [
    'How do I get to safety?',
    'What poses the largest immediate threat to my circle?',
    'Where is the target going to move next?'] },
  'Tricks of the Trade': { cost: '1 Nerve' },
  'Press Conference':    { cost: '1 Cunning' },
  'Sticky Fingers':      { cost: '1 Cunning' },
  'Mind Palace':         { cost: 'burn 1 Intuition resistance' },
  'Last Moments':        { cost: 'burn 1 Intuition resistance', options: { '': 'Hear, smell and feel', 'still image': 'Also see a still image (take a Bleed mark)' } },
  'Occult Researcher':   { cost: 'take a Brain mark' },
  'Commune':             { cost: 'take a Brain mark, then roll Sense' },
  'Ghostblade':          { cost: 'take a Body mark' },
  'Ritual':              { cost: 'take a Bleed mark', target: true, options: { 'Circle of Protection': 'Circle of Protection', 'Reinvigorate': 'Reinvigorate (refresh 1 resistance)', 'Remote Viewing': 'Remote Viewing' } },
  'I Know a Guy':        { cost: 'once per assignment' },
  'Insider Access':      { cost: 'once per assignment' },
  'University Resources': { cost: 'once per session' },
  'Field Experience':    { cost: 'once per assignment: 1 Nerve back for everyone in the circle' },
  'Volunteer Duty':      { cost: 'instead of spending resources', needs: 'resource' },
  'One Step Ahead':      { cost: 'once per assignment: write in an object', needs: 'item' },
  'Geared Up':           { cost: 'once per assignment: a gear slot for an ally', needs: 'ally' },
  'Blood of the Covenant': { cost: 'once per assignment: drive equal to your Intuition resistance', needs: 'split' },
  'Great Wards':         { cost: 'inscribe the ward', target: true },
};

// The longest question an ask ability sends (QUESTION_MAX in backend/vtt/ability_uses.py)
export const QUESTION_MAX = 200;

// Abilities that take a scar on purpose (pp. 29 and 32). Their "Use" button opens the
// scar form, which sends apply_scar with the ability's name; the server checks the
// ability and counts Not Again's one use (backend/vtt/ability_uses.py SCAR_ABILITIES).
// keepsRatings: the scar moves no action point; once: once per assignment; mark: the
// kind of scar.
export const SCAR_ABILITIES = {
  'Not Again':        { cost: 'take a scar', keepsRatings: true, once: true },
  'Forbidden Ritual': { cost: 'take a Bleed scar', mark: 'bleed' },
};

// Abilities used once per assignment (backend ONCE_PER_ASSIGNMENT and the once entries of
// ABILITY_USES and SCAR_ABILITIES), whose use the sheet says in words on both desks, the
// Lightkeeper's copy included. University Resources is once per session, so it is left out.
export const ONCE_SHOWN = new Set([
  ...Object.entries(ABILITY_USES).filter(([, u]) => u.cost.startsWith('once per assignment')).map(([n]) => n),
  ...Object.entries(SCAR_ABILITIES).filter(([, u]) => u.once).map(([n]) => n),
  'Death Defy', 'Compartmentalization', 'Steel Mind', 'In the Trenches',
]);
