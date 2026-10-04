# Deleting characters and campaigns

Players can delete their own investigators, and a Lightkeeper can delete a campaign they run, from the roster book (Player Registry and Lightkeeper Ledger). Both are soft deletes: the row stays in the database with a `deleted_at` time, the app and the API treat it as gone, the same user can undo it for a couple of minutes, and an admin can restore it for 30 days. Nothing purges deleted rows yet; "A later purge" below says how one would work.

Code: `backend/vtt/deletion.py` (the rules), `models.SoftDeleted` (the column and the filter that hides deleted rows), the routes in `vtt/routers/investigators.py` and `vtt/routers/campaigns.py`, and the admin script `backend/restore_deleted.py`. Tests: `backend/tests/test_deletion.py`.

## Who may delete what

| Route | Who | Refused |
|---|---|---|
| DELETE /api/investigators/{id} | the character's owner, while it is on no campaign's roster: unaffiliated, or retired (a retired character stays tagged with its old campaign and can still be deleted) | 409 "An investigator in a campaign cannot be deleted." while it is active or pending (a dead character stays active until it is replaced, so it counts). 403 for anyone else, the Lightkeeper of its campaign and the seeded admin user included. 404 for an unknown or already deleted id |
| POST /api/investigators/{id}/restore | the owner, within `UNDO_SECONDS` (120) of the delete | 409 "It is too late to undo this." after that. 404 "Nothing to restore." for anyone else, and for a character that is not deleted |
| DELETE /campaign/{id} | the campaign's GM (the Lightkeeper), retired campaigns included | 403 for anyone else (its players, other Lightkeepers, admin). 404 for an unknown or already deleted id |
| POST /campaign/{id}/restore | the campaign's GM, within `UNDO_SECONDS` | as for a character |

A delete answers `{"ok": true, "id", "name", "deleted_at", "undo_until"}` (times in ISO 8601, UTC), and a campaign delete adds `released_character_ids`. The roster book shows Undo for 10 seconds after a delete; the server allows two minutes so a slow connection still makes it.

## What a delete does

A character: `deleted_at` is set and nothing else changes. Its notebook entries keep their author name, and its votes and relationships stay with their circle. A socket open on the character's channel (another tab) gets `character_deleted` `{"character_id"}` and is closed with 4404.

A campaign: every character tagged with it (active, pending or retired, not already deleted) goes back to its owner: status `unaffiliated`, `campaign_id` NULL. They are never deleted with it. The campaign keeps the list of them as they were in `released_characters` (`[{"id": 12, "status": "active"}, ...]`), then gets `deleted_at`. Its circle, notebook, votes and relationships stay as they are. Everyone connected is told with `campaign_deleted` `{"campaign_id", "campaign_code", "campaign_name"}`: the Lightkeeper's channel and the channel of every character it let go. The Lightkeeper's channel is then closed with 4404; the players' channels stay open (as after a retire) and the client opens them again, now without the campaign. The client goes back to the hub and says the campaign was deleted. The campaign code stays taken: the unique index still holds it and a restore needs it, so creating a campaign with that code is 409 "Campaign code is already in use" until the row is purged.

## In the roster book

Every row of the Player Registry and the Lightkeeper Ledger ends with a Delete control (`campaignSelector/RowDelete.jsx`) using the shared two-step confirm (`ConfirmAction`): the first press asks "Delete Theodore Pollock?" or "Delete campaign Beta? 4 investigators return to their players." (the count is `investigator_count` from `/api/users/{id}/campaigns`: active and pending), with Keep; the second press deletes. The row then goes and a slip says "Theodore Pollock deleted." with Undo and a 10 second countdown (`useDeleteUndo.js`). A character in a campaign or waiting to join one has the same control, unpressable (`aria-disabled`), with "In a campaign" or "Waiting for the Lightkeeper" as its accessible description and tooltip. On a phone the control has a line of its own under the row, and every control there is at least 44px high. The store's `deleteCharacter`, `restoreCharacter`, `deleteCampaign` and `restoreCampaign` make the calls; a socket this tab still has open on what is deleted is closed first. `campaign_deleted` and `character_deleted` send a desk back to the hub, which shows a notice for 12 seconds (`HubNotice.jsx`).

## Hidden everywhere

`models.py` registers a `do_orm_execute` listener that adds `deleted_at IS NULL` for `Character` and `Campaign` to every ORM SELECT in every session (`with_loader_criteria`), column queries and relationship loads included. Only the loads that refresh a row already in the session (an expired attribute after a commit, `Session.refresh`) skip it, so a route can still read the row it just deleted. So, with no change to the routes themselves:

- lookups by id answer 404 as if the row never existed ("Investigator dossier not found.", "Character not found", "Campaign not found"), because `character_facts` and `campaign_facts` in `vtt/auth.py` see nothing; this covers every access check, the roster, the circle routes, the notebook, retire, invite to rejoin and finalize;
- lists leave them out: the Player Registry (`/api/users/{id}/characters`), the Lightkeeper Ledger (`/api/users/{id}/campaigns`), `/api/investigators`, rosters, broadcasts;
- joining by a deleted campaign's code is 404 "Campaign code not found", rejoining it is 404 "Campaign not found";
- a rejoin invite to a deleted campaign is left out of the sign-in answer (`pendingRejoinInvite` is null), and a Lightkeeper whose only campaign was deleted signs in as a player;
- the WebSocket closes a deleted character's or campaign's channel with 4404 on connect, and a message on a Lightkeeper socket whose campaign was deleted meanwhile is refused (`action_rejected` 404 "Campaign not found").

The app has no admin pages; the admin's view of deleted rows is `restore_deleted.py list`.

Code that has to see deleted rows asks for them with `.execution_options(include_deleted=True)` (`models.INCLUDE_DELETED`): the undo and the admin restore in `vtt/deletion.py`, and `_code_taken` in `vtt/routers/campaigns.py`. Raw SQL through `text()` is never filtered.

## Undo

`POST /api/investigators/{id}/restore` clears `deleted_at`; the character comes back exactly as it was (a retired one still tagged with its old campaign).

`POST /campaign/{id}/restore` clears `deleted_at` and `released_characters`, and puts back each released character that is still free (not deleted, unaffiliated, in no campaign) with the status it had. One that joined another campaign or was deleted by its owner meanwhile stays where it is. Rejoin invites to the campaign show again, since the invite on the user was never cleared. Nobody is told; players see the campaign again the next time they open the roster book.

## Admin restore (within 30 days)

After the undo window only an admin restores, with the script, inside CT209 as the candela user with the app's settings:

```
cd /opt/candela/app/backend
runuser -u candela -- sh -c 'set -a; . /etc/candela/candela.env; exec /opt/candela/venv/bin/python restore_deleted.py list'
runuser -u candela -- sh -c 'set -a; . /etc/candela/candela.env; exec /opt/candela/venv/bin/python restore_deleted.py character 12'
runuser -u candela -- sh -c 'set -a; . /etc/candela/candela.env; exec /opt/candela/venv/bin/python restore_deleted.py campaign 5'
```

`list` shows what was deleted in the last 30 days (`--days N` for another span): id, name, owner or Lightkeeper, when, and for a campaign how many characters it let go. `character` and `campaign` do what the undo does, for any user and with no time limit. A campaign is best restored with the script, since it reads `released_characters`; a character can also be restored in SQL with `UPDATE characters SET deleted_at = NULL WHERE id = 12;`. Restoring a campaign does not tell anyone.

The 30 days (`KEEP_DAYS`) is a promise, not yet enforced: until a purge exists, deleted rows stay, and the nightly database dumps and backups keep them longer still.

## A later purge

Not built. A purge would be a daily job (a systemd timer in CT209, next to `candela-dbdump`, running after the dump) that permanently removes rows whose `deleted_at` is older than `KEEP_DAYS`. Each row goes in its own transaction, with what points at it handled first:

- A character: delete its `circle_votes` and the `relationships` it is in (from, to), set `last_actor_id` to NULL where it is the last actor, set `notebook_entries.character_id` to NULL (the entry keeps its author name and ink), then delete the character. Its portrait lives in the row and goes with it. As a safety check it skips a character whose status is active or pending.
- A campaign: set `campaign_id` to NULL on any character still tagged with it (a deleted retired one), set `users.pending_rejoin_campaign_id` to NULL where it points at it, delete its notebook entries, delete its circle's votes and relationships and then the circle, then the campaign. That frees its code.

It would log what it removed (ids and names, never portraits or notebook text), be safe to run twice, and leave every row with `deleted_at` NULL alone. The rows still exist in older dumps and backups until those expire, so a purge does not erase them everywhere at once; the server's restore runbook (candela/README.md in the gatergrid-web repository) applies if one is ever needed back.
