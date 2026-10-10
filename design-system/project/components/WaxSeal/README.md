The owner's wax seal: a round seal in three reds with a dashed ring and the candle-holder mark pressed in, turned 12 degrees.

Hand-written from `frontend/src/components/shared/WaxSeal.jsx` and `.wax-seal-*` in `frontend/src/index.css`. The mark is GiCandleHolder from game-icons.net (CC BY 3.0, via react-icons).

## Use
On the player's member ID strip (128px), the Finalize slip (32px), and pressed large onto a join request on Approve or onto the slip on Finalize.

## Rules
- Every measure is a share of the seal's width (container units), so it keeps its proportions at any `--seal-size`.
- The reds are `material-wax-*` tokens: material literals, never interface colors.
- Decorative and `aria-hidden`; the words beside it say what was sealed.
- `seal-press` plays once on appearing (scale 1.55 to 1, a small turn); still under reduced motion.
