"""/api/notebook routes."""
import base64

import pytest

import engine
import support
from models import NotebookEntry, User

ENTRY_KEYS = {"id", "campaign_id", "character_id", "author_name", "author_type", "pen_font",
              "ink_color", "title", "content", "created_at", "page_number", "entry_type",
              "visibility", "image_data", "is_deleted"}


def _writer(campaign_id, fields):
    """The owner of the entry's character, or the campaign's GM for an entry without one."""
    if fields.get("character_id") is not None:
        return support.as_owner(fields["character_id"])
    return support.as_gm(campaign_id)


def _add(client, campaign_id, headers=None, **fields):
    body = {"title": f"T {support.uid()}", "content": "words", "author_name": "Ada",
            "author_type": "player", **fields}
    r = client.post(f"/api/notebook/{campaign_id}/entries", json=body, headers=headers or _writer(campaign_id, fields))
    assert r.status_code == 201, r.text
    return r.json()


def _gm_name(campaign):
    return support.fetch(User, support.gm_id(campaign)).username


def _post(client, campaign_id, headers, **fields):
    body = {"title": "x", "content": "y", "author_name": "a", "author_type": "player", **fields}
    return client.post(f"/api/notebook/{campaign_id}/entries", json=body, headers=headers)


def test_add_entry(client):
    camp = support.new_campaign(client)
    r = client.post(f"/api/notebook/{camp['id']}/entries", json={
        "title": "Day one", "content": "We met.", "author_name": "LK", "author_type": "gm"},
        headers=support.as_gm(camp))
    assert r.status_code == 201
    body = r.json()
    assert set(body) == ENTRY_KEYS
    assert body["campaign_id"] == camp["id"]
    assert body["character_id"] is None
    assert (body["pen_font"], body["ink_color"]) == ("Caveat", "#1a1a1a")
    assert (body["entry_type"], body["visibility"]) == ("field_log", "all")
    assert body["page_number"] == 1
    assert body["is_deleted"] is False
    assert body["image_data"] is None
    assert "T" in body["created_at"]  # ISO timestamp string


def test_page_numbers_count_up_per_campaign(client):
    a = support.new_campaign(client)
    b = support.new_campaign(client)
    pages = [_add(client, a["id"])["page_number"] for _ in range(3)]
    assert pages == [1, 2, 3]
    assert _add(client, b["id"])["page_number"] == 1


def test_pen_and_ink_come_from_the_character(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    entry = _add(client, camp["id"], character_id=member["id"])
    assert (entry["pen_font"], entry["ink_color"]) == ("Caveat", engine.INK_COLORS[0])
    newcomer = support.pending_member(client, camp)
    entry = _add(client, camp["id"], character_id=newcomer["id"])
    # a character without ink falls back to dark red, not the GM's near-black
    assert (entry["pen_font"], entry["ink_color"]) == ("Caveat", "#8b1a1a")


def test_add_entry_unknown_character_is_404(client):
    """Before tokens the character_id foreign key rejected unknown ids with a 500."""
    camp = support.new_campaign(client)
    r = _post(client, camp["id"], support.as_gm(camp), character_id=987654321)
    assert r.status_code == 404
    assert r.json() == {"detail": "Character not found"}


def test_add_entry_writes_only_as_the_caller(client):
    """Before tokens author name, type and character were whatever the client sent.
    The character must be the caller's own and a member of the campaign, a player
    must name one, and Lightkeeper entries (author_type gm, entry_type lightkeeper,
    visibility gm_only) are for the GM. The author name is set by the server: the
    character's name, or the GM's username (what the frontend sent). author_type is
    still client text within those rules."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    stranger = support.forge(client)
    as_member = support.as_owner(member["id"])
    assert _post(client, camp["id"], as_member, character_id=stranger["id"]).status_code == 403
    assert _post(client, camp["id"], support.as_gm(camp), character_id=member["id"]).status_code == 403
    for gm_fields in ({"author_type": "gm"}, {"entry_type": "lightkeeper"}, {"visibility": "gm_only"}):
        r = _post(client, camp["id"], as_member, character_id=member["id"], **gm_fields)
        assert r.status_code == 403, gm_fields
    # someone who is neither GM nor member, even with their own character
    assert _post(client, camp["id"], support.as_owner(stranger["id"]), character_id=stranger["id"]).status_code == 403
    # a player must write as a character, and one that is in this campaign
    assert _post(client, camp["id"], as_member).status_code == 403
    elsewhere = support.active_member(client, support.new_campaign(client), user_id=support.owner_id(member["id"]))
    assert _post(client, camp["id"], as_member, character_id=elsewhere["id"]).status_code == 403
    assert support.fetch_all(NotebookEntry, campaign_id=camp["id"]) == []
    entry = _add(client, camp["id"], author_name="The Lightkeeper", author_type="gm",
                 entry_type="lightkeeper", visibility="gm_only")
    assert (entry["author_name"], entry["author_type"], entry["character_id"]) == (_gm_name(camp), "gm", None)
    entry = _add(client, camp["id"], author_name="Lightkeeper", character_id=member["id"])
    assert (entry["author_name"], entry["character_id"]) == (member["name"], member["id"])


def test_add_entry_unknown_campaign_is_404(client):
    """Before tokens the campaign foreign key rejected unknown ids with a 500."""
    r = _post(client, 987654321, support.as_stranger())
    assert r.status_code == 404
    assert r.json() == {"detail": "Campaign not found"}


def test_add_entry_validation(client):
    camp = support.new_campaign(client)
    r = client.post(f"/api/notebook/{camp['id']}/entries", json={"content": "y", "author_name": "a",
                                                                 "author_type": "player"},
                    headers=support.as_gm(camp))
    assert r.status_code == 422


def test_list_entries_visibility(client):
    camp = support.new_campaign(client)
    me = support.active_member(client, camp)
    other = support.active_member(client, camp)
    public = _add(client, camp["id"])
    secret = _add(client, camp["id"], visibility="gm_only", author_type="gm")
    mine = _add(client, camp["id"], visibility="self", character_id=me["id"])
    theirs = _add(client, camp["id"], visibility="self", character_id=other["id"])
    orphan_self = _add(client, camp["id"], visibility="self")
    odd = _add(client, camp["id"], visibility="party")
    as_me, as_gm = support.as_owner(me["id"]), support.as_gm(camp)

    def ids(headers, **params):
        r = client.get(f"/api/notebook/{camp['id']}/entries", params=params, headers=headers)
        assert r.status_code == 200
        return [e["id"] for e in r.json()]

    assert ids(as_me) == [public["id"]]
    assert ids(as_me, character_id=me["id"]) == [public["id"], mine["id"]]
    assert ids(as_gm, role="GM") == [public["id"], secret["id"]]
    # The GM does not see players' self entries; unknown visibilities are hidden from all.
    assert theirs["id"] not in ids(as_gm, role="GM")
    assert orphan_self["id"] not in ids(as_gm, role="GM") and odd["id"] not in ids(as_gm, role="GM")


def test_list_entries_role_gm_only_for_the_gm(client):
    """Before tokens anyone could pass role=GM and read the Lightkeeper's private notes."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    secret = _add(client, camp["id"], visibility="gm_only", author_type="gm")
    r = client.get(f"/api/notebook/{camp['id']}/entries", params={"role": "GM"},
                   headers=support.as_owner(member["id"]))
    assert r.status_code == 403
    got = client.get(f"/api/notebook/{camp['id']}/entries", params={"role": "GM"},
                     headers=support.as_gm(camp)).json()
    assert secret["id"] in [e["id"] for e in got]


def test_list_entries_character_id_must_be_the_callers(client):
    """Before tokens any caller could pass another character's id and read its private notes."""
    camp = support.new_campaign(client)
    victim = support.active_member(client, camp)
    snoop = support.active_member(client, camp)
    private = _add(client, camp["id"], visibility="self", character_id=victim["id"])
    url = f"/api/notebook/{camp['id']}/entries"
    for headers in (support.as_owner(snoop["id"]), support.as_gm(camp)):
        assert client.get(url, params={"character_id": victim["id"]}, headers=headers).status_code == 403
    r = client.get(url, params={"character_id": 987654321}, headers=support.as_owner(snoop["id"]))
    assert r.status_code == 404
    got = client.get(url, params={"character_id": victim["id"]}, headers=support.as_owner(victim["id"])).json()
    assert private["id"] in [e["id"] for e in got]


def test_list_entries_with_an_empty_character_id(client):
    """Fixed: the GM's notebook sends character_id= (empty) when the GM has no
    character, which was a 422, so the GM saw an empty notebook. An empty value now
    means no character; the role is still checked against the token."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    public = _add(client, camp["id"])
    secret = _add(client, camp["id"], visibility="gm_only", author_type="gm")
    url = f"/api/notebook/{camp['id']}/entries"
    r = client.get(f"{url}?role=GM&character_id=", headers=support.as_gm(camp))
    assert r.status_code == 200
    assert [e["id"] for e in r.json()] == [public["id"], secret["id"]]
    r = client.get(f"{url}?role=player&character_id=", headers=support.as_owner(member["id"]))
    assert [e["id"] for e in r.json()] == [public["id"]]
    assert client.get(f"{url}?role=GM&character_id=", headers=support.as_owner(member["id"])).status_code == 403
    assert client.get(f"{url}?character_id=abc", headers=support.as_gm(camp)).status_code == 422


def test_list_entries_for_gm_and_members_only(client):
    camp = support.new_campaign(client)
    _add(client, camp["id"])
    outsider = support.active_member(client, support.new_campaign(client))
    for headers in (support.as_owner(outsider["id"]), support.as_stranger()):
        assert client.get(f"/api/notebook/{camp['id']}/entries", headers=headers).status_code == 403


def test_list_entries_ordered_by_page_and_unknown_campaign_is_404(client):
    """Before tokens an unknown campaign answered 200 with an empty list."""
    camp = support.new_campaign(client)
    made = [_add(client, camp["id"])["id"] for _ in range(3)]
    got = client.get(f"/api/notebook/{camp['id']}/entries", headers=support.as_gm(camp)).json()
    assert [e["id"] for e in got] == made
    assert [e["page_number"] for e in got] == [1, 2, 3]
    assert client.get("/api/notebook/987654321/entries", headers=support.as_stranger()).status_code == 404


def test_update_entry(client):
    camp = support.new_campaign(client)
    e = _add(client, camp["id"], content="old")
    gm = support.as_gm(camp)
    r = client.put(f"/api/notebook/entries/{e['id']}", json={"title": "New title"}, headers=gm)
    assert r.status_code == 200
    assert set(r.json()) == ENTRY_KEYS
    assert (r.json()["title"], r.json()["content"]) == ("New title", "old")
    r = client.put(f"/api/notebook/entries/{e['id']}", json={"content": "new"}, headers=gm)
    assert (r.json()["title"], r.json()["content"]) == ("New title", "new")
    r = client.put(f"/api/notebook/entries/{e['id']}", json={}, headers=gm)
    assert (r.json()["title"], r.json()["content"]) == ("New title", "new")


def test_update_entry_not_found(client):
    r = client.put("/api/notebook/entries/987654321", json={"title": "x"}, headers=support.as_stranger())
    assert r.status_code == 404
    assert r.json() == {"detail": "Entry not found"}


def test_update_and_delete_only_by_the_author(client):
    """Before tokens any caller could edit or delete any entry. A character's entry
    belongs to the character's owner; an entry without a character to the GM."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    other = support.active_member(client, camp)
    lk = _add(client, camp["id"], author_type="gm", entry_type="lightkeeper", visibility="gm_only")
    mine = _add(client, camp["id"], character_id=member["id"])
    for entry, outsiders in ((lk, (support.as_owner(member["id"]), support.as_stranger())),
                             (mine, (support.as_owner(other["id"]), support.as_gm(camp)))):
        for headers in outsiders:
            r = client.put(f"/api/notebook/entries/{entry['id']}", json={"content": "defaced"}, headers=headers)
            assert r.status_code == 403
            assert client.delete(f"/api/notebook/entries/{entry['id']}", headers=headers).status_code == 403
        row = support.fetch(NotebookEntry, entry["id"])
        assert (row.content, row.is_deleted) == ("words", False)
    r = client.put(f"/api/notebook/entries/{lk['id']}", json={"content": "revised"}, headers=support.as_gm(camp))
    assert (r.status_code, r.json()["content"], r.json()["title"]) == (200, "revised", lk["title"])
    r = client.put(f"/api/notebook/entries/{mine['id']}", json={"content": "mine"},
                   headers=support.as_owner(member["id"]))
    assert (r.status_code, r.json()["content"]) == (200, "mine")
    row = support.fetch(NotebookEntry, lk["id"])
    assert (row.content, row.author_type, row.visibility) == ("revised", "gm", "gm_only")


@pytest.mark.parametrize("role", ["gm", "Gm", "GM ", "lightkeeper"])
def test_list_entries_gm_role_must_match_exactly(client, role):
    camp = support.new_campaign(client)
    public = _add(client, camp["id"])
    _add(client, camp["id"], visibility="gm_only", author_type="gm")
    got = client.get(f"/api/notebook/{camp['id']}/entries", params={"role": role}, headers=support.as_gm(camp)).json()
    assert [e["id"] for e in got] == [public["id"]]


def test_delete_entry_is_soft(client):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    e = _add(client, camp["id"])
    r = client.delete(f"/api/notebook/entries/{e['id']}", headers=gm)
    assert r.status_code == 204
    assert r.content == b""
    row = support.fetch(NotebookEntry, e["id"])
    assert row is not None and row.is_deleted is True
    assert client.get(f"/api/notebook/{camp['id']}/entries", headers=gm).json() == []
    # QUIRK: a deleted entry can still be edited and deleted again.
    r = client.put(f"/api/notebook/entries/{e['id']}", json={"title": "ghost"}, headers=gm)
    assert r.status_code == 200 and r.json()["is_deleted"] is True
    assert client.delete(f"/api/notebook/entries/{e['id']}", headers=gm).status_code == 204
    # the next page number still counts the deleted entry
    assert _add(client, camp["id"])["page_number"] == 2


def test_delete_entry_not_found(client):
    r = client.delete("/api/notebook/entries/987654321", headers=support.as_stranger())
    assert r.status_code == 404
    assert r.json() == {"detail": "Entry not found"}


def test_upload_image(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    raw = b"GIF89a-not-really"
    r = client.post(f"/api/notebook/{camp['id']}/upload",
                    files={"file": ("x.gif", raw, "image/gif")},
                    data={"title": "Map", "content": "the cellar", "author_name": "Ada",
                          "author_type": "player", "character_id": str(member["id"])},
                    headers=support.as_owner(member["id"]))
    assert r.status_code == 201
    body = r.json()
    # hand-built response: no author_type key
    assert set(body) == ENTRY_KEYS - {"author_type"}
    assert body["image_data"] == "data:image/gif;base64," + base64.b64encode(raw).decode()
    assert (body["title"], body["content"], body["author_name"]) == ("Map", "the cellar", member["name"])
    assert (body["entry_type"], body["visibility"]) == ("sketch", "all")
    assert body["character_id"] == member["id"]
    assert body["ink_color"] == engine.INK_COLORS[0]
    assert body["page_number"] == 1
    assert support.fetch(NotebookEntry, body["id"]).author_type == "player"


def test_upload_only_by_gm_and_members_as_themselves(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    other = support.active_member(client, camp)
    url = f"/api/notebook/{camp['id']}/upload"

    def upload(headers, **data):
        return client.post(url, files={"file": ("a.png", b"\x89PNG", "image/png")}, data=data, headers=headers)

    assert upload(support.as_stranger()).status_code == 403
    assert upload(support.as_owner(other["id"]), character_id=str(member["id"])).status_code == 403
    assert upload(support.as_owner(member["id"]), author_type="gm").status_code == 403
    assert upload(support.as_owner(member["id"]), character_id="987654321").status_code == 404
    assert upload(support.as_owner(member["id"])).status_code == 403  # a player names a character
    r = client.post("/api/notebook/987654321/upload", files={"file": ("a.png", b"\x89PNG", "image/png")},
                    headers=support.as_stranger())
    assert r.status_code == 404
    assert support.fetch_all(NotebookEntry, campaign_id=camp["id"]) == []


def test_upload_defaults_and_client_content_type(client):
    """QUIRK: the client's content type goes into the stored data URI unchecked."""
    camp = support.new_campaign(client)
    r = client.post(f"/api/notebook/{camp['id']}/upload",
                    files={"file": ("x.html", b"<b>hi</b>", "text/html")}, headers=support.as_gm(camp))
    body = r.json()
    assert body["image_data"].startswith("data:text/html;base64,")
    assert (body["title"], body["content"], body["author_name"]) == ("Attached Image", "", _gm_name(camp))
    assert (body["pen_font"], body["ink_color"]) == ("Caveat", "#1a1a1a")


def test_upload_too_large(client):
    camp = support.new_campaign(client)
    gm = support.as_gm(camp)
    r = client.post(f"/api/notebook/{camp['id']}/upload",
                    files={"file": ("big.png", b"0" * (2 * 1024 * 1024 + 1), "image/png")}, headers=gm)
    assert r.status_code == 413
    assert r.json() == {"detail": "Image too large (max 2MB)"}
    ok = client.post(f"/api/notebook/{camp['id']}/upload",
                     files={"file": ("max.png", b"0" * (2 * 1024 * 1024), "image/png")}, headers=gm)
    assert ok.status_code == 201


def test_upload_requires_file(client):
    camp = support.new_campaign(client)
    r = client.post(f"/api/notebook/{camp['id']}/upload", data={"title": "x"}, headers=support.as_gm(camp))
    assert r.status_code == 422


@pytest.mark.parametrize("unknown", [987654321, 2 ** 31, 10 ** 12])
def test_unknown_ids_are_404_on_every_notebook_call(client, unknown):
    """Before the login token stage an unknown character_id or campaign_id reached the
    foreign key and answered 500. Every notebook call now answers 404 for an id that
    names nothing, including ids too large for the database's integer columns."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    gm, player = support.as_gm(camp), support.as_owner(member["id"])
    png = {"file": ("a.png", b"\x89PNG", "image/png")}
    with support.server_errors_as_500(client):
        calls = {
            "list, campaign": client.get(f"/api/notebook/{unknown}/entries", headers=gm),
            "list, character": client.get(f"/api/notebook/{camp['id']}/entries",
                                          params={"character_id": unknown}, headers=player),
            "add, campaign": _post(client, unknown, gm),
            "add, character": _post(client, camp["id"], player, character_id=unknown),
            "edit": client.put(f"/api/notebook/entries/{unknown}", json={"title": "x"}, headers=gm),
            "delete": client.delete(f"/api/notebook/entries/{unknown}", headers=gm),
            "upload, campaign": client.post(f"/api/notebook/{unknown}/upload", files=png, headers=gm),
            "upload, character": client.post(f"/api/notebook/{camp['id']}/upload", files=png,
                                             data={"character_id": str(unknown)}, headers=player),
        }
    assert {name: r.status_code for name, r in calls.items()} == {name: 404 for name in calls}
    assert support.fetch_all(NotebookEntry, campaign_id=camp["id"]) == []
