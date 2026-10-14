# Running the fourth playtest (for the chat that organises it)

Four AI players and an AI Lightkeeper on beta (https://candela-beta.gatergrid.com), build main 1bc48a0. No human seat.

## Stages
- A and B, local (`workflows/run4/recheck-side.js`, work folder `/home/user/pt4`): six re-checkers of PRs 61, 68, 70, 71 against the control 2d86b77, and three side checks (advancement near 12, scars to death, timed windows and a server restart). `up.sh`, `down.sh`, `restart_api.sh` start private servers from the worktrees `/home/user/wt/main` and `/home/user/wt/control` (frontend built in `dist`). `decisions.md` lists what is decided and the calls kept as built.
- C, blind play on beta (`workflows/run4p/play.js`, folder `/home/user/play4`): `bash run4/setup.sh 1bc48a0`, then `bash /home/user/play4/start_all.sh` (must say "site pages: 200"). Steps, one workflow each: campaign, investigators, approval, circle, ready, round 1 to 3, wrap, after. Pass `args` as real JSON and the previous step's `dm` as `last`. Save each result as `/home/user/play4/results/<step><round>.json`.
- D, triage, verify on local copies, report, issues (adapt `workflows/run3/triage3.js`, `verify3.js`, `report3.js`).

## Before C
- Beta must serve 1bc48a0. Check by fetching the page's JavaScript chunks and grepping for a string only that build has (for example "Press again to end the assignment."), with `-u "$CANDELA_BETA_USER:$CANDELA_BETA_PASS"`.
- `env | grep -c CANDELA_BETA` must say 2 (plain environment variables, never a network secret).

## Safety
`SYNC_TRAILER="<trailer lines>" bash run4/sync.sh` after every step or two, and at least hourly.
