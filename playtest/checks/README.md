# Browser checks from PR 11

Scripts from the recheck of PR 11 (10 October 2026). They drive a private copy of the site: API on port 8310, `vite preview` on 4310, database `bc_recheck`.

1. Create the database, start the backend on 8310 with `CORS_ORIGINS=http://127.0.0.1:4310`, and build the frontend.
2. Serve the build with `vite preview` on 4310, using a git-ignored copy of `frontend/vite.config.js` whose proxy targets say 8310 (`--outDir` points at the build).
3. `node setup.js` builds the tables over the API and writes `state.json`.

Tables built:
- "The Sealed Hours": two players, sealed.
- "The Other Table": a second Lightkeeper, sealed.
- "The Formation Hours": four players, not sealed.

The checks:
- `probe_scroll.js`: the sheet column opens at its top, including after a tab switch.
- `record_note_scroll.js`: the Undo strip brings the trauma record's foot into view.
- `r6.js`: a refused soak says why under the marks.

`lib.js` has the shared helpers: open a seat with a seeded store, track a mark track's state, read the WebSocket frames, run SQL.
