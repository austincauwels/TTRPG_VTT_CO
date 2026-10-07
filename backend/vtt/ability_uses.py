"""Abilities used outside a roll, with the cost or limit the rulebook gives each
(pp. 27 to 32). The desk's "Use" buttons (frontend/src/game/abilityUses.js) send
use_ability; vtt/ws/handlers/character.py handle_use_ability checks and pays the cost,
and the table answers the question or plays out the effect. tests/test_creation.py
checks that the desk's table names the same abilities.

Each entry may have:
- drive: 1 point of this drive is spent ("spend 1 Intuition to ask a question").
- resistance: 1 resistance of this drive is burned (Mind Palace, Last Moments).
- mark: a mark of this kind is taken as the cost (Occult Researcher, Ritual). It is the
  character's own choice, so it is not offered to soaks, Death Defy or the allies.
- once: once per assignment, counted in ability_uses.
- options: a choice the player makes; an option may add a mark (Last Moments' still
  image) or name an effect.
- target: the player may name an ally in the circle instead of themselves (Ritual,
  Great Wards).
- effect: what the app plays out: Field Experience refreshes 1 Nerve for everyone in
  the circle, Volunteer Duty refills a circle resource, Reinvigorate refreshes 1
  resistance, One Step Ahead writes an object into a gear slot of its own, Geared Up
  gives the ally the player picks a fourth gear slot, and Blood of the Covenant refreshes
  drive points, split as the player chooses, equal to the current Intuition resistance.
  Great Wards moves the Weird's ward to the person chosen (characters.warded_by_id).
"""

ABILITY_USES = {
    # 1 drive point for a question or an effect the table plays out
    "Scout":               {"drive": "intuition"},      # p. 27
    "Uncanny Eye":         {"drive": "intuition"},      # p. 28
    "Well-Researched":     {"drive": "intuition"},      # p. 28
    "Obscure Lexicon":     {"drive": "intuition"},      # p. 29
    "Miasma":              {"drive": "intuition"},      # p. 32
    "Escape Artist":       {"drive": "nerve"},          # p. 28
    "Tactician":           {"drive": "nerve"},          # p. 29
    "Tricks of the Trade": {"drive": "nerve"},          # p. 31: before a Hide or Sway roll
    "Press Conference":    {"drive": "cunning"},        # p. 28
    "Sticky Fingers":      {"drive": "cunning"},        # p. 31: after a successful melee attack
    # A resistance burned
    "Mind Palace":         {"resistance": "intuition"},  # p. 31
    "Last Moments":        {"resistance": "intuition",   # p. 32; a Bleed mark for the still image
                            "options": {"": None, "still image": "bleed"}},
    # A mark taken as the cost
    "Occult Researcher":   {"mark": "brain"},           # p. 27: clear it if there is no detail
    "Commune":             {"mark": "brain"},           # p. 32: then a Sense roll
    "Ghostblade":          {"mark": "body"},            # p. 32
    "Ritual":              {"mark": "bleed", "target": True,  # p. 27: "on yourself or an ally"
                            "options": {"Circle of Protection": "ward", "Reinvigorate": "reinvigorate",
                                        "Remote Viewing": None}},
    # Limited uses
    "I Know a Guy":        {"once": True},              # p. 27
    "Insider Access":      {"once": True},              # p. 28
    "University Resources": {"once": True},             # p. 30: once per session
    "Field Experience":    {"once": True, "effect": "circle_nerve"},  # p. 29
    "Volunteer Duty":      {"effect": "volunteer"},     # p. 29: between assignments
    "One Step Ahead":      {"once": True, "effect": "step_ahead"},  # p. 31
    "Geared Up":           {"once": True, "effect": "geared_up"},   # p. 30: the ally's slot
    # p. 32: "The first time a dangerous phenomenon inflicts a mark on anyone in your
    # circle", read as once per assignment; whether it has happened is the player's call
    "Blood of the Covenant": {"once": True, "effect": "covenant"},
    # p. 27: "inscribe and maintain a warding symbol on one person at a time"
    "Great Wards":         {"target": True, "effect": "great_ward"},
}

# Abilities that take a scar on purpose. Their "Use" button opens the desk's scar form,
# which sends apply_scar with the ability's name (vtt/ws/handlers/character.py
# handle_apply_scar). keeps_ratings: the scar moves no action point; once: once per
# assignment, counted in ability_uses; mark: the kind of scar.
SCAR_ABILITIES = {
    "Not Again":        {"keeps_ratings": True, "once": True},  # p. 29: an automatic full success
    "Forbidden Ritual": {"mark": "bleed"},                      # p. 32
}

DRIVES = ("nerve", "cunning", "intuition")
