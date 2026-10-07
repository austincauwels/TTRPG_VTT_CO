"""/api/notebook routes."""
import base64
import json

import pytest

import engine
import main
import support
from models import Character, NotebookEntry, User
from vtt.sketch_scenes import SCENE_MAX_BYTES

ENTRY_KEYS = {"id", "campaign_id", "character_id", "author_name", "author_type", "pen_font",
              "ink_color", "title", "content", "created_at", "page_number", "entry_type",
              "visibility", "image_data", "is_deleted", "has_scene"}


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
    assert body["has_scene"] is False
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
    newcomer = support.active_member(client, camp)
    support.update(Character, newcomer["id"], ink_color="")
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
    assert body["has_scene"] is False  # an uploaded picture has no drawing to reopen
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
            "scene": client.get(f"/api/notebook/entries/{unknown}/scene", headers=gm),
            "redraw": client.put(f"/api/notebook/entries/{unknown}/sketch",
                                 files={**png, "scene": ("scene.json", _scene_bytes(), "application/json")},
                                 headers=gm),
        }
    assert {name: r.status_code for name, r in calls.items()} == {name: 404 for name in calls}
    assert support.fetch_all(NotebookEntry, campaign_id=camp["id"]) == []


# --- drawn sketches: the picture for everyone, the drawing for its author ---------

PNG = b"\x89PNG\r\n\x1a\n" + b"\0" * 32  # a redrawn sketch's picture must start like a PNG


def _element(type_, **fields):
    return {"id": f"el-{support.uid()}", "type": type_, "x": 0, "y": 0, "width": 10, "height": 10,
            "strokeColor": "#8b1a1a", "isDeleted": False, **fields}


def _scene_bytes(*elements, **extra):
    """An Excalidraw scene as the sheet sends it (one pen stroke unless elements are given)."""
    elements = list(elements) or [_element("freedraw", points=[[0, 0], [4, 5]])]
    return json.dumps({"type": "excalidraw", "version": 2, "source": "https://excalidraw.com",
                       "elements": elements, **extra}).encode()


def _draw(client, camp, member=None, scene=None, **data):
    """Uploads a drawn sketch, its picture and its scene, as the member or as the GM."""
    fields = {"title": "The cellar", "entry_type": "sketch", **data}
    if member is not None:
        fields["character_id"] = str(member["id"])
    files = {"file": ("sketch.png", PNG, "image/png"),
             "scene": ("scene.json", _scene_bytes() if scene is None else scene, "application/json")}
    headers = support.as_owner(member["id"]) if member is not None else support.as_gm(camp)
    return client.post(f"/api/notebook/{camp['id']}/upload", files=files, data=fields, headers=headers)


def _redraw_files(png=PNG, scene=None):
    return {"file": ("sketch.png", png, "image/png"),
            "scene": ("scene.json", _scene_bytes() if scene is None else scene, "application/json")}


def _stored_scene(entry_id):
    """The scene as stored (the column is deferred, so a detached row does not carry it)."""
    with main.SessionLocal() as s:
        return s.query(NotebookEntry.sketch_scene).filter(NotebookEntry.id == entry_id).scalar()


def test_drawn_sketch_keeps_its_drawing_for_the_author(client):
    """Everyone sees a drawn sketch's picture and has_scene; no list carries the scene.
    The author reads it back."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    other = support.active_member(client, camp)
    r = _draw(client, camp, member)
    assert r.status_code == 201, r.text
    body = r.json()
    assert set(body) == ENTRY_KEYS - {"author_type"}
    assert (body["entry_type"], body["has_scene"]) == ("sketch", True)
    assert body["image_data"] == "data:image/png;base64," + base64.b64encode(PNG).decode()
    for headers in (support.as_owner(other["id"]), support.as_gm(camp), support.as_owner(member["id"])):
        r = client.get(f"/api/notebook/{camp['id']}/entries", headers=headers)
        assert r.status_code == 200
        (listed,) = [e for e in r.json() if e["id"] == body["id"]]
        assert set(listed) == ENTRY_KEYS
        assert (listed["has_scene"], listed["image_data"]) == (True, body["image_data"])
        assert "freedraw" not in r.text and "elements" not in r.text
    r = client.get(f"/api/notebook/entries/{body['id']}/scene", headers=support.as_owner(member["id"]))
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/json"
    scene = r.json()
    assert set(scene) == {"type", "version", "elements"}
    assert [e["type"] for e in scene["elements"]] == ["freedraw"]


def test_scene_keeps_only_the_sheets_own_elements(client):
    """Only the sheet's tools' elements are stored. Images, embeds, frames and other
    kinds, elements marked deleted, the scene's files and its appState are dropped, and
    no element keeps a link or customData."""
    camp = support.new_campaign(client)
    kept = [_element(t) for t in ("freedraw", "line", "arrow", "rectangle", "ellipse", "text")]
    kept[3]["link"] = "javascript:alert(1)"
    kept[4]["customData"] = {"secret": 1}
    dropped = [_element(t) for t in ("image", "embeddable", "iframe", "frame", "magicframe", "diamond")]
    dropped.append(_element("rectangle", isDeleted=True))
    scene = _scene_bytes(*kept, *dropped, files={"f": {"dataURL": "data:image/png;base64,AAAA"}},
                         appState={"viewBackgroundColor": "#000000"})
    r = _draw(client, camp, scene=scene)
    assert r.status_code == 201, r.text
    stored = json.loads(_stored_scene(r.json()["id"]))
    assert set(stored) == {"type", "version", "elements"}
    assert [e["id"] for e in stored["elements"]] == [e["id"] for e in kept]
    assert stored["elements"][3]["link"] is None
    assert "customData" not in stored["elements"][4]
    assert stored["elements"][0] == kept[0]


def test_drawing_read_and_redrawn_only_by_the_author(client):
    """Another member, the campaign's GM and a stranger get 403 for a player's drawing,
    and a member for the GM's own, whether reading it or redrawing it; nothing changes."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    other = support.active_member(client, camp)
    mine = _draw(client, camp, member).json()
    gms = _draw(client, camp).json()
    for entry, outsiders in ((mine, (support.as_owner(other["id"]), support.as_gm(camp), support.as_stranger())),
                             (gms, (support.as_owner(member["id"]), support.as_stranger()))):
        before = _stored_scene(entry["id"])
        for headers in outsiders:
            assert client.get(f"/api/notebook/entries/{entry['id']}/scene", headers=headers).status_code == 403
            r = client.put(f"/api/notebook/entries/{entry['id']}/sketch",
                           files=_redraw_files(PNG + b"defaced"), headers=headers)
            assert r.status_code == 403
        assert _stored_scene(entry["id"]) == before
        assert support.fetch(NotebookEntry, entry["id"]).image_data == entry["image_data"]
    assert client.get(f"/api/notebook/entries/{gms['id']}/scene", headers=support.as_gm(camp)).status_code == 200
    assert client.get(f"/api/notebook/entries/{mine['id']}/scene",
                      headers=support.as_owner(member["id"])).status_code == 200


def test_redraw_replaces_the_picture_and_the_drawing(client):
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    me = support.as_owner(member["id"])
    entry = _draw(client, camp, member).json()
    line = _element("line", points=[[0, 0], [9, 9]])
    newer = PNG + b"redrawn"
    r = client.put(f"/api/notebook/entries/{entry['id']}/sketch", files=_redraw_files(newer, _scene_bytes(line)),
                   headers=me)
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == ENTRY_KEYS
    assert body["image_data"] == "data:image/png;base64," + base64.b64encode(newer).decode()
    assert (body["has_scene"], body["title"], body["page_number"], body["content"]) == \
        (True, entry["title"], entry["page_number"], entry["content"])
    scene = client.get(f"/api/notebook/entries/{entry['id']}/scene", headers=me).json()
    assert [e["id"] for e in scene["elements"]] == [line["id"]]
    # a sketch uploaded as a picture has no drawing until its author draws on it
    picture = client.post(f"/api/notebook/{camp['id']}/upload", files={"file": ("p.png", PNG, "image/png")},
                          data={"title": "Map", "character_id": str(member["id"])}, headers=me).json()
    assert picture["has_scene"] is False
    r = client.get(f"/api/notebook/entries/{picture['id']}/scene", headers=me)
    assert (r.status_code, r.json()) == (404, {"detail": "This sketch keeps no drawing."})
    r = client.put(f"/api/notebook/entries/{picture['id']}/sketch", files=_redraw_files(), headers=me)
    assert (r.status_code, r.json()["has_scene"]) == (200, True)


@pytest.mark.parametrize("scene, status", [
    (b"x" * (SCENE_MAX_BYTES + 1), 413),
    (b"", 422),
    (b"not json", 422),
    (b"\xff\xfe\x00", 422),
    (b"[]", 422),
    (b'{"type": "excalidraw"}', 422),
    (b'{"elements": {}}', 422),
    (b'{"elements": ["rectangle"]}', 422),
    (b"[" * 100000 + b"]" * 100000, 422),
], ids=["too large", "empty", "not json", "not utf-8", "a list", "no elements", "elements not a list",
        "element not an object", "nested too deep"])
def test_drawing_refused_when_too_large_or_not_a_drawing(client, scene, status):
    """The scene is read at most SCENE_MAX_BYTES before it is parsed (413 beyond), then
    must be a JSON object with an "elements" list of objects (422). Nothing is stored."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    me = support.as_owner(member["id"])
    r = _draw(client, camp, member, scene=scene)
    assert r.status_code == status, r.text
    assert support.fetch_all(NotebookEntry, campaign_id=camp["id"]) == []
    entry = _draw(client, camp, member).json()
    before = _stored_scene(entry["id"])
    r = client.put(f"/api/notebook/entries/{entry['id']}/sketch", files=_redraw_files(PNG + b"x", scene), headers=me)
    assert r.status_code == status, r.text
    assert _stored_scene(entry["id"]) == before
    assert support.fetch(NotebookEntry, entry["id"]).image_data == entry["image_data"]


def test_drawing_at_the_size_limit_is_kept(client):
    camp = support.new_campaign(client)
    scene = _scene_bytes()
    r = _draw(client, camp, scene=scene + b" " * (SCENE_MAX_BYTES - len(scene)))
    assert (r.status_code, r.json()["has_scene"]) == (201, True)


def test_a_drawing_belongs_to_a_live_sketch(client):
    """Only a sketch takes a drawing (422 for a photo or a written entry), a redrawn
    picture must be a PNG of at most 2 MB and is required, and a deleted sketch's
    drawing is gone with it (404)."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    me = support.as_owner(member["id"])
    r = _draw(client, camp, member, entry_type="photo")
    assert (r.status_code, r.json()) == (422, {"detail": "Only a sketch keeps a drawing."})
    assert support.fetch_all(NotebookEntry, campaign_id=camp["id"]) == []
    note = _add(client, camp["id"], character_id=member["id"])
    r = client.put(f"/api/notebook/entries/{note['id']}/sketch", files=_redraw_files(), headers=me)
    assert (r.status_code, r.json()) == (422, {"detail": "Only a sketch keeps a drawing."})
    r = client.get(f"/api/notebook/entries/{note['id']}/scene", headers=me)
    assert (r.status_code, r.json()) == (404, {"detail": "This sketch keeps no drawing."})
    sketch = _draw(client, camp, member).json()
    url = f"/api/notebook/entries/{sketch['id']}/sketch"
    r = client.put(url, files={**_redraw_files(), "file": ("s.gif", b"GIF89a....", "image/gif")}, headers=me)
    assert (r.status_code, r.json()) == (422, {"detail": "The sketch must be a PNG picture."})
    r = client.put(url, files=_redraw_files(PNG + b"0" * (2 * 1024 * 1024)), headers=me)
    assert (r.status_code, r.json()) == (413, {"detail": "Image too large (max 2MB)"})
    assert client.put(url, files={"scene": ("s.json", _scene_bytes(), "application/json")},
                      headers=me).status_code == 422
    assert support.fetch(NotebookEntry, sketch["id"]).image_data == sketch["image_data"]
    assert _stored_scene(sketch["id"]) is not None
    assert client.delete(f"/api/notebook/entries/{sketch['id']}", headers=me).status_code == 204
    r = client.get(f"/api/notebook/entries/{sketch['id']}/scene", headers=me)
    assert (r.status_code, r.json()) == (404, {"detail": "Entry not found"})
    assert client.put(url, files=_redraw_files(), headers=me).status_code == 404


def test_redraw_with_the_picture_alone_drops_the_drawing(client):
    """A drawing too large to keep is saved as its picture alone: a redraw without a
    scene replaces the picture, and the sketch keeps no drawing after it (has_scene
    false, the scene 404). Only the author, as for every redraw."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    me = support.as_owner(member["id"])
    entry = _draw(client, camp, member).json()
    url = f"/api/notebook/entries/{entry['id']}/sketch"
    picture_only = {"file": ("sketch.png", PNG + b"picture only", "image/png")}
    for headers in (support.as_gm(camp), support.as_owner(support.active_member(client, camp)["id"])):
        assert client.put(url, files=picture_only, headers=headers).status_code == 403
    assert _stored_scene(entry["id"]) is not None
    r = client.put(url, files=picture_only, headers=me)
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == ENTRY_KEYS
    assert body["image_data"] == "data:image/png;base64," + base64.b64encode(PNG + b"picture only").decode()
    assert (body["has_scene"], body["title"], body["page_number"]) == (False, entry["title"], entry["page_number"])
    assert _stored_scene(entry["id"]) is None
    r = client.get(f"/api/notebook/entries/{entry['id']}/scene", headers=me)
    assert (r.status_code, r.json()) == (404, {"detail": "This sketch keeps no drawing."})
    (listed,) = [e for e in client.get(f"/api/notebook/{camp['id']}/entries", headers=me).json()
                 if e["id"] == entry["id"]]
    assert listed["has_scene"] is False


def test_drawn_sketch_and_redraw_do_not_broadcast(client):
    """Like every upload, a drawn sketch sends no socket message, so no frame ever
    carries a scene; a redraw sends none either."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as mem:
        entry = _draw(client, camp, member).json()
        r = client.put(f"/api/notebook/entries/{entry['id']}/sketch", files=_redraw_files(),
                       headers=support.as_owner(member["id"]))
        assert r.status_code == 200
        assert gm.drain() == [] and mem.drain() == []


def _upload_sketch(client, camp, member, title, entry_type="sketch"):
    r = client.post(f"/api/notebook/{camp['id']}/upload",
                    files={"file": ("s.png", b"\x89PNG-" + title.encode(), "image/png")},
                    data={"title": title, "author_type": "player", "entry_type": entry_type,
                          "character_id": str(member["id"])},
                    headers=support.as_owner(member["id"]))
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_hub_sketches_come_from_the_users_own_notebooks(client):
    """The chapter hub lays a few notebook sketches on its desk (owner's request,
    2026-10-07), chosen at random: only from campaigns the user runs or plays in with an
    active investigator, only sketches the whole table sees, and no more than three."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    ids = [_upload_sketch(client, camp, member, f"Sketch {n}") for n in range(4)]
    hidden = _upload_sketch(client, camp, member, "Mine only")
    support.update(NotebookEntry, hidden, visibility="self")
    gone = _upload_sketch(client, camp, member, "Torn out")
    support.update(NotebookEntry, gone, is_deleted=True)
    _upload_sketch(client, camp, member, "A photograph", entry_type="photo")

    got = client.get("/api/notebook/hub-sketches", headers=support.as_owner(member["id"])).json()
    assert len(got) == 3 and {s["id"] for s in got} <= set(ids)
    assert set(got[0]) == {"id", "title", "author_name", "image_data"}
    assert got[0]["image_data"].startswith("data:image/png;base64,")
    assert {s["id"] for s in client.get("/api/notebook/hub-sketches", headers=support.as_gm(camp)).json()} <= set(ids)
    # Someone else, and someone still waiting for approval, see none of them
    assert client.get("/api/notebook/hub-sketches", headers=support.as_stranger()).json() == []
    waiting = support.pending_member(client, camp)
    assert client.get("/api/notebook/hub-sketches", headers=support.as_owner(waiting["id"])).json() == []
    assert client.get("/api/notebook/hub-sketches").status_code == 401
