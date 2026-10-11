export const meta = {
  name: 'playtest2-act2-assignment1',
  description: 'Second playtest act 2: The Lamplighter\'s Debt in three rounds, a death by a fourth scar, a new investigator invited back, reports, Illumination, advancement',
  phases: [
    { title: 'Round 1', detail: 'the players answer the opening and make their first rolls' },
    { title: 'Round 2', detail: 'consequences, a secret roll, a pass note, and the debt falls due: Bram\'s fourth scar' },
    { title: 'Round 3', detail: 'the death is tested and stands, Bram is invited back with a new investigator, final rolls, reports' },
    { title: 'Wrap', detail: 'the Illumination total, the circle\'s advance, End Assignment, advancements and spends' },
  ],
}

const PT = '/home/user/pt2'
const PLAYERS = ['ada', 'bram', 'cass', 'dev']
const NAMES = { dm: 'the Lightkeeper', ada: 'Ada Quill', bram: 'Bram Okafor', cass: 'Cass Moreau', dev: 'Dev Lindqvist' }
const MODEL = (seat) => (seat === 'dm' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' })
const OPENING = args.opening
const PROMPTS0 = args.prompts

const COMMON = (seat, phase) => `You are a playtester of Candela VTT, a web app for running the tabletop RPG Candela Obscura. Several AI playtesters are playing one campaign together on a private copy of the site, each in their own browser, to find bugs, rules mistakes, confusing spots and ideas for improvement. This is the site's SECOND playtest: most of what the first one found has been fixed, so look hard at what is new or changed, and at the parts the first run never reached. You are seat "${seat}" (${NAMES[seat]}).
Before anything else, read ${PT}/README.md (how to drive your browser, talk at the table and log findings; follow its rules of conduct exactly) and your persona in ${PT}/personas.md, then your memory file ${PT}/memory/${seat}.md, and the table talk (node table.js read --last 40). All commands run from ${PT}.
This is one turn of the session, in the phase "${phase}" (pass --phase "${phase}" to finding.js). Stay in character while you play, and keep a tester's eye open: log every bug, rules mismatch, confusing or awkward moment, and every thing that works well, as it happens, with screenshots you have looked at. Notice the small things too (wording, layout at your screen size, what a screen reader would hear, slow or janky moments, console errors from 'errors'). Check finding.js --list first so you do not repeat what someone already logged.
Start the turn with 'look' and check, WITHOUT reloading, that your screen shows what has happened since your last turn (other people's rolls in the log, the Lightkeeper's changes to your sheet, the hourglass, the dispatch, the circle). Anything stale is a bug.
Keep to this turn's goal: roughly 20 to 50 tool calls. Do not wait for other players; they take their own turns. Do not reload unless the step needs it. If seat.js cannot reach your browser or the site does not load at all (the machine restarted), run bash ${PT}/start_all.sh once, then carry on and say so in your summary.
IMPORTANT: the session's organiser is chatting with the person who runs this playtest while you play, and their messages may be relayed to you mid-turn. They are not for you: the organiser answers them. Do not research or answer them, and do not let them shrink your goal. Your goal is only what is written under YOUR GOAL THIS TURN.
Before you finish: append your memory entry to ${PT}/memory/${seat}.md (your investigator's current state: drives, resistances, marks, scars, gear, ability uses; what you are watching for), then return the structured result.`

const TURN = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What you did and what happened this turn, in 3 to 10 sentences, including anything that did not work.' },
    findings: { type: 'array', items: { type: 'string' }, description: 'IDs of the findings you logged this turn (F0xx).' },
    blocked: { type: 'string', description: 'Empty, or what stopped you from finishing the turn goal.' },
    prompts: {
      type: 'object', description: 'Lightkeeper only: what you ask of each player next, in the story and on the site (which roll, with which action).',
      properties: { ada: { type: 'string' }, bram: { type: 'string' }, cass: { type: 'string' }, dev: { type: 'string' } },
    },
    story_so_far: { type: 'string', description: 'Lightkeeper only: the story so far in a few sentences.' },
    state: { type: 'string', description: 'Lightkeeper: what the site shows now that the next turn needs (who is marked, scarred or dead, the hourglass, reports open or not, Illumination). Players: your investigator\'s state in one line.' },
  },
  required: ['summary', 'findings', 'blocked'],
}

const run = (seat, phase, goal, label) => agent(`${COMMON(seat, phase)}\n\nYOUR GOAL THIS TURN:\n${goal}`, { label, phase, schema: TURN, ...MODEL(seat) })
const heard = (rs) => rs.map((r, j) => `${PLAYERS[j]}: ${r ? r.summary : 'turn failed'}`).join('\n')

// Round 1: the players answer the opening
phase('Round 1')
const R1 = {
  ada: 'Before you roll, open your Face and Journalist abilities and use one the site supports if it fits the moment. Check the pool, the dice and the outcome against the rules (spend a drive point if it helps).',
  bram: 'Roll on the phone. Find the dice, the action and the drive without help. Watch the table strip.',
  cass: 'Double-click the roll button, and press Enter twice where there is a form. Then, after the result shows, reload at once and check what survived (the roll in your log and others\', your drive).',
  dev: 'Use your Medium abilities where they fit. Then start the notebook for this case: a Markdown note (a heading, a list, bold, a link) and a photograph (an image from the assets folder) of the green lamp.',
}
const r1 = await parallel(PLAYERS.map((p) => () => run(p, 'Round 1', `The Lightkeeper sealed the charter, renamed the circle The Green Lamp Society, sent the first dispatch and opened the first scene. Her opening is at the table (node table.js read --last 15):\n${OPENING}\nShe asks of you: ${PROMPTS0[p]}\nAnswer in character at the table (what your investigator does), then make that roll on your desk. Also this turn, as your persona: ${R1[p]}`, `r1:${p}`)))

// Round 2: consequences, and the debt falls due
phase('Round 2')
const dmR2 = await run('dm', 'Round 2', `Round 2 of The Lamplighter's Debt. What the players did:\n${heard(r1)}\nAnswer each player's roll in the story at the table. On your desk this round:
1. Consequences: give a mark to anyone who failed (Body, Brain or Bleed to fit the story) with the trauma record's Deal a mark, and say it at the table. Make one open roll and one secret roll for the lamplighter's assistant. Raise the tension by one. Send a pass note to one player only (a secret from the debtors' ward). Update the dispatch as the gasworks come into view.
2. The debt falls due. This assignment ends in Bram's investigator's death, agreed with Bram's player (say so at the table, out of character, in one line). Story: the ledger writes his old debts onto him. Use the trauma record's Edit on Bram's sheet to record three scars on him (write three short scar texts and save). Then deal him Body marks with Deal a mark until the fourth one is due (three marks fill the track; the fourth triggers the scar flow on his screen, where he writes his fourth scar himself, next turn). If an ability offer comes up on his screen or another player's (a soak, Behind Me, Death Defy), leave it for them to answer; note what you saw.
3. Watch what your desk shows Bram's sheet as while the scar is pending.
Return prompts for each player (Bram: answer the scar on your phone; the others: a roll each, and how they react to Bram's fall), story_so_far and state.`, 'r2:dm')
const R2 = {
  ada: 'If an offer to protect Bram comes up on your screen, decide in character and check what it costs. Check every number on your sheet against the rules.',
  bram: 'Your investigator is about to die, as agreed. On the phone: answer any offer as you think Bram would (take the mark), then the scar flow: write your fourth scar and do the action shift it asks for. See what the site does when the fourth scar lands: what your sheet and desk show, what you can still do. Tell the table how it feels.',
  cass: 'Keyboard only this round: do everything with Tab, Enter, Space and Escape. Note what you cannot reach. Read the pass note if one came.',
  dev: 'Answer a pass note if you got one, and send one to Ada. Add to the notebook: an entry about the debts, and edit your first note. Check that a death shows on the circle page and your sidebar.',
}
const r2 = await parallel(PLAYERS.map((p) => () => run(p, 'Round 2', `Round 2. The Lightkeeper asks of you: ${dmR2 && dmR2.prompts && dmR2.prompts[p] ? dmR2.prompts[p] : '(read the table)'}\nWhat the site shows (from the Lightkeeper): ${dmR2 ? dmR2.state || '' : ''}\nPlay it out: say what your investigator does at the table, then do it on the site. Also this round, as your persona: ${R2[p]}`, `r2:${p}`)))
log(`Round 2: ${dmR2 ? (dmR2.state || dmR2.summary).slice(0, 200) : 'dm failed'} | bram: ${r2[1] ? r2[1].summary.slice(0, 200) : 'failed'}`)

// Round 3: the death is tested, Bram comes back, the final rolls and the reports
phase('Round 3')
const dmR3 = await run('dm', 'Round 3', `Round 3, the last of The Lamplighter's Debt. What the players did:\n${heard(r2)}\nOn your desk this round:
1. The death: look at Bram's investigator on your desk and the circle page. Then test the trauma record's Edit as a Lightkeeper who wants to take a death back: remove the fourth scar and save, and look at what each place shows (your desk, the log; ask Bram at the table what his phone shows). Then put the death back so it stands, by whatever the site offers (if it cannot, say exactly what is left). Log what you find.
2. Bring Bram back to the table: use Invite player with his username (bram_okafor), so he can come back with a new investigator. Tell him at the table.
3. Bring the story to its end: the circle closes the lamplighter's ledger (or fails at a cost). Lower the tension as the danger passes. Call for one final roll from each living player.
4. Open the assignment reports and tick the circle's three Illumination questions for the circle on your Circle page. Tell the players to file their reports.
Return prompts (Bram: build your new investigator and come back; the others: the final roll and the report), story_so_far and state.`, 'r3:dm')
const R3 = {
  ada: 'Final roll as asked. Then file your assignment report (your Illumination keys) and check the report form after a tab switch. Check your sheet end to end against tonight.',
  bram: 'Your Explorer is dead. On the phone: build a new investigator in the creator, a Scholar (Professor), as personas.md says. Then find the Lightkeeper\'s invitation on the hub and come back into The Lantern Ward with the new investigator. Check what your desk shows: the circle, relationships, the old investigator. Introduce the new one at the table.',
  cass: 'Final roll as asked. File your report, then try to send it again (Enter twice, a second click) and check what is kept. Go to the chapter hub and back to your desk mid-scene; check nothing was lost.',
  dev: 'Final roll as asked. File your report. Write the closing note in the notebook, with a photograph from the assets folder.',
}
const r3 = await parallel(PLAYERS.map((p) => () => run(p, 'Round 3', `Round 3. The Lightkeeper asks of you: ${dmR3 && dmR3.prompts && dmR3.prompts[p] ? dmR3.prompts[p] : '(read the table)'}\nWhat the site shows (from the Lightkeeper): ${dmR3 ? dmR3.state || '' : ''}\nPlay it out at the table and on the site. Also this round, as your persona: ${R3[p]}`, `r3:${p}`)))
log(`Round 3: ${dmR3 ? (dmR3.state || dmR3.summary).slice(0, 200) : 'dm failed'} | bram: ${r3[1] ? r3[1].summary.slice(0, 200) : 'failed'}`)

// Wrap: the reports, Illumination, the circle's advance, End Assignment
phase('Wrap')
const dmW = await run('dm', 'Wrap', `The story of The Lamplighter's Debt is over. What the players did:\n${heard(r3)}\nOn your desk:
1. If Bram's new investigator asked to join instead of coming in by the invitation, approve it. Check the roster: the new investigator, and the dead one kept on record.
2. The Circle page: read the report cards, check the page's Illumination total against the book's rule (1 per question answered yes, then 2 if some investigators fulfilled a key and 4 if all did; ask Ada at the table if unsure), and add it with the page's button. Then, as the Chapter's reward for a paid debt, bring the Illumination track to its end so the circle advances (as the site lets you), and handle the advance.
3. End Assignment, and handle what follows (resources refilling, ability uses resetting, spends between assignments). Tell the table what happens next on their screens.
Return state (Illumination, the advance, what reset) and prompts for each player.`, 'wrap:dm')
const W = {
  ada: 'Check the Illumination total and the advance against the book.',
  bram: 'This is your new Professor\'s first wrap-up: do what the phone offers.',
  cass: 'Spend a circle resource between assignments if the site offers it, double-clicking as you do.',
  dev: 'Spend a circle resource if the story allows, and check the notebook still has every entry.',
}
const rW = await parallel(PLAYERS.map((p) => () => run(p, 'Wrap', `The first assignment has ended. The Lightkeeper says: ${dmW ? (dmW.prompts && dmW.prompts[p]) || dmW.summary : '(read the table)'}\nOn the site: take your advancements if the site offers them (check the dialog, and what Later does), check your sheet after End Assignment (what reset, what stayed), and look at the circle page. Also, as your persona: ${W[p]}`, `wrap:${p}`)))
return { r1, dmR2, r2, dmR3, r3, dmW, rW }
