import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { driveKeyFor } from '../../game/actions';
import { ActivityLog } from './dice/ActivityLog';
import { InviteRejoinSection } from './dice/InviteRejoinSection';
import { GmDiceControls } from './dice/GmDiceControls';
import { DiceTray } from './dice/DiceTray';
import { RollModifications } from './dice/RollModifications';
import { usePostRollPrompts } from './dice/usePostRollPrompts';
import { PassNotes } from './dice/PassNotes';

// The roll modifier tables now live in game/rollMods.js; these names stay importable here.
export { MAX_ABILITY_USES, ABILITY_ROLL_MODS, getAvailableRollMods } from '../../game/rollMods';

export const DiceVault = ({ showGmControls = false, logEntries: externalLog, playerList }) => {
  const {
    character, lastRoll, isRolling, activityLog, rollAction,
    pendingGildedChoice, resolveGildedChoice, sendChat, circleCreation,
    burnResistance, usePostRollAbility,
  } = useGameStore(useShallow(s => ({
    character: s.character,
    lastRoll: s.lastRoll,
    isRolling: s.isRolling,
    activityLog: s.activityLog,
    rollAction: s.rollAction,
    pendingGildedChoice: s.pendingGildedChoice,
    resolveGildedChoice: s.resolveGildedChoice,
    sendChat: s.sendChat,
    circleCreation: s.circleCreation,
    burnResistance: s.burnResistance,
    usePostRollAbility: s.usePostRollAbility,
  })));

  const logEntries = externalLog ?? activityLog;
  const gildedPending = !!(pendingGildedChoice && lastRoll?.needs_gilded_choice);

  const { visiblePrompts, setDismissedPrompts, drivePickerPrompt, setDrivePickerPrompt } =
    usePostRollPrompts({ lastRoll, character, showGmControls });

  // Resistance state after last roll
  const lastRollDriveKey = lastRoll?.action ? driveKeyFor(lastRoll.action) : null;
  const resistMax   = lastRollDriveKey ? Math.floor((character?.[lastRollDriveKey + '_max'] || 1) / 3) : 0;
  const resistSpent = lastRollDriveKey ? (character?.[lastRollDriveKey + '_resistance_spent'] || 0) : 0;
  const canResist   = !gildedPending && lastRoll && lastRoll.outcome !== 'full_success' && lastRoll.outcome !== 'critical_success' && resistMax > resistSpent && !showGmControls;

  // Skew values are stable per-roll — computed once when lastRoll changes, not on every render
  const dieSkews = useMemo(() => {
    const count = lastRoll?.dice?.length || 0;
    return Array.from({ length: count }, () => `${Math.floor(Math.random() * 40) - 20}deg`);
  }, [lastRoll?.id, lastRoll?.dice?.length]);

  const getIsCandidate = (die, idx) => {
    if (!lastRoll?.dice) return false;
    if (gildedPending) {
      return idx === lastRoll.gilded_idx || idx === lastRoll.highest_regular_idx;
    }
    if (lastRoll.type === 'zero') {
      const minVal = Math.min(...lastRoll.dice.map(d => d.value));
      return die.value === minVal;
    }
    const maxVal = Math.max(...lastRoll.dice.map(d => d.value));
    return die.value === maxVal;
  };

  const handleDieClick = (die) => {
    if (!gildedPending) return;
    resolveGildedChoice(pendingGildedChoice.action, die.is_gilded ? 'gilded' : 'regular', die.value);
  };

  return (
    <div className="lg:col-span-3 space-y-6 mt-2">


      {showGmControls && <GmDiceControls rollAction={rollAction} />}

      {/* DICE TRAY */}
      <DiceTray
        lastRoll={lastRoll}
        isRolling={isRolling}
        gildedPending={gildedPending}
        dieSkews={dieSkews}
        getIsCandidate={getIsCandidate}
        onDieClick={handleDieClick}
      />

      {/* ROLL MODIFICATIONS */}
      {!showGmControls && (canResist || visiblePrompts.length > 0) && (
        <RollModifications
          canResist={canResist}
          visiblePrompts={visiblePrompts}
          lastRoll={lastRoll}
          character={character}
          resistMax={resistMax}
          resistSpent={resistSpent}
          lastRollDriveKey={lastRollDriveKey}
          burnResistance={burnResistance}
          usePostRollAbility={usePostRollAbility}
          drivePickerPrompt={drivePickerPrompt}
          setDrivePickerPrompt={setDrivePickerPrompt}
          setDismissedPrompts={setDismissedPrompts}
        />
      )}

      {/* ACTIVITY LOG */}
      <ActivityLog logEntries={logEntries} />

      {/* PASS NOTES (memo pad) */}
      <PassNotes playerList={playerList} circleCreation={circleCreation} showGmControls={showGmControls} sendChat={sendChat} />

      {showGmControls && <InviteRejoinSection />}
    </div>
  );
};
