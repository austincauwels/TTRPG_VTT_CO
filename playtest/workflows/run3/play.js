export const meta = {
  name: 'playtest3-play',
  description: 'Third playtest on beta: one step of the session (args.step), the Lightkeeper and four AI players (Ada in Robert\'s place)',
  whenToUse: 'Each step of the third playtest, in order: campaign, investigators, approval, replace, circle, ready, round (1 to 3), wrap, after',
  phases: [
    { title: 'Players', detail: 'ada, bram, cass and dev (Sonnet 5.5, medium) take their turns at once' },
    { title: 'Lightkeeper', detail: 'the Lightkeeper (Opus 5.5, high) answers everyone' },
  ],
}

// args (real JSON, never a placeholder string):
//   step     'campaign' | 'investigators' | 'approval' | 'replace' | 'circle' | 'ready' | 'round' | 'wrap' | 'after'
//   round    1, 2 or 3 (step 'round' only)
//   code     the campaign code (from 'campaign' on)
//   last     the previous step's Lightkeeper result ({ prompts, story_so_far, state, for_players, opening }), or null
//   heard    step 'ready' only: the circle step's player summaries, as one string
//   note     anything the organiser wants every seat to know this step
//   extra    { seat: text } added to that seat's goal this step
// Save what this returns as /home/user/pt3/results/<step><round>.json and pass its 'dm' as 'last' next time.
// 12 October: Robert left before play started; Ada (an AI player) took his seat. Step 'replace'
// has Ada build and join, then the Lightkeeper approves her and takes Robert's Pontius off the table.

const PT = '/home/user/pt3'
const AI = ['ada', 'bram', 'cass', 'dev']
const NAMES = { dm: 'the Lightkeeper', ada: 'Ada Quill', bram: 'Bram Okafor', cass: 'Cass Moreau', dev: 'Dev Lindqvist' }
const ROLE = { ada: 'Scholar (Professor)', bram: 'Muscle (Soldier)', cass: 'Slink (Criminal)', dev: 'Weird (Occultist)' }
const MODEL = (seat) => (seat === 'dm' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' })
const A = args || {}
const STEP = A.step
const LAST = A.last || {}
const CODE = A.code || '(read it at the table: node table.js read)'

const COMMON = (seat, phase) => `You are a playtester of Candela VTT, a web app for running the tabletop RPG Candela Obscura. A Lightkeeper and four players are playing one campaign together on the app's beta site, each in their own browser, to find bugs, rules mistakes, confusing spots and ideas for improvement. This is the THIRD playtest: much of what the earlier two found has been fixed, so look hard at everything with fresh eyes. You are seat "${seat}" (${NAMES[seat]}). All four players (Ada, Bram, Cass, Dev) are AI seats like you; Robert, who was going to play, left before play started, and Ada took his seat.
Before anything else, read ${PT}/README.md (how to drive your browser, talk at the table and log findings; follow its rules of conduct exactly) and your persona in ${PT}/personas.md, then your memory file ${PT}/memory/${seat}.md if it exists, and the table talk (node table.js read --last 40). All commands run from ${PT}.
This is one turn of the session, in the phase "${phase}" (pass --phase "${phase}" to finding.js). Stay in character while you play, and keep a tester's eye open: log every bug, rules mismatch, confusing or awkward moment, and every thing that works well, as it happens, with screenshots you have looked at. Notice the small things too (wording, layout at your screen size, what a screen reader would hear, slow or janky moments, console errors from 'errors'). Check finding.js --list first so you do not repeat what someone already logged.
Start the turn with 'look' and check, WITHOUT reloading, that your screen shows what has happened since your last turn (other people's rolls in the log, the Lightkeeper's changes, the hourglass, the dispatch, the circle). Anything stale is a bug.
Keep to this turn's goal: roughly 20 to 50 tool calls. Do not wait for other players; they take their own turns. Do not reload unless the step needs it. If seat.js cannot reach your browser (the machine restarted), run bash ${PT}/start_all.sh once, then carry on and say so in your summary. If the site itself does not load (beta is on Robert's server; he may be deploying), wait a minute, try once more, then stop and say so in 'blocked'.
Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish. Your goal is only what is written under YOUR GOAL THIS TURN.
Before you finish: append your memory entry to ${PT}/memory/${seat}.md (create it if needed): what you did, your investigator's current state (drives, resistances, marks, scars, gear, ability uses), what you are watching for. Then return the structured result.`

const TURN = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What you did and what happened this turn, in 3 to 10 sentences, including anything that did not work.' },
    findings: { type: 'array', items: { type: 'string' }, description: 'IDs of the findings you logged this turn (F0xx).' },
    blocked: { type: 'string', description: 'Empty, or what stopped you from finishing the turn goal.' },
    state: { type: 'string', description: 'Players: your investigator\'s state in one line. Lightkeeper: what the site shows now that the next turn needs (who is marked or scarred, the hourglass, the timer, the scene, reports open or not, Illumination).' },
    campaign_code: { type: 'string', description: 'Lightkeeper, step campaign: the code players join with.' },
    character_name: { type: 'string', description: 'Players, steps investigators and replace: your investigator\'s name.' },
    for_players: { type: 'string', description: 'Lightkeeper: what the players need to do next on the site, in plain steps.' },
    opening: { type: 'string', description: 'Lightkeeper, step ready: the opening narration you posted.' },
    prompts: {
      type: 'object', description: 'Lightkeeper: what you ask of each player next, in the story and on the site (which roll, with which action).',
      properties: { ada: { type: 'string' }, bram: { type: 'string' }, cass: { type: 'string' }, dev: { type: 'string' } },
    },
    story_so_far: { type: 'string', description: 'Lightkeeper: the story so far in a few sentences.' },
  },
  required: ['summary', 'findings', 'blocked'],
}

const run = (seat, phase, goal) => agent(`${COMMON(seat, phase)}\n\nYOUR GOAL THIS TURN:\n${goal}${A.note ? `\nFrom the organiser: ${A.note}` : ''}${A.extra && A.extra[seat] ? `\nAlso this turn: ${A.extra[seat]}` : ''}`, { label: `${phase}:${seat}`, phase: seat === 'dm' ? 'Lightkeeper' : 'Players', schema: TURN, ...MODEL(seat) })
const players = (phase, goalFor, seats = AI) => parallel(seats.map((p) => () => run(p, phase, goalFor(p))))
const heard = (rs, seats = AI) => rs.map((r, j) => `${seats[j]}: ${r ? `${r.summary}${r.blocked ? ` (blocked: ${r.blocked})` : ''}` : 'turn failed'}`).join('\n')
const asked = (p) => (LAST.prompts && LAST.prompts[p]) || '(read the table: node table.js read --last 20)'
const done = (out) => { log(`${STEP}${A.round || ''}: ${out.dm ? (out.dm.state || out.dm.summary || '').slice(0, 240) : 'no Lightkeeper turn'}`); return out }
const BUILD = (p) => `You are joining a new Candela Obscura campaign, The Saltmere Chapter. The code is ${CODE}. Create your account through the sign-up form (username as in personas.md). Build your investigator in the site's character creator as your persona would: a ${ROLE[p]}. Choose a name, look and story, abilities, actions and drives as the creator asks, and anything else it offers (portrait, pen font, gear). Then join the campaign with the code and see what the site tells you while you wait for the Lightkeeper's approval (does your hub notice the approval by itself?). Introduce your investigator at the table in one or two lines (node table.js say ${p} "..."). Return character_name.`

if (STEP === 'campaign') {
  const dm = await run('dm', 'Campaign', `You arrive at the beta site. Create your Lightkeeper account through the sign-up form (username lightkeeper_rue_r3); if it already exists (it was made on 12 October, password as in README.md), sign in instead. Create the campaign "The Saltmere Chapter". Note the campaign code the players will need. Open your Lightkeeper's desk and get to know it again. Do not start the story yet. Then tell the table: node table.js say dm "Welcome, investigators. Join The Saltmere Chapter with the code <code>." Return the code in campaign_code.`)
  return done({ dm, code: dm && dm.campaign_code })
}

if (STEP === 'investigators') {
  const seats = A.seats || AI
  const ps = await players('Investigators', BUILD, seats)
  return done({ players: ps, investigators: Object.fromEntries(ps.map((r, i) => [seats[i], r && r.character_name])) })
}

if (STEP === 'approval') {
  const dm = await run('dm', 'Approval', `Your players have built investigators and asked to join The Saltmere Chapter (code ${CODE}); their introductions are at the table. On your desk, review the join requests (open each sheet first, as a careful Lightkeeper would) and approve one investigator per player. Welcome each investigator at the table in a line. Then start circle formation and work out exactly what the players have to do on their screens and what is left for you, without finishing it. Put plain step-by-step instructions in for_players, and tell the table in a line or two what happens next.`)
  return done({ dm })
}

if (STEP === 'replace') {
  const [ada] = await players('Investigators', BUILD, ['ada'])
  const dm = await run('dm', 'Approval', `A change at the table: Robert (account Chilly, investigator Pontius Aganus, a Scholar) had to leave before play started. Ada Quill takes his place:\n${heard([ada], ['ada'])}\nOn your desk: take Pontius Aganus off the table the way a real Lightkeeper would when a player drops out before the first session (decline the request if it is still pending, or remove him from the roster if he was approved). Note exactly what the site offers for this, what it asks you to confirm, and whether circle formation is affected. Then review Ada's join request (open her sheet first) and approve her, and welcome her at the table in a line. Make sure circle formation is open for all four players (Ada, Bram, Cass, Dev) and work out exactly what they have to do on their screens and what is left for you, without finishing it. Put plain step-by-step instructions in for_players, and tell the table in a line or two what happens next.\nWhat you did last turn: ${LAST.summary || '(read your memory file)'}`)
  return done({ players: [ada], dm, investigators: { ada: ada && ada.character_name } })
}

if (STEP === 'circle') {
  const EXTRA = {
    ada: 'Do your part of formation, checking what the site says about circles against the rulebook as you go.',
    bram: 'Do your part of formation on the phone.',
    cass: 'Do formation, trying the edges as you go: a circle name suggestion with emoji and very long text, voting fast twice, Enter twice.',
    dev: 'Propose a relationship to one investigator (Ada\'s, the newest at the table) and answer any proposed to you. Write part of the shared chapter house.',
  }
  const ps = await players('Circle', (p) => `The Lightkeeper has answered the join requests. Check what your screen shows WITHOUT reloading first (was the answer shown to you live?). Then: ${EXTRA[p]}\nThe Lightkeeper's instructions for formation: ${LAST.for_players || '(none: work it out from the site and the table)'}\nDiscuss shared choices with the table (node table.js read / say). Stop when your part of circle formation is done and the site is waiting on the Lightkeeper or on other players.`)
  return done({ players: ps })
}

if (STEP === 'ready') {
  const dm = await run('dm', 'Ready', `The players have done their part of circle formation:\n${A.heard || '(read the table and the site)'}\nFinish circle formation on your desk (seal the circle and its charter as the site asks). If a player's part is still missing, say so in 'blocked' and stop without sealing. Check the roster and the circle. Then prepare the assignment, The Drowned Choir (personas.md): send the first dispatch (Saltmere, the flats at low tide, dusk), set the hourglass at the start, and decide whether to show the countdown timer yet. Post the opening narration at the table (the circle walks out onto the flats as the bells start under the mud) and end it by asking each player for a first action AND naming the roll you want from each (one action each, suited to their investigator). Return the narration in opening and the players' rolls in prompts.`)
  return done({ dm })
}

if (STEP === 'round') {
  const n = A.round
  const P = {
    1: { ada: 'Check the dice pool, the gilded die and the result against the rulebook.', bram: 'Roll on the phone. Find the dice, the action and the drive without help.', cass: 'Double-click the roll button, and press Enter twice where there is a form. After the result shows, reload at once and check what survived.', dev: 'Use your Occultist abilities where they fit. Start the notebook for this case: a Markdown note (a heading, a list, bold) and a photograph of the flats (assets/mudflats_photo.jpg).' },
    2: { ada: 'Use a Scholar ability that fits and check its cost and effect against the rulebook. Read the pass note if one came.', bram: 'Answer any mark or offer on the phone; spend a drive point if it helps.', cass: 'Keyboard only this round: Tab, Enter, Space and Escape. Note what you cannot reach. Read the pass note if one came.', dev: 'Photograph the hymn sheet into the notebook (assets/hymn_sheet.jpg) and add an entry about it. Send a pass note to Ada\'s investigator.' },
    3: { ada: 'Check resistance, marks and any scar against the rulebook as they happen.', bram: 'Play the climax on the phone, under the timer.', cass: 'Mid-scene, go to the chapter hub and back to your desk; check nothing was lost. If a scar comes, take it through the scar flow.', dev: 'Use the circle page: spend a circle resource if the story allows.' },
  }[n] || {}
  const DM = {
    1: `Answer each player's roll in the story at the table. On your desk: give a mark to anyone who failed (Body, Brain or Bleed to fit the story) and say it at the table; make one open roll and one secret roll for the thing under the mud; raise the tension by one; send Ada's investigator a pass note (something only they heard in the bells); update the dispatch. Then move the story to scene 2, the choirmaster's lodging, and ask each player for their next action and roll.`,
    2: `Answer each player's action in the story. In the lodging, the hymn sheet and the locked music cabinet. On your desk: deal marks where rolls fail; if an investigator (Cass's, if the dice allow) takes a third mark of a kind, let the scar flow run on their screen; use one circle resource if it fits; and in the notebook, sketch a rough map of the flats and the bell tower with the sketch tools, quickly, the way you would improvise one at a real table (note what helped and what got in the way). Then move to scene 3: the tide is turning; start the countdown timer for the race through the mud; raise the tension. Ask each player for their action and roll.`,
    3: `The climax at the bell tower. Answer each player's action in the story and bring the assignment to its end by how the dice fell (the choir silenced, freed, or not). Lower the tension as the danger passes and stop the timer. Then open the assignment reports and tick the circle's Illumination questions on your Circle page. Tell the players at the table to file their reports. In prompts, ask each to file their report.`,
  }[n]
  const ps = await players(`Round ${n}`, (p) => `Round ${n} of The Drowned Choir. The Lightkeeper asks of you: ${asked(p)}\nWhat the site shows (from the Lightkeeper): ${LAST.state || '(look)'}\nSay what your investigator does at the table, then do it on the site. Also this round, as your persona: ${P[p] || 'play as your persona would.'}`)
  const dm = await run('dm', `Round ${n}`, `Round ${n} of The Drowned Choir. Story so far: ${LAST.story_so_far || '(read the table)'}\nWhat the players did:\n${heard(ps)}\n${DM}\nReturn prompts, story_so_far and state.`)
  return done({ players: ps, dm })
}

if (STEP === 'wrap') {
  const ps = await players('Wrap', (p) => `The story of The Drowned Choir is over. The Lightkeeper asks: ${asked(p)}\nFile your assignment report (your Illumination keys). ${p === 'cass' ? 'Then try to send it again (Enter twice, a second click) and check what is kept.' : p === 'dev' ? 'Write the closing note in the notebook.' : p === 'ada' ? 'Check the report against the key rule in the rulebook.' : 'Check the report form makes sense on the phone.'}`)
  const dm = await run('dm', 'Wrap', `The players filed their reports:\n${heard(ps)}\nOn your desk: the Circle page: read the report cards, check the page's Illumination total against the rule in FAQ.md, and add it with the page's button. Handle an advance if the track fills. Then End Assignment and handle what follows (resources refilling, ability uses resetting, spends between assignments). Tell the table what happens next on their screens. Return state and prompts.`)
  return done({ players: ps, dm })
}

if (STEP === 'after') {
  const ps = await players('After', (p) => `The assignment has ended. The Lightkeeper says: ${asked(p)}\nOn the site: take your advancements if offered (check the dialog, and what Later does), check your sheet after End Assignment (what reset, what stayed), look at the circle page and the notebook. ${p === 'cass' ? 'Spend a circle resource between assignments if offered, double-clicking as you do.' : ''}\nThen write your exit notes at the end of your memory file: the three things that worked best and the three that got most in the way, for your persona and your device.`)
  return done({ players: ps })
}

return { error: `unknown step '${STEP}'` }
