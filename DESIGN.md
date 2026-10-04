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
    fontFamily: "Cinzel, Crimson Text, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.1em"
  headline:
    fontFamily: "Cinzel, Crimson Text, Georgia, serif"
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
  hand:
    fontFamily: "Charm, Crimson Text, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
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

<!-- Colors and Typography updated after the colorize and typeset stage, 2026-10-04 (beta-ui). Scan-mode record of the incumbent system, 2026-10-04. Source of truth: frontend/tailwind.config.js, frontend/src/index.css, inline styles in frontend/src/components, and the before-tour screenshots in /home/gater/projects/candela-ui-review/2026-10-04-before. The Overview language and color character names are a draft pending owner confirmation. Round 3 (2026-10-04) updated Typography, the seal, the watermark, the sounds, the desk layout, the hub and the dice; its finish fixes added the marks tag, the ability chips, the Circle tab's papers, the GM desk without panels, the phone hub, the account card, the photo mount and the password slips. After round 3 the owner moved the luggage tag to the gear and the marks onto the trauma record with the scars. Round 4 item 3 moved the hub's motion onto the compositor (The Smooth Hub Rule); items 2, 4 and 5 aged the desk papers, added the owner's cryptids and took the lit rim off the Herald (Desk papers); item 1 gave the pocket watch its glass and joined its stem to the case (Pocket watch). The round 4 finish fixes darkened the desk wood (item 8), made the cup ring a cup's size (item 6), joined the tomes' spines round their tails (item 7), turned the phone hub into the left end of a wide desk (item 11), spread the papers (item 16) and aged the postcard, gave the roster book index tabs and ink marks in place of emoji-prone glyphs (item 10), added the "i" on action rows for touch screens (item 9), gave the ability card one type treatment (item 13) and put "Lightkeeper" in every visible place that said "GM" (item 12). Items 14 and 15 gave the player desk on phones its slim band and drawer and made the phone roll bar a pop-up that goes by itself (Layout, Navigation, Dice tray and roll line); their finish fixes cut the drawer's slips from the hub's aged paper, hung the connection message under the phone band and let the roll bar's action line run on to a second line. -->

# Design System: Candela Obscura VTT

## Overview

**Creative North Star: "The Candlelit Desk"** (chosen by Robert Gater, 2026-10-04)

The app is a desk at night. Every surface is a physical object a Candela Obscura investigator would handle: leather tomes on the chapter hub, a deck of role cards and a tea-stained ledger in the character creator, torn paper tabs and a pinned dispatch on the GM desk, a ruled notebook with handwritten entries, dice that tumble onto a felt tray. Dark lamp-black space surrounds pale parchment, and the only saturated color is oxblood ink with gold for anything gilded or chosen.

Density is moderate to high. Rule text and mechanics sit close together on parchment panels, separated by thin sepia hairlines and inset wells rather than whitespace. The character creator is the internal reference for the whole app (PRODUCT.md): its dark stage, oxblood step tabs, parchment panel with corner brackets, sepia hairlines, role-tinted card deck and oxblood Advance button are the patterns the rest of the app should converge on.

The identity is Dark Academia (parchment, emerald green, gold). The app keeps every piece of art it already has, the official Darrington Press art (the Fairelands map on login, the investigator role portraits on the card deck, the cryptid sketches) and the open-source paper, leather and wood textures, and adds no new art from Candela Obscura source material (PRODUCT.md art rule). New visual elements are drawn in code. The one addition is the owner's own choice of old cryptid prints for the hub desk (round 4 item 4: a blemmye woodcut, a sea monster woodcut, a bestiary page of lions and panthers, a hand-coloured sea monk and a sea swine woodcut, in `public/images/cryptids/` as small WebP files); a sixth, a red-ink creature drawing, waits for his confirmation and is not used. The current build carries emerald green much more thinly than parchment and gold (one leather tome and the success color); see Colors.

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
- **Register Green** (#0b1f12): the leather of the Case Ledger tome on the chapter hub.
- **Seal Green** (#065f46): confirmed and successful states on paper ("Report filed", "3/3 placed", "Confirmed", active campaigns in the roster book, roll entries in the log). Tuned from Tailwind emerald-700 so small text passes on parchment (6.0:1).
- **Seal Green, lamp-lit** (#5fae8b): the same seal on dark grounds (status dots on the tomes, dice that count on the felt, confirmed relationships, sent invites).

### Neutral
- **Night** (#120b0a): the stage behind every screen and the headers.
- **Ink** (#1a1311): text on paper, dark wells, inactive step tabs, hard rules.
- **Mahogany** (#2b170c): the desk wood's own color under its texture, the notebook binder and the login card.
- **Sepia** (#5a3a28): hairlines, underlines, pip rings and secondary text on paper (7.9:1 on parchment). Secondary text on paper is full sepia, not faded ink.
- **Parchment** (#f0e2c0): the base of every paper object (creator sheet, book pages, slips, pamphlets, dispatch letter, memo pad).
- **Deep Parchment** (#e4cfa0): inset wells, older paper (the Herald, the field sketches), inactive tabs, and text on dark grounds (12.7:1 on Night).
- **Cream** (#fdfaf4): the brightest paper (dossier, notebook pages, cards) and text and labels on dark grounds.

### Game colors
- **Role colors** (Face #9a8235, Muscle #7a4822, Scholar #1e4f72, Slink #2a4d25, Weird #4a2870): the creator's card deck, its frames and the ability selection state. On the dark stage, role-colored text and icons are mixed 60/40 with Cream (`roleInk` in CharacterCreator.jsx) so they keep their hue and pass 4.5:1. The creator's darker `secondary` and `cardBg` shades stay as role data next to them.
- **Drive tints** (Nerve #7a4822, Cunning #2a4d25, Intuition #4a2870): the three drive columns in the creator and in the dossier (a 7% wash, a 30% rule, the drive name and its filled drive squares).
- **Player ink colors**: each player's `ink_color` from the server (business-card stripes, roster names, log entries, notebook). Data, never replaced by a token.

### Material literals (kept on purpose)
Physical objects keep their own local shading, drawn in CSS or SVG: the candles' wax tops, pools and flames and their warm light; the hub's drawn desk wood (dark and low in contrast, #170b05 under its grain, mostly in shadow: it warms and takes a soft varnish sheen only where the candles reach it, owner's round 4 item 8) and its dark oxblood leather writing inset (#210a09) with a tooled gilt border; a cup ring on the leather about a third of a tome across, a slightly uneven ring with a darker dried rim, a pale bloom inside it, a faint inner tide line and a second broken ring where the cup was set down again (item 6); the Last Played tome's plum leather (#1e0624), strap and brass padlock; the book spines and page edges (the Case Ledger's edges sprinkled red); the railway tickets' company bands in her original pamphlet colors (sage #5f7267 on the player's ticket, ink on the Lightkeeper's); her wax seal's reds (#9c1c1c, #7d1414 and #4a0808, a #5c0f0f rim, the mark in #641010); the dice tray's green felt (#12241b) and wood rim (#2e1d15), which also makes the GM's control rail along its top; and the gilded die's gold leaf (#e5c158 to #b8860b). They are renderings of materials, not interface colors, and are not to be reused as chrome.

### Named Rules
**The One Ink Rule.** Oxblood is the only color that means "act" or "this matters". Primary buttons (Advance, Select this Path, Cast, Dispatch, Join, Commission Investigator), active tabs and filled marks are oxblood; nothing else competes for that role.

**The Gilded Means Gilded Rule.** Gold signals the game's gilded state, a deliberate selection or brass. It is not a general decoration color for text or borders.

**The Art Stays Whole Rule.** Official Darrington Press art (Fairelands map, role portraits) is shown as published: no tinting, no hue shifts, credit kept visible.

**The Lamp-Lit Ink Rule.** A color that is too dark to read on the night stage gets a lifted twin (oxblood-lit, seal-green-lit, role ink); the dark original is never used for small text on dark.

### GM night side
The GM's screens keep a cool, deliberate night look (owner decision, 2026-10-04) built from exactly three tokens:
- **GM Night** (#0c1c32): the GM desk's ground and header, the sticky tab strip and the map frame.
- **GM Slate** (#1e3a5f): the Lightkeeper's Desk bar and its buttons. Since the round 3 finish the GM desk has no slate panels: the investigators, the dice controls, Invite a Player Back and the circle's formation papers are objects on the desk (see Layout).
- **Moonlight Steel** (#93adcf, tuned from #8aa4c8 to 7.4:1 on GM Night and 5.0:1 on GM Slate): GM section labels, icons, rules, pagers, empty states and ghost buttons. It replaced every stock Tailwind blue.
The paper objects on the GM desk (dispatch letter, nav slips, join-request cards, business cards, Finalize slip, pocket watch, circle ledger card, formation papers, invite slip, memo pad, activity log) keep parchment, oxblood and gold; only the ground, the bar and the moonlit rules that name things below xl are cool. The GM's dice are shown in their real colors: the grayscale and hue-rotate filter on the GM dice tray is gone. The chapter hub is shared by players and the GM and follows the warm palette.

### Effects removed in this stage
Glow box-shadows (pips, rejoin banner, death modal, creator path button), the candles' blurred radial glow (replaced by the candle cluster and its lit pool, see Elevation & Depth), `animate-pulse` on static text, accidental backdrop blur on the scar, circle and relationship modals, the GM dice filter, and the pocket watch's metal gradient and glass glare (now a flat brass case). The login slip has no blur. Every CSS animation and transition stops under `prefers-reduced-motion` (index.css).

Round 3 brought back two glows on purpose (owner's items 5 and 10): the gilded die is her original again, gold leaf from light to dark with a candle-gold edge and a soft gold halo on the felt, and on the hub, hover and keyboard focus make the tome titles and the tickets' action line catch the candlelight (see Elevation & Depth).

Round 4 brought back the pocket watch's glass on purpose (owner's item 1), as soft light only, never a drawn glare; the case stays flat brass (see Pocket watch under Components).

Round 1 of this stage also straightened the hand-placed objects (sidebar cards, circle forms, history and report cards, the dispatch note). That was a mistake: the crooked, hand-placed look is part of the owner's design (Robert Gater, 2026-10-04), and it is back. See "Hand-placed objects" under Shapes.

## Typography

**Display Font:** Cinzel (400 to 900), her original heading face (the first CampaignSelector's `font-cinzel`), loaded from Google Fonts in `index.html`, Tailwind `font-display` (owner's round 3 item 18). It sets the CANDELA OBSCURA wordmark on every header, the creator's step titles, the login slip, the tome titles, the railway tickets, the roster book's page titles, the dispatch letterhead, the Lightkeeper's Desk bar, the Halcyon Herald and the roll's outcome stamp: everything on leather, wood or the night stage, and every printed heading on paper. Its capitals keep her open tracking (0.04em to 0.1em); the Herald's masthead keeps her black, tight setting. Cinzel has no italic and sets lowercase as small capitals, so display text is never slanted (`font-synthesis: none`).
**Hand Font:** Charm (400 and 700, loaded with the pens), Tailwind `font-hand`, for a heading a hand writes on paper: the notebook's Field Notes, Log a Field Entry and Private Field Notes, in mixed case with normal tracking. A printed heading on paper (the Herald, a form's letterhead, the dispatch) is Cinzel, not Charm.
IM Fell English is gone (owner, 2026-10-04: "I don't want this font anywhere"): nothing loads it and nothing renders in it.
**Body Font:** Crimson Text (400, 600, 700 and italics), loaded in `index.html`, Tailwind `font-serif` and the body default. Prose, names, rule text, ability text, form values, empty states and in-world copy.
**Label Font:** system sans (`font-sans`), bold or black, uppercase, tracked 0.1em (`tracking-widest`; up to 0.18em on the creator's few short heads). Buttons, tabs, field labels and status chips.
**Data Font:** system monospace (`font-mono`, usually `tabular-nums`), only for numbers and identifiers: counts, dice totals, timers, scar counts, campaign codes, usernames, dates, page numbers.
**Pen fonts:** the 20 handwriting families in `index.html` (Caveat by default). A player picks one when joining a campaign; their notebook entries, signature and business-card name render in it.

The chapter hub loads no faces of its own: the runtime `@import` in DeskStyles.jsx (Cinzel, Cormorant Garamond, Playfair Display, IBM Plex Mono) and the duplicate pen `@import`s in DeskStyles.jsx and CharacterCreator.jsx are gone, Cinzel comes from `index.html` with the other faces, and the unused Playwrite NO load was dropped.

**Character:** a bookish Crimson for anything read or named, Cinzel capitals for titles stamped on paper and leather, Charm where a hand wrote a heading, and small heavy tracked sans labels that read like stamped form fields.

### Hierarchy and scale
The scale is Tailwind's: 12, 14, 16, 18, 20, 24, 30, 36, 48px (`text-xs` to `text-5xl`). Arbitrary pixel sizes remain only for pen-font text (handwriting needs its own sizes), the Herald's newspaper print and a few large serif notebook lines tied to the ruled paper.
- **Display** (Cinzel 400, 28px phone / 36px desktop, uppercase, 0.1em): the wordmark on the hub, creator, player and GM headers.
- **Headline** (Cinzel 400, 30 to 36px, uppercase, 0.06em): step titles in the creator ("Action Ratings & Drive"), the death notice, Join a Campaign, the roster book's Player Registry and Lightkeeper Ledger; oxblood on paper, cream on night.
- **Hand** (Charm 700, 30 to 48px, mixed case): the notebook's own headings (Field Notes, Log a Field Entry, Private Field Notes).
- **Title** (Crimson 700, 18 to 24px): ability and character names, sub-section heads in the creator ("A — Raise One Starting-Zero Action to 1"), field questions (Catalyst, Curiosity).
- **Body** (Crimson 400, 16px, line-height 1.5): rule text, descriptions, the dispatch letter, roster names; italic for game state and short empty states.
- **Label** (sans 700 to 900, 12 to 14px, uppercase, 0.1em): buttons, tabs, field labels, status chips.
- **Data** (mono 400, 12 to 16px, tabular): numbers and identifiers.

### Named Rules
**The Read in Serif Rule.** Anything a player reads as prose or as a name is serif. Sans is for labels, mono for numbers and identifiers only (never for sentences, rule text or the dispatch letter).

**The Twelve Pixel Floor.** No visible label or text under 12px. Decorative newspaper print (the Herald), watermarks at a few percent opacity and the printed form furniture (form numbers and edge lines at 9.5 to 10.5px, see Components) are the only exceptions; none of them carries anything a player has to read.

**The Short Caps Rule.** Uppercase with wide tracking is for short labels only. Sentences and letterhead lines are set in sentence case, usually Crimson italic.

**The Lightkeeper Rule** (owner's round 4 item 12). Every piece of visible text says "Lightkeeper" (one word, plural "Lightkeepers"), never "GM": labels, headings, buttons, aria-labels, errors, the rulebook's ability text ("ask the Lightkeeper"), the Last Played (Lightkeeper) tome, the From the Lightkeeper note. "GM" stays only in code: identifiers, props, classes, API fields, socket message types and the role value the server sends.

**The Ink Marks Rule** (owner's round 4 item 10). No text glyph that a phone turns into an emoji (▶, ✓, ✔, ✝, ⚠, ★, ♥ and the like) stands in for a mark: iOS drew the ▶ before a campaign as a blue emoji box. Ticks, crosses, the play triangle and the death notice's cross are drawn in ink (`shared/InkMarks.jsx`, in the text's own color); a glyph that must stay text, like the ™ and © in the map's credit, carries the text presentation selector (U+FE0E).

**The No Instructions Rule** (Robert Gater, 2026-10-04). No sentence explains a control ("Tap an action to roll it", "No rolls yet", "Use Change Gear to pick up to 3 items"). The layout carries the action: a roll is a raised chit that lifts and shows a faint die on hover or keyboard focus, a card that turns over shows a turn-over mark, a field has a plain label, a limit shows as a counter ("0 / 3 selected"), a choice as filled or open marks. An empty area stays quietly empty or shows an object (the empty felt, blank gear slots, a blank ruled sheet): a value not given yet is a dotted blank (`BlankEntry`), a report not filed is the dashed outline of its stamp (`EmptyStamp`), an unchosen circle question is its card with blank ruled lines (`BlankQuestionCard`), an empty register page has blank rows (`BlankRows`), the table log runs its ledger rows to the foot of the sheet, and an empty investigators panel shows the dashed place where the first card will lie. Each keeps the state for screen readers in an `sr-only` word. A select starts on a blank option under its plain label, never on "Choose ...". What stays in words: rulebook ability text, game state ("Spending locked", "Reports open", "Waiting for Iris"), the outcome of a roll, errors that say what to do next, and the second-press warnings on actions that cannot be undone.

**The Pen Belongs to the Player Rule.** Handwriting fonts appear only for text a person wrote (notebook entries, signatures, pen previews, business-card names). Interface copy never uses them. The one exception is `font-hand`, the notebook's own hand for its headings (owner's round 3 item 18); it never sets a label, a button or a sentence.

## Layout

The creator runs the full width of the screen with 40px side margins on desktop: wordmark, a four-step tab bar spanning the width, then one parchment panel. Inside panels, content splits into two or three equal columns (abilities, drive columns) with 16px to 24px gaps, and collapses to one column on phones.

The GM desk is a three-column workspace: a left rail of paper-tab navigation and the pinned dispatch, a center work surface, and a right rail with the dice tray, activity log and pass-notes. The chapter hub is a free composition of overlapping objects (tomes, newspaper, pamphlets) on a dark desk.

Spacing follows Tailwind's 4px grid. The working steps are 4, 8, 12, 16 and 24px (gap-2, gap-3, p-3, p-4, px-6 are the most used). Vertical rhythm inside parchment panels is set by sepia hairlines and 28px ruled lines (`paper-ruled`), not by large gaps.

Breakpoints are Tailwind defaults (sm 640, md 768, lg 1024, xl 1280, 2xl 1536). `lg:` carries most of the responsive switching. Phones (390) and tablets (768) stack the desks into one column.

**Desks fit the screen (xl, owner's round 3 item 24).** From 1280px the player and GM desks are one window tall and the page never scrolls. The tall title header steps aside (kept for screen readers) and the member ID strip, or on the GM desk the Lightkeeper's Desk bar, becomes one slim band: on the player desk her seal, the name and campaign, the misprinted registry number, the tabs, and Back to chapter hub behind a printed rule; on the GM desk the campaign's name and code. Three columns fill the width with about 16px edge gutters (player desk 1fr / 3.1fr / 1.3fr): on the left the GM's pinned note, Your Circle and the pocket watch at the foot; in the middle the sheet; on the right the felt with its tilted result slip, the log notepad and the pass-notes pad lying over the log's foot. A column whose papers run longer than the window scrolls inside itself, never the page. The sheet lays itself out by its own width (a container query), so the GM's copy follows its column: from 44rem it is a ledger page with the name, the gear tag and the square taped photo side by side, the ability index card across the page as tall as its text, then Nerve, Cunning and Intuition side by side with their actions under them, then the trauma record. At 1440x900 and 1920x1080 (demo Edith) all nine actions and the whole trauma record are in view and the sheet does not scroll; its printed edge line has a strip of its own at the foot, under a hairline, so nothing scrolls beneath it. The Circle tab is not one sheet: from xl its papers (the charter, the assignment report, the stores' ledger card, the history, the relationships) lie on the desk side by side in balanced columns across the sheet's column and the felt's, as the Notebook tab takes the whole desk, and the tab fits the screen; below xl they lie one under the other on the sheet. The GM desk follows the same idea with no panels: a wider left rail of nav slips and the dispatch letter; the investigators' business cards three across, the join requests or the sealed slip under them, the circle's ruled ledger card running to the foot of the desk and the pocket watch lying beside it; and on the right the dice tray with the Lightkeeper's controls on its wooden top rail, the log, the notes and the Invite a Player Back slip. The circle page (the same papers as the player's tab, with each investigator's report card), the notebook and the map take the dice rail's width from xl; a sheet opens in the middle column, and the map fills its column at 3:2. Every object stays a distinct physical thing with its own paper, tilt, pin or tape: a desk of scattered papers, never a tidy grid. Tablets keep the stacked layout.

**The player desk on phones shows one part at a time (owner's round 4 item 14).** Below md the title header steps aside (kept for screen readers) and the member ID strip becomes a slim band held at the top of the screen as the page scrolls: her seal, the name and the campaign, then a die and the drawer pull (see Navigation). When the desk loses the table, the connection message hangs under the band and moves with it, so a scrolled page never has it over the Menu and the die (on the Lightkeeper's desk and from md it is held at the top of the screen as before). Under it lies one part of the desk: the sheet's tab (Investigator, Circle with the circle's cards under its papers, or Notebook), the felt and the log, the pass-notes pad over the log, the From the Lightkeeper note, or the pocket watch, which lies half as large again when it is alone on the screen. The page scrolls within the part on show and starts at its top. From md every part shows as before. The Lightkeeper's desk keeps its strip of four slips held at the top on phones: it is already one tap from any part, so it has no drawer.

**The hub fits a phone (owner's round 3 item 28).** Below lg the chapter hub is exactly one screen tall (100dvh) and never scrolls, from 375x667 up and on a tablet. The header is one slim band: the wordmark at the left and the account as a small paper tag at the right.

**The phone hub is the left end of a wide desk (owner's round 4 item 11).** On phones and tablets the screen is a close look at the left end of a desk much wider than it: the wood's edge runs down the left with its lip catching the light, the wood shows at the top and foot, and the leather runs on off the right of the screen with its gilt lines (no right border). The candles keep a strip at the top. The tomes lie side by side at the foot of the room the tickets leave them (the tomes' row is a size container), each as large as its column allows, and the tickets lie in a row under them, as tall as a ticket is (a short phone drops their number line), their actions above the home bar. The Herald is the whole sheet printed small (`.herald-phone`, one sheet with no fold or step), lying under the tomes with its masthead and headline showing above them and the rest running off the right edge. A few papers tuck under the tomes and tickets: on phones the torn page under the Case Ledger's head, the postcard on the Herald under the Last Played tome and the third field sketch under the tomes' feet; tablets keep the torn page, the sketch on the right edge and the postcard under the tickets. No control is covered or cut. Turned over, the Lightkeeper's ticket grows upward over the tomes as tall as its form, so the fields sit above a phone's keyboard. On the GM desk the bar keeps to one row on phones (Back to chapter hub and Account), with Retire on the account card.

## Elevation & Depth

Depth is literal and physical. Objects cast heavy, dark, offset shadows onto the night desk, and paper surfaces carry inset shading to feel worn. Shadows are almost always pure black at high opacity (0.5 to 0.98), offset down and to the right as if lit from a lamp above left. Wells on parchment use `shadow-inner`.

### Shadow Vocabulary
- **Paper on desk** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3)`): parchment panels resting on the night stage.
- **Object lift** (`box-shadow: 4px 6px 15px rgba(0,0,0,0.7)`): cards, pamphlets and tabs resting on the desk; the deepest objects (tomes) go to `15px 25px 40px rgba(0,0,0,0.95)` with inner leather shading.
- **Inset well** (`box-shadow: inset 0 2px 4px rgba(0,0,0,0.15)`): mark boxes and recessed areas on parchment.
- **No glows**, with the owner's two exceptions. Filled and gilded pips and banners are flat fills with a cast shadow at most. The gilded die keeps her soft gold halo on the felt; on the hub, hover and keyboard focus warm the tome titles, the campaign's name and mark like gilt catching candlelight and the tickets' action line in its red ink, with a faint flicker (owner's round 3 items 5 and 10; lit at once and still under reduced motion).
- **Modal** (`box-shadow: 0 20px 60px rgba(0,0,0,0.9)`): dialogs over the desk.

### Named Rules
**The One Lamp Rule.** On the desks all cast shadows fall the same way (down and right), because the desk has one light. On the chapter hub the light is the candles themselves: every object (tomes, tickets, Herald, sketches) casts its shadow away from the flames, measured per object (`useCastShadows.js`, with `data-cast` for its height above the desk), so a tilted object still casts straight away from the light, and on wide screens one flicker moves the light, the candles' shadows and the objects' shadows together. The candle flames keep only a small halo.

**The Lit Pool Rule.** Candlelight is light falling on things, not a haze in the air. The chapter hub's candles light a small warm pool that falls off fast into the room's shade (`.desk-glow` under the objects, `.hub-light` in `soft-light` blending above them and `.hub-shade` beyond it, in DeskStyles.jsx), so whatever lies near the flames warms in its own colors on the side that faces them and the corners fall dark. The hub stays at or below her original's brightness (mean luma 59.5 against her 59.9 at 1440). No blur filter, no glow blob. The light sits in the hub's own stacking context (no z-index, opacity or transform on its boxes), or the blend has nothing to light.

**The Smooth Hub Rule** (owner's round 4 item 3). The hub's motion runs on the compositor, so the roster book, the GM ticket's flip and the tome glow hold a steady 60 frames a second at 2560x1392 and 1440x900. The flicker is one set of transform keyframes per moving layer, all on the same 4.3s rhythm (`.hub-light`, `.hub-shade`, each candle's shadow group, each object's `.cast`), never an animated custom property or anything that repaints the room. On wide screens each object on the desk is two layers: its cast shadow, with the blur drawn once inside it, and its body (`.tome-body`, `.ticket-body`, `.herald-sheet`, `.sketch-paper`), so the leather, paper, blends, masks and clips inside the body are drawn once and cost nothing per frame. A new object on the hub desk follows the same pattern and puts no `mix-blend-mode`, `filter` or rounded `overflow` clip on a layer of its own (a tome's glowing words get a layer only while hovered). A cast shadow is a plain fill, never an image: the papers stage first gave the casts each paper's SVG outline, and because the cast's layer moves with the flicker, Chrome painted and rastered those images again on every frame (raster at rest went from about 45 ms to 1,200 ms a second). The same image in the paper's still body layer costs nothing. While the roster book is open the room holds still under it (`.hub-still` pauses every loop); the book has will-change only while it moves, and the paper sound loads while the hub is idle. These gains never trade away any of the look (owner's update to item 3: the stutter in his video came from hardware acceleration being off). The traces and numbers are in candela-ui-review/2026-10-04-r4-perf.

**Torn paper keeps its shadow.** A clip-path or mask cuts away a box-shadow, so torn or deckled paper (nav slips, the Finalize slip, pinned notes, the From the Lightkeeper note) casts its shadow with `filter: drop-shadow()` on a wrapper, which follows the torn edge. These are small objects; never put a filter on a large area. On the hub the papers and the Herald are cut by masks inside their body layer, and their contact shadow is their own outline (the mask drawn as a blurred silhouette, `--shape`) under the paper in that same layer, so it is drawn once; the cast stays a plain fill a little inside the cut, with a dog-eared or torn-off corner taken out by a hard gradient stop.

## Shapes

Corners are tight. Small radius (2px) is the default for panels, wells, chips and tags; medium (4px) for buttons and the step bar. Full rounding is reserved for things that are round in the physical world: action pips, illumination dots, wax seals, dials and the pocket-watch tension clock. Paper objects add their own silhouettes: torn and slightly rotated tabs, corner brackets on the creator panel, double rules (`border-style: double`) on formal frames, dashed borders for empty slots and upload targets. Borders are 1px hairlines in sepia or ink at low alpha; 2px is used for frames and selected cards.

### Hand-placed objects
**Hand-placed objects sit slightly crooked; tilts of about 0.5 to 2 degrees, fixed per object.** Cards, notes, slips and forms lie as if someone put them down: the player's circle cards and the From the Lightkeeper note on the player desk, the GM's investigator business cards, nav slips, Finalize and finalized slips, report and history cards on the circle pages, the chapter-house examples and tape in the formation papers, pinned private notes, the gear tag, the roll's result slip, the pass-notes pad, the pinned photos on the circle cards, the circle's papers on the Circle tab and the GM's circle page, the GM's circle ledger card, formation papers and invite slip, and filled mark boxes (inked by hand). The angle comes from `tiltFor(key)` in `components/shared/handPlaced.js`, a hash of the object's id, so an object keeps its angle across renders, reloads and list changes; lists alternate the lean so neighbours never match. The `.hand-placed` class (index.css) applies `--tilt` and eases it to 70% on phones. Text inside stays level enough to read, a tilt never moves an object over a control, and an object a person picks up (hover) may straighten. Tomes and tickets on the hub keep their larger, older angles; the creator's card deck keeps its own.

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
- **Ability chips under an action** (the roll modifiers): one line each, never broken: the ability's name in the serif and what it adds in the sheet's own marks (+1d in mono, the gilded dot, the drive it lets you spend in italic); the full rule text is the chip's name and title. A chosen chip takes a gold wash and an ink tick at its corner, so choosing one never re-flows the row.

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
- **Player desk drawer on phones** (`pc/DeskDrawer.jsx`, owner's round 4 item 14): the band's end carries a die and a brass bail pull with "Menu" beside it, both 44px. The die brings up the felt and the log in one tap and, pressed again, the part that was on show before. The pull slides the desk drawer out from the right edge over the dimmed desk: dark leather with a mahogany lip, Account at its head with the cross that closes it, then a slip for each part (Investigator, Circle, Notebook; a gap; Dice and log, Pass notes, From the Lightkeeper, Pocket watch), each a little crooked with its icon, and Back to chapter hub at its foot. Each slip is a strip of the hub's aged paper (`paperArt.js`, drawn once from its own seed): torn off at its right end with pale fibres along the tear, worn along its long edges, yellowed unevenly with a tea-stained rim and a few fox marks, some with a soft crease, a corner turned down or torn off; no rule down its side, and its shadow follows the tear. The part on show is the brighter, cleaner slip (cream, its stain fainter) with its label inked under in the pen. Choosing a slip shows that part and closes the drawer; a tap on the dimmed desk or Escape closes it too. Focus starts on the slip on show, Tab stays inside the drawer (and inside the account card while it is open over it), and focus goes back to the pull. Under reduced motion it does not slide.
- **Roster book on phones** (owner's round 4 item 10): one page at a time, turned by two small index tabs cut from the top of the page block ("Registry" and "Ledger", their full names for screen readers). Only their top 30px stands proud of the page's edge; the open page's tab is the page's own paper and runs on into it, the other is older paper standing behind the page. Each tab's tap area runs on over the blank head of the page, so it is 44px tall. Close book lies on the dark beside them, and the hub's band (wordmark and Account) steps out of sight while the book is open, so nothing shows through.

### Action Pips and Mark Boxes (signature)
The game's numbers are drawn as physical marks. Action pips are 13px circles with a 1.5px sepia ring; filled pips are solid oxblood; gilded pips are candle gold with a sepia ring. Drive points are small squares filled with their drive's tint. Each drive and its actions are a printed section of the form under a double rule in the drive's ink, with a faint wash of it; there is no tray around them. Mark boxes are 20px squares with a 2px ink border and an inset shadow, filling with oxblood; they are inked on the trauma record (Form C.O. 14, owner, 2026-10-04), the dashed cut-out form at the foot of the sheet that holds the marks and the scars, its form number printed on its top edge. On a wide sheet it is two ruled lines in three columns: Marks, then Body, Brain and Bleed with their boxes on one line, then the status rubber-stamped at the end; Scars, then the scars written on the ruled line, then their count. On a narrow sheet and on touch screens the three tracks stand one under the other with 44px boxes, the stamp under them, then the scars. The gear is a manila luggage tag tied to the sheet beside the name (cut at its narrow end, a reinforced eyelet, its string running off over the page), its items drawn large with Change gear on its head, its shadow a drop-shadow on its wrapper. The illumination track is a row of ink dots with gold-ringed milestones every third pip.

### Role Card Deck (signature)
The creator's left column: an official role portrait in a gold-lined card frame with corner ornaments, the role name in serif at top and the role label in gold at the bottom, stacked over two offset card backs, with prev/next controls and a "1 / 10" counter.

### Chapter Hub Tomes (signature, kept by owner)
Two leather-bound books of one size, seen from above (`Tome.jsx`), with an open/close animation into a two-page ruled spread; PRODUCT.md marks them as the model for the app's physical-object feel. Under the front board lie the text block's fore edge and tail, mitred at the corner, and the back board just beyond them, so the pages read as part of the book; the cover's frames start clear of the spine's hinge groove. Spine and cover are one bound object (owner's round 4 item 7): below the cover's corner the spine's leather turns down round the tail of the book to the back board (`.tome-foot`), darker as it turns from the light, its corners rounded as the cover's are; the tail of the text block starts where the spine's cap covers it; the spine's head catches the candles where it turns over the top edge; the hinge groove runs the cover's full height and fades out at both ends.
- **Case Ledger** (register green, edges sprinkled red): its title in embossed gold-leaf Cinzel, and the counts ("In play", "Awaiting approval", "Campaigns you run") as entries on an aged paper label pasted a little crooked on the cover, with dotted leaders and hand-drawn tally marks (pencil while awaiting approval). An empty ledger shows blank ruled lines. It opens into the roster book.
- **Last Played** ("Last Played (Lightkeeper)" for the Lightkeeper, on two lines; plum leather): the campaign's name and its own mark (`CampaignMark.jsx`: the campaign's initials in a gilt roundel, lozenge, shield or octagon with a small ornament, both fixed by a hash of the name). Without a session it lies strapped and locked with a brass padlock.

### Account card
"Account" opens a member's card (`AccountMenu.jsx`), the same paper on every desk: parchment with a double sepia rule, a little crooked, "Chapter member" in the form line's capitals and the account's serial in red, the name in the serif and the email in mono. An account without Google offers "Link Google account" (Google's own button; a password field when Google's email is not the account's), then "Google linked" with a pen tick in seal green. Sign out lies at its foot. Only the button that opens it takes the colours of where it sits: on the hub a small paper tag lying crooked at the desk's edge, on the player desk's band a printed button, on the GM bar a moonlit one. The GM bar lays Retire on the card on phones.

### Photo mount and the dossier's photo
An empty portrait is an album photo mount (`PhotoMount.jsx`): four black paper corners and a faint printed sitter, drawn in CSS and SVG, with a visible "Add portrait" under it; with a photo, "Change portrait" and Remove. On the player's own desk the taped photo on the dossier is the button: "Add portrait" on the empty mount, a "Change portrait" caption on hover or focus (always shown on touch), and after a change "Portrait changed." with an Undo countdown under the photo on the ledger page and under the name on a phone. The GM's copy only shows it.

### Forgotten and new password
The admission slip (Form C.O. 0) has two more states, on the same paper, tape and tilt. "Forgotten Password": Email and Send reset link, then the owner's text word for word with a red "Link sent" rubber stamp, and Google's button under "or sign in with Google". "Set a New Password" (`/reset-password?token=...`): New password with "At least 8 characters." under it and Confirm password; a used, expired or missing link says so and offers "Ask for a new link". Success returns to the sign-in slip with the username filled in and a green "Password set" stamp.

### Chapter Hub Candles (signature)
Three pillar candles drawn in SVG (`CandleCluster.jsx`) in her tight cluster at the top left of the hub, seen from above as the desk is (owner's round 3 item 25): round wax tops with uneven rims glowing where they are thin, melted pools, drips over the lip, small bright flames with a soft halo, and long soft shadows that each lit flame throws of the other candles, stretching and shortening with the room's flicker. The light falls on the desk as a lit pool (The Lit Pool Rule). One candle burns for the chapter and one more for each investigator in play or campaign the person runs, up to three; an unlit candle shows its wick and a thread of smoke, and the pool dims with fewer flames. Everything holds still under `prefers-reduced-motion`. Phones and tablets give the candles a strip of desk above the tomes.

### Pocket watch (the tension clock, owner's round 4 item 1)
One watch (`TensionClock` in `SceneManager.jsx`) lies at the foot of the player desk's left rail and beside the circle's ledger card on the GM desk: 144px, and 170px on the GM desk from 2xl. A flat candle-gold case with a 2px sepia edge, a night dial with gold ticks, and the oxblood fill running clockwise from 12, a quarter per step.
- **The glass** (`WatchGlass`): soft light only, nothing that reads as a drawn line (the owner turned down a crisp white arc). A broad faint sheen from the lamp at the upper left; the lamp's window as a feathered crescent just inside the upper left of the rim, brightest in its middle and gone at both ends (a masked crescent filled with a radial gradient from its middle, blurred); one small soft specular point; a faint warm glow low on the right where the light leaves the glass; the glass's thickness darkening its lower edge. The red fill and every tick read through it at every step.
- **Bow and stem** (`WatchPendant`): one brass piece with the case, never floating above it. The case's edge line turns up a flared collar into the stem, a bead, then the knurled crown, and the bow ring runs into the crown. The stem and crown are shaded as small brass cylinders lit from the left and the flare fades into the case's flat brass. Its shadow falls on the desk, never on the case.
- **The Lightkeeper's watch**: under the + and − buttons only the dial dims; the brass and the glass keep their light, so the case and stem are the same brass on both desks.

### Desk papers (owner's round 4 items 2, 4 and 5)
The loose papers on the hub (`CryptidSketches.jsx`) and the Herald are aged, used paper, never a clean frame or a border. `paperArt.js` draws each sheet once from its own seed as three SVG images stretched over it: a mask that cuts its edges (deckled, torn with pale fibres, machine cut, worn, or a photograph's scalloped deckle; worn, dog-eared or torn-off corners; worm holes), a stain multiplied over it (uneven yellowing, a darker tea-stained rim that follows the cut, foxing) and a light layer (soft creases with a lit and a shaded side, a curled corner, worn gilt, the folded-over flap of a dog-ear). The art on the sheet stays whole and is never painted over; the field sketches keep their old sepia treatment.
- **Field sketches** (round 3, the three official sketches): each now at its own art's shape, on its own paper: a deckled sheet with a dog-eared corner and a fold, a print torn along one side with a vertical crease and a curling corner, a sheet torn along its foot and creased.
- **The owner's cryptids**, each a different object: a page torn out of a book (the sea monster, ragged where it left the binding, the other side's text showing through), a bestiary leaf (lions and panthers, vellum with a worn gilt edge, cockled, worm holes through it), a hand-coloured print pinned down with a brass tack (the sea monk; the paper puckers round the tack and a corner curls), a sepia photograph of the woodcut (the blemmye, a white deckle-cut border, three black album corners still on it), and a picture postcard (the sea swine, a corner bent over showing the stamp and postmark on its back). The postcard is old card like the sheets beside it, never clean new stock: yellowed unevenly, its rim tea-stained, foxed, its corners worn round, a soft bend across it and the print sunk into the card's tone.
- **Where they lie** (owner's round 4 item 16: spread out so each shows more): from lg the papers by the tomes are placed by the tomes themselves (`.hub-tomes > .sketch` in DeskStyles.jsx: --T a tome's width, --G the gap, --x0 where the Case Ledger starts), so at least about half of every picture shows at every desk width, clear of the tome titles and the tickets' actions, still overlapping like a cluttered desk. Along the top, left to right: the candles, a field sketch tucked under the Case Ledger's head, the torn page over it, and a field sketch on the Herald's corner under the Last Played tome's head; under the Case Ledger's foot the photograph, and under both feet the third field sketch; the postcard under the Herald's left edge; from 1880px wide the pinned print lies left of the tomes, and on a desk at least 1600 by 1000 the bestiary leaf lies sideways under the Herald's top edge. Phones and tablets show only a few (see Layout). Decorative and hidden from screen readers; the new images load lazily, so a phone never fetches the ones it hides.
- **The Herald**: machine-cut newsprint worn a little uneven, darker toward its edges all round, with a few fox marks and its own shadow under it. No border and no lit rim along its foot (the old 2px border showed as a pale line). On phones and tablets it is the same whole sheet printed small, lying under the tomes and running off the right edge (the folded strip at the desk's foot is gone), one sheet with no step across it.

### Physical touches
Small, meaningful responses drawn in CSS or SVG; each one stops or shows at once under `prefers-reduced-motion`.
- **Wax seal** (`WaxSeal.jsx`, `.wax-seal-*` in index.css): her original seal from the first MainDeskView (owner's round 3 item 16): a round seal in her three reds, darkest at the lower right, with a soft light at its upper edge, a dashed ring pressed into it and the candle-holder mark pressed into the middle in a darker red, turned 12 degrees, with her heavy cast shadow. Its measures are shares of its width (container units), so it keeps her proportions at 32px on the Finalize slip and at 128px on the player's member ID strip; the mark's light edge never drops under a pixel. It sits on the member ID strip and the Finalize slip. Pressing Approve on a join request, or confirming Finalize, presses a large seal onto the request or slip while it goes to the server (an approved request then fades off the desk), and a finalized circle shows a sealed slip ("The circle is finalized") below the investigators.
- **Ink stamp on roll outcomes**: the outcome word on the result slip is a rubber stamp, a little crooked (fixed per roll), its ink worn by pinholes (a mask), pressed down once when the result lands.
- **Pinned notes**: private notes carry an oxblood push pin and a drop-shadow that follows their torn top edge.
- **Page turn**: changing spreads in the notebook turns a blank leaf over from the spine (forward or back), over pages that are already there, with the paper sound. Every entry spread has an oxblood satin ribbon lettered "Contents" in gold leaf that turns back to the contents, and its outer bottom corners are turned up with an arrow (back on the left, on on the right); the left and right arrow keys turn too, unless a field, a widget or a dialog has the key. The contents page holds as many one-line entries (title, dotted leader, page number) as fit it, and pages with small engraved arrows in its bottom corners; the book keeps one size.
- **Flips**: the GM's railway ticket turns over in 3D to the new campaign form (her original pamphlet flip), the creator's role cards turn, and the circle and report cards turn over to their backs, each with the paper sound; under reduced motion the faces swap in place without spinning.
- **Dispatch going out**: when the GM presses Dispatch the letter shifts under the stamp, with the paper sound (the sound alone under reduced motion).
- **Dispatch typing in**: when the GM sends a new dispatch while a player's desk is open, the From the Lightkeeper note types it in with a carriage mark at the end of the line. What is there when the desk opens shows whole; screen readers get the whole text at once.
- **Deckled edge** (`.deckle-bottom`): the From the Lightkeeper note's bottom edge is torn by hand.

### Printed form furniture (owner's request, 2026-10-04)
The paper objects carry the small print of forms that came off a press, drawn in code by `components/shared/PrintMarks.jsx` with the `.print-*` rules in index.css. All of it is decoration: `aria-hidden`, faint on purpose, never an instruction, never over a control, no clicks.
- **Watermark**: oversized faint mono print behind a strip, at about 8% ink before its mask thins it. The member ID strip on the player desk carries "REGISTRY FILE // NO. 00000-CO", its number fixed per investigator, as a misprint (owner's round 3 item 17, `<Watermark misprint>`, `.print-misprint`): two or three degrees off level about its right end, struck a little off register, its ink uneven (a noise mask over a pressure gradient) with a faint second impression a hair up and to the right, and the start of the line running off the strip's edge. The print is anchored by its right end, so the number always reads whole: from lg it ends in the open paper just before the tabs and its first words run under the name and the seal; on phones and tablets, where there is no open paper between the name and the tabs, it is printed along the top of the strip and ends at its right edge, clear of the tabs.
- **Form line**: tiny letterpress capitals in sepia at about 60% ("Form C.O. 7 · Investigator record", "Form C.O. 14 · Trauma record", "Memo · Form C.O. 22", "Office of the Lightkeeper · Vol. II"). Each kind of paper keeps one form number everywhere it appears, and each number names one kind of paper:

  | Form | Paper |
  |---|---|
  | C.O. 0 | Admission (login slip) |
  | C.O. 1 | Lightkeeper's commission (the hub's first-class ticket, Lightkeeper's Pass) |
  | C.O. 2 | Dispatch (the GM's dispatch letter) |
  | C.O. 3 | Circle charter (the Circle tab, the GM's circle page, the Finalize and sealed slips) |
  | C.O. 4 | Circle formation papers |
  | C.O. 5 | Field register (the notebook) |
  | C.O. 7 | Investigator record (creator sheets, dossier, the hub's third-class ticket) |
  | C.O. 9 | Table log |
  | C.O. 11 | Assignment report |
  | C.O. 14 | Trauma record (marks and scars) |
  | C.O. 22 | Memo (pass notes) |
- **Running head**: the notebook's opening spread carries "Section I" and "Section II" in the top outer corner of each page over a hairline, in the form line's capitals, clear of the page heading.
- **Serial number**: a numbering machine's red figures ("No. 89206") in the corner of the dossier, the GM's dispatch, the From the Lightkeeper card, the circle charter, business cards and each roll's result slip. `serialFor(key)` hashes a stable key, so a sheet keeps its number across reloads.
- **Printer's mark**: a registration circle and cross beside a form line.
- **Edge line**: small print repeated along the bottom edge of the investigator sheet and clipped by it.
- **Date stamp**: a worn rubber stamp with a word and a date ("Report sent 4 OCT 2026", "Report filed").
- **Ruled box**: a blank box in a form's margin ("Lightkeeper's seal" at the foot of the formation papers).
`PaperSheet` takes `printLine` and `serial` for its top corners (creator sheets, login slip).

### Dice tray and roll line
- **Result slip**: the roller's name in their ink and the slip's serial; then what was thrown, in the rulebook's terms, for every pool: "Move: 2 dice, lowest counts" (zero rating), "Sense: 1 die", "Sway: 3 dice, highest counts", "Survey: 2 dice, 1 gilded" and, after the choice, "... kept the gilded 5"; a resistance reroll reads "Move, resistance burned: ...". Dice thrown beyond the rating (drive spent, an ability, a Train bonus) show after the action the way the sheet's drive stepper writes them: "Sneak +2d: 4 dice, highest counts". The count is what the server threw (capped at 6). Then the outcome stamp, or a dashed "Keep one die" while a gilded choice is open.
- **The GM's felt** shows the newest roll at the table: the Lightkeeper's own, or a player's as its dice start tumbling at that player's desk (`dice_thrown`), with the player's name in their ink, their action and the counts ring on the die they kept. A player's felt shows their own rolls.
- **Dice**: the felt is empty until the first roll. Every die is her original from the first DiceVault, drawn by one component (`dice/Die.jsx`) with standard pip layouts: ivory with a hairline edge and a 4px corner, and the gilded die in gold leaf (#e5c158 to #b8860b) with a candle-gold edge and her soft gold halo. The die that counts carries a green ring; after a gilded choice it is the die that was kept.
- **Actions on the sheet**: the whole row is the roll: a paper chit with its label and its rating pips that lifts and gets the pen underline on hover and sinks when pressed; a faint die shows only on hover or keyboard focus. The gilded dot stays. The drive stepper beside each drive reads "+0d" and goes up as drive is added.
- **Phone roll bar** (owner's round 4 item 15): below lg, while the felt is out of view, the latest roll comes up as a strip of felt at the foot of the screen: the roller's ink, the action and what was thrown in the slip's words, the outcome, the dice. It is only on the player's own desk, so every roll on it is hers: her name shows only while the dice are out, and the action line runs on to a second line rather than being cut short (five or six dice lie in two rows of three to leave it room). It goes by itself: about 4 s after the dice land, about 8 s when the roll offers a resistance reroll or an ability, after a gilded die is kept, or when the roll did not go through, and never while a gilded die waits to be kept (its two candidates are on the bar and it has no cross). Then it fades out (at once under reduced motion). A finger on it, or keyboard focus in it, holds it, and the wait starts again when it lifts. Its cross closes it at once; tapping the rest of it opens the whole tray as a sheet, and closing the sheet closes the bar. A result already seen on the felt does not come up afterwards. The roll stays in the activity log.
- **What an action does** (owner's round 4 item 9): a mouse shows it on hover (the row's title). On a touch screen (pointer: coarse, any width) each action row, the player's and the Lightkeeper's copy alike, ends in a small printed "i" in a ring, its own 44px target that never rolls ("About Move" for screen readers). It lays the same words on a slip of paper under the row, a little crooked, clear of the column of "i"s; one slip at a time, closed by a tap outside it, Escape (focus goes back to its "i") or the "i" again. The row stays on one line and nothing explains the mark.

### Ability card (owner's round 4 item 13)
The index card under the name has three tabs (Role ability, Specialty ability, Catalyst) in one label style, and its three panes share one type treatment: the printed heading in the label style in oxblood ("Face ability", "Catalyst and question"), then each entry as its name in bold capitals of the serif with a colon and its text in the serif. The catalyst and the question are entries like the abilities; the player typed them, so they print, never in a pen font. The Lightkeeper's copy is the same card.

### Sounds
`game/rollSounds.js` plays five files from `public/sounds`, all under one switch: a loudspeaker in the corner of the felt ("Sounds") turns them off or on for that browser (`localStorage`, default on); a browser that has not had a click yet stays silent.
- **Results**: `full-success.mp3` (a vibraphone chord) when a roll's final result is a Full Success (a counting 6 that is not a Critical) and `failure.mp3` when the counting result is exactly 1; nothing for Mixed, Critical, or a Failure of 2 or 3. Both come from Pixabay's free library (no attribution required). The cue is the roll's line in the activity log, which reaches every desk at the table once, when the result is final; a secret roll writes no line, and a reconnect replays nothing.
- **Dice** (`dice-roll.mp3`, owner's round 3 item 19), for everyone at the table as the dice start to tumble on the roller's desk (the roll lands, or a gilded die is kept): the roller's desk with its own tumble, every other desk when the server's `dice_thrown` arrives. A server without it leaves them the roll's log line, and they hear the dice then. The result sound waits until the dice have landed (560ms), so the two never sound at once.
- **The watch** (`tension-tick.mp3`, item 20): when the GM raises the tension every desk hears the pocket watch tick, once for each slice now filled (the file's four ticks, cut short in the quiet after the last one needed); lowering it is silent. The first circle after a desk opens or reconnects only sets the baseline, so a change made while away never ticks.
- **Paper** (`paper.mp3`, item 21), only on the screen that moves the paper: the hub's book opening and closing (not when it closes because you leave for a desk), the GM ticket's flip, notebook page turns, the creator's role cards, the circle and report cards, and the dispatch going out. Softer than the others, and a turn within 260ms of the last stays quiet, so fast turns never pile up.
The two round 3 files are free to use or the owner's own (his decision, 2026-10-04). Phones, iOS Safari above all, only let an audio element play from script once it has been started inside a tap, so on the first tap or key press anywhere on the page each sound is started muted and stopped at once; that unlocks it for the visit, and an unlock that settles late never stops a sound that started meanwhile.

## Do's and Don'ts

### Do:
- **Do** let the layout say what a control does: a raised chit for a roll, a counter for a limit, a mark for a choice. Words are for rulebook text, game state, outcomes and errors.
- **Do** give paper objects their printed furniture (form number, serial, edge line) from `PrintMarks.jsx`, faint and out of the way.
- **Do** use oxblood (#721c15) for the single primary action on a screen and for active tabs, filled marks and pips.
- **Do** place parchment objects on the night stage, with the shadow falling down and right.
- **Do** set prose, names and rule text in the serif, and labels in small heavy uppercase with at least 0.1em tracking.
- **Do** reserve candle gold for gilded dice, gilded actions and deliberate selection.
- **Do** show official art whole, with its credit, and use the role portraits on role surfaces.
- **Do** use the character creator's panel, tab bar and button patterns as the reference when restyling other screens.
- **Do** keep handwriting fonts for player-written text in the player's chosen pen; the notebook's own headings are the one place for `font-hand`.
- **Do** set display headings in Cinzel and never in IM Fell English, which the owner removed from the app.
- **Do** lay hand-placed objects (cards, notes, slips) slightly crooked: 0.5 to 2 degrees, fixed per object with `tiltFor()`.

### Don't:
- **Don't** write a sentence that explains a control or fills an empty area ("Tap an action to roll it", "No rolls yet", "Appears here once ...").
- **Don't** let a desk page scroll from xl, or leave it a narrow column on wide screens; the columns fill the width and a long paper scrolls inside its own column.
- **Don't** introduce colors outside the Dark Academia palette and the three GM night tokens; stock Tailwind blues, slates and stones are drift, not precedent.
- **Don't** add art taken from Candela Obscura source material, and never remove art the app already has (official or open-source).
- **Don't** use rounding above 4px on rectangles; round shapes are for pips, seals and dials.
- **Don't** recolor, crop away the credit of, or replace the official art.
- **Don't** use handwriting fonts for interface labels or buttons.
- **Don't** use gold as general text or border decoration where nothing is gilded or selected.
- **Don't** straighten the hand-placed objects as "noise", and don't tilt anything by a new random angle on each render.
- **Don't** animate a custom property, a filter, a shadow, a size or a position on the hub; move a layer of its own with transform and opacity (The Smooth Hub Rule).
- **Don't** put an image in a hub object's cast shadow; the cast is a plain fill, and the paper's outline lives in its still body layer.
- **Don't** give a paper on the hub a clean frame, mount or border; its edge is its own cut, stained and worn (Desk papers).
- **Don't** draw light on glass or brass as a stroked line or arc; a highlight is a feathered gradient that fades out at its ends (Pocket watch).
- **Don't** write "GM" where a person can see or hear it; it is "Lightkeeper" (The Lightkeeper Rule).
- **Don't** use a text glyph that a phone turns into an emoji (▶, ✓, ✝, ⚠ and the like) as a mark; draw it in ink (The Ink Marks Rule).
- **Don't** draw the phone hub as a whole framed desk; it is the left end of a wide desk, the leather running off the right (Layout).
- **Don't** let the desk wood go bright or show its grain in hard stripes; it lies in shadow and warms only near the candles (Material literals).
