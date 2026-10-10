Dice as the original tray drew them: ivory with a hairline edge and 4px corners, and the gilded die in gold leaf with a gold halo.

Hand-written from `frontend/src/components/pc/dice/Die.jsx` (`PIPS`, `DIE_BODY`) and `.die-gilded` in `frontend/src/index.css`.

## Anatomy
- Face: standard pips on a 24 by 24 grid (one in the middle; two and three on the diagonal from the top right; four in the corners; five the corners and middle; six two columns of three), `r=2.2`, in `ink`.
- Regular: `cream` with an `ink` hairline at 20%.
- Gilded (`.gilded`): `material-gilt-light` to `material-gilt-dark`, 2px `candle-gold` edge, `shadow-gilded-halo` (the system's one glow).
- The die that counts (`.counts`): a `seal-green-lit` ring.
- Tray (`co-felt`): `material-felt` inside a `material-tray-wood` rim. Empty until the first roll.

## Motion
`dieTumble` drops each die in over 0.5s at its own skew; under reduced motion they appear in place.
