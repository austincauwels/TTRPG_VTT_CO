"""/api/notebook routes."""
import base64

import pytest

import engine
import support
from models import NotebookEntry

ENTRY_KEYS = {"id", "campaign_id", "character_id", "author_name", "author_type", "pen_font",
              "ink_color", "title", "content", "created_at", "page_number", "entry_type",
              "visibility", "image_data", "is_deleted"}


def _add(client, campaign_id, **fields):
    body = {"title": f"T {support.uid()}", "content": "words", "author_name": "Ada",
            "author_type": "player", **fields}
    r = client.post(f"/api/notebook/{campaign_id}/entries", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_add_entry(client):
    camp = support.new_campaign(client)
    r = client.post(f"/api/notebook/{camp['id']}/entries", json={
        "title": "Day one", "content": "We met.", "author_name": "LK", "author_type": "gm"})
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
    loner = support.forge(client)
    entry = _add(client, camp["id"], character_id=loner["id"])
    # a character without ink falls back to dark red, not the GM's near-black
    assert (entry["pen_font"], entry["ink_color"]) == ("Caveat", "#8b1a1a")


def test_add_entry_unknown_character_is_500(client):
    """On PostgreSQL the character_id foreign key rejects unknown ids (unhandled)."""
    camp = support.new_campaign(client)
    with support.server_errors_as_500(client):
        r = client.post(f"/api/notebook/{camp['id']}/entries", json={
            "title": "x", "content": "y", "author_name": "a", "author_type": "player",
            "character_id": 987654321})
    assert r.status_code == 500


@pytest.mark.legacy_trust
def test_add_entry_trusts_author_fields(client):
    """Author name, type and character are whatever the client sends."""
    camp = support.new_campaign(client)
    stranger = support.forge(client)
    entry = _add(client, camp["id"], author_name="The Lightkeeper", author_type="gm",
                 character_id=stranger["id"], entry_type="lightkeeper", visibility="gm_only")
    assert (entry["author_name"], entry["author_type"], entry["character_id"]) == (
        "The Lightkeeper", "gm", stranger["id"])


def test_add_entry_unknown_campaign_is_500(client):
    with support.server_errors_as_500(client):
        r = client.post("/api/notebook/987654321/entries", json={
            "title": "x", "content": "y", "author_name": "a", "author_type": "player"})
    assert r.status_code == 500


def test_add_entry_validation(client):
    camp = support.new_campaign(client)
    r = client.post(f"/api/notebook/{camp['id']}/entries", json={"content": "y", "author_name": "a",
                                                                 "author_type": "player"})
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

    def ids(**params):
        r = client.get(f"/api/notebook/{camp['id']}/entries", params=params)
        assert r.status_code == 200
        return [e["id"] for e in r.json()]

    assert ids() == [public["id"]]
    assert ids(character_id=me["id"]) == [public["id"], mine["id"]]
    assert ids(role="GM") == [public["id"], secret["id"]]
    # The GM does not see players' self entries; unknown visibilities are hidden from all.
    assert theirs["id"] not in ids(role="GM", character_id=me["id"])
    assert orphan_self["id"] not in ids(role="GM") and odd["id"] not in ids(role="GM")


@pytest.mark.legacy_trust
def test_list_entries_role_gm_is_client_claimed(client):
    """Anyone can pass role=GM and read the Lightkeeper's private notes."""
    camp = support.new_campaign(client)
    secret = _add(client, camp["id"], visibility="gm_only", author_type="gm")
    got = client.get(f"/api/notebook/{camp['id']}/entries", params={"role": "GM"}).json()
    assert secret["id"] in [e["id"] for e in got]


@pytest.mark.legacy_trust
def test_list_entries_character_id_is_client_claimed(client):
    camp = support.new_campaign(client)
    victim = support.active_member(client, camp)
    private = _add(client, camp["id"], visibility="self", character_id=victim["id"])
    got = client.get(f"/api/notebook/{camp['id']}/entries", params={"character_id": victim["id"]}).json()
    assert private["id"] in [e["id"] for e in got]


def test_list_entries_ordered_by_page_and_unknown_campaign_empty(client):
    camp = support.new_campaign(client)
    made = [_add(client, camp["id"])["id"] for _ in range(3)]
    got = client.get(f"/api/notebook/{camp['id']}/entries").json()
    assert [e["id"] for e in got] == made
    assert [e["page_number"] for e in got] == [1, 2, 3]
    assert client.get("/api/notebook/987654321/entries").json() == []


def test_update_entry(client):
    camp = support.new_campaign(client)
    e = _add(client, camp["id"], content="old")
    r = client.put(f"/api/notebook/entries/{e['id']}", json={"title": "New title"})
    assert r.status_code == 200
    assert set(r.json()) == ENTRY_KEYS
    assert (r.json()["title"], r.json()["content"]) == ("New title", "old")
    r = client.put(f"/api/notebook/entries/{e['id']}", json={"content": "new"})
    assert (r.json()["title"], r.json()["content"]) == ("New title", "new")
    r = client.put(f"/api/notebook/entries/{e['id']}", json={})
    assert (r.json()["title"], r.json()["content"]) == ("New title", "new")


def test_update_entry_not_found(client):
    r = client.put("/api/notebook/entries/987654321", json={"title": "x"})
    assert r.status_code == 404
    assert r.json() == {"detail": "Entry not found"}


@pytest.mark.legacy_trust
def test_update_any_entry_without_author_check(client):
    camp = support.new_campaign(client)
    e = _add(client, camp["id"], author_type="gm", entry_type="lightkeeper", visibility="gm_only")
    r = client.put(f"/api/notebook/entries/{e['id']}", json={"content": "defaced"})
    assert r.status_code == 200
    assert (r.json()["content"], r.json()["title"]) == ("defaced", e["title"])
    row = support.fetch(NotebookEntry, e["id"])
    assert (row.content, row.author_type, row.visibility) == ("defaced", "gm", "gm_only")


@pytest.mark.parametrize("role", ["gm", "Gm", "GM ", "lightkeeper"])
def test_list_entries_gm_role_must_match_exactly(client, role):
    camp = support.new_campaign(client)
    public = _add(client, camp["id"])
    _add(client, camp["id"], visibility="gm_only", author_type="gm")
    got = client.get(f"/api/notebook/{camp['id']}/entries", params={"role": role}).json()
    assert [e["id"] for e in got] == [public["id"]]


def test_delete_entry_is_soft(client):
    camp = support.new_campaign(client)
    e = _add(client, camp["id"])
    r = client.delete(f"/api/notebook/entries/{e['id']}")
    assert r.status_code == 204
    assert r.content == b""
    row = support.fetch(NotebookEntry, e["id"])
    assert row is not None and row.is_deleted is True
    assert client.get(f"/api/notebook/{camp['id']}/entries").json() == []
    # QUIRK: a deleted entry can still be edited and deleted again.
    r = client.put(f"/api/notebook/entries/{e['id']}", json={"title": "ghost"})
    assert r.status_code == 200 and r.json()["is_deleted"] is True
    assert client.delete(f"/api/notebook/entries/{e['id']}").status_code == 204
    # the next page number still counts the deleted entry
    assert _add(client, camp["id"])["page_number"] == 2


def test_delete_entry_not_found(client):
    r = client.delete("/api/notebook/entries/987654321")
    assert r.status_code == 404
    assert r.json() == {"detail": "Entry not found"}


def test_upload_image(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    raw = b"GIF89a-not-really"
    r = client.post(f"/api/notebook/{camp['id']}/upload",
                    files={"file": ("x.gif", raw, "image/gif")},
                    data={"title": "Map", "content": "the cellar", "author_name": "Ada",
                          "author_type": "player", "character_id": str(member["id"])})
    assert r.status_code == 201
    body = r.json()
    # hand-built response: no author_type key
    assert set(body) == ENTRY_KEYS - {"author_type"}
    assert body["image_data"] == "data:image/gif;base64," + base64.b64encode(raw).decode()
    assert (body["title"], body["content"], body["author_name"]) == ("Map", "the cellar", "Ada")
    assert (body["entry_type"], body["visibility"]) == ("sketch", "all")
    assert body["character_id"] == member["id"]
    assert body["ink_color"] == engine.INK_COLORS[0]
    assert body["page_number"] == 1
    assert support.fetch(NotebookEntry, body["id"]).author_type == "player"


def test_upload_defaults_and_client_content_type(client):
    """QUIRK: the client's content type goes into the stored data URI unchecked."""
    camp = support.new_campaign(client)
    r = client.post(f"/api/notebook/{camp['id']}/upload",
                    files={"file": ("x.html", b"<b>hi</b>", "text/html")})
    body = r.json()
    assert body["image_data"].startswith("data:text/html;base64,")
    assert (body["title"], body["content"], body["author_name"]) == ("Attached Image", "", "Unknown")
    assert (body["pen_font"], body["ink_color"]) == ("Caveat", "#1a1a1a")


def test_upload_too_large(client):
    camp = support.new_campaign(client)
    r = client.post(f"/api/notebook/{camp['id']}/upload",
                    files={"file": ("big.png", b"0" * (2 * 1024 * 1024 + 1), "image/png")})
    assert r.status_code == 413
    assert r.json() == {"detail": "Image too large (max 2MB)"}
    ok = client.post(f"/api/notebook/{camp['id']}/upload",
                     files={"file": ("max.png", b"0" * (2 * 1024 * 1024), "image/png")})
    assert ok.status_code == 201


def test_upload_requires_file(client):
    camp = support.new_campaign(client)
    assert client.post(f"/api/notebook/{camp['id']}/upload", data={"title": "x"}).status_code == 422
