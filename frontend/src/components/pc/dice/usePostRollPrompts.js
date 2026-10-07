import { useState, useEffect, useMemo } from 'react';
import { abilitiesOf } from '../../../game/abilities';
import { driveKeyFor } from '../../../game/actions';

// Post-roll ability prompts (Flourish, Learn from My Mistakes, Bending Spoons), offered on
// the rolls the server accepts them for (use_post_roll_ability in
// backend/vtt/ws/handlers/rolls.py). The memo deliberately depends only on the roll id
// (given by the store) and the two abilities; keep that list as it is.
export const usePostRollPrompts = ({ lastRoll, character, showGmControls }) => {
  // Post-roll ability prompts
  const postRollAbilityPrompts = useMemo(() => {
    if (!lastRoll || !character || showGmControls) return [];
    const prompts = [];
    const abilities = abilitiesOf(character);
    const outcome = lastRoll.outcome;
    const isFail = outcome === 'failure';
    const isMixed = outcome === 'mixed_success';
    // Well-Read is applied by the server; it needs no prompt
    // "a roll where you could spend Cunning" (p. 28): a Cunning action (Sway, Read, Hide),
    // a roll that spent Cunning, or any roll with Cool Under Pressure
    const couldTakeCunning = lastRoll.drive_spent_key === 'cunning' || driveKeyFor(lastRoll.action) === 'cunning'
      || abilities.has('Cool Under Pressure');
    if (abilities.has('Flourish') && (isFail || isMixed) && couldTakeCunning && (character.cunning_current || 0) >= 2) {
      prompts.push({ key: 'Flourish', label: 'Flourish: spend 2 Cunning to push the result up one tier', params: {} });
    }
    if (abilities.has('Learn from My Mistakes') && typeof lastRoll.result === 'number' && lastRoll.result <= 3) {
      prompts.push({ key: 'Learn from My Mistakes', label: 'Learn from My Mistakes: refresh 1 drive point', params: {}, drivePicker: true });
    }
    if (abilities.has('Bending Spoons') && lastRoll.action === 'sense' && isMixed) {
      prompts.push({ key: 'Bending Spoons', label: 'Bending Spoons: take 1 Bleed mark to make it a success', params: {} });
    }
    return prompts;
  }, [lastRoll?.id, character?.specialty_ability, character?.role_ability]);

  const [dismissedPrompts, setDismissedPrompts] = useState([]);
  const [drivePickerPrompt, setDrivePickerPrompt] = useState(null);
  const visiblePrompts = postRollAbilityPrompts.filter(p => !dismissedPrompts.includes(p.key));

  // Reset dismissed prompts when a new roll arrives
  useEffect(() => {
    setDismissedPrompts([]);
    setDrivePickerPrompt(null);
  }, [lastRoll?.id]);

  return { visiblePrompts, dismissedPrompts, setDismissedPrompts, drivePickerPrompt, setDrivePickerPrompt };
};
