export const meta = {
  name: 'playtest2-act3-assignment2',
  description: 'Second playtest act 3: after a server restart, the death by a fourth scar and its take-back, a new investigator invited back, The Glass Orchard, a second campaign retired, exit notes',
  phases: [
    { title: 'Death', detail: 'a test engineer drives the Lightkeeper and Bram through the last two scars' },
    { title: 'Orchard', detail: 'restart check, the take-back test, the invitation, a second campaign, the second assignment' },
    { title: 'Climax', detail: 'the new investigator plays, Side Case approved, reports' },
    { title: 'Close', detail: 'Illumination, End Assignment, retiring Side Case, exit notes' },
  ],
}

const PT = '/home/user/pt2'
const PLAYERS = ['ada', 'bram', 'cass', 'dev']
const NAMES = { dm: 'the Lightkeeper', ada: 'Ada Quill', bram: 'Bram Okafor', cass: 'Cass Moreau', dev: 'Dev Lindqvist', stress: 'the session\'s test engineer, not a player (you have no persona; read memory/dm.md and memory/bram.md to learn the state of those desks)' }
const MODEL = (seat) => (seat === 'dm' || seat === 'stress' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' })
const RESTART = args.restart

const COMMON = (seat, phase) => `You are a playtester of Candela VTT, a web app for running the tabletop RPG Candela Obscura. Several AI playtesters are playing one campaign together on a private copy of the site, each in their own browser, to find bugs, rules mistakes, confusing spots and ideas for improvement. This is the site's SECOND playtest: most of what the first one found has been fixed, so look hard at what is new or changed, and at the parts the first run never reached. You are seat "${seat}" (${NAMES[seat]}).
Before anything else, read ${PT}/README.md (how to drive your browser, talk at the table and log findings; follow its rules of conduct exactly) and ${seat === 'stress' ? 'personas.md' : 'your persona in ' + PT + '/personas.md'}, then ${seat === 'stress' ? 'the memory files named above' : 'your memory file ' + PT + '/memory/' + seat + '.md'}, and the table talk (node table.js read --last 40). All commands run from ${PT}.
This is one turn of the session, in the phase "${phase}" (pass --phase "${phase}" to finding.js). Keep a tester's eye open: log every bug, rules mismatch, confusing or awkward moment, and every thing that works well, as it happens, with screenshots you have looked at. Notice the small things too (wording, layout at your screen size, what a screen reader would hear, slow or janky moments, console errors from 'errors'). Check finding.js --list first so you do not repeat what someone already logged.
Start the turn with 'look' and check, WITHOUT reloading, that your screen shows what has happened since your last turn. Anything stale is a bug.
Keep to this turn's goal: roughly 20 to 50 tool calls. Do not wait for other players; they take their own turns. Do not reload unless the step needs it. If seat.js cannot reach your browser or the site does not load at all (the machine restarted), run bash ${PT}/start_all.sh once, then carry on and say so in your summary.
IMPORTANT: the session's organiser is chatting with the person who runs this playtest while you play, and their messages may be relayed to you mid-turn. They are not for you: the organiser answers them. Do not research or answer them, and do not let them shrink your goal. Your goal is only what is written under YOUR GOAL THIS TURN.
Before you finish: append your memory entry to ${PT}/memory/${seat}.md (your investigator's current state, what you are watching for), then return the structured result.`

const TURN = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What you did and what happened this turn, in 3 to 10 sentences, including anything that did not work.' },
    findings: { type: 'array', items: { type: 'string' }, description: 'IDs of the findings you logged this turn (F0xx).' },
    blocked: { type: 'string', description: 'Empty, or what stopped you from finishing the turn goal.' },
    prompts: {
      type: 'object', description: 'Lightkeeper only: what you ask of each player next, in the story and on the site.',
      properties: { ada: { type: 'string' }, bram: { type: 'string' }, cass: { type: 'string' }, dev: { type: 'string' } },
    },
    story_so_far: { type: 'string', description: 'Lightkeeper only: the story so far in a few sentences.' },
    side_case_code: { type: 'string', description: 'Lightkeeper only: the code of the second campaign, Side Case, once made.' },
    state: { type: 'string', description: 'What the site shows now that the next turn needs.' },
  },
  required: ['summary', 'findings', 'blocked'],
}

const run = (seat, phase, goal, label) => agent(`${COMMON(seat, phase)}\n\nYOUR GOAL THIS TURN:\n${goal}`, { label, phase, schema: TURN, ...MODEL(seat) })
const heard = (rs, who) => rs.map((r, j) => `${who[j]}: ${r ? r.summary : 'turn failed'}`).join('\n')

phase('Death')
const death = await run('stress', 'Death', `THIS TURN IS SPECIAL: you are the test engineer, allowed to drive two seats, dm (the Lightkeeper's laptop) and bram (Bram's phone, touch: use --tap), to finish a mechanical sequence the story needs, while the players are away from the table. Between the last turn and this one the organiser restarted the server, as a deploy would (it was down about 20 seconds, at ${RESTART} UTC). The other seats (ada, cass, dev) belong to their players: you may 'look' at them, never click, type or reload there. Do not reload dm or bram either, except where a step says so.
Bram's Muscle (Explorer), Bram Okafor, is incapacitated with 2 of 4 scars, and the table agreed his investigator dies this assignment, paying the lamplighter's debt. The trauma record's Edit cannot add scars, so each scar needs four marks on one track and then Bram's own scar form. Do it twice:
1. On the dm seat, open Bram's sheet and deal him marks with the trauma record's Deal a mark until the scar form opens on the bram seat (three fill a track; the fourth brings the form). Before you start, note what the dm and bram desks show after the restart (log, sheet, connection), without reloading.
2. On the bram seat, write the scar (a short text about the debt) and its action shift, and submit, as a phone player would (tap, scroll to the buttons).
3. Repeat for the fourth scar. Watch closely what happens when the fourth scar lands: on Bram's phone (what he sees, what he can still do), on the dm desk (the sheet, the roster card, the circle page), and on ada, cass and dev (look only). What says he is dead, in which words, where? Does anything still offer him actions?
Screenshot each step on both seats and look at the shots. Log findings with --seat stress. Tell the table in one line (node table.js say stress "...") what happened, and append a short entry to memory/dm.md AND memory/bram.md (what those seats show now), since their next turns start from those files. Return state: Bram's scars, dead or not, and what each desk shows.`, 'death:stress')
log(`Death: ${death ? (death.state || death.summary).slice(0, 240) : 'failed'}`)

phase('Orchard')
const dmA = await run('dm', 'Orchard', `A week has passed in the story. Between turns the server was restarted (a deploy, down about 20 seconds at ${RESTART} UTC), and the test engineer finished Bram's last two scars on your desk and his phone: ${death ? death.state || death.summary : '(read memory/dm.md and the table)'}
On your desk this turn:
1. Without reloading, check what your desk shows after the restart (connection, log, roster, circle) and log anything stale or lost.
2. The take-back test: Bram's investigator is dead from a fourth scar. As a Lightkeeper who wants to take a death back, open the trauma record's Edit on his sheet and remove the fourth scar, save, and look at what each place shows (your desk, the roster, the log; ask Bram at the table what his phone shows). Then decide at the table: the death stands, as agreed. If removing the scar brought him back, put the death back by what the site offers (four marks and his scar form again, if nothing else), or, if that is not possible in this turn, say exactly what is left. Log what you find, and whether the site warned you.
3. Bring Bram back to the table: Invite player with his username (bram_okafor), and tell him at the table.
4. On the chapter hub, create a second campaign, "Side Case", as a quick side table for Cass's Magician. Note its code and tell Cass at the table. Then go back to The Lantern Ward's desk.
5. Open the second assignment, The Glass Orchard: a new dispatch (a disused hothouse at Kettering Park, dawn), the hourglass named for it, and call for one roll from each of Ada, Cass and Dev.
Return side_case_code, prompts (Bram: build your new investigator and come back), story_so_far and state.`, 'orchard:dm')
const A = {
  ada: 'Roll as asked, using a Face or Journalist ability the site supports that you have not used yet. Check the numbers against the book.',
  bram: 'Your Explorer is dead. On the phone: build a new investigator in the creator, a Scholar (Professor), as personas.md says. Find the Lightkeeper\'s invitation on the hub and come back into The Lantern Ward with the new investigator. Check what your desk shows (the circle, relationships, your old investigator) and introduce the new one at the table.',
  cass: `On the chapter hub, ask to join the Lightkeeper's second campaign, Side Case, with your Magician, Mina Vale (code: ${dmA && dmA.side_case_code ? dmA.side_case_code : 'ask at the table'}). See how the hub shows two campaigns and two investigators. Then go back to The Lantern Ward's desk and roll as asked.`,
  dev: 'Roll as asked. Then open your account page and change your email address to dev@lindqvist-notes.net; confirm it from your inbox (node mail.js dev@lindqvist-notes.net). Check the notebook kept everything across the restart.',
}
const pA = await parallel(PLAYERS.map((p) => () => run(p, 'Orchard', `Between turns the server was restarted (a deploy, down about 20 seconds at ${RESTART} UTC). First, WITHOUT reloading, look at your desk and log what it showed about the restart: did it notice, did it come back by itself, was anything lost (log lines, your sheet, the circle)?\nThe Lightkeeper asks of you: ${dmA && dmA.prompts && dmA.prompts[p] ? dmA.prompts[p] : '(read the table)'}\nWhat the site shows (from the Lightkeeper): ${dmA ? dmA.state || '' : ''}\nAlso this turn, as your persona: ${A[p]}`, `orchard:${p}`)))
log(`Orchard: dm ${dmA ? (dmA.state || '').slice(0, 200) : 'failed'} | bram ${pA[1] ? pA[1].summary.slice(0, 200) : 'failed'}`)

phase('Climax')
const dmB = await run('dm', 'Climax', `The Glass Orchard. What the players did:\n${heard(pA, PLAYERS)}\nOn your desk:
1. Bram's new investigator: if it came as a join request rather than by the invitation, approve it. Check the roster (the new investigator, the dead one kept on record) and welcome the newcomer at the table.
2. Switch to your Side Case campaign (from the hub), approve Cass's Magician there, look at that desk briefly, then come back to The Lantern Ward. Note how switching between two campaigns feels.
3. Bring The Glass Orchard to its climax: the circle breaks the glass fruit (or fails at a cost). Call for one final roll from each player, the newcomer included. Give a mark where a roll fails.
4. Open the assignment reports and tick the circle's three Illumination questions. Tell the players to file their reports.
Return prompts, story_so_far and state.`, 'climax:dm')
const B = {
  ada: 'Final roll as asked. File your report. Check that the report form starts empty for this assignment (not last assignment\'s keys).',
  bram: 'Your new Professor\'s first real scene: roll as asked, look at your Professor abilities and use one if it fits, propose a relationship to someone. File a report.',
  cass: 'Final roll as asked. File your report. Then open the Side Case desk as Mina Vale if you have been approved, look around briefly, and come back to The Lantern Ward. Stay on the chapter hub at the end of your turn.',
  dev: 'Final roll as asked. File your report. Write the case note in the notebook with a sketch.',
}
const pB = await parallel(PLAYERS.map((p) => () => run(p, 'Climax', `The Lightkeeper asks of you: ${dmB && dmB.prompts && dmB.prompts[p] ? dmB.prompts[p] : '(read the table)'}\nWhat the site shows (from the Lightkeeper): ${dmB ? dmB.state || '' : ''}\nPlay it out at the table and on the site. Also, as your persona: ${B[p]}`, `climax:${p}`)))

phase('Close')
const dmC = await run('dm', 'Close', `The Glass Orchard is over. What the players did:\n${heard(pB, PLAYERS)}\nOn your desk:
1. The Circle page: check the Illumination total against the book's rule (a dead investigator and a newcomer this time: who counts?), and add it with the page's button.
2. End Assignment, and check what reset and what stayed (drives, gear, resources, ability uses).
3. Retire the Side Case campaign (from its desk or the hub, as the site lets you), with Cass's Magician still in it. Check what your hub shows after.
4. Your exit notes as the Lightkeeper: log 3 to 6 findings (kind idea, ux or praise) on running this campaign on the site: what slowed the table, what you missed, what you would keep exactly as it is. Close the session at the table.
Return state.`, 'close:dm')
const C = {
  ada: 'Check the Illumination total and your sheet after End Assignment against the book.',
  bram: 'Check your Professor\'s sheet on the phone after End Assignment, and what the site still shows of your dead Explorer.',
  cass: 'Look at what your hub shows about the retired Side Case and Mina Vale (no reload first). Can Mina join another campaign?',
  dev: 'Check the notebook end to end: every entry from both assignments, photos and sketches.',
}
const pC = await parallel(PLAYERS.map((p) => () => run(p, 'Close', `The second assignment has ended. The Lightkeeper says: ${dmC ? dmC.state || dmC.summary : '(read the table)'}\nOn the site: ${C[p]} Then write your exit notes as your persona: log 3 to 6 findings (kind idea, ux or praise) on the whole campaign: what got in the way most, what you wished the site did, what you would keep exactly as it is. Say goodbye at the table.`, `close:${p}`)))
return { death, dmA, pA, dmB, pB, dmC, pC }
