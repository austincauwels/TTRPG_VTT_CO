"""WebSocket chat_message and add_notebook_entry."""
import pytest

import engine
import support
from models import NotebookEntry

ARROW = support.ARROW


def _campaign_with(client, *names):
    camp = support.new_campaign(client)
    chars = [support.active_member(client, camp, name=n) for n in names]
    return camp, chars


def test_chat_to_circle(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", sender_name="Ada", message="  hello all  ")
        expected = {"type": "activity_log", "payload": {"message": "Ada: hello all", "log_type": "chat",
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


def test_chat_environment_from_player_is_allowed(client):
    """Only the UI limits @Environment to the GM."""
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("chat_message", sender_name="Ada", message="boo", target="@Environment")
        assert wa.sync()[0]["payload"]["log_type"] == "environment"


def test_whisper_goes_to_sender_gm_and_target(client):
    camp, (a, b, c) = _campaign_with(client, f"Ada {support.uid()}", f"Wolfe {support.uid()}", f"Cy {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb, \
            support.ws_connect(client, c["id"]) as wc, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", sender_name="Ada", message="psst", target=f"@{b['name'].upper()}")
        expected = {"type": "activity_log", "payload": {
            "message": f"Ada {ARROW} @{b['name'].upper()}: psst", "log_type": "chat",
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
        wa.send("chat_message", sender_name="Ada", message="hi", target="@wolfe%")
        wa.sync()
        assert support.types(wb.drain()) == ["activity_log"]


def test_whisper_to_unknown_name(client):
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, camp["campaign_code"]) as gm:
        wa.send("chat_message", sender_name="Ada", message="anyone?", target="@Nobody")
        assert support.types(wa.sync()) == ["activity_log"]
        assert support.types(gm.drain()) == ["activity_log"]


def test_gm_whisper(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, camp["campaign_code"]) as gm, support.ws_connect(client, a["id"]) as wa, \
            support.ws_connect(client, b["id"]) as wb:
        gm.send("chat_message", sender_name="Lightkeeper", message="you hear it", target=f"@{a['name']}")
        msgs = gm.sync()
        assert len(msgs) == 1
        assert msgs[0]["payload"]["ink_color"] == ""
        assert wa.drain() == msgs
        assert wb.drain() == []


def test_chat_empty_message_ignored(client):
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("chat_message", sender_name="Ada", message="   ")
        wa.send("chat_message", sender_name="Ada")
        assert wa.sync() == []


def test_chat_without_campaign_echoes_to_own_channel(client):
    ch = support.forge(client)
    with support.ws_connect(client, ch["id"]) as ws:
        ws.send("chat_message", message="alone")
        assert ws.sync() == [{"type": "activity_log", "payload": {
            "message": "Unknown: alone", "log_type": "chat", "target": "@Circle", "ink_color": ""}}]


def test_chat_from_pending_member_not_echoed(client):
    """broadcast_campaign skips non-active characters, including the sender."""
    camp = support.new_campaign(client)
    pending = support.pending_member(client, camp)
    with support.ws_connect(client, pending["id"]) as wp, support.ws_connect(client, camp["campaign_code"]) as gm:
        wp.send("chat_message", sender_name="New", message="hello?")
        assert wp.sync() == []
        assert support.types(gm.drain()) == ["activity_log"]


@pytest.mark.legacy_trust
def test_chat_sender_name_is_client_claimed(client):
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa:
        wa.send("chat_message", sender_name="The Lightkeeper", message="obey")
        assert wa.sync()[0]["payload"]["message"] == "The Lightkeeper: obey"


# --- add_notebook_entry over the socket (unused by the frontend) -------------

def test_ws_add_notebook_entry_public(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("add_notebook_entry", campaign_id=camp["id"], title="Clue", content="a key",
                author_name="Ada", character_id=a["id"])
        msgs = wa.sync()
        assert support.types(msgs) == ["notebook_entry", "activity_log"]
        entry = msgs[0]["payload"]
        assert set(entry) == {"id", "campaign_id", "character_id", "author_name", "author_type", "pen_font",
                              "ink_color", "title", "content", "created_at", "page_number", "entry_type",
                              "visibility", "image_data", "is_deleted"}
        assert (entry["author_type"], entry["pen_font"], entry["ink_color"]) == ("player", "Caveat", "#8b1a1a")
        assert (entry["entry_type"], entry["visibility"], entry["page_number"]) == ("field_log", "all", 1)
        assert msgs[1]["payload"] == {"message": 'Ada logged an entry: "Clue"'}
        assert support.types(wb.drain()) == ["notebook_entry", "activity_log"]
    assert support.fetch(NotebookEntry, entry["id"]).campaign_id == camp["id"]


def test_ws_add_notebook_entry_private_goes_to_sender_only(client):
    camp, (a, b) = _campaign_with(client, f"Ada {support.uid()}", f"Bo {support.uid()}")
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, b["id"]) as wb:
        wa.send("add_notebook_entry", campaign_id=str(camp["id"]), title="Mine", visibility="self",
                pen_font="Kalam", ink_color="#000")
        msgs = wa.sync()
        assert support.types(msgs) == ["notebook_entry"]
        assert (msgs[0]["payload"]["pen_font"], msgs[0]["payload"]["ink_color"]) == ("Kalam", "#000")
        assert wb.drain() == []
        wa.send("add_notebook_entry", title="no campaign")
        assert wa.sync() == []


@pytest.mark.legacy_trust
def test_ws_add_notebook_entry_into_another_campaign(client):
    """The entry lands in the payload's campaign; the broadcast goes to the socket's campaign."""
    camp, (a,) = _campaign_with(client, f"Ada {support.uid()}")
    other = support.new_campaign(client)
    with support.ws_connect(client, a["id"]) as wa, support.ws_connect(client, other["campaign_code"]) as other_gm:
        wa.send("add_notebook_entry", campaign_id=other["id"], title="Planted")
        msgs = wa.sync()
        assert msgs[0]["payload"]["campaign_id"] == other["id"]
        assert other_gm.drain() == []
    assert [e.title for e in support.fetch_all(NotebookEntry, campaign_id=other["id"])] == ["Planted"]
