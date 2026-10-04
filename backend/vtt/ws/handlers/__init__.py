"""WebSocket message handlers, one module per group of message types.

HANDLERS maps each message "type" to (handler, needs_character). A handler is an
async function that takes the WSContext for one message. When needs_character is
True the message is ignored unless the endpoint resolved a character for it (from
payload.character_id, or from a numeric game_id). Types that are not listed are
ignored. The order follows the original if/elif chain in main.py.
"""
from vtt.ws.handlers import character, chat, circle, gm, marks, rolls

HANDLERS = {
    "gm_update_tension":           (gm.handle_gm_update_tension, True),
    "gm_update_circle":            (gm.handle_gm_update_circle, False),
    "gm_transition_scene":         (gm.handle_gm_transition_scene, False),
    "roll":                        (rolls.handle_roll, False),
    "update_drive":                (character.handle_update_drive, True),
    "resolve_gilded":              (rolls.handle_resolve_gilded, True),
    "use_post_roll_ability":       (rolls.handle_use_post_roll_ability, True),
    "update_pen_font":             (character.handle_update_pen_font, True),
    "take_mark":                   (marks.handle_take_mark, True),
    "resolve_ability_mark":        (marks.handle_resolve_ability_mark, True),
    "intercept_mark":              (marks.handle_intercept_mark, True),
    "apply_scar":                  (character.handle_apply_scar, True),
    "revive_character":            (character.handle_revive_character, True),
    "burn_resistance":             (rolls.handle_burn_resistance, True),
    "update_gear":                 (character.handle_update_gear, True),
    "gm_toggle_resource_edit":     (gm.handle_gm_toggle_resource_edit, False),
    "gm_toggle_reports":           (gm.handle_gm_toggle_reports, False),
    "submit_assignment_report":    (circle.handle_submit_assignment_report, False),
    "gm_advance_circle":           (gm.handle_gm_advance_circle, False),
    "refill_resources":            (gm.handle_refill_resources, False),
    "gm_end_assignment":           (gm.handle_gm_end_assignment, False),
    "gm_reset_character":          (gm.handle_gm_reset_character, False),
    "spend_resource":              (circle.handle_spend_resource, True),
    "apply_advancement":           (character.handle_apply_advancement, True),
    "update_circle":               (gm.handle_update_circle, False),
    "circle_creation_vote":        (circle.handle_circle_creation_vote, False),
    "circle_backstory_update":     (circle.handle_circle_backstory_update, False),
    "circle_personal_answer":      (circle.handle_circle_personal_answer, False),
    "circle_relationship_propose": (circle.handle_circle_relationship_propose, False),
    "circle_relationship_respond": (circle.handle_circle_relationship_respond, False),
    "chat_message":                (chat.handle_chat_message, False),
    "add_notebook_entry":          (chat.handle_add_notebook_entry, False),
}
