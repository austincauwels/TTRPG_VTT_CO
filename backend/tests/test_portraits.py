"""PUT /api/investigators/{id}/portrait, and the portrait rule it shares with forge.

The owner may set or clear a character's portrait, and so may the GM of its campaign
while the character is active or pending. The character's own channel gets
character_update; the campaign gets portrait_update (the GM and active members for an
active character, the GM alone for a pending one).
"""
import base64

import pytest
from fastapi import HTTPException

import support
from models import Character
from vtt import portraits

NOT_A_PICTURE = {"detail": "The portrait must be a picture (PNG, JPEG, GIF, WebP, AVIF, HEIC, BMP or TIFF)."}
TOO_LARGE = {"detail": "The portrait is too large. Choose a picture of at most 10 MB."}


def picture(n_bytes=40, kind="png"):
    raw = (b"\x89PNG\r\n\x1a\n" + bytes(range(256)) * (n_bytes // 256 + 1))[:n_bytes]
    return f"data:image/{kind};base64," + base64.b64encode(raw).decode()


def put(client, char_id, pic, headers=None):
    return client.put(f"/api/investigators/{char_id}/portrait", json={"profile_pic": pic},
                      headers=headers if headers is not None else support.as_owner(char_id))


def stored(char_id):
    return support.fetch(Character, char_id).profile_pic


# --- who may set it ------------------------------------------------------------------------

def test_the_owner_sets_a_portrait(client):
    ch = support.forge(client)
    pic = picture()
    r = put(client, ch["id"], pic)
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == support.CHAR_DICT_KEYS
    assert (body["id"], body["profile_pic"]) == (ch["id"], pic)
    assert stored(ch["id"]) == pic
    got = client.get(f"/api/investigators/{ch['id']}", headers=support.as_owner(ch["id"]))
    assert got.json()["profile_pic"] == pic


def test_the_owner_clears_the_portrait(client):
    ch = support.forge(client, profile_pic=picture())
    r = put(client, ch["id"], None)
    assert r.status_code == 200, r.text
    assert r.json()["profile_pic"] is None
    assert stored(ch["id"]) is None


def test_an_empty_string_clears_the_portrait_too(client):
    ch = support.forge(client, profile_pic=picture())
    assert put(client, ch["id"], "").status_code == 200
    assert stored(ch["id"]) is None


def test_the_owner_may_change_a_retired_or_unaffiliated_character(client):
    loose = support.forge(client)
    assert put(client, loose["id"], picture()).status_code == 200
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    client.post(f"/campaign/{camp['id']}/retire", headers=support.as_gm(camp))
    assert support.fetch(Character, ch["id"]).status == "retired"
    assert put(client, ch["id"], picture()).status_code == 200


@pytest.mark.parametrize("status", ["active", "pending"])
def test_the_gm_sets_a_portrait_on_the_roster(client, status):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp) if status == "active" else support.pending_member(client, camp)
    pic = picture()
    r = put(client, ch["id"], pic, headers=support.as_gm(camp))
    assert r.status_code == 200, r.text
    assert stored(ch["id"]) == pic
    assert put(client, ch["id"], None, headers=support.as_gm(camp)).status_code == 200
    assert stored(ch["id"]) is None


def test_the_gm_may_not_change_a_retired_character(client):
    """A retired character stays tagged with its old campaign; that GM no longer runs it."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    gm_headers = support.as_gm(camp)
    client.post(f"/campaign/{camp['id']}/retire", headers=gm_headers)
    r = put(client, ch["id"], picture(), headers=gm_headers)
    assert r.status_code == 403
    assert r.json() == {"detail": "Not allowed."}
    assert stored(ch["id"]) is None


def test_others_may_not_set_a_portrait(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, profile_pic=picture(10))
    fellow = support.active_member(client, camp)
    other_gm = support.new_campaign(client)
    for headers in (support.as_stranger(), support.as_owner(fellow["id"]), support.as_gm(other_gm)):
        r = put(client, ch["id"], picture(), headers=headers)
        assert r.status_code == 403
        assert r.json() == {"detail": "Not allowed."}
    assert stored(ch["id"]) == picture(10)


def test_a_stranger_is_refused_before_the_picture_is_checked(client):
    """Nobody learns the rules of a character they may not touch."""
    ch = support.forge(client)
    assert put(client, ch["id"], "not a picture", headers=support.as_stranger()).status_code == 403


def test_unknown_character_is_404(client):
    r = put(client, 2_000_000_000, picture(), headers=support.as_stranger())
    assert r.status_code == 404
    assert r.json() == {"detail": "Investigator dossier not found."}


def test_without_a_token_is_401(client):
    ch = support.forge(client)
    r = client.put(f"/api/investigators/{ch['id']}/portrait", json={"profile_pic": picture()})
    assert r.status_code == 401
    assert stored(ch["id"]) is None


# --- what it may be --------------------------------------------------------------------------

@pytest.mark.parametrize("kind", ["png", "jpeg", "jpg", "gif", "webp", "avif", "heic", "bmp", "tiff", "PNG"])
def test_raster_pictures_are_taken(client, kind):
    ch = support.forge(client)
    assert put(client, ch["id"], picture(kind=kind)).status_code == 200


@pytest.mark.parametrize("value", [
    "https://example.com/me.png",               # a link would make every viewer fetch from elsewhere
    "data:image/svg+xml;base64," + base64.b64encode(b"<svg onload='alert(1)'/>").decode(),
    "data:text/html;base64," + base64.b64encode(b"<script>alert(1)</script>").decode(),
    "data:image/png,rawbytes",                   # not base64
    "data:image/png;base64,",                    # nothing in it
    "data:image/png;base64,@@@@",                # not base64
    "data:image/png;base64,abc",                 # bad padding
    "data:image/png;base64,QUJDé",          # not ASCII
    " data:image/png;base64,QUJD",               # not at the start
])
def test_anything_else_is_422(client, value):
    ch = support.forge(client, profile_pic=picture(10))
    r = put(client, ch["id"], value)
    assert r.status_code == 422
    assert r.json() == NOT_A_PICTURE
    assert stored(ch["id"]) == picture(10)


@pytest.mark.parametrize("body", [{}, {"profile_pic": 5}, {"picture": "x"}])
def test_the_body_must_name_profile_pic(client, body):
    ch = support.forge(client, profile_pic=picture(10))
    r = client.put(f"/api/investigators/{ch['id']}/portrait", json=body, headers=support.as_owner(ch["id"]))
    assert r.status_code == 422
    assert stored(ch["id"]) == picture(10)


def test_size_limit(client, monkeypatch):
    monkeypatch.setattr(portraits, "PORTRAIT_MAX_BYTES", 300)
    ch = support.forge(client)
    assert put(client, ch["id"], picture(300)).status_code == 200
    r = put(client, ch["id"], picture(301))
    assert r.status_code == 413
    assert r.json() == TOO_LARGE
    assert stored(ch["id"]) == picture(300)
    # far over the limit: refused from the length alone
    assert put(client, ch["id"], picture(3000)).status_code == 413


def test_the_real_limit_is_ten_megabytes():
    assert portraits.PORTRAIT_MAX_BYTES == 10 * 1024 * 1024
    assert portraits.check_portrait(picture(portraits.PORTRAIT_MAX_BYTES)) is not None
    with pytest.raises(HTTPException) as refused:
        portraits.check_portrait(picture(portraits.PORTRAIT_MAX_BYTES + 1))
    assert refused.value.status_code == 413


# --- forge takes the same pictures -----------------------------------------------------------

def test_forge_stores_a_picture(client):
    pic = picture()
    ch = support.forge(client, profile_pic=pic)
    assert ch["profile_pic"] == pic
    assert stored(ch["id"]) == pic


def test_forge_refuses_what_the_portrait_route_refuses(client, monkeypatch):
    """Before, forge stored any string. The creator's 413 message already covers a
    picture that is too large."""
    owner = support.make_user()
    for value, status in (("https://example.com/me.png", 422), ("data:image/svg+xml;base64,PHN2Zy8+", 422)):
        r = client.post("/api/investigators/forge", json={"name": "Inv", "profile_pic": value},
                        headers=support.as_user(owner.id))
        assert (r.status_code, r.json()) == (status, NOT_A_PICTURE)
    monkeypatch.setattr(portraits, "PORTRAIT_MAX_BYTES", 300)
    r = client.post("/api/investigators/forge", json={"name": "Inv", "profile_pic": picture(301)},
                    headers=support.as_user(owner.id))
    assert (r.status_code, r.json()) == (413, TOO_LARGE)
    assert support.fetch_all(Character, user_id=owner.id) == []


def test_forge_without_a_portrait_is_unchanged(client):
    assert support.forge(client)["profile_pic"] is None
    assert support.forge(client, profile_pic=None)["profile_pic"] is None


# --- who hears about it ----------------------------------------------------------------------

def _portrait_update(ch, camp, pic):
    return {"type": "portrait_update", "payload": {
        "character_id": ch["id"], "campaign_id": camp["id"], "profile_pic": pic}}


@pytest.mark.parametrize("by", ["owner", "gm"])
def test_an_active_characters_portrait_reaches_the_gm_and_the_members(client, by):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    fellow = support.active_member(client, camp)
    waiting = support.pending_member(client, camp)
    elsewhere = support.active_member(client, support.new_campaign(client))
    pic = picture()
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, ch["id"]) as own, \
            support.ws_connect(client, fellow["id"]) as mem, \
            support.ws_connect(client, waiting["id"]) as pend, \
            support.ws_connect(client, elsewhere["id"]) as other:
        headers = support.as_owner(ch["id"]) if by == "owner" else support.as_gm(camp)
        assert put(client, ch["id"], pic, headers=headers).status_code == 200
        own_frames = own.drain()
        assert support.types(own_frames) == ["character_update", "portrait_update"]
        assert own_frames[0]["payload"]["id"] == ch["id"]
        assert own_frames[0]["payload"]["profile_pic"] == pic
        assert own_frames[1] == _portrait_update(ch, camp, pic)
        assert gm.drain() == [_portrait_update(ch, camp, pic)]
        assert mem.drain() == [_portrait_update(ch, camp, pic)]
        assert pend.drain() == []
        assert other.drain() == []


def test_a_pending_characters_portrait_reaches_the_gm_only(client):
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    member = support.active_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, ch["id"]) as own, \
            support.ws_connect(client, member["id"]) as mem:
        assert put(client, ch["id"], None).status_code == 200
        assert support.types(own.drain()) == ["character_update"]
        assert gm.drain() == [_portrait_update(ch, camp, None)]
        assert mem.drain() == []


def test_an_unaffiliated_characters_portrait_reaches_its_own_channel_only(client):
    ch = support.forge(client)
    camp = support.new_campaign(client)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, ch["id"]) as own:
        pic = picture()
        assert put(client, ch["id"], pic).status_code == 200
        [frame] = own.drain()
        assert (frame["type"], frame["payload"]["profile_pic"]) == ("character_update", pic)
        assert gm.drain() == []


def test_a_refused_portrait_is_not_broadcast(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, \
            support.ws_connect(client, ch["id"]) as own:
        assert put(client, ch["id"], "nope").status_code == 422
        assert put(client, ch["id"], picture(), headers=support.as_stranger()).status_code == 403
        assert own.drain() == []
        assert gm.drain() == []
