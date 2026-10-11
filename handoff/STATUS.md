# Candela VTT: status and next phase

Updated 11 October 2026 (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, check where PR 13 stands, then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless he has turned ultracode on for the chat. On 11 October he said his weekly tokens are fine, and the low-items phase ran 21 agents (about 2.4 million subagent tokens).
- **No resume Routine.** The hourly "Candela: resume an interrupted phase" Routine was deleted on 10 October: its sessions had no GitHub access, so each run only sent a notification. The `Resume:` line below is kept as a note for a person or a new chat; nothing reads it on a schedule. Push work in progress at least hourly anyway, since an interrupted container keeps nothing.
- At the end of each phase, **rewrite this file** (keep it under about 200 lines), commit it to this branch (`playtest-harness`, folder `handoff/`) and push it. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** from "Start prompt for the next chat" below, verbatim in a code block, so he can paste it.
- Robert's own preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, using wiki-links such as [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]].
- The session may start in another repo (SNAP). This repo is not in its list by name: attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`) and clone it to `/home/user/ttrpg_vtt_co`.

## Model and effort

Robert sets the model and effort when he opens the chat, so this section says what to set for the **next** phase. When you rewrite this file, update it, and repeat the recommendation in your last message. As your first step, check your own model (the `get_session` tool) and effort. If they differ, tell him in one line and carry on. A subagent's model and effort can be set per agent in a workflow script (`model`: sonnet, opus, haiku or fable; `effort`); the default is the chat's own. Robert asked to see the plan with models per stage before a workflow runs.

**Next phase (a second AI playtest): Opus 5.5 at high effort, ultracode on.** Players on Sonnet 5.5 medium, the Lightkeeper seat and the triage and verification on Opus 5.5 high. Robert asked whether Fable 5.1 is worse than Opus 5.5 and nobody knows: if triage looks shaky, run one small side-by-side (the same triage batch to an Opus and a Fable agent) and compare, rather than guessing.

Rules of thumb for later phases:

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps | Haiku 5.5 or Sonnet 5.5, per agent | low |
| Workflow implementers on well-specified fixes | Sonnet 5.5, per agent | medium |
| Workflow reviewers, verifiers and browser checks | Opus 5.5 | high |

What worked in the low-items phase: sort first (6 read-only Sonnet agents), then one Sonnet implementer per group in its own git worktree, one Opus reviewer per group, a Sonnet repair pass, merge, the full backend suite, then ONE Opus agent driving Chromium on the real build. That last step caught a crash (an undeclared prop) that the build and every review had missed, so never skip a real-browser check. Leave ultracode off unless Robert turns it on.

## Where things stand

- `main` is at **730cfda** (PR 11 and 12 merged on 10 October). Robert deployed them on 11 October.
- **PR 13** (https://github.com/austincauwels/TTRPG_VTT_CO/pull/13, branch `claude/candela-vtt-dev-1p5kjh`, last commit 63d80f4) fixes the playtest report's low items. Check its CI and reviews first. Merge only when Robert says so; he then runs `bash candela/update.sh` and players reload.
- **What PR 13 holds** (report items 24 to 67; ranks are the report's `rank`):
  - 39 fixed: creator and formation (24, 25, 28, 30, 34, 37, 38, 56, 65, 66, 67), scene desk (27, 31, 32, 33, 41, 60, 61), circle pages (29, 42, 48, 49, 54, 58, 62, 63), rolls and sheet (26, 39, 43, 45, 46, 47, 59), Notebook and joining (40, 44, 50, 51, 52, 53).
  - Already done before: 55, 57. Left alone on purpose: 35 (the formation papers stay a blocking dialog), 36 (Let Them In stays a notice with only Close), 64 (the hourglass stays sand only, DESIGN.md).
  - Robert said yes to the default for every wording or product choice, for example "Atmosphere" for players, "The Circle's Chapter House", dice on other people's roll lines, "Ability uses and the hourglass are reset; marked gear is cleared", and the advance log naming what was gained.
  - DESIGN.md now records the one exception to "no permanent help" that the circle page needed.
- **Checked:** backend suite 1,834 passed, 1 skipped; `vite build`; five Opus group reviews (each found real problems, fixed); Chromium on a phone (390x844) and a laptop (1440x900) on the real build, no console errors. The first browser run found a crash in `ActionInfo` and two info slips running off a phone, fixed in 63d80f4 and rechecked.
- **Not checked:** a real screen reader (NVDA or VoiceOver); phone and laptop only, not a tablet.
- The roll log lines keep their old format with its dash, because tests pin it; the dice are added after it.

### Leftovers from PR 11 (known, accepted)

- The report's "gold top pip on every gilded action" was not done: an action rated 0 has no pip. The star beside the name marks every gild.
- The creator's step 3 row overflows below about 356px wide, as it did before.
- The Lightkeeper's copy of a sheet does not show held marks; the item 15 log line tells her instead.
- A few rare multi-mark timings can still clear a held box one round trip early.
- After a server restart, a stale offer card's decline still lands its mark (the restart rule, in QUIRKS.md).
- Notebook drafts stay in the browser after Sign out, under that account's key. They are never shown to another account.
- A sketch drawing is lost on Back after a reload. There is no `beforeunload` prompt.
- After a reload on a desk and leaving by its button, Back from the hub passes one older hub entry before leaving the site.

### Already there before PR 11 (not fixed)

- A player stays on a dead desk when the Lightkeeper retires the campaign: no frame arrives, and mark taps are refused with "Not allowed." (QUIRKS D3).
- After Flourish, the result slip still shows the old outcome; the log line has the pushed result. A fix needs a new roll-outcome message.
- Some notebook phone controls are under 44px (folder tabs, author chips, contents rows; the rows' 40px feeds the pagination maths).
- The sheet's ability tab resets on a tab switch (from PR 8).
- The server's activity history and held offers live in memory, so a restart empties them.

## Next phase

1. Check PR 13 (CI, reviews, merged or not). If Robert has merged it, confirm he ran `bash candela/update.sh`.
2. **Run a second AI playtest** against the new build (`playtest/HANDOFF.md`), with ultracode on and the models above. Say the size of the run first and show the plan with models per stage. Ask Robert only if the size is far above PR 11's 42 agents.
3. Triage the new report the same way as before: sort by severity, verify each claim with an Opus agent against the code, then fix in groups (a Sonnet implementer and an Opus reviewer per group, a real-browser check at the end).

### Open questions for Robert

- None.

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

## How the browser checks were done in PR 6

No frontend test runner exists, so changes were checked in Chromium with Playwright 1.56 (`/opt/pw-browsers/chromium-1194`):
- Backend on port 8300 with its own database; `vite preview` on 4300 with a copy of `vite.config.js` pointing at 8300 (kept out of git via `.git/info/exclude`).
- A table built through the API (register, `/campaign/create`, forge, join, approve). The circle exists only after a desk or `circle-creation-state` touches it; then seal it in SQL (`is_finalized`, `reports_open`, `resources_editable`).
- Each desk opened by writing the store's `candela-vtt-storage` (accessSession from the register answer, stage `DESK` or `GM_DASH`, lastPlayedCampaign) with `addInitScript`.
- A stall was made with `page.routeWebSocket`, holding back the server's frames on one connection only.
- A gilded die waiting for its choice wobbles, so Playwright never sees it stable: press Enter on it instead of clicking.

## How to work in this repo

- **Branch and PR:** work on the branch the session assigns, then open a PR into `main`. Merge only when Robert says so. He deploys on his server with `cd ~/projects/gatergrid-web && bash candela/update.sh`; with no argument it deploys the newest `main`. Tell him that players should reload their tabs afterwards.
- **Commits:** match the repo's style (`git log -8`): a short title, a body saying what changed and how it was checked, no em dashes, and the trailer lines the session gives you. Never write model names into the repo.
- **Docs:**
  - `DESIGN.md` holds the look and wording rules ("Lightkeeper", never "GM", on screen; 44 px touch targets).
  - `FAQ.md` holds the rules as implemented.
  - `docs/refactor/WEBSOCKET.md` lists every message.
  - `docs/refactor/QUIRKS.md` lists known odd behaviour pinned by tests: flip those tests when you fix one, and never delete them.
  - Update these files when you change what they describe.
- **Schema changes:** `init_db` adds columns at startup with `add_columns`; there is no Alembic. Update the pinned tests in `backend/tests/test_00_startup.py`, and `test_surface.py` for new messages.
- **Backend tests:** they need PostgreSQL. A fresh container needs this setup:
  ```
  apt-get install -y postgresql            # if /usr/lib/postgresql/16/bin is missing
  mkdir -p /var/tmp/candela-pg && chown postgres /var/tmp/candela-pg
  su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/tmp/candela-pg/data -A trust"
  su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/tmp/candela-pg/data -l /var/tmp/candela-pg/pg.log -o '-p 5433' start"
  python3 -m venv ~/.venv-candela && ~/.venv-candela/bin/pip install -r backend/requirements.txt -r backend/requirements-dev.txt
  ```
  Then run `~/.venv-candela/bin/python -m pytest -q` in `backend/`, with `DATABASE_URL=postgresql://postgres@localhost:5433/<a throwaway db>`, `SECRET_KEY` set to any hex and `CORS_ORIGINS=http://localhost:5173`. Create the database first and drop it after. The full suite is now 1,831 tests and takes about 6 minutes. The CI workflow runs the same suite on every PR.
- **Frontend:** `cd frontend && npm ci && npx vite build`. For browser checks, use Playwright with the Chromium in `/opt/pw-browsers`. `playtest/package.json` and `playtest/lib.js` show how. Serve a build with `vite preview`, using a copy of `frontend/vite.config.js` whose proxy targets point at your backend's port; never commit that copy.
- **Browser check harness from PR 9:** to build a table over the API, register users (`/api/auth/register`), create a campaign (`/campaign/create`), forge (`/api/investigators/forge`), join, approve, then GET `circle-creation-state`. Seal it in SQL (`circles.is_finalized`, `campaigns.roster_finalized`, `reports_open`). Seed the desk by writing `candela-vtt-storage` in an init script guarded by sessionStorage, so a reload keeps the live state. The global Playwright is at `/opt/node22/lib/node_modules/playwright`. `page.routeWebSocket` with `connectToServer` passes the subprotocol through, so it can stall one socket.
- **Checks from PR 11:** `playtest/checks/` on this branch has the recheck harness: `setup.js` builds three tables over the API, `lib.js` opens seats with a seeded store. Its README says how to run it. Two gotchas from this phase:
  - A worker restart stops PostgreSQL. Start it again with the `pg_ctl ... start` line above.
  - Never `pkill -f` a pattern that also appears in your own shell command, because it kills that shell (exit 144). Kill by PID, from `ps -eo pid,args`.

