# Candela VTT: status and next phase

Updated 11 October 2026, late evening (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, check PR 48 and what beta runs, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless he has turned ultracode on for the chat. Past sizes: second playtest 97 agents (about 13 million subagent tokens); the re-check of 11 October 6 Opus agents (1.6 million). The third playtest's steps are 1 to 4 agents each, 28 in all.
- **Messages Robert sends while a workflow runs are relayed into every running agent.** Every agent prompt says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line in every new prompt (`workflows/run3/play.js` has it).
- **Pass a workflow's `args` as real JSON, never a placeholder.** On 11 October a placeholder string made the re-check fail at once.
- **No resume Routine.** The `Resume:` line is a note for a person or a new chat. Push work in progress at least hourly; an interrupted container keeps nothing. A worker restart stops PostgreSQL and every server; the usage limit can stop a workflow mid-agent. Tell agents to commit as they go. A background loop for syncing stops at 2 hours.
- **Give every reviewer the decisions Robert made, not only the implementer** (a reviewer once deleted a feature he had asked for). `playtest/results/2026-10-11-recheck/decisions.md` is a good shape for that.
- **Check a PR's description against its code.** A final review should confirm each claimed item exists.
- **`playtest-harness` has its own history, unrelated to `main`.** Work on it in a worktree (`git worktree add /home/user/harness playtest-harness`) and push it directly; the session's assigned branch is for app code. A hard `git reset` is refused by the permission classifier; to move a branch, `git fetch` then `git merge --ff-only`.
- At the end of each phase, **rewrite this file** (under about 200 lines), commit it to `playtest-harness` (folder `handoff/`) and push. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** below, verbatim in a code block.
- Robert's preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, with wiki-links such as [[Candela VTT]], [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]]. Link only notes that exist.
- If the repo is not in the session, attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`).

## GitHub issues (decided 11 October)

Open problems live in GitHub issues; this file only points at them.
- Labels: `bug`, `ux`, `enhancement` (ideas), `known` (accepted for now). #16 "Behaviour kept on purpose (not bugs)" lists Robert's design decisions: read it before calling something a bug.
- File an issue for each confirmed bug and medium UX item not fixed in the same phase; low UX items go in one checklist issue per round (like #45). Raw playtest findings stay on this branch.
- A fix PR closes its issues with "Fixes #n" lines; tick checklist lines by hand. Austin rarely reads issues, so notifications are fine.
- Robert comments on issues himself. **Read new comments on open issues at the start of each phase.** On 11 October he wrote: #29 a newcomer gets a short welcome pop-up with the circle's key facts before play; #33 map pins closed in favour of #34 custom maps drawn live with the existing sketch tools, light enough to improvise; #31 an end-of-assignment "interview" reviewing goals and relationships with a chance to propose a new one. No newer comments as of this update.
- Open now: bugs #17-#22, #38-#44; UX #23-#26, #45-#47; ideas #27-#32, #34. #35-#37 close when PR 48 merges.

## Model and effort

Robert sets the model and effort when he opens the chat. As your first step, check yours with `get_session`; if they differ, say so in one line and carry on. A workflow agent's model and effort can be set per agent (`model`: sonnet, opus, haiku or fable; `effort`). Robert asked to see the plan with models per stage before a workflow runs.

**Next phase (the playtest Robert plays in): Opus 5.5 at high effort for the chat.** It needs judgement: running the organiser, relaying Robert's moves, triage.

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps, low UX verification | Sonnet 5.5 | medium or low |
| Workflow implementers on well-specified fixes | Sonnet 5.5 (Opus 5.5 high for protocol or data) | medium |
| Workflow players in a playtest | Sonnet 5.5 | medium |
| Lightkeeper seat, triage, reviewers, verifiers and browser checks | Opus 5.5 | high |

What worked before: a regression sweep alongside the play; triage by two Opus agents; verification split into Opus (bugs, rules, medium) and Sonnet (low UX); fixes in six worktrees (`/home/user/wt/<group>`), each implemented, reviewed by Opus and repaired; then a merge, the full suite, a final Opus review and an Opus browser check. Merging groups conflicts mostly in DESIGN.md, WEBSOCKET.md and `routers/campaigns.py`: keep both sides of doc rows.

**How playtests run (Robert, 11 October).** Repeats of old problems are fine to find. The play stays blind (players get no list of past problems). The re-check of the last report is its own pass by separate agents. Each fix is retested before it ships: a fix PR's browser check replays the original steps of every item it fixes, at the original size, with the unfixed build as a control. No automated test suite in CI and no fix ledger beyond issues.

## Where things stand

- `main` is at **36f001c** (PRs 13, 14 and 15). Whether beta and live run it is not confirmed.
- **PR 48** (https://github.com/austincauwels/TTRPG_VTT_CO/pull/48, branch `claude/modest-bohr-5zvnv6`, b1e8a51) is open, CI green on both runs, no reviews, mergeable: double-clicks on End Assignment, Give a spend back and Revive are ignored (#35, #36, #37). Robert picked fixing these before the playtest, so beta should run PR 48's merge. Merge only when he says.
- **Beta password: not in the environment yet.** On 12 October (UTC) `env | grep -c CANDELA_BETA` gave 0. Robert was told to add `CANDELA_BETA_USER` and `CANDELA_BETA_PASS` in the environment settings and start a new chat (only a new session picks them up). Never ask him to paste them.
- **Beta's WebSocket needs nothing extra:** checked without the password, the basic auth covers only the pages. `/api/...` answers 200 and `/ws/...` upgrades (101). So the seats' sockets work through `httpCredentials` as they are. (It also means beta's API is open to anyone with the address; Robert has been told, and it is his call.)
- **The third playtest is prepared** (playtest-harness dcbae97). Everything is in `playtest/run3/` and `playtest/workflows/run3/`; `run3/ORGANISER.md` is the runbook:
  - `personas.md`: **The Saltmere Chapter**, one assignment, **The Drowned Choir** (bells under the mud of a river town; three scenes: the flats, the choirmaster's lodging, the bell tower against the tide). Usernames end in `_r3`. Bram plays a Muscle (Soldier), Cass a Slink (Criminal), Dev a Weird (Occultist). Robert picks his own. No planned death.
  - `assets/`: `mudflats_photo.jpg` and `hymn_sheet.jpg`, committed.
  - `workflows/run3/play.js`: one step per workflow chosen by `args.step`: campaign (dm), investigators (3 players), approval (dm), circle (3), ready (dm), round 1-3 (3 players then dm), wrap (3 then dm), after (3). The Lightkeeper is on Opus 5.5 high, the players on Sonnet 5.5 medium. The Lightkeeper returns `for_robert`, his next ask in plain words. Each step was run with mocked agents (right counts, relay line in every prompt).
  - `setup.sh [commit]` fills `/home/user/pt3` and puts the source at `/home/user/sut`; `start_all.sh` brings the seats back; `sync.sh` pushes findings, talk, notes, results and the screenshots findings cite to `results/<date>-run3/`. A dry run without the password opened all four seats (each on the auth error page, as expected).
  - `seats_daemon.js` no longer dies when one seat's page fails to load; `lib.js` reads the site from `site.txt`.
- Earlier results on this branch: the re-check (`playtest/results/2026-10-11-recheck/`, `recheck.md` first) and the second report (`playtest/results/2026-10-11/report.md`; page: https://claude.ai/artifact/RcCxR5mNbmjqfCHufFyact).

## Next phase: the playtest Robert plays in

1. Check PR 48 (CI, reviews, merged or not) and new issue comments. Check `env | grep -c CANDELA_BETA` is 2; if not, point Robert at the environment settings and stop.
2. Ask Robert two things only: which commit beta runs (PR 48's merge, if deployed) and which browser he plays in. Then follow `playtest/run3/ORGANISER.md`: `setup.sh <commit>`, `start_all.sh` (must say "site pages: 200"), and have Robert sign in on beta and say what the hub shows.
3. **Settled with Robert (11 October):** beta, its own database; Robert plays one player seat on his own desktop; the AI keeps the Lightkeeper (dm), the phone (bram), the laptop (cass) and the tablet (dev); one fresh campaign with one assignment, about 1.5 to 2 hours; one step per workflow, telling Robert when it is his move and what the Lightkeeper asked; no password-reset scene. His investigator's creation is his own.
4. **Robert at the table.** He cannot run `table.js`. He tells the chat what he says and does; post it with `node table.js say robert "..."` between steps. Log what he notices with `finding.js --seat robert`. Run `sync.sh` (with `SYNC_TRAILER` set to the session's trailer lines) after every step or two.
5. After the play: triage, verification on local copies at the same commit (never on beta), and a report as in run 2 (`workflows/run2/triage.js`, `verify.js`, `report.js`, with `PT` and the context changed). File issues per the rules above, then propose the fix round.

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
- A desk opened by writing the store's `candela-vtt-storage` in an init script guarded by sessionStorage. `playtest/checks/` and the scripts under the second run's verify folder show how.
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
