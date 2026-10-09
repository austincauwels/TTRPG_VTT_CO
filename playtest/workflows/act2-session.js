export const meta = {
  name: 'playtest-act2-session',
  description: 'Playtest act 2: the assignment in rounds, a stress beat, the wrap-up with advancement, and exit notes',
  phases: [
    { title: 'Scenes', detail: 'rounds of play: the Lightkeeper narrates and runs her tools, then the four players act' },
    { title: 'Stress', detail: 'one tester drives several seats at once: races, reconnects, second tabs' },
    { title: 'Wrap', detail: 'End Assignment, illumination, advancement, circle resources, exit notes' },
  ],
}

const PT = (args && args.pt) || '/path/to/playtest'  // set with Workflow args { pt }
const PLAYERS = ['ada', 'bram', 'cass', 'dev']
const NAMES = { dm: 'the Lightkeeper', ada: 'Ada Quill', bram: 'Bram Okafor', cass: 'Cass Moreau', dev: 'Dev Lindqvist', stress: 'the session\'s test engineer, not a player (you have no persona; read every memory file in memory/ to learn the state of each desk)' }
const SETUP = (args && args.setup) || {}

const COMMON = (seat, phase) => `You are a playtester of Candela VTT, a web app for running the tabletop RPG Candela Obscura. Several AI playtesters are playing one session together on a private copy of the site, each in their own browser, to find bugs, rules mistakes, confusing spots and ideas for improvement. You are seat "${seat}" (${NAMES[seat]}).
Before anything else, read ${PT}/README.md (how to drive your browser, talk at the table and log findings; follow its rules of conduct exactly) and your persona in ${PT}/personas.md, then your memory file ${PT}/memory/${seat}.md, and the table talk (node table.js read --last 40). All commands run from ${PT}.
This is one turn of the session, in the phase "${phase}" (pass --phase "${phase}" to finding.js). Stay in character while you play, and keep a tester's eye open: log every bug, rules mismatch, confusing or awkward moment, and every thing that works well, as it happens, with screenshots you have looked at. Notice the small things too (wording, layout at your screen size, what a screen reader would hear, slow or janky moments, console errors from 'errors'). Check finding.js --list first so you do not repeat what someone already logged.
Start the turn with 'look' and check, WITHOUT reloading, that your screen shows what has happened since your last turn (other people's rolls in the log, the Lightkeeper's changes to your sheet, the hourglass, the dispatch). Anything stale is a bug.
Keep to this turn's goal: roughly 15 to 45 tool calls. Do not wait for other players; they take their own turns.
Before you finish: append your memory entry to ${PT}/memory/${seat}.md, then return the structured result.`

const TURN = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What you did and what happened this turn, in 3 to 10 sentences, including anything that did not work.' },
    findings: { type: 'array', items: { type: 'string' }, description: 'IDs of the findings you logged this turn (F0xx).' },
    blocked: { type: 'string', description: 'Empty, or what stopped you from finishing the turn goal.' },
    prompts: {
      type: 'object', description: 'Lightkeeper only: what you ask of each player this round, in the story and on the site (which roll, with which action).',
      properties: { ada: { type: 'string' }, bram: { type: 'string' }, cass: { type: 'string' }, dev: { type: 'string' } },
    },
    story_so_far: { type: 'string', description: 'Lightkeeper only: the story so far in a few sentences.' },
    end_assignment_ready: { type: 'boolean', description: 'Lightkeeper only: true when the story has reached its end and the assignment can be closed.' },
  },
  required: ['summary', 'findings', 'blocked'],
}

const run = (seat, phase, goal, label) => agent(`${COMMON(seat, phase)}\n\nYOUR GOAL THIS TURN:\n${goal}`, { label, phase, schema: TURN })

// What each round must exercise on the site, on top of the story. The Lightkeeper weaves
// these in; the players get theirs with their prompt.
const ROUNDS = [
  {
    dm: 'Answer what each player said they do first. Call for one roll from each player, with an action that suits what they do. Make your own roll for a non-player character, once openly and once as a secret roll. Raise the tension by one when the bell is first heard. Write a short scene note in the notebook if the Lightkeeper has one.',
    ada: 'Roll as asked, spending a drive point if it helps. Check the pool, the dice and the outcome against the rules.',
    bram: 'Roll as asked on the phone. Find the dice, the action and the drive without help.',
    cass: 'Roll as asked, but double-click the roll button, and press Enter twice where there is a form.',
    dev: 'Roll as asked, then start the shared notebook: a first note in Markdown (a heading, a list, bold, a link) about the harbour office.',
  },
  {
    dm: 'Consequences: give a mark to anyone who failed last round (choose Body, Brain or Bleed to fit the story), and tell them at the table. Call for a roll where someone can push: suggest gilded dice or burning resistance if it fits. Send a pass note to one player only (a secret the widow told them). Update the dispatch conditions as the fog thickens.',
    ada: 'If you have a mark or an injured ally, use what your Doctor can do (Patch Up, Resuscitation, or another ability the site offers). Burn resistance to reroll if a roll goes badly, and check what it costs.',
    bram: 'Try a gilded die or resistance if the site offers it. Check your marks after the Lightkeeper gives them: did your sheet change by itself?',
    cass: 'Halfway through your roll, reload the page (rolling, then reload at once). Check what survived. Later, take your network down for 30 seconds (offline on, wait with a Monitor or a short until loop, offline off) and see how the desk copes.',
    dev: 'Answer a pass note if you got one, and send one to Ada. Use your Weird abilities on the site where they fit (a ritual, a ward). Add a sketch to the notebook on the sketch sheet (draw the bell tower).',
  },
  {
    dm: 'The tide turns in the flooded crypt: set the countdown timer beside the hourglass (about 3 minutes), show it to the players and start it. Raise the tension. Call for a group effort: everyone rolls to get out before the water rises. Give marks for failures. If someone reaches three marks of a kind, a scar is due: follow the site\'s scar flow.',
    ada: 'Roll fast, watch the timer, and check what the site does when it runs out. Check that every desk agrees on the time (ask at the table).',
    bram: 'Roll on the phone while the timer runs. Can you see the timer and the hourglass on the phone? Use the drawer if needed.',
    cass: 'Open the site in a second tab during this round (newtab), see what the site says about two tabs, and use "Use this tab" or what it offers, then go back to the first tab.',
    dev: 'Use the circle page: look at the resources (Stitch, Refresh, Train) and their help text, and spend one if the story allows. Check the map too.',
  },
  {
    dm: 'Climax at the bell. Raise the tension to the top. Call for the hardest rolls of the night. By accident, record a scar on the wrong investigator (or with the wrong text), then put it right with the trauma record\'s Edit on your copy of their sheet. Give the Illumination track the points the story earned (as the site lets you).',
    ada: 'Go for a critical: spend drive for a big pool. If an ally is down, try Resuscitation. Check the Lightkeeper\'s scar correction reached your desk by itself.',
    bram: 'Take the big swing your Soldier would. If you take a scar, choose its text and the action ratings it shifts on the phone.',
    cass: 'Keyboard only this round: do everything with Tab, Enter, Space and Escape. Note what you cannot reach.',
    dev: 'Record the climax in the notebook; edit an earlier note; check that everyone sees the notes.',
  },
  {
    dm: 'Resolve the bell. Bring the story to its end in this round: the circle stops the ringing (or fails at a cost). Lower the tension as the danger passes. When the story is done, set end_assignment_ready to true.',
    ada: 'Final roll as asked. Then check your sheet end to end against what happened tonight: drives, resistances, marks, scars, ability uses.',
    bram: 'Final roll as asked. Then check your sheet on the phone: is everything that happened tonight on it?',
    cass: 'Final roll as asked. Go to the chapter hub and back to your desk; check nothing was lost.',
    dev: 'Final roll as asked. Write the closing note in the notebook.',
  },
]

phase('Scenes')
const rounds = []
// Round 0: the players answer the opening narration and check that the end of circle
// formation reached them
const first = await parallel(PLAYERS.map((p) => () => run(p, 'Scenes', `The Lightkeeper sealed the circle's charter, sent the first dispatch and opened the first scene. Her notes for you: ${SETUP.for_players || '(read the table)'}\nHer opening narration is at the table (node table.js read --last 15): read it, then answer it in character: say what your investigator does first. If what you do calls for a roll, say which action you would use, but wait for the Lightkeeper to call for the roll. Your desk is now unlocked: get to know your sheet, the circle page, the notebook and the map as your persona would, and log what you find.`, `round0:${p}`)))
rounds.push({ dm: { story_so_far: 'The circle, The Ninth Night, has arrived at the fog-bound harbour office of Saint Aldric at dusk. Harbourmaster Wendell Pike showed them a crew photograph with a gap where someone forgotten stood, and said the drowned bell rings when the tide is full at nine.' }, players: first })
for (let i = 0; i < ROUNDS.length; i++) {
  const cue = ROUNDS[i]
  const last = rounds[rounds.length - 1]
  const heard = last.players.map((r, j) => `${PLAYERS[j]}: ${r ? r.summary : 'turn failed'}`).join('\n')
  const dm = await run('dm', 'Scenes', `Round ${i + 1} of ${ROUNDS.length} of The Drowned Bell of Saint Aldric. Story so far: ${last.dm && last.dm.story_so_far}\nWhat the players did last:\n${heard}\nRun this round as the Lightkeeper: narrate at the table, do on your desk what the round needs, and ask each player for something. This round must also use: ${cue.dm}\nReturn prompts for each player (the story and the roll you want), and story_so_far.`, `round${i + 1}:dm`)
  const players = await parallel(PLAYERS.map((p) => () => run(p, 'Scenes', `Round ${i + 1}. The Lightkeeper asks of you: ${dm && dm.prompts && dm.prompts[p] ? dm.prompts[p] : '(read the table)'}\nPlay it out: say what your investigator does at the table, then do it on the site (roll, spend, use abilities, take or record what happens). Also this round, as your persona: ${cue[p]}`, `round${i + 1}:${p}`)))
  rounds.push({ dm, players })
  log(`Round ${i + 1}: ${dm ? dm.summary.slice(0, 160) : 'dm failed'}`)
  if (dm && dm.end_assignment_ready && i >= 3) break
}

phase('Stress')
const stress = await agent(`${COMMON('stress', 'Stress')}\n\nTHIS TURN IS SPECIAL: you are a test engineer at the table between scenes, allowed to drive EVERY seat (dm, ada, bram, cass, dev) with seat.js, to test what happens when things happen at the same time. Do not change anyone's story choices; use small, harmless actions (rolls, drive changes you then put back, notes, the hourglass up then down). Try each of these, record exactly what each desk shows after (look on every seat involved), and log a finding for anything that disagrees between desks, gets stuck or is lost:
1. Three players roll at the same moment (write one script that clicks three seats' roll buttons within 100 ms of each other, using chromium.connectOverCDP to each seat's CDP port from seats.json, or run seat.js commands in parallel with &).
2. The Lightkeeper raises the hourglass while a player is mid-roll.
3. The Lightkeeper changes a player's mark on her copy of the sheet at the same moment the player changes their drive.
4. A player's network drops (offline on) while the Lightkeeper gives them a mark; the network comes back (offline off): does their sheet catch up?
5. The phone seat (bram) reloads in the middle of a gilded choice or an ability prompt, if one is open.
6. Two tabs of the same player: what each tab shows after a roll.
Put every desk back as it was (same tension, no leftover tabs). Log findings with --seat stress.`, { label: 'stress', phase: 'Stress', schema: TURN })

phase('Wrap')
const dmEnd = await run('dm', 'Wrap', `The story is over. On your desk: make sure the Illumination track reflects the assignment (fill it if the story earned it, so the circle can advance), then End Assignment, and handle what follows on the site (the circle's advance, resources refilling, ability uses resetting). Tell the table what happens next on their screens.`, 'wrap:dm')
const playersEnd = await parallel(PLAYERS.map((p) => () => run(p, 'Wrap', `The assignment has ended. ${dmEnd ? dmEnd.summary : ''}\nOn the site: take your advancements if the site offers them, check your sheet after End Assignment (what reset, what stayed), and look at the circle page. Then write your exit notes as your persona: log 3 to 6 findings (kind idea, ux or praise) on the session as a whole: what got in the way most, what you wished the site did, what you would keep exactly as it is. Say goodbye at the table.`, `wrap:${p}`)))
const dmExit = await run('dm', 'Wrap', `Last turn: check every player's sheet on your desk after the advancements, and the circle page. Then write your exit notes as the Lightkeeper: log 3 to 6 findings (kind idea, ux or praise) on running a session on this site: what slowed the table down, what you missed, what you would keep exactly as it is. Close the session at the table.`, 'exit:dm')
return { rounds, stress, dmEnd, playersEnd, dmExit }
