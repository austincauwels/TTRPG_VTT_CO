Inputs are ledger lines, not boxes: a transparent field over a single `sepia` underline, the value in bold serif.

Hand-written from the ledger fields in `frontend/src/components/shared/JoinCampaignForm.jsx`, `gm/desk/InvitePlayer.jsx` and `account/AccountPage.jsx`.

## Anatomy
- Label: label style in `sepia` (or small `oxblood` capitals on the account page). Plain words, never "Choose ...".
- Input: `ledger-value` (serif 700, 18px), underline `sepia` at 38%, placeholder `ink` at 20%. Codes, usernames and emails use `co-mono` at 16px.
- Focus: the underline turns `oxblood`, plus the gold-and-ink focus ring.
- Error: one line in `oxblood` serif under the field that says what to do next.

## Rules
- 16px minimum on touch screens so iOS Safari does not zoom.
- A select starts on a blank option under its plain label.
