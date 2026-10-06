"""PUT /api/investigators/{id}/portrait, and the portrait rule it shares with forge.

The owner may set or clear a character's portrait, and so may the GM of its campaign
while the character is active or pending, a limited number of times per user. The
character's own channel gets character_update; the campaign gets portrait_update (the
GM and active members for an active character, the GM alone for a pending one). A
stored value that breaks the rule is served as no portrait.
"""
import asyncio
import base64

import pytest
from fastapi import HTTPException
from limits import parse as parse_limit
from sqlalchemy import event

import main
import support
from models import Character
from vtt import portraits

NOT_A_PICTURE = {"detail": "The portrait must be a PNG, JPEG or WebP picture."}
TOO_LARGE = {"detail": "The portrait is too large. Choose a smaller picture."}
TOO_OFTEN = {"detail": "The portrait was changed too often. Please wait a few minutes and try again."}

# How each picture type's bytes start.
SIGNATURES = {"png": b"\x89PNG\r\n\x1a\n", "jpeg": b"\xff\xd8\xff\xe0", "webp": b"RIFF\x00\x00\x00\x00WEBP"}


def picture(n_bytes=40, kind="png"):
    """A data URL of n_bytes of picture whose bytes start like the type (a PNG for a
    type the rule does not take)."""
    start = SIGNATURES.get(kind.lower(), SIGNATURES["png"])
    raw = (start + bytes(range(256)) * (n_bytes // 256 + 1))[:n_bytes]
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

@pytest.mark.parametrize("kind", ["png", "jpeg", "webp"])
def test_png_jpeg_and_webp_are_taken(client, kind):
    ch = support.forge(client)
    assert put(client, ch["id"], picture(kind=kind)).status_code == 200


def test_the_bytes_may_be_any_of_the_three_types():
    """A .png file that is really a JPEG still shows in every browser."""
    jpeg_bytes = base64.b64encode(SIGNATURES["jpeg"] + b"rest").decode()
    assert portraits.check_portrait("data:image/png;base64," + jpeg_bytes) is not None


@pytest.mark.parametrize("kind", ["gif", "avif", "heic", "bmp", "tiff", "jpg", "PNG", "Jpeg"])
def test_other_types_are_422(client, kind):
    """The rule took eleven raster types in any case; it takes the three a browser's
    canvas makes (the creator scales a photo down to one of them), written as
    FileReader writes them."""
    ch = support.forge(client)
    assert (put(client, ch["id"], picture(kind=kind)).status_code, stored(ch["id"])) == (422, None)


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
    "data:image/png;base64," + base64.b64encode(b"just some text, not a picture").decode(),
    "data:image/webp;base64," + base64.b64encode(b"RIFF\x00\x00\x00\x00WAVEfmt ").decode(),  # a sound
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
    """The limit is on the whole data URL, as stored and sent."""
    monkeypatch.setattr(portraits, "PORTRAIT_MAX_LENGTH", len(picture(300)))
    ch = support.forge(client)
    assert put(client, ch["id"], picture(300)).status_code == 200
    r = put(client, ch["id"], picture(301))
    assert r.status_code == 413
    assert r.json() == TOO_LARGE
    assert stored(ch["id"]) == picture(300)
    assert put(client, ch["id"], picture(3000)).status_code == 413


def test_the_real_limit_is_400_kb():
    """It was 10 MB (about 13.4 MB as base64), so one account could fill CT209's 10 GB
    disk with a few hundred forges, and a join broadcast could hold hundreds of MB.
    400 KB of data URL holds a picture of about 300 KB; the creator sends far less."""
    assert portraits.PORTRAIT_MAX_LENGTH == 400 * 1024
    largest = picture(307_182)  # the most picture bytes a PNG data URL of 400 KB holds
    assert len(largest) == 409_598
    assert portraits.check_portrait(largest) == largest
    with pytest.raises(HTTPException) as refused:
        portraits.check_portrait(picture(307_183))
    assert refused.value.status_code == 413
    with pytest.raises(HTTPException) as refused:  # far over: refused from the length alone
        portraits.check_portrait("data:image/png;base64," + "A" * 20_000_000)
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
        r = client.post("/api/investigators/forge", json=support.sheet(profile_pic=value),
                        headers=support.as_user(owner.id))
        assert (r.status_code, r.json()) == (status, NOT_A_PICTURE)
    monkeypatch.setattr(portraits, "PORTRAIT_MAX_LENGTH", len(picture(300)))
    r = client.post("/api/investigators/forge", json=support.sheet(profile_pic=picture(301)),
                    headers=support.as_user(owner.id))
    assert (r.status_code, r.json()) == (413, TOO_LARGE)
    assert support.fetch_all(Character, user_id=owner.id) == []


def test_forge_without_a_portrait_is_unchanged(client):
    assert support.forge(client)["profile_pic"] is None
    assert support.forge(client, profile_pic=None)["profile_pic"] is None


# --- how often it may change -------------------------------------------------------------------

def test_the_real_change_limits():
    assert [str(x) for x in portraits.PORTRAIT_CHANGE_LIMITS] == ["10 per 1 minute", "50 per 1 day"]


def test_portrait_changes_are_limited_per_user(client, limiter_on, monkeypatch):
    """Nothing limited forge or PUT /portrait, so one script could write portrait after
    portrait. Each user now gets PORTRAIT_CHANGE_LIMITS (10 a minute, 50 a day); a
    forge with a portrait counts, one without does not."""
    monkeypatch.setattr(portraits, "PORTRAIT_CHANGE_LIMITS", (parse_limit("3/minute"), parse_limit("50/day")))
    owner = support.make_user()
    ch = support.forge(client, user_id=owner.id)  # no portrait: not counted
    support.forge(client, user_id=owner.id, profile_pic=picture())
    assert [put(client, ch["id"], p).status_code for p in (picture(41), None)] == [200, 200]
    r = put(client, ch["id"], picture(42))
    assert (r.status_code, r.json()) == (429, TOO_OFTEN)
    assert stored(ch["id"]) is None
    r = client.post("/api/investigators/forge", json=support.sheet(profile_pic=picture()),
                    headers=support.as_user(owner.id))
    assert (r.status_code, r.json()) == (429, TOO_OFTEN)
    assert support.forge(client, user_id=owner.id)["profile_pic"] is None  # still no limit without one
    other = support.forge(client)
    assert put(client, other["id"], picture()).status_code == 200  # another user has their own count


def test_the_change_limit_counts_the_caller(client, limiter_on, monkeypatch):
    """A GM setting portraits on the roster spends the GM's count, not the owners'."""
    monkeypatch.setattr(portraits, "PORTRAIT_CHANGE_LIMITS", (parse_limit("1/minute"), parse_limit("50/day")))
    camp = support.new_campaign(client)
    first, second = support.active_member(client, camp), support.active_member(client, camp)
    gm = support.as_gm(camp)
    assert put(client, first["id"], picture(), headers=gm).status_code == 200
    assert put(client, second["id"], picture(), headers=gm).status_code == 429
    assert put(client, second["id"], picture()).status_code == 200  # its owner still may


# --- stored values that break the rule are served as none ----------------------------------------

LEGACY_VALUES = [
    "https://tracker.example.org/me.png",  # a link: every viewer's browser would fetch it
    "//tracker.example.org/images/me.png",  # a link to another site that only looks like a path
    "/images/../secret.png",               # only one file name under /images/
    "/images/portraits/me.png",
    "/images/me.svg",
    "/images/me.png?track=1",
    "/IMAGES/Journalist.png",
    "data:image/svg+xml;base64," + base64.b64encode(b"<svg/>").decode(),
    "data:image/gif;base64," + base64.b64encode(b"GIF89a....").decode(),
    "data:image/PNG;base64," + base64.b64encode(SIGNATURES["png"]).decode(),
    "data:image/png;base64," + "A" * (14 * 1024 * 1024),  # over the old 10 MB limit
    "",
]


@pytest.mark.parametrize("value", LEGACY_VALUES)
def test_a_stored_value_that_breaks_the_rule_is_served_as_none(client, value):
    """Forge stored any string before the rule, and up to 10 MB until the cap was
    lowered. Such values stay in the database but are never sent: not by the routes,
    not in broadcasts."""
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    support.update(Character, ch["id"], profile_pic=value)
    owner = support.as_owner(ch["id"])
    assert client.get(f"/api/investigators/{ch['id']}", headers=owner).json()["profile_pic"] is None
    [listed] = [c for c in client.get("/api/investigators", headers=owner).json() if c["id"] == ch["id"]]
    assert listed["profile_pic"] is None
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()
    assert [c["profile_pic"] for c in roster["active_investigators"] if c["id"] == ch["id"]] == [None]
    state = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp)).json()
    assert [c["profile_pic"] for c in state["active_investigators"] if c["id"] == ch["id"]] == [None]
    with support.ws_connect(client, ch["id"]) as ws:
        assert ws.initial[0]["payload"]["profile_pic"] is None
    assert stored(ch["id"]) == value  # nothing was deleted


def test_a_stored_value_that_follows_the_rule_is_served(client):
    pic = picture(kind="webp")
    ch = support.forge(client)
    support.update(Character, ch["id"], profile_pic=pic)
    assert client.get(f"/api/investigators/{ch['id']}", headers=support.as_owner(ch["id"])).json()["profile_pic"] == pic
    with support.ws_connect(client, ch["id"]) as ws:
        assert ws.initial[0]["payload"]["profile_pic"] == pic


def test_a_picture_saved_before_the_400_kb_cap_still_shows(client):
    """Players' portraits of 450 to 550 KB, saved under the old 10 MB limit, vanished
    from the circle cards when the read check used the new cap. Only new pictures must
    fit 400 KB; stored ones keep showing up to the old limit."""
    pic = picture(420_000)
    assert len(pic) > portraits.PORTRAIT_MAX_LENGTH
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    support.update(Character, ch["id"], profile_pic=pic)
    assert client.get(f"/api/investigators/{ch['id']}", headers=support.as_owner(ch["id"])).json()["profile_pic"] == pic
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()
    assert [c["profile_pic"] for c in roster["active_investigators"] if c["id"] == ch["id"]] == [pic]
    with pytest.raises(HTTPException) as refused:  # a new picture of that size is still refused
        portraits.check_portrait(pic)
    assert refused.value.status_code == 413


# The app's own pictures (frontend/public/images): the role portraits the seeded and demo
# characters carry as paths. They come from the site the browser is already on.
OWN_IMAGE_PATHS = ["/images/Journalist.png", "/images/doctor.png", "/images/criminal.webp",
                   "/images/magician.jpg", "/images/cryp1.jpg", "/images/some_other-file.jpeg"]


@pytest.mark.parametrize("path", OWN_IMAGE_PATHS)
def test_a_path_to_one_of_the_apps_own_pictures_is_served(client, path):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    support.update(Character, ch["id"], profile_pic=path)
    assert client.get(f"/api/investigators/{ch['id']}", headers=support.as_owner(ch["id"])).json()["profile_pic"] == path
    roster = client.get(f"/campaign/{camp['id']}/roster", headers=support.as_gm(camp)).json()
    assert [c["profile_pic"] for c in roster["active_investigators"] if c["id"] == ch["id"]] == [path]
    with support.ws_connect(client, ch["id"]) as ws:
        assert ws.initial[0]["payload"]["profile_pic"] == path


def test_a_path_to_one_of_the_apps_own_pictures_can_be_set_back(client):
    """The dossier's Undo sends the earlier portrait back, which for a demo character is
    a path such as /images/Journalist.png."""
    ch = support.forge(client)
    support.update(Character, ch["id"], profile_pic="/images/Journalist.png")
    assert put(client, ch["id"], picture()).status_code == 200
    r = put(client, ch["id"], "/images/Journalist.png")
    assert r.status_code == 200
    assert r.json()["profile_pic"] == "/images/Journalist.png"
    assert stored(ch["id"]) == "/images/Journalist.png"


@pytest.mark.parametrize("value", LEGACY_VALUES[1:7])
def test_other_paths_are_refused_when_set(client, value):
    ch = support.forge(client)
    r = put(client, ch["id"], value)
    assert r.status_code == 422
    assert r.json() == NOT_A_PICTURE
    assert stored(ch["id"]) is None


# --- campaign broadcasts ---------------------------------------------------------------------------

def test_broadcast_campaign_reads_member_ids_only_and_serializes_once(client):
    """It loaded every active member's whole row, portrait included, for every roll,
    chat message and log line, and json.dumps ran once per socket."""
    camp = support.new_campaign(client)
    a = support.active_member(client, camp, profile_pic=picture(2000))
    b = support.active_member(client, camp)
    gm_sock, a_sock, b_sock = support.FakeSocket(), support.FakeSocket(), support.FakeSocket()
    mgr = main.ConnectionManager()
    mgr.active_connections = {f"campaign:{camp['campaign_code']}": [gm_sock], str(a["id"]): [a_sock],
                              str(b["id"]): [b_sock]}
    statements = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(main.db_engine, "before_cursor_execute", record)
    try:
        with main.SessionLocal() as db:
            asyncio.run(mgr.broadcast_campaign(camp["campaign_code"], camp["id"],
                                               {"type": "activity_log", "payload": {"message": "m"}}, db))
    finally:
        event.remove(main.db_engine, "before_cursor_execute", record)
    assert statements and not any("profile_pic" in s for s in statements)
    assert gm_sock.sent == a_sock.sent == b_sock.sent == [{"type": "activity_log", "payload": {"message": "m"}}]
    assert gm_sock.texts[0] is a_sock.texts[0] is b_sock.texts[0]  # one string for every socket


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
