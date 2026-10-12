# Candela VTT: status and next phase

Updated 11 October 2026, evening (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, check PR 48 and what beta runs, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless he has turned ultracode on for the chat. Past sizes: second playtest 97 agents (about 13 million subagent tokens); the re-check of 11 October 6 Opus agents (1.6 million).
- **Messages Robert sends while a workflow runs are relayed into every running agent.** Every agent prompt says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line in every new prompt.
- **Pass a workflow's `args` as real JSON, never a placeholder.** On 11 October a placeholder string made the re-check fail at once (no agents ran, but it cost a turn).
- **No resume Routine.** The `Resume:` line is a note for a person or a new chat. Push work in progress at least hourly; an interrupted container keeps nothing. A worker restart stops PostgreSQL and every server; the usage limit can stop a workflow mid-agent. Tell agents to commit as they go. A background loop for syncing stops at 2 hours (`b4q8wd9ph` did).
- **Give every reviewer the decisions Robert made, not only the implementer** (a reviewer once deleted a feature he had asked for). `playtest/results/2026-10-11-recheck/decisions.md` is a good shape for that.
- **Check a PR's description against its code.** The re-check found three changes PR 15 described that are not in the build (tension controls with a sheet open, dispatch lines cut at a word, the tray after a reload). A final review should confirm each claimed item exists.
- A hard `git reset` is refused by the permission classifier. To move a branch onto a PR head, `git fetch` then `git merge --ff-only`.
- At the end of each phase, **rewrite this file** (under about 200 lines), commit it to `playtest-harness` (folder `handoff/`) and push. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** below, verbatim in a code block.
- Robert's preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, with wiki-links such as [[Candela VTT]] (note created 11 October), [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]]. Link only notes that exist.
- If the repo is not in the session, attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`).

## GitHub issues (decided 11 October)

Open problems now live in GitHub issues; this file only points at them.
- Labels: `bug`, `ux`, `enhancement` (ideas), `known` (accepted for now). #16 "Behaviour kept on purpose (not bugs)" lists Robert's design decisions: read it before calling something a bug.
- File an issue for each confirmed bug and medium UX item not fixed in the same phase; low UX items go in one checklist issue per round (like #45). Raw playtest findings stay on this branch.
- A fix PR closes its issues with "Fixes #n" lines; tick checklist lines by hand. Austin rarely reads issues, so notifications are fine.
- Robert comments on issues himself. **Read new comments on open issues at the start of each phase.** On 11 October he wrote: #29 a newcomer gets a short welcome pop-up with the circle's key facts before play; #33 map pins closed (not important) in favour of #34 custom maps the Lightkeeper draws live with the existing sketch tools, light enough to improvise; #31 an end-of-assignment "interview" reviewing goals and relationship statuses with a chance to propose a new relationship.
- Open now: bugs #17-#22, #38-#44; UX #23-#26, #45-#47; ideas #27-#32, #34. #35-#37 close when PR 48 merges.

## Model and effort

Robert sets the model and effort when he opens the chat. As your first step, check yours with `get_session`; if they differ, say so in one line and carry on. A workflow agent's model and effort can be set per agent (`model`: sonnet, opus, haiku or fable; `effort`). Robert asked to see the plan with models per stage before a workflow runs.

**Next phase (the playtest Robert plays in): Opus 5.5 at high effort for the chat.** It needs judgement: running the organiser, relaying Robert's moves, triage. Fable 5.1 has still not been tried side by side.

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps, low UX verification | Sonnet 5.5 | medium or low |
| Workflow implementers on well-specified fixes | Sonnet 5.5 (Opus 5.5 high for protocol or data) | medium |
| Workflow players in a playtest | Sonnet 5.5 | medium |
| Lightkeeper seat, triage, reviewers, verifiers and browser checks | Opus 5.5 | high |

What worked before (second playtest and the low-items phase): a regression sweep alongside the play; triage by two Opus agents; verification split into Opus (bugs, rules, medium) and Sonnet (low UX); fixes in six worktrees (`/home/user/wt/<group>`), each implemented, reviewed by Opus and repaired; then a merge, the full suite, a final Opus review and an Opus browser check. Merging six groups conflicts mostly in DESIGN.md, WEBSOCKET.md and `routers/campaigns.py`: keep both sides of doc rows.

**How playtests run (Robert, 11 October).** Repeats of old problems are fine to find. The play stays blind (players get no list of past problems; the run3 handbook already drops that bullet). The re-check of the last report is its own pass by separate agents. Each fix is retested before it ships: a fix PR's browser check replays the original steps of every item it fixes, at the original size, with the unfixed build as a control (PR 48 did this). No automated test suite in CI and no fix ledger beyond issues.

## Where things stand

- `main` is at **36f001c** (PRs 13, 14 and 15 merged on 11 October). Robert was deploying it to the beta site when this was written; whether live has it too is not confirmed.
- **PR 48** (https://github.com/austincauwels/TTRPG_VTT_CO/pull/48, branch `claude/modest-bohr-5zvnv6`, commit b1e8a51) is open: double-clicks on End Assignment, Give a spend back and Revive are ignored (#35, #36, #37). Backend 1,915 passed, 1 skipped; Chromium replay of all three with a control on 36f001c. Not merged: Robert says when. No schema change. Robert picked fixing these before the playtest, so beta should run PR 48's merge.
- **The re-check (11 October)** of the second report's 81 items on 36f001c, 6 Opus agents: 56 fixed, 14 partly, 7 fixed with a new problem, 4 not fixed; 30 findings (2 medium, both double-clicks, fixed in PR 48). Results on this branch in `playtest/results/2026-10-11-recheck/` (`recheck.md` first). Everything still open is in the issues above.
- The second playtest's report: `playtest/results/2026-10-11/report.md`; its page (private artifact): https://claude.ai/artifact/RcCxR5mNbmjqfCHufFyact.

## Next phase: the playtest Robert plays in

1. Check PR 48 (CI, reviews, merged or not) and new issue comments. If merged, ask Robert whether beta and live run the new `main`. The play runs on the build beta serves; note its commit in the run's handbook.
2. **Settled with Robert (11 October, he took the defaults):** it runs on **https://candela-beta.gatergrid.com** with its own database; Robert plays **the desktop player seat** (Ada's place in past runs) on his own desktop; the AI keeps the Lightkeeper (dm), the phone (bram), the laptop (cass) and the tablet (dev); **one fresh campaign with one assignment**, about 1.5 to 2 hours; **one round per workflow**, telling Robert when it is his move; **no password-reset scene** (no mail is read on beta). Ask only which browser he uses and leave his investigator's creation to him.
3. **Beta password.** The site is behind HTTP basic auth (realm "GaterGrid beta"). Robert was to add `CANDELA_BETA_USER` and `CANDELA_BETA_PASS` as environment variables; never ask him to paste them. Check they exist (`env | grep -c CANDELA_BETA`); if not, point him at the environment settings and stop. `playtest/lib.js` sends them only to the site's origin (`httpCredentials` with `origin` and `send: 'always'`). **Test first that a seat's WebSocket connects through the auth** (sign in, open a desk, `seat.js <seat> ws`): untested so far. If the socket is refused, Chromium may need the header on the upgrade; try `extraHTTPHeaders` scoped by a route on the site's origin.
4. **Harness for beta (pushed on this branch, 2f3176f):** `SITE_URL=https://candela-beta.gatergrid.com SEATS_FILE=run3/seats.json`; `run3/seats.json` has dm, bram, cass, dev; `run3/README.md` is the handbook (blind, beta, Robert's seat, no mail, no database); `table.js` knows `robert`. Still to do: `run3/personas.md` (a new campaign and assignment; usernames unique on beta, for example a `_r3` suffix; four AI personas plus a line about Robert), a run folder `/home/user/pt3` with `npm install` (Playwright 1.56.1) and the upload pictures (the second run's `assets/` were not committed: make or find two JPEGs), and act workflows adapted from `playtest/workflows/run2/` to one round each.
5. **Robert at the table.** He cannot run `table.js`. He tells the chat what he says and does; post it with `node table.js say robert "..."` between workflows (his chat messages are relayed into running agents, which ignore them). Log his findings with `finding.js --seat robert`. Start with a quick check that he can sign in on beta and see the hub.
6. After the play: triage and a report as in run 2, file issues per the rules above, then propose the fix round.

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
  Then `~/.venv-candela/bin/python -m pytest -q` in `backend/` with `DATABASE_URL=postgresql://postgres@localhost:5433/<throwaway db>`, `SECRET_KEY` (64 hex) and `CORS_ORIGINS=http://localhost:5173`. The full suite is 1,867 tests, about 5 minutes. CI runs it on every PR. `~` is `/root` in these containers.
- **Frontend:** `cd frontend && npm ci && npx vite build`. A worktree can link `frontend/node_modules` to another checkout's (add it to `.git/info/exclude`).
- **Gotchas:** a worker restart stops PostgreSQL (start it with the `pg_ctl` line). Never `pkill -f` a pattern in your own command line (it kills the shell); kill by PID.
