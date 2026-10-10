"""Chat and the WebSocket notebook entry."""
from engine import create_notebook_entry
from models import Campaign, Character, User
from vtt.ws.manager import campaign_key, character_key, manager

# The name chat shows for the GM; the frontend used the same name when the client
# still chose the sender name.
GM_SENDER_NAME = "Lightkeeper"


async def handle_chat_message(ctx):
    db, payload, character, channel = ctx.db, ctx.payload, ctx.character, ctx.channel
    # The sender is who the socket belongs to; payload.sender_name is ignored.
    if ctx.is_gm:
        sender_name = GM_SENDER_NAME
    else:
        sender_name = (character.name if character is not None else None) or "Unknown"
    text = payload.get("message", "").strip()
    target = payload.get("target", "@Circle")
    if not text:
        return

    sender_ink = getattr(character, "ink_color", "") or ""

    # Resolve campaign for this connection: the GM channel's own campaign, or the
    # player's character's campaign. A campaign code is never looked up from the path,
    # so an all-digit code cannot pull a player's chat into that campaign (QUIRK D13).
    chat_campaign = None
    if ctx.is_gm:
        chat_campaign = db.query(Campaign).filter(Campaign.id == ctx.camp_id).first()
    elif character and character.campaign_id:
        chat_campaign = db.query(Campaign).filter(Campaign.id == character.campaign_id).first()
    chat_campaign_code = chat_campaign.campaign_code if chat_campaign else None
    chat_campaign_id = chat_campaign.id if chat_campaign else None

    if target.lower() == "@environment":
        env_payload = {
            "type": "activity_log",
            "payload": {"message": text.upper(), "log_type": "environment"},
        }
        if chat_campaign_id:
            await manager.broadcast_campaign(chat_campaign_code, chat_campaign_id, env_payload, db)
        else:
            await manager.broadcast(channel, env_payload)
    elif target.lower() == "@circle":
        log_msg = f"{sender_name}: {text}"
        circle_payload = {
            "type": "activity_log",
            "payload": {"message": log_msg, "log_type": "chat", "target": target, "ink_color": sender_ink},
        }
        if chat_campaign_id:
            await manager.broadcast_campaign(chat_campaign_code, chat_campaign_id, circle_payload, db)
        else:
            await manager.broadcast(channel, circle_payload)
    else:
        log_msg = f"{sender_name} → {target}: {text}"
        chat_payload = {
            "type": "activity_log",
            "payload": {"message": log_msg, "log_type": "chat", "target": target, "ink_color": sender_ink},
        }
        player_name = target.lstrip("@")
        target_char = db.query(Character).filter(
            Character.name.ilike(player_name),
            Character.campaign_id == chat_campaign_id,
        ).first() if chat_campaign_id else db.query(Character).filter(
            Character.name.ilike(player_name)
        ).first()
        notify_ids = {channel}
        if chat_campaign_code is not None:
            notify_ids.add(campaign_key(chat_campaign_code))
        if target_char:
            notify_ids.add(character_key(target_char.id))
        for nid in notify_ids:
            await manager.broadcast(nid, chat_payload, campaign_id=chat_campaign_id)


async def handle_add_notebook_entry(ctx):
    db, payload, channel, camp_code, camp_id = ctx.db, ctx.payload, ctx.channel, ctx.camp_code, ctx.camp_id
    campaign_id = payload.get("campaign_id")
    if campaign_id:
        e_type  = payload.get("entry_type", "field_log")
        e_vis   = payload.get("visibility", "all")
        # The author is who the socket belongs to, as for REST entries: the player's
        # character (its name, pen and ink), or the GM under their username.
        # payload author_name, pen_font, ink_color and character_id are ignored.
        if ctx.is_gm:
            author_name = db.query(User.username).filter(User.id == ctx.user_id).scalar() or "Unknown"
            pen_font, ink_color, author_char_id = "Caveat", "#1a1a1a", None
        else:
            me = db.query(Character).filter(Character.id == ctx.own_char_id).first()
            author_name = me.name
            pen_font, ink_color, author_char_id = me.pen_font or "Caveat", me.ink_color or "#8b1a1a", me.id
        db_entry = create_notebook_entry(
            db,
            campaign_id  = int(campaign_id),
            title        = payload.get("title", ""),
            content      = payload.get("content", ""),
            author_name  = author_name,
            author_type  = payload.get("author_type", "player"),
            pen_font     = pen_font,
            ink_color    = ink_color,
            character_id = author_char_id,
            entry_type   = e_type,
            visibility   = e_vis,
            image_data   = payload.get("image_data"),
        )
        entry_dict = {
            "id": db_entry.id,
            "campaign_id": db_entry.campaign_id,
            "character_id": db_entry.character_id,
            "author_name": db_entry.author_name,
            "author_type": db_entry.author_type,
            "pen_font": db_entry.pen_font,
            "ink_color": db_entry.ink_color,
            "title": db_entry.title,
            "content": db_entry.content,
            "created_at": db_entry.created_at,
            "page_number": db_entry.page_number,
            "entry_type": db_entry.entry_type,
            "visibility": db_entry.visibility,
            "image_data": db_entry.image_data,
            "is_deleted": False,
        }
        # Ephemeral + gm_only entries only broadcast back to the sender
        if e_vis == "all":
            await manager.broadcast_campaign(camp_code, camp_id, {"type": "notebook_entry", "payload": entry_dict}, db)
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "activity_log",
                "payload": {"message": f"{author_name} logged an entry: \"{payload.get('title', '')}\""}
            }, db)
        else:
            await manager.broadcast(channel, {"type": "notebook_entry", "payload": entry_dict})
