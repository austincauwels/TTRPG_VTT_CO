# Candela VTT: status and next phase

Updated 10 October 2026 (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, check where PR 11 stands, then do "Next phase". Keep the chat lean:

- Robert hit his **weekly usage limit** on 9 October. Before any run of more than about 6 agents, say roughly how big it is and ask, unless he has turned ultracode on for the chat. Prefer one implementer plus one reviewer over wide fan-outs.
- **The hourly check-in is broken.** The Routine "Candela: resume an interrupted phase" (hourly at :29) reads the `Resume:` line at the top of this file, but its sessions have **no GitHub access**: each run on 10 October stopped at the first step and sent Robert a push notification. Leave `Resume: none` until Robert fixes the Routine's environment (GitHub access for this repo) or deletes it. See "Open questions".
- At the end of each phase, **rewrite this file** (keep it under about 200 lines), commit it to this branch (`playtest-harness`, folder `handoff/`) and push it. Then tell Robert it is a good point to start a new chat.
- Robert's own preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, using wiki-links such as [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]].
- The session may start in another repo (SNAP). This repo is not in its list by name: attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`) and clone it to `/home/user/ttrpg_vtt_co`.

## Model and effort

Robert sets the model and effort when he opens the chat, so this section says what to set for the **next** phase. When you rewrite this file, update it, and repeat the recommendation in your last message so he can set it before starting the next chat. As your first step, check your own model (the `get_session` tool) and effort. If they differ from the recommendation below, tell him in one line and carry on.

**Next phase (merge and deploy PR 11, then the low items or a second playtest): Sonnet 5.5 at medium effort, ultracode off.** For a second AI playtest, see the table.

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

Leave **ultracode off** by default. The PR 11 phase ran with ultracode on at Robert's request: about 42 agents over three workflows plus a small review, roughly 8.5 million subagent tokens. That is the size of a full batch done that way.

## Where things stand

- `main` is at **4b54a69** (PR 6 to PR 10), all **live** on candela.gatergrid.com.
- **PR 11** (https://github.com/austincauwels/TTRPG_VTT_CO/pull/11, branch `claude/admiring-clarke-rnlb9p`) is **open, not merged, not deployed**. It fixes the playtest report's remaining medium items, 11 to 15 and 17 to 23 (16 was done in PR 10):
  - Creator and advancement (11, 12, 13):
    - each step opens at its top;
    - 44px controls on a phone;
    - one gild star for every gilded action, with a padlock on the specialty's gild and a printed key;
    - the advancement picker has `aria-pressed` and gives reasons.
  - Marks and abilities (14, 15, 17):
    - a held mark stays drawn held through its Undo, an offer and its trip to the table;
    - the Undo strip no longer claims the mark landed;
    - a landed mark is logged with its count;
    - offers carry `offer_id`, so stale answers are ignored;
    - Tactician, Scout and Uncanny Eye ask their question first.
  - Secret rolls (18): marked on the Lightkeeper's slip, with a "(Secret)" line on her own log only, including the history replay. Burns and post-roll abilities on a secret roll stay private.
  - Formation papers and report cards (19, 23):
    - the Lightkeeper's papers are open, with ticks per investigator;
    - Finalize counts the waiting relationships;
    - a turned report card reads as a list. `CircleControlModule.jsx` (dead) is removed.
  - Back, Notebook, sketches (20, 21, 22): Back goes to the Chapter Hub, unsent notes and entries are kept per account, campaign and seat, and sketch tools stay selected.
  - Fixes from the browser checks and reviews: offer and held-mark state is cleared on socket replacement, sign-out and desk switch; trauma record layout at 1440x900 and on phones; refusals said under the marks; and smaller items.
- **Checked:**
  - Backend suite: 1,831 passed, 1 skipped (Google sign-in).
  - `vite build` passes, and CI was green on the earlier heads.
  - Chromium on a phone, a tablet, 1366x768, 1440x900 and 1920x1080: 126 group checks passed, and the 2 that failed were fixed and rechecked.
  - Two-lens reviews per group, three reviews of the merged diff, and a verified review of the last fix round.
- **Not checked:** a real screen reader (NVDA or VoiceOver). Only the accessibility tree was checked.

### Leftovers from PR 11 (known, accepted)

- `DESIGN.md`'s No Instructions Rule now has an exception for a printed key that names marks (the creator's gild key under part B), marked as waiting for the owner. If Austin rejects it, the `aria-hidden` key in `CharacterCreator.jsx` goes.
- The report's "gold top pip on every gilded action" was not done: an action rated 0 has no pip. The star beside the name marks every gild.
- The creator's step 3 row overflows below about 356px wide, as it did before.
- The Lightkeeper's copy of a sheet does not show held marks; the item 15 log line tells her instead.
- A few rare multi-mark timings can still clear a held box one round trip early.
- After a server restart, a stale offer card's decline still lands its mark. This is the restart rule, kept on purpose, and QUIRKS.md says so.
- Notebook drafts stay in the browser after Sign out, under that account's key, as the creator's draft does. They are never shown to another account.
- A sketch drawing is lost on Back after a reload (Back then loads the page again). There is no `beforeunload` prompt.
- After a reload on a desk and leaving by its button, Back from the hub passes one older hub entry before leaving the site.
- The server log payloads for Death Defy and In the Trenches still contain an em dash. Tests pin them, and the desk shows them as ': '.

### Already there before PR 11 (not fixed)

- A player stays on a dead desk when the Lightkeeper retires the campaign: no frame arrives, and mark taps are refused with "Not allowed." (QUIRKS D3).
- After Flourish, the result slip still shows the old outcome; the log line has the pushed result. A fix needs a new roll-outcome message.
- Some notebook phone controls are under 44px (folder tabs, author chips, contents rows; the rows' 40px feeds the pagination maths).
- The sheet's ability tab resets on a tab switch (from PR 8).
- The server's activity history and held offers live in memory, so a restart empties them.

## Next phase

1. Watch PR 11: CI on its head, then Robert's merge and deploy (`bash candela/update.sh`, players reload).
2. Then pick from the report's low items (24 to 67 in `playtest/results/2026-10-08/report.json`, `ux`), or run a second AI playtest against the new build (`playtest/HANDOFF.md`).

### Open questions for Robert

- The hourly resume Routine has no GitHub access in its environment, so it can only notify. Fix its environment (give it this repo) or delete it. Its id is `trig_016NS73is9K4M2tu7kzDftLy`.
- Ask Austin about the creator's printed gild key (the No Instructions Rule exception) once PR 11 is live.

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

