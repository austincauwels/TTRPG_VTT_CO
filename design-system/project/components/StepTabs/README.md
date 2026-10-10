The creator's four-step progress bar: equal tabs in an `ink` bar, the active step filled `oxblood`.

Hand-written from the `nav aria-label="Steps"` in `frontend/src/components/CharacterCreator.jsx`.

## Anatomy
- Bar: `ink` fill, 1px `sepia` border at 50%, `radius-md`, a soft cast shadow.
- Tab: label style (sans 900, 0.1em, uppercase), numbered ("1. Choose Path"); `cream` at 75%, hover `cream` on a 20% black wash.
- Active: `oxblood` with `cream`, `aria-current="step"`. On phones the active tab takes flex 3 and the others show only their number.
- Locked: `cream` at 55%, a small padlock, `disabled`, and an aria-label saying it is locked until the earlier steps are done.

## The consumer provides
The step labels, the current step and which steps are unlocked.
