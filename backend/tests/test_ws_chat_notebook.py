"""WebSocket chat_message and add_notebook_entry.

The chat sender name comes from the socket: the character's name on a player socket,
"Lightkeeper" on a GM socket. payload.sender_name is ignored (before tokens it was
shown as sent).
"""
import engine
import support
from models import Character, NotebookEntry, User

ARROW = support.ARROW


def _campaign_with(client, *names):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp, name=n) for n in names]
    return camp, chars


def _rejected(action, status=403, detail="Not allowed."):
    return {"type": "action_rejected", "payload": {"action": action, "status": status, "detail": detail}}


def test_chat_to_circle(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", sender_name="Ada", message="  hello all  ")
        expected = {"type": "activity_log", "payload": {"message": f"{a['name']}: hello all", "log_type": "chat",
                                                        "target": "@Circle", "ink_color": engine.INK_COLORS[0]}}
        assert wa.sync() == [expected]
        assert wb.drain() == [expected]
        assert gm.drain() == [expected]


def test_chat_environment(client):
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        gm.send("chat_message", sender_name="LK", message="The lights flicker", target="@ENVIRONMENT")
        expected = {"type": "activity_log", "payload": {"message": "THE LIGHTS FLICKER", "log_type": "environment"}}
        assert gm.sync() == [expected]
        assert wa.drain() == [expected]


def test_chat_environment_from_player_is_rejected(client):
    """Before tokens only the UI limited @Environment to the GM."""
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", message="boo", target="@Environment")
        assert wa.sync() == [_rejected("chat_message")]
        assert gm.drain() == []


def test_whisper_goes_to_sender_gm_and_target(client):
    camp, (a, b, c) = _campaign_with(client, f"Ada {support.uid()}", f"Wolfe {support.uid()}", f"Cy {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, c["id"]) as wc, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", message="psst", target=f"@{b['name'].upper()}")
        expected = {"type": "activity_log", "payload": {
            "message": f"{a['name']} {ARROW} @{b['name'].upper()}: psst", "log_type": "chat",
            "target": f"@{b['name'].upper()}", "ink_color": engine.INK_COLORS[0]}}
        assert wa.sync() == [expected]
        assert wb.drain() == [expected]
        assert gm.drain() == [expected]
        assert wc.drain() == []


def test_whisper_target_matches_sql_wildcards(client):
    """QUIRK: the target name is used as an ILIKE pattern, so % and _ act as wildcards."""
    tag = support.uid()
    camp, (a, b) = _campaign_with(client, f"Ada {tag}", f"Wolfe Zed{tag}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("chat_message", message="hi", target="@wolfe%")
        wa.sync()
        assert support.types(wb.drain()) == ["activity_log"]


def test_whisper_to_unknown_name(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", message="anyone?", target="@Nobody")
        expected = {"type": "activity_log", "payload": {
            "message": f"{a['name']} {ARROW} @Nobody: anyone?", "log_type": "chat",
            "target": "@Nobody", "ink_color": engine.INK_COLORS[0]}}
        assert wa.sync() == [expected]
        assert gm.drain() == [expected]
        assert wb.drain() == []


def test_whisper_without_campaign_is_rejected(client):
    """Before tokens a socket with no campaign matched the target name with ILIKE
    across all characters, so a whisper could reach a member of any campaign. Chat
    now needs a campaign."""
    tag = support.uid()
    camp, (target,) = _campaign_with(client, f"Wren {tag}")
    loner = support.forge(client)
    with support.ws_connect(client, loner["id"]) as wl, support.ws_connect(client, target["id"]) as wt, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wl.send("chat_message", message="psst", target=f"@wren {tag}")
        assert wl.sync() == [_rejected("chat_message")]
        assert wt.drain() == []
        assert gm.drain() == []


def test_environment_without_campaign_is_rejected(client):
    camp, (member,) = _campaign_with(client, f"Ada {support.uid()}")
    loner = support.forge(client)
    with support.ws_connect(client, loner["id"]) as wl, support.ws_connect(client, member["id"]) as wm, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wl.send("chat_message", message="thunder", target="@Environment")
        assert wl.sync() == [_rejected("chat_message")]
        assert wm.drain() == [] and gm.drain() == []


def test_gm_whisper(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa, \
            support.ws_connect(client, b["id"]) as wb:
        gm.send("chat_message", sender_name="Someone else", message="you hear it", target=f"@{a['name']}")
        msgs = gm.sync()
        assert len(msgs) == 1
        assert msgs[0]["payload"]["message"] == f"Lightkeeper {ARROW} @{a['name']}: you hear it"
        assert msgs[0]["payload"]["ink_color"] == ""
        assert wa.drain() == msgs
        assert wb.drain() == []


def test_chat_empty_message_ignored(client):
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("chat_message", message="   ")
        wa.send("chat_message")
        assert wa.sync() == []


def test_chat_without_campaign_is_rejected(client):
    """Before tokens an unaffiliated character's chat echoed to its own channel."""
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("chat_message", message="alone")
        assert ws.sync() == [_rejected("chat_message")]


def test_chat_from_a_pending_character_is_rejected(client):
    """A pending character waits for the GM's approval and is not a member yet. Its chat
    used to reach the GM and every active member (but not itself, since
    broadcast_campaign skips non-active characters)."""
    camp = support.new_campaign(client)
    pending = support.pending_member(client, camp)
    with support.ws_connect(client, pending["id"]) as wp, support.ws_connect(client, camp["campaign_code"]) as gm:
        wp.send("chat_message", message="hello?")
        assert wp.sync() == [_rejected("chat_message")]
        assert gm.sync() == []


def test_chat_sender_name_comes_from_the_socket(client):
    """Before tokens a player could post as "The Lightkeeper" by setting sender_name."""
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", sender_name="The Lightkeeper", message="obey")
        assert wa.sync()[0]["payload"]["message"] == f"{a['name']}: obey"
        gm.drain()
        gm.send("chat_message", sender_name=a["name"], message="I am Ada")
        assert gm.sync()[0]["payload"]["message"] == "Lightkeeper: I am Ada"


# --- add_notebook_entry over the socket (unused by the frontend) -------------

def test_ws_add_notebook_entry_public(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("add_notebook_entry", campaign_id=camp["id"], title="Clue", content="a key",
                author_name="Lightkeeper", character_id=a["id"])
        msgs = wa.sync()
        assert support.types(msgs) == ["notebook_entry", "activity_log"]
        entry = msgs[0]["payload"]
        assert set(entry) == {"id", "campaign_id", "character_id", "author_name", "author_type", "pen_font",
                              "ink_color", "title", "content", "created_at", "page_number", "entry_type",
                              "visibility", "image_data", "is_deleted"}
        assert (entry["author_type"], entry["pen_font"], entry["ink_color"]) == ("player", "Caveat", "#8b1a1a")
        assert (entry["entry_type"], entry["visibility"], entry["page_number"]) == ("field_log", "all", 1)
        # the author is the socket's character, whatever author_name says
        assert (entry["author_name"], entry["character_id"]) == (a["name"], a["id"])
        assert msgs[1]["payload"] == {"message": f'{a["name"]} logged an entry: "Clue"'}
        assert support.types(wb.drain()) == ["notebook_entry", "activity_log"]
    assert support.fetch(NotebookEntry, entry["id"]).campaign_id == camp["id"]


def test_ws_add_notebook_entry_private_goes_to_sender_only(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("add_notebook_entry", campaign_id=str(camp["id"]), title="Mine", visibility="self",
                pen_font="Kalam", ink_color="#000")
        msgs = wa.sync()
        assert support.types(msgs) == ["notebook_entry"]
        # pen and ink come from the character, not the payload
        row = support.fetch(Character, a["id"])
        assert (msgs[0]["payload"]["pen_font"], msgs[0]["payload"]["ink_color"]) == \
            (row.pen_font or "Caveat", row.ink_color or "#8b1a1a")
        assert msgs[0]["payload"]["character_id"] == a["id"]
        assert wb.drain() == []
        wa.send("add_notebook_entry", title="no campaign")
        assert wa.sync() == []


def test_ws_gm_notebook_entry_is_signed_with_the_gm_username(client):
    """Before tokens the payload's author_name, pen_font and ink_color were stored as
    sent. A GM entry now carries the GM's username and the GM's default pen and ink."""
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa:
        gm.send("add_notebook_entry", campaign_id=camp["id"], title="Note", author_name=a["name"],
                pen_font="Kalam", ink_color="#000")
        [entry, log] = gm.sync()
        username = support.fetch(User, support.gm_id(camp)).username
        assert (entry["payload"]["author_name"], entry["payload"]["character_id"]) == (username, None)
        assert (entry["payload"]["pen_font"], entry["payload"]["ink_color"]) == ("Caveat", "#1a1a1a")
        assert log["payload"] == {"message": f'{username} logged an entry: "Note"'}
        assert support.types(wa.drain()) == ["notebook_entry", "activity_log"]


def test_ws_add_notebook_entry_only_into_the_senders_campaign(client):
    """Before tokens the entry landed in the payload's campaign while the broadcast
    went to the socket's campaign."""
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    other = support.new_campaign(client)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, other["campaign_code"]) as other_gm:
        wa.send("add_notebook_entry", campaign_id=other["id"], title="Planted")
        wa.send("add_notebook_entry", campaign_id=987654321, title="Nowhere")
        assert wa.sync() == [_rejected("add_notebook_entry"),
                             _rejected("add_notebook_entry", 404, "Campaign not found")]
        assert other_gm.drain() == []
        # Lightkeeper entries are for the GM
        wa.send("add_notebook_entry", campaign_id=camp["id"], title="Secret", visibility="gm_only")
        assert wa.sync() == [_rejected("add_notebook_entry")]
    assert support.fetch_all(NotebookEntry, campaign_id=other["id"]) == []
    assert support.fetch_all(NotebookEntry, campaign_id=camp["id"]) == []
