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

A delete answers `{"ok": true, "id", "name", "deleted_at", "undo_until"}` (times in ISO 8601, UTC), and a campaign delete adds `released_character_ids`. The roster book keeps each delete's Undo for as long as the server allows it (In the roster book, below).

## What a delete does

A character: `deleted_at` is set and nothing else changes. Its notebook entries keep their author name, and its votes and relationships stay with their circle. A socket open on the character's channel (another tab) gets `character_deleted` `{"character_id"}` and is closed with 4404.

A campaign: every character on its roster (active or pending, `deletion.RELEASED_STATUSES`, not already deleted; a dead character is still active, so it goes too) goes back to its owner: status `unaffiliated`, `campaign_id` NULL. They are never deleted with it. The campaign keeps the list of them as they were in `released_characters` (`[{"id": 12, "status": "active"}, ...]`), then gets `deleted_at`. Retired characters are not let go: they stay tagged with the campaign, hidden with it (below), and come back with it. Most of them are dead predecessors that were replaced, and letting them go used to put them in their players' registries as free investigators that could join other campaigns. The campaign's circle, notebook, votes and relationships stay as they are. Everyone connected is told with `campaign_deleted` `{"campaign_id", "campaign_code", "campaign_name"}`: the Lightkeeper's channel and the channel of every character it let go. The Lightkeeper's channel is then closed with 4404; the players' channels stay open (as after a retire) and the client opens them again, now without the campaign. The client goes back to the hub and says the campaign was deleted.

The campaign code stays taken: the unique index still holds it and a restore needs it. Creating a campaign with that code is 409. The Lightkeeper who deleted the campaign is told why: "A campaign you deleted still holds this code, so that it can be brought back. Choose a different code." Anyone else gets "Campaign code is already in use", so nobody learns that someone else's campaign was deleted. The code is free again once the row is purged.

## Deletes, joins and restores at the same time

Every function in `vtt/deletion.py` that changes rows first locks the rows it decides on (`SELECT ... FOR UPDATE`, through `deletion._locked`) and reads them as they are once the lock is held: SQLAlchemy refreshes a row the session already has (`populate_existing`), and PostgreSQL checks the query's conditions again against a row that another transaction changed meanwhile. `/campaign/join` (`engine.request_join_campaign`) and `/campaign/rejoin` lock the campaign row `FOR SHARE` and the character row `FOR UPDATE` the same way. Every one of them takes the campaign row before character rows, so they cannot deadlock. As a result:

- Two deletes of one campaign (a retry, two tabs, a direct API call): the second waits, then finds the campaign gone and answers 404. It used to find no characters left and overwrite `released_characters` with `[]`, so an undo brought the campaign back with an empty roster.
- A join while the campaign is being deleted waits, then finds no campaign ("Campaign code not found"). A delete while a join is under way waits for the join and lets the new pending character go too. Before, a join that committed between the delete's query and its commit left a pending character tied to a deleted campaign, which no Lightkeeper could approve and its owner could not delete.
- A character delete and a join of the same character: whichever comes second waits and then sees the first (409 for the delete of a character now pending, "Character not found" for the join of a deleted one).
- A restore and a join of a character it would put back: the join waits and then gets 409 (the character is back in its campaign), or the restore waits and leaves the character where the join put it.
- Two restores of one campaign: the second answers 404 "Nothing to restore."

`test_deletion.py` runs each of these interleavings on two threads: the first operation stops just before its commit while it holds its locks, the second must be seen waiting for one of them (`pg_blocking_pids`), and then both finish. Without the locks the second does not wait and the tests fail.

Join also refuses a character that is on a roster: 409 "This investigator is already in a campaign." for an active one, "This investigator is already waiting to join a campaign." for a pending one. Joining used to move such a character out of its campaign without a word; together with an undo nobody heard about, a player could pull an investigator out of the campaign the Lightkeeper had just restored.

## In the roster book

Every row of the Player Registry and the Lightkeeper Ledger ends with a Delete control (`campaignSelector/RowDelete.jsx`) using the shared two-step confirm (`ConfirmAction`): the first press asks "Delete Theodore Pollock?" or "Delete campaign Beta? 4 investigators return to their players.", with Keep; the second press deletes. The count is `investigator_count` from `/api/users/{id}/campaigns`, which counts exactly what the delete lets go (the same `RELEASED_STATUSES`; retired characters stay with the campaign and are not counted). The row then goes and a slip says "Theodore Pollock deleted." with Undo and a countdown (`useDeleteUndo.js`). Each delete keeps its own slip for the server's window, read from the delete's answer (`undo_until` minus `deleted_at`, so the tab's clock does not matter) less 5 seconds for the request to get there; the newest is on top and up to three are kept, so deleting a second row no longer takes away the first one's Undo. The countdown is hidden from screen readers, and each Undo button is named for what it undoes ("Undo deleting Theodore Pollock").

A character in a campaign or waiting to join one has the same control, unpressable (`aria-disabled`), with "In a campaign" or "Waiting for the Lightkeeper" as its accessible description and tooltip. On a phone the control has a line of its own under the row, and every control there is at least 44px high.

When a delete is refused, the slip area says why. A 409 shows the server's reason ("Theodore Pollock was not deleted. An investigator in a campaign cannot be deleted."), since trying again would not help, and the registry is read again so the row shows where the investigator is. A 404 says it was already deleted, perhaps in another tab, and also reads the registry again. Join does the same on a 409: the form shows the server's reason and the registry is read again.

The store's `deleteCharacter`, `restoreCharacter`, `deleteCampaign` and `restoreCampaign` make the calls. A socket this tab still has open on what is deleted is closed first, and opened again if the delete does not go through (unless another socket was opened meanwhile). `campaign_deleted` and `character_deleted` send a desk back to the hub, which shows a notice for 12 seconds (`HubNotice.jsx`). `campaign_restored` (Undo, below) makes the client read the roster book again.

## Hidden everywhere

`models.py` registers a `do_orm_execute` listener that adds `deleted_at IS NULL` for `Character` and `Campaign` to every ORM SELECT in every session (`with_loader_criteria`), column queries and relationship loads included. Only the loads that refresh a row already in the session (an expired attribute after a commit, `Session.refresh`) skip it, so a route can still read the row it just deleted. So, with no change to the routes themselves:

- lookups by id answer 404 as if the row never existed ("Investigator dossier not found.", "Character not found", "Campaign not found"), because `character_facts` and `campaign_facts` in `vtt/auth.py` see nothing; this covers every access check, the roster, the circle routes, the notebook, retire, invite to rejoin and finalize;
- lists leave them out: the Player Registry (`/api/users/{id}/characters`), the Lightkeeper Ledger (`/api/users/{id}/campaigns`), `/api/investigators`, rosters, broadcasts;
- joining by a deleted campaign's code is 404 "Campaign code not found", rejoining it is 404 "Campaign not found";
- a rejoin invite to a deleted campaign is left out of the sign-in answer (`pendingRejoinInvite` is null), and a Lightkeeper whose only campaign was deleted signs in as a player;
- the WebSocket closes a deleted character's or campaign's channel with 4404 on connect, and a message on a Lightkeeper socket whose campaign was deleted meanwhile is refused (`action_rejected` 404 "Campaign not found").

Two routes reach a campaign's data through a row of their own rather than the campaign's id, so they check the campaign themselves, as every other route does:

- `POST /circle/relationship/respond` looks the relationship's circle and its campaign up: a deleted campaign's relationship is 404 "Relationship not found" (it used to answer with the whole circle's relationships, lore included, to a released player who was a party to an open proposal). The responder must also be an active member of the circle's campaign, as on the WebSocket, so a released or retired character gets 403.
- `PUT` and `DELETE /api/notebook/entries/{id}`: an entry of a deleted campaign is 404 "Entry not found", and a character's entry can only be changed while that character is an active member of the campaign (403 for one that was let go, moved or retired), as for writing one.

The retired characters a campaign delete keeps with it are hidden from the Player Registry and `/api/investigators` (`deletion.hidden_with_their_campaign`); their owner can still open one by id, and delete it, since it is theirs.

The app has no admin pages; the admin's view of deleted rows is `restore_deleted.py list`.

Code that has to see deleted rows asks for them with `.execution_options(include_deleted=True)` (`models.INCLUDE_DELETED`): the undo and the admin restore in `vtt/deletion.py`, and `_code_taken` in `vtt/routers/campaigns.py`. Raw SQL through `text()` is never filtered.

## Undo

`POST /api/investigators/{id}/restore` clears `deleted_at`; the character comes back exactly as it was (a retired one still tagged with its old campaign).

`POST /campaign/{id}/restore` clears `deleted_at` and `released_characters`, and puts back each released character that is still free (not deleted, unaffiliated, in no campaign) with the status it had. One that joined another campaign or was deleted by its owner meanwhile stays where it is. The retired characters it kept come back with it, since they never left. Rejoin invites to the campaign show again, since the invite on the user was never cleared.

Then every open socket of the Lightkeeper and of the owners of the characters it put back gets `campaign_restored` `{"campaign_id", "campaign_code", "campaign_name", "restored_character_ids"}`, whatever channel the socket is on (`manager.broadcast_users`). The client reads the roster book again, so an investigator it showed as free is back in the campaign; a socket on one of those characters opens again to carry the campaign; and a player on the hub whose investigator came back sees "The Lightkeeper restored campaign Beta." The undo used to tell nobody: a player whose desk the delete had sent to the hub kept a registry that showed the investigator free, with Join and Delete. Delete then failed with a 409 shown as "try again", and Join quietly moved the investigator out of the restored campaign. A tab with no socket open reads the roster book whenever it opens the book.

## Admin restore (within 30 days)

After the undo window only an admin restores, with the script, inside CT209 as the candela user with the app's settings:

```
cd /opt/candela/app/backend
runuser -u candela -- sh -c 'set -a; . /etc/candela/candela.env; exec /opt/candela/venv/bin/python restore_deleted.py list'
runuser -u candela -- sh -c 'set -a; . /etc/candela/candela.env; exec /opt/candela/venv/bin/python restore_deleted.py character 12'
runuser -u candela -- sh -c 'set -a; . /etc/candela/candela.env; exec /opt/candela/venv/bin/python restore_deleted.py campaign 5'
```

`list` shows what was deleted in the last 30 days (`--days N` for another span): id, name, owner or Lightkeeper, when, and for a campaign how many characters it let go and how many retired ones it kept. `character` and `campaign` do what the undo does, for any user and with no time limit, with the same locks. A campaign is best restored with the script, since it reads `released_characters`; a character can also be restored in SQL with `UPDATE characters SET deleted_at = NULL WHERE id = 12;`.

A campaign deleted more than a day ago let its characters go that long ago, and their players may be using them elsewhere by now. So before it puts any back, `campaign` lists the ones still free (id, name, owner, the status it would get back) and asks "Put them back in the campaign as they were? [y/N]". No (or no answer, as with no terminal) restores the campaign alone and leaves them free. `--put-back` or `--leave-free` answers in advance. A campaign deleted less than a day ago puts them back without asking, as the undo does.

The script runs in its own process, so it cannot reach the app's sockets: restoring with it tells nobody, and players see the campaign again the next time they open the roster book.

The 30 days (`KEEP_DAYS`) is a promise, not yet enforced: until a purge exists, deleted rows stay, and the nightly database dumps and backups keep them longer still.

## Deploying and rolling back

`init_db` adds `characters.deleted_at`, `campaigns.deleted_at` and `campaigns.released_characters` on the first start (`vtt/db.py`, `add_columns`). Every Character and Campaign query reads `deleted_at`, so if adding it fails, all of them fail. A column that is there already is the only failure `add_columns` passes over quietly; any other (no permission on the table, a lock timeout, a missing table) is logged as "Could not add the column characters.deleted_at: ..." in the app's journal. The same holds for every other column `init_db` adds, which used to swallow every failure.

Rolling back (`candela/update.sh <older commit>` in the gatergrid-web repository) to code from before deletion existed, older than the commit "Delete: characters and campaigns get deleted_at, hidden from every query", runs code without the filter. If anyone has deleted anything by then:

- every deleted character and campaign shows again, as if never deleted: in registries, ledgers, rosters, and by id;
- a deleted campaign comes back with an empty roster, because its characters were let go (and some may have joined other campaigns since); the old code knows nothing of `released_characters`, so it cannot put them back.

To avoid it:

1. Prefer to roll back no further than that commit. The new columns are additive; code from that commit on keeps hiding deleted rows.
2. If older code must run, first take a database dump (`candela-dbdump` in CT209), then run `restore_deleted.py list --days 3650` to see every deleted row. Before switching code, decide each one: bring it back properly with `restore_deleted.py campaign ID` or `character ID` (so a campaign gets its roster back), or remove it for good following "A later purge" below. Only when the list is empty roll back. The columns themselves can stay; the old code ignores them.
3. Rolling forward again later is safe: the columns are already there, so nothing is added and nothing is logged.

## A later purge

Not built. A purge would be a daily job (a systemd timer in CT209, next to `candela-dbdump`, running after the dump) that permanently removes rows whose `deleted_at` is older than `KEEP_DAYS`. Each row goes in its own transaction, with what points at it handled first:

- A character: delete its `circle_votes` and the `relationships` it is in (from, to), set `last_actor_id` to NULL where it is the last actor, set `notebook_entries.character_id` to NULL (the entry keeps its author name and ink), then delete the character. Its portrait lives in the row and goes with it. As a safety check it skips a character whose status is active or pending.
- A campaign: set `campaign_id` to NULL on any character still tagged with it (the retired ones it kept, which stay retired and so stay out of the registry, and any deleted ones), set `users.pending_rejoin_campaign_id` to NULL where it points at it, delete its notebook entries, delete its circle's votes and relationships and then the circle, then the campaign. That frees its code.

It would lock each row as the delete and restore do, log what it removed (ids and names, never portraits or notebook text), be safe to run twice, and leave every row with `deleted_at` NULL alone. The rows still exist in older dumps and backups until those expire, so a purge does not erase them everywhere at once; the server's restore runbook (candela/README.md in the gatergrid-web repository) applies if one is ever needed back.
