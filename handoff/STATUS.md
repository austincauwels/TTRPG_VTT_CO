# Candela VTT: status and next phase

Updated 14 October 2026 (Pacific), after the fourth playtest. This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless Robert has turned ultracode on for the chat. **The start prompt contains the word "ultracode"** (in the ground rule), which makes the system say ultracode is on: it is not, unless Robert says so himself. **This container has 4 CPUs**: a workflow runs 2 to 3 agents at once.
- Past sizes: fix round 6 had 18 agents (about 4 million subagent tokens, 3.5 hours); round 7 had 15 (Sonnet builders, about 2.9 million, 2.5 hours). The fourth playtest: stages A and B 9 agents (2.0 million, 2 hours), blind play 35 (3.4 million, 48 minutes), triage to report 6 (0.9 million, 27 minutes).
- **Messages Robert sends while a workflow runs are relayed into every running agent.** Every agent prompt says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line.
- **Pass a workflow's `args` as real JSON.** A `scriptPath` must be one the tool returned or a file in the scratchpad. A driver workflow can chain steps with `workflow({scriptPath}, args)` (the playtest session ran that way). Copy scripts to the harness afterwards.
- **Subagents cannot write .md files** (the report writer returned its Markdown as text; save it yourself). Workflow scripts cannot write files: extract results from the journal (`started` lines map keys to labels).
- **A `send_later` check-in each hour** while a workflow runs (push results, check PostgreSQL). Cancel it when nothing runs. A worker restart stops PostgreSQL: run `start_all.sh`.
- **Give every reviewer the decisions**, not only the implementer. **Check a PR's description against its code.**
- **`playtest-harness` has its own history, unrelated to `main`.** Work on it in a worktree (`git worktree add /home/user/harness playtest-harness`) and push it directly.
- At the end of each phase, **rewrite this file** (under about 200 lines), commit it to `playtest-harness` (folder `handoff/`) and push. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** below, verbatim in a code block.
- Robert's preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, with wiki-links such as [[Candela VTT]], [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]]. Link only notes that exist. Vault dates are Pacific.
- If the repo is not in the session, attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`).

## GitHub issues

Open problems live in GitHub issues; this file only points at them.
- Labels: `bug`, `ux`, `enhancement` (ideas), `known` (accepted for now). #16 "Behaviour kept on purpose (not bugs)" lists Robert's design decisions: read it before calling something a bug.
- File an issue for each confirmed bug and medium UX item not fixed in the same phase; low UX items go in one checklist issue per round. A fix PR closes its issues with "Fixes #n" lines; tick checklist lines by hand.
- **Robert files issues by hand from the live site**, often several in a burst. Read new issues and comments at the start of each phase, and again before launching a workflow.
- **Open now:** from the fourth playtest, bugs #72 to #85, medium UX #86 and #87, the low checklist #88 (21 lines seen on a local copy, 28 unverified, 4 ideas). Older: #45 (45.16 only), #60 (60.10, 60.14, 60.24 and its Ideas), ideas #27 to #32 and #34.

## Model and effort

Robert sets the model and effort when he opens the chat. As your first step, check yours with `get_session`; if they differ, say so in one line and carry on. A workflow agent's model and effort can be set per agent. Robert asked to see the plan with models per stage before a workflow runs, and to save tokens where safe.

**Next chat: Opus 5.5 at high effort.** The next phase is fix round 8, which has server and protocol work (the owed scar stored, the maximum at a death, the dead and reports, restarts and the tray).

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps, low UX fixes and their browser checks | Sonnet 5.5 | medium |
| Workflow implementers on well-specified fixes | Sonnet 5.5 (Opus 5.5 high for protocol, data or a redesign) | medium |
| Workflow players in a playtest | Sonnet 5.5 | medium |
| Lightkeeper seat, triage, reviewers of server work, final review, repair | Opus 5.5 | high |

What worked for fix rounds 4 to 7: one Opus triage of every issue against main (file:line, smallest fix, groups with the files each owns); one worktree per group (`/home/user/wt/<group>`, branch `fixN-<group>`), each implemented, reviewed and repaired (`playtest/workflows/run7/fix-groups.js`, args in `args.json`); then a hand merge (conflicts are almost always docs: QUIRKS.md, WEBSOCKET.md; keep both sides), the full suite, and `final-check.js` (a final Opus review, three browser checks against main as the control, one repair).

**How playtests run (Robert, 11 October).** Repeats of old problems are fine to find. The play stays blind. The re-check of the last report is its own pass by separate agents. Each fix is retested before it ships: a fix PR's browser check replays the original steps of every item it fixes, with the unfixed build as a control.

## Where things stand

- **Main is 1bc48a0** (PR 71, fix round 7). **Beta runs 1bc48a0** (Robert deployed it on 14 October; checked by grepping the served JavaScript for round 6 and 7 strings). Live: ask Robert.
- **Fourth playtest done, 14 October.** No app code changed, so no PR. Record: `playtest/results/2026-10-14-run4/` (`report.md`, `report.json`, `recheck/*.json` for stages A and B, play findings, table talk, seat notes, triage and verdicts). Harness: `playtest/run4/` and `playtest/workflows/run4/` (re-check and side checks, triage to report) and `run4p/` (the play loop and the session driver).
  - **The fixes held.** 150 items replayed: 132 fixed, 12 partly, 2 not fixed (both from side checks: the dead can file a report, a gilded choice across a restart), 4 not checked. No regression in stage A.
  - **Blind play on beta** (four AI players, The Ferryman's Psalm): clean from sign-up to End Assignment on five sizes, no console errors, every roll and the tally matched the book. It never reached a scar, an incapacitation or an advance.
  - **Worst problems:** #72 a scar owed is lost on a restart (high); #73 a death lowers the resource maximum without telling any desk ("Stitch: 4 of 3", high); #74 the Lightkeeper's chapter house typed before the seal replaces the players'; #75 the Edit sheet log hides late changes; #76 the dead can file a report; #78 the tray after a restart; #79 Non-Combatant offers.
- **Calls Robert left as built** (asked 14 October, no answer, so they stand): PR 68's three, PR 70's (Fallen at the foot, Sign out clears drafts, ring layout, a dead investigator can Accept an old proposal, held marks kept at End Assignment and release, silent close of a lost held mark, two candles), PR 71's (private recipient stays selected, roll names every toggled ability, skip link position, felt keeps the last roll). 45.16 stays parked. All in `playtest/run4/decisions.md`.
- **How beta is deployed** (Robert, on the server): `cd ~/projects/candela-vtt-beta && git fetch origin && git checkout beta && git merge --ff-only origin/main`, then `cd ~/projects/gatergrid-web/.claude/worktrees/candela-beta && bash candela/update.sh --beta`. Add `--now` if players are connected.
- **Beta password:** plain environment variables `CANDELA_BETA_USER` and `CANDELA_BETA_PASS` (Playwright `httpCredentials`). Beta's `/api` and `/ws` answer without it (Robert knows).

## Next phase: fix round 8

1. Read new issues and comments. Put the **decisions** below to Robert in one short list, with a recommendation each, and wait for his answers.
2. Then a fix round over #72 to #87 and the verified lines of #88 (unverified lines only if cheap), as in rounds 4 to 7: Opus triage against main, groups by files (likely: server state and restarts; death, scars and reports; Lightkeeper desk and charter; small UX and touch targets), each implemented, reviewed and repaired, hand merge, full suite, final check with browser replays against 1bc48a0 as the control. Say the size and models per stage first (about 15 to 18 agents).
3. Decisions for Robert (from the report):
   - #73: do the dead count toward 1 plus members until replaced, or does a death lower the maximum and pools at once, like a release? (Recommend: at once, like a release, with a live update.)
   - #74: the Lightkeeper's charter read-only until the seal, and the players' chapter house wins? (Recommend: yes to both.)
   - #77: does a member who leaves and rejoins in one assignment keep their spend count? (Recommend: keep it, like #41.)
   - #82: who may Revive: only the Lightkeeper, or the player too? (Recommend: Lightkeeper only, and log who revived.)
   - #81: a mark dealt beside a held Death Defy mark: land the held one first and close its offer? (Recommend: yes, as WEBSOCKET.md 4.5.)
   - #86: show the Lightkeeper an open burn: a line by Roll, or a mark on the felt slip? (Recommend: the slip mark.)
   - #88 lines: an Add Illumination confirm while reports are unfiled; +1 past 12; spending open after End Assignment.
   - The burn preview "Survey: 2 dice" (by design; four reports read it as a mistake): keep, or relabel "Reroll: Survey, 2 dice"?

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
