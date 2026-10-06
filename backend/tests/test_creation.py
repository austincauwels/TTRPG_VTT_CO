"""The server's copy of the creator's rules (vtt/creation.py) agrees with the creator
(frontend/src/components/CharacterCreator.jsx). Node reads the creator's tables, since
they are JavaScript; the test is skipped where Node or the frontend is missing (GitHub's
runners have Node)."""
import json
import pathlib
import shutil
import subprocess

import pytest

from vtt import creation

CREATOR = pathlib.Path(__file__).resolve().parents[2] / "frontend/src/components/CharacterCreator.jsx"

# Prints the creator's ROLES, SPECIALTY_GILDED and STANDARD_GEAR as JSON. Each is an
# object or array literal of plain data, so it is cut out of the file and evaluated alone.
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
console.log(JSON.stringify({
  roles: literal('ROLES'), gilded: literal('SPECIALTY_GILDED'), gear: literal('STANDARD_GEAR'),
}));
"""


@pytest.fixture(scope="module")
def creator():
    node = shutil.which("node")
    if not node or not CREATOR.exists():
        pytest.skip("needs Node and frontend/src/components/CharacterCreator.jsx")
    out = subprocess.run([node, "-e", READ_TABLES, str(CREATOR)], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


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


def test_each_specialty_starts_with_five_action_points_and_three_drive_points():
    for role in creation.ROLES.values():
        for name, spec in role["specialties"].items():
            assert sum(spec["actions"].values()) == 5, name
            assert sum(spec["drives"].values()) == 3, name
            assert spec["gilded"] in spec["actions"], name
