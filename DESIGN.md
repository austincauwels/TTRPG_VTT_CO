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

<!-- Colors and Typography updated after the colorize and typeset stage, 2026-10-04 (beta-ui). Scan-mode record of the incumbent system, 2026-10-04. Source of truth: frontend/tailwind.config.js, frontend/src/index.css, inline styles in frontend/src/components, and the before-tour screenshots in /home/gater/projects/candela-ui-review/2026-10-04-before. The Overview language and color character names are a draft pending owner confirmation. Round 3 (2026-10-04) updated Typography, the seal, the watermark, the sounds, the desk layout, the hub and the dice; its finish fixes added the marks tag, the ability chips, the Circle tab's papers, the GM desk without panels, the phone hub, the account card, the photo mount and the password slips. After round 3 the owner moved the luggage tag to the gear and the marks onto the trauma record with the scars. Round 4 item 3 moved the hub's motion onto the compositor (The Smooth Hub Rule); items 2, 4 and 5 aged the desk papers, added the owner's cryptids and took the lit rim off the Herald (Desk papers); item 1 gave the pocket watch its glass and joined its stem to the case (Pocket watch). The round 4 finish fixes darkened the desk wood (item 8), made the cup ring a cup's size (item 6), joined the tomes' spines round their tails (item 7), turned the phone hub into the left end of a wide desk (item 11), spread the papers (item 16) and aged the postcard, gave the roster book index tabs and ink marks in place of emoji-prone glyphs (item 10), added the "i" on action rows for touch screens (item 9), gave the ability card one type treatment (item 13) and put "Lightkeeper" in every visible place that said "GM" (item 12). Items 14 and 15 gave the player desk on phones its slim band and drawer and made the phone roll bar a pop-up that goes by itself (Layout, Navigation, Dice tray and roll line); their finish fixes cut the drawer's slips from the hub's aged paper, hung the connection message under the phone band and let the roll bar's action line run on to a second line. The notebook stage (items 19 and 20) set the notes in Markdown and gave Sketch its drawing sheet (Notes in Markdown, Sketch sheet). The candles fix stood the hub's candles by the tomes instead of the window (Chapter Hub Candles). On 2026-10-05 the owner's red-chalk creature joined the desk papers as a sketchbook leaf (Desk papers), and sketches and photographs in the notebook took the page's whole width with their words under them (Pictures in the notebook). Later that day every desk paper grew to at least a railway ticket's size, fewer of them on smaller screens (Desk papers), and then the papers were scattered: each at its own angle, one or two turned well over, in a pile under the Herald, the tomes and each other, at least a third of each showing (Desk papers). On 2026-10-08 each visit began to drop the papers a little differently, within measured ranges (Desk papers). -->

# Design System: Candela Obscura VTT

## Overview

**Creative North Star: "The Candlelit Desk"** (chosen by Robert Gater, 2026-10-04)

The app is a desk at night. Every surface is a physical object a Candela Obscura investigator would handle: leather tomes on the chapter hub, a deck of role cards and a tea-stained ledger in the character creator, torn paper tabs and a pinned dispatch on the GM desk, a ruled notebook with handwritten entries, dice that tumble onto a felt tray. Dark lamp-black space surrounds pale parchment, and the only saturated color is oxblood ink with gold for anything gilded or chosen.

Density is moderate to high. Rule text and mechanics sit close together on parchment panels, separated by thin sepia hairlines and inset wells rather than whitespace. The character creator is the internal reference for the whole app (PRODUCT.md): its dark stage, oxblood step tabs, parchment panel with corner brackets, sepia hairlines, role-tinted card deck and oxblood Advance button are the patterns the rest of the app should converge on.

The identity is Dark Academia (parchment, emerald green, gold). The app keeps every piece of art it already has, the official Darrington Press art (the Fairelands map on login, the investigator role portraits on the card deck, the cryptid sketches) and the open-source paper, leather and wood textures, and adds no new art from Candela Obscura source material (PRODUCT.md art rule). New visual elements are drawn in code. The one addition is the owner's own choice of old cryptid prints for the hub desk (round 4 item 4: a blemmye woodcut, a sea monster woodcut, a bestiary page of lions and panthers, a hand-coloured sea monk and a sea swine woodcut, in `public/images/cryptids/` as small WebP files; a sixth, a red-chalk creature study, approved on 2026-10-05, lies on the desk as a sketchbook leaf). The current build carries emerald green much more thinly than parchment and gold (one leather tome and the success color); see Colors.

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
- **Candle Gold** (#d4af37): gilded dice and gilded pips, the selected ability, drive or question, brass details (the hourglass's rings, seats and spindles, the brass button), milestone rings on the Illumination track. It is not used for headings, labels or borders that are not gilded or selected. Gold text never sits on paper (1.6:1).
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
- **GM Slate** (#1e3a5f): the Lightkeeper's Desk bar and its buttons. Since the round 3 finish the GM desk has no slate panels: the investigators, the dice controls and the circle's formation papers are objects on the desk (see Layout).
- **Moonlight Steel** (#93adcf, tuned from #8aa4c8 to 7.4:1 on GM Night and 5.0:1 on GM Slate): GM section labels, icons, rules, pagers, empty states and ghost buttons. It replaced every stock Tailwind blue.
The paper objects on the GM desk (dispatch letter, nav slips, join-request cards, business cards, Finalize slip, hourglass, circle ledger card, formation papers, invite slip, memo pad, activity log) keep parchment, oxblood and gold; only the ground, the bar and the moonlit rules that name things below xl are cool. The GM's dice are shown in their real colors: the grayscale and hue-rotate filter on the GM dice tray is gone. The chapter hub is shared by players and the GM and follows the warm palette.

### Effects removed in this stage
Glow box-shadows (pips, rejoin banner, death modal, creator path button), the candles' blurred radial glow (replaced by the candle cluster and its lit pool, see Elevation & Depth), `animate-pulse` on static text, accidental backdrop blur on the scar, circle and relationship modals, the GM dice filter, and the pocket watch's metal gradient and glass glare (the watch is gone: the hourglass replaced it on 2026-10-08, see Hourglass under Components). The login slip has no blur. Every CSS animation and transition stops under `prefers-reduced-motion` (index.css).

Round 3 brought back two glows on purpose (owner's items 5 and 10): the gilded die is her original again, gold leaf from light to dark with a candle-gold edge and a soft gold halo on the felt, and on the hub, hover and keyboard focus make the tome titles and the tickets' action line catch the candlelight (see Elevation & Depth).

Round 4 brought back the pocket watch's glass on purpose (owner's item 1), as soft light only, never a drawn glare. The hourglass that took the watch's place (2026-10-08) keeps that rule for its glass (see Hourglass under Components).

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

The creator runs the full width of the screen with 40px side margins on desktop: wordmark, a four-step tab bar spanning the width, then one parchment panel. Inside panels, content splits into two or three equal columns (abilities, drive columns) with 16px to 24px gaps, and collapses to one column on phones. On a tablet the action ratings (step 3) keep the three drives one under another below xl, so each action's row has room for 44px marks: the gild star, the free-raise chips and the steppers are 44px. On every touch screen, a phone's too, each action has the desk's printed "i" (`shared/ActionInfo.jsx`) for what it does, which a mouse reads on hover (iPad pass, 2026-10-05).

The GM desk is a three-column workspace: a left rail of paper-tab navigation and the pinned dispatch, a center work surface, and a right rail with the dice tray, activity log and pass-notes. The chapter hub is a free composition of overlapping objects (tomes, newspaper, pamphlets) on a dark desk.

Spacing follows Tailwind's 4px grid. The working steps are 4, 8, 12, 16 and 24px (gap-2, gap-3, p-3, p-4, px-6 are the most used). Vertical rhythm inside parchment panels is set by sepia hairlines and 28px ruled lines (`paper-ruled`), not by large gaps.

Breakpoints are Tailwind defaults (sm 640, md 768, lg 1024, xl 1280, 2xl 1536). `lg:` carries most of the responsive switching. Phones (390) and tablets (768) stack the desks into one column. The screens in `tailwind.config.js` stay simple min-widths: a screen given as an object (raw) turns off every `max-*` and `min-[...]` variant, and from c0e26d2 until the iPad pass (2026-10-05) that silently undid the phone drawer, the roster book's index tabs, the Lightkeeper's desk on a tablet and the pass-notes pad's form number. A variant that needs a height is a plugin (`framed`, the sketch sheet), and since a plugin's variant sorts before the screens' it never shares a property with an `sm:` to `2xl:` class; the hub's free desk stacks two built-in variants (`lg:landscape:`).

**Desks fit the screen (xl, owner's round 3 item 24).** From 1280px the player and GM desks are one window tall and the page never scrolls. The tall title header steps aside (kept for screen readers) and the member ID strip, or on the GM desk the Lightkeeper's Desk bar, becomes one slim band: on the player desk her seal, the name and campaign, the misprinted registry number, the tabs, and Back to chapter hub behind a printed rule; on the GM desk the campaign's name and code. Three columns fill the width with about 16px edge gutters (player desk 1fr / 3.1fr / 1.3fr): on the left the GM's pinned note, Your Circle and the hourglass at the foot; in the middle the sheet; on the right the felt with its tilted result slip, the log notepad and the pass-notes pad lying over the log's foot. A column whose papers run longer than the window scrolls inside itself, never the page. The sheet lays itself out by its own width (a container query), so the GM's copy follows its column: from 44rem it is a ledger page with the name, the gear tag and the square taped photo side by side, the ability index card across the page as tall as its text, then Nerve, Cunning and Intuition side by side with their actions under them, then the trauma record. At 1440x900 and 1920x1080 (demo Edith) all nine actions and the whole trauma record are in view and the sheet does not scroll; its printed edge line has a strip of its own at the foot, under a hairline, so nothing scrolls beneath it. The Circle tab is not one sheet: from xl its papers (the charter, the assignment report, the stores' ledger card, the history, the relationships) lie on the desk side by side in balanced columns across the sheet's column and the felt's, as the Notebook tab takes the whole desk, and the tab fits the screen; below xl they lie one under the other on the sheet. The GM desk follows the same idea with no panels: a wider left rail of nav slips and the dispatch letter; the investigators' business cards two across (three where there is room, from about 1860 wide), the join requests or the sealed slip under them, each with the quiet Invite player under it (see Invite player under Components), the circle's ruled ledger card running to the foot of the desk, and the hourglass standing in a column of its own beside them all, from the top of the desk, where it stays while the column scrolls (sticky), so its − and + and its countdown are never below the fold however many cards there are and however long the ledger runs (2026-10-08: beside the ledger card alone, the countdown started below the fold once a fourth investigator took the cards to a second row); and on the right the dice tray with the Lightkeeper's controls on its wooden top rail, the log and the notes. The circle page (the same papers as the player's tab, with each investigator's report card), the notebook and the map take the dice rail's width from xl; a sheet opens in the middle column, and the map fills its column at 3:2. Every object stays a distinct physical thing with its own paper, tilt, pin or tape: a desk of scattered papers, never a tidy grid. Tablets keep the stacked layout.

**Tablets (iPad pass, 2026-10-05).** A tablet is a touch screen from md: held upright it has the stacked desk, held sideways (lg) the three columns on a page that scrolls, and a 12.9 inch iPad sideways the desk that fits the screen. Its controls keep 44px where a phone's or a mouse's are smaller: the sheet's action rows and drive squares keep their touch sizes on the ledger page (the ledger page's small rows and squares are for a mouse, `@media (pointer: fine)` in index.css; where a drive is too narrow for its label and nine squares, the squares go under the label), the drive's +d steppers are 44px on the line under the drive's name, the same in all three drives, and the desk tabs, the ability card's tabs, the notebook's folder tabs, the ability chips, the Lightkeeper's dice and tension buttons and the clock's name, Approve and Reject, the bars' Back to chapter hub and Account, Close book and the book's New buttons, the close mark on the back of the Lightkeeper's ticket, the creator's gild star (its hit area clear of the action's name), the notebook's Sketch and Photo, its author filters, Keep drawing, the cross that removes a picture and the handwriting list, Sounds and the sketch sheet's inks are 44px; the Illumination dots and the circle's resource squares keep their size and take a finger over 44px of height (`.touch-pip`). These are `md:[@media(pointer:coarse)]:` utilities, so a phone keeps its own sizes and a mouse its own. Four hold on every touch screen, a phone's too (finish review, 2026-10-05): the pass-notes pad (its picker, its list, the message and Send) is 44px, the clock's name is 16px text, since iPhone and iPad Safari zoom the page onto a field under 16px, the creator's action ratings have the printed "i", and the Lightkeeper's tension − and + are 44px (2026-10-08). `candela-ui-review/2026-10-05-ipad/work/r2/probe/verify3.mjs` measures each of these on WebKit at the ten iPad sizes (drawn size and the area a finger hits) and on an iPhone. The one-column sheet places its photograph by its own width, not the window's: from 33rem the larger photo taped at the top right with the form line, the name, the note and the gear tag in the two thirds beside it, narrower the small photo floated beside the name as on a phone (a tablet held sideways gives the sheet 420 to 505px). Nothing on a desk makes the page wider than the screen (`overflow-x: clip` at the desk's root, and the pass-notes picker shrinks with its pad): a 2px sideways overflow at 1024 wide aborted WebKit on every load. Nothing in the circle papers' columns carries a 3D transform or a running transform animation either, since WebKit draws such a layer in the wrong column: the Lightkeeper's report cards turn flat (see Flips).

**The player desk on phones shows one part at a time (owner's round 4 item 14).** Below md the title header steps aside (kept for screen readers) and the member ID strip becomes a slim band held at the top of the screen as the page scrolls: her seal, the name and the campaign, then a die and the drawer pull (see Navigation). When the desk loses the table, the connection message hangs under the band and moves with it, so a scrolled page never has it over the Menu and the die (on the Lightkeeper's desk and from md it is held at the top of the screen as before). Under it lies one part of the desk: the sheet's tab (Investigator, Circle with the circle's cards under its papers, or Notebook), the felt and the log, the pass-notes pad over the log, the From the Lightkeeper note, or the hourglass, which stands half as large again when it is alone on the screen. The page scrolls within the part on show and starts at its top. From md every part shows as before. The Lightkeeper's desk keeps its strip of four slips held at the top on phones: it is already one tap from any part, so it has no drawer.

**The hub fits a phone (owner's round 3 item 28).** Below lg the chapter hub is exactly one screen tall (100dvh) and never scrolls, from 375x667 up and on a tablet, and so is it on a screen of lg width that is taller than wide, such as a 12.9 inch iPad held upright, which had the wide desk small in its middle with empty desk above and below (iPad pass, 2026-10-05). The free desk needs lg and a screen wider than tall: `lg:landscape:` on the hub's components, `HUB_WIDE` in DeskStyles.jsx and useCastShadows.js. The header is one slim band: the wordmark at the left and the account as a small paper tag at the right.

**The phone hub is the left end of a wide desk (owner's round 4 item 11).** On phones and tablets the screen is a close look at the left end of a desk much wider than it: the wood's edge runs down the left with its lip catching the light, the wood shows at the top and foot, and the leather runs on off the right of the screen with its gilt lines (no right border). The candles keep a strip at the top. The tomes lie side by side at the foot of the room the tickets leave them (the tomes' row is a size container), each as large as its column allows, and the tickets lie in a row under them, as tall as a ticket is (a short phone drops their number line), their actions above the home bar. The Herald is the whole sheet printed small (`.herald-phone`, one sheet with no fold or step), lying under the tomes with its masthead and headline showing above them and the rest running off the right edge. Two papers, each at least as large as the screen's own ticket, lie above the tomes with their feet under the tomes' heads, crooked and overlapping: the torn page on the left, below the candles, one corner under the folded Herald, and the sketchbook leaf on the Herald under its headline and over the page's other corner. A tablet much wider for its height (wider than 19:25) has no room above its tomes and shows none (see Desk papers). No control is covered or cut. Turned over, the Lightkeeper's ticket grows upward over the tomes as tall as its form, so the fields sit above a phone's keyboard. On the GM desk the bar keeps to one row on phones (Back to chapter hub and Account), with Retire on the account card.

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

Corners are tight. Small radius (2px) is the default for panels, wells, chips and tags; medium (4px) for buttons and the step bar. Full rounding is reserved for things that are round in the physical world: action pips, illumination dots, wax seals and dials. Paper objects add their own silhouettes: torn and slightly rotated tabs, corner brackets on the creator panel, double rules (`border-style: double`) on formal frames, dashed borders for empty slots and upload targets. Borders are 1px hairlines in sepia or ink at low alpha; 2px is used for frames and selected cards.

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
- **Notebook fields:** handwriting pen font over ruled lines, with the Markdown marks and Preview over them (see Notes in Markdown).

### Navigation
- **Creator step bar:** four equal tabs in an ink bar with a 1px dark border and 4px corners. Active tab is oxblood with cream text; inactive tabs are ink with dimmed cream text. Labels are numbered ("1. Choose Path"). A new step opens at the top of the page, never where the last one was scrolled to; Advance, Back and Select this Path also move the focus to the new step's title, while a tab keeps it (playtest, 2026-10-10).
- **GM desk tabs:** torn paper strips in cream, each at its own fixed angle (about 1 degree), with a small icon and tracked serif uppercase label, stacked in the left rail. The active slip's label is underlined in pen.
- **Fountain-pen underline** (`.pen-underline` on the label, `.pen-host` on the control): an uneven oxblood stroke that draws itself left to right under a tab on hover or keyboard focus (with the gold focus ring) and stays inked on the active GM slip. Used on the GM slips and the player desk tabs.
- **Notebook tabs:** folder tabs on the book's top edge; active tab is cream paper, inactive tabs are dark brown with gold text.
- **Player desk drawer on phones** (`pc/DeskDrawer.jsx`, owner's round 4 item 14): the band's end carries a die and a brass bail pull with "Menu" beside it, both 44px. The die brings up the felt and the log in one tap and, pressed again, the part that was on show before. The pull slides the desk drawer out from the right edge over the dimmed desk: dark leather with a mahogany lip, Account at its head with the cross that closes it, then a slip for each part (Investigator, Circle, Notebook; a gap; Dice and log, Pass notes, From the Lightkeeper, Hourglass), each a little crooked with its icon, and Back to chapter hub at its foot. Each slip is a strip of the hub's aged paper (`paperArt.js`, drawn once from its own seed): torn off at its right end with pale fibres along the tear, worn along its long edges, yellowed unevenly with a tea-stained rim and a few fox marks, some with a soft crease, a corner turned down or torn off; no rule down its side, and its shadow follows the tear. The part on show is the brighter, cleaner slip (cream, its stain fainter) with its label inked under in the pen. Choosing a slip shows that part and closes the drawer; a tap on the dimmed desk or Escape closes it too. Focus starts on the slip on show, Tab stays inside the drawer (and inside the account card while it is open over it), and focus goes back to the pull. Under reduced motion it does not slide.
- **A Delete that cannot be pressed** (an investigator in a campaign or waiting for one): the same control, faded, its reason ("In a campaign", "Waiting for the Lightkeeper") a tooltip for a mouse and, pressed, a line under the row for 5 s, since a finger never sees a tooltip (iPad pass, 2026-10-05).
- **Roster book on phones** (owner's round 4 item 10): one page at a time, turned by two small index tabs cut from the top of the page block ("Registry" and "Ledger", their full names for screen readers). Only their top 30px stands proud of the page's edge; the open page's tab is the page's own paper and runs on into it, the other is older paper standing behind the page. Each tab's tap area runs on over the blank head of the page, so it is 44px tall. Close book lies on the dark beside them, and the hub's band (wordmark and Account) steps out of sight while the book is open, so nothing shows through.

### Action Pips and Mark Boxes (signature)
The game's numbers are drawn as physical marks. Action pips are 13px circles with a 1.5px sepia ring; filled pips are solid oxblood; gilded pips are candle gold with a sepia ring. Drive points are small squares filled with their drive's tint. Each drive and its actions are a printed section of the form under a double rule in the drive's ink, with a faint wash of it; there is no tray around them. Mark boxes are 20px squares with a 2px ink border and an inset shadow, filling with oxblood; they are inked on the trauma record (Form C.O. 14, owner, 2026-10-04), the dashed cut-out form at the foot of the sheet that holds the marks and the scars, its form number printed on its top edge. On a wide sheet it is two ruled lines in three columns: Marks, then Body, Brain and Bleed with their boxes on one line, then the status rubber-stamped at the end; Scars, then the scars written on the ruled line, then their count. On a narrow sheet and on touch screens the three tracks stand one under the other with 44px boxes, the stamp under them, then the scars. The gear is a manila luggage tag tied to the sheet beside the name (cut at its narrow end, a reinforced eyelet, its string running off over the page), its items drawn large with Change gear on its head, its shadow a drop-shadow on its wrapper. The illumination track is a row of ink dots with gold-ringed milestones every third pip.

### Role Card Deck (signature)
The creator's left column: an official role portrait in a gold-lined card frame with corner ornaments, the role name in serif at top and the role label in gold at the bottom, stacked over two offset card backs, with prev/next controls and a "1 / 10" counter.

### Chapter Hub Tomes (signature, kept by owner)
Two leather-bound books of one size, seen from above (`Tome.jsx`), with an open/close animation into a two-page ruled spread; PRODUCT.md marks them as the model for the app's physical-object feel. Under the front board lie the text block's fore edge and tail, mitred at the corner, and the back board just beyond them, so the pages read as part of the book; the cover's frames start clear of the spine's hinge groove. Spine and cover are one bound object (owner's round 4 item 7): below the cover's corner the spine's leather turns down round the tail of the book to the back board (`.tome-foot`), darker as it turns from the light, its corners rounded as the cover's are; the tail of the text block starts where the spine's cap covers it; the spine's head catches the candles where it turns over the top edge; the hinge groove runs the cover's full height and fades out at both ends.
- **Case Ledger** (register green, edges sprinkled red): its title in embossed gold-leaf Cinzel, and the counts ("In play", "Awaiting approval", "Campaigns you run") as entries on an aged paper label pasted a little crooked on the cover, with dotted leaders and hand-drawn tally marks (pencil while awaiting approval). An empty ledger shows blank ruled lines. It opens into the roster book.
- **Last Played** ("Last Played (Lightkeeper)" for the Lightkeeper, on two lines; plum leather): the campaign's name and its own mark (`CampaignMark.jsx`: the campaign's initials in a gilt roundel, lozenge, shield or octagon with a small ornament, both fixed by a hash of the name). Without a session it lies strapped and locked with a brass padlock.

- **The railway tickets on the wide desk** lie on the Herald at fixed places from 1440 wide: the player's 64px in from its left edge near its foot, the Lightkeeper's 112px in from its right edge near its head. Between 1024 and 1440 the Herald is narrower (550px up to 1196 wide) and the two move apart in step with its width: the player's to 12px past the Herald's left edge, clear of the Last Played tome, and the Lightkeeper's to 64px in from its right edge, still on the screen at 1024, so 36px always lies between them; they overlapped by up to 105px there before (iPad pass, 2026-10-05).

### Invite player
Inviting a player back into the campaign (`gm/desk/InvitePlayer.jsx`; they rejoin with a new investigator without waiting for approval) is wanted once in a blue moon, so it lies where people come into the campaign, never in the table's column: a small moonlit text button, "Invite player", under the join requests (centred, as they are) or, once the circle is finalized, under the sealed slip (owner, 2026-10-09: "too front and center for something typically done once in a blue moon"). It is the label style in moonlight steel with a dotted underline and a small chevron, 44px tall on a touch screen. Pressed, it lays the invite slip under itself: parchment, a little crooked, one sepia italic line saying what the invite does, the username in mono on a ledger line (16px on a touch screen, so Safari does not zoom) and the oxblood Send invite; what went wrong in oxblood under them, or "Invite sent to" the name in seal green. Escape in the field puts the slip away and gives focus back to the button. On phones and tablets it comes at the foot of the roster with the requests, so the table's part of the desk is unchanged.

### Account card
"Account" opens a member's card (`AccountMenu.jsx`), the same paper on every desk: parchment with a double sepia rule, a little crooked, "Chapter member" in the form line's capitals and the account's serial in red, the name in the serif and the email in mono. Under a dashed sepia rule an oxblood outlined "Account" link opens the account page (a real link, so it can open in a new tab); Sign out lies at its foot, under another dashed rule, as a quiet ink button. The card itself changes nothing: linking Google and every other change moved to the account page (owner's request, 2026-10-04). Only the button that opens it takes the colours of where it sits: on the hub a small paper tag lying crooked at the desk's edge, on the player desk's band a printed button, on the GM bar a moonlit one. The GM bar lays Retire on the card on phones, between Account and Sign out.

### Account page (Form C.O. 8)
The account page (`/account`, `AccountPage.jsx`) is one sheet of the card's paper, Form C.O. 8 · Chapter member with the member's serial in its corners (printed above the first line on a phone), turned a fraction of a degree, under the night header with the creator's way back at its right (Back to chapter hub, Back to your desk or Back to the Lightkeeper's Desk). It holds four ruled lines, divided by dashed sepia rules: Username in bold serif, Email in mono, Password as dots or "Not set" in sepia italic, Google sign-in as the Google address in mono or "Not linked". Each line's change is an ink outlined button at its end; it opens the change under the line, one at a time, as ledger fields (the label in small oxblood capitals, the rule under the value), then the proof (Current password, or "Confirm with Google" with Google's own button), the form's one oxblood button and quiet sepia text buttons (Use Google instead, Cancel). A saved change leaves a seal-green line with a pen tick. A change of address that waits for its link shows in a dashed oxblood box with a red "Link sent" rubber stamp; its quiet Resend link and Cancel change open their proof inside the box, like any other change, with the oxblood button named for the change and a quiet Cancel or Back. A refusal about the typed value sits under its field; any other refusal sits under the form, in oxblood. While password sign-in is off, the Google line explains in sepia why Google sign-in cannot be removed.

The two links mailed about a change of address open a narrower sheet of the same form, alone on the night stage: Candela Obscura over a double sepia rule, the page's name in oxblood display capitals, then full-width buttons. "New Email Address" (`/confirm-email`) reads the link first and shows the account's name, the new address in mono and the address now, then Confirm new email in oxblood and Cancel change in ink; it never uses the link before that click. Done, it takes a green "Confirmed" stamp. "Undo Email Change" (`/undo-email-change`, no sign-in needed) asks once, with Undo the change and Leave it as it is; done, a green "Undone" stamp, the account's name and the address it has again, and in sepia how the account is signed in to now (a reset link on its way, the Google sign-in it kept, masked, or that it kept Google because password sign-in is off).

### Photo mount and the dossier's photo
An empty portrait is an album photo mount (`PhotoMount.jsx`): four black paper corners and a faint printed sitter, drawn in CSS and SVG, with a visible "Add portrait" under it; with a photo, "Change portrait" and Remove. On the player's own desk the taped photo on the dossier is the button: "Add portrait" on the empty mount, a "Change portrait" caption on hover or focus (always shown on touch), and after a change "Portrait changed." with an Undo countdown under the photo on the ledger page and under the name on a phone. The GM's copy only shows it.

### Forgotten and new password
The admission slip (Form C.O. 0) has two more states, on the same paper, tape and tilt. "Forgotten Password": Email and Send reset link, then the owner's text word for word with a red "Link sent" rubber stamp, and Google's button under "or sign in with Google". "Set a New Password" (`/reset-password?token=...`): New password with "At least 8 characters." under it and Confirm password; a used, expired or missing link says so and offers "Ask for a new link". Success returns to the sign-in slip with the username filled in and a green "Password set" stamp.

### Chapter Hub Candles (signature)
Three pillar candles drawn in SVG (`CandleCluster.jsx`) in her tight cluster at the left of the hub, just above the Case Ledger, seen from above as the desk is (owner's round 3 item 25): round wax tops with uneven rims glowing where they are thin, melted pools, drips over the lip, small bright flames with a soft halo, and long soft shadows that each lit flame throws of the other candles, stretching and shortening with the room's flicker. The light falls on the desk as a lit pool (The Lit Pool Rule). One candle burns for the chapter and one more for each investigator in play or campaign the person runs, up to three; an unlit candle shows its wick and a thread of smoke, and the pool dims with fewer flames. Everything holds still under `prefers-reduced-motion`. Phones and tablets give the candles a strip of desk above the tomes.

**The candles stand by the tomes, not by the window** (owner's bug, 2026-10-04: "the candles are shifting down over the books at certain resolutions"). The candles used to be pinned to the top left of the desk while the tomes lay in the middle of the desk's height, both sized by the window's width, so a window short for its width (the browser's own bars at 1920x937, a laptop at 1536x730, a 2560x1440 screen at 150% scaling) brought the Case Ledger up under the candles. From lg the tomes' half of the desk (`.hub-left` in CampaignSelector.jsx) is a column as tall as the desk: the candles' strip (`.hub-candles`), the tomes, and an empty strip that shares the leftover height with it. The tomes lie in the middle of the desk's height as before unless that leaves the candles less than their strip, when they lie just under it; the cluster stands on the strip's foot with its own foot a tenth of a tome and 12px above the Case Ledger's head (enough for the tome's tilt and its lift on hover) and its left at the Case Ledger's left, except on a desk so narrow that the tomes run off its left edge (about 1024 to 1180px wide), where the candles stop with their wax on the leather (`--candle-nudge`), so it never touches a tome, a ticket or the Herald's titles at any window size. The light pool and the shade share the cluster's box, and the wood's warmth and sheen (`--lx`, `--ly`) are measured from the flames (`useCastShadows.js`), so the light follows the candles wherever the tomes put them. The check is `candela-ui-review/2026-10-04-candles-fix/work/candle-check.mjs`, which measures the cluster against every tome, ticket and Herald title at sixteen window sizes, with the Case Ledger at rest and hovered.

### Hourglass (the tension clock, 2026-10-08)
One hourglass (`TensionClock` in `SceneManager.jsx`, drawn by `Hourglass` in `shared/Hourglass.jsx`) stands at the foot of the player desk's left rail and in a column of its own beside the investigators' cards and the circle's ledger card on the GM desk (see Layout), in the round 4 pocket watch's place, which it took at the owner's request: 144 by 188px with the glass 120px wide in it, larger on the GM desk from 2xl and half as large again alone on a phone, where it is laid out at most two thirds as wide as the page so that a long clock name wraps inside the screen. It is drawn in code.
- **The frame**: two turned wooden ends (mahogany lit to sepia on the left, the top face catching the lamp, faint grain), each ringed in brass with a brass seat for the glass, and two brass spindles with a bead near each end and one at the waist, shaded as small brass cylinders lit from the left. Its shadow falls down and right.
- **The glass**: two bulbs meeting at a narrow neck, a faint sheen inside, its edge lit most at the upper left. The light on it is soft only: the lamp's window as a feathered streak down the left of each bulb that fades out at both ends, one small soft specular point, and a faint warm glow low on the right. Nothing reads as a drawn white arc.
- **The sand**: oxblood, lit along its top, darker away from the lamp and faintly grained. Its light and its lit grains are cream laid on in soft light, which lifts the red in its own hue; lamp-lit oxblood stays text only. At tension 0 it all lies in the upper bulb, a shallow dish over the neck; each step runs a quarter of it into a pile in the lower bulb (the levels split the drawn sand into four equal areas), and at 4 the upper bulb is empty and the lower full. While sand is left above, a thin still stream falls from the neck. A change moves the sand by transform over 450ms, at once under reduced motion; nothing moves while the tension stands still. While the timer is on show and part way through (running or paused), the sand shows the time instead (the owner's request of 2026-10-09): the share of the duration that has run lies below, moving on each second over a 1s linear transform, and screen readers hear the time left after the tension. Once it runs out, or is reset or cleared, the sand goes back to the tension.
- **The Lightkeeper's hourglass**: the − and + (moonlit slate, 44px on touch screens) stand either side of the glass at its waist, so nothing covers the sand, with the clock's name under it. Screen readers hear the tension ("Tension 2 of 4") on both desks.
- **The timer** (`shared/TensionTimer.jsx`, the owner's request of 2026-10-08): a countdown the Lightkeeper may stand beside the hourglass, under the clock's name. A switch on the Lightkeeper's desk ("Timer", moonlit like the − and +) chooses just the hourglass or the hourglass and its timer, for every desk at once, the Lightkeeper's included; a hidden timer keeps running. The time is printed on a small parchment ticket with a perforated stub, lying a little crooked, in mono tabular numerals (m:ss, h:mm:ss from an hour): ink while it runs, sepia while it stands at its duration, sepia after a pause mark while it stands part way, and at 0:00, where it stops, oxblood with an oxblood edge. On the Lightkeeper's ticket the minutes and seconds are ledger fields while the timer stands at its duration (1 second to 3 hours; 0:00 clears it), and under the ticket stand three moonlit round buttons with ink marks: start (resume after a pause, pause while it runs), reset to the duration, and clear; 44px on touch screens, each named for screen readers. The server keeps the end and sends the time left with every circle update, and each desk counts down from that and the moment it arrived (noted as it lands, by code the page loads first, so a desk whose own code loads late still counts from the update), never by its own clock, so every desk shows the same second; a desk wakes once a second while the timer runs and not at all while it stands. A desk reopened from what it saved shows no timer until the server's update comes, since the saved one may have run on. At 0:00 every desk that counted it down chimes once, under the table's sound switch: a small brass bell struck twice, drawn with Web Audio, as loud as the Full Success chord; a desk that only wakes later (a tab in the background) stays quiet. The desk counts it down, not the ticket (`shared/TimerBell.jsx`, mounted once at each desk's root), so the chime comes on whatever page is open: the Lightkeeper's circle page, notebook, map or a member's sheet, a player's notebook, any page of the phone's drawer. A screen reader hears it start, pause and run out, nothing between, from one region on the page itself, on any of those pages too. In the minutes and seconds, Enter sends them and Escape puts them back without leaving the field (Enter on a touch screen puts the keyboard away); after a reset focus moves on to start, after a clear to the minutes (on a touch screen it stays put, so no keyboard rises).

### Table strip and "new" dots (2026-10-10, playtest)
- **Table strip** (`shared/TableStrip.jsx`): one slim parchment band with the tension (hourglass mark, n/4), the running timer in mono (oxblood at 0:00, "(paused)" when paused) and the newest Activity Log line, italic and cut off with an ellipsis. It draws nothing when the tension is 0, no timer shows and there is no log line. It sits where the hourglass itself is out of sight: under a phone's band (held with it, except on the Hourglass page), at the top of a tablet's page and over the Notebook at every size, and on the Lightkeeper's desk in the left column whenever the roster is not showing (an open sheet, the Circle, the Notebook or the Map). From xl the player's rail shows the hourglass, so the strip steps aside there except over the Notebook. It is not a live region: a ticking timer would be read out every second.
- **"New" dots** (`NewDot`): a 10 px oxblood dot with a cream rim and "(new)" for screen readers, on the Menu button, on the drawer rows (From the Lightkeeper, Hourglass, Circle) and on the md+ Circle tab. The store keeps `unseen` for a new dispatch, a moved tension or timer and reports opening; a part's dot goes when that part is in front of the player (from md the dispatch and hourglass stand on the desk, so theirs clear at once). Nothing is marked when the desk first loads a circle.
- **Rail and log at laptop heights**: the player's left rail scrolls as a whole from xl, Your Circle keeps a floor of 7.5 rem, the log keeps 9 rem, and the dice column scrolls inside itself, so the timer and Pass Notes are always reachable. On a tablet the rail follows the dice in the page, so reading order matches what is drawn.
- **Gilded choice**: under "Keep one die" the slip lists what each die would do ("Keep the gilded 4: Mixed success, 1 Nerve back" / "Keep the 4: Mixed success"), the dice and the phone bar's buttons carry the same words, and after a gilded keep the slip says "1 Nerve back".
- **Circle resources**: a player spends with one button per resource that asks first ("Press again: spend 1 Refresh") and lapses after four seconds; the pips are display only for players, the reason spending is blocked is printed above the buttons, and the counter reads "Your spends n / 2". The Lightkeeper keeps the pips and, on a member's sheet, "Give a spend back".

### Desk papers (owner's round 4 items 2, 4 and 5)
The loose papers on the hub (`CryptidSketches.jsx`) and the Herald are aged, used paper, never a clean frame or a border. `paperArt.js` draws each sheet once from its own seed as three SVG images stretched over it: a mask that cuts its edges (deckled, torn with pale fibres, machine cut, worn, or a photograph's scalloped deckle; worn, dog-eared or torn-off corners; worm holes), a stain multiplied over it (uneven yellowing, a darker tea-stained rim that follows the cut, foxing) and a light layer (soft creases with a lit and a shaded side, a curled corner, worn gilt, the folded-over flap of a dog-ear). The art on the sheet stays whole and is never painted over; the field sketches keep their old sepia treatment.
- **Field sketches** (round 3, the three official sketches): each now at its own art's shape, on its own paper: a deckled sheet with a dog-eared corner and a fold, a print torn along one side with a vertical crease and a curling corner, a sheet torn along its foot and creased.
- **The owner's cryptids**, each a different object: a page torn out of a book (the sea monster, ragged where it left the binding, the other side's text showing through), a bestiary leaf (lions and panthers, vellum with a worn gilt edge, cockled, worm holes through it), a hand-coloured print pinned down with a brass tack (the sea monk; the paper puckers round the tack and a corner curls), a sepia photograph of the woodcut (the blemmye, a white deckle-cut border, three black album corners still on it), a picture postcard (the sea swine, a corner bent over showing the stamp and postmark on its back), and a leaf from an anatomist's sketchbook (the red-chalk creature, torn along the binding with the stitch holes still in it, a corner curling up; its file has the paper lifted to white so the chalk keeps its red on the leaf's own tone, `.aged-chalk-img`). The leaf lies on every screen that shows papers: from lg above the Case Ledger's head, right of the candles; on phones and tablets on the folded Herald. The postcard is old card like the sheets beside it, never clean new stock: yellowed unevenly, its rim tea-stained, foxed, its corners worn round, a soft bend across it and the print sunk into the card's tone.
- **No paper is smaller than a railway ticket** (owner, 2026-10-05: "the sketches probably shouldn't be smaller than the train tickets"). On every screen each paper is at least as large as the ticket on that screen, in area and in its shorter side, and the three larger prints (the bestiary page, the sea monster, the sea monk) are about a quarter larger: from lg, where the ticket is 230 x 330, the field sketches, the photograph, the postcard and the leaf run 240 to 362px wide and the larger prints about 95,000 square pixels; on phones and tablets they are sized by the screen's own ticket. Larger papers take more of the desk, so a smaller screen shows fewer of them rather than smaller ones: all nine on a desk at least 1880 x 1000, eight at 1920 x 937, six from 1500px (as 1680 x 940, and the owner's screen at 150%, 1707 x 847), five on a laptop and at 1024, and two on phones and tablets. The sea monk's file is only 236 x 378, so at its new size it is drawn a little larger than the file.
- **Dropped, not hung** (owner, 2026-10-05: "the photos could stand to be a bit more scattered, they shouldn't all be facing the viewer, and some should be under the newspaper, each other, etc."). The papers lie as if dropped on an investigator's desk, never in tidy rows facing the viewer. Each has its own angle: most crooked by 5 to 25 degrees, and from lg one or two turned well over (the sea monster on its side above the tomes, the bestiary leaf on its side under the Herald's foot, the lamia print upside down below 1500px). They lie in a pile: papers overlap each other, several tuck under the tomes' heads and feet and under the Herald's edges, and a few run off the leather or off the screen. A paper's shadow still falls away from the candles however far it is turned, because `useCastShadows.js` measures it in the paper's own turned frame.
- **A different drop each visit** (the user's request, 2026-10-08: "can we make the position of the pictures on the hub randomized"). As the hub mounts, each paper lands a little off its spot and angle, and the pile is shuffled among the papers of each layer (the tomes' row, where the lamia and the sea monk stay at the foot as they lay, since either raised over another paper costs the hub a compositing layer more; the Herald's group under the Herald, and on it); nothing moves while you stay, and a reload draws again. Each paper has its own ranges on each kind of screen (--dx0 to --dr1 in DeskStyles.jsx, The drop), most 12 to 24px either way and 5 or 6 degrees, some one way only where a rule is close (the sketchbook leaf, just below the header, only goes down; on a desk that scrolls and 1700px or more wide the sea monster lies 12 to 18px below its spot, which beyond about 1820px reached up to 10px under the header; the row under the tomes' feet goes up more than down, so it stays tucked; on phones and tablets the torn page only moves the way that shows more of it; on tablets the sketchbook leaf, just under the line beneath the Herald's headline, never goes up or right and only turns back), measured so that every rule under Where they lie holds at their ends at 70 screen sizes and no drop costs a compositing layer (the lamia below 1500px and the sea monk go only some ways for that). Sizes never change. The notebook's sketches take this visit's choice of papers among those the screen shows (any but the sketchbook leaf, the photograph and the postcard), so a different print gives way each time and the first sketch always shows.
- **Where they lie** (owner's round 4 item 16, loosened 2026-10-05): from lg at least about a third of every paper shows, enough to know the picture (on phones and tablets at least 30%); not every paper shows its whole picture. None lies over the candles, a tome's title, any part of a ticket, or the Herald's masthead and headline, and none runs under the header with the account menu; lying under the Herald or a tome is fine. Each paper's width, place, angle and layer in the pile are custom properties (--w, --x, --y, --r, --z in DeskStyles.jsx), and the drop moves it from there. The papers in the tomes' row (`.hub-tomes > .sketch`) are placed by the tomes themselves (--T a tome's width, --G the gap and --strip the candles' strip, set on `.hub-main`; --x0 where the Case Ledger starts, on `.hub-left`) and lie under the tomes (z-index 20) and over the Herald; those of the Herald's group (`.hub-right > .sketch`) are placed in the Herald's own pixels and lie under the Herald (z-index 5, the Herald is 10) or on it (20), always under the tickets. The pile from lg: above the tomes, right of the candles, the sketchbook leaf (12 degrees), and from 1500px the sea monster on its side (82 degrees) under the leaf, the Herald's top corner and the Last Played tome, as high as the header allows (by the window's height on a desk that fits the window, by the tomes' own measures on one that scrolls); left of the Case Ledger from 1880px, the sea monk (-21 degrees) under the tome and running off the leather; under the tomes' feet the photograph (7 degrees) over the lamia print (-24 degrees, upside down below 1500px), on a desk at least 1880 x 1000 the griffin sheet (-6 degrees) between the lamia and the figures sheet (24 degrees), which lies over the Herald's corner and under the New Character ticket, the lamia under the rest, which change places each visit; on the Herald under the Lightkeeper's ticket, the postcard (13 degrees); from 1880px the bestiary leaf on its side under the Herald's foot, running off the leather and the screen, or on a desk under 1000px tall, where the Herald's foot is off the screen, on the Herald by its right edge. The row under the tomes needs about 150px below them: a desk tall enough has it, a desk short enough that it scrolls already (up to 899px tall) grows by that much, and a desk between (900 to 999px tall) never starts to scroll for it and lets the row run off the screen's foot with about half of each paper showing. Phones and tablets: see Layout. Decorative and hidden from screen readers; every image loads lazily, so a screen never fetches the papers it leaves out. `candela-ui-review/2026-10-05-hub-sketch-size/work/hub-check.mjs` checks at 25 screen sizes each paper's size, how much of it shows (sampled over the turned sheet itself), what it is clear of, and that its shadow points away from the candles; it also reports each paper's angle and what lies over it.
- **The Herald**: machine-cut newsprint worn a little uneven, darker toward its edges all round, with a few fox marks and its own shadow under it. No border and no lit rim along its foot (the old 2px border showed as a pale line). On phones and tablets it is the same whole sheet printed small, lying under the tomes and running off the right edge (the folded strip at the desk's foot is gone), one sheet with no step across it.

### Physical touches
Small, meaningful responses drawn in CSS or SVG; each one stops or shows at once under `prefers-reduced-motion`.
- **Wax seal** (`WaxSeal.jsx`, `.wax-seal-*` in index.css): her original seal from the first MainDeskView (owner's round 3 item 16): a round seal in her three reds, darkest at the lower right, with a soft light at its upper edge, a dashed ring pressed into it and the candle-holder mark pressed into the middle in a darker red, turned 12 degrees, with her heavy cast shadow. Its measures are shares of its width (container units), so it keeps her proportions at 32px on the Finalize slip and at 128px on the player's member ID strip; the mark's light edge never drops under a pixel. It sits on the member ID strip and the Finalize slip. Pressing Approve on a join request, or confirming Finalize, presses a large seal onto the request or slip while it goes to the server (an approved request then fades off the desk), and a finalized circle shows a sealed slip ("The circle is finalized") below the investigators.
- **Ink stamp on roll outcomes**: the outcome word on the result slip is a rubber stamp, a little crooked (fixed per roll), its ink worn by pinholes (a mask), pressed down once when the result lands.
- **Pinned notes**: private notes carry an oxblood push pin and a drop-shadow that follows their torn top edge.
- **Page turn**: changing spreads in the notebook turns a blank leaf over from the spine (forward or back), over pages that are already there, with the paper sound. Every entry spread has an oxblood satin ribbon lettered "Contents" in gold leaf that turns back to the contents, and its outer bottom corners are turned up with an arrow (back on the left, on on the right); the left and right arrow keys turn too, unless a field, a widget or a dialog has the key. The contents page holds as many one-line entries (title, dotted leader, page number) as fit it, and pages with small engraved arrows in its bottom corners; the book keeps one size.
- **Flips**: the Lightkeeper's railway ticket turns over to the new campaign form (her original pamphlet flip), the creator's role cards turn, and the Your Circle cards and the report cards turn over to their backs, each with the paper sound; under reduced motion the faces swap in place without turning. The ticket and the cards turn flat (`shared/useFlatTurn.js`): the card narrows to its edge, shows its other face and widens again, drawn by script frame by frame (the ticket in 0.65s, fast onto its edge and slow to lie flat, its shadow narrowing with it and the card on a layer of its own only while it turns; a Your Circle card in 0.5s, a report card in 0.4s), and at rest only the face that is up is drawn, with no 3D transform. In 3D, WebKit (Safari) drew a report card at rest in the first of the circle papers' columns over its papers and blanked the second column during a turn, and showed the Your Circle cards' and the ticket's backs mirrored over their fronts at rest (iPad pass, 2026-10-05). No card on a desk or the hub turns in 3D.
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
  | C.O. 8 | Chapter member (the account page, and the New Email Address and Undo Email Change sheets; the account card prints "Chapter member" without the number) |
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
- **Phone roll bar** (owner's round 4 item 15): below xl, while the felt is out of view (on a phone, and on a tablet held sideways, where the felt lies at the top of the right column and the actions a screen further down; iPad pass, 2026-10-05), the latest roll comes up as a strip of felt at the foot of the screen: the roller's ink, the action and what was thrown in the slip's words, the outcome, the dice. It is only on the player's own desk, so every roll on it is hers: her name shows only while the dice are out, and the action line runs on to a second line rather than being cut short (five or six dice lie in two rows of three to leave it room). It goes by itself: about 4 s after the dice land, about 8 s when the roll offers a resistance reroll or an ability, after a gilded die is kept, or when the roll did not go through, and never while a gilded die waits to be kept (its two candidates are on the bar and it has no cross). Then it fades out (at once under reduced motion). A finger on it, or keyboard focus in it, holds it, and the wait starts again when it lifts. Its cross closes it at once; tapping the rest of it opens the whole tray as a sheet, and closing the sheet closes the bar. A result already seen on the felt does not come up afterwards. The roll stays in the activity log.
- **What an action does** (owner's round 4 item 9): a mouse shows it on hover (the row's title). On a touch screen (pointer: coarse, any width) each action row, the player's and the Lightkeeper's copy alike and the creator's action ratings, ends in a small printed "i" in a ring, its own 44px target that never rolls ("About Move" for screen readers). It lays the same words on a slip of paper under the row, a little crooked, clear of the column of "i"s; one slip at a time, closed by a tap outside it, Escape (focus goes back to its "i") or the "i" again. The row stays on one line and nothing explains the mark.

### Ability card (owner's round 4 item 13)
The index card under the name has three tabs (Role ability, Specialty ability, Catalyst) in one label style, and its three panes share one type treatment: the printed heading in the label style in oxblood ("Face ability", "Catalyst and question"), then each entry as its name in bold capitals of the serif with a colon and its text in the serif. The catalyst and the question are entries like the abilities; the player typed them, so they print, never in a pen font. The Lightkeeper's copy is the same card.

### Notes in Markdown (owner's round 4 item 20)
Field entries (and the captions under sketches and photographs), pinned private notes and the Lightkeeper's notes are written in Markdown and read as ink on paper in the writer's own pen, size and ink (`NoteMarkdown.jsx`, `.md-note` in index.css). Headings are the same pen written larger and pressed harder, from h4 down (the entry's own title is the h3). Bold, italic and strike are the pen's; lists take ink bullets; a task list's boxes are drawn in ink, with a pen tick when done, never a glyph; a quote stands on a 1px hairline of the note's own ink; code is the data mono on a faint wash; a table sits on sepia rules; a rule is a short pen stroke, a little off level. A single line break stays a line break and a blank line keeps the height of one written line (1lh), so a note written before Markdown reads exactly as it did. Links keep the writer's ink, underlined, and open in a new tab. A link within the page (#...) is plain text, and so is a footnote's mark: the footnotes stay at the note's foot, without links between mark and note, since notes on one page number their footnotes alike. Nothing in a note runs or loads: HTML shows as the text it is, a javascript:, vbscript: or data: link prints as plain text, and a picture is replaced by its alt text.
- **Pass notes** are one line, so in the log they take inline marks only (bold, italic, strike, code, links); "- ", "# ", "> " and "1. " stay as typed. The log is italic, so emphasis there stands upright.
- **Writing** stays a plain textarea under its plain label. Over it lies a small row of marks (`MarkdownMarks.jsx`): B, I and H set in the serif, a list, a quote and a link drawn in ink, sepia until a pointer or the keyboard reaches them; and a Preview toggle that shows the note in the textarea's place, ink-filled while pressed (the marks rest meanwhile). Ctrl or Cmd with B, I or K does the same as bold, italic and link. Nothing explains the marks. The marks are 44px on a touch screen; on a phone the label and Preview share a line and the marks take the next.

### Sketch sheet (owner's round 4 item 19)
Sketch opens a sheet of her cream paper over the dimmed desk (`sketch/SketchSheet.jsx`): at most 1120 by 820 on a desk, the whole screen on a phone, where a finger draws. A phone held sideways is wide but short, so it gets the whole screen too, with no foot: the sheet lies on the desk only on a screen at least 640 wide and over 500 tall (`framed` in tailwind.config.js). Excalidraw is its canvas and nothing more: none of Excalidraw's toolbars, menus, library, help, hints, colours or branding show, a key for one of its other tools falls back to the sheet's, its view, grid and zen modes stay off, pasted or dropped pictures are refused and a pasted video link stays text. Its canvas is clear, so the sheet's paper, with a faint printed plate a finger's width inside its edge, is the ground; a selection is drawn in oxblood.
- **The head:** Cancel, then Undo and Redo, then the save in oxblood: "Add to entry" for a new sketch, "Save sketch" for one taken up again. Its labels never wrap, and it fits one row on a 360 phone.
- **The sheet's marks,** in the notebook's ink under the head: pen, line, arrow, box, ellipse, text, eraser and select, drawn in one stroke, the tool in use inked in; her inks as ink blots, the writer's own pen first and the stroke the sheet starts with (black for the Lightkeeper), then black and the players' five inks; a fine and a broad nib. On a touch screen the marks are 44 tall, and 44 wide from 400 across (40 below, so the eight tools keep one row on a 360 phone).
- **The foot:** "Upload a picture", the old way in (a PNG, staged as before), what went wrong, and the form line (Field register · Field sketch · Form C.O. 5). A phone shows it only when it holds the upload or a message.
- **Keeping it:** a new drawing waits beside the entry like a chosen picture, as a transparent PNG, with "Keep drawing" to reopen it, and goes up with the entry. A drawn sketch of the reader's own shows "Keep drawing" under its picture on the page, and nowhere else: the server keeps the drawing for its author alone, and everyone else sees the picture. The drawing is kept with its strokes' points to a tenth of a pixel; one still over the server's 1 MB is too large to keep for more drawing, and the foot offers its picture alone ("Add picture only", "Save picture only"), which keeps no "Keep drawing".
- **Leaving:** once something is drawn, Cancel asks a second press ("Discard") and Escape does nothing; an empty or unchanged sheet closes at once with either.
- Excalidraw, its stylesheet and its fonts load only when a sheet opens (the desk looks the same afterwards), and the fonts come from this site, never a CDN. Its MIT notice is excalidraw/LICENSE.txt on the site. A sheet that cannot load its drawing code (after the site is updated, the code an open page knows of is gone) asks for a reload in words and never reloads by itself, and the next Sketch tries again.

### Pictures in the notebook (owner, 2026-10-05)
A sketch or a photograph entry is never shrunk off to the side: the picture lies across the whole page inside its margins, at its own shape, and the entry's title, caption and hand begin below it (`SketchPicture` and `PhotoPicture` in `NotebookView.jsx`). A tall picture is scaled down to about two thirds of the page's height and stays centred, as wide as that allows: from lg the page is a size container and the cap is 66% of it; below lg, where the page is as long as it needs, it is 66% of the screen's height. A sketch is ink multiplied into the paper and a photograph a print with a white border under a strip of masking tape, each a little crooked (0.4 to 1.2 degrees, fixed per entry, the tilt on the sketch's picture itself so its blend still reaches the paper). "Keep drawing" sits under the author's own drawn sketch, at its right. The pages and their paging are unchanged: three entries to a page, and a page longer than the book scrolls inside itself.

### Sounds
`game/rollSounds.js` plays five files from `public/sounds`, all under one switch: a loudspeaker in the corner of the felt ("Sounds") turns them off or on for that browser (`localStorage`, default on); a browser that has not had a click yet stays silent.
- **Results**: `full-success.mp3` (a vibraphone chord) when a roll's final result is a Full Success (a counting 6 that is not a Critical) and `failure.mp3` when the counting result is exactly 1; nothing for Mixed, Critical, or a Failure of 2 or 3. Both come from Pixabay's free library (no attribution required). The cue is the roll's line in the activity log, which reaches every desk at the table once, when the result is final; a secret roll writes no line, and a reconnect replays nothing.
- **Dice** (`dice-roll.mp3`, owner's round 3 item 19), for everyone at the table as the dice start to tumble on the roller's desk (the roll lands, or a gilded die is kept): the roller's desk with its own tumble, every other desk when the server's `dice_thrown` arrives. A server without it leaves them the roll's log line, and they hear the dice then. The result sound waits until the dice have landed (560ms), so the two never sound at once.
- **The hourglass** (`tension-tick.mp3`, item 20): when the GM raises the tension every desk hears a tick for each step now run (the file's four ticks, cut short in the quiet after the last one needed), and a lowering, End Assignment's reset included, ticks once (owner, 2026-10-08). The first circle after a desk opens or reconnects only sets the baseline, so a change made while away never ticks.
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
- **Don't** make a paper on the hub smaller than a railway ticket on the same screen; where there is no room, leave a paper out (Desk papers).
- **Don't** line the hub's papers up in tidy upright rows; each lies at its own angle in a pile, some under the Herald, the tomes or each other, dropped a little differently each visit (Desk papers).
- **Don't** draw light on glass or brass as a stroked line or arc; a highlight is a feathered gradient that fades out at its ends (Hourglass).
- **Don't** write "GM" where a person can see or hear it; it is "Lightkeeper" (The Lightkeeper Rule).
- **Don't** use a text glyph that a phone turns into an emoji (▶, ✓, ✝, ⚠ and the like) as a mark; draw it in ink (The Ink Marks Rule).
- **Don't** draw the phone hub as a whole framed desk; it is the left end of a wide desk, the leather running off the right (Layout).
- **Don't** let the desk wood go bright or show its grain in hard stripes; it lies in shadow and warms only near the candles (Material literals).
- **Don't** let a note run HTML, follow a javascript: or data: link, or load a picture; a note is ink on paper (Notes in Markdown).
- **Don't** show any of Excalidraw's own interface or colours on the sketch sheet, or load it with the desk; it is the sheet's canvas, fetched when a sheet opens (Sketch sheet).
