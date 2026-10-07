import { hasAbility } from './abilities';

// Gear slots as the server counts them (backend/vtt/abilities.py gear_limit;
// tests/test_creation.py checks that the names agree). "PCs have the capacity for three
// pieces of gear on their person" (rulebook p. 52); Geared Up (p. 30) gives the Soldier
// and one ally a fourth; One Step Ahead's object (p. 31) "does not count toward your
// gear limit" and is kept in the gear list under its prefix.
export const GEAR_RULES = { slots: 3, oneStepAhead: 'One Step Ahead: ', gearedUpSlot: 'Geared Up slot' };

export const writtenIn = (gear) => gear.filter(item => typeof item === 'string' && item.startsWith(GEAR_RULES.oneStepAhead));
export const countedGear = (gear) => gear.filter(item => !writtenIn(gear).includes(item));
export const gearLimit = (character) => GEAR_RULES.slots
  + (hasAbility(character, 'Geared Up') ? 1 : 0)
  + (character?.ability_uses?.[GEAR_RULES.gearedUpSlot] || 0);
