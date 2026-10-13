# Candela VTT: status and next phase

Updated 13 October 2026 (Pacific), after the overnight run. This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless Robert has turned ultracode on for the chat. **The start prompt contains the word "ultracode"** (in the ground rule), which makes the system say ultracode is on: it is not, unless Robert says so himself. Past sizes: round 6 had 18 agents (triage 1, 4 groups x 3, final check 5; about 4 million subagent tokens, about 3.5 hours). Round 7 had 15 (Sonnet builders: about 2.9 million tokens, about 2.5 hours). **This container has 4 CPUs**: a workflow runs 2 to 3 agents at once.
- **Messages Robert sends while a workflow runs are relayed into every running agent.** Every agent prompt says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line.
- **Pass a workflow's `args` as real JSON.** A `scriptPath` must be one the tool returned or a file in the scratchpad; `/home/user/pt6` is refused. Copy scripts to the harness afterwards.
- **A `send_later` check-in each hour** is a good safety net (push the branch, snapshot group worktrees as patches). A worker restart stops PostgreSQL: run `start_all.sh`.
- **Give every reviewer the decisions**, not only the implementer (`decisions.md` per round). **Check a PR's description against its code** (the final review confirms each claimed item; read the last repair commits before writing the PR).
- **`playtest-harness` has its own history, unrelated to `main`.** Work on it in a worktree (`git worktree add /home/user/harness playtest-harness`) and push it directly.
- At the end of each phase, **rewrite this file** (under about 200 lines), commit it to `playtest-harness` (folder `handoff/`) and push. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** below, verbatim in a code block.
- Robert's preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, with wiki-links such as [[Candela VTT]], [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]]. Link only notes that exist. Vault dates are Pacific.
- If the repo is not in the session, attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`).

## GitHub issues

Open problems live in GitHub issues; this file only points at them.
- Labels: `bug`, `ux`, `enhancement` (ideas), `known` (accepted for now). #16 "Behaviour kept on purpose (not bugs)" lists Robert's design decisions: read it before calling something a bug.
- File an issue for each confirmed bug and medium UX item not fixed in the same phase; low UX items go in one checklist issue per round. A fix PR closes its issues with "Fixes #n" lines; tick checklist lines by hand.
- **Robert files issues by hand from the live site**, often several in a burst. Read new issues and comments at the start of each phase, and again before launching a workflow.
- **Open after round 7:** #45 (only 45.16 left), #60 (60.10, 60.14, 60.24 and the Ideas section), ideas #27-#32, #34. Every open bug and medium UX issue was closed by PR 70.

## Model and effort

Robert sets the model and effort when he opens the chat. As your first step, check yours with `get_session`; if they differ, say so in one line and carry on. A workflow agent's model and effort can be set per agent (`model`: sonnet, opus, haiku or fable; `effort`). Robert asked to see the plan with models per stage before a workflow runs, and asked to save tokens where safe (round 7 used Sonnet builders and browser checks, Opus for triage, server-side reviews, the final review and the repair).

**Next chat: Opus 5.5 at high effort.** The next phase is the fourth playtest (the Lightkeeper seat and triage need Opus), or the ideas round, which needs design calls.

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

**How playtests run (Robert, 11 October).** Repeats of old problems are fine to find. The play stays blind. The re-check of the last report is its own pass by separate agents. Each fix is retested before it ships: a fix PR's browser check replays the original steps of every item it fixes, with the unfixed build as a control. No automated test suite in CI beyond the backend tests, and no fix ledger beyond issues.

## Where things stand

- **Overnight run, 13 October** (Robert asleep; he allowed merging a round's PR once CI is green and the final checks pass; never deploy):
  - **Fix round 6, PR 70 merged** (main e5356d4, CI green). Closed #17-#26, #38-#44, #46, #47, #67: the Activity Log and held marks stored in the database (restarts lose nothing a player can see), stale offer cards close without landing a mark, held marks on the Lightkeeper's copy and across a reload, roll outcome after Flourish and roll replay after a reload, the dead refused scars and proposals, rejoin and retire reaching open desks, Fallen in the Registry, the Illumination ring around the candle, and small UX. Record: `playtest/results/2026-10-13-fix6/`.
  - **Fix round 7, PR 71 merged** (https://github.com/austincauwels/TTRPG_VTT_CO/pull/71, main 1bc48a0, CI green): 48 low UX lines from #69 (closed), #45 and #60 (ticked by hand). Final review found nothing blocking; full suite 2015 passed. Left open: 45.16 (decision), 60.10 and 60.24 (partly), 60.14 (needs a real tablet). Record: `playtest/results/2026-10-13-fix7/`.
- **Neither round is deployed.** Live ran 770a2ed earlier; Robert said PR 68 goes straight to live. Ask him which build is live. Deploy notes for him: round 6 adds table `activity_lines` and columns `characters.held_mark`, `characters.taken_mark_ids` (log lines from before the deploy are lost once; offers open at the deploy are dropped); round 7 adds `circles.milestones_earned` (filled once from the track).
- **Calls flagged for Robert** (in PR 68, 70 and 71 bodies), none blocking: PR 68's three (sheet edit lines to the whole table, fourth scar refused in the editor, Account card kept); PR 70's defaults (Fallen at the foot of the Registry, Sign out clears drafts, the ring layout), a dead investigator can still Accept an old proposal, held marks not cleared at End Assignment or on release, two candles on the Circle pages; PR 71's (private recipient stays selected, roll names every toggled ability, skip link position, the felt keeps the last roll). Ask him in one short list.
- **Decision waiting:** 45.16, open a waiting investigator's sheet from the hub (a new view; recommended: not now, add a line to #16).
- **Beta password:** plain environment variables `CANDELA_BETA_USER` and `CANDELA_BETA_PASS` work (Playwright `httpCredentials`). Beta's `/api` and `/ws` answer without the password (Robert knows; his call).
- **How beta is deployed** (Robert, on the server): `cd ~/projects/candela-vtt-beta && git fetch origin && git checkout beta && git merge --ff-only origin/main`, then `cd ~/projects/gatergrid-web/.claude/worktrees/candela-beta && bash candela/update.sh --beta`. Add `--now` if players are connected.

## Next phase: Robert's pick

1. Ask Robert which build is live and whether he has deployed rounds 6 and 7, and put the flagged calls to him in one short list. Read new issues and comments.
2. **Ask which comes next**, with a recommendation (mine: the fourth playtest once rounds 6 and 7 are live on beta, since four fix rounds have shipped since the last one):
   - **Fourth playtest on beta**: a re-check pass of PRs 61, 68, 70 and 71, then blind play. Use the run 3 method notes: settle the human seat before approvals, seed a circle near 12 Illumination to reach advancement (and Resource Management's earn-back), a timed script for the 2-minute offer window, a server restart mid-session (round 6), and aim at scars and death. Harness: `playtest/run3/` and `playtest/workflows/run3/`. Size: about 45 agents.
   - **Ideas round**: #27 call for a roll, #28 gear that changes rolls, #29 newcomer welcome, #30 editable field notes, #31 proposals that remind or expire, #32 security emails, #34 custom maps, plus #60's idea lines. Each needs a short design note and Robert's decisions first.
3. Say the size and the plan with models per stage before running it.

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
- A backend on its own port and database; `vite preview` of a build with a copy of `frontend/vite.config.js` whose proxy targets point at that port (git-excluded, `frontend/.vite.preview.<port>.config.mjs`).
- A table built through the API (register, `/campaign/create`, forge, join, approve, then `circle-creation-state`), sealed in SQL (`circles.is_finalized`, `campaigns.roster_finalized`, `reports_open`). `X-Forwarded-For` with a fresh address per request avoids the sign-up limit.
- A desk opened by writing the store's `candela-vtt-storage` in an init script guarded by sessionStorage. `playtest/checks/` and `playtest/results/2026-10-12-run3/verify/` show how (the run 3 verifier scripts build tables with a ghost member, drives at 0, notebooks and reports).
- How fix rounds 4 and 5 were set up (repeat it): a work folder `/home/user/pt5` with `npm install` of `playtest/package.json` (Playwright), copies of `results/2026-10-12-run3/verify/*.js` (paths changed to `pt5`), `decisions.md` and `start_all.sh` (restarts PostgreSQL; in `results/2026-10-12-fix4/`). One worktree per group at the base commit (`/home/user/wt/<group>`, branch `fix5-<group>`), `frontend/node_modules` linked, a preview config per port (`sed` of 8000 to the port); a detached worktree `/home/user/wt/control` at the old build for the control. Each agent has its own ports and databases.
- A stall made with `page.routeWebSocket`. A gilded die waiting for its choice wobbles: press Enter on it.

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
  Then `~/.venv-candela/bin/python -m pytest -q` in `backend/` with `DATABASE_URL=postgresql://postgres@localhost:5433/<throwaway db>`, `SECRET_KEY` (64 hex) and `CORS_ORIGINS=http://localhost:5173`. The full suite is about 1,915 tests, about 5 minutes. CI runs it on every PR. `~` is `/root` in these containers.
- **Frontend:** `cd frontend && npm ci && npx vite build`. A worktree can link `frontend/node_modules` to another checkout's (add it to `.git/info/exclude`).
- **Gotchas:** a worker restart stops PostgreSQL (start it with the `pg_ctl` line). Never `pkill -f` a pattern in your own command line (it kills the shell); kill by PID.
