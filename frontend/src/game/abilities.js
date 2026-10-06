// A character's abilities, as the rules check them (the server's vtt/abilities.py).
// An advancement's new ability is appended to specialty_ability after "; ", so comparing
// specialty_ability with one name stops finding the specialty's own ability once a
// character has advanced. abilitiesOf splits both fields on ";".
export const abilitiesOf = (character) => {
  const names = new Set();
  [character?.role_ability, character?.specialty_ability].forEach((field) => {
    if (typeof field !== 'string') return;
    field.split(';').map((part) => part.trim()).forEach((name) => {
      if (name && name !== 'None') names.add(name);
    });
  });
  return names;
};

export const hasAbility = (character, name) => abilitiesOf(character).has(name);
