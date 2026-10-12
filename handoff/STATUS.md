# Candela VTT: status and next phase

Updated 11 October 2026, about 10 pm Pacific (12 October UTC). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless he has turned ultracode on for the chat. Past sizes: second playtest 97 agents (about 13 million subagent tokens); third playtest about 45 agents in all (about 5.5 million: play 26, triage 2, verify 7, report 1, issue filing 1).
- **Messages Robert sends while a workflow runs are relayed into every running agent.** Every agent prompt says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line in every new prompt.
- **Pass a workflow's `args` as real JSON, never a placeholder.** A Workflow `scriptPath` must be inside the working directory: copy scripts from the harness into `/home/user/TTRPG_VTT_CO/.pt3/` (git-excluded) first.
- **No resume Routine.** Push work in progress at least hourly; an interrupted container keeps nothing. A worker restart stops PostgreSQL, every server and the seats' browsers (it happened once on 12 October; `start_all.sh` brought the seats back). Tell agents to commit as they go.
- **Give every reviewer the decisions Robert made, not only the implementer** (a reviewer once deleted a feature he had asked for). `playtest/results/2026-10-11-recheck/decisions.md` is a good shape for that.
- **Check a PR's description against its code.** A final review should confirm each claimed item exists.
- **`playtest-harness` has its own history, unrelated to `main`.** Work on it in a worktree (`git worktree add /home/user/harness playtest-harness`) and push it directly; the session's assigned branch is for app code. A hard `git reset` is refused; to move a branch, `git fetch` then `git merge --ff-only`.
- At the end of each phase, **rewrite this file** (under about 200 lines), commit it to `playtest-harness` (folder `handoff/`) and push. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** below, verbatim in a code block.
- Robert's preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, with wiki-links such as [[Candela VTT]], [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]]. Link only notes that exist. Vault dates are Pacific.
- If the repo is not in the session, attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`).

## GitHub issues

Open problems live in GitHub issues; this file only points at them.
- Labels: `bug`, `ux`, `enhancement` (ideas), `known` (accepted for now). #16 "Behaviour kept on purpose (not bugs)" lists Robert's design decisions: read it before calling something a bug.
- File an issue for each confirmed bug and medium UX item not fixed in the same phase; low UX items go in one checklist issue per round (#45, #60). Raw playtest findings stay on this branch.
- A fix PR closes its issues with "Fixes #n" lines; tick checklist lines by hand. Austin rarely reads issues, so notifications are fine.
- Robert comments on issues himself. **Read new comments on open issues at the start of each phase.** Earlier ones: #29 a newcomer welcome pop-up; #33 closed for #34 custom maps drawn live with the sketch tools; #31 an end-of-assignment "interview" on goals and relationships.
- Open now: bugs #17-#22, #38-#44, **#49-#55**; UX #23-#26, #45-#47, **#56, #57, #60**; ideas #27-#32, #34, **#58, #59**. New ones are from the third playtest.

## Model and effort

Robert sets the model and effort when he opens the chat. As your first step, check yours with `get_session`; if they differ, say so in one line and carry on. A workflow agent's model and effort can be set per agent (`model`: sonnet, opus, haiku or fable; `effort`). Robert asked to see the plan with models per stage before a workflow runs.

**Next phase (decisions, then the fix round): Opus 5.5 at high effort for the chat.** The fixes touch the roster, circle resources and the WebSocket protocol.

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps, low UX verification | Sonnet 5.5 | medium or low |
| Workflow implementers on well-specified fixes | Sonnet 5.5 (Opus 5.5 high for protocol or data) | medium |
| Workflow players in a playtest | Sonnet 5.5 | medium |
| Lightkeeper seat, triage, reviewers, verifiers and browser checks | Opus 5.5 | high |

What worked before for a fix round (run 2): fixes in worktrees (`/home/user/wt/<group>`), each implemented, reviewed by Opus and repaired (`playtest/workflows/run2/fix-groups.js`); then a merge, the full suite, a final Opus review and an Opus browser check. Merging groups conflicts mostly in DESIGN.md, WEBSOCKET.md and `routers/campaigns.py`: keep both sides of doc rows.

**How playtests run (Robert, 11 October).** Repeats of old problems are fine to find. The play stays blind. The re-check of the last report is its own pass by separate agents. Each fix is retested before it ships: a fix PR's browser check replays the original steps of every item it fixes, at the original size, with the unfixed build as a control. No automated test suite in CI beyond the backend tests, and no fix ledger beyond issues.

## Where things stand

- `main` is at **2d86b77** (PR 48). **Live and beta both run 2d86b77.** No app code changed in the third playtest phase, so no PR was opened for it.
- **The third playtest is done** (12 October UTC, on beta). Robert built Pontius Aganus (account `Chilly`), was approved, then left before play; he asked for an AI player in his place. Ada Quill (Scholar, Professor, desktop seat `ada`) took the seat. The site cannot remove an approved investigator, so Pontius stayed a ghost member all session. Four AI players and an AI Lightkeeper then played **The Drowned Choir** end to end: formation, three scenes, reports, Illumination 0 to 5 of 12, End Assignment, spends between assignments. Not reached: scars, death, the timer running out, advancement.
- **Results** in `playtest/results/2026-10-12-run3/`: `report.md` first (also `report.json`), `findings.jsonl` (138), `triage_result.json` (53 clusters, 9 praise themes), `verify_result.json` (12 verified on local copies at 2d86b77: 9 confirmed, 2 partly, 1 by design), `verify/` scripts and screenshots, `table.md`, `memory/`. The report was not published as a page; offer it if Robert wants one to share with Austin.
- **Issues filed from it:** #49 ghost member (no release), #50 a Train die bought mid-assignment is wiped at End Assignment and the spend wording disagrees, #51 a 0-maximum drive shows "0 of 1", #52 sketch Text labels get lost, #53 notebook Contents does not reach its entry, #54 players see the Lightkeeper's login name, #55 a Well-Read refund logged when capped, #56 the Lightkeeper loses sight of relationships after the seal, #57 a refused session drops to a blank sign-in, #58 report has no text line (idea), #59 Behind Me offers lapse unseen (idea), #60 the low UX checklist (including Robert's join-notice wording finding).
- **The harness for run 3** is in `playtest/run3/` and `playtest/workflows/run3/` (`play.js` now has four AI players and a `replace` step; `triage3.js`, `verify3.js`, `report3.js`; `issues.md` is the open-issues list the triagers used). Method notes for next time are at the end of the report: settle the human seat before approvals, test time windows with a timed script, keep screenshot numbers running across turns, seed a circle near 12 Illumination to reach advancement.
- **Beta password:** plain environment variables `CANDELA_BETA_USER` and `CANDELA_BETA_PASS` work (Playwright `httpCredentials`). Never a network secret: it replaced the app's token on every API call. Beta's `/api` and `/ws` answer without the password (Robert knows; his call).
- **How beta is deployed** (Robert, on the server): `cd ~/projects/candela-vtt-beta && git fetch origin && git checkout beta && git merge --ff-only origin/main`, then `cd ~/projects/gatergrid-web/.claude/worktrees/candela-beta && bash candela/update.sh --beta`. Add `--now` if players are connected.

## Next phase: Robert's decisions, then the fix round

1. Read new comments on open issues (especially #49-#60). Check `main` has not moved.
2. **Ask Robert the product decisions** (from the report's "Decisions for Robert"), each with a recommendation, and wait for his answers. Put them in a `decisions.md` for the implementers and reviewers:
   - Who may take an approved investigator off a roster (the Lightkeeper, the player leaving, or both; before the first session only or any time), and after the seal: drop their votes, relationships and report and recompute Stitch, Refresh and Train at once? (#49)
   - When circle resources may be spent (between assignments only, or whenever the Lightkeeper opens spending), and does a bought Train die last until used? (#50)
   - Keep the spend "Press again" 4-second lapse (DESIGN.md), or stay armed until a press elsewhere like other confirms? (#60)
   - A text line on the assignment report? (#58) A warning at Add Illumination and End Assignment when a report is missing (FAQ.md says none today)?
   - Behind Me offers: stay open until the ally answers, or keep 2 minutes and tell the Lightkeeper who was offered? (#59)
3. **Then the fix round:** the no-decision fixes (#51, #52, #53, #54, #55, #56, #57, and the verified #60 lines: join notice wording, key info slip) plus whatever the decisions settle. Each verifier's root cause and fix is in `verify_result.json` by cluster key; the issue bodies carry them too. Group by area, one worktree per group, implement, Opus review with `decisions.md`, repair, merge, full suite, final Opus review, Opus browser check replaying each item's original steps against 2d86b77 as the control. Say the size first. Open one PR into `main` with "Fixes #n" lines.

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
