# Candela VTT: status and next phase

Updated 9 October 2026 (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: PR 9 on branch claude/pr9-connection, started 10 October 2026

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, check where PR 6 stands, then do "Next phase". Keep the chat lean:

- Robert hit his **weekly usage limit** on 9 October. Before any run of more than about 6 agents, say roughly how big it is and ask. Prefer one implementer plus one reviewer over wide fan-outs.
- **The hourly check-in.** A Routine ("Candela: resume an interrupted phase", hourly) reads the `Resume:` line at the top of this file. `none` means it stops at once. When you start a phase, set it to `Resume: <phase> on branch <branch>, started <date>` and push; commit and push work in progress at least every hour, since an interrupted container keeps nothing; set it back to `Resume: none` when the phase ends or when you stop to wait for Robert. A resumed session sees only what was pushed.
- At the end of each phase, **rewrite this file** (keep it under about 200 lines), commit it to this branch (`playtest-harness`, folder `handoff/`) and push it. Then tell Robert it is a good point to start a new chat.
- Robert's own preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, using wiki-links such as [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]].
- The session may start in another repo (SNAP). This repo is not in its list by name: attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`) and clone it to `/home/user/ttrpg_vtt_co`.

## Model and effort

Robert sets the model and effort when he opens the chat, so this section says what to set for the **next** phase. When you rewrite this file, update it, and repeat the recommendation in your last message so he can set it before starting the next chat. As your first step, check your own model (the `get_session` tool) and effort. If they differ from the recommendation below, tell him in one line and carry on.

**Next phase (PR 9): Opus 5.5 at high effort, ultracode off.** Connection items (`offline-not-shown`, `stale-connection-slips`), the WebSocket protocol and the effort M bugs. Check PR 8 in a browser first if Robert wants (see below).

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

- `main` is at **be7dbff** with PR 6, PR 7 and PR 8 all merged (10 October). **Not deployed yet**: Robert runs `cd ~/projects/gatergrid-web && bash candela/update.sh`, then players reload. The release adds the circle column `dispatch_text` and renames stored pen fonts at startup.
- PR 8 was checked in Chromium before merging: Suggest and the 0/5 count fit at 390 px, a long name wraps, a case or spacing duplicate says "Already suggested", Style and catalyst line breaks show, and the pen picker's Escape closes only the list. Not browser-checked: the "Choose advancements (N)" button, the Rule of Six chip and the caption change.
- Open leftovers from PR 8: the sheet's ability tab resets on a tab switch; `lk-mark-skips-abilities` got the wording fix only, a "Deal a mark" control is still open.
- **AI playtest results** stay in `playtest/results/2026-10-08/`; setup in `playtest/` (start with `playtest/HANDOFF.md`). Robert's private page: https://claude.ai/artifact/8wcvWkCfptWqtFf15XTaRG

## Next phase: PR 9 (Opus 5.5 high)

`offline-not-shown`, `stale-connection-slips` and the effort M bugs (`report-questions-tally`, `activity-log-not-persisted`, `relationship-question-in-answer`, `ability-offers-expire`, `vote-tie-leading`, `pending-join-not-live`, `keyboard-focus-dropped`, `patch-up-free-rider`, `ws-token-in-url`), plus the "Deal a mark" control and the top-ten UX list in `report.json`.

### Open questions for Robert

- Deploy `main`.

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
  Then run `~/.venv-candela/bin/python -m pytest -q` in `backend/`, with `DATABASE_URL=postgresql://postgres@localhost:5433/<a throwaway db>`, `SECRET_KEY` set to any hex and `CORS_ORIGINS=http://localhost:5173`. Create the database first and drop it after. The full suite was 1,768 tests and took about 5 minutes. The CI workflow runs the same suite on every PR.
- **Frontend:** `cd frontend && npm ci && npx vite build`. For browser checks, use Playwright with the Chromium in `/opt/pw-browsers`. `playtest/package.json` and `playtest/lib.js` show how. Serve a build with `vite preview`, using a copy of `frontend/vite.config.js` whose proxy targets point at your backend's port; never commit that copy.
- **Known quirk:** on a fresh database, the first sign-up and the first campaign's socket fail once (`seed-id-sequence-collision` in the report). Retry, or fix it in this PR: it is effort S.
