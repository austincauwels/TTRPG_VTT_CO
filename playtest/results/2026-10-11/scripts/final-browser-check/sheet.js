const START = {
  Doctor: { actions: { control: 1, sneak: 1, survey: 1, read: 2 }, drives: { intuition: 3 }, gild: 'sneak', role: 'Scholar' },
  Detective: { actions: { control: 1, hide: 1, survey: 2, read: 1 }, drives: { nerve: 2, cunning: 1 }, gild: 'control', role: 'Slink' },
  Medium: { actions: { sneak: 2, survey: 1, sense: 2 }, drives: { cunning: 1, intuition: 2 }, gild: 'sense', role: 'Weird' },
  Soldier: { actions: { move: 2, strike: 2, control: 1 }, drives: { nerve: 1, intuition: 2 }, gild: 'strike', role: 'Muscle' },
  Criminal: { actions: { control: 1, hide: 2, survey: 1, read: 1 }, drives: { nerve: 1, cunning: 2 }, gild: 'hide', role: 'Slink' },
};
const ACTS = ['move', 'strike', 'control', 'hide', 'sneak', 'sway', 'survey', 'read', 'sense'];
function sheet(spec, roleAb, specAb, pronouns = '') {
  const s = START[spec];
  const a = Object.fromEntries(ACTS.map((k) => [k, s.actions[k] || 0]));
  const zero = ACTS.find((k) => a[k] === 0); a[zero] = 1;
  let pts = 3;
  for (const k of ACTS) { while (pts > 0 && a[k] < 2 && k !== zero) { a[k] += 1; pts -= 1; } }
  const d = { nerve: s.drives.nerve || 0, cunning: s.drives.cunning || 0, intuition: s.drives.intuition || 0 };
  let dp = 6; for (const k of ['nerve', 'cunning', 'intuition']) { while (dp > 0 && d[k] < 4) { d[k] += 1; dp -= 1; } }
  const other = ACTS.find((k) => k !== s.gild);
  const g = Object.fromEntries(ACTS.map((k) => [`gilded_${k}`, k === s.gild || k === other]));
  return { pronouns, style: 'Tidy', catalyst: 'A fire', question: 'Why?', role: s.role, specialty: spec, role_ability: roleAb, specialty_ability: specAb,
    ...a, ...g, nerve_max: d.nerve, nerve_current: d.nerve, cunning_max: d.cunning, cunning_current: d.cunning, intuition_max: d.intuition, intuition_current: d.intuition,
    gear: ['Lantern'] };
}

module.exports = { sheet };
