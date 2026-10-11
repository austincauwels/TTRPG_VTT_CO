export const meta = {
  name: 'playtest2-act1-setup',
  description: 'Second playtest act 1: sign-up, investigators, join requests (one rejected), password reset, circle formation, the seal, the opening',
  phases: [
    { title: 'Campaign', detail: 'the Lightkeeper signs up and creates The Lantern Ward' },
    { title: 'Investigators', detail: 'four players sign up, build investigators and ask to join (Cass with two)' },
    { title: 'Approval', detail: 'the Lightkeeper approves four, rejects one, opens circle formation' },
    { title: 'Circle', detail: 'password reset for Bram, then each player does their part of formation' },
    { title: 'Ready', detail: 'seal, rename the circle, dispatch from the template, the opening and the first rolls' },
  ],
}

const PT = '/home/user/pt2'
const PLAYERS = ['ada', 'bram', 'cass', 'dev']
const NAMES = { dm: 'the Lightkeeper', ada: 'Ada Quill', bram: 'Bram Okafor', cass: 'Cass Moreau', dev: 'Dev Lindqvist' }
const MODEL = (seat) => (seat === 'dm' ? { model: 'opus', effort: 'high' } : { model: 'sonnet', effort: 'medium' })

const COMMON = (seat, phase) => `You are a playtester of Candela VTT, a web app for running the tabletop RPG Candela Obscura. Several AI playtesters are playing one campaign together on a private copy of the site, each in their own browser, to find bugs, rules mistakes, confusing spots and ideas for improvement. This is the site's SECOND playtest: most of what the first one found has been fixed, so look hard at what is new or changed, and at the parts the first run never reached. You are seat "${seat}" (${NAMES[seat]}).
Before anything else, read ${PT}/README.md (how to drive your browser, talk at the table and log findings; follow its rules of conduct exactly) and your persona in ${PT}/personas.md, then your memory file ${PT}/memory/${seat}.md if it exists, and the table talk (node table.js read --last 40). All commands run from ${PT}.
This is one turn of the session, in the phase "${phase}" (pass --phase "${phase}" to finding.js). Stay in character as your persona while you play, and keep a tester's eye open: log every bug, rules mismatch, confusing or awkward moment, and every thing that works well, as it happens, with screenshots you have looked at. Notice the small things too (wording, layout at your screen size, what a screen reader would hear, slow or janky moments, console errors from 'errors'). Check finding.js --list first so you do not repeat what someone already logged.
Keep to this turn's goal: roughly 20 to 50 tool calls. Do not wait for other players; they take their own turns. Do not reload your page unless the step needs it (see the README). If seat.js cannot reach your browser or the site does not load at all (the machine restarted), run bash ${PT}/start_all.sh once, then carry on and say so in your summary.
Before you finish: append your memory entry to ${PT}/memory/${seat}.md (create it if needed): what you did, your investigator's state, your password if it changed, what you are watching for. Then return the structured result.`

const TURN = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'What you did and what happened this turn, in 3 to 10 sentences, including anything that did not work.' },
    findings: { type: 'array', items: { type: 'string' }, description: 'IDs of the findings you logged this turn (F0xx).' },
    blocked: { type: 'string', description: 'Empty, or what stopped you from finishing the turn goal.' },
    campaign_code: { type: 'string' },
    character_name: { type: 'string', description: 'Players: your investigator (Cass: both, main first).' },
    role_specialty: { type: 'string' },
    joined: { type: 'boolean' },
    for_players: { type: 'string', description: 'Lightkeeper only: what the players need to do next on the site, in plain steps.' },
    opening: { type: 'string', description: 'Lightkeeper only: the opening narration you posted.' },
    prompts: {
      type: 'object', description: 'Lightkeeper only (Ready): the first thing you ask of each player, in the story and on the site (which roll, with which action).',
      properties: { ada: { type: 'string' }, bram: { type: 'string' }, cass: { type: 'string' }, dev: { type: 'string' } },
    },
  },
  required: ['summary', 'findings', 'blocked'],
}

const run = (seat, phase, goal, label) => agent(`${COMMON(seat, phase)}\n\nYOUR GOAL THIS TURN:\n${goal}`, { label: label || `${phase}:${seat}`, phase, schema: TURN, ...MODEL(seat) })

phase('Campaign')
const dm1 = await run('dm', 'Campaign', `You arrive at the site for the first time on this copy (a fresh database). Create your Lightkeeper account through the sign-up form (username lightkeeper_rue). Create a campaign for your group named "The Lantern Ward". Note the campaign code the players will need. Open your Lightkeeper's desk and get to know it again: what changed since the first playtest, what is clear, what is not (the roster, the circle, the dispatch and its template, the hourglass and timer, the notebook, the map, pass notes, the activity log, the Invite player control). Do not start the story yet. When you have the code, tell the table: node table.js say dm "Welcome back, investigators. Join The Lantern Ward with the code <code>." Return the code in campaign_code.`, 'campaign:dm')
log(`Campaign: ${dm1 && dm1.campaign_code} ${dm1 && dm1.blocked ? 'BLOCKED: ' + dm1.blocked : ''}`)
if (!dm1 || !dm1.campaign_code) return { stage: 'campaign', dm1 }

phase('Investigators')
const ROLE = {
  ada: 'Face (Journalist)',
  bram: 'Muscle (Explorer). Sign up with the email bram.okafor@hollincross.net (not the example.test one); it matters later',
  cass: 'Slink (Detective). Then, in the same turn, build a SECOND investigator, a Face (Magician), quickly and a bit carelessly as Cass would, and send a join request with it too, "to see which one Rue picks". Note on the site what it tells you about two requests',
  dev: 'Weird (Medium)',
}
const players1 = await parallel(PLAYERS.map((p) => () => run(p, 'Investigators', `You are joining a new Candela Obscura campaign. The Lightkeeper's campaign code is ${dm1.campaign_code} (also on the table: node table.js read). Create your account through the sign-up form (username as in personas.md). Then build your investigator in the site's character creator as your persona would: a ${ROLE[p]}. Choose a name, look and story, abilities, actions and drives as the creator asks, and anything else it offers (portrait, pen font, gear...). The creator was reworked since the first playtest: judge it hard. Then join the campaign with the code and see what the site tells you while you wait for the Lightkeeper's approval (does your hub notice the approval by itself?). Introduce your investigator at the table in one or two lines (node table.js say ${p} "..."). Return character_name, role_specialty and joined (true if the site shows your join request was sent).`, `create:${p}`)))
players1.forEach((r, i) => log(`${PLAYERS[i]}: ${r ? `${r.character_name} (${r.role_specialty}) joined=${r.joined}${r.blocked ? ' BLOCKED: ' + r.blocked : ''}` : 'no result'}`))

phase('Approval')
const roster = players1.map((r, i) => `${PLAYERS[i]}: ${r ? `${r.character_name}, ${r.role_specialty}, join sent=${r.joined}; ${r.blocked ? 'blocked: ' + r.blocked : ''}` : 'turn failed'}`).join('\n')
const dm2 = await run('dm', 'Approval', `Your players have made investigators and asked to join The Lantern Ward (code ${dm1.campaign_code}):\n${roster}\nOn your desk, review the join requests (open each sheet first, as a careful Lightkeeper would). Approve one investigator per player: Ada's Journalist, Bram's Explorer, Dev's Medium and Cass's Detective. Cass sent a second request with a Magician: REJECT that one, and tell the table why in character (one investigator per player at your table). Check what your desk shows after the rejection. Then start circle formation and work out exactly what the players have to do on their screens and what is left for you, without finishing it. Put plain step-by-step instructions for the players in for_players, and tell the table in a line or two what happens next.`, 'approve:dm')

phase('Circle')
const EXTRA = {
  ada: 'Check the formation rules against the book as you vote (ties, what wins, what the seal will take). Write part of the shared chapter house.',
  bram: 'FIRST, before formation: pretend you forgot your password. Sign out, use "Forgot your password?", open your email with node mail.js bram.okafor@hollincross.net, follow the reset link in your browser and set the new password correct-horse-battery-staple-2, then sign in with it. Write the new password in your memory file. Log anything confusing on the phone. Then do your part of formation.',
  cass: 'First look at what the site tells you about your rejected Magician (where is it now, can you still use it?). Then do formation, trying the edges: a circle name suggestion with emoji and very long text, the same name in other capitals, voting fast twice.',
  dev: 'Propose relationships to two investigators and answer any proposed to you. Write part of the shared chapter house too.',
}
const players2 = await parallel(PLAYERS.map((p) => () => run(p, 'Circle', `The Lightkeeper has looked at the join requests. Check what your screen shows now WITHOUT reloading first (was the answer to your request shown to you live?). Then: ${EXTRA[p]}\nThe Lightkeeper's instructions for formation: ${dm2 ? dm2.for_players : '(none: work it out from the site and the table)'}\nDiscuss with the table where the site asks for a shared choice (node table.js read / say). Stop when your part of circle formation is done and the site is waiting on the Lightkeeper.`, `circle:${p}`)))

phase('Ready')
const dm3 = await run('dm', 'Ready', `The players have done their part of circle formation:\n${players2.map((r, i) => `${PLAYERS[i]}: ${r ? r.summary : 'turn failed'}`).join('\n')}\nFinish circle formation on your desk (seal the circle and its charter as the site asks); check the roster and the circle. Then the Chapter sends word that the circle shall be known by another name: change the circle's name with its Edit and check that the new name reaches the players (look at the activity log). Prepare to play the first assignment, The Lamplighter's Debt: send the first dispatch using the dispatch template (Wick Street, Hollin Cross, after midnight; conditions as you like), make sure the hourglass is at the start, and decide whether to show a countdown timer. Post the opening narration at the table (the circle arrives on Wick Street as the lamps turn green) and end it by asking each player for a first action AND naming the roll you want from each (one action each, suited to their investigator). Return the narration in opening and the roll you asked of each player in prompts.`, 'ready:dm')
return { code: dm1.campaign_code, dm1, players1, dm2, players2, dm3 }
