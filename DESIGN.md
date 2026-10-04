---
name: Candela Obscura VTT
description: A real-time virtual tabletop for one Candela Obscura group, dressed as the papers, tomes and dice on a Lightkeeper's desk.
colors:
  oxblood: "#721c15"
  oxblood-lit: "#d4705f"
  candle-gold: "#d4af37"
  gold-leaf: "#c49d47"
  register-green: "#0b1f12"
  seal-green: "#065f46"
  seal-green-lit: "#5fae8b"
  gm-night: "#0c1c32"
  gm-slate: "#1e3a5f"
  moonlight-steel: "#93adcf"
  night: "#120b0a"
  ink: "#1a1311"
  mahogany: "#2b170c"
  sepia: "#5a3a28"
  parchment: "#f0e2c0"
  parchment-deep: "#e4cfa0"
  cream: "#fdfaf4"
  role-face: "#9a8235"
  role-muscle: "#7a4822"
  role-scholar: "#1e4f72"
  role-slink: "#2a4d25"
  role-weird: "#4a2870"
  drive-nerve: "#7a4822"
  drive-cunning: "#2a4d25"
  drive-intuition: "#4a2870"
typography:
  display:
    fontFamily: "IM Fell English, Crimson Text, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.1em"
  headline:
    fontFamily: "IM Fell English, Crimson Text, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "0.06em"
  title:
    fontFamily: "Crimson Text, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Crimson Text, Georgia, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "0.1em"
  data:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
  pen:
    fontFamily: "Caveat, cursive"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "2px"
  md: "4px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 28px"
  button-primary-disabled:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.md}"
    padding: "8px 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 20px"
  button-gold:
    backgroundColor: "{colors.candle-gold}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  step-tab-active:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    padding: "16px 24px"
  step-tab:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    padding: "16px 24px"
  parchment-panel:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "32px"
  parchment-well:
    backgroundColor: "{colors.parchment-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "16px"
  input-ledger:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    padding: "0 0 4px 0"
  chip-tag:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.candle-gold}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  action-pip:
    backgroundColor: "{colors.oxblood}"
    rounded: "{rounded.full}"
    size: "13px"
  action-pip-gilded:
    backgroundColor: "{colors.candle-gold}"
    rounded: "{rounded.full}"
    size: "13px"
---

<!-- Colors and Typography updated after the colorize and typeset stage, 2026-10-04 (beta-ui). Scan-mode record of the incumbent system, 2026-10-04. Source of truth: frontend/tailwind.config.js, frontend/src/index.css, inline styles in frontend/src/components, and the before-tour screenshots in /home/gater/projects/candela-ui-review/2026-10-04-before. The Overview language and color character names are a draft pending owner confirmation. -->

# Design System: Candela Obscura VTT

## Overview

**Creative North Star: "The Candlelit Desk"** (chosen by Robert Gater, 2026-10-04)

The app is a desk at night. Every surface is a physical object a Candela Obscura investigator would handle: leather tomes on the chapter hub, a deck of role cards and a tea-stained ledger in the character creator, torn paper tabs and a pinned dispatch on the GM desk, a ruled notebook with handwritten entries, dice that tumble onto a felt tray. Dark lamp-black space surrounds pale parchment, and the only saturated color is oxblood ink with gold for anything gilded or chosen.

Density is moderate to high. Rule text and mechanics sit close together on parchment panels, separated by thin sepia hairlines and inset wells rather than whitespace. The character creator is the internal reference for the whole app (PRODUCT.md): its dark stage, oxblood step tabs, parchment panel with corner brackets, sepia hairlines, role-tinted card deck and oxblood Advance button are the patterns the rest of the app should converge on.

The identity is Dark Academia (parchment, emerald green, gold). The app keeps every piece of art it already has, the official Darrington Press art (the Fairelands map on login, the investigator role portraits on the card deck, the cryptid sketches) and the open-source paper, leather and wood textures, and adds no new art from Candela Obscura source material (PRODUCT.md art rule). New visual elements are drawn in code. The current build carries emerald green much more thinly than parchment and gold (one leather tome and the success color); see Colors.

The GM's side of the desk is cooler on purpose (owner decision, 2026-10-04): the same objects, lit by moonlight instead of the lamp. See "GM night side" under Colors.

**Key Characteristics:**
- Lamp-black stage (night) with parchment objects placed on it.
- Oxblood is the single action and emphasis color; gold marks gilded, selected or brass details.
- Serif for reading and names, small tracked uppercase sans or mono for labels and data.
- Physical-object metaphors with real depth: tomes, cards, paper tabs, pinned notes, a felt dice tray.
- Official art is shown whole and never recolored.
- Tight corners (2px to 4px); round shapes are reserved for pips, seals and dials.

## Colors

A candlelit palette: near-black warm brown for the room, aged paper for the objects, oxblood ink for action, gold for anything gilded, emerald for the seal on what is confirmed. Every value is defined once, in `frontend/tailwind.config.js`, which publishes each color as a Tailwind color (`bg-oxblood`, `text-sepia/70`) and as a CSS variable of RGB channels on `:root` (`rgb(var(--c-oxblood))`, `rgb(var(--c-sepia) / 0.15)`) for CSS rules and inline styles. Stock Tailwind palettes (slate, blue, stone, zinc, amber, red, emerald, green) are no longer used in the bundled app (2026-10-04).

### Primary
- **Sealing-Wax Oxblood** (#721c15): the one action color. Primary buttons, active tabs and slips, filled mark boxes and action pips, section headings on paper, focus borders on ledger inputs, the selection highlight, the scrollbar thumb, error text on paper. On the night stage it never sets small text.
- **Oxblood, lamp-lit** (#d4705f): the same ink lifted so it reads on the dark grounds (5.8:1 on Night, 5.1:1 on GM Night). Only for text and thin rules on dark: header subtitles, the Retire hover, errors and the death notice on dark modals. Never a fill.

### Secondary
- **Candle Gold** (#d4af37): gilded dice and gilded pips, the selected ability, drive or question, brass details (the pocket-watch case and crown, the brass button), milestone rings on the Illumination track. It is not used for headings, labels or borders that are not gilded or selected. Gold text never sits on paper (1.6:1).
- **Gold Leaf** (#c49d47): the chapter hub's tome lettering and frames only (`.embossed-gold`, the padlock).

### Tertiary
- **Register Green** (#0b1f12): the leather of the Active Register tome.
- **Seal Green** (#065f46): confirmed and successful states on paper ("Report filed", "3/3 placed", "Confirmed", active campaigns in the roster book, roll entries in the log). Tuned from Tailwind emerald-700 so small text passes on parchment (6.0:1).
- **Seal Green, lamp-lit** (#5fae8b): the same seal on dark grounds (status dots on the tomes, dice that count on the felt, confirmed relationships, sent invites).

### Neutral
- **Night** (#120b0a): the stage behind every screen and the headers.
- **Ink** (#1a1311): text on paper, dark wells, inactive step tabs, hard rules.
- **Mahogany** (#2b170c): the desk wood's own color under its texture, the notebook binder and the login card.
- **Sepia** (#5a3a28): hairlines, underlines, pip rings and secondary text on paper (7.9:1 on parchment). Secondary text on paper is full sepia, not faded ink.
- **Parchment** (#f0e2c0): the base of every paper object (creator sheet, book pages, slips, pamphlets, dispatch letter, memo pad).
- **Deep Parchment** (#e4cfa0): inset wells, older paper (the Herald, the cryptid mounts), inactive tabs, and text on dark grounds (12.7:1 on Night).
- **Cream** (#fdfaf4): the brightest paper (dossier, notebook pages, cards) and text and labels on dark grounds.

### Game colors
- **Role colors** (Face #9a8235, Muscle #7a4822, Scholar #1e4f72, Slink #2a4d25, Weird #4a2870): the creator's card deck, its frames and the ability selection state. On the dark stage, role-colored text and icons are mixed 60/40 with Cream (`roleInk` in CharacterCreator.jsx) so they keep their hue and pass 4.5:1. The creator's darker `secondary` and `cardBg` shades stay as role data next to them.
- **Drive tints** (Nerve #7a4822, Cunning #2a4d25, Intuition #4a2870): the three drive columns in the creator and in the dossier (a 7% wash, a 30% rule, the drive name and its filled drive squares).
- **Player ink colors**: each player's `ink_color` from the server (business-card stripes, roster names, log entries, notebook). Data, never replaced by a token.

### Material literals (kept on purpose)
Physical objects keep their own local shading, drawn in CSS or SVG: the candles' wax and flames (ivory wax, an orange-to-yellow mantle, a white core, a faint blue base) and their warm light, the Last Session tome's plum leather, strap and brass padlock, the book spine and page edges, the dice tray's green felt (#12241b) and wood rim (#2e1d15). They are renderings of materials, not interface colors, and are not to be reused as chrome.

### Named Rules
**The One Ink Rule.** Oxblood is the only color that means "act" or "this matters". Primary buttons (Advance, Select this Path, Cast, Dispatch, Join, Commission Investigator), active tabs and filled marks are oxblood; nothing else competes for that role.

**The Gilded Means Gilded Rule.** Gold signals the game's gilded state, a deliberate selection or brass. It is not a general decoration color for text or borders.

**The Art Stays Whole Rule.** Official Darrington Press art (Fairelands map, role portraits) is shown as published: no tinting, no hue shifts, credit kept visible.

**The Lamp-Lit Ink Rule.** A color that is too dark to read on the night stage gets a lifted twin (oxblood-lit, seal-green-lit, role ink); the dark original is never used for small text on dark.

### GM night side
The GM's screens keep a cool, deliberate night look (owner decision, 2026-10-04) built from exactly three tokens:
- **GM Night** (#0c1c32): the GM desk's ground and header, the sticky tab strip and the map frame.
- **GM Slate** (#1e3a5f): the Lightkeeper's Desk bar, raised panels and wells (Active Circle Members, the dice controls, Invite Player to Rejoin, Circle Formation Status).
- **Moonlight Steel** (#93adcf, tuned from #8aa4c8 to 7.4:1 on GM Night and 5.0:1 on GM Slate): GM section labels, icons, rules, pagers, empty states and ghost buttons. It replaced every stock Tailwind blue.
The paper objects on the GM desk (dispatch letter, nav slips, join-request cards, business cards, Finalize slip, pocket watch, circle ledger, memo pad, activity log) keep parchment, oxblood and gold; only the ground and the chrome around them are cool. The GM's dice are shown in their real colors: the grayscale and hue-rotate filter on the GM dice tray is gone. The chapter hub is shared by players and the GM and follows the warm palette.

### Effects removed in this stage
Glow box-shadows (gilded die, pips, rejoin banner, death modal, creator path button), the candles' blurred radial glow (replaced by the candle cluster and its lit pool, see Elevation & Depth), `animate-pulse` on static text, accidental backdrop blur on the scar, circle and relationship modals, the GM dice filter, the pocket watch's metal gradient and glass glare (now a flat brass case) and the gilded die's metal gradient. The login slip has no blur. Every CSS animation and transition stops under `prefers-reduced-motion` (index.css).

Round 1 of this stage also straightened the hand-placed objects (sidebar cards, circle forms, history and report cards, the dispatch note). That was a mistake: the crooked, hand-placed look is part of the owner's design (Robert Gater, 2026-10-04), and it is back. See "Hand-placed objects" under Shapes.

## Typography

**Display Font:** IM Fell English (regular and italic), loaded from Google Fonts in `index.html`, Tailwind `font-display`. It sets the CANDELA OBSCURA wordmark on every header, step and page titles, tome and pamphlet titles, the dispatch letterhead, the Lightkeeper's Desk bar and the Halcyon Herald. It has one weight, so display text is never bold (`font-synthesis: style` stops a faked bold).
**Body Font:** Crimson Text (400, 600, 700 and italics), loaded in `index.html`, Tailwind `font-serif` and the body default. Prose, names, rule text, ability text, form values, empty states and in-world copy.
**Label Font:** system sans (`font-sans`), bold or black, uppercase, tracked 0.1em (`tracking-widest`; up to 0.18em on the creator's few short heads). Buttons, tabs, field labels and status chips.
**Data Font:** system monospace (`font-mono`, usually `tabular-nums`), only for numbers and identifiers: counts, dice totals, timers, scar counts, campaign codes, usernames, dates, page numbers.
**Pen fonts:** the 20 handwriting families in `index.html` (Caveat by default). A player picks one when joining a campaign; their notebook entries, signature and business-card name render in it.

The chapter hub no longer loads its own faces: Cinzel, Cormorant Garamond, Playfair Display and IBM Plex Mono (the runtime `@import` in DeskStyles.jsx) and the duplicate pen `@import`s in DeskStyles.jsx and CharacterCreator.jsx are gone, and the unused Playwrite NO load was dropped.

**Character:** a bookish Crimson for anything read or named, Fell capitals for titles stamped on paper and leather, and small heavy tracked sans labels that read like stamped form fields.

### Hierarchy and scale
The scale is Tailwind's: 12, 14, 16, 18, 20, 24, 30, 36, 48px (`text-xs` to `text-5xl`). Arbitrary pixel sizes remain only for pen-font text (handwriting needs its own sizes), the Herald's newspaper print and a few large serif notebook lines tied to the ruled paper.
- **Display** (Fell, 400, 28px phone / 36px desktop, uppercase, 0.1em): the wordmark on the hub, creator, player and GM headers.
- **Headline** (Fell, 30 to 36px, uppercase, 0.06em): step titles in the creator ("Action Ratings & Drive"), the death notice, Join a Circle, Field Notes; oxblood on paper, cream on night.
- **Title** (Crimson 700, 18 to 24px): ability and character names, sub-section heads in the creator ("A — Raise One Starting-Zero Action to 1"), field questions (Catalyst, Curiosity).
- **Body** (Crimson 400, 16px, line-height 1.5): rule text, descriptions, the dispatch letter, roster names; italic for instructions, flavor lines and empty states.
- **Label** (sans 700 to 900, 12 to 14px, uppercase, 0.1em): buttons, tabs, field labels, status chips.
- **Data** (mono 400, 12 to 16px, tabular): numbers and identifiers.

### Named Rules
**The Read in Serif Rule.** Anything a player reads as prose or as a name is serif. Sans is for labels, mono for numbers and identifiers only (never for sentences, rule text or the dispatch letter).

**The Twelve Pixel Floor.** No visible label or text under 12px. Decorative newspaper print (the Herald) and watermarks at a few percent opacity are the only exceptions.

**The Short Caps Rule.** Uppercase with wide tracking is for short labels only. Sentences, instructions and letterhead lines are set in sentence case, usually Crimson italic.

**The Pen Belongs to the Player Rule.** Handwriting fonts appear only for text a person wrote (notebook entries, signatures, pen previews, business-card names). Interface copy never uses them.

## Layout

The creator is a centered column up to 1500px wide with 40px side margins on desktop: wordmark, a four-step tab bar spanning the width, then one parchment panel. Inside panels, content splits into two or three equal columns (abilities, drive columns) with 16px to 24px gaps, and collapses to one column on phones.

The GM desk is a three-column workspace: a left rail of paper-tab navigation and the pinned dispatch, a center work surface, and a right rail with the dice tray, activity log and pass-notes. The chapter hub is a free composition of overlapping objects (tomes, newspaper, pamphlets) on a dark desk.

Spacing follows Tailwind's 4px grid. The working steps are 4, 8, 12, 16 and 24px (gap-2, gap-3, p-3, p-4, px-6 are the most used). Vertical rhythm inside parchment panels is set by sepia hairlines and 28px ruled lines (`paper-ruled`), not by large gaps.

Breakpoints are Tailwind defaults (sm 640, md 768, lg 1024). `lg:` carries most of the responsive switching. On a 390px phone the creator stacks cleanly; the hub objects and the GM header overflow and overlap (see drift notes).

## Elevation & Depth

Depth is literal and physical. Objects cast heavy, dark, offset shadows onto the night desk, and paper surfaces carry inset shading to feel worn. Shadows are almost always pure black at high opacity (0.5 to 0.98), offset down and to the right as if lit from a lamp above left. Wells on parchment use `shadow-inner`.

### Shadow Vocabulary
- **Paper on desk** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3)`): parchment panels resting on the night stage.
- **Object lift** (`box-shadow: 4px 6px 15px rgba(0,0,0,0.7)`): cards, pamphlets and tabs resting on the desk; the deepest objects (tomes) go to `15px 25px 40px rgba(0,0,0,0.95)` with inner leather shading.
- **Inset well** (`box-shadow: inset 0 2px 4px rgba(0,0,0,0.15)`): mark boxes and recessed areas on parchment.
- **No glows.** Filled and gilded pips, gilded dice and banners are flat fills with a cast shadow at most (removed 2026-10-04).
- **Modal** (`box-shadow: 0 20px 60px rgba(0,0,0,0.9)`): dialogs over the desk.

### Named Rules
**The One Lamp Rule.** All cast shadows fall the same way (down and right) because the desk has one light. Nothing glows; the candle flames keep only a small halo.

**The Lit Pool Rule.** Candlelight is light falling on things, not a haze in the air. The chapter hub's candles light the desk around them with one wide, soft radial gradient in `soft-light` blending above the objects (`.candle-light` in DeskStyles.jsx), so the wood, the tomes and the papers near them warm in their own colors. No blur filter, no glow blob. It sits in the hub's own stacking context (no z-index, opacity or transform on its box), or the blend has nothing to light.

**Torn paper keeps its shadow.** A clip-path or mask cuts away a box-shadow, so torn or deckled paper (nav slips, the Finalize slip, pinned notes, the From the GM note) casts its shadow with `filter: drop-shadow()` on a wrapper, which follows the torn edge. These are small objects; never put a filter on a large area.

## Shapes

Corners are tight. Small radius (2px) is the default for panels, wells, chips and tags; medium (4px) for buttons and the step bar. Full rounding is reserved for things that are round in the physical world: action pips, illumination dots, wax seals, dials and the pocket-watch tension clock. Paper objects add their own silhouettes: torn and slightly rotated tabs, corner brackets on the creator panel, double rules (`border-style: double`) on formal frames, dashed borders for empty slots and upload targets. Borders are 1px hairlines in sepia or ink at low alpha; 2px is used for frames and selected cards.

### Hand-placed objects
**Hand-placed objects sit slightly crooked; tilts of about 0.5 to 2 degrees, fixed per object.** Cards, notes, slips and forms lie as if someone put them down: the player's circle cards and the From the GM note on the player desk, the GM's investigator business cards, nav slips, Finalize and finalized slips, report and history cards on the circle pages, the chapter-house examples and tape in the formation papers, pinned private notes, and filled mark boxes (inked by hand). The angle comes from `tiltFor(key)` in `components/shared/handPlaced.js`, a hash of the object's id, so an object keeps its angle across renders, reloads and list changes; lists alternate the lean so neighbours never match. The `.hand-placed` class (index.css) applies `--tilt` and eases it to 70% on phones. Text inside stays level enough to read, a tilt never moves an object over a control, and an object a person picks up (hover) may straighten. Tomes and pamphlets on the hub keep their larger, older angles; the creator's card deck keeps its own.

## Components

### Buttons
Tactile and stamped: small, heavy, uppercase, tracked.
- **Shape:** gently squared (4px).
- **Primary:** oxblood fill, cream label, label type at 16px with widest tracking, 8px by 28px padding, standard shadow. Disabled drops to ink at 60% with cream at 20%.
- **Ghost / Back:** transparent with a cream hairline at 18% alpha and cream text at 50%; hover adds a 5% white wash and raises text to 75%.
- **Brass (btn-gold):** candle gold fill, ink label at 12px, 1px ink border, a soft cast shadow. Used for accept and counter actions in circle creation. Its `:active` state presses in by 1px.
- **Stamp buttons (GM dispatch):** outlined, slightly rotated, oxblood or sepia ink, as if rubber-stamped onto the dispatch.

### Chips
- **Style:** ink fill, candle gold or role-colored text at label size, 2px corners. Used for ability keywords under a role ("Gather Statements") and for gear tags (italic serif on outlined chips).
- **State:** the action-raise row uses parchment chips with sepia borders; the selected one fills with oxblood and cream text.

### Cards / Containers
- **Parchment panel:** parchment background with a faint dot-grid and ruled texture, tea-stain blobs, a faint diagonal CANDELA OBSCURA watermark, corner brackets, ink text. Corner style 2px. Shadow: paper on desk.
- **Parchment well:** deep parchment at 30% alpha with a sepia hairline and inner shadow; groups fields inside a panel.
- **Dark ability card (creator step 1):** near-black fill with a 1px role-color border at 20% alpha; selected cards fill with the role color at 22% alpha, gain a role-color border and a check in the corner.
- **Internal padding:** 12px to 16px for wells and cards, 32px for full panels.

### Inputs / Fields
- **Style:** ledger lines, not boxes. Transparent background, a single sepia underline at 38% alpha, serif bold 18px text, placeholder in ink at 20%.
- **Focus:** the default outline is removed (`focus:outline-none`); some fields shift the underline to oxblood. Many have no visible focus state at all (see drift).
- **Notebook fields:** handwriting pen font over ruled lines.

### Navigation
- **Creator step bar:** four equal tabs in an ink bar with a 1px dark border and 4px corners. Active tab is oxblood with cream text; inactive tabs are ink with dimmed cream text. Labels are numbered ("1. Choose Path").
- **GM desk tabs:** torn paper strips in cream, each at its own fixed angle (about 1 degree), with a small icon and tracked serif uppercase label, stacked in the left rail. The active slip's label is underlined in pen.
- **Fountain-pen underline** (`.pen-underline` on the label, `.pen-host` on the control): an uneven oxblood stroke that draws itself left to right under a tab on hover or keyboard focus (with the gold focus ring) and stays inked on the active GM slip. Used on the GM slips and the player desk tabs.
- **Notebook tabs:** folder tabs on the book's top edge; active tab is cream paper, inactive tabs are dark brown with gold text.

### Action Pips and Mark Boxes (signature)
The game's numbers are drawn as physical marks. Action pips are 13px circles with a 1.5px sepia ring; filled pips are solid oxblood; gilded pips are candle gold with a sepia ring. Drive points are small squares filled with their drive's tint. Mark boxes are 20px squares with a 2px ink border and an inset shadow, filling with oxblood. The illumination track is a row of ink dots with gold-ringed milestones every third pip.

### Role Card Deck (signature)
The creator's left column: an official role portrait in a gold-lined card frame with corner ornaments, the role name in serif at top and the role label in gold at the bottom, stacked over two offset card backs, with prev/next controls and a "1 / 10" counter.

### Chapter Hub Tomes (signature, kept by owner)
Leather-bound books (register green, deep purple) with embossed double frames, gold-leaf Cinzel and Playfair lettering, page-block edges and an open/close animation into a two-page ruled spread. PRODUCT.md marks this as the model for the app's physical-object feel.

### Chapter Hub Candles (signature)
Three pillar candles drawn in SVG (`CandleCluster.jsx`, `candlePaths.js`), standing behind the tomes in the top left of the hub, seen from slightly above: ivory wax with swollen sides, a melted rim and a hollow with a pool of liquid wax, drips over the lip ending in beads, a dark wick with an ember, and a layered flame (orange tip, yellow mantle, white core, faint blue base) with a small halo. Each flame sways from its base on its own uneven rhythm (about 2.6 to 3.7 seconds) while its core brightens and dims on a shorter one, and the wicks catch one after another when the hub opens. The light falls on the desk as a lit pool (The Lit Pool Rule). One candle burns for the chapter and one more for each investigator in play or campaign the person runs, up to three; an unlit candle shows its wick and a thread of smoke, and the pool dims with fewer flames. Everything holds still under `prefers-reduced-motion`. Phones and tablets give the candles a strip of desk above the tomes.

### Physical touches
Small, meaningful responses drawn in CSS or SVG; each one stops or shows at once under `prefers-reduced-motion`.
- **Wax seal** (`WaxSeal.jsx`): an oxblood seal with a candlestick struck into it. It sits on the Finalize slip. Pressing Approve on a join request, or confirming Finalize, presses a large seal onto the request or slip while it goes to the server (an approved request then fades off the desk), and a finalized circle shows a sealed slip ("The circle is finalized") below the investigators.
- **Ink stamp on roll outcomes**: the outcome word on the result slip is a rubber stamp, a little crooked (fixed per roll), its ink worn by pinholes (a mask), pressed down once when the result lands.
- **Pinned notes**: private notes carry an oxblood push pin and a drop-shadow that follows their torn top edge.
- **Page turn**: changing spreads in the notebook turns a blank leaf over from the spine (forward or back), over pages that are already there.
- **Dispatch typing in**: when the GM sends a new dispatch while a player's desk is open, the From the GM note types it in with a carriage mark at the end of the line. What is there when the desk opens shows whole; screen readers get the whole text at once.
- **Deckled edge** (`.deckle-bottom`): the From the GM note's bottom edge is torn by hand.

## Do's and Don'ts

### Do:
- **Do** use oxblood (#721c15) for the single primary action on a screen and for active tabs, filled marks and pips.
- **Do** place parchment objects on the night stage, with the shadow falling down and right.
- **Do** set prose, names and rule text in the serif, and labels in small heavy uppercase with at least 0.1em tracking.
- **Do** reserve candle gold for gilded dice, gilded actions and deliberate selection.
- **Do** show official art whole, with its credit, and use the role portraits on role surfaces.
- **Do** use the character creator's panel, tab bar and button patterns as the reference when restyling other screens.
- **Do** keep handwriting fonts for player-written text in the player's chosen pen.
- **Do** lay hand-placed objects (cards, notes, slips) slightly crooked: 0.5 to 2 degrees, fixed per object with `tiltFor()`.

### Don't:
- **Don't** introduce colors outside the Dark Academia palette and the three GM night tokens; stock Tailwind blues, slates and stones are drift, not precedent.
- **Don't** add art taken from Candela Obscura source material, and never remove art the app already has (official or open-source).
- **Don't** use rounding above 4px on rectangles; round shapes are for pips, seals and dials.
- **Don't** recolor, crop away the credit of, or replace the official art.
- **Don't** use handwriting fonts for interface labels or buttons.
- **Don't** use gold as general text or border decoration where nothing is gilded or selected.
- **Don't** straighten the hand-placed objects as "noise", and don't tilt anything by a new random angle on each render.
