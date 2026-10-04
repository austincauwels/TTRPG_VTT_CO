# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One Candela Obscura group: the GM, Austin Cauwels, who also wrote the app, and her players (seven player accounts plus an admin account in October 2026). Players build investigators, take actions, roll dice and keep notes during live sessions; the GM approves players into her campaign, runs circles and scenes, and tracks the table's state.

## Product Purpose

A real-time virtual tabletop built for the rules of Candela Obscura (Darrington Press). It lets the group play a campaign with the rules handled by the app: dice pools, gilded dice, drives and resistances, marks and scars, the illumination track, circle abilities, advancement and a shared notebook. Success is a session where the table spends its attention on the story, not on bookkeeping, and where every number on screen matches the rulebook.

## Positioning

Built around Candela Obscura's own mechanics rather than a generic dice roller: rolls resolve on the server with the game's pool rules (zero-dice rolls, gilded choice, critical on two sixes), ability modifiers are checked against the character, and marks, scars, death and circle creation follow the rules as written. A general-purpose VTT cannot do this without manual bookkeeping.

## Operating Context

- Live sessions: the GM shares a campaign code, players join and are approved, then everyone's view updates in real time over a WebSocket connection (rolls, marks, chat, notebook).
- Players can have several investigators and be in several campaigns; the GM can end a campaign.
- Hosted on GaterGrid: candela.gatergrid.com for play, candela-beta.gatergrid.com (password-protected) for trying changes on a copy of the real data first.
- Sign-in is moving to Google accounts on the beta site, with password login kept as a fallback during the move.
- How the group plays (in person or online) and on which devices is NOT confirmed yet. Until it is, every surface must work on both phones and computers.

## Capabilities and Constraints

- Mechanics and their exact behavior are documented in FAQ.md (rolls, mods, resistance, GM rolls, group rolls, circle abilities, marks and scars, death, accounts and campaigns, circle creation, advancement, illumination, post-roll abilities, notebook).
- Rulebook terms stay exactly as the game names them: Investigator, Circle, Illumination, Marks (Body, Brain, Bleed), Scars, Drives, Resistances, Gilded dice, Actions, Assignments.
- Stack: React 18 with Vite, Tailwind CSS, Zustand, Framer Motion; FastAPI backend. Behavior must not change in a visual refinement; the app has a characterization test suite in backend/tests.
- All UI work happens on the `beta` branch and the beta site first; the live table only gets it after the GM merges it.

## Brand Commitments

- The game is Candela Obscura by Darrington Press. Art rule (Robert Gater, 2026-10-04): do NOT add any new art taken from Candela Obscura source material (rulebooks, Darrington Press assets). The art already in the app stays exactly as it is: the maps and investigator portraits in frontend/public/images (including The_Fairelands_map.png credited to Marc Moreau) and every open-source asset already used, such as the paper, leather and wood textures. Never remove any of it. New visual elements must be drawn in code (CSS, SVG) or come from properly licensed open-source sources.
- The look is Dark Academia: parchment, emerald green and gold (README.md; kept as binding, confirmed 2026-10-04).
- The character creator is the best-designed part of the app (Robert, 2026-10-04) and is the internal reference for the rest; it gets refinement only.
- The chapter hub's book theme stays (Robert, 2026-10-04): each campaign is a leather-bound tome that opens, with its open and close animation, into a two-page spread for the roster and campaign creation (frontend/src/components/CampaignSelector.jsx). It is a model for the app's physical-object feel; refinement may clean up what sits around it.
- Wording and screen layout are not pinned: they may change where they are unclear, but rulebook terms stay.

## Evidence on Hand

- FAQ.md: the mechanics as implemented.
- frontend/public/images: 15 official art files (map, fallback map, investigator role portraits).
- Real campaign data exists (2 campaigns, 6 investigators, 74 notebook entries) and is copied to the beta site; it is the group's private play data, never to be shown in public material.
- No testimonials, user research or analytics exist; do not invent any.

## Product Principles

1. The rules are the product: anything on screen that shows a mechanic must match the rulebook and the server's result.
2. The table comes first: during a session, what a player or GM needs right now (the roll outcome, marks, drives, whose turn it is) must read at a glance.
3. Her game, her look: refinement removes generic noise and keeps the Dark Academia identity and every piece of art already in the app; it adds no new Candela Obscura source art.
4. Beta before the table: every visual change is tried on candela-beta with real data before players see it.
