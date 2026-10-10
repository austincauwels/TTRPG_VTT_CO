import { useState, useEffect, useMemo, useCallback } from 'react';
import useGameStore from '../../../store/gameStore';
import { abilitiesOf } from '../../../game/abilities';
import { driveKeyFor } from '../../../game/actions';

// Post-roll ability prompts (Flourish, Learn from My Mistakes, Bending Spoons, and the
// Doctor's Patch Up and Resuscitation for an ally), offered on the rolls the server
// accepts them for (use_post_roll_ability in backend/vtt/ws/handlers/rolls.py). The memo
// deliberately depends only on the roll id (given by the store) and the two abilities;
// keep that list as it is.
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
    // a roll that spent Cunning, a Survey roll with Street Smarts (any drive may pay for
    // it), or any roll with Cool Under Pressure
    const couldTakeCunning = lastRoll.drive_spent_key === 'cunning' || driveKeyFor(lastRoll.action) === 'cunning'
      || (lastRoll.action === 'survey' && abilities.has('Street Smarts'))
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
    // Patch Up (p. 30) after a Focus roll (key read) declared a Patch Up with its chip
    // (the server says so in the roll's declared): heal 1 Body mark on an ally, for 1
    // Intuition on a 6, 2 on a 4-5, and on a 3 or less a Brain mark and 2 Intuition
    const isSuccess = outcome === 'full_success' || outcome === 'critical_success';
    const focus = lastRoll.action === 'read' && !!outcome;
    const patchCost = isSuccess ? 1 : 2;
    const patchDeclared = Array.isArray(lastRoll.declared) && lastRoll.declared.includes('Patch Up');
    if (abilities.has('Patch Up') && focus && patchDeclared && (character.intuition_current || 0) >= patchCost) {
      prompts.push({
        key: 'Patch Up', allyPicker: true, params: isFail ? { take_brain_mark: true } : {},
        label: isFail ? "Patch Up: take a Brain mark and spend 2 Intuition to heal 1 of an ally's Body marks"
          : `Patch Up: spend ${patchCost} Intuition to heal 1 of an ally's Body marks`,
      });
    }
    // Resuscitation (p. 30) after a Focus roll of 4 or more: revive an ally who took a scar
    // (not their fourth), free on a 6, for 3 drive points of your choosing on a 4-5
    if (abilities.has('Resuscitation') && focus && (isSuccess || isMixed)) {
      prompts.push({
        key: 'Resuscitation', allyPicker: true, params: {}, driveSplit: isMixed ? 3 : 0,
        label: isMixed ? 'Resuscitation: pay 3 drive points to put a scarred ally back on their feet'
          : 'Resuscitation: put a scarred ally back on their feet',
      });
    }
    return prompts;
  }, [lastRoll?.id, character?.specialty_ability, character?.role_ability]);

  // The dismissed prompts live in the store (reset by each roll), not here: this hook's
  // component is unmounted by a visit to the Notebook, which brought them back
  const dismissedPrompts = useGameStore(s => s.dismissedPrompts);
  const setDismissedPrompts = useCallback((update) => {
    const next = typeof update === 'function' ? update(useGameStore.getState().dismissedPrompts) : update;
    useGameStore.setState({ dismissedPrompts: next, rollError: null });
  }, []);
  const [drivePickerPrompt, setDrivePickerPrompt] = useState(null);
  const visiblePrompts = postRollAbilityPrompts.filter(p => !dismissedPrompts.includes(p.key));

  useEffect(() => {
    setDrivePickerPrompt(null);
  }, [lastRoll?.id]);

  return { visiblePrompts, dismissedPrompts, setDismissedPrompts, drivePickerPrompt, setDrivePickerPrompt };
};
