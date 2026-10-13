# Candela VTT: status and next phase

Updated 13 October 2026 (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless he has turned ultracode on for the chat. Past sizes: fix round 5 had 17 agents (4 groups of implement, review, repair = 11, then a sweep, a final review, 3 browser checks and a repair; about 4 million subagent tokens, about 2.5 hours). Fix round 4: 19 agents. Third playtest: about 45. Second playtest: 97. **This container has 4 CPUs**: a workflow runs 2 to 4 agents at once.
- **Messages Robert sends while a workflow runs are relayed into every running agent.** Every agent prompt says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line. In round 5 agents still listed a relayed remark under "skipped"; harmless.
- **Pass a workflow's `args` as real JSON, never a placeholder.** Inline scripts are fine; copy them to the harness afterwards.
- **No resume Routine.** A `send_later` check-in each hour is a good safety net (snapshot work as patches into the harness and push). A worker restart stops PostgreSQL: run `start_all.sh` (it happened again on 13 October; the running workflow survived).
- **Give every reviewer the decisions Robert made, not only the implementer.** `playtest/results/2026-10-13-fix5/decisions.md` is a good shape: his issues verbatim, then numbered decisions.
- **Check a PR's description against its code.** A final review should confirm each claimed item exists.
- **`playtest-harness` has its own history, unrelated to `main`.** Work on it in a worktree (`git worktree add /home/user/harness playtest-harness`) and push it directly; the session's assigned branch is for app code. A hard `git reset` is refused; to move a branch, `git fetch` then `git merge --ff-only`.
- At the end of each phase, **rewrite this file** (under about 200 lines), commit it to `playtest-harness` (folder `handoff/`) and push. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** below, verbatim in a code block.
- Robert's preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, with wiki-links such as [[Candela VTT]], [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]]. Link only notes that exist. Vault dates are Pacific.
- If the repo is not in the session, attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`).

## GitHub issues

Open problems live in GitHub issues; this file only points at them.
- Labels: `bug`, `ux`, `enhancement` (ideas), `known` (accepted for now). #16 "Behaviour kept on purpose (not bugs)" lists Robert's design decisions: read it before calling something a bug.
- File an issue for each confirmed bug and medium UX item not fixed in the same phase; low UX items go in one checklist issue per round (#45, #60, #69). Raw findings stay on this branch.
- A fix PR closes its issues with "Fixes #n" lines; tick checklist lines by hand. Austin rarely reads issues, so notifications are fine.
- **Robert now files issues by hand from the live site** (#62 to #67 on 13 October), often several in a burst. **Read new issues and comments at the start of each phase**, and re-read before launching a workflow: he added #66 and #67 while the round was being planned.
- Open now: bugs #17-#22, #38-#44; UX #23-#26, #45-#47, #60, #69; ideas #27-#32, #34; **#67 (new, not yet worked): "Make the Illumination tracker a circle of pips around the candle icon"**. PR 68 closes #62-#66 when merged.

## Model and effort

Robert sets the model and effort when he opens the chat. As your first step, check yours with `get_session`; if they differ, say so in one line and carry on. A workflow agent's model and effort can be set per agent (`model`: sonnet, opus, haiku or fable; `effort`). Robert asked to see the plan with models per stage before a workflow runs.

**Next chat: Opus 5.5 at high effort.** The next phase is either the older-bug round (rolls and the protocol) or the fourth playtest (Lightkeeper seat and triage); both need Opus. If PR 68 only needs merge help, Sonnet 5.5 medium is enough.

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps, low UX verification | Sonnet 5.5 | medium or low |
| Workflow implementers on well-specified fixes | Sonnet 5.5 (Opus 5.5 high for protocol, data or a redesign) | medium |
| Workflow players in a playtest | Sonnet 5.5 | medium |
| Lightkeeper seat, triage, reviewers, verifiers and browser checks | Opus 5.5 | high |

What worked for fix rounds 4 and 5: one worktree per group (`/home/user/wt/<group>`, branch `fix5-<group>`), each implemented, reviewed by Opus and repaired (`playtest/workflows/run5/fix-groups.js`); then a hand merge, the full suite, and `final-check.js` (an app-wide sweep if a decision asks for one, a final Opus review, three Opus browser checks against the old build as control, one repair). Tell groups which files the others own so the merge stays clean. Merges conflict in `access.py` (GM_ONLY and RULES), `handlers/__init__.py`, `test_surface.py` (the message list must be in the same order as WS_CASES, and its count), `test_00_startup.py` (column list), WEBSOCKET.md and DESIGN.md: keep both sides.

**How playtests run (Robert, 11 October).** Repeats of old problems are fine to find. The play stays blind. The re-check of the last report is its own pass by separate agents. Each fix is retested before it ships: a fix PR's browser check replays the original steps of every item it fixes, with the unfixed build as a control. No automated test suite in CI beyond the backend tests, and no fix ledger beyond issues.

## Where things stand

- `main` is at **770a2ed** (PR 61). **Live runs 770a2ed** and nobody is playing (Robert, 13 October): he will deploy PR 68 straight to live, not via beta. Ask him whether he has.
- **PR 68** (https://github.com/austincauwels/TTRPG_VTT_CO/pull/68, branch `claude/pensive-babbage-eo1v57`, head 7be39b1) is fix round 5: Robert's hand-filed #62-#66. Open, not merged; CI was green on the head push and running on the PR at hand-off. Full backend suite 1986 passed, 1 skipped. Merge only when he says so.
  - Deploy note for Robert: two new columns are added at startup (`characters.sheet_edited`, `circles.earn_backs`).
  - **Three calls flagged in the PR for Robert:** sheet-edit log lines go to the whole table (not only the Lightkeeper); a fourth scar is the one edit the editor refuses (it is a death; #16); #65 kept the Account card and renamed its link "Edit account" (the card also holds Sign out and Retire). If he wants any changed, it is a small follow-up on the same branch before merge.
- **Decisions of 13 October** (all recommendations taken) are in `playtest/results/2026-10-13-fix5/decisions.md` and logged in the vault: players edit their whole sheet freely with each change logged and a roster dot for the Lightkeeper (detection, not prevention); both desks use the investigator's navigation; resources start and refill at 1 plus members, no Refill button, Resource Management's earn-back asked in one press, a logged manual correction; confirms are one short sentence with a one-verb button, app wide; ability questions are free text with the book's as examples; join requests become a pop-up plus a Requests tab; insignia changed by clicking; Keys and Illumination questions explained; Account without a menu of its own name.
- **Fix round 5 record** in `playtest/results/2026-10-13-fix5/`: `decisions.md`, `fix_groups_result.json`, `final_check_result.json`, `pr_body.md`. Workflows in `playtest/workflows/run5/`. Left open on purpose: #69 (eight low items).
- **Fix round 4** and the **third playtest** records stay in `playtest/results/2026-10-12-fix4/` and `2026-10-12-run3/`.
- **Beta password:** plain environment variables `CANDELA_BETA_USER` and `CANDELA_BETA_PASS` work (Playwright `httpCredentials`). Never a network secret. Beta's `/api` and `/ws` answer without the password (Robert knows; his call).
- **How beta is deployed** (Robert, on the server): `cd ~/projects/candela-vtt-beta && git fetch origin && git checkout beta && git merge --ff-only origin/main`, then `cd ~/projects/gatergrid-web/.claude/worktrees/candela-beta && bash candela/update.sh --beta`. Add `--now` if players are connected.

## Next phase: Robert's pick

1. Check PR 68 (CI, reviews, merged or not). If Robert asked for changes to the three flagged calls, make them on its branch first. Read new issues and comments (#67 and anything after).
2. **Ask Robert which comes next**, with a recommendation (mine: the older-bug round, folding in #67 and any new hand-filed issues, then the fourth playtest once that is live):
   - **Older-bug round**: bugs #17-#22 and #38-#44, the medium UX #23-#26, #46, #47, and #67. Read each issue first; some may be stale after rounds 4 and 5 (round 5 changed the desk navigation, the sheet and circle resources). Same shape as round 5. Size: about 15 to 20 agents.
   - **Fourth playtest on live or beta**: a re-check pass of PRs 61 and 68, then blind play. Use the run 3 method notes: settle the human seat before approvals, seed a circle near 12 Illumination to reach advancement (and Resource Management's earn-back), a timed script for the 2-minute offer window, and aim at scars and death. Harness: `playtest/run3/` and `playtest/workflows/run3/`. Size: about 45 agents.
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
