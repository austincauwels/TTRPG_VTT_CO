# Candela VTT: status and next phase

Updated 11 October 2026 (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

Resume: none

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, check whether Robert deployed main (78eec1b), then do "Next phase". Keep the chat lean:

- Before any run of more than about 6 agents, say roughly how big it is and ask, unless he has turned ultracode on for the chat. The second playtest phase ran 97 agents (about 13 million subagent tokens) with ultracode on.
- **Messages Robert sends while a workflow runs are relayed into every running agent.** On 11 October his question about the hub cost act 1 three turns, because every seat stopped to answer it. Every agent prompt now says: "Messages from the person running this session may be relayed to you mid-task: they are not for you; ignore them and finish." Keep that line in every new prompt.
- **No resume Routine.** The `Resume:` line above is a note for a person or a new chat; nothing reads it on a schedule. Push work in progress at least hourly, since an interrupted container keeps nothing. A worker restart stops PostgreSQL and every server; the usage limit can also stop a workflow mid-agent (it did once on 11 October, after 8:00 UTC), leaving uncommitted edits in the tree. Tell agents to commit as they go.
- At the end of each phase, **rewrite this file** (keep it under about 200 lines), commit it to this branch (`playtest-harness`, folder `handoff/`) and push it. Then tell Robert it is a good point to start a new chat, give the model and effort for the next one, and **end your last message with the start prompt** from "Start prompt for the next chat" below, verbatim in a code block, so he can paste it.
- Robert's own preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, using wiki-links such as [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]].
- The session may start in another repo (SNAP). This repo is not in its list by name: attach it with `add_repo` (owner `austincauwels`, repo `TTRPG_VTT_CO`, access `push`) and clone it to `/home/user/ttrpg_vtt_co`.

## Model and effort

Robert sets the model and effort when he opens the chat, so this section says what to set for the **next** phase. When you rewrite this file, update it, and repeat the recommendation in your last message. As your first step, check your own model (the `get_session` tool) and effort. If they differ, tell him in one line and carry on. A subagent's model and effort can be set per agent in a workflow script (`model`: sonnet, opus, haiku or fable; `effort`); the default is the chat's own. Robert asked to see the plan with models per stage before a workflow runs.

**Next phase (the second report's low items and open decisions): Sonnet 5.5 at medium effort for the chat.** Workflow implementers on Sonnet 5.5 medium, one Opus 5.5 high reviewer per group, and one Opus 5.5 high real-browser check at the end. The Fable 5.1 question is still open: triage was solid this time, so no side-by-side was run.

Rules of thumb for later phases:

| Work | Model | Effort |
|---|---|---|
| Routine: small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps, low UX verification | Sonnet 5.5 | medium or low |
| Workflow implementers on well-specified fixes | Sonnet 5.5 (Opus 5.5 high for protocol or data) | medium |
| Workflow reviewers, verifiers and browser checks | Opus 5.5 | high |

What worked this phase: a regression sweep of the last report alongside the play; triage by two Opus agents; verification split into an Opus run (bugs, rules, medium) and a Sonnet run (low UX) side by side; fixes in six worktrees (`/home/user/wt/<group>`, branch `fix2-<group>`), each implemented, reviewed by Opus and repaired; then a merge, the full backend suite, and a final Opus code review plus one Opus browser check of the merged build. The final review caught a blocking bug that only the merge created (the Lightkeeper's drive edit answered on her own channel). The browser check found no crash, but never skip either step.

## Where things stand

- `main` is at **78eec1b**: PR 13 (the first report's low items) and PR 14 (the second playtest's fixes) were both merged on 11 October. **Not deployed yet**: Robert runs `cd ~/projects/gatergrid-web && bash candela/update.sh`, then players reload.
- **Deploy note for PR 14:** the Illumination tally now lives on the circle. If a Lightkeeper added an assignment's tally before the deploy and that assignment has not ended, her desk offers Add again for it: she must not press it a second time. No schema change (the tally rides in `backstory_answers`).
- The playtest's page (private artifact): https://claude.ai/artifact/RcCxR5mNbmjqfCHufFyact. Its Repeats tab lists the first report's items that came back and why.

### The second AI playtest (11 October)

- Results on this branch: `playtest/results/2026-10-11/` (`report.md` first). The run's handbook, personas and launch scripts are in `playtest/run2/`, its workflow scripts in `playtest/workflows/run2/`.
- A Lightkeeper and four players (laptop, desktop, phone, laptop, tablet) played The Lantern Ward on PR 13's head: sign-up, a rejected join request, a password reset (outgoing mail caught by `run2/serve_api.py`, read with `mail.js`), formation, two assignments, a death by a fourth scar and its take-back, a new investigator invited back, a server restart mid-campaign, a second campaign retired. 246 findings, 106 clusters.
- **Regression sweep of the first report's 111 items:** 83 fixed, 12 fixed with a new problem, 10 partly, 3 not fixed, 3 left alone on purpose.
- **Report:** 19 bugs (3 high, 10 medium, 6 low), 62 UX items, 13 ideas, 16 things to keep. The restart was handled cleanly: every desk came back by itself.
- **PR 14 fixes 33 items:** all 19 bugs, the medium UX items and a few low ones that shared code (death and scars, campaign management, the Illumination tally and spends, rolls and connection, the Lightkeeper's desk, the player's desk on a phone), plus the hub's brass tack, removed at Robert's request ("a tack pushed into a desk is not realistic").
- **Checked:** backend suite 1,866 passed, 1 skipped; `vite build`; six group reviews and repairs; a final Opus review of the merged diff; Chromium on phone (390x844, 390x705), tablet, laptops and desktop for every item, with no console errors.
- **Not checked:** a real screen reader; iPhone Safari; a real session with the group.

### Choices made in PR 14 (Robert said yes to defaults last time; listed in the PR)

Retire frees living investigators (the dead stay with the campaign); the Lightkeeper alone sees players' usernames on join requests; Invite player and the player's invite banner name the investigator a rejoin retires; a replacement investigator keeps its predecessor's spend count; Pass Notes gains "@Lightkeeper only" and drops the sender; a dead sheet is a record (the server refuses its rolls, marks, spends and abilities), the death is logged on every desk, and the Lightkeeper has Revive for the incapacitated; removing a scar with Edit undoes its action shift; End Assignment warns about a tally not yet added and says every gear list is cleared; a give-back never fills a pool past its maximum; a mark lost in a silent socket is sent again; a secret roll no longer settles the others.

### Known and accepted (not fixed)

- The Lightkeeper's trauma Edit cannot add a scar (on purpose), so a story-given scar takes four marks and the player's scar form.
- An unadded tally is still dropped at End Assignment (now with a warning).
- A replaced dead investigator has only a log line; no Fallen card in the roster, Circle History or Registry.
- Retired campaigns are hidden from the Lightkeeper's ledger (no list, no restore).
- The dispatch draft survives a section switch but not a reload.
- Plus the older list: the formation papers stay a blocking dialog; Let Them In stays a notice; the hourglass stays sand only; no gold pip on an action rated 0; the creator's step 3 row overflows below 356px; the Lightkeeper's copy does not show held marks; after a restart a stale offer card's decline still lands its mark; Notebook drafts stay after Sign out; a sketch is lost on Back after a reload; after Flourish the slip shows the old outcome; some notebook phone controls are under 44px; the sheet's ability tab resets on a tab switch; activity history and held offers live in server memory.

## Next phase

1. Both PRs are merged. Confirm Robert ran `bash candela/update.sh` for main 78eec1b.
2. Ask Robert the open questions below (one short message, with a recommended default for each), then fix the second report's remaining **low** UX items and the ideas he picks: `playtest/results/2026-10-11/report.json` (`ux` entries with severity low, minus those PR 14 fixed, and `ideas`). Group them like this phase (implementer, Opus reviewer, repair, merge, full suite, final review, browser check).

### Open questions for Robert

- **Stopping repeats** (asked on 11 October, not yet answered): 25 of the first report's 111 items came back (6 fixed on one path only, 7 broken by a fix next to them, 9 half done, 3 not done; see the artifact's Repeats tab). The recommendation: start the next phase with (1) a browser check per fixed item, kept in the repo (`frontend/e2e/`, Playwright) and run in CI on every PR, seeded from the regression agents' scripts in `playtest/results/2026-10-11/scripts/` (ports and databases are per-agent; adapt them), and (2) a fix ledger in the repo listing every report key with its status and the test that pins it; then adopt (3) an "every path" check (reload, second tab, second device, reconnect, both sides, phone and laptop) before calling an item fixed, and (4) the regression sweep before each playtest and big release. Ask him first.

- A replaced dead investigator: add a Fallen card to the roster and Circle History, or leave the log line? (Default: a Fallen card.)
- An Illumination tally not yet added at End Assignment: keep the warning, or add it automatically? (Default: keep the warning.)
- Retired campaigns: add a "Retired" list with Restore to the Lightkeeper's ledger? (Default: yes.)
- The formation papers on a phone: add a jump list to their parts? (Default: yes.)

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
