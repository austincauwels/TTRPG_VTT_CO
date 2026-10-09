export const meta = {
  name: 'playtest-act1-setup',
  description: 'Playtest act 1: Lightkeeper and four players set up the campaign through the site, logging findings',
  phases: [
    { title: 'Campaign', detail: 'the Lightkeeper signs up and creates the campaign' },
    { title: 'Investigators', detail: 'four players sign up, build investigators and join' },
    { title: 'Approval', detail: 'the Lightkeeper approves and opens circle formation' },
    { title: 'Circle', detail: 'players do their part of circle formation' },
    { title: 'Ready', detail: 'the Lightkeeper finalizes the circle and sets the first dispatch' },
  ],
}

const PT = (args && args.pt) || '/path/to/playtest'  // set with Workflow args { pt }
const PLAYERS = ['ada', 'bram', 'cass', 'dev']
const NAMES = { dm: 'the Lightkeeper', ada: 'Ada Quill', bram: 'Bram Okafor', cass: 'Cass Moreau', dev: 'Dev Lindqvist' }

const COMMON = (seat, phase) => `You are a playtester of Candela VTT, a web app for running the tabletop RPG Candela Obscura. Several AI playtesters are playing one session together on a private copy of the site, each in their own browser, to find bugs, rules mistakes, confusing spots and ideas for improvement. You are seat "${seat}" (${NAMES[seat]}).
Before anything else, read ${PT}/README.md (how to drive your browser, talk at the table and log findings; follow its rules of conduct exactly) and your persona in ${PT}/personas.md, then your memory file ${PT}/memory/${seat}.md if it exists, and the table talk (node table.js read --last 40). All commands run from ${PT}.
This is one turn of the session, in the phase "${phase}" (pass --phase "${phase}" to finding.js). Stay in character as your persona while you play, and keep a tester's eye open: log every bug, rules mismatch, confusing or awkward moment, and every thing that works well, as it happens, with screenshots you have looked at. Notice the small things too (wording, layout at your screen size, what a screen reader would hear, slow or janky moments, console errors from 'errors').
Keep to this turn's goal: roughly 15 to 45 tool calls. Do not wait for other players; they take their own turns. Do not reload your page unless the step needs it (see the README).
Before you finish: append your memory entry to ${PT}/memory/${seat}.md (create it if needed), then return the structured result.`

const TURN = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What you did and what happened this turn, in 3 to 10 sentences, including anything that did not work.' },
    findings: { type: 'array', items: { type: 'string' }, description: 'IDs of the findings you logged this turn (F0xx).' },
    blocked: { type: 'string', description: 'Empty, or what stopped you from finishing the turn goal.' },
    campaign_code: { type: 'string' },
    character_name: { type: 'string' },
    role_specialty: { type: 'string' },
    joined: { type: 'boolean' },
    for_players: { type: 'string', description: 'Lightkeeper only: what the players need to do next on the site, in plain steps.' },
    opening: { type: 'string', description: 'Lightkeeper only: the opening narration you posted.' },
  },
  required: ['summary', 'findings', 'blocked'],
}

const run = (seat, phase, goal, label) => agent(`${COMMON(seat, phase)}\n\nYOUR GOAL THIS TURN:\n${goal}`, { label: label || `${phase}:${seat}`, phase, schema: TURN })

phase('Campaign')
const dm1 = await run('dm', 'Campaign', `You arrive at the site for the first time. Create your Lightkeeper account through the sign-up form (username lightkeeper_rue). Find your way to creating a campaign for your group: name it "The Drowned Bell". Note the campaign code the players will need to join. Open your Lightkeeper's desk and get to know it: what is there, what is clear, what is not (the roster, the circle, the notebook, the map, the hourglass and its timer switch, the dispatch, pass notes, the activity log). Do not start the story yet. When you have the code, tell the table: node table.js say dm "Welcome, investigators. Join The Drowned Bell with the code <code>." Return the code in campaign_code.`, 'campaign:dm')
log(`Campaign: ${dm1 && dm1.campaign_code} ${dm1 && dm1.blocked ? 'BLOCKED: ' + dm1.blocked : ''}`)
if (!dm1 || !dm1.campaign_code) return { stage: 'campaign', dm1 }

phase('Investigators')
const ROLE = { ada: 'Scholar (Doctor)', bram: 'Muscle (Soldier)', cass: 'Slink (Criminal)', dev: 'Weird (Occultist)' }
const players1 = await parallel(PLAYERS.map((p) => () => run(p, 'Investigators', `You are joining a new Candela Obscura game. The Lightkeeper's campaign code is ${dm1.campaign_code} (also on the table: node table.js read). Create your account through the sign-up form (username as in personas.md). Then build your investigator in the site's character creator as your persona would: a ${ROLE[p]}, with a name, look and story you choose, choosing abilities, actions and drives as the creator asks, and anything else it offers (portrait, pen font, relationships...). Pay close attention to the creator: it is meant to be the best-designed part of the site, so judge it hard. Then join the campaign with the code and see what the site tells you while you wait for the Lightkeeper's approval. Introduce your investigator at the table in one or two lines (node table.js say ${p} "..."). Return character_name, role_specialty and joined (true if the site shows your join request was sent).`, `create:${p}`)))
players1.forEach((r, i) => log(`${PLAYERS[i]}: ${r ? `${r.character_name} (${r.role_specialty}) joined=${r.joined}${r.blocked ? ' BLOCKED: ' + r.blocked : ''}` : 'no result'}`))

phase('Approval')
const roster = players1.map((r, i) => `${PLAYERS[i]}: ${r ? `${r.character_name}, ${r.role_specialty}, join sent=${r.joined}; ${r.blocked ? 'blocked: ' + r.blocked : ''}` : 'turn failed'}`).join('\n')
const dm2 = await run('dm', 'Approval', `Four players have made investigators and asked to join The Drowned Bell (code ${dm1.campaign_code}):\n${roster}\nOn your Lightkeeper's desk, review the join requests and approve each investigator (look at each sheet first, as a careful Lightkeeper would). Then find out how this site forms the circle (circle formation: the circle's name, questions, the charter...), and start it. Work out exactly what the players have to do on their screens for circle formation, and what is left for you, without finishing it yet. Put plain step-by-step instructions for the players in for_players, and tell the table in a line or two what happens next.`, 'approve:dm')

phase('Circle')
const players2 = await parallel(PLAYERS.map((p) => () => run(p, 'Circle', `The Lightkeeper has looked at the join requests. Check what your screen shows now WITHOUT reloading first (was your approval shown to you live?). Then take part in circle formation as the site asks. The Lightkeeper's instructions: ${dm2 ? dm2.for_players : '(none: work it out from the site and the table)'}\nDiscuss with the table where the site asks for a shared choice (node table.js read / say). Explore your own desk too: your sheet, the circle page, the notebook, and whatever the phone drawer or tablet layout shows you. Stop when your part of circle formation is done and the site is waiting on the Lightkeeper.`, `circle:${p}`)))

phase('Ready')
const dm3 = await run('dm', 'Ready', `The players have done their part of circle formation:\n${players2.map((r, i) => `${PLAYERS[i]}: ${r ? r.summary : 'turn failed'}`).join('\n')}\nFinish circle formation on your desk (finalize the circle and its charter as the site asks), check that the roster and the circle look right. Then prepare to play: send the first dispatch for the assignment The Drowned Bell of Saint Aldric (location and conditions, as the site lets you), make sure the hourglass is at the start, and decide whether to show the countdown timer. Post the opening narration of the first scene at the table (the circle arrives at the fog-bound harbour office of Saint Aldric at dusk) and end it by asking each player what their investigator does first. Return the opening narration in opening.`, 'ready:dm')
return { dm1, players1, dm2, players2, dm3 }