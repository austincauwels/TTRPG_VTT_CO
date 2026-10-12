# Running the third playtest (for the chat that organises it)

Robert plays one seat himself; the AI plays the Lightkeeper (dm), bram, cass and dev. The
site is beta, https://candela-beta.gatergrid.com, on Robert's server. Nothing runs locally
but the seats' browsers.

## Before play

1. `curl -s -o /dev/null -w '%{http_code}' https://candela-beta.gatergrid.com/` must say 200.
   Since 12 October the password is a network secret named `candela_beta` (Basic auth): the
   proxy adds it, so the seats need no `CANDELA_BETA_*` variables. If it says 401, Robert
   checks the secret in the environment settings. Never ask for the password.
2. Ask Robert which commit beta runs (PR 48's merge into `main`, if he deployed it), then
   `bash <harness>/playtest/run3/setup.sh <commit>`. It fills `/home/user/pt3`, puts the
   source at `/home/user/sut` and writes `build.txt`.
3. `bash /home/user/pt3/start_all.sh`. It must say "site pages: 200".
   Checked on 12 October without the password: on beta only the pages ask for it;
   `/api/...` answers 200 and `/ws/...` upgrades (101) without it, so the seats' WebSockets
   need nothing extra.
4. Ask Robert which browser he uses and write it into `memory/robert.md` (create it). Ask him
   to sign in on beta and say what the hub shows.

## The loop

`playtest/workflows/run3/play.js`, one step per workflow, at most four agents each (the
Lightkeeper on Opus 5.5 high, the players on Sonnet 5.5 medium). Pass `args` as real JSON.
Save each result to `/home/user/pt3/results/<step><round>.json` and pass its `dm` as `last`.

| step | agents | Robert, between steps |
|---|---|---|
| campaign | dm | gets the code; signs up, builds his investigator, asks to join |
| investigators | bram, cass, dev | (same, at the same time) |
| approval | dm | gets `for_robert`: his part of circle formation |
| circle | bram, cass, dev | does his formation part; pass their summaries as `heard` to ready |
| ready | dm | gets his first ask (`for_robert`) and does it |
| round 1, 2, 3 | 3 players, then dm | after each: his next ask; he plays it |
| wrap | 3 players, then dm | files his report before wrap (round 3 asks for it) |
| after | bram, cass, dev | takes his advancements, gives his exit notes |

Each time Robert tells the chat what he says or does:
`node table.js say robert "..."` (his words, lightly tidied, never invented). Anything he notices:
`node finding.js --seat robert --kind ... --sev ... --title "..." ...` with what he said.
Tell him clearly when it is his move and what the Lightkeeper asked of him.

`args` example for round 2:
```json
{ "step": "round", "round": 2, "code": "<code>", "robert": { "username": "<his>", "investigator": "<name>", "role": "<role>" }, "last": { "prompts": {}, "state": "", "story_so_far": "" } }
```

## Keeping it safe

- `SYNC_TRAILER="<the session's trailer lines>" bash <harness>/playtest/run3/sync.sh` after
  every step or two, and at least hourly. It copies findings, talk, notes, results and the
  screenshots findings use into `results/<date>-run3/` and pushes `playtest-harness`.
- A worker restart closes the seats: run `start_all.sh` again. The browsers keep their
  sign-ins in `profiles/`, but desks need reopening.
- If Robert deploys mid-play, the seats' pages drop and reconnect: that is fine to log as
  what happened, not as a bug, unless something is lost.

## After play

Triage, verification and the report as in run 2 (`playtest/workflows/run2/triage.js`,
`verify.js`, `report.js`): change `PT` to `/home/user/pt3`, the build commit, and the
context (one assignment, Robert's seat, beta). Verification runs on local copies at the
same commit, never on beta. Then file issues per STATUS.md.
