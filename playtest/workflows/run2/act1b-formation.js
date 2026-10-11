export const meta = {
  name: 'playtest2-act1b-formation',
  description: 'Second playtest act 1 (rest): approvals and one rejection, circle formation, the seal, rename, dispatch, the opening and first rolls',
  phases: [
    { title: 'Approval', detail: 'the Lightkeeper approves four, rejects one, opens circle formation' },
    { title: 'Circle', detail: 'each player does their part of formation' },
    { title: 'Ready', detail: 'seal, rename the circle, dispatch from the template, the opening and the first rolls' },
  ],
}

const PT = '/home/user/pt2'
const PLAYERS = ['ada', 'bram', 'cass', 'dev']
const NAMES = { dm: 'the Lightkeeper', ada: 'Ada Quill', bram: 'Bram Okafor', cass: 'Cass Moreau', dev: 'Dev Lindqvist' }
const MODEL = (seat) => (seat === 'dm' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' })

const COMMON = (seat, phase) => `You are a playtester of Candela VTT, a web app for running the tabletop RPG Candela Obscura. Several AI playtesters are playing one campaign together on a private copy of the site, each in their own browser, to find bugs, rules mistakes, confusing spots and ideas for improvement. This is the site's SECOND playtest: most of what the first one found has been fixed, so look hard at what is new or changed, and at the parts the first run never reached. You are seat "${seat}" (${NAMES[seat]}).
Before anything else, read ${PT}/README.md (how to drive your browser, talk at the table and log findings; follow its rules of conduct exactly) and your persona in ${PT}/personas.md, then your memory file ${PT}/memory/${seat}.md, and the table talk (node table.js read --last 40). All commands run from ${PT}.
This is one turn of the session, in the phase "${phase}" (pass --phase "${phase}" to finding.js). Stay in character as your persona while you play, and keep a tester's eye open: log every bug, rules mismatch, confusing or awkward moment, and every thing that works well, as it happens, with screenshots you have looked at. Notice the small things too (wording, layout at your screen size, what a screen reader would hear, slow or janky moments, console errors from 'errors'). Check finding.js --list first so you do not repeat what someone already logged.
Keep to this turn's goal: roughly 20 to 50 tool calls. Do not wait for other players; they take their own turns. Do not reload your page unless the step needs it (see the README). If seat.js cannot reach your browser or the site does not load at all (the machine restarted), run bash ${PT}/start_all.sh once, then carry on and say so in your summary.
IMPORTANT: the session's organiser is chatting with the person who runs this playtest while you play, and their messages may be relayed to you mid-turn (for example a question about something on the hub). They are not for you: the organiser answers them. Do not research or answer them, and do not let them shrink your goal. Your goal is only what is written under YOUR GOAL THIS TURN. In the last turn several seats stopped to answer such a question and skipped their goal; do not repeat that.
Before you finish: append your memory entry to ${PT}/memory/${seat}.md: what you did, your investigator's state, what you are watching for. Then return the structured result.`

const TURN = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What you did and what happened this turn, in 3 to 10 sentences, including anything that did not work.' },
    findings: { type: 'array', items: { type: 'string' }, description: 'IDs of the findings you logged this turn (F0xx).' },
    blocked: { type: 'string', description: 'Empty, or what stopped you from finishing the turn goal.' },
    for_players: { type: 'string', description: 'Lightkeeper only: what the players need to do next on the site, in plain steps.' },
    opening: { type: 'string', description: 'Lightkeeper only: the opening narration you posted.' },
    circle_name: { type: 'string', description: 'Lightkeeper only (Ready): the circle name after your Edit.' },
    prompts: {
      type: 'object', description: 'Lightkeeper only (Ready): the first thing you ask of each player, in the story and on the site (which roll, with which action).',
      properties: { ada: { type: 'string' }, bram: { type: 'string' }, cass: { type: 'string' }, dev: { type: 'string' } },
    },
  },
  required: ['summary', 'findings', 'blocked'],
}

const run = (seat, phase, goal, label) => agent(`${COMMON(seat, phase)}\n\nYOUR GOAL THIS TURN:\n${goal}`, { label: label || `${phase}:${seat}`, phase, schema: TURN, ...MODEL(seat) })

phase('Approval')
const dm2 = await run('dm', 'Approval', `Five join requests wait on your desk for The Lantern Ward (code lantern-ward): Ada Quill (Ada's Face, Journalist), Bram Okafor (Bram's Muscle, Explorer), Dev Lindqvist (Dev's Weird, Medium), and two from Cass: "Cass *Moreau* ..." (her Slink, Detective) and Mina Vale (a Face, Magician). Your last turn was spent answering an off-table question, so none is answered yet.
Review each request (open each sheet first, as a careful Lightkeeper would). Approve one investigator per player: Ada's, Bram's, Dev's and Cass's Detective. REJECT Mina Vale, and tell the table why in character (one investigator per player at your table). Check what your desk shows after the rejection. Then start circle formation and work out exactly what the players have to do on their screens and what is left for you, without finishing it. Put plain step-by-step instructions for the players in for_players, and tell the table in a line or two what happens next.`, 'approve:dm')
log(`Approval: ${dm2 ? dm2.summary.slice(0, 200) : 'failed'}${dm2 && dm2.blocked ? ' BLOCKED: ' + dm2.blocked : ''}`)

phase('Circle')
const EXTRA = {
  ada: 'Check the formation rules against the book as you vote (ties, what wins, what the seal will take). Write part of the shared chapter house.',
  bram: 'You already reset your password last turn (your memory file has the new one). Now do your part of formation on the phone.',
  cass: 'First look at what the site tells you about your rejected Magician, Mina Vale (where is it now, can you still use it?). Then do formation, trying the edges: a circle name suggestion with emoji and very long text, the same name in other capitals, voting fast twice.',
  dev: 'Propose relationships to two investigators and answer any proposed to you. Write part of the shared chapter house too.',
}
const players2 = await parallel(PLAYERS.map((p) => () => run(p, 'Circle', `The Lightkeeper has now answered the join requests. Check what your screen shows WITHOUT reloading first (was the answer shown to you live?). Then: ${EXTRA[p]}\nThe Lightkeeper's instructions for formation: ${dm2 && dm2.for_players ? dm2.for_players : '(none: work it out from the site and the table)'}\nDiscuss with the table where the site asks for a shared choice (node table.js read / say). Stop when your part of circle formation is done and the site is waiting on the Lightkeeper.`, `circle:${p}`)))
players2.forEach((r, i) => log(`${PLAYERS[i]}: ${r ? r.summary.slice(0, 160) : 'no result'}${r && r.blocked ? ' BLOCKED: ' + r.blocked : ''}`))

phase('Ready')
const dm3 = await run('dm', 'Ready', `The players have done their part of circle formation:\n${players2.map((r, i) => `${PLAYERS[i]}: ${r ? r.summary : 'turn failed'}`).join('\n')}\nFinish circle formation on your desk (seal the circle and its charter as the site asks); check the roster and the circle. Then the Chapter sends word that the circle shall be known by another name: change the circle's name with its Edit and check that the new name reaches the players (look at the activity log). Prepare to play the first assignment, The Lamplighter's Debt: send the first dispatch using the dispatch template (Wick Street, Hollin Cross, after midnight; conditions as you like), make sure the hourglass is at the start, and decide whether to show a countdown timer. Post the opening narration at the table (the circle arrives on Wick Street as the lamps turn green) and end it by asking each player for a first action AND naming the roll you want from each (one action each, suited to their investigator). Return the narration in opening, the circle's name in circle_name and the roll you asked of each player in prompts.`, 'ready:dm')
log(`Ready: ${dm3 ? dm3.summary.slice(0, 200) : 'failed'}`)
return { dm2, players2, dm3 }
