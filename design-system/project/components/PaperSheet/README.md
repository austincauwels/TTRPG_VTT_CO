The creator's paper stock: parchment with a 3px double `sepia` rule, tea stains, two fold lines, corner brackets and a faint diagonal CANDELA OBSCURA watermark.

Hand-written from `frontend/src/components/shared/PaperSheet.jsx` and `.paper-bg`, `.paper-texture`, `.fold-line`, `.tea-stain` in `frontend/src/index.css`.

## Use
The creator's Profile, Actions and Circle sheets and the login screen's admission slip are cut from it. It is the reference surface for the whole app: new paper objects converge on it.

## Anatomy
- `co-paper`: `parchment`, a dot grid at 22px and a rule every `space-rule`, `shadow-sheet`, `radius-sm`.
- `co-bracket tl|tr|bl|br`: 28px corner brackets in `sepia` at 50%.
- `co-fold`: hairline creases at about 34% and 67%.
- `co-watermark`: the name at 3% opacity, turned -28deg, aria-hidden.
- Top corners: the form line (`co-print-small`, e.g. "Form C.O. 7 · Investigator record") and the red serial (`co-print-serial`), from sm up.
- `co-paper-body`: `space-panel` padding (16px on phones).
- `co-well`: an inset group of fields, `parchment-deep` at 30% with `shadow-well`.

## The consumer provides
The content, the form number for its kind of paper (see the Forms table in the brand book) and a stable serial.
