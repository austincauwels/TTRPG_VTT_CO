export const meta = {
  name: 'playtest3-play',
  description: 'Third playtest on beta: one step of the session (args.step), at most four AI seats, Robert plays his own seat between steps',
  whenToUse: 'Each step of the third playtest, in order: campaign, investigators, approval, circle, ready, round (1 to 3), wrap, after',
  phases: [
    { title: 'Players', detail: 'bram, cass and dev (Sonnet 5.5, medium) take their turns at once' },
    { title: 'Lightkeeper', detail: 'the Lightkeeper (Opus 5.5, high) answers everyone, Robert included' },
  ],
}

// args (real JSON, never a placeholder string):
//   step     'campaign' | 'investigators' | 'approval' | 'circle' | 'ready' | 'round' | 'wrap' | 'after'
//   round    1, 2 or 3 (step 'round' only)
//   code     the campaign code (from 'campaign' on)
//   robert   { username, investigator, role }: what Robert made (from 'approval' on; fields may be empty)
//   last     the previous step's Lightkeeper result ({ prompts, story_so_far, state, for_players, opening }), or null
//   heard    step 'ready' only: the circle step's player summaries, as one string
//   note     anything the organiser wants every seat to know this step (Robert's move is already at the table)
//   extra    { seat: text } added to that seat's goal this step
// Save what this returns as /home/user/pt3/results/<step><round>.json and pass its 'dm' as 'last' next time.

const PT = '/home/user/pt3'
const AI = ['bram', 'cass', 'dev']
const NAMES = { dm: 'the Lightkeeper', bram: 'Bram Okafor', cass: 'Cass Moreau', dev: 'Dev Lindqvist' }
const MODEL = (seat) => (seat === 'dm' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' })
const A = args || {}
const STEP = A.step
const LAST = A.last || {}
const R = A.robert || {}
const ROBERT = R.username ? `Robert (username ${R.username}${R.investigator ? `, investigator ${R.investigator}` : ''}${R.role ? `, ${R.role}` : ''})` : 'Robert'
const CODE = A.code || '(read it at the table: node table.js read)'

const COMMON = (seat, phase) => `You are a playtester of Candela VTT, a web app for running the tabletop RPG Candela Obscura. A Lightkeeper and four players are playing one campaign together on the app's beta site, each in their own browser, to find bugs, rules mistakes, confusing spots and ideas for improvement. This is the THIRD playtest: much of what the earlier two found has been fixed, so look hard at everything with fresh eyes. You are seat "${seat}" (${NAMES[seat]}). One player, ${ROBERT}, is a real person at his own desktop: the organiser posts his table talk as ROBERT lines. Never drive his browser, never make his choices, and answer him in character like anyone else at the table.
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
    character_name: { type: 'string', description: 'Players, step investigators: your investigator\'s name.' },
    for_players: { type: 'string', description: 'Lightkeeper: what the players need to do next on the site, in plain steps.' },
    for_robert: { type: 'string', description: 'Lightkeeper: what you ask of Robert next, in the story and on the site (which roll with which action, or what to do), in two or three plain sentences he can act on without reading the table.' },
    opening: { type: 'string', description: 'Lightkeeper, step ready: the opening narration you posted.' },
    prompts: {
      type: 'object', description: 'Lightkeeper: what you ask of each AI player next, in the story and on the site (which roll, with which action).',
      properties: { bram: { type: 'string' }, cass: { type: 'string' }, dev: { type: 'string' } },
    },
    story_so_far: { type: 'string', description: 'Lightkeeper: the story so far in a few sentences.' },
  },
  required: ['summary', 'findings', 'blocked'],
}

const run = (seat, phase, goal) => agent(`${COMMON(seat, phase)}\n\nYOUR GOAL THIS TURN:\n${goal}${A.note ? `\nFrom the organiser: ${A.note}` : ''}${A.extra && A.extra[seat] ? `\nAlso this turn: ${A.extra[seat]}` : ''}`, { label: `${phase}:${seat}`, phase: seat === 'dm' ? 'Lightkeeper' : 'Players', schema: TURN, ...MODEL(seat) })
const players = (phase, goalFor) => parallel(AI.map((p) => () => run(p, phase, goalFor(p))))
const heard = (rs) => rs.map((r, j) => `${AI[j]}: ${r ? `${r.summary}${r.blocked ? ` (blocked: ${r.blocked})` : ''}` : 'turn failed'}`).join('\n')
const asked = (p) => (LAST.prompts && LAST.prompts[p]) || '(read the table: node table.js read --last 20)'
const ROBERT_NOW = `Robert's moves since your last turn are the ROBERT lines at the table (node table.js read --last 30). If he has not posted anything new, carry on without him and keep his part open for next round; never act or roll for him.`
const done = (out) => { log(`${STEP}${A.round || ''}: ${out.dm ? (out.dm.state || out.dm.summary || '').slice(0, 240) : 'no Lightkeeper turn'}`); return out }

if (STEP === 'campaign') {
  const dm = await run('dm', 'Campaign', `You arrive at the beta site. Create your Lightkeeper account through the sign-up form (username lightkeeper_rue_r3); if it already exists (it was made on 12 October, password as in README.md), sign in instead. Create the campaign "The Saltmere Chapter". Note the campaign code the players will need. Open your Lightkeeper's desk and get to know it again: what changed since your last playtest, what is clear, what is not (the roster, the circle, the dispatch and its template, the hourglass and timer, the notebook and its sketch tools, pass notes, the activity log). Do not start the story yet. Then tell the table: node table.js say dm "Welcome, investigators. Join The Saltmere Chapter with the code <code>." Return the code in campaign_code, and in for_robert the steps a new player takes to join (sign up, build an investigator, join with the code), as the site shows them.`)
  return done({ dm, code: dm && dm.campaign_code })
}

if (STEP === 'investigators') {
  const ROLE = { bram: 'Muscle (Soldier)', cass: 'Slink (Criminal)', dev: 'Weird (Occultist)' }
  const ps = await players('Investigators', (p) => `You are joining a new Candela Obscura campaign, The Saltmere Chapter. The code is ${CODE}. Create your account through the sign-up form (username as in personas.md). Build your investigator in the site's character creator as your persona would: a ${ROLE[p]}. Choose a name, look and story, abilities, actions and drives as the creator asks, and anything else it offers (portrait, pen font, gear). Then join the campaign with the code and see what the site tells you while you wait for the Lightkeeper's approval (does your hub notice the approval by itself?). Introduce your investigator at the table in one or two lines (node table.js say ${p} "..."). Return character_name.`)
  return done({ players: ps, investigators: Object.fromEntries(ps.map((r, i) => [AI[i], r && r.character_name])) })
}

if (STEP === 'approval') {
  const dm = await run('dm', 'Approval', `Your players have built investigators and asked to join The Saltmere Chapter (code ${CODE}): Bram, Cass and Dev (their introductions are at the table), and ${ROBERT}. On your desk, review the join requests (open each sheet first, as a careful Lightkeeper would) and approve one investigator per player, Robert's included. If Robert's request is not there yet, approve the others, say so in 'blocked', and do not wait. Welcome each investigator at the table in a line. Then start circle formation and work out exactly what the players have to do on their screens and what is left for you, without finishing it. Put plain step-by-step instructions in for_players, the same for Robert in for_robert, and tell the table in a line or two what happens next.`)
  return done({ dm })
}

if (STEP === 'circle') {
  const EXTRA = {
    bram: 'Do your part of formation on the phone.',
    cass: 'Do formation, trying the edges as you go: a circle name suggestion with emoji and very long text, voting fast twice, Enter twice.',
    dev: 'Propose a relationship to one investigator (Robert\'s if his is on the roster; he answers it himself) and answer any proposed to you. Write part of the shared chapter house.',
  }
  const ps = await players('Circle', (p) => `The Lightkeeper has answered the join requests. Check what your screen shows WITHOUT reloading first (was the answer shown to you live?). Then: ${EXTRA[p]}\nThe Lightkeeper's instructions for formation: ${LAST.for_players || '(none: work it out from the site and the table)'}\nRobert does his part of formation himself; discuss shared choices with the table (node table.js read / say) and leave room for his vote. Stop when your part of circle formation is done and the site is waiting on the Lightkeeper or on Robert.`)
  return done({ players: ps })
}

if (STEP === 'ready') {
  const dm = await run('dm', 'Ready', `The players have done their part of circle formation:\n${A.heard || '(read the table and the site)'}\n${ROBERT_NOW}\nFinish circle formation on your desk (seal the circle and its charter as the site asks). If Robert's part is still missing, say so in 'blocked' and stop without sealing. Check the roster and the circle. Then prepare the assignment, The Drowned Choir (personas.md): send the first dispatch (Saltmere, the flats at low tide, dusk), set the hourglass at the start, and decide whether to show the countdown timer yet. Post the opening narration at the table (the circle walks out onto the flats as the bells start under the mud) and end it by asking each player, Robert included, for a first action AND naming the roll you want from each (one action each, suited to their investigator). Return the narration in opening, the AI players' rolls in prompts and Robert's in for_robert.`)
  return done({ dm })
}

if (STEP === 'round') {
  const n = A.round
  const P = {
    1: { bram: 'Roll on the phone. Find the dice, the action and the drive without help.', cass: 'Double-click the roll button, and press Enter twice where there is a form. After the result shows, reload at once and check what survived.', dev: 'Use your Occultist abilities where they fit. Start the notebook for this case: a Markdown note (a heading, a list, bold) and a photograph of the flats (assets/mudflats_photo.jpg).' },
    2: { bram: 'Answer any mark or offer on the phone; spend a drive point if it helps.', cass: 'Keyboard only this round: Tab, Enter, Space and Escape. Note what you cannot reach. Read the pass note if one came.', dev: 'Photograph the hymn sheet into the notebook (assets/hymn_sheet.jpg) and add an entry about it. Send a pass note to Robert\'s investigator.' },
    3: { bram: 'Play the climax on the phone, under the timer.', cass: 'Mid-scene, go to the chapter hub and back to your desk; check nothing was lost. If a scar comes, take it through the scar flow.', dev: 'Use the circle page: spend a circle resource if the story allows.' },
  }[n] || {}
  const DM = {
    1: `Answer each player's roll in the story at the table, Robert's included. On your desk: give a mark to anyone who failed (Body, Brain or Bleed to fit the story) and say it at the table; make one open roll and one secret roll for the thing under the mud; raise the tension by one; send Robert's investigator a pass note (something only they heard in the bells); update the dispatch. Then move the story to scene 2, the choirmaster's lodging, and ask each player for their next action and roll.`,
    2: `Answer each player's action in the story. In the lodging, the hymn sheet and the locked music cabinet. On your desk: deal marks where rolls fail; if an AI investigator (Cass's, if the dice allow) takes a third mark of a kind, let the scar flow run on their screen; use one circle resource if it fits; and in the notebook, sketch a rough map of the flats and the bell tower with the sketch tools, quickly, the way you would improvise one at a real table (note what helped and what got in the way). Then move to scene 3: the tide is turning; start the countdown timer for the race through the mud; raise the tension. Ask each player for their action and roll.`,
    3: `The climax at the bell tower. Answer each player's action in the story and bring the assignment to its end by how the dice fell (the choir silenced, freed, or not). Lower the tension as the danger passes and stop the timer. Then open the assignment reports and tick the circle's Illumination questions on your Circle page. Tell the players at the table to file their reports. In prompts and for_robert, ask each to file their report.`,
  }[n]
  const ps = await players(`Round ${n}`, (p) => `Round ${n} of The Drowned Choir. The Lightkeeper asks of you: ${asked(p)}\nWhat the site shows (from the Lightkeeper): ${LAST.state || '(look)'}\nSay what your investigator does at the table, then do it on the site. Also this round, as your persona: ${P[p] || 'play as your persona would.'}`)
  const dm = await run('dm', `Round ${n}`, `Round ${n} of The Drowned Choir. Story so far: ${LAST.story_so_far || '(read the table)'}\nWhat the AI players did:\n${heard(ps)}\n${ROBERT_NOW}\n${DM}\nReturn prompts (the AI players), for_robert (Robert), story_so_far and state.`)
  return done({ players: ps, dm })
}

if (STEP === 'wrap') {
  const ps = await players('Wrap', (p) => `The story of The Drowned Choir is over. The Lightkeeper asks: ${asked(p)}\nFile your assignment report (your Illumination keys). ${p === 'cass' ? 'Then try to send it again (Enter twice, a second click) and check what is kept.' : p === 'dev' ? 'Write the closing note in the notebook.' : 'Check the report form makes sense on the phone.'}`)
  const dm = await run('dm', 'Wrap', `The players filed their reports:\n${heard(ps)}\n${ROBERT_NOW} (Robert files his own report; if his has not arrived, say so in 'blocked' and do not end the assignment yet.)\nOn your desk: the Circle page: read the report cards, check the page's Illumination total against the rule in FAQ.md, and add it with the page's button. Handle an advance if the track fills. Then End Assignment and handle what follows (resources refilling, ability uses resetting, spends between assignments). Tell the table what happens next on their screens. Return state, prompts and for_robert.`)
  return done({ players: ps, dm })
}

if (STEP === 'after') {
  const ps = await players('After', (p) => `The assignment has ended. The Lightkeeper says: ${asked(p)}\nOn the site: take your advancements if offered (check the dialog, and what Later does), check your sheet after End Assignment (what reset, what stayed), look at the circle page and the notebook. ${p === 'cass' ? 'Spend a circle resource between assignments if offered, double-clicking as you do.' : ''}\nThen write your exit notes at the end of your memory file: the three things that worked best and the three that got most in the way, for your persona and your device.`)
  return done({ players: ps })
}

return { error: `unknown step '${STEP}'` }
