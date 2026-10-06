"""The app's public surface: every HTTP route and every WebSocket message type.

These tests exist so that moving code around (splitting main.py) cannot lose or
rename a route, change a response model or status code, or drop a WebSocket
handler without a test failing. test_00_startup.py pins the route order; this
file pins what each route is, plus the OpenAPI document as a whole, and sends
one minimal message of every type the server handles.
"""
import json
import os
import typing
from types import SimpleNamespace

import pytest
from fastapi.routing import APIRoute, APIWebSocketRoute

import main
import support
from models import Character, Circle

SNAPSHOT = os.path.join(os.path.dirname(__file__), "data", "openapi.json")


def _model_name(model):
    if model is None:
        return None
    args = typing.get_args(model)
    if args:
        return f"{typing.get_origin(model).__name__}[{args[0].__name__}]"
    return model.__name__


# (methods, path, endpoint function name, response_model, status_code as declared)
HTTP_ROUTES = [
    (["POST"], "/campaign/create", "create_campaign", None, None),
    (["POST"], "/campaign/join", "join_campaign", None, None),
    (["POST"], "/campaign/approve/{character_id}", "approve_character", None, None),
    (["POST"], "/campaign/reject/{character_id}", "reject_character", None, None),
    (["POST"], "/campaign/{campaign_id}/retire", "retire_campaign", None, None),
    (["DELETE"], "/campaign/{campaign_id}", "delete_campaign", None, None),
    (["POST"], "/campaign/{campaign_id}/restore", "restore_campaign", None, None),
    (["POST"], "/campaign/rejoin", "rejoin_campaign", None, None),
    (["POST"], "/campaign/{campaign_id}/invite-rejoin", "invite_rejoin", None, None),
    (["GET"], "/campaign/{campaign_id}/roster", "get_roster", "RosterResponse", None),
    (["GET"], "/campaign/{campaign_id}/circle-creation-state", "get_circle_creation_state", None, None),
    (["POST"], "/circle/vote", "submit_circle_vote", None, None),
    (["POST"], "/circle/relationship/propose", "propose_relationship", None, None),
    (["POST"], "/circle/relationship/respond", "respond_relationship", None, None),
    (["POST"], "/campaign/finalize-roster", "finalize_roster", None, None),
    (["POST"], "/api/auth/login", "login", None, None),
    (["POST"], "/api/auth/register", "register", None, 201),
    (["POST"], "/api/auth/google", "google_sign_in", None, None),
    (["POST"], "/api/auth/google/link", "google_link", None, None),
    (["POST"], "/api/auth/google/create", "google_create", None, 201),
    (["GET"], "/api/auth/config", "auth_config", None, None),
    (["GET"], "/api/auth/me", "current_account", None, None),
    (["POST"], "/api/auth/me/google", "link_google_to_account", None, None),
    (["POST"], "/api/auth/password-reset", "request_password_reset", None, 202),
    (["POST"], "/api/auth/password-reset/confirm", "confirm_password_reset", None, None),
    (["POST"], "/api/auth/me/username", "change_username", None, None),
    (["POST"], "/api/auth/me/password", "change_password", None, None),
    (["POST"], "/api/auth/me/email", "request_email_change", None, 202),
    (["POST"], "/api/auth/me/email/resend", "resend_email_change", None, 202),
    (["POST"], "/api/auth/me/email/cancel", "cancel_email_change", None, None),
    (["POST"], "/api/auth/me/email/check", "check_email_change", None, None),
    (["POST"], "/api/auth/me/email/confirm", "confirm_email_change", None, None),
    (["POST"], "/api/auth/email-change/undo", "undo_email_change", None, None),
    (["POST"], "/api/auth/me/google/remove", "remove_google_sign_in", None, None),
    (["GET"], "/api/investigators", "list_investigators", "list[CharacterRosterItem]", None),
    (["GET"], "/api/investigators/{investigator_id}", "get_investigator", "CharacterResponse", None),
    (["POST"], "/api/investigators/forge", "forge_investigator", "CharacterResponse", 201),
    (["PUT"], "/api/investigators/{investigator_id}/portrait", "set_portrait", None, None),
    (["DELETE"], "/api/investigators/{investigator_id}", "delete_investigator", None, None),
    (["POST"], "/api/investigators/{investigator_id}/restore", "restore_investigator", None, None),
    (["GET"], "/api/notebook/{campaign_id}/entries", "fetch_notebook_entries", "list[NotebookEntryResponse]", None),
    (["POST"], "/api/notebook/{campaign_id}/entries", "add_notebook_entry", "NotebookEntryResponse", 201),
    (["PUT"], "/api/notebook/entries/{entry_id}", "update_notebook_entry", "NotebookEntryResponse", None),
    (["DELETE"], "/api/notebook/entries/{entry_id}", "delete_notebook_entry", None, 204),
    (["POST"], "/api/notebook/{campaign_id}/upload", "upload_notebook_image", None, 201),
    (["GET"], "/api/notebook/entries/{entry_id}/scene", "get_sketch_scene", None, None),
    (["PUT"], "/api/notebook/entries/{entry_id}/sketch", "redraw_sketch", "NotebookEntryResponse", None),
    (["GET"], "/api/users/{user_id}/characters", "get_user_characters", "list[CharacterSummaryItem]", None),
    (["GET"], "/api/users/{user_id}/campaigns", "get_user_gm_campaigns", "list[CampaignSummaryItem]", None),
]


def test_http_route_table(client):
    got = [
        (sorted(r.methods), r.path, r.endpoint.__name__, _model_name(r.response_model), r.status_code)
        for r in main.app.routes if isinstance(r, APIRoute)
    ]
    assert got == HTTP_ROUTES


def test_websocket_route(client):
    got = [(r.path, r.endpoint.__name__) for r in main.app.routes if isinstance(r, APIWebSocketRoute)]
    assert got == [("/ws/{game_id}", "websocket_endpoint")]


def test_only_the_sign_in_routes_are_rate_limited(client):
    """Google sign-in and linking (which checks a password, or a Google token for a
    signed-in user) like login, creating an account like register. A reset request
    sends email, so it has an hourly limit too (and one per address, which
    test_password_reset.py checks). The account page's routes check a password or a
    Google token, or send email, so they are limited like login (and per user, which
    test_account.py checks for failed proofs). The undo link mailed to an old address
    is limited the same way. /api/auth/config and /api/auth/me are not limited."""
    limits = {k.rsplit(".", 1)[-1]: [str(x.limit) for x in v] for k, v in main.limiter._route_limits.items()}
    assert limits == {
        "login": ["10 per 1 minute"],
        "register": ["5 per 1 minute"],
        "google_sign_in": ["10 per 1 minute"],
        "google_link": ["10 per 1 minute"],
        "google_create": ["5 per 1 minute"],
        "link_google_to_account": ["10 per 1 minute"],
        "request_password_reset": ["5 per 1 minute", "20 per 1 hour"],
        "confirm_password_reset": ["10 per 1 minute"],
        "change_username": ["10 per 1 minute"],
        "change_password": ["10 per 1 minute"],
        "request_email_change": ["10 per 1 minute"],
        "resend_email_change": ["10 per 1 minute"],
        "cancel_email_change": ["10 per 1 minute"],
        "check_email_change": ["10 per 1 minute"],
        "confirm_email_change": ["10 per 1 minute"],
        "undo_email_change": ["10 per 1 minute"],
        "remove_google_sign_in": ["10 per 1 minute"],
    }


def test_openapi_document_is_unchanged(client):
    """Covers every query, path, form and body parameter of every route, the request
    and response schemas, and the declared status codes. If a change to the API is
    intended, regenerate tests/data/openapi.json from main.app.openapi()."""
    with open(SNAPSHOT, encoding="utf-8") as f:
        expected = json.load(f)
    assert json.loads(json.dumps(main.app.openapi())) == expected


# --- WebSocket message types ---------------------------------------------------

# Every "type" the /ws/{game_id} receive loop acts on, in the order the handlers
# appear in the original main.py.
WS_MESSAGE_TYPES = [
    "gm_update_tension", "gm_update_circle", "gm_transition_scene", "roll",
    "update_drive", "resolve_gilded", "use_post_roll_ability", "update_pen_font",
    "take_mark", "resolve_ability_mark", "intercept_mark", "apply_scar",
    "revive_character", "burn_resistance", "update_gear", "gm_toggle_resource_edit",
    "gm_toggle_reports", "submit_assignment_report", "gm_advance_circle",
    "refill_resources", "gm_end_assignment", "gm_reset_character", "spend_resource",
    "apply_advancement", "update_circle", "circle_creation_vote",
    "circle_backstory_update", "circle_personal_answer", "circle_relationship_propose",
    "circle_relationship_respond", "chat_message", "add_notebook_entry",
]


def _propose_first(ctx, ws):
    """The other member proposes to the player's character (over REST, as its owner)."""
    r = support.CLIENT.post("/circle/relationship/propose", json={
        "circle_id": ctx.circle_id, "from_character_id": ctx.other_id, "to_character_id": ctx.char_id,
        "rel_type": "rival"}, headers=support.as_owner(ctx.other_id))
    assert r.status_code == 200, r.text
    ctx.rel_id = r.json()["relationships"][0]["id"]


def _resources_editable(client, ctx):
    r = client.get(f"/campaign/{ctx.camp_id}/circle-creation-state", headers=support.as_gm(ctx.camp_id))
    assert r.status_code == 200, r.text
    support.update(Circle, r.json()["circle_id"], resources_editable=True)


# type -> sender ("player" or "gm"), forge fields for the player's character, the
# payload, the frame types the sender gets back, and optional setup steps.
WS_CASES = {
    "gm_update_tension": dict(
        sender="gm", payload=lambda c: {"role": "GM", "character_id": c.char_id, "mark_type": "body", "value": 1},
        expect=["character_update"]),
    "gm_update_circle": dict(
        sender="gm", payload=lambda c: {"role": "GM", "circle_id": c.circle_id, "tension_label": "t"},
        expect=["circle_update"]),
    "gm_transition_scene": dict(
        sender="gm", payload=lambda c: {"role": "GM", "scene_name": "s"},
        expect=["scene_transition"]),
    "roll": dict(payload=lambda c: {}, expect=["roll_error"]),
    "update_drive": dict(payload=lambda c: {"pool": "nerve", "value": 1}, expect=["character_update"]),
    # A choice needs a gilded roll waiting for it (handlers/rolls.py _pending_gilded)
    "resolve_gilded": dict(
        fields={"move": 2, "gilded_move": True}, dice=(3, 5),
        after_connect=lambda c, ws: (ws.send("roll", action="move", drive_spent=0), ws.sync()),
        payload=lambda c: {"action": "move", "chosen_type": "plain", "chosen_value": 4},
        expect=["activity_log"]),
    "use_post_roll_ability": dict(
        fields={"role_ability": "Flourish", "cunning_max": 3, "cunning_current": 3},
        payload=lambda c: {"ability": "Flourish"}, expect=["character_update", "activity_log"]),
    "update_pen_font": dict(payload=lambda c: {"pen_font": "Kalam"}, expect=["character_update"]),
    "take_mark": dict(payload=lambda c: {"mark_type": "body"}, expect=["character_update"]),
    "resolve_ability_mark": dict(
        fields={"specialty_ability": "Death Defy"},
        payload=lambda c: {"ability": "Death Defy"}, expect=["character_update", "activity_log"]),
    "intercept_mark": dict(
        fields={"role_ability": "Premonitions", "intuition_max": 3},
        before_connect=lambda client, c: support.update(Character, c.other_id, body_marks=1),
        payload=lambda c: {"ability": "Premonitions", "target_character_id": c.other_id, "mark_type": "body"},
        expect=["character_update", "activity_log"]),
    "apply_scar": dict(fields={"specialty_ability": "Hardened"},
                       payload=lambda c: {"scar_text": "s", "skip_shifts": True}, expect=["character_update"]),
    "revive_character": dict(payload=lambda c: {}, expect=["character_update", "activity_log"]),
    "burn_resistance": dict(
        fields={"move": 2, "nerve_max": 3}, dice=(6, 6),
        payload=lambda c: {"action": "move", "drive_key": "nerve"}, expect=["roll_result", "activity_log"]),
    "update_gear": dict(payload=lambda c: {"gear": ["rope"]}, expect=["character_update", "activity_log"]),
    "gm_toggle_resource_edit": dict(
        sender="gm", payload=lambda c: {"role": "GM", "circle_id": c.circle_id}, expect=["circle_update"]),
    "gm_toggle_reports": dict(
        sender="gm", payload=lambda c: {"role": "GM", "circle_id": c.circle_id}, expect=["circle_update"]),
    "submit_assignment_report": dict(
        payload=lambda c: {"circle_id": c.circle_id, "character_id": c.char_id, "responses": {"q": "a"}},
        expect=["assignment_report_submitted"]),
    "gm_advance_circle": dict(
        sender="gm", payload=lambda c: {"role": "GM", "circle_id": c.circle_id},
        expect=["activity_log", "circle_advanced"]),
    "refill_resources": dict(
        sender="gm", payload=lambda c: {"role": "GM", "circle_id": c.circle_id}, expect=["circle_update"]),
    "gm_end_assignment": dict(
        sender="gm", payload=lambda c: {"role": "GM", "circle_id": c.circle_id},
        expect=["circle_update", "activity_log"]),
    "gm_reset_character": dict(
        sender="gm", payload=lambda c: {"role": "GM", "character_id": c.char_id}, expect=["activity_log"]),
    "spend_resource": dict(
        before_connect=_resources_editable,
        payload=lambda c: {"resource_type": "stitch"},
        expect=["character_update", "circle_update", "activity_log"]),
    "apply_advancement": dict(
        payload=lambda c: {"choice": "add_action", "detail": "move"},
        expect=["character_update", "activity_log"]),
    "update_circle": dict(
        sender="gm", payload=lambda c: {"role": "GM", "circle_id": c.circle_id, "tension_label": "x"},
        expect=["circle_update"]),
    "circle_creation_vote": dict(
        payload=lambda c: {"circle_id": c.circle_id, "character_id": c.char_id, "vote_type": "ability", "value": "v"},
        expect=["vote_update"]),
    "circle_backstory_update": dict(
        payload=lambda c: {"circle_id": c.circle_id, "question_key": "q", "answer": "a"},
        expect=["backstory_update"]),
    "circle_personal_answer": dict(
        payload=lambda c: {"character_id": c.char_id, "answer": "a"}, expect=["personal_answer_update"]),
    "circle_relationship_propose": dict(
        payload=lambda c: {"circle_id": c.circle_id, "from_character_id": c.char_id,
                           "to_character_id": c.other_id, "rel_type": "rival"},
        expect=["relationship_update"]),
    "circle_relationship_respond": dict(
        after_connect=_propose_first,
        payload=lambda c: {"relationship_id": c.rel_id, "action": "accept"}, expect=["relationship_update"]),
    "chat_message": dict(payload=lambda c: {"message": "hi"}, expect=["activity_log"]),
    "add_notebook_entry": dict(
        payload=lambda c: {"campaign_id": c.camp_id, "title": "t", "content": "c", "visibility": "self"},
        expect=["notebook_entry"]),
}


def test_ws_cases_cover_every_message_type():
    assert len(WS_MESSAGE_TYPES) == len(set(WS_MESSAGE_TYPES)) == 32
    assert list(WS_CASES) == WS_MESSAGE_TYPES


@pytest.mark.parametrize("msg_type", WS_MESSAGE_TYPES)
def test_ws_message_type_is_handled(client, dice, msg_type):
    case = WS_CASES[msg_type]
    camp = support.new_campaign(client)
    ch = support.active_member(client, camp, **case.get("fields", {}))
    other = support.active_member(client, camp)
    ctx = SimpleNamespace(camp_id=camp["id"], char_id=ch["id"], other_id=other["id"])
    if "before_connect" in case:
        case["before_connect"](client, ctx)
    dice(*case.get("dice", ()))
    with support.ws_connect(client, ch["id"]) as player, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        ctx.circle_id = player.initial[-1]["payload"]["id"]
        ws = gm if case.get("sender") == "gm" else player
        if "after_connect" in case:
            case["after_connect"](ctx, ws)
            (player if ws is gm else gm).drain()
        ws.send(msg_type, **case["payload"](ctx))
        assert support.types(ws.sync()) == case["expect"]
        assert support.server_sockets(ws.key)  # the handler did not end the connection


# Types the endpoint ignores unless it resolved a character for the message.
WS_NEEDS_CHARACTER = {
    "gm_update_tension", "update_drive", "resolve_gilded", "use_post_roll_ability",
    "update_pen_font", "take_mark", "resolve_ability_mark", "intercept_mark", "apply_scar",
    "revive_character", "burn_resistance", "update_gear", "spend_resource", "apply_advancement",
}


def test_ws_handler_table():
    from vtt.ws.handlers import HANDLERS
    assert list(HANDLERS) == WS_MESSAGE_TYPES
    assert {t for t, (_, needs_character) in HANDLERS.items() if needs_character} == WS_NEEDS_CHARACTER


def test_ws_access_table():
    """The GM-only types are exactly the ones whose rule is a GM rule, and every rule
    and GM-target type is a real message type."""
    from vtt.ws import access
    gm_rules = (access._gm_only, access._gm_circle, access._gm_update_circle)
    assert access.GM_ONLY == {t for t, rule in access.RULES.items() if rule in gm_rules}
    assert set(access.RULES) <= set(WS_MESSAGE_TYPES)
    assert access.GM_MAY_TARGET <= set(WS_MESSAGE_TYPES)
    assert access.GM_ONLY == {
        "gm_update_tension", "gm_update_circle", "gm_transition_scene", "gm_toggle_resource_edit",
        "gm_toggle_reports", "gm_advance_circle", "refill_resources", "gm_end_assignment",
        "gm_reset_character", "update_circle",
    }


def test_unknown_message_type_is_ignored(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("no_such_type", character_id=ch["id"])
        assert ws.sync() == []
        assert support.server_sockets(ch["id"])


@pytest.mark.parametrize("bad_type", [["roll"], {"roll": 1}, 5, None, True])
def test_non_string_message_type_is_ignored(client, bad_type):
    """A type that is not a string never matched a handler; the socket stays open."""
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send_text(json.dumps({"type": bad_type, "payload": {}}))
        assert ws.sync() == []
        assert support.server_sockets(ch["id"])
