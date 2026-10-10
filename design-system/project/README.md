**The Candlelit Desk.** The app is a desk at night. Every surface is a physical object a Candela Obscura investigator would handle: leather tomes, a deck of role cards, a tea-stained ledger, torn paper tabs, a pinned dispatch, a ruled notebook, dice on a felt tray. Lamp-black space surrounds pale parchment; the only saturated color is `oxblood` ink, with `candle-gold` for anything gilded or chosen. The identity is Dark Academia: parchment, emerald and gold.

The character creator is the reference for the whole app. Its dark stage, `oxblood` step tabs, parchment sheet with corner brackets, `sepia` hairlines, role-tinted card deck and `oxblood` Advance button are the patterns every other screen converges on.

## Principles

1. **The rules are the product.** Anything that shows a mechanic matches the rulebook and the server's result.
2. **The table comes first.** In a session, the roll outcome, marks, drives and whose turn it is read at a glance.
3. **Her game, her look.** Refinement removes generic noise and keeps every piece of art already in the app. No new art from Candela Obscura source material; new visuals are drawn in CSS or SVG or come from properly licensed sources.
4. **Beta before the table.** Every visual change is tried on candela-beta with real data first.

## Content fundamentals

- **Rulebook terms exactly as the game names them:** Investigator, Circle, Illumination, Marks (Body, Brain, Bleed), Scars, Drives, Resistances, Gilded dice, Actions, Assignments.
- **"Lightkeeper", never "GM",** anywhere a person can see or hear it: labels, buttons, aria-labels, errors ("ask the Lightkeeper", "Waiting for the Lightkeeper", "Back to the Lightkeeper's Desk"). "GM" stays only in code.
- **No sentence explains a control.** Not "Tap an action to roll it", not "No rolls yet". The layout carries the action: a raised chit is a roll, a counter is a limit ("0 / 3 selected"), filled or open marks are a choice. An empty area stays quietly empty or shows an object: a dotted blank, the dashed outline of a stamp, blank ruled rows.
- **What stays in words:** rulebook ability text, game state ("Spending locked", "Reports open", "Waiting for Iris"), the outcome of a roll ("Sway: 3 dice, highest counts", "Survey: 2 dice, 1 gilded"), errors that say what to do next, and the second-press warning on anything that cannot be undone ("Discard").
- **Sentence case for sentences, capitals for short labels.** Uppercase with wide tracking is for one to three words only.
- **Plain labels.** A select starts on a blank under its plain label, never on "Choose ...".
- **No emoji, and no glyph a phone turns into one** (▶ ✓ ✔ ✝ ⚠ ★ ♥). Draw the mark in ink (see Iconography).

## Color

Set the room in `stage` and the objects on it in paper. Read the token's usage note before using it on a new ground.

- **The room.** `stage` behind every screen (`night` for players and the hub, `gm-night` on the Lightkeeper's screens). Bars and wood in `stage-raised`. Labels, icons and ghost buttons drawn on the room in `stage-chrome` or `cream`.
- **The paper.** `parchment` is the base of every paper object; `parchment-deep` for wells and older paper; `cream` for the brightest paper (dossier, notebook pages, cards). Text on paper is `ink`; secondary text on paper is full `sepia`, never faded ink. Hairlines and pip rings are `sepia`.
- **The One Ink Rule.** `oxblood` is the only color that means "act" or "this matters": the primary button, active tabs and slips, filled marks and pips, section headings on paper, errors on paper. Nothing else competes for that role.
- **The Lamp-Lit Ink Rule.** A color too dark to read on the room gets a lifted twin: `oxblood-lit` (5.8:1 on `night`, 5.1:1 on `gm-night`), `seal-green-lit`, and role colors mixed 60/40 with `cream`. Never set small `oxblood` or `seal-green` text on `stage`.
- **Gilded means gilded.** `candle-gold` marks gilded dice and pips, a deliberate selection, brass, the Illumination milestones and the focus ring. It never decorates text or borders, and never sits as text on paper (1.6:1). `gold-leaf` is for the hub tomes' lettering only.
- **The seal.** `seal-green` for confirmed and successful states on paper (6.0:1 on `parchment`): "Report filed", "Confirmed", "3/3 placed". `register-green` is the Case Ledger's leather.
- **Moonlight.** The Lightkeeper's side is the same desk lit by the moon: `gm-night` ground, `gm-slate` bar, `moonlight-steel` labels and rules (7.4:1 on `gm-night`). Paper objects on that desk keep parchment, oxblood and gold. Switch the `moonlight` theme to see it.
- **Game colors are data.** `role-*` frame the creator's card deck and selection state; `drive-*` wash and rule the three drive columns. Each player's ink color comes from the server and is never replaced by a token.
- **Materials are not chrome.** `material-*` tokens render things (felt, wood, leather, wax, gold leaf, ticket bands). Never reuse them for interface.
- No stock palette (Tailwind slate, blue, stone, zinc) appears anywhere.

## Typography

- **`display`** (Cinzel): the wordmark and everything on leather, wood or night, plus every printed heading on paper (step titles, letterheads, tickets, the outcome stamp). Uppercase, 0.04 to 0.1em. Cinzel has no italic: never slant it (`font-synthesis: none`).
- **`title`, `body`, `body-italic`, `ledger-value`** (Crimson Text): anything read as prose or as a name. The Read in Serif Rule: rule text, names, the dispatch letter and empty states are always serif.
- **`label`, `label-lg`** (system sans, 900, 0.1em, uppercase): buttons, tabs, field labels, status chips.
- **`data`** (system mono, tabular): numbers and identifiers only. Never sentences.
- **`hand`** (Charm 700): the notebook's own headings only, mixed case.
- **`pen`** (Caveat and 19 other handwriting faces): only text a person wrote, in their chosen pen and ink. Interface copy never uses a pen.
- **The Twelve Pixel Floor.** Nothing a player must read is under 12px. Print furniture (`print-*`) is the only exception, and it is decoration.
- Scale: 12, 14, 16, 18, 20, 24, 30, 36, 48px.
- Fonts are hosted on Google Fonts (`frontend/index.html`): Cinzel 400 to 900; Crimson Text 400, 600, 700 and italics; Charm 400 and 700; the pens.

## Space and layout

- A 4px grid: `space-xs` 4, `space-sm` 8, `space-md` 12, `space-lg` 16, `space-xl` 24; full panels pad `space-panel`.
- Vertical rhythm on paper comes from `sepia` hairlines and ruled lines every `space-rule`, not from large gaps. Density is moderate to high.
- From `bp-xl` the desks fit one window: a slim band, then three columns that fill the width with `space-lg` gutters; a long column scrolls inside itself, never the page.
- Phones show one part of the desk at a time under a slim band with a drawer. Every surface works on phones and computers.
- Touch targets are `space-touch` on coarse pointers; fields are at least 16px so iOS Safari never zooms.
- Nothing makes a desk wider than the screen.

## Shape and depth

- Corners are tight: `radius-sm` for panels, wells, chips and stamps; `radius-md` for buttons and the step bar, and never more on a rectangle. `radius-full` only for things round in the world: pips, Illumination dots, seals, dials.
- Paper objects add their own silhouettes: torn tabs, corner brackets, double rules on formal frames, dashed borders for empty slots.
- **The One Lamp Rule.** Shadows are black at high opacity and fall down and right: `shadow-paper` for panels, `shadow-object` for cards and slips, `shadow-tome` for the deepest objects, `shadow-well` inside paper, `shadow-modal` for dialogs. On the hub the candles are the light and each object's shadow falls away from them.
- **No glows,** except `shadow-gilded-halo` on the gilded die and the candlelight that warms hub titles on hover.
- **Hand-placed objects sit crooked.** Cards, notes, slips and filled mark boxes lean between `tilt-min` and `tilt-max`, fixed per object by a hash of its id (`tiltFor(key)`), alternating in lists, scaled by `tilt-phone-scale` on phones. Never re-randomize on render, and never straighten them as noise.
- Torn paper casts its shadow with `drop-shadow()` on a wrapper so it follows the tear.

## Forms

Each kind of paper carries one printed form number everywhere it appears, set in `print-form-line`:

| Form | Paper |
|---|---|
| C.O. 0 | Admission (login slip) |
| C.O. 1 | Lightkeeper's commission (Lightkeeper's Pass ticket) |
| C.O. 2 | Dispatch |
| C.O. 3 | Circle charter (Circle tab, Finalize and sealed slips) |
| C.O. 4 | Circle formation papers |
| C.O. 5 | Field register (the notebook) |
| C.O. 7 | Investigator record (creator sheets, dossier, third-class ticket) |
| C.O. 8 | Chapter member (account page) |
| C.O. 9 | Table log |
| C.O. 11 | Assignment report |
| C.O. 14 | Trauma record (marks and scars) |
| C.O. 22 | Memo (pass notes) |

## Motion

- Physical and brief: a stamp presses down (0.3s), a seal presses and settles (0.45s), dice tumble in (0.5s), the pen underline draws (0.38s), cards turn flat by narrowing to their edge (0.4 to 0.65s). No 3D turns.
- Ease out with `cubic-bezier(.22,1,.36,1)` or `(.16,1,.3,1)`.
- On the hub, motion runs on the compositor: transform and opacity on a layer of its own; never animate a custom property, filter, shadow, size or position.
- Every animation stops or shows its end state at once under `prefers-reduced-motion`.

## Focus and states

- Keyboard focus is a 2px `candle-gold` outline with a 2px `ink` band inside it: the gold carries it on the room, the ink on paper.
- Hover lifts a roll chit and draws the pen underline; pressed sinks it 1px.
- Disabled: `ink` at 60% with `cream` at 45%. A control that cannot be pressed says why in a tooltip and, pressed, in a line under it for 5 seconds.
- Selected: `oxblood` fill (tabs, raise chips) or a `candle-gold` wash with an ink tick (abilities).

## Iconography

- Marks are drawn in ink (Icons asset group): tick, cross, play, mourning cross, pause, turn back. They take the text's color and sit on its baseline.
- Other icons are Game Icons (`react-icons/gi`, CC BY 3.0) at text size in the text's color.
- The app's mark is the candle (Logos asset group). The wordmark is CANDELA OBSCURA in `display`.

## Art

- Official Darrington Press art (the Fairelands map on login, the investigator role portraits, the field sketches) is shown whole, never tinted or cropped, with its credit kept. It is not copied into this system.
- The owner's cryptid prints (Desk papers asset group) lie on the hub as aged paper, dropped at angles, never in tidy rows, never smaller than a railway ticket.
- The paper, leather and wood textures already in the app stay.

## Components

The cards below are static renditions of the app's real patterns, styled by `components/bundle.css` with this system's tokens (class prefix `co-`). The app itself builds them with Tailwind utilities over the same palette (`frontend/tailwind.config.js`), so `bg-oxblood` there is `var(--oxblood)` here.

- Actions: Button.
- Navigation: StepTabs, PenUnderline.
- Surfaces: PaperSheet.
- Inputs: LedgerField.
- Marks: Chip, ActionPips, MarkBoxes, InkMarks.
- Print furniture: PrintMarks, InkStamp.
- Physical touches: WaxSeal. Dice: Die.
