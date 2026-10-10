A fountain-pen stroke in `oxblood` that draws itself under a tab's label on hover or keyboard focus and stays inked on the active one.

Hand-written from `.pen-underline` and `.pen-host` in `frontend/src/index.css`, shown on the Lightkeeper's torn paper nav slips.

## Use
Put `co-pen` on the label and `co-pen-host` on the control; add `is-inked` on the active tab. Used on the Lightkeeper's nav slips and the player desk tabs.

## Slips
`co-slip`: a `cream` paper strip with serif capitals, `shadow-object`, at its own fixed tilt (about 1 degree). In the app the slips are torn at one end with a drop-shadow following the tear.

## Motion
The stroke reveals left to right over 0.38s with `cubic-bezier(.22,1,.36,1)`; no transition under reduced motion.
