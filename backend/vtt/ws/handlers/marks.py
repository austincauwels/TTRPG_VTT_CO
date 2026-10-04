"""Marks and the ability offers around them: take_mark, resolve_ability_mark and intercept_mark.

secrets is deliberately not imported here. The Endurance branch of take_mark raises
NameError, which is pinned as bug D1 (docs/refactor/QUIRKS.md, tests/test_ws_marks.py)
and should be fixed in its own commit.
"""
from sqlalchemy import or_

from models import Character
from vtt.serializers import get_char_dict
from vtt.ws.manager import manager

# Abilities that can intercept marks on other players — used for efficient DB filtering
INTERCEPT_ABILITIES = {"Behind Me", "Premonitions"}


async def handle_take_mark(ctx):
    db, payload, character, target_char_id, game_id, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.target_char_id, ctx.game_id, ctx.camp_code, ctx.camp_id
    m_type = payload.get("mark_type")
    is_from_enemy = payload.get("is_from_enemy", False)
    if m_type:
        char_abilities = [character.role_ability, character.specialty_ability]
        ability_uses = dict(character.ability_uses or {})

        # Pre-mark resistance soaks (Compartmentalization, Steel Mind, In the Trenches)
        soak_map = {
            "brain": [("Compartmentalization", "nerve"), ("Steel Mind", "intuition"), ("Back Against the Wall", None)],
            "body":  [("In the Trenches", "cunning")],
        }
        soak_offers = []
        for ability_name, resist_key in soak_map.get(m_type, []):
            if ability_name in char_abilities:
                MAX_USES = {"Compartmentalization": 1, "Steel Mind": 1, "In the Trenches": 1}
                max_use = MAX_USES.get(ability_name)
                if max_use and ability_uses.get(ability_name, 0) >= max_use:
                    continue
                if resist_key:
                    resist_max = getattr(character, f"{resist_key}_max", 3) // 3
                    resist_spent = getattr(character, f"{resist_key}_resistance_spent", 0)
                    if resist_spent >= resist_max:
                        continue
                soak_offers.append({"ability": ability_name, "resist_key": resist_key})

        if soak_offers:
            await manager.broadcast(game_id, {
                "type": "ability_mark_offer",
                "payload": {"ability": soak_offers[0]["ability"], "mark_type": m_type, "character_id": target_char_id, "options": soak_offers, "action": "soak"}
            })
            return

        # Death Defy
        if is_from_enemy and "Death Defy" in char_abilities and ability_uses.get("Death Defy", 0) < 1:
            await manager.broadcast(game_id, {
                "type": "ability_mark_offer",
                "payload": {"ability": "Death Defy", "mark_type": m_type, "character_id": target_char_id, "action": "escape"}
            })
            return

        # Apply the mark
        val = getattr(character, f"{m_type}_marks", 0) + 1

        if val >= 4 and "Endurance" in char_abilities:
            # Endurance: roll Nd6 where N = Nerve resistance remaining
            nerve_max = getattr(character, "nerve_max", 3) // 3
            nerve_spent = getattr(character, "nerve_resistance_spent", 0)
            nerve_resist_remaining = max(0, nerve_max - nerve_spent)
            if nerve_resist_remaining > 0:
                endurance_roll = [secrets.randbelow(6) + 1 for _ in range(nerve_resist_remaining)]
                if any(d == 6 for d in endurance_roll):
                    # Not incapacitated — mark stays at 3
                    setattr(character, f"{m_type}_marks", 3)
                    db.commit()
                    await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                    await manager.broadcast_campaign(camp_code, camp_id, {
                        "type": "activity_log",
                        "payload": {"message": f"{character.name} used Endurance! Rolled {endurance_roll} — a 6 saves them from incapacitation!", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}
                    }, db)
                    # Still offer Adrenaline Rush if applicable
                    if "Adrenaline Rush" in char_abilities:
                        await manager.broadcast(game_id, {"type": "ability_mark_offer", "payload": {"ability": "Adrenaline Rush", "mark_type": m_type, "character_id": target_char_id, "action": "drive_refresh"}})
                    return
                else:
                    await manager.broadcast_campaign(camp_code, camp_id, {
                        "type": "activity_log",
                        "payload": {"message": f"{character.name} used Endurance — rolled {endurance_roll}, no 6. Incapacitated.", "log_type": "danger", "ink_color": getattr(character, "ink_color", "") or ""}
                    }, db)

        if val >= 4:
            setattr(character, f"{m_type}_marks", 0)
            character.incapacitated = True
            db.commit()
            await manager.broadcast(game_id, {"type": "trigger_scar", "payload": {"character_id": target_char_id, "mark_type": m_type, "character": get_char_dict(character)}})
            await manager.broadcast_campaign(camp_code, camp_id, {
                "type": "activity_log",
                "payload": {"message": f"{character.name} has been incapacitated!", "log_type": "danger", "ink_color": getattr(character, "ink_color", "") or ""}
            }, db)
        else:
            setattr(character, f"{m_type}_marks", val)
            db.commit()
            await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})

            # Let Them In: informational notification on Bleed mark
            if m_type == "bleed" and "Let Them In" in char_abilities:
                await manager.broadcast(game_id, {
                    "type": "ability_mark_offer",
                    "payload": {"ability": "Let Them In", "mark_type": m_type, "character_id": target_char_id, "action": "info"}
                })

            # Adrenaline Rush: prompt drive refresh
            if "Adrenaline Rush" in char_abilities:
                await manager.broadcast(game_id, {
                    "type": "ability_mark_offer",
                    "payload": {"ability": "Adrenaline Rush", "mark_type": m_type, "character_id": target_char_id, "action": "drive_refresh"}
                })

            # Cross-player intercept offers (Behind Me, Premonitions) — single filtered query
            intercept_candidates = db.query(Character).filter(
                Character.campaign_id == camp_id,
                Character.status == "active",
                Character.id != target_char_id,
                or_(
                    Character.role_ability.in_(INTERCEPT_ABILITIES),
                    Character.specialty_ability.in_(INTERCEPT_ABILITIES)
                )
            ).all()
            for other in intercept_candidates:
                other_abilities = {other.role_ability, other.specialty_ability}
                if "Behind Me" in other_abilities and (other.nerve_current or 0) >= 1:
                    await manager.broadcast(str(other.id), {
                        "type": "ability_intercept_offer",
                        "payload": {"ability": "Behind Me", "mark_type": m_type, "character_id": target_char_id, "character_name": character.name, "action": "intercept"}
                    })
                if "Premonitions" in other_abilities:
                    intuition_resist_max = (other.intuition_max or 3) // 3
                    if (other.intuition_resistance_spent or 0) < intuition_resist_max:
                        await manager.broadcast(str(other.id), {
                            "type": "ability_intercept_offer",
                            "payload": {"ability": "Premonitions", "mark_type": m_type, "character_id": target_char_id, "character_name": character.name, "action": "soak"}
                        })


async def handle_resolve_ability_mark(ctx):
    db, payload, character, game_id, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.game_id, ctx.camp_code, ctx.camp_id
    ab_name = payload.get("ability")
    choice = payload.get("choice")
    char_abilities = [character.role_ability, character.specialty_ability]
    ability_uses = dict(character.ability_uses or {})

    if ab_name == "Adrenaline Rush" and ab_name in char_abilities and choice in ["nerve","cunning","intuition"]:
        max_val = getattr(character, f"{choice}_max", 3)
        setattr(character, f"{choice}_current", min(max_val, getattr(character, f"{choice}_current") + 1))
        db.commit()
        await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used Adrenaline Rush — refreshed 1 {choice.capitalize()}.", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

    elif ab_name in ("Compartmentalization", "Steel Mind", "In the Trenches") and ab_name in char_abilities:
        resist_key_map = {"Compartmentalization": "nerve", "Steel Mind": "intuition", "In the Trenches": "cunning"}
        rkey = resist_key_map[ab_name]
        setattr(character, f"{rkey}_resistance_spent", getattr(character, f"{rkey}_resistance_spent", 0) + 1)
        ability_uses[ab_name] = ability_uses.get(ab_name, 0) + 1
        character.ability_uses = ability_uses
        db.commit()
        await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used {ab_name} — soaked the mark.", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

    elif ab_name == "Death Defy" and ab_name in char_abilities:
        ability_uses["Death Defy"] = 1
        character.ability_uses = ability_uses
        db.commit()
        await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
        await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used Death Defy — escaped unscathed!", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)


async def handle_intercept_mark(ctx):
    db, payload, character, game_id, camp_code, camp_id = ctx.db, ctx.payload, ctx.character, ctx.game_id, ctx.camp_code, ctx.camp_id
    ab_name = payload.get("ability")
    target_id = payload.get("target_character_id")
    m_type = payload.get("mark_type")
    char_abilities = [character.role_ability, character.specialty_ability]

    if ab_name == "Behind Me" and ab_name in char_abilities and character.nerve_current >= 1 and m_type:
        character.nerve_current = max(0, character.nerve_current - 1)

        # Remove the mark from the target (they no longer take it)
        target_char = db.query(Character).filter(Character.id == target_id).first()
        if target_char:
            prev_val = max(0, getattr(target_char, f"{m_type}_marks", 1) - 1)
            setattr(target_char, f"{m_type}_marks", prev_val)

        db.commit()

        # Broadcast target's mark removal
        if target_char:
            await manager.broadcast(str(target_id), {"type": "character_update", "payload": get_char_dict(target_char)})

        await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used Behind Me to intercept a mark for {target_char.name if target_char else 'an ally'}!", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)

        # Now apply the mark to the interceptor with the full take_mark logic
        interceptor_abilities = [character.role_ability, character.specialty_ability]
        interceptor_uses = dict(character.ability_uses or {})

        soak_map = {
            "brain": [("Compartmentalization", "nerve"), ("Steel Mind", "intuition")],
            "body":  [("In the Trenches", "cunning")],
        }
        soak_offers = []
        for ability_name, resist_key in soak_map.get(m_type, []):
            if ability_name not in interceptor_abilities: continue
            MAX_USES = {"Compartmentalization": 1, "Steel Mind": 1, "In the Trenches": 1}
            if MAX_USES.get(ability_name) and interceptor_uses.get(ability_name, 0) >= MAX_USES[ability_name]: continue
            if resist_key:
                if getattr(character, f"{resist_key}_resistance_spent", 0) >= getattr(character, f"{resist_key}_max", 3) // 3: continue
            soak_offers.append({"ability": ability_name, "resist_key": resist_key})

        if soak_offers:
            await manager.broadcast(game_id, {
                "type": "ability_mark_offer",
                "payload": {"ability": soak_offers[0]["ability"], "mark_type": m_type, "character_id": character.id, "action": "soak"}
            })
        else:
            val = getattr(character, f"{m_type}_marks", 0) + 1
            if val >= 4:
                setattr(character, f"{m_type}_marks", 0)
                character.incapacitated = True
                db.commit()
                await manager.broadcast(game_id, {"type": "trigger_scar", "payload": {"character_id": character.id, "mark_type": m_type, "character": get_char_dict(character)}})
                await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} has been incapacitated!", "log_type": "danger", "ink_color": getattr(character, "ink_color", "") or ""}}, db)
            else:
                setattr(character, f"{m_type}_marks", val)
                db.commit()
                await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
                if "Adrenaline Rush" in interceptor_abilities:
                    await manager.broadcast(game_id, {"type": "ability_mark_offer", "payload": {"ability": "Adrenaline Rush", "mark_type": m_type, "character_id": character.id, "action": "drive_refresh"}})

    elif ab_name == "Premonitions" and ab_name in char_abilities:
        intuition_resist_max = getattr(character, "intuition_max", 3) // 3
        if character.intuition_resistance_spent < intuition_resist_max:
            character.intuition_resistance_spent += 1
            db.commit()
            await manager.broadcast(game_id, {"type": "character_update", "payload": get_char_dict(character)})
            await manager.broadcast_campaign(camp_code, camp_id, {"type": "activity_log", "payload": {"message": f"{character.name} used Premonitions — soaked the mark!", "log_type": "field", "ink_color": getattr(character, "ink_color", "") or ""}}, db)
