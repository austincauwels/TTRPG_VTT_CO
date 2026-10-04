"""Login tokens: every REST route except the sign-in routes (login, register, the
Google ones, /api/auth/config and the two password reset routes) answers 401 without a
valid token, the WebSocket closes with 4401 without one, and the WebSocket access
matrix (GM-only messages, acting for a character). Per-route ownership and GM
checks (403 and 404) are also tested next to each route's and message type's other
tests."""
import time

import pytest
from fastapi.routing import APIRoute
from jose import jwt

import main
import support
from models import Character, Circle
from vtt import config, security
from vtt.ws.access import GM_MAY_TARGET, GM_ONLY
from vtt.ws.handlers import HANDLERS

PUBLIC = {"/api/auth/login", "/api/auth/register", "/api/auth/google", "/api/auth/google/link",
          "/api/auth/google/create", "/api/auth/config", "/api/auth/password-reset",
          "/api/auth/password-reset/confirm"}
# The signed-in user's own account is under /api/auth/ too, and needs a token.
ACCOUNT = {"/api/auth/me", "/api/auth/me/google", "/api/auth/me/username", "/api/auth/me/password",
           "/api/auth/me/email", "/api/auth/me/email/resend", "/api/auth/me/email/cancel",
           "/api/auth/me/email/confirm", "/api/auth/me/google/remove"}

PROTECTED = sorted(
    (method, route.path)
    for route in main.app.routes if isinstance(route, APIRoute) and route.path not in PUBLIC
    for method in route.methods
)


def _url(path):
    return path.replace("{", "").replace("}", "").replace("campaign_id", "1").replace("character_id", "1") \
        .replace("investigator_id", "1").replace("entry_id", "1").replace("user_id", "1")


def test_every_route_but_the_sign_in_routes_is_protected():
    assert len(PROTECTED) == 33
    assert PUBLIC | ACCOUNT == {r.path for r in main.app.routes
                                if isinstance(r, APIRoute) and r.path.startswith("/api/auth/")}


def _expired_token():
    now = int(time.time())
    return jwt.encode({"sub": "1", "iat": now - 120, "exp": now - 60}, config.SECRET_KEY, algorithm="HS256")


BAD_HEADERS = {
    "missing": {},
    "empty bearer": {"Authorization": "Bearer "},
    "garbage": {"Authorization": "Bearer not-a-token"},
    "wrong scheme": {"Authorization": "Basic dXNlcjpwYXNz"},
    "token without scheme": None,  # filled in per test: the raw token as the whole header
    "expired": {"Authorization": f"Bearer {_expired_token()}"},
    "deleted user": {"Authorization": f"Bearer {security.create_access_token(987654321, 'x')}"},
    "other key": {"Authorization": "Bearer " + jwt.encode(
        {"sub": "1", "iat": int(time.time()), "exp": int(time.time()) + 60}, "not-the-key", algorithm="HS256")},
}


@pytest.mark.parametrize("method,path", PROTECTED, ids=[f"{m} {p}" for m, p in PROTECTED])
@pytest.mark.parametrize("kind", list(BAD_HEADERS))
def test_protected_route_without_a_valid_token_is_401(client, method, path, kind):
    headers = BAD_HEADERS[kind]
    if headers is None:
        headers = {"Authorization": security.create_access_token(1, "x")}
    r = client.request(method, _url(path), headers=headers)
    assert r.status_code == 401, r.text
    assert r.json() == {"detail": "Not authenticated."}
    assert r.headers["www-authenticate"] == "Bearer"


def test_a_401_comes_before_body_validation(client):
    r = client.post("/campaign/finalize-roster", json={"nonsense": True})
    assert r.status_code == 401


def test_login_and_register_need_no_token(client):
    u = support.make_user()
    assert client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD}).status_code == 200
    r = client.post("/api/auth/register", json={"username": f"open_{support.uid()}",
                                                "email": f"{support.uid()}@example.test", "password": "long-enough-pw"})
    assert r.status_code == 201


def test_the_login_token_works_on_the_next_request(client):
    """The full round trip the frontend makes: log in, then call with the token."""
    u = support.make_user()
    token = client.post("/api/auth/login", json={"username": u.username, "password": support.PASSWORD}).json()["token"]
    r = client.get(f"/api/users/{u.id}/characters", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json() == []
    # the scheme name is not case sensitive
    assert client.get(f"/api/users/{u.id}/characters", headers={"Authorization": f"bearer {token}"}).status_code == 200


def test_a_registered_users_token_works(client):
    r = client.post("/api/auth/register", json={"username": f"new_{support.uid()}",
                                                "email": f"{support.uid()}@example.test", "password": "long-enough-pw"})
    body = r.json()
    r = client.get(f"/api/users/{body['userId']}/campaigns", headers={"Authorization": f"Bearer {body['token']}"})
    assert r.status_code == 200


# --- the WebSocket ---------------------------------------------------------------

REJECTED = {"status": 403, "detail": "Not allowed."}


def _rejected(action, **payload):
    return {"type": "action_rejected", "payload": {"action": action, **(payload or REJECTED)}}


def test_websocket_without_a_token_is_closed_with_4401(client):
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp)
    for key in (ch["id"], camp["campaign_code"], "987654321"):
        assert support.ws_close_code(client, key, token=None) == 4401


def test_a_registered_users_token_opens_their_characters_socket(client):
    """The round trip the frontend makes: register, forge, connect with ?token=."""
    r = client.post("/api/auth/register", json={"username": f"ws_{support.uid()}",
                                                "email": f"{support.uid()}@example.test", "password": "long-enough-pw"})
    token = r.json()["token"]
    ch = client.post("/api/investigators/forge", json={"name": "Wren"}, headers=support.bearer(token)).json()
    with support.ws_connect(client, ch["id"], token=token) as ws:
        assert support.types(ws.initial) == ["character_update", "circle_update"]
        assert ws.initial[0]["payload"]["id"] == ch["id"]


@pytest.mark.parametrize("msg_type", sorted(GM_ONLY))
def test_a_player_cannot_send_gm_only_messages(client, msg_type):
    """Even with role GM in the payload and its own character_id."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp, body_marks=0)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp)).json()["circle_id"]
    with support.ws_connect(client, member["id"]) as wm, support.ws_connect(client, camp["campaign_code"]) as gm:
        wm.send(msg_type, role="GM", circle_id=cid, character_id=member["id"], mark_type="body", value=3,
                scene_name="s", tension_label="mine", circle_ability="Stolen")
        # read the answer directly: sync() on a player socket uses gm_transition_scene itself
        assert wm.recv() == _rejected(msg_type)
        assert wm.sync() == []
        assert gm.drain() == []
        assert support.server_sockets(member["id"])
    assert support.fetch(Character, member["id"]).body_marks == 0
    assert support.fetch(Circle, cid).tension_label in ("", None)


ACTS_FOR_A_CHARACTER = sorted(t for t in HANDLERS if t not in GM_ONLY and t not in GM_MAY_TARGET)


@pytest.mark.parametrize("msg_type", ACTS_FOR_A_CHARACTER)
def test_the_gm_cannot_act_as_a_players_character(client, msg_type):
    """Only the character's owner may roll, vote, chat or answer for it; a GM socket
    that names a member's character_id is rejected."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, member["id"]) as wm:
        gm.send(msg_type, character_id=member["id"], action="move", pool="nerve", value=0, message="hi",
                ability="Flourish", mark_type="body", responses={}, vote_type="ability", answer="x")
        assert gm.sync() == [_rejected(msg_type)]
        assert wm.drain() == []


@pytest.mark.parametrize("msg_type", sorted(GM_MAY_TARGET - GM_ONLY))
def test_the_gm_may_aim_some_messages_at_members_only(client, msg_type):
    """update_drive, take_mark, revive_character and update_gear: the GM may name a
    member of their campaign, not a character of another campaign or none."""
    camp = support.new_campaign(client)
    outsider = support.active_member(client, support.new_campaign(client), nerve_current=2)
    loner = support.forge(client, nerve_current=2)
    with support.ws_connect(client, camp["campaign_code"]) as gm:
        for target in (outsider, loner):
            gm.send(msg_type, character_id=target["id"], pool="nerve", value=0, mark_type="body", gear=["x"])
            assert gm.sync() == [_rejected(msg_type)]
        gm.send(msg_type, character_id=987654321, pool="nerve", value=0)
        assert gm.sync() == [_rejected(msg_type, status=404, detail="Character not found")]
    for target in (outsider, loner):
        row = support.fetch(Character, target["id"])
        assert (row.nerve_current, row.body_marks, row.gear) == (2, 0, [])


def test_a_player_socket_acts_only_for_its_own_character(client):
    """Two characters of the same user: each socket still acts only for its own."""
    camp = support.new_campaign(client)
    u = support.make_user()
    first = support.active_member(client, camp, user_id=u.id, nerve_current=2)
    second = support.forge(client, user_id=u.id, nerve_current=2)
    with support.ws_connect(client, first["id"]) as ws:
        ws.send("update_drive", pool="nerve", value=0, character_id=second["id"])
        assert ws.sync() == [_rejected("update_drive")]
    assert support.fetch(Character, second["id"]).nerve_current == 2


def test_rejections_go_only_to_the_sender_and_keep_the_socket(client):
    camp = support.new_campaign(client)
    a = support.active_member(client, camp)
    b = support.active_member(client, camp)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        for _ in range(3):
            wa.send("gm_toggle_reports")
        assert wa.sync() == [_rejected("gm_toggle_reports")] * 3
        assert wb.drain() == [] and gm.drain() == []
        wa.send("chat_message", message="still here")
        assert support.types(wa.sync()) == ["activity_log"]


def test_a_rejected_player_no_longer_posts_to_the_old_campaign(client):
    """Reviewer probe: a socket keeps the campaign it opened with. After a REST reject
    its gear names used to reach that campaign's GM as free text."""
    camp = support.new_campaign(client)
    ch = support.pending_member(client, camp)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        assert support.reject(client, ch["id"]).status_code == 200
        ws.recv_type("investigator_rejected")
        gm.drain()
        ws.send("update_gear", gear=["ANY TEXT I LIKE"])
        ws.send("chat_message", message="hello?")
        assert ws.sync() == [_rejected("update_gear"), _rejected("chat_message")]
        assert gm.sync() == []
        ws.send("update_pen_font", pen_font="Kalam")  # its own sheet is still its own
        assert support.types(ws.sync()) == ["character_update"]
    assert support.fetch(Character, ch["id"]).gear == []


@pytest.mark.parametrize("how", ["moved", "retired"])
def test_a_player_who_left_the_campaign_no_longer_posts_to_it(client, how):
    camp = support.new_campaign(client)
    other = support.new_campaign(client)
    ch = support.active_member(client, camp)
    with support.ws_connect(client, ch["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        ws.send("update_gear", gear=["lamp"])
        assert support.types(ws.sync()) == ["character_update", "activity_log"]
        assert support.types(gm.sync()) == ["activity_log"]
        if how == "moved":
            assert support.join(client, ch["id"], other["campaign_code"]).status_code == 200
        else:
            support.update(Character, ch["id"], status="retired")
        gm.drain()
        for msg_type, payload in (("update_gear", dict(gear=["rope"])), ("roll", dict(action="move")),
                                  ("revive_character", {}),
                                  ("apply_advancement", dict(choice="add_action", detail="move"))):
            ws.send(msg_type, **payload)
            assert ws.sync() == [_rejected(msg_type)]
        assert gm.sync() == []
    assert support.fetch(Character, ch["id"]).gear == ["lamp"]


def test_a_pending_character_reaches_nothing_of_the_campaign(client):
    """Anyone with a campaign code can join it; the character then waits as pending for
    the GM's approval. Pending used to count as membership, so a stranger with the code
    could read the roster, the notebook and the circle, write notebook entries, vote
    and propose on the circle, and chat or post rolls and gear to the table before
    the GM said yes. A member is now an active character. The GM may still act on a
    pending one, and approval makes it a member at once."""
    camp = support.new_campaign(client)
    member = support.active_member(client, camp)
    cid = client.get(f"/campaign/{camp['id']}/circle-creation-state", headers=support.as_gm(camp)).json()["circle_id"]
    waiting = support.pending_member(client, camp, nerve_current=1)
    me = support.as_owner(waiting["id"])
    base = f"/campaign/{camp['id']}"

    assert client.get(f"{base}/roster", headers=me).status_code == 403
    assert client.get(f"{base}/circle-creation-state", headers=me).status_code == 403
    notebook = f"/api/notebook/{camp['id']}"
    assert client.get(f"{notebook}/entries", params={"character_id": waiting["id"]}, headers=me).status_code == 403
    entry = {"title": "x", "content": "y", "author_name": "a", "author_type": "player", "character_id": waiting["id"]}
    assert client.post(f"{notebook}/entries", json=entry, headers=me).status_code == 403
    r = client.post(f"{notebook}/upload", files={"file": ("a.png", b"\x89PNG", "image/png")},
                    data={"character_id": str(waiting["id"])}, headers=me)
    assert r.status_code == 403
    r = client.post("/circle/vote", json={"circle_id": cid, "character_id": waiting["id"],
                                          "vote_type": "insignia", "value": "Owl"}, headers=me)
    assert r.status_code == 403
    for a, b, headers in ((waiting, member, me), (member, waiting, support.as_owner(member["id"]))):
        r = client.post("/circle/relationship/propose", json={
            "circle_id": cid, "from_character_id": a["id"], "to_character_id": b["id"], "rel_type": "Rivals"},
            headers=headers)
        assert r.status_code == 403

    with support.ws_connect(client, waiting["id"]) as ws, support.ws_connect(client, camp["campaign_code"]) as gm:
        for msg_type, payload in (("chat_message", dict(message="let me in")),
                                  ("update_gear", dict(gear=["crowbar"])),
                                  ("add_notebook_entry", dict(campaign_id=camp["id"], title="t", content="c")),
                                  ("circle_creation_vote", dict(circle_id=cid, character_id=waiting["id"],
                                                                vote_type="insignia", value="Owl"))):
            ws.send(msg_type, **payload)
            assert ws.sync() == [_rejected(msg_type)]
        assert gm.sync() == []
        gm.send("update_drive", character_id=waiting["id"], pool="nerve", value=2)  # the GM still may
        assert support.types(gm.sync()) == ["character_update"]
        ws.drain()
        assert support.approve(client, waiting["id"]).status_code == 200
        ws.recv_type("investigator_approved")
        gm.drain()
        ws.send("chat_message", message="hello")
        assert support.types(ws.sync()) == ["activity_log"]
    assert support.fetch(Character, waiting["id"]).nerve_current == 2
    assert client.get(f"{base}/roster", headers=me).status_code == 200
