# Candela VTT: status and next phase

Updated 9 October 2026 (Pacific). This file is the hand-off between chats. A new chat starts here instead of carrying a long conversation forward.

## For the next chat: start here

You are continuing work on **Candela VTT** (`austincauwels/TTRPG_VTT_CO`), a web app for the tabletop RPG Candela Obscura. Austin wrote it and runs the game; Robert (the user) runs the server and deploys. Read this file, apply what is in "Next phase", and keep the chat lean:

- Robert hit his **weekly usage limit** on 9 October. Before any run of more than about 6 agents, say roughly how big it is and ask. Prefer one implementer plus one reviewer over wide fan-outs.
- At the end of each phase, **rewrite this file** (keep it under about 200 lines), commit it to this branch (`playtest-harness`, folder `handoff/`) and push it. Then tell Robert it is a good point to start a new chat.
- Robert's own preferences: plain language, short answers, no em dashes; log durable decisions and facts to his Obsidian vault with the Galga `append_daily_log` tool, after reading the vault's `CLAUDE.md`, using wiki-links such as [[Austin]], [[Candela Obscura Campaign]] and [[GaterGrid Server]].

## Model and effort

Robert sets the model and effort when he opens the chat, so this section says what to set for the **next** phase. When you rewrite this file, update it, and repeat the recommendation in your last message so he can set it before starting the next chat. As your first step, check your own model (the `get_session` tool) and effort. If they differ from the recommendation below, tell him in one line and carry on.

**Next phase (PR 6): Opus 5.5 at high effort, ultracode off.** PR 6 starts with the hardest bugs in the backlog: rolls counted twice during a connection stall, a gilded roll that must survive a reload, and a report form that silently overwrites. These are races and protocol changes, where a cheaper model is more likely to ship a subtle bug.

Rules of thumb for later phases:

| Work | Model | Effort |
|---|---|---|
| Routine: applying patches, small UI fixes, wording, docs, PR housekeeping, deploy help | Sonnet 5.5 | medium |
| Races, the WebSocket protocol, rules logic, data loss, a final review before a PR | Opus 5.5 | high |
| A stubborn bug that resisted one attempt | Opus 5.5 | xhigh (never max) |
| Workflow agents doing mechanical sweeps (renames, copy edits, finding call sites) | Haiku 5.5 or Sonnet 5.5, passed per agent | low |
| Workflow implementers on well-specified fixes | Sonnet 5.5, passed per agent | medium |
| Workflow reviewers and verifiers | Opus 5.5 | high |
| A second AI playtest: player seats / Lightkeeper / triage and verification | Sonnet 5.5 medium / Opus 5.5 high / Opus 5.5 high | as listed |

Leave **ultracode off** by default. It turns every task into a multi-agent workflow, which is what used up the weekly limit. Ask for a workflow by name ("use a workflow") only for a playtest or a large batch, and say its size first.

## Where things stand

- `main` is at **4794611**: the merge of PR 5 (live Lightkeeper sheets, the hourglass and its countdown timer, the trauma record's Edit, resource help, hub papers placed differently each visit). It is **live** on candela.gatergrid.com, and the new bundle was confirmed.
- Merged PRs: #3 (b7ed87a), #4 (1fc2d88), #5 (4794611). There is no open PR.
- **AI playtest:** an AI Lightkeeper and four AI players played a full session and logged 277 findings. Every bug was then reproduced on a fresh copy, with its cause in the code. Results are on this branch in `playtest/results/2026-10-08/`. `report.json` and `report.md` hold the ranked bugs, each with root cause, fix and effort, and a top-ten "fix these first" list. The setup to run another playtest is in `playtest/` (start with `playtest/HANDOFF.md`). Robert also has a private page with all the logs: https://claude.ai/artifact/8wcvWkCfptWqtFf15XTaRG

## Next phase: PR 6

Robert asked for two things: three desk tweaks, and fixes from the playtest. One PR is fine.

### Desk tweaks (his words in quotes)

1. "Invite player back is too front and center for something typically done once in a blue moon, also just use invite player as the text." **Done** in patch `desk-tweaks/0001`: renamed "Invite player" and moved to a quiet text button by the Roster's join requests, out of the table column.
2. "The dispatch template is corny, and should be an optional template, if the light keeper has their own dispatch they can send that." **Half done** in patch `desk-tweaks/0002` (WIP, untested). The plan: writing her own is the default; "Use the template" keeps today's wording as an option; the choice is remembered per browser. Her own text goes in a new circle column `dispatch_text`, limited to 2000 characters and validated in `gm_update_circle`, sent in `get_circle_dict` and cleared by End Assignment. The players' card shows exactly what was sent, line breaks kept. Finish it, test it, then check it in the browser on phone, tablet and desktop.
3. "Instead of clear name for circle make it say edit." **Not started.** On the Lightkeeper's circle page (`CirclePage.jsx`), the two-press "Clear name" becomes "Edit". The name turns into an input holding the current name: Enter or leaving the field saves, Escape cancels, and an empty name is never saved. Give the chapter house the same treatment if it uses the same pattern.

### Playtest fixes

Robert has not picked a size yet. Recommend **lean first** and ask. Lean means:

- the four high-severity bugs: `report-forgets-sent`, `gilded-reload-free-reroll`, `offline-roll-double`, `resource-double-click-double-spend`;
- finishing the half-done work below;
- any of the report's cheap fixes (effort S) that touch the same code.

Everything else from `report.json` (44 bugs, top-ten UX items) can follow in PR 7. Partial work already exists:

- `pr6-circle/0001-0003` are done: the report form's tape, relationship labels on Your Circle, and resources before the seal. `pr6-circle/0004` is a WIP start on `report-forgets-sent` and the report tally (it adds `backend/vtt/assignment.py`).
- `pr6-dice/0001` is a WIP start on `gilded-reload-free-reroll`: the server re-sends a pending gilded choice on connect.

Treat the WIP patches as drafts. Read them, keep what is right, and test everything.

### Open questions for Robert

- PR 6 size: lean (recommended) or the full list?
- He asked whether the hourglass empties with the timer. It does not: the sand shows tension only, and the timer is separate. Should the sand drain with a running countdown, then go back to tension when it stops?
- An optional hourly check-in that resumes work after a usage limit resets (offered, never answered).

## Saved work in progress: `handoff/patches/`

Each series applies cleanly on top of `main` (4794611):
```
git fetch origin playtest-harness main
git checkout -b <your branch> origin/main
git show origin/playtest-harness:handoff/patches/desk-tweaks/0001-Invite-player-a-quiet-button-by-the-join-requests-of.patch | git am
# or check out the branch into a folder and run: git am <folder>/handoff/patches/<series>/*.patch
```
Apply `desk-tweaks`, `pr6-circle` and `pr6-dice` in any order. They touch different code, apart from small overlaps in `gm.py` and `serializers.py`.

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
