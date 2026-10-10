Buttons are small, heavy, stamped labels: uppercase sans at 900 weight, 0.1em tracking, 4px corners.

Hand-written from `frontend/src/components/CharacterCreator.jsx` (Advance and Back), `frontend/src/index.css` (`.btn-gold`) and the oxblood button recipe repeated across `JoinCampaignForm.jsx`, `PlayerRosterCard.jsx` and `GmDiceControls.jsx`.

## Variants
- `co-btn co-btn-primary`: `oxblood` fill, `cream` label, 1px `ink` border, hover brightens 1.25. The single primary action on a screen (Advance, Select this Path, Cast, Dispatch, Join, Send invite). Disabled: `ink` at 60%, `cream` at 45%.
- `co-btn co-btn-ghost`: transparent, `cream` hairline at 25%, label at 75%; hover adds a 5% `cream` wash. Back and secondary actions on the night stage.
- `co-btn co-btn-gold`: the brass button. `candle-gold` fill, `ink` label, `shadow-brass`, presses in 1px. Accept and Counter in circle creation only.
- `co-btn co-btn-outline`: `oxblood` text and a 50% `oxblood` border on paper (Account, Delete before it is armed).
- `co-btn co-btn-moon`: `moonlight-steel` outline, for the Lightkeeper's bar.
- Add `co-btn-lg` for the creator's 16px Advance and Back.

## The consumer provides
A `<button>` with a short verb label (one or two words). Give it `min-height: 44px` on coarse pointers.

## Do
- Keep one oxblood button per screen (The One Ink Rule).
- Name the action exactly: Advance, Send invite, Dispatch.

## Don't
- Don't round above `radius-md`.
- Don't use gold for anything but brass accept/counter controls.
- Don't write an instruction next to a button; the label is enough.
