# Candela VTT: status and next phase

Updated 10 October 2026 (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, check where PR 10 stands, then do "Next phase". Keep the chat lean:

- Robert hit his **weekly usage limit** on 9 October. Before any run of more than about 6 agents, say roughly how big it is and ask. Prefer one implementer plus one reviewer over wide fan-outs.
- **The hourly check-in.** A Routine ("Candela: resume an interrupted phase", hourly) reads the `Resume:` line at the top of this file. `none` means it stops at once. When you start a phase, set it to `Resume: <phase> on branch <branch>, started <date>` and push; commit and push work in progress at least every hour, since an interrupted container keeps nothing; set it back to `Resume: none` when the phase ends or when you stop to wait for Robert. A resumed session sees only what was pushed.
- At the end of each phase, **rewrite this file** (keep it under about 200 lines), commit it to this branch (`playtest-harness`, folder `handoff/`) and push it. Then tell Robert it is a good point to start a new chat.
- Robert's own preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, using wiki-links such as [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]].
- The session may start in another repo (SNAP). This repo is not in its list by name: attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`) and clone it to `/home/user/ttrpg_vtt_co`.

## Model and effort

Robert sets the model and effort when he opens the chat, so this section says what to set for the **next** phase. When you rewrite this file, update it, and repeat the recommendation in your last message so he can set it before starting the next chat. As your first step, check your own model (the `get_session` tool) and effort. If they differ from the recommendation below, tell him in one line and carry on.

**Next phase (PR 10 fixes, then the leftovers below): Sonnet 5.5 at medium effort, ultracode off.** Opus 5.5 high only for a final review before a PR.

Rules of thumb for later phases:

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps (renames, copy edits, finding call sites) | Haiku 5.5 or Sonnet 5.5, passed per agent | low |
| Workflow implementers on well-specified fixes | Sonnet 5.5, passed per agent | medium |
| Workflow reviewers and verifiers | Opus 5.5 | high |
| A second AI playtest: player seats / Lightkeeper / triage and verification | Sonnet 5.5 medium / Opus 5.5 high / Opus 5.5 high | as listed |

Leave **ultracode off** by default. It turns every task into a multi-agent workflow, which is what used up the weekly limit. Ask for a workflow by name ("use a workflow") only for a playtest or a large batch, and say its size first.

## Where things stand

- `main` is at **da2b4c1** (PR 6 to 9 merged and deployed). **PR 10 is open, not merged**: branch `claude/elegant-curie-9sa9z6`, 4 commits on `main`. Robert merges it and deploys with `cd ~/projects/gatergrid-web && bash candela/update.sh`; players reload. No schema change.
- **PR 10 contains** (from the playtest's top-ten UX list):
  - Table in view: a `TableStrip` (tension, timer, newest log line) under the phone's band, on the tablet's page, over the notebook, and on the Lightkeeper's pages that replace the table column; player rail scrolls as a whole with a floor for Your Circle, the log keeps 9 rem, the dice column scrolls inside itself; on a tablet the rail follows the dice in the page; the Lightkeeper's Roster tab opens the roster, not the last sheet.
  - "New" dots on the phone Menu, drawer rows and the md+ Circle tab (store `unseen`, `markSeen`).
  - Log lines for the dispatch, tension, timer, reports opening/closing, a filed or amended report and the Lightkeeper's resource edits (`table_lines`, `log_line` in the backend).
  - Gilded choice wording (`keepChoices`); circle resources spent in two presses with the reason printed; `gm_return_spend` and "Give a spend back" on the Lightkeeper's sheet.
  - Checked: backend suite passed on a fresh database (1,812 tests with the new ones); Chromium checks of the dots, strip, drawer, two-press spend, spend back, gilded wording, and the xl and lg layouts. An Opus review found a cross-campaign hole in `gm_return_spend`, a double-click spend and a lost update; all fixed.
- Not done in PR 10: `rule-of-six-stepper` was already fixed in PR 8 (the optional "stop the stepper where no action can use another die" is not done); an Undo after a spend (the two-press ask replaced it; the Lightkeeper can give a spend back); `log-squeezed-by-slip` and `left-rail-squeezed` are fixed by the CSS floors but were checked only at 1366x768 and 1100x800 with two members, not with a long slip; at lg and up Tab order now follows the page (sheet, dice, rail) not the screen (rail first), a deliberate trade for tablets.
- Open leftovers: the sheet's ability tab resets on a tab switch (from PR 8); the server's activity history and held offers live in memory, so a restart empties them.
- **AI playtest results** are in `playtest/results/2026-10-08/` (start with `playtest/HANDOFF.md`). Next candidates from the report's ranked UX list after PR 10: the items below its top ten (read `report.json`, `ux`).

## Next phase

Wait for Robert to merge PR 10 (or send review comments), then pick from the report's remaining UX items or run a second AI playtest.

### Open questions for Robert

- None.

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
  Then run `~/.venv-candela/bin/python -m pytest -q` in `backend/`, with `DATABASE_URL=postgresql://postgres@localhost:5433/<a throwaway db>`, `SECRET_KEY` set to any hex and `CORS_ORIGINS=http://localhost:5173`. Create the database first and drop it after. The full suite was 1,805 tests and took about 4 minutes. The CI workflow runs the same suite on every PR.
- **Frontend:** `cd frontend && npm ci && npx vite build`. For browser checks, use Playwright with the Chromium in `/opt/pw-browsers`. `playtest/package.json` and `playtest/lib.js` show how. Serve a build with `vite preview`, using a copy of `frontend/vite.config.js` whose proxy targets point at your backend's port; never commit that copy.
- **Browser check harness from PR 9:** to build a table over the API, register users (`/api/auth/register`), create a campaign (`/campaign/create`), forge (`/api/investigators/forge`), join, approve, then GET `circle-creation-state`. Seal it in SQL (`circles.is_finalized`, `campaigns.roster_finalized`, `reports_open`). Seed the desk by writing `candela-vtt-storage` in an init script guarded by sessionStorage, so a reload keeps the live state. The global Playwright is at `/opt/node22/lib/node_modules/playwright`. `page.routeWebSocket` with `connectToServer` passes the subprotocol through, so it can stall one socket.
