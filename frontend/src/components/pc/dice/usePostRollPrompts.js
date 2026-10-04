import { useState, useEffect, useMemo } from 'react';

// Post-roll ability prompts (Flourish, Learn from My Mistakes, Bending Spoons). The memo
// deliberately depends only on the roll id and the two abilities; keep that list as it is.
export const usePostRollPrompts = ({ lastRoll, character, showGmControls }) => {
  // Post-roll ability prompts
  const postRollAbilityPrompts = useMemo(() => {
    if (!lastRoll || !character || showGmControls) return [];
    const prompts = [];
    const ability = character.specialty_ability;
    const roleAbility = character.role_ability;
    const outcome = lastRoll.outcome;
    const isFail = outcome === 'failure';
    const isMiss = outcome === 'failure';
    const isMixed = outcome === 'mixed_success';

    if ((roleAbility === 'Well-Read' || ability === 'Well-Read') && isFail && lastRoll.drive_spent_key === 'intuition' && (lastRoll.drive_spent || 0) > 0) {
      // Auto-handled server side, show nothing
    }
    if (ability === 'Flourish' && (isMiss || isMixed) && (character.cunning_current || 0) >= 2) {
      prompts.push({ key: 'Flourish', label: 'Flourish: spend 2 Cunning to push the result up one tier', params: {} });
    }
    if ((roleAbility === 'Learn from My Mistakes' || ability === 'Learn from My Mistakes') && isFail) {
      prompts.push({ key: 'Learn from My Mistakes', label: 'Learn from My Mistakes: refresh 1 drive point', params: {}, drivePicker: true });
    }
    if (ability === 'Bending Spoons' && lastRoll.action === 'sense' && isMixed) {
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
