import React, { useMemo, useState, useRef, useEffect } from 'react';
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
import { RollResultBar } from './dice/RollResultBar';
import { primeRollSounds } from '../../game/rollSounds';
import { livingMembers } from '../../game/roster';

// The roll modifier tables now live in game/rollMods.js; these names stay importable here.
export { MAX_ABILITY_USES, ABILITY_ROLL_MODS, getAvailableRollMods } from '../../game/rollMods';

// phonePart: below md the player's desk shows one part at a time (MainDeskView): the felt and
// the log for 'dice'; for 'notes' the pass-notes pad over the log, where the notes passed at
// the table are written; nothing here for any other part. The phone roll bar is a pop-up of
// its own and comes up whichever part is on show.
export const DiceVault = ({ showGmControls = false, logEntries: externalLog, playerList, phonePart }) => {
  const {
    character, lastRoll: ownRoll, lastRollKept, tableRoll, isRolling, rollWaiting, rollError, activityLog, rollAction,
    pendingGildedChoice, resolveGildedChoice, sendChat, circleCreation,
    burnResistance, usePostRollAbility, campaignRoster,
  } = useGameStore(useShallow(s => ({
    character: s.character,
    lastRoll: s.lastRoll,
    lastRollKept: s.lastRollKept,
    tableRoll: s.tableRoll,
    isRolling: s.isRolling,
    rollWaiting: s.rollWaiting,
    rollError: s.rollError,
    activityLog: s.activityLog,
    rollAction: s.rollAction,
    pendingGildedChoice: s.pendingGildedChoice,
    resolveGildedChoice: s.resolveGildedChoice,
    sendChat: s.sendChat,
    circleCreation: s.circleCreation,
    burnResistance: s.burnResistance,
    usePostRollAbility: s.usePostRollAbility,
    campaignRoster: s.campaignRoster,
  })));

  const logEntries = externalLog ?? activityLog;
  // The GM's felt shows the table's newest roll: the GM's own, or a player's as its dice
  // start tumbling at that player's desk (with the die they kept). A player's felt shows
  // their own rolls only.
  const shownTable = showGmControls && tableRoll?.roll?.dice ? tableRoll : null;
  const lastRoll = shownTable ? shownTable.roll : ownRoll;
  // The roller's rating in the rolled action, so the slip can show dice added to it
  const rawRating = shownTable ? Number(shownTable.rating ?? NaN)
    : !showGmControls && lastRoll?.action && character ? Number(character[lastRoll.action]) : NaN;
  const rollRating = Number.isFinite(rawRating) ? rawRating : null;
  const gildedPending = !shownTable && !!(pendingGildedChoice && lastRoll?.needs_gilded_choice);
  // After a gilded choice, the server's result for the kept die (roll_kept). The post-roll
  // prompts and the resistance offer read the roll with that result, under its own id so
  // the prompts are worked out again; the dice themselves stay on lastRoll.
  const resolved = !shownTable && lastRollKept && lastRoll && lastRollKept.rollId === lastRoll.id ? lastRollKept : null;
  const scoredRoll = useMemo(() => (resolved
    ? { ...lastRoll, result: resolved.value, outcome: resolved.outcome, needs_gilded_choice: false, id: `${lastRoll.id}:kept${resolved.seq}` }
    : lastRoll), [lastRoll, resolved]);

  const { visiblePrompts, setDismissedPrompts, drivePickerPrompt, setDrivePickerPrompt } =
    usePostRollPrompts({ lastRoll: scoredRoll, character, showGmControls });

  // Resistance state after last roll
  const lastRollDriveKey = lastRoll?.action ? driveKeyFor(lastRoll.action) : null;
  const resistMax   = lastRollDriveKey ? Math.floor((character?.[lastRollDriveKey + '_max'] || 1) / 3) : 0;
  const resistSpent = lastRollDriveKey ? (character?.[lastRollDriveKey + '_resistance_spent'] || 0) : 0;
  const canResist   = !gildedPending && scoredRoll && scoredRoll.outcome !== 'full_success' && scoredRoll.outcome !== 'critical_success' && resistMax > resistSpent && !showGmControls;

  // Skew values are stable per-roll — computed once when lastRoll changes, not on every render
  const dieSkews = useMemo(() => {
    const count = lastRoll?.dice?.length || 0;
    return Array.from({ length: count }, () => `${Math.floor(Math.random() * 40) - 20}deg`);
  }, [lastRoll]);

  // The die kept in a gilded choice, remembered for the result and the phone roll bar until
  // the next roll. On the GM's felt a player's kept die comes with their dice.
  const [kept, setKept] = useState(null);
  const tableKept = shownTable?.kept && Number.isInteger(shownTable.kept.index)
    ? { roll: lastRoll, value: shownTable.kept.value, idx: shownTable.kept.index } : null;
  const keptDie = shownTable ? tableKept
    : kept && kept.roll === lastRoll ? kept
    : resolved ? { roll: lastRoll, value: resolved.value, idx: resolved.index } : null;

  const getIsCandidate = (die, idx) => {
    if (!lastRoll?.dice) return false;
    if (gildedPending) {
      return idx === lastRoll.gilded_idx || idx === lastRoll.highest_regular_idx;
    }
    // After a gilded choice the die that was kept is the one that counts, even when a
    // regular die shows more
    if (keptDie) return idx === keptDie.idx;
    if (lastRoll.type === 'zero') {
      const minVal = Math.min(...lastRoll.dice.map(d => d.value));
      return die.value === minVal;
    }
    const maxVal = Math.max(...lastRoll.dice.map(d => d.value));
    return die.value === maxVal;
  };

  const handleDieClick = (die, idx) => {
    if (!gildedPending) return;
    // Kept only once the choice reached the table; offline the choice stays open
    if (resolveGildedChoice(pendingGildedChoice.action, die.is_gilded ? 'gilded' : 'regular', die.value)) {
      setKept({ roll: lastRoll, value: die.value, idx });
    }
  };

  // Whether the tray itself is on screen; the phone roll bar steps aside while it is
  const trayRef = useRef(null);
  const [trayInView, setTrayInView] = useState(false);
  useEffect(() => {
    if (showGmControls || !trayRef.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setTrayInView(entry.isIntersecting), { threshold: 0.6 });
    io.observe(trayRef.current);
    return () => io.disconnect();
  }, [showGmControls]);

  // Who the tray's roll belongs to
  const rollerName = shownTable ? (shownTable.name || 'Investigator') : showGmControls ? 'Lightkeeper' : (character?.name || 'You');
  const rollerInk = shownTable ? (shownTable.ink_color || null) : showGmControls ? null : character?.ink_color;

  // Load the roll sounds while the desk is open, so the first one plays on time
  useEffect(() => { primeRollSounds(); }, []);

  const showRollModifications = !showGmControls && (canResist || visiblePrompts.length > 0);
  const onPhone = (...parts) => (phonePart === undefined || parts.includes(phonePart) ? '' : 'max-md:hidden');
  const phoneEmpty = phonePart !== undefined && phonePart !== 'dice' && phonePart !== 'notes';
  const rollModifications = (
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
      allies={livingMembers(campaignRoster?.active_investigators).filter(inv => inv.id !== character?.id)}
    />
  );

  return (
    // From xl the right rail is as tall as the window: the felt and its slip on top, the
    // pass-notes pad at the foot, and the log between them takes what is left, scrolling
    // inside itself.
    <div data-desk="dice" className={`lg:col-span-3 xl:col-span-1 space-y-6 mt-2 xl:mt-0 order-2 lg:order-none xl:h-full xl:min-h-0 xl:flex xl:flex-col xl:space-y-0 xl:gap-3 ${
      phonePart === undefined ? '' : 'max-md:flex max-md:flex-col max-md:space-y-0 max-md:gap-6'} ${phoneEmpty ? 'max-md:hidden' : ''}`}>


      {/* DICE TRAY, with the Lightkeeper's controls along its top rail on the GM's desk */}
      <div className={`xl:shrink-0 ${onPhone('dice')}`}>
        {showGmControls && <GmDiceControls rollAction={rollAction} />}
        <DiceTray
          ref={trayRef}
          lastRoll={lastRoll}
          isRolling={isRolling && !shownTable}
          rollWaiting={rollWaiting}
          rollError={rollError}
          gildedPending={gildedPending}
          dieSkews={dieSkews}
          getIsCandidate={getIsCandidate}
          onDieClick={handleDieClick}
          rollerName={rollerName}
          rollerInk={rollerInk}
          keptDie={keptDie}
          rating={rollRating}
        />
      </div>

      {/* ROLL MODIFICATIONS */}
      {showRollModifications && <div className={onPhone('dice') || undefined}>{rollModifications}</div>}

      {/* ACTIVITY LOG */}
      <ActivityLog logEntries={logEntries} gm={showGmControls} className={onPhone('dice', 'notes')} />

      {/* PASS NOTES (memo pad) */}
      <PassNotes playerList={playerList} circleCreation={circleCreation} showGmControls={showGmControls} sendChat={sendChat} className={`${onPhone('notes')} ${phonePart === 'notes' ? 'max-md:order-first' : ''}`} />

      {showGmControls && <InviteRejoinSection />}

      {/* Phones: the latest roll pinned to the bottom of the screen, opening into the tray */}
      {!showGmControls && (
        <RollResultBar
          rollerName={rollerName}
          rollerInk={rollerInk}
          lastRoll={lastRoll}
          isRolling={isRolling}
          rollWaiting={rollWaiting}
          rollError={rollError}
          gildedPending={gildedPending}
          keptDie={keptDie}
          getIsCandidate={getIsCandidate}
          onDieClick={handleDieClick}
          trayInView={trayInView}
          rating={rollRating}
          hasChoices={showRollModifications}
        >
          <DiceTray
            lastRoll={lastRoll}
            isRolling={isRolling}
            rollWaiting={rollWaiting}
            rollError={rollError}
            gildedPending={gildedPending}
            dieSkews={dieSkews}
            getIsCandidate={getIsCandidate}
            onDieClick={handleDieClick}
            rollerName={rollerName}
            rollerInk={rollerInk}
            keptDie={keptDie}
            rating={rollRating}
          />
          {showRollModifications && rollModifications}
        </RollResultBar>
      )}
    </div>
  );
};
