Chips are short labels on small tags: ability keywords, gear and the action-raise choices.

Hand-written from the chip recipes in `frontend/src/components/CharacterCreator.jsx` and `pc/InvestigatorDossier.jsx`.

## Variants
- `co-chip co-chip-tag`: `ink` fill, `candle-gold` or role-ink text, label style, `radius-sm`. Ability keywords under a role ("Gather Statements").
- `co-chip co-chip-gear`: outlined in `sepia`, italic serif. Gear items.
- `co-chip co-chip-raise`: `parchment` with a `sepia` border; selected (`aria-pressed="true"`) fills `oxblood` with `cream`.

## Ability chips under an action
One line each, never broken: the ability's name in serif, then what it adds in the sheet's own marks (+1d in mono, the gilded dot, the drive in italic). A chosen chip takes a gold wash and an ink tick in its corner so the row never re-flows.
