The game's numbers drawn as marks: action rating pips and drive squares, on a raised action chit that is itself the roll button.

Hand-written from `.action-pip` in `frontend/src/index.css` and the action rows in `pc/InvestigatorDossier.jsx`.

## Pips
- `co-pip`: 13px circle, 1.5px `sepia` ring.
- `.filled`: solid `oxblood`.
- `.gilded`: `candle-gold` with a `sepia` ring.

## Drive squares
`co-drive-sq` in the drive's tint (`--drive: var(--drive-nerve)` etc.), filled for points held. Each drive is a printed section under a double rule in its own ink at 30% with a 7% wash; no tray around it.

## Action chit
`co-chit`: the whole row rolls. It lifts on hover, sinks when pressed, gets the pen underline, and shows a faint die only on hover or keyboard focus. On touch screens each row ends in a printed "i" (its own 44px target) that lays the action's text on a slip; nothing explains the mark.

## The consumer provides
The action name, its rating (0 to 3), whether it is gilded, and the roll handler.
