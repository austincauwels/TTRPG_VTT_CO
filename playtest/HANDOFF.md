# Running an AI playtest of Candela VTT

This folder holds the setup that ran the first AI playtest of Candela VTT on 8 October 2026 (Pacific), and its results. A Lightkeeper and four players, each an AI agent in its own browser, played a full assignment through the real interface and logged what they found. A second pass then reproduced every bug on a fresh copy of the site.

It lives on its own branch, `playtest-harness`, which shares no history with `main` and is never merged. Nothing here touches the site.

## What is here

| File | What it does |
|---|---|
| `seats_daemon.js` | Holds one browser per seat open for the whole session (`seats.json`: the Lightkeeper on a laptop, players on a desktop, a phone, a laptop and a tablet). Logs each seat's console errors, failed requests, HTTP errors and WebSocket frames to `logs/<seat>.events.jsonl`. |
| `seat.js` | Drives one seat from the command line: `look` (a screenshot plus the accessibility outline), `click`, `fill`, `--tap`, `errors`, `ws`, `offline`, `wait` and more. |
| `table.js` | The table talk: narration and in-character lines, in `table.jsonl` and `table.md`. |
| `finding.js` | Logs one finding: kind (bug, rules, ux, idea, praise), severity, steps, expected, actual, screenshots. |
| `README.md` | The handbook every agent reads first: how to drive its browser, the rules of conduct, the game in brief. |
| `personas.md` | The five personas and the Lightkeeper's assignment (The Drowned Bell of Saint Aldric). |
| `lib.js` | Where Playwright, Chromium and the site are (`PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `SITE_URL`). |
| `workflows/act1-setup.js` | Workflow: sign-up, investigators, joining, approval, circle formation. Args: `{ pt }`. |
| `workflows/act2-session.js` | Workflow: an opening round and five rounds of play, a stress beat across all seats, End Assignment, advancement and exit notes. Args: `{ pt, setup: { for_players } }`, where `for_players` is act 1's last Lightkeeper hand-off. |
| `workflows/act3-triage-verify-report.js` | Workflow: two triagers cluster the findings, a verifier per batch reproduces them on its own fresh copy of the site, an adversarial check on each confirmed high or rules finding, then the report. Args: `{ sp, pt, src }`. |
| `results/2026-10-08/` | The first run: `findings.jsonl` (277), `table.md` (the table talk), `report.json` and `report.md` (the verified report), and a transcript written for NotebookLM. |

## Running it

1. **The site under test.** Check out the commit to test. Build the frontend. Start PostgreSQL. Create a fresh database (`candela_playtest`). Start the backend on port 8300 with `CORS_ORIGINS=http://127.0.0.1:4300`. Serve the build on port 4300 with `vite preview`, using a copy of `frontend/vite.config.js` whose three proxy targets point at 8300 instead of 8000. Never commit that copy.
2. **The harness.** Copy this folder somewhere writable (`$PT`), then run `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` in it (or set `PLAYWRIGHT_MODULE` to an existing playwright package). Start the seats: `nohup node seats_daemon.js > logs/daemon.log 2>&1 &`. Check that `node seat.js dm look` prints a screenshot path.
3. **The acts.** Run the three workflows in order with their args, reading each result before starting the next. Act 1 took about 45 minutes, act 2 about 2 hours 45 minutes and act 3 about 2 hours 40 minutes.

On a 4-CPU container a workflow runs at most 2 agents at once. That is why play is turn-based: the Lightkeeper runs a round, then the players take their turns two at a time. The browsers stay open between turns, so live updates are still tested.

## Known quirks of the setup

Findings that come from these are artifacts of the setup, not of the site:

- Playwright's `setOffline` does not close a WebSocket that is already open in Chromium. Test a real drop by stopping the backend, or through a stalling proxy.
- Headless Chromium hides scrollbars, so a column that scrolls can look cut off.
- Playwright scrolls a target into view before clicking it.
- `seat.js` matches names as case-insensitive substrings, so check which element was hit when names are similar.
- The AI seats act seconds after their screenshot, which widens races and makes short timers hard to catch.
- The AI seats cannot hear the site's sounds.
- The phone seat reports a 705-pixel-high viewport (as with browser bars on a real phone).

## The first run in numbers

- 47 agent turns for the play itself, 103 lines of table talk and 277 findings.
- 122 clusters after merging duplicates. 113 were re-tested: 96 confirmed, 16 partly confirmed, 1 by design.
- 44 bugs and rules problems in the report (4 high), 67 UX items, 10 ideas, 11 things to keep.
- About 100 agent runs and roughly 12 million tokens across the three acts.

## What a second playtest should cover

Repeating the same session would mostly rediscover the same issues. A smaller run (about half the size) aimed at the gaps would be worth more:

- **Regressions:** check that every fix from the first run's report holds.
- **Death:** a death from a fourth scar, the Lightkeeper undoing it with the trauma record's Edit, and a new investigator after a death.
- **A second assignment:** reports, Illumination and refilling resources across assignments; reconnecting mid-campaign.
- **Campaign management:** rejecting a join request, inviting a player back, retiring a campaign, more than one campaign or investigator per player.
- **Accounts:** password reset, Google sign-in, the account page.
- **More of the rules:** the Face role, and the abilities that never came up.
- **The new desk options:** the optional dispatch template and the circle name Edit.

Neither run replaces one real session with the group on their own phones, especially iPhones and Safari, which this setup cannot test.
