# Candela VTT: status and next phase

Updated 12 October 2026 (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless he has turned ultracode on for the chat. Past sizes: second playtest 97 agents (about 13 million subagent tokens); third playtest about 45 agents in all (about 5.5 million); fourth fix round 19 agents (about 3.5 million: 5 groups of implement, review, repair = 14, then a final review, 3 browser checks and a repair). **This container has 4 CPUs, so a workflow runs only 2 agents at once**: the fix round took about 1.5 hours, the final check about 1 hour.
- **Messages Robert sends while a workflow runs are relayed into every running agent.** Every agent prompt says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line in every new prompt.
- **Pass a workflow's `args` as real JSON, never a placeholder.** A Workflow `scriptPath` must be inside the working directory: copy scripts from the harness into `/home/user/TTRPG_VTT_CO/.pt3/` (git-excluded) first.
- **No resume Routine.** A `send_later` check-in is fine as a safety net. Push work in progress at least hourly; an interrupted container keeps nothing. A worker restart stops PostgreSQL, every server and the seats' browsers (it happened once on 12 October; `start_all.sh` brought the seats back). Tell agents to commit as they go.
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
- Open now: bugs #17-#22, #38-#44; UX #23-#26, #45-#47, #60; ideas #27-#32, #34. **PR 61 closes #49-#59 when merged** and ticks three #60 lines (spend confirm, join notice, key info slip); tick those by hand after the merge.

## Model and effort

Robert sets the model and effort when he opens the chat. As your first step, check yours with `get_session`; if they differ, say so in one line and carry on. A workflow agent's model and effort can be set per agent (`model`: sonnet, opus, haiku or fable; `effort`). Robert asked to see the plan with models per stage before a workflow runs.

**Next phase (PR 61 follow-through, then Robert's pick): Opus 5.5 at high effort for the chat.** If he picks the fourth playtest, the Lightkeeper seat and triage need Opus; if he picks the older-bug round, it touches rolls and the protocol.

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

- `main` is at **2d86b77** (PR 48). **Live and beta both run 2d86b77.**
- **PR 61** (https://github.com/austincauwels/TTRPG_VTT_CO/pull/61, branch `claude/fervent-wozniak-rlk7su`, head 7b498b3 at opening) is the fourth fix round: every confirmed third-playtest item plus Robert's six decisions. Opened 12 October, not merged. Full backend suite 1938 passed, 1 skipped. Robert merges; then he deploys beta (and live when he chooses).
  - Deploy note for Robert: at startup the server re-signs the Lightkeeper's older notebook entries as "The Lightkeeper" (#54), a one-time change to stored data.
- **Decisions of 12 October** (all recommendations taken) are in `playtest/results/2026-10-12-fix4/decisions.md` and logged in the vault: release or leave at any time, by the Lightkeeper or the player, dropping votes, relationships and the current report and lowering resource maximums with no refund; spending whenever the Lightkeeper opens it, a Train die kept until used; the spend confirm stays armed; an optional 280-character report line; a non-blocking "Not filed:" line at Add Illumination and End Assignment; ally offers keep 2 minutes and are logged (offered and lapsed).
- **Fix round 4 record** in `playtest/results/2026-10-12-fix4/`: `decisions.md`, `fix_groups_result.json` (per group: implementer, review, repair), `final_check_result.json` (final review, three browser checks against the 2d86b77 control, repair), `pr_body.md`. Workflows in `playtest/workflows/run4/` (`fix-groups.js`, `final-check.js`).
- **Left open on purpose** (reasons in `final_check_result.json`): the Well-Read log keeps its em dash (`outcomes.js` parses it); no Release button on the roster card (the card opens the sheet, which has it); a spend count resets when a player leaves and rejoins (would need a decision); the keys info slip has no flip when near the top; at 1920x1080 the Circle Resources card no longer fits above the fold; the session-ended note is lost on a reload. Candidates for #60.
- **Third playtest** results stay in `playtest/results/2026-10-12-run3/` (report, findings, triage, verify). Its method notes for next time are at the end of the report.
- **Beta password:** plain environment variables `CANDELA_BETA_USER` and `CANDELA_BETA_PASS` work (Playwright `httpCredentials`). Never a network secret: it replaced the app's token on every API call. Beta's `/api` and `/ws` answer without the password (Robert knows; his call).
- **How beta is deployed** (Robert, on the server): `cd ~/projects/candela-vtt-beta && git fetch origin && git checkout beta && git merge --ff-only origin/main`, then `cd ~/projects/gatergrid-web/.claude/worktrees/candela-beta && bash candela/update.sh --beta`. Add `--now` if players are connected.

## Next phase: PR 61, then Robert's pick

1. Check PR 61: CI, reviews, merged or not. Fix red CI or review comments on its branch (the session may assign a new branch; if 61 is still open, push fixes to `claude/fervent-wozniak-rlk7su` only if the session allows, else ask). Read new comments on open issues. If 61 is merged, tick the three #60 lines it fixed and check #49-#59 closed.
2. **Ask Robert which comes next**, with a recommendation (mine: the fourth playtest, once 61 is on beta):
   - **Fourth playtest on beta** (after he deploys 61): first a separate re-check pass replaying every item of 61 on beta, then blind play. Use the run 3 method notes: settle the human seat before approvals, seed a circle near 12 Illumination to reach advancement, a timed script for the 2-minute offer window and the timer running out, and aim at scars and death, which no playtest has reached. Harness: `playtest/run3/` and `playtest/workflows/run3/` (copy to `/home/user/pt4`-style folder; `play.js` has four AI players and a `replace` step). Size: about 45 agents.
   - **Older-bug round**: bugs #17-#22 and #38-#44 and the medium UX #23-#26, #46, #47, same shape as fix round 4 (groups, review, repair, final review, browser check against the current `main`). Read each issue first; some may be stale. Size: about 20 agents.
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
- How fix round 4 was set up (repeat it): a work folder `/home/user/pt4` with `npm install` of `playtest/package.json` (Playwright), copies of the playtest's results and verify scripts (paths changed from `pt3` to `pt4`), `decisions.md` and `start_all.sh` (restarts PostgreSQL; in `results/2026-10-12-fix4/`). One worktree per group at the base commit (`/home/user/wt/<group>`, branch `fix4-<group>`), `frontend/node_modules` linked, a preview config per port (`sed` of 8000 to the port); a detached worktree `/home/user/wt/control` at the old build for the control. Each agent has its own ports and databases.
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
