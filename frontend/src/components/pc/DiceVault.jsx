import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { apiUrl } from '../../utils/api';

// ── Ability system ────────────────────────────────────────────────────────────

export const MAX_ABILITY_USES = {
  "I Know a Guy": 1,
  "Death Defy": 1,
  "Field Experience": 1,
  "Not Again": 1,
  "In the Trenches": 1,
  "Steel Mind": 1,
  "Compartmentalization": 1,
  "Saw This Coming": 3,
};

// Maps ability name → roll modifier descriptor.
// actions: array of action keys it qualifies for, or ['any']
// condition(character): optional extra gating
// extraDice(character): number of bonus dice
// extraGild: whether to gild an extra die
// driveSubstitute: alternate drive category string, or 'any'
// autoApply: shown as locked chip, always active when conditions met
export const ABILITY_ROLL_MODS = {
  "Sweet Talk":          { actions: ['sneak'],                   extraDice: () => 1, extraGild: false, gildIfCunningResist2: true, chipLabel: (ch) => `Sweet Talk (+1d${resistRemaining(ch,'cunning') >= 2 ? ', gilded' : ''})` },
  "Open Book":           { actions: ['sway'],                    extraDice: (ch) => resistRemaining(ch,'cunning'), extraGild: false, chipLabel: (ch) => `Open Book (+${resistRemaining(ch,'cunning')}d)` },
  "Lie Detector":        { actions: ['sneak'],                   extraDice: () => 0, extraGild: true,  chipLabel: () => 'Lie Detector (gild extra die)' },
  "Misdirection":        { actions: ['hide'],                    extraDice: () => 1, extraGild: false, chipLabel: () => 'Misdirection (+1d)' },
  "Interrogation":       { actions: ['sneak'],                   extraDice: (ch) => resistRemaining(ch,'cunning'), extraGild: false, chipLabel: (ch) => `Interrogation (+${resistRemaining(ch,'cunning')}d)` },
  "Inspection":          { actions: ['survey'],                  extraDice: () => 0, extraGild: true,  chipLabel: () => 'Inspection (gild extra die)' },
  "Basic Training":      { actions: ['survey'],                  extraDice: (ch) => resistRemaining(ch,'nerve'),   extraGild: false, chipLabel: (ch) => `Basic Training (+${resistRemaining(ch,'nerve')}d)` },
  "Better Part of Valor":{ actions: ['control','move'],          extraDice: () => 0, extraGild: true,  chipLabel: () => 'Better Part of Valor (gild extra die)' },
  "Tenacious":           { actions: ['move','strike','control'], extraDice: () => 0, extraGild: true,  autoApply: true, condition: (ch) => (ch.bleed_marks || 0) >= 1, chipLabel: () => 'Tenacious (auto: gild die)' },
  "Extend Your Senses":  { actions: ['sense'],                   extraDice: (ch) => resistRemaining(ch,'intuition'), extraGild: false, chipLabel: (ch) => `Extend Your Senses (+${resistRemaining(ch,'intuition')}d)` },
  "Meticulous Notes":    { actions: ['read'],                    extraDice: () => 1, extraGild: false, condition: (ch) => resistRemaining(ch,'cunning') >= 2, chipLabel: () => 'Meticulous Notes (+1d)' },
  "Cool Under Pressure": { actions: ['any'],                     extraDice: () => 0, extraGild: false, driveSubstitute: 'cunning', chipLabel: () => 'Cool Under Pressure (use Cunning)' },
  "Practiced Patter":    { actions: ['sway','hide'],             extraDice: () => 0, extraGild: false, driveSubstitute: 'intuition', chipLabel: () => 'Practiced Patter (use Intuition)' },
  "Street Smarts":       { actions: ['survey'],                  extraDice: () => 0, extraGild: false, driveSubstitute: 'any', chipLabel: () => 'Street Smarts (any drive)' },
  "Back Against the Wall":{ actions: ['any'],                    extraDice: () => 0, extraGild: false, costBrainMark: true, chipLabel: () => 'Back Against the Wall (Brain mark → Nerve = +2d)' },
  "Sharpshooter":        { actions: ['strike'],                  extraDice: () => 2, extraGild: false, costDrive: 'nerve', condition: (ch) => (ch.nerve_current || 0) > 0, chipLabel: (ch) => `Sharpshooter (spend 1 Nerve → +2d, ${ch.nerve_current ?? '?'} left)` },
  "Dissection":          { actions: ['read'],                    extraDice: () => 0, extraGild: true,  chipLabel: () => 'Dissection (gild extra die)' },
  "Born in the Shadows": { actions: ['hide'],                    extraDice: () => 0, extraGild: true,  chipLabel: () => 'Born in the Shadows (gild extra die)' },
};

function resistRemaining(character, driveKey) {
  if (!character) return 0;
  const max = Math.floor((character[driveKey + '_max'] || 1) / 3);
  const spent = character[driveKey + '_resistance_spent'] || 0;
  return Math.max(0, max - spent);
}

export function getAvailableRollMods(character, action) {
  if (!character || !action) return [];
  const mods = [];
  const abilities = [character.role_ability, character.specialty_ability].filter(Boolean);
  const uses = character.ability_uses || {};

  abilities.forEach(abilityName => {
    const def = ABILITY_ROLL_MODS[abilityName];
    if (!def) return;
    if (!def.actions.includes(action) && !def.actions.includes('any')) return;
    if (def.condition && !def.condition(character)) return;
    const maxUses = MAX_ABILITY_USES[abilityName];
    if (maxUses && (uses[abilityName] || 0) >= maxUses) return;
    const extra = typeof def.extraDice === 'function' ? def.extraDice(character) : def.extraDice;
    if (!def.autoApply && extra === 0 && !def.extraGild && !def.driveSubstitute && !def.costBrainMark) return;
    mods.push({
      key: abilityName,
      label: def.chipLabel(character),
      autoApply: !!def.autoApply,
      extraDice: extra,
      extraGild: !!def.extraGild,
      driveSubstitute: def.driveSubstitute || null,
    });
  });
  return mods;
}

// ── Fallback styles when no ink_color is present (white-background log) ───────
const LOG_BORDER_CLASS = {
  roll:   'border-emerald-600/60',
  chat:   'border-blue-500/60',
  danger: 'border-red-600/60',
  field:  'border-[#b8860b]/60',
};
const LOG_TEXT_CLASS = {
  roll:   'text-black/80',
  chat:   'text-blue-900/80',
  danger: 'text-red-700',
  field:  'text-black/70',
};
const LOG_TAG_CLASS = {
  roll:   'text-emerald-700',
  chat:   'text-blue-600',
  danger: 'text-red-600',
  field:  'text-[#8b6914]',
};

function hex80(hex) {
  // Append 80 (50% alpha) to a hex color for a muted border
  if (!hex || !hex.startsWith('#')) return null;
  return hex + '80';
}

function hexCC(hex) {
  // 80% alpha for text
  if (!hex || !hex.startsWith('#')) return null;
  return hex + 'cc';
}

function LogEntry({ entry }) {
  // environment type: bold all-caps, no ink override
  if (entry.type === 'environment') {
    return (
      <p className="animate-fadeIn border-l-2 border-red-700/70 pl-2 font-sans font-black text-sm uppercase tracking-wider text-red-800 not-italic">
        <span className="font-mono font-black text-xs uppercase tracking-tight mr-1.5">
          [{entry.time}]
        </span>
        {entry.text}
      </p>
    );
  }

  // danger type always uses red regardless of ink_color
  const useInk = entry.inkColor && entry.type !== 'danger';

  const borderStyle = useInk ? { borderLeftColor: hex80(entry.inkColor) } : {};
  const textStyle   = useInk ? { color: hexCC(entry.inkColor) } : {};
  const tagStyle    = useInk ? { color: entry.inkColor } : {};

  return (
    <p
      className={`animate-fadeIn border-l-2 pl-2 italic ${!useInk ? (LOG_TEXT_CLASS[entry.type] ?? LOG_TEXT_CLASS.field) : 'text-black/80'} ${!useInk ? (LOG_BORDER_CLASS[entry.type] ?? LOG_BORDER_CLASS.field) : ''}`}
      style={borderStyle}
    >
      <span
        className={`font-sans font-black text-xs uppercase tracking-tight mr-1.5 not-italic ${!useInk ? (LOG_TAG_CLASS[entry.type] ?? LOG_TAG_CLASS.field) : ''}`}
        style={tagStyle}
      >
        [{entry.time}]
      </span>
      <span style={textStyle}>{entry.text}</span>
    </p>
  );
}

function TargetDropdown({ value, onChange, options, darkMode = false }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const selected = options.find(o => o.value === value) || options[0];

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const handler = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  return (
    <div ref={triggerRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 bg-transparent px-0 py-0.5 text-left transition-colors border-b ${darkMode ? 'border-slate-500 hover:border-slate-300' : 'border-[#b8a070] hover:border-[#8b6030]'}`}
      >
        {selected?.inkColor ? (
          <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ background: selected.inkColor }} />
        ) : (
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ring-1 ${darkMode ? 'bg-slate-500/40 ring-white/10' : 'bg-[#a08060]/40 ring-black/10'}`} />
        )}
        <span className="font-mono text-sm uppercase tracking-wider flex-1" style={{ color: selected?.inkColor || (darkMode ? '#cbd5e1' : '#5a4030') }}>
          {selected?.label}
        </span>
        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-[#8b6040]/60'}`}>{open ? '▲' : '▼'}</span>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ ...menuStyle, background: darkMode ? '#1e293b' : '#f0e8d0' }}
          className={`border-t-0 shadow-[2px_4px_12px_rgba(0,0,0,0.4)] ${darkMode ? 'border border-slate-600' : 'border border-[#c8b080]'}`}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 transition-colors ${
                opt.value === value
                  ? (darkMode ? 'bg-slate-700' : 'bg-[#e0d0a8]/60')
                  : (darkMode ? 'hover:bg-slate-700/60' : 'hover:bg-[#e8dcc0]/50')
              }`}
            >
              {opt.inkColor ? (
                <span className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ background: opt.inkColor }} />
              ) : (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ring-1 ${darkMode ? 'bg-slate-500/40 ring-white/10' : 'bg-[#a08060]/40 ring-black/10'}`} />
              )}
              <span className="font-mono text-sm uppercase tracking-wider" style={{ color: opt.inkColor || (darkMode ? '#cbd5e1' : '#5a4030') }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function driveKeyFor(action) {
  return ['move','strike','control'].includes(action) ? 'nerve'
       : ['hide','sneak','sway'].includes(action)    ? 'cunning'
       : 'intuition';
}

const ACTION_LABEL = {
  move: 'Move', strike: 'Strike', control: 'Control',
  sway: 'Sway', sneak: 'Read', hide: 'Hide',
  survey: 'Survey', read: 'Focus', sense: 'Sense',
};

const InviteRejoinSection = () => {
  const { lastPlayedCampaign, accessSession } = useGameStore(useShallow(s => ({
    lastPlayedCampaign: s.lastPlayedCampaign,
    accessSession: s.accessSession,
  })));
  const activeCampaignId = lastPlayedCampaign?.campaignId ?? accessSession?.campaignId ?? null;
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!username.trim() || !activeCampaignId) { setError('Enter a username.'); return; }
    setError('');
    try {
      const res = await fetch(apiUrl(`/campaign/${activeCampaignId}/invite-rejoin`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (res.ok) { setSuccess(true); setUsername(''); setTimeout(() => setSuccess(false), 4000); }
      else { const data = await res.json().catch(() => ({})); setError(data.detail || 'Failed to send invite.'); }
    } catch { setError('Network error.'); }
  };

  return (
    <div className="rounded-sm border border-[#1e3a5f] bg-[#0a1525] p-4 shadow-inner">
      <button onClick={() => setShowForm(v => !v)} className="w-full flex items-center gap-3">
        <div className="h-[1px] flex-1 bg-[#2d5a8e]/50" />
        <h3 className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#60a5fa] whitespace-nowrap">
          Invite Player to Rejoin
        </h3>
        <div className="h-[1px] flex-1 bg-[#2d5a8e]/50" />
        <span className="font-mono text-[#60a5fa] text-xs ml-1">{showForm ? '▲' : '▼'}</span>
      </button>
      {showForm && (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] text-[#3b82f6]/60 uppercase tracking-widest leading-relaxed">
            Enter the player's username. They will receive a notification on their next login.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Username"
              className="flex-1 bg-[#0c1c32] border border-[#1e3a5f] text-[#c9b89a] font-mono text-sm px-3 py-2 focus:outline-none focus:border-[#60a5fa] rounded-sm"
            />
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-[#1e3a5f] hover:bg-[#2d5a8e] border border-[#2d5a8e] text-[#60a5fa] font-mono font-bold text-xs uppercase tracking-[0.15em] transition-colors"
            >
              Send
            </button>
          </div>
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          {success && <p className="font-mono text-xs text-green-400">Invite sent successfully.</p>}
        </div>
      )}
    </div>
  );
};

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

  const [gmDiceCount, setGmDiceCount] = useState(1);
  const [gmSecretRoll, setGmSecretRoll] = useState(false);
  const [chatTarget, setChatTarget] = useState('@Circle');
  const [chatMessage, setChatMessage] = useState('');
  const chatInputRef = useRef(null);
  const logContainerRef = useRef(null);

  const logEntries = externalLog ?? activityLog;
  const gildedPending = !!(pendingGildedChoice && lastRoll?.needs_gilded_choice);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logEntries.length]);

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
      prompts.push({ key: 'Flourish', label: 'Flourish — spend 2 Cunning to push result up one tier', params: {} });
    }
    if ((roleAbility === 'Learn from My Mistakes' || ability === 'Learn from My Mistakes') && isFail) {
      prompts.push({ key: 'Learn from My Mistakes', label: 'Learn from My Mistakes — refresh 1 drive', params: {}, drivePicker: true });
    }
    if (ability === 'Bending Spoons' && lastRoll.action === 'sense' && isMixed) {
      prompts.push({ key: 'Bending Spoons', label: 'Bending Spoons — take 1 Bleed mark to upgrade to Full Success', params: {} });
    }
    return prompts;
  }, [lastRoll?.id, character?.specialty_ability, character?.role_ability]);

  const [dismissedPrompts, setDismissedPrompts] = useState([]);
  const [drivePickerPrompt, setDrivePickerPrompt] = useState(null);
  const visiblePrompts = postRollAbilityPrompts.filter(p => !dismissedPrompts.includes(p.key));

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

  // Use explicitly passed playerList (for GM) if non-empty, else fall back to circleCreation investigators (for PC)
  const investigators = (playerList && playerList.length > 0) ? playerList : (circleCreation?.activeInvestigators || []);
  const targetOptions = [
    { value: '@Circle', label: '@Circle — all', inkColor: null },
    ...investigators.map(inv => ({
      value: `@${inv.name}`,
      label: `@${inv.name} — private`,
      inkColor: inv.ink_color || null,
    })),
    ...(showGmControls ? [{ value: '@Environment', label: '@Environment — broadcast', inkColor: '#8b0000' }] : []),
  ];

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

  // Reset dismissed prompts when a new roll arrives
  useEffect(() => {
    setDismissedPrompts([]);
    setDrivePickerPrompt(null);
  }, [lastRoll?.id]);

  const handleDieClick = (die) => {
    if (!gildedPending) return;
    resolveGildedChoice(pendingGildedChoice.action, die.is_gilded ? 'gilded' : 'regular', die.value);
  };

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    sendChat(chatTarget, chatMessage.trim());
    setChatMessage('');
    chatInputRef.current?.focus();
  };

  return (
    <div className="lg:col-span-3 space-y-6 mt-2">


      {/* GM DICE CONTROLS */}
      {showGmControls && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 bg-[#0f172a] px-4 py-2.5 border border-slate-700 shadow-inner rounded-sm">
          <SafeIcon name="GiRollingDices" size={26} className="text-[#3b82f6] shrink-0" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGmDiceCount(Math.max(1, gmDiceCount - 1))}
              className="w-6 h-6 bg-[#1e293b] border border-slate-600 rounded-sm text-[10px] font-bold hover:bg-[#3b82f6] transition-colors"
            >-</button>
            <span className="font-mono text-slate-100 text-sm w-4 text-center">{gmDiceCount}</span>
            <button
              onClick={() => setGmDiceCount(Math.min(10, gmDiceCount + 1))}
              className="w-6 h-6 bg-[#1e293b] border border-slate-600 rounded-sm text-[10px] font-bold hover:bg-[#3b82f6] transition-colors"
            >+</button>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto select-none" title="Secret roll — dice visible to Lightkeeper only, not logged">
            <input
              type="checkbox"
              checked={gmSecretRoll}
              onChange={e => setGmSecretRoll(e.target.checked)}
              className="w-3 h-3 accent-[#d4af37] cursor-pointer"
            />
            <span className="font-mono text-lg uppercase tracking-widest text-[#d4af37]/70 font-bold">Secret</span>
          </label>

          <button
            onClick={() => rollAction('Lightkeeper', gmDiceCount, gmSecretRoll)}
            className="px-4 py-1 bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/50 hover:bg-[#3b82f6] hover:text-white font-mono text-lg font-bold uppercase tracking-[0.2em] transition-all rounded-sm"
          >Cast</button>
        </div>
      )}

      {/* DICE TRAY */}
      <div className="bg-[#12241b] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.95),inset_0_10px_20px_rgba(0,0,0,0.95)] relative h-[270px] flex flex-col justify-between border-[12px] border-[#2e1d15] rounded-sm before:absolute before:inset-0 before:bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] before:opacity-20 before:pointer-events-none">
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-2">
          {isRolling ? (
            <div className="text-center flex flex-col items-center justify-center">
              <span className="font-serif italic text-[#d4af37] animate-pulse tracking-widest uppercase text-xs">Casting Lots...</span>
            </div>
          ) : lastRoll && lastRoll.dice ? (
            <div className="flex flex-col items-center justify-center gap-3 animate-fadeIn">
              <div className="flex flex-wrap justify-center gap-3 max-w-[190px]">
                {lastRoll.dice.map((die, idx) => {
                  const isCandidate = getIsCandidate(die, idx);
                  const delayMs = idx * 75;
                  const randomSkew = dieSkews[idx] || '0deg';

                  let extraClasses = '';
                  let clickHandler = undefined;

                  if (gildedPending) {
                    if (isCandidate) {
                      extraClasses = 'animate-liftShimmy cursor-pointer ring-2 ring-white/50 hover:ring-white hover:scale-110 transition-transform';
                      clickHandler = () => handleDieClick(die);
                    } else {
                      extraClasses = 'opacity-35';
                    }
                  } else if (isCandidate) {
                    extraClasses = 'ring-1 ring-emerald-400/60';
                  }

                  const tumbleClass = gildedPending ? '' : 'animate-dieTumble opacity-0';

                  return (
                    <div
                      key={`${lastRoll.id || idx}-${idx}`}
                      onClick={clickHandler}
                      onTouchEnd={clickHandler ? (e) => { e.preventDefault(); clickHandler(); } : undefined}
                      className={`w-11 h-11 border rounded font-serif font-black text-xl flex items-center justify-center shadow-2xl ${tumbleClass}
                        ${die.is_gilded
                          ? 'border-2 border-[#d4af37] bg-gradient-to-br from-[#e5c158] to-[#b8860b] text-[#1a1311] shadow-[0_0_15px_rgba(212,175,55,0.5)] scale-105'
                          : 'border border-[#1a1311]/20 bg-[#fdfaf4] text-[#1a1311]'}
                        ${extraClasses}`}
                      style={{ animationDelay: gildedPending ? '0ms' : `${delayMs}ms`, '--random-skew': randomSkew }}
                    >
                      {die.value}
                    </div>
                  );
                })}
              </div>

              {gildedPending && (
                <p className="text-[10px] font-serif italic text-[#d4af37]/70 tracking-wide animate-pulse mt-1">
                  Choose your die
                </p>
              )}

            </div>
          ) : (
            <div className="text-center text-emerald-100/20 text-sm italic font-serif px-4 leading-normal">
              Awaiting dice drops.
            </div>
          )}
        </div>
      </div>

      {/* ROLL MODIFICATIONS */}
      {!showGmControls && (canResist || visiblePrompts.length > 0) && (
        <div className="bg-[#1a1311] border border-[#3a2a1a] px-4 py-3 rounded-sm space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <SafeIcon name="GiDiceSixFacesFive" size={15} className="text-[#a08040]/70" />
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.25em] text-[#a08040]/70">Roll Modifications</span>
          </div>
          {canResist && (
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs text-[#a08040]/80">
                Burn resistance — reroll {lastRoll?.action ? (character?.[lastRoll.action] || 0) : 0}d
                {(lastRoll?.action && (character?.[lastRoll.action] || 0) === 0) ? ' (2d, take lowest)' : ''}
                &nbsp;·&nbsp;{resistMax - resistSpent} pip{resistMax - resistSpent !== 1 ? 's' : ''} remaining
              </p>
              <button
                onClick={() => burnResistance(lastRoll.action, lastRollDriveKey)}
                className="shrink-0 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest border border-[#721c15]/60 text-[#721c15] hover:bg-[#721c15] hover:text-[#fdfaf4] transition-all rounded-sm"
              >
                Burn
              </button>
            </div>
          )}

          {/* POST-ROLL ABILITY PROMPTS */}
          {visiblePrompts.map(prompt => (
            <div key={prompt.key} className="flex items-center justify-between gap-3 border-t border-[#3a2a1a] pt-2">
              <p className="font-mono text-[10px] text-[#d4af37]/80 flex-1">◈ {prompt.label}</p>
              <div className="flex gap-1.5 shrink-0">
                {prompt.drivePicker ? (
                  drivePickerPrompt === prompt.key ? (
                    <>
                      {['nerve','cunning','intuition'].map(d => (
                        <button key={d} onClick={() => { usePostRollAbility(prompt.key, { drive: d }); setDrivePickerPrompt(null); setDismissedPrompts(p => [...p, prompt.key]); }}
                          className="px-2 py-0.5 font-mono text-[10px] font-black uppercase border border-[#d4af37]/50 text-[#d4af37]/80 hover:bg-[#d4af37]/20 rounded-sm transition-all">
                          {d[0].toUpperCase() + d.slice(1)}
                        </button>
                      ))}
                    </>
                  ) : (
                    <button onClick={() => setDrivePickerPrompt(prompt.key)}
                      className="px-3 py-0.5 font-mono text-[10px] font-black uppercase border border-[#d4af37]/50 text-[#d4af37]/70 hover:bg-[#d4af37]/10 rounded-sm transition-all">
                      Use
                    </button>
                  )
                ) : (
                  <button onClick={() => { usePostRollAbility(prompt.key, prompt.params); setDismissedPrompts(p => [...p, prompt.key]); }}
                    className="px-3 py-0.5 font-mono text-[10px] font-black uppercase border border-[#d4af37]/50 text-[#d4af37]/70 hover:bg-[#d4af37]/10 rounded-sm transition-all">
                    Use
                  </button>
                )}
                <button onClick={() => setDismissedPrompts(p => [...p, prompt.key])}
                  className="px-2 py-0.5 font-mono text-[10px] border border-[#5a4030]/40 text-[#5a4030]/50 hover:text-[#a08040] rounded-sm transition-all">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ACTIVITY LOG */}
      <div className="font-sans">
        <h3 className="text-sm font-sans font-black uppercase tracking-widest text-[#d4af37] border-b border-[#d4af37]/20 pb-2 mb-3 flex items-center gap-2">
          <SafeIcon name="GiScroll" size={18} /> Activity Log
        </h3>
        <div
          ref={logContainerRef}
          className="h-[240px] overflow-y-auto space-y-3 text-base font-serif leading-normal px-3 py-2 custom-scrollbar"
          style={{
            background: '#fefefc',
            boxShadow:
              'inset 0 14px 22px -12px rgba(80,40,10,0.55), ' +
              'inset 0 -14px 22px -12px rgba(80,40,10,0.55), ' +
              'inset 8px 0 16px -12px rgba(80,40,10,0.35), ' +
              'inset -8px 0 16px -12px rgba(80,40,10,0.35)',
          }}
        >
          {logEntries.length === 0 ? (
            <p className="text-black/20 italic text-center pt-6">No activity recorded yet.</p>
          ) : (
            logEntries.map((entry, i) => <LogEntry key={i} entry={entry} />)
          )}
        </div>
      </div>

      {/* PASS NOTES — memo pad */}
      <div className="font-sans">
        <div
          className="relative shadow-[2px_5px_18px_rgba(0,0,0,0.65)] border border-[#c4a870]"
          style={{
            background: '#f4edd8',
            backgroundImage: [
              'repeating-linear-gradient(transparent, transparent 27px, rgba(150,120,70,0.14) 27px, rgba(150,120,70,0.14) 28px)',
              'linear-gradient(to right, transparent 34px, rgba(180,60,50,0.35) 34px, rgba(180,60,50,0.35) 35.5px, transparent 35.5px)',
            ].join(', '),
            backgroundPosition: '0 36px, 0 0',
          }}
        >
          {/* Memo header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#c4a870]"
            style={{ background: 'linear-gradient(to bottom, #e8d9b4, #dfd0a4)' }}
          >
            <div className="flex items-center gap-2 pl-[26px]">
              <SafeIcon name="GiDiscussion" size={13} className="text-[#5a3a18]" />
              <span className="font-sans font-black text-sm uppercase tracking-[0.35em] text-[#3a2410]">Pass Notes</span>
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#8b6030]/50">Internal</span>
          </div>

          {/* To: row */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-1 pl-[44px]">
            <span className="font-mono text-sm font-black uppercase tracking-widest text-[#7a5030]/70 shrink-0">To:</span>
            <TargetDropdown
              value={chatTarget}
              onChange={setChatTarget}
              options={targetOptions}
              darkMode={showGmControls}
            />
          </div>

          {/* Message row */}
          <div className="flex items-end gap-2 px-3 pt-1 pb-3 pl-[44px]">
            <input
              ref={chatInputRef}
              type="text"
              value={chatMessage}
              onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
              placeholder="Write your message..."
              className="flex-1 bg-transparent border-b border-[#b8a070] focus:border-[#7a5030] outline-none text-sm font-serif text-[#2a1808] placeholder-[#b8a070] py-0.5 transition-colors"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatMessage.trim()}
              className="shrink-0 px-2.5 py-1 font-mono text-xs font-black uppercase tracking-[0.25em] border border-[#8b5030] text-[#8b5030] hover:bg-[#8b5030] hover:text-[#f4edd8] transition-all disabled:opacity-30"
            >
              Send ›
            </button>
          </div>

          {/* Perforated tear edge */}
          <div
            className="h-2.5 border-t border-dashed border-[#c4a870]/70"
            style={{
              background: 'repeating-linear-gradient(to right, transparent, transparent 5px, rgba(196,168,112,0.15) 5px, rgba(196,168,112,0.15) 6px)',
            }}
          />
        </div>
      </div>

      {showGmControls && <InviteRejoinSection />}
    </div>
  );
};
