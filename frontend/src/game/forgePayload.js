// The body of POST /api/investigators/forge, built from the creator's choices. The server
// checks it against the creator's rules (backend/vtt/creation.py), so values go through as
// the creator chose them: a drive left at 0 is sent as 0 (it used to be sent as 1, which
// the server then refused). backend/tests/test_creation.py runs this with Node.
const ALL_ACTIONS = ['move', 'strike', 'control', 'hide', 'sneak', 'sway', 'survey', 'read', 'sense'];
const DRIVES = ['nerve', 'cunning', 'intuition'];

export function forgePayload(characterData, userId) {
  const actions = characterData.actions || {};
  const gilded = characterData.gildedActions || [];
  const payload = {
    name: characterData.name || 'Unknown Investigator',
    pronouns: characterData.pronouns || 'Unlisted',
    style: characterData.style || '',
    catalyst: characterData.catalyst || '',
    question: characterData.question || '',
    role: characterData.role || '',
    specialty: characterData.specialty || '',
    role_ability: characterData.roleAbility || 'None',
    specialty_ability: characterData.specialtyAbility || 'None',
    gear: characterData.gear || [],
    profile_pic: characterData.profilePic || null,
    user_id: userId || null,
  };
  for (const act of ALL_ACTIONS) {
    payload[act] = actions[act] || 0;
    payload[`gilded_${act}`] = gilded.includes(act);
  }
  // A new investigator starts with full drives
  for (const drive of DRIVES) {
    payload[`${drive}_max`] = characterData[`${drive}_max`] ?? 0;
    payload[`${drive}_current`] = characterData[`${drive}_max`] ?? 0;
  }
  return payload;
}
