---
name: Candela Obscura VTT
description: A real-time virtual tabletop for one Candela Obscura group, dressed as the papers, tomes and dice on a Lightkeeper's desk.
colors:
  oxblood: "#721c15"
  candle-gold: "#d4af37"
  gold-leaf: "#c49d47"
  register-green: "#0b1f12"
  seal-green: "#047857"
  gm-night: "#0c1c32"
  gm-slate: "#1e3a5f"
  moonlight-steel: "#8aa4c8"
  night: "#120b0a"
  ink: "#1a1311"
  sepia: "#5a3a28"
  parchment: "#f0e2c0"
  parchment-deep: "#e4cfa0"
  cream: "#fdfaf4"
  role-face: "#9a8235"
  role-muscle: "#7a4822"
  role-scholar: "#1e4f72"
  role-slink: "#2a4d25"
  role-weird: "#4a2870"
typography:
  display:
    fontFamily: "Crimson Text, serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Crimson Text, serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "0.025em"
  title:
    fontFamily: "Crimson Text, serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Crimson Text, serif"
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
    fontSize: "0.625rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.1em"
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

<!-- Scan-mode record of the incumbent system, 2026-10-04. Source of truth: frontend/tailwind.config.js, frontend/src/index.css, inline styles in frontend/src/components, and the before-tour screenshots in /home/gater/projects/candela-ui-review/2026-10-04-before. The Overview language and color character names are a draft pending owner confirmation. -->

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

A candlelit palette: near-black warm brown for the room, aged paper for the objects, oxblood ink for action, gold for anything gilded.

### Primary
- **Sealing-Wax Oxblood**: the one action color. The creator's active step tab and Advance button, section headings on parchment, filled mark boxes and action pips, the selected drive button, focus borders on ledger inputs, the custom scrollbar thumb. By far the most used color in the build (171 literal uses).

### Secondary
- **Candle Gold**: gilded dice and gilded action pips, selected ability rings in the creator, chip tags, the dice tray accents, the brass button. Meaning: special, gilded, chosen.
- **Gold Leaf**: the hub's tome lettering and borders (Cinzel and Playfair titles stamped on leather). A duller, browner gold that only the chapter hub uses.

### Tertiary
- **Register Green**: the leather of the first hub tome (Active Register). This is where the README's "emerald green" lands in the build.
- **Seal Green**: confirmation and success state only ("Saved", "Report filed", "Confirmed", "3/3 placed"). Tailwind emerald-700.

### Neutral
- **Night** ("Candle-Out Black"): the page background behind every screen (body, creator stage).
- **Ink** ("Iron-Gall Ink"): body text on parchment, hard borders, inactive step tabs, dark wells.
- **Sepia**: hairlines, input underlines and pip borders on parchment, used through alpha (rgba(90,58,40,0.12 to 0.4)) far more than solid.
- **Parchment**: the creator's ledger panel and the base of all paper surfaces.
- **Deep Parchment**: inset wells and upload targets on parchment, usually at 30% to 55% alpha.
- **Cream**: text and button labels on dark surfaces; the brightest paper (notebook pages, GM circle sheet).

### Game-semantic colors
- **Role colors** (Face, Muscle, Scholar, Slink, Weird): tint the role card deck, its frame lines and the ability selection state in the creator. Each role also carries a darker `secondary` and a near-black `cardBg` in CharacterCreator.jsx. These are data colors, not brand accents.
- **Drive tints** (Nerve brown, Cunning green, Intuition purple): tint the three drive columns in Action Ratings and the dossier. Muted, low-alpha washes over parchment.

### Named Rules
**The One Ink Rule.** Oxblood is the only color that means "act" or "this matters". Primary buttons, active tabs and filled marks are oxblood; nothing else competes for that role.

**The Gilded Means Gilded Rule.** Gold signals the game's gilded state or a deliberate selection. It is not a general decoration color for text or borders.

**The Art Stays Whole Rule.** Official Darrington Press art (Fairelands map, role portraits) is shown as published: no tinting, no hue shifts, credit kept visible.

### GM night side
The owner chose to keep a cool, distinct look for the GM's screens (2026-10-04), toned down and made consistent. Today they use five slate navies (#020617, #0f172a, #1e293b, #1e3a5f, #0c1c32) and Tailwind's stock bright blues (#3b82f6, #60a5fa, blue-300/400). They consolidate to three:
- **GM Night** (#0c1c32): the GM desk's ground, behind the paper objects.
- **GM Slate** (#1e3a5f): raised panels and wells on the GM desk.
- **Moonlight Steel** (#8aa4c8, starting value, tune for 4.5:1 on GM Night): GM headings, links, icons and rules. It replaces every stock Tailwind blue.
The paper objects on the GM desk (dispatch letter, tabs, business cards, pocket watch, circle ledger) keep parchment, oxblood and gold; only the ground and the chrome around them are cool. The GM's dice are shown in their real colors (no grayscale or hue filter).

### Incumbent drift (recorded, not canonized)
- **Stock Tailwind blues** (#3b82f6, #60a5fa, blue-300/400) on the GM desk, and the slate and blue hub header. The hub is shared by players and the GM and follows the warm palette; the GM desk uses the three GM night tokens above.
- Large parts of the GM and player views use Tailwind stone, slate and zinc grays instead of the warm neutrals above.

## Typography

**Display Font:** Crimson Text, declared in tailwind.config.js as `serif` (with generic `serif` fallback). It is not loaded anywhere, so every `font-serif` element currently renders in the platform's default serif.
**Body Font:** the same declared serif.
**Label Font:** system sans (ui-sans-serif, system-ui) at weight 900, uppercase, tracked.
**Data Font:** system monospace (Tailwind default mono), uppercase and tracked, for IDs, counters, form numbers and status lines.
**Hub faces (chapter hub only):** Cinzel (stamped titles), Cormorant Garamond (italic prose on tomes and pamphlets), Playfair Display (newspaper masthead, tome titles), IBM Plex Mono (`font-mono-data`, register labels). Loaded by an inline style block in CampaignSelector.jsx.
**Pen fonts (notebook and signatures):** 20 handwriting families (Caveat as default, plus Reenie Beenie, Kalam, Indie Flower, Patrick Hand and others). A player picks a pen when joining a campaign and their notebook entries render in it. This is a feature, not decoration.

**Character:** A bookish serif for anything read or named, against tiny, heavy, widely tracked labels that read like stamped form fields.

### Hierarchy
- **Display** (900, 48px, line-height 1): the CANDELA OBSCURA wordmark at the top of the creator and app shell. Elsewhere the wordmark appears at 36px bold with 0.15em tracking.
- **Headline** (900, 30px, uppercase, 0.025em): step and section headings on parchment ("Action Ratings & Drive"), oxblood on parchment or cream on night.
- **Title** (700, 18px): ability names, character name input, card titles.
- **Body** (400, 14px to 16px, line-height 1.5): rule text and descriptions; italic serif for flavor lines and empty states.
- **Label** (900, 10px to 14px, uppercase, 0.1em to 0.35em): buttons, tabs, field labels, column heads. The single most repeated text treatment in the build (415 `uppercase` uses).
- **Data** (400, 9px to 11px, uppercase, tracked): counters ("3/3 placed"), form numbers, timestamps.

### Named Rules
**The Read in Serif Rule.** Anything a player reads as prose or as a name is serif. Sans and mono are for labels and numbers only.

**The Pen Belongs to the Player Rule.** Handwriting fonts appear only for text a person wrote (notebook entries, signatures, pen previews). Interface copy never uses them.

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
- **Ember glow** (`box-shadow: 0 0 4px rgba(114,28,21,0.55)` / `0 0 5px rgba(212,175,55,0.7)`): filled and gilded pips, glowing with their own color.
- **Modal** (`box-shadow: 0 20px 60px rgba(0,0,0,0.9)`): dialogs over the desk.

### Named Rules
**The One Lamp Rule.** All cast shadows fall the same way (down and right) because the desk has one light. Glows are only for things that are lit by their own state (filled, gilded, rolling).

## Shapes

Corners are tight. Small radius (2px) is the default for panels, wells, chips and tags; medium (4px) for buttons and the step bar. Full rounding is reserved for things that are round in the physical world: action pips, illumination dots, wax seals, dials and the pocket-watch tension clock. Paper objects add their own silhouettes: torn and slightly rotated tabs, corner brackets on the creator panel, double rules (`border-style: double`) on formal frames, dashed borders for empty slots and upload targets. Borders are 1px hairlines in sepia or ink at low alpha; 2px is used for frames and selected cards.

## Components

### Buttons
Tactile and stamped: small, heavy, uppercase, tracked.
- **Shape:** gently squared (4px).
- **Primary:** oxblood fill, cream label, label type at 16px with widest tracking, 8px by 28px padding, standard shadow. Disabled drops to ink at 60% with cream at 20%.
- **Ghost / Back:** transparent with a cream hairline at 18% alpha and cream text at 50%; hover adds a 5% white wash and raises text to 75%.
- **Brass (btn-gold):** candle gold fill, ink label at 10px, 1px ink border. Used for accept and counter actions in circle creation. Its `:active` state presses in by 2px.
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
- **GM desk tabs:** torn paper strips in cream, rotated a degree or two, with a small icon and tracked serif uppercase label, stacked in the left rail.
- **Notebook tabs:** folder tabs on the book's top edge; active tab is cream paper, inactive tabs are dark brown with gold text.

### Action Pips and Mark Boxes (signature)
The game's numbers are drawn as physical marks. Action pips are 13px circles with a 1.5px sepia ring; filled pips are solid oxblood with an ember glow; gilded pips are candle gold with a gold glow. Drive points are small squares tinted by drive. Mark boxes are 20px squares with a 2px ink border and an inset shadow, filling with oxblood. The illumination track is a row of ink dots with gold-ringed milestones every third pip.

### Role Card Deck (signature)
The creator's left column: an official role portrait in a gold-lined card frame with corner ornaments, the role name in serif at top and the role label in gold at the bottom, stacked over two offset card backs, with prev/next controls and a "1 / 10" counter.

### Chapter Hub Tomes (signature, kept by owner)
Leather-bound books (register green, deep purple) with embossed double frames, gold-leaf Cinzel and Playfair lettering, page-block edges and an open/close animation into a two-page ruled spread. PRODUCT.md marks this as the model for the app's physical-object feel.

## Do's and Don'ts

### Do:
- **Do** use oxblood (#721c15) for the single primary action on a screen and for active tabs, filled marks and pips.
- **Do** place parchment objects on the night stage, with the shadow falling down and right.
- **Do** set prose, names and rule text in the serif, and labels in small heavy uppercase with at least 0.1em tracking.
- **Do** reserve candle gold for gilded dice, gilded actions and deliberate selection.
- **Do** show official art whole, with its credit, and use the role portraits on role surfaces.
- **Do** use the character creator's panel, tab bar and button patterns as the reference when restyling other screens.
- **Do** keep handwriting fonts for player-written text in the player's chosen pen.

### Don't:
- **Don't** introduce colors outside the Dark Academia palette and the three GM night tokens; stock Tailwind blues, slates and stones are drift, not precedent.
- **Don't** add art taken from Candela Obscura source material, and never remove art the app already has (official or open-source).
- **Don't** use rounding above 4px on rectangles; round shapes are for pips, seals and dials.
- **Don't** recolor, crop away the credit of, or replace the official art.
- **Don't** use handwriting fonts for interface labels or buttons.
- **Don't** use gold as general text or border decoration where nothing is gilded or selected.
