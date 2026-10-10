The small print of forms that came off a press: form lines, serials, edge lines, rubber date stamps, empty stamp outlines, blanks and ruled boxes.

Hand-written from `frontend/src/components/shared/PrintMarks.jsx` and the `.print-*` rules in `frontend/src/index.css`.

## Pieces
- `co-print-small`: the form line, serif 600 at 10.5px, 0.16em, `sepia` at 62%.
- `co-print-serial`: a numbering machine's red figures, mono 12px, `oxblood` at 68%. `serialFor(key)` keeps a sheet's number across reloads.
- `co-print-edge`: 9.5px print repeated along the bottom edge, clipped by the paper.
- `co-print-stamp` with `data-tone="green|oxblood|sepia"`: a worn rubber stamp, a word over a mono date, tilted.
- `co-print-stamp-empty`: the dashed outline where a stamp will go (a report not filed).
- `co-print-blank`: a dotted blank for a value not given yet.
- `co-print-box`: a ruled box in a margin ("Lightkeeper's seal").

## Rules
All of it is decoration: `aria-hidden`, faint, never an instruction, never over a control. It is the one exception to the twelve pixel floor. Each kind of paper keeps one form number everywhere it appears.
