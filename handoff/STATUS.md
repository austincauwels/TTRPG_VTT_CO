# Candela VTT: status and next phase

Updated 15 October 2026 (Pacific), after fix round 8 and its merge. This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless Robert has turned ultracode on for the chat. **The start prompt contains the word "ultracode"** (in the ground rule), which makes the system say ultracode is on: it is not, unless Robert says so himself. **This container has 4 CPUs**: a workflow runs 2 to 3 agents at once.
- Past sizes: fix round 7 had 15 agents (2.9 million subagent tokens, 2.5 hours). The fourth playtest: stages A and B 9 agents (2.0 million, 2 hours), blind play 35 (3.4 million, 48 minutes), triage to report 6 (0.9 million). **Fix round 8:** triage 1 agent (0.3 million, 16 minutes), five groups 15 agents (2.8 million, 90 minutes), final check 5 (1.3 million, 100 minutes).
- **Messages Robert sends while a workflow runs are relayed into every running agent.** Every agent prompt says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line.
- **Pass a workflow's `args` as real JSON**, the whole object (round 8 lost a launch to a placeholder string). A `scriptPath` must be one the tool returned or a file in the scratchpad. Copy scripts to the harness afterwards.
- **Subagents cannot write .md files** (return Markdown as text and save it yourself). Workflow scripts cannot write files: take results from the task output file or the journal.
- **A `send_later` check-in each hour** while a workflow runs (push results, check PostgreSQL). Cancel it when nothing runs. A worker restart stops PostgreSQL: run `start_all.sh`.
- **Give every reviewer the decisions**, not only the implementer. **Check a PR's description against its code.** No model names in PR text.
- **`playtest-harness` has its own history, unrelated to `main`.** Work on it in a worktree (`git worktree add /home/user/harness playtest-harness`) and push it directly.
- At the end of each phase, **rewrite this file** (under about 200 lines), commit it to `playtest-harness` (folder `handoff/`) and push. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** below, verbatim in a code block.
- Robert's preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, with wiki-links such as [[Candela VTT]], [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]]. Link only notes that exist. Vault dates are Pacific. Galga can answer Bad Gateway once: retry.
- If the repo is not in the session, attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`).

## GitHub issues

Open problems live in GitHub issues; this file only points at them.
- Labels: `bug`, `ux`, `enhancement` (ideas), `known` (accepted for now). #16 "Behaviour kept on purpose (not bugs)" lists Robert's design decisions: read it before calling something a bug.
- File an issue for each confirmed bug and medium UX item not fixed in the same phase; low UX items go in one checklist issue per round. A fix PR closes its issues with "Fixes #n" lines; tick checklist lines by hand.
- **Robert files issues by hand from the live site**, often several in a burst. Read new issues and comments at the start of each phase, and again before launching a workflow.
- **Open now:** #79 (a Non-Combatant card open during a restart still goes with no word), #88 (35 lines ticked after PR 89; 16 unverified lines and 2 ideas stay open, two of them partly done and noted on their lines). Older: #45 (45.16 only), #60 (60.10, 60.14, 60.24 and its Ideas), ideas #27 to #32 and #34.

## Model and effort

Robert sets the model and effort when he opens the chat. As your first step, check yours with `get_session`; if they differ, say so in one line and carry on. A workflow agent's model and effort can be set per agent. Robert asked to see the plan with models per stage before a workflow runs, and to save tokens where safe. Robert's account showed a weekly usage warning on 15 October (reset Friday 16 October, 10:00 Pacific): mention it if a big run is planned.

**Next chat: Opus 5.5 at high effort.** The next phase is PR 89's follow-up (Robert's answers to seven calls, possibly small server changes) and then the fifth playtest.

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps, low UX fixes and their browser checks | Sonnet 5.5 | medium |
| Workflow implementers on well-specified fixes | Sonnet 5.5 (Opus 5.5 high for protocol, data or a redesign) | medium |
| Workflow players in a playtest | Sonnet 5.5 | medium |
| Lightkeeper seat, triage, reviewers of server work, final review, repair | Opus 5.5 | high |

What worked for fix rounds 4 to 8: one Opus triage of every issue against main (file:line, smallest fix, groups with the files each owns, and who edits each shared file: in round 8 only one group edited `gameStore.js`, new tests went in one new file per group, docs were edited in place at named lines, so the hand merge had no conflicts); one worktree per group (`/home/user/wt/<group>`, branch `fix8-<group>`), implemented, reviewed and repaired (`playtest/workflows/run8/fix8-groups-*.js`, args in `args.json`); then the hand merge, a seam fix by hand (round 8: the store dropped `amended_at` because only one group could edit the store), the full suite, and `fix8-final-check-*.js` (a final Opus review, three Sonnet browser checks against main as the control, one Opus repair).

**How playtests run (Robert, 11 October).** Repeats of old problems are fine to find. The play stays blind. The re-check of the last report is its own pass by separate agents. Each fix is retested before it ships: a fix PR's browser check replays the original steps of every item it fixes, with the unfixed build as a control.

## Where things stand

- **Main is 1f0fbd4** (PR 89, fix round 8, merged 15 October on Robert's word). **Beta runs 1bc48a0** unless Robert has deployed since: ask him. Live: ask Robert.
- **PR 89 is merged** (branch `claude/fix-round-8`, head fd39a1c). It fixed #72 to #87 except #79's restart case, and most of #88. Full suite 2055 passed, 1 skipped; CI green; vite build clean.
  - New columns `characters.scar_pending` and `characters.let_in` (added at startup). New refusals on roll, revive_character, submit_assignment_report, update_circle, spend_resource and the Non-Combatant pick; all in WEBSOCKET.md.
  - At deploy: anyone let in before the deploy loses the "Let in" mark (the column starts false).
- **Record of the round:** `playtest/results/2026-10-15-fix8/` (`decisions8.md`, `triage8.md`, `groups8.json`, `fix8_groups_result.json` with every group's choices, `fix8_final_check_result.json`, `pr_body.md`). Container setup: `playtest/run8/` (`setup_env.sh`, `start_all.sh`).
- **Robert's round 8 decisions** (all as recommended, 15 October) are in `decisions8.md` and the PR. Earlier calls kept as built: `playtest/run4/decisions.md`.
- **How beta is deployed** (Robert, on the server): `cd ~/projects/candela-vtt-beta && git fetch origin && git checkout beta && git merge --ff-only origin/main`, then `cd ~/projects/gatergrid-web/.claude/worktrees/candela-beta && bash candela/update.sh --beta`. Add `--now` if players are connected.
- **Beta password:** plain environment variables `CANDELA_BETA_USER` and `CANDELA_BETA_PASS` (Playwright `httpCredentials`). Beta's `/api` and `/ws` answer without it (Robert knows).

## Next phase: PR 89 follow-up, then the fifth playtest

1. Read new issues and comments. Ask Robert whether beta runs 1f0fbd4 yet (check by grepping beta's served JavaScript for "Reroll: " or "No dispatch yet").
2. Put PR 89's seven "Calls to confirm" to Robert in one short list, with a recommendation each, and wait. Recommended: (1) let an investigator outside any campaign revive itself (no Lightkeeper exists; one line in access.py `_revive`, a test); (2) keep: spending reopens on the next dispatch write; (3) keep: the count follows the player (#41); (4) keep: a secret roll stays secret; (5) keep the toast without Reject; (6) keep the clamp at 12; (7) leave the roll lines' em dash for now (the log format, pinned by tests). Build what he changes on the session's branch from main, with a test, and open a small PR.
3. Robert deploys beta himself after any follow-up merges.
4. Then offer the fifth playtest as a choice (it is big; say the size and ask): a re-check pass of round 8's items on beta by separate agents, then blind play that reaches scars, incapacitation, a death and an advance (seed a circle near a milestone, or play two assignments; run 4 never reached them). Harness: `playtest/run4/` and `playtest/workflows/run4/`, `run4p/`. Recommend it before any new feature work.

## Start prompt for the next chat

Robert pastes this as the first message of each new chat. Keep this section when rewriting the file, and change the prompt only if he asks.

```
Continue Candela VTT (GitHub austincauwels/TTRPG_VTT_CO).

1. If the repo is not in this session, attach it with add_repo (owner austincauwels, repo TTRPG_VTT_CO, access push) and clone it.
2. Read handoff/STATUS.md on the playtest-harness branch. It is the source of truth; follow its rules.
3. Check your model and effort with get_session. If they differ from STATUS.md's recommendation, say so in one line and carry on.
4. Check the state of any open PR named in STATUS.md (CI, reviews, merged or not) before starting new work.
5. Do the "Next phase". If it offers a choice, give me your recommendation in a few lines and wait for my pick.

Ground rules:
- Plain language, short answers, no em dashes.
- Before a run of more than about 6 agents, say how big it is and ask, unless I've turned ultracode on.
- Work on the branch this session assigns. Push work in progress at least hourly.
- Open a PR when a phase is done. Merge only when I say so. Never deploy; I run candela/update.sh.
- Log durable decisions to my Obsidian vault with the Galga append_daily_log tool, after reading the vault's CLAUDE.md.
- At the end of the phase, rewrite handoff/STATUS.md (under about 200 lines) and push it to playtest-harness. Then tell me the model and effort to use for the next chat, and that it's a good point to start fresh.
```

## How the browser checks are done

No frontend test runner exists, so changes are checked in Chromium with Playwright 1.56 (`/opt/pw-browsers/chromium-1194`):
- **Round 8 setup:** `playtest/run8/setup_env.sh` builds PostgreSQL, the venv, a control worktree with its build and Playwright in one go (about 5 minutes). Each worktree gets `frontend/.vite.preview.<port>.config.mjs` made by `sed` from `vite.config.js` (127.0.0.1:8000 to the port), and links `frontend/node_modules` to the control's.
- **Quickest setup (fourth playtest):** worktrees `/home/user/wt/main` and `/home/user/wt/control` with `npm ci && npx vite build` in `frontend/`, then `playtest/run4/up.sh <tree> <api_port>` (own database, the built site on api_port-4000), `restart_api.sh` (a server restart mid-session) and `down.sh`. `up.sh` reads the secret key from `/home/user/pt4/secret_key` (write 64 hex there first). Exclude `frontend/.vite.preview.*.config.mjs` in `.git/info/exclude`. Copy `playtest/package.json` into the work folder and `npm install` for Playwright.
- A table built through the API (register, `/campaign/create`, forge, join, approve, then `circle-creation-state`), sealed in SQL (`circles.is_finalized`, `campaigns.roster_finalized`, `reports_open`; SQL changes to reports_open do not broadcast). `X-Forwarded-For` with a fresh address per request avoids the sign-up limit.
- A desk opened by writing the store's `candela-vtt-storage` in an init script guarded by sessionStorage. Examples: `playtest/results/2026-10-12-run3/verify/` and the method notes in `results/2026-10-14-run4/recheck/*.json`.
- A stall made with `page.routeWebSocket`. A gilded die waiting for its choice wobbles: press Enter on it. A Node socket on a character whose desk is open takes the desk over.
- **Playtest method notes (run 4):** play seats act minutes apart, so time windows belong in side checks; seat.js matches names as substrings (prefer exact); finding.js does not check screenshot paths; blind play needs two assignments or a seeded circle to reach scars and advances.

## How to work in this repo

- **Branch and PR:** work on the branch the session assigns, then open a PR into `main`. Merge only when Robert says so. He deploys with `cd ~/projects/gatergrid-web && bash candela/update.sh`; with no argument it deploys the newest `main`. Players reload afterwards.
- **Commits:** a short title, a body saying what changed and how it was checked, no em dashes, the trailer lines the session gives. Never write model names into the app's files.
- **Docs:** `DESIGN.md` (look and wording: "Lightkeeper", never "GM", on screen; 44 px touch targets; help on demand, never permanent), `FAQ.md` (rules as implemented), `docs/refactor/WEBSOCKET.md` (every message), `docs/refactor/QUIRKS.md` (odd behaviour pinned by tests: flip the tests when you fix one, never delete them). Update them when you change what they describe.
- **Schema changes:** `init_db` adds columns at startup with `add_columns`; no Alembic. Update `backend/tests/test_00_startup.py`, `test_surface.py` for new messages, and `tests/data/openapi.json` when an API shape changes.
- **Backend tests** need PostgreSQL:
  ```
  apt-get install -y postgresql            # if /usr/lib/postgresql/16/bin is missing
  mkdir -p /var/tmp/candela-pg && chown postgres /var/tmp/candela-pg
  su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/tmp/candela-pg/data -A trust"
  su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/candela-pg/data -l /var/tmp/candela-pg/pg.log -o '-p 5433' start"
  python3 -m venv ~/.venv-candela && ~/.venv-candela/bin/pip install -r backend/requirements.txt -r backend/requirements-dev.txt
  ```
  Then `~/.venv-candela/bin/python -m pytest -q` in `backend/` with `DATABASE_URL=postgresql://postgres@localhost:5433/<throwaway db>`, `SECRET_KEY` (64 hex) and `CORS_ORIGINS=http://localhost:5173`. The full suite is about 2,015 tests, about 5 minutes. CI runs it on every PR. `~` is `/root` in these containers.
- **Frontend:** `cd frontend && npm ci && npx vite build`. A worktree can link `frontend/node_modules` to another checkout's (add it to `.git/info/exclude`).
- **Gotchas:** a worker restart stops PostgreSQL (start it with the `pg_ctl` line). Never `pkill -f` a pattern in your own command line (it kills the shell); kill by PID.
