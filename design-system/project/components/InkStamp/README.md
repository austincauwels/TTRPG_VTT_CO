The outcome of a roll, rubber-stamped on the result slip: Cinzel capitals in a 2px frame, a little crooked, its ink worn by pinholes.

Hand-written from `.ink-stamp` in `frontend/src/index.css` and `OUTCOME_STAMP` in `frontend/src/components/pc/dice/DiceTray.jsx`.

## Tones
- Failure: `oxblood`.
- Mixed Success: `sepia`.
- Full Success: `seal-green`.
- Critical: `ink` on a `candle-gold` fill.

## Behavior
The tilt is fixed per roll. It presses down once (`inkStamp`, 0.3s, scale 1.7 to 1) when a new result lands, and appears at once under reduced motion. While a gilded choice is open the slip shows a dashed "Keep one die" instead.
