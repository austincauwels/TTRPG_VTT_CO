"""The server's copy of the creator's rules (vtt/creation.py) agrees with the creator
(frontend/src/components/CharacterCreator.jsx) and with the advancement dialog's ability
lists (frontend/src/components/pc/CircleView.jsx). Node reads their tables, since they
are JavaScript; the test is skipped where Node or the frontend is missing (GitHub's
runners have Node)."""
import json
import os
import pathlib
import shutil
import subprocess

import pytest

from vtt import creation

FRONTEND = pathlib.Path(__file__).resolve().parents[2] / "frontend/src/components"
CREATOR = FRONTEND / "CharacterCreator.jsx"
ADVANCEMENT = FRONTEND / "pc/CircleView.jsx"   # the advancement dialog's ability lists

# Prints the named object or array literals of a file as JSON. Each is plain data, so it
# is cut out of the file and evaluated alone.
READ_TABLES = r"""
const s = require('fs').readFileSync(process.argv[1], 'utf8');
function literal(name) {
  const start = s.indexOf('const ' + name + ' = ');
  if (start < 0) throw new Error('no ' + name);
  let i = s.indexOf('=', start) + 1;
  while (s[i] === ' ') i++;
  const open = s[i], close = open === '{' ? '}' : ']';
  let depth = 0, quote = null;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (quote) { if (c === '\\') j++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return eval('(' + s.slice(i, j + 1) + ')');
  }
  throw new Error('unclosed ' + name);
}
console.log(JSON.stringify(Object.fromEntries(process.argv.slice(2).map((n) => [n, literal(n)]))));
"""


def _read(path, *names):
    node = shutil.which("node")
    if not node or not path.exists():
        # CI sets REQUIRE_FRONTEND_TABLES, so there a missing Node fails instead of skipping
        if os.environ.get("REQUIRE_FRONTEND_TABLES"):
            pytest.fail(f"needs Node and {path.name}")
        pytest.skip(f"needs Node and {path.name}")
    out = subprocess.run([node, "-e", READ_TABLES, str(path), *names], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


@pytest.fixture(scope="module")
def creator():
    t = _read(CREATOR, "ROLES", "SPECIALTY_GILDED", "STANDARD_GEAR")
    return {"roles": t["ROLES"], "gilded": t["SPECIALTY_GILDED"], "gear": t["STANDARD_GEAR"]}


def test_the_roles_and_specialties_agree(creator):
    assert list(creator["roles"]) == list(creation.ROLES)
    for role, data in creator["roles"].items():
        ours = creation.ROLES[role]
        assert tuple(data["baseAbilities"]) == ours["abilities"], role
        assert list(data["specialties"]) == list(ours["specialties"]), role
        for name, spec in data["specialties"].items():
            mine = ours["specialties"][name]
            assert spec["startActions"] == mine["actions"], name
            assert spec["startDrives"] == mine["drives"], name
            assert tuple(spec["gear"]) == mine["gear"], name
            assert tuple(spec["abilities"]) == mine["abilities"], name
            assert creator["gilded"][name] == mine["gilded"], name


def test_the_standard_gear_agrees(creator):
    assert tuple(creator["gear"]) == creation.STANDARD_GEAR


def test_the_advancement_dialogs_abilities_agree():
    t = _read(ADVANCEMENT, "ROLE_ABILITY_POOL", "SPECIALTY_ABILITY_POOL")
    assert {r: tuple(a) for r, a in t["ROLE_ABILITY_POOL"].items()} == {
        r: d["abilities"] for r, d in creation.ROLES.items()}
    assert {s: tuple(a) for s, a in t["SPECIALTY_ABILITY_POOL"].items()} == {
        s: spec["abilities"] for d in creation.ROLES.values() for s, spec in d["specialties"].items()}


def test_each_specialty_starts_with_five_action_points_and_three_drive_points():
    for role in creation.ROLES.values():
        for name, spec in role["specialties"].items():
            assert sum(spec["actions"].values()) == 5, name
            assert sum(spec["drives"].values()) == 3, name
            assert spec["gilded"] in spec["actions"], name
