// Abilities used outside a roll, with the cost the rulebook gives each (pp. 27 to 32). The
// "Use" button on the sheet's ability card sends use_ability; the server pays the cost
// (backend/vtt/ability_uses.py, which names the same abilities; tests/test_creation.py
// checks that the two tables agree). cost is what the button says; options is a choice
// the player makes; ask: the options are the questions the ability asks, in the
// rulebook's words, and the choice starts blank, so Use waits for one (playtest,
// tactician-one-tap); needs is a further choice (a resource, an object to write in, an
// ally, or a split of drive points); target lets the player name an ally instead of
// themselves (Ritual, Great Wards).
export const ABILITY_USES = {
  'Scout':               { cost: '1 Intuition', ask: true, options: {
    'What do I notice here that others do not see?': 'What do I notice here that others do not see?',
    'What in this place might be of use to us?': 'What in this place might be of use to us?',
    'What path should we follow?': 'What path should we follow?' } },
  'Uncanny Eye':         { cost: '1 Intuition', ask: true, options: {
    'How can I leverage something here to my advantage?': 'How can I leverage something here to my advantage?',
    "What here doesn't work the way it appears?": "What here doesn't work the way it appears?",
    'What is out of place here?': 'What is out of place here?' } },
  'Well-Researched':     { cost: '1 Intuition' },
  'Obscure Lexicon':     { cost: '1 Intuition' },
  'Miasma':              { cost: '1 Intuition' },
  'Escape Artist':       { cost: '1 Nerve' },
  'Tactician':           { cost: '1 Nerve', ask: true, options: {
    'How do I get to safety?': 'How do I get to safety?',
    'What poses the largest immediate threat to my circle?': 'What poses the largest immediate threat to my circle?',
    'Where is the target going to move next?': 'Where is the target going to move next?' } },
  'Tricks of the Trade': { cost: '1 Nerve' },
  'Press Conference':    { cost: '1 Cunning' },
  'Sticky Fingers':      { cost: '1 Cunning' },
  'Mind Palace':         { cost: 'burn 1 Intuition resistance' },
  'Last Moments':        { cost: 'burn 1 Intuition resistance', options: { '': 'Hear, smell and feel', 'still image': 'Also see a still image (take a Bleed mark)' } },
  'Occult Researcher':   { cost: 'take a Brain mark' },
  'Commune':             { cost: 'take a Brain mark' },
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

// Abilities that take a scar on purpose (pp. 29 and 32). Their "Use" button opens the
// scar form, which sends apply_scar with the ability's name; the server checks the
// ability and counts Not Again's one use (backend/vtt/ability_uses.py SCAR_ABILITIES).
// keepsRatings: the scar moves no action point; once: once per assignment; mark: the
// kind of scar.
export const SCAR_ABILITIES = {
  'Not Again':        { cost: 'take a scar', keepsRatings: true, once: true },
  'Forbidden Ritual': { cost: 'take a Bleed scar', mark: 'bleed' },
};
