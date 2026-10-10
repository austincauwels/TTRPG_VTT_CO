import React, { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { ConfirmAction } from '../shared/ConfirmAction';
import { FormLine, SerialNo, PrinterMark, serialFor } from '../shared/PrintMarks';
import { playPaperSound } from '../../game/rollSounds';
import { Hourglass } from '../shared/Hourglass';
import { TensionTimer, formatTime, useTimeLeft } from '../shared/TensionTimer';
import { arrivedAt } from '../../store/circleArrivals';

const clockTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const NOT_CONNECTED = 'Not sent: the desk is not connected to the table. It reconnects by itself; try again in a moment.';

// ── The tension clock: an hourglass on the desk ───────────────────────────────────
// Starts with all the sand above and runs a quarter of it down per step, from 0 to 4
// (Hourglass.jsx). The Lightkeeper's − and + stand either side of the glass at its waist,
// and the clock's name under it is theirs to write; players see both read-only. While the
// Lightkeeper's countdown is on show and partly run (running or paused), the sand shows
// the time instead, draining with it; once it runs out or is reset or cleared, the sand
// shows the tension again (owner, 2026-10-09).
export const TensionClock = ({ readOnly = false }) => {
  const { circle, socket, accessSession, lastPlayedCampaign } = useGameStore(useShallow(s => ({
    circle: s.circle,
    socket: s.socket,
    accessSession: s.accessSession,
    lastPlayedCampaign: s.lastPlayedCampaign,
  })));
  const isGM = !readOnly && (accessSession?.role === 'GM' || lastPlayedCampaign?.type === 'gm');
  const socketReady = socket?.readyState === WebSocket.OPEN;

  const currentVal = circle?.tension_clock ?? 0;
  const label = circle?.tension_label ?? '';

  // The countdown's share run, while it is on show and between its start and its end
  const at = arrivedAt(circle);
  const duration = Math.max(0, Number(circle?.timer_duration_ms) || 0);
  const timerOn = at !== undefined && !!circle?.timer_visible && duration > 0;
  const left = useTimeLeft(circle, at, timerOn);
  const draining = timerOn && left > 0 && left < duration;

  const sendUpdate = (updates) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: circle?.id || 1, ...updates },
      }));
    }
  };

  const adjust = (inc) => {
    const newVal = Math.max(0, Math.min(4, currentVal + inc));
    sendUpdate({ tension_clock: newVal });
  };

  const button = 'absolute top-1/2 -translate-y-1/2 w-10 h-10 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 rounded-full bg-gm-slate border border-moonlight-steel text-cream font-black text-lg hover:bg-moonlight-steel hover:text-gm-night transition-colors shadow-lg active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-wait';

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* The hourglass's place on the desk, 144 by 188, the glass 120 wide in it */}
      <div className="relative w-36 h-[188px] flex justify-center">
        <div role="img" aria-label={draining
          ? `Tension ${currentVal} of 4. The sand shows the timer: ${formatTime(left)} left`
          : `Tension ${currentVal} of 4`}>
          <Hourglass value={currentVal} run={draining ? 1 - left / duration : null} />
        </div>

        {/* The Lightkeeper's − and + at the glass's waist, either side of it */}
        {isGM && (
          <>
            <button onClick={() => adjust(-1)} disabled={!socketReady} aria-label="Lower tension by one"
              className={`${button} right-[calc(100%_-_8px)]`}
            >−</button>
            <button onClick={() => adjust(1)} disabled={!socketReady} aria-label="Raise tension by one"
              className={`${button} left-[calc(100%_-_8px)]`}
            >+</button>
          </>
        )}
      </div>

      {/* Label — editable by GM, read-only for players */}
      {isGM ? (
        <input type="text" defaultValue={label} key={label}
          onBlur={e => sendUpdate({ tension_label: e.target.value })}
          placeholder="Clock name"
          aria-label="Tension clock name"
          className="text-center font-sans font-bold text-xs [@media(pointer:coarse)]:text-base md:[@media(pointer:coarse)]:min-h-[44px] uppercase tracking-widest text-ink bg-parchment border border-sepia/30 px-2 py-1 w-60 max-w-full shadow-sm placeholder-sepia/90 focus:border-oxblood transition-colors"
        />
      ) : (
        <div className="font-sans font-bold text-xs uppercase tracking-widest text-ink bg-parchment border border-sepia/30 px-2 py-1 shadow-sm min-w-[9rem] text-center">
          {label || '—'}
        </div>
      )}

      {/* The timer beside the hourglass, when the Lightkeeper shows one (TensionTimer.jsx) */}
      <TensionTimer gm={isGM} />
    </div>
  );
};

// ── Scene Manager: the dispatch letter ─────────────────────────────────────────
// The Lightkeeper writes the dispatch in their own words, with a location line if
// wanted, or fills the template's blanks (location and atmosphere). The choice is
// kept in this browser; own words are the default. Each send writes all three
// fields, so the players' note shows exactly what went out (TactileSidebar.jsx).

// The longest dispatch in the Lightkeeper's own words (the server's limit, vtt/ws/access.py)
export const DISPATCH_TEXT_MAX = 2000;

const MODE_KEY = 'candela-dispatch-mode';
const readMode = () => {
  try { return localStorage.getItem(MODE_KEY) === 'template' ? 'template' : 'own'; } catch { return 'own'; }
};
const keepMode = (mode) => {
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* a private window: this visit only */ }
};

// A refusal that comes this soon after a send answers that send
const REFUSAL_WINDOW_MS = 5000;

export const SceneManager = () => {
  const { circle, socket, accessSession, circleRefusal } = useGameStore();

  const [mode, setModeState] = useState(readMode);
  const setMode = (next) => { setModeState(next); keepMode(next); };

  const [location,   setLocation]   = useState(circle?.location   || "");
  const [atmosphere, setAtmosphere] = useState(circle?.atmosphere || "");
  const [ownText,    setOwnText]    = useState(circle?.dispatch_text || "");

  // Sync inputs when circle data arrives (from Zustand rehydration or WebSocket update)
  useEffect(() => { setLocation(circle?.location   || ""); }, [circle?.location]);
  useEffect(() => { setAtmosphere(circle?.atmosphere || ""); }, [circle?.atmosphere]);
  useEffect(() => { setOwnText(circle?.dispatch_text || ""); }, [circle?.dispatch_text]);

  // A short receipt under the stamps: what went out and when, or why it did not.
  const [receipt, setReceipt] = useState(null); // { ok, text, sentAt? }

  // The server refused the dispatch just sent (nothing of it was saved): say so
  useEffect(() => {
    if (!circleRefusal || !receipt?.sentAt) return;
    const after = circleRefusal.at - receipt.sentAt;
    if (after >= 0 && after < REFUSAL_WINDOW_MS) setReceipt({ ok: false, text: `Not sent: ${circleRefusal.detail}` });
  }, [circleRefusal]); // eslint-disable-line react-hooks/exhaustive-deps

  // The letter goes out: the sheet shifts under the stamp with the paper sound (owner's
  // round 3 item 21). Still under reduced motion, where only the sound remains.
  const letterRef = useRef(null);
  const sendOff = () => {
    playPaperSound();
    const el = letterRef.current;
    if (!el?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [{ transform: 'none' }, { transform: 'translate(4px, -3px) rotate(0.4deg)', offset: 0.35 }, { transform: 'none' }],
      { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    );
  };

  // Every field of the dispatch goes each time: the own words and a location, or the
  // template's two blanks, and the other kind emptied
  const broadcastScene = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      const dispatch = mode === 'own'
        ? { dispatch_text: ownText.trim(), location, atmosphere: '' }
        : { dispatch_text: '', location, atmosphere };
      socket.send(JSON.stringify({
        type: 'gm_update_circle',
        payload: { role: accessSession?.role, circle_id: circle?.id || 1, ...dispatch },
      }));
      sendOff();
      setReceipt({ ok: true, text: `Dispatched at ${clockTime()}.`, sentAt: Date.now() });
    } else {
      setReceipt({ ok: false, text: NOT_CONNECTED });
    }
  };

  const endAssignment = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'gm_end_assignment',
        payload: { role: accessSession?.role, circle_id: circle?.id || 1, campaign_id: accessSession?.campaignId },
      }));
      setLocation("");
      setAtmosphere("");
      setOwnText("");
      setReceipt({ ok: true, text: `Assignment ended at ${clockTime()}. Ability uses, gear slots and the hourglass are reset.` });
    } else {
      setReceipt({ ok: false, text: NOT_CONNECTED });
    }
  };

  const circleName = circle?.name || 'the Circle';

  return (
    <div ref={letterRef} className="bg-parchment text-ink p-5 sm:p-8 xl:p-5 2xl:p-6 shadow-[5px_10px_25px_rgba(0,0,0,0.8)] border border-parchment-deep relative"
         style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgb(var(--c-sepia) / 0.1) 28px)', backgroundSize: '100% 28px', lineHeight: '28px' }}>

      {/* Masking tape strip */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-7 z-10 rotate-1"
        style={{
          background: 'rgb(var(--c-parchment-deep) / 0.75)',
          borderTop: '1px solid rgb(var(--c-sepia) / 0.25)',
          borderBottom: '1px solid rgb(var(--c-sepia) / 0.25)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
          backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.025) 3px, rgba(0,0,0,0.025) 6px)',
        }}
      />

      {/* Letterhead */}
      <div className="border-b-2 border-double border-sepia pb-4 mb-6 xl:pb-3 xl:mb-4 text-center relative">
        <SerialNo value={serialFor(`dispatch-${circle?.id ?? ''}`, 4)} className="absolute top-0 right-0" />
        <SafeIcon name="GiEyeShield" size={32} className="mx-auto mb-2 text-sepia" />
        <h2 className="font-display uppercase tracking-[0.08em] text-xl leading-tight">Candela Obscura</h2>
        <p className="font-serif italic text-base text-sepia leading-snug">Office of the Lightkeeper: Priority Dispatch</p>
      </div>

      {/* Own words or the template, kept in this browser */}
      <div role="group" aria-label="Dispatch" className="-mt-2 mb-4 xl:-mt-1 xl:mb-3 flex justify-center gap-6">
        {[['own', 'Own words'], ['template', 'Template']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setMode(key)} aria-pressed={mode === key}
            className={`pen-host min-h-[32px] [@media(pointer:coarse)]:min-h-[44px] px-1 font-sans font-black text-xs uppercase tracking-widest transition-colors ${
              mode === key ? 'text-ink' : 'text-sepia hover:text-ink'}`}>
            <span className={`pen-underline ${mode === key ? 'is-inked' : ''}`}>{label}</span>
          </button>
        ))}
      </div>

      {mode === 'own' ? (
        // The own words on the letter's lines, and a location line if one is given
        <div className="font-serif text-base leading-[28px] text-left text-ink">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <label htmlFor="dispatch-location" className="font-sans text-xs font-black uppercase tracking-widest text-sepia">Location</label>
            <input
              id="dispatch-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 min-w-[8rem] bg-transparent border-b border-dashed border-sepia focus:border-oxblood px-1 text-oxblood font-bold font-serif italic"
              spellCheck="false"
            />
          </div>
          <textarea
            value={ownText}
            onChange={(e) => setOwnText(e.target.value)}
            maxLength={DISPATCH_TEXT_MAX}
            rows={6}
            aria-label="Your dispatch"
            aria-describedby="dispatch-count"
            className="mt-3 block w-full min-h-[176px] max-h-[460px] resize-none bg-parchment border border-dashed border-sepia/60 focus:border-oxblood px-2 pt-1 pb-0 font-serif text-base leading-[28px] text-ink custom-scrollbar"
            style={{
              fieldSizing: 'content',
              // The letter's own lines under the words, scrolling with them
              backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgb(var(--c-sepia) / 0.16) 28px)',
              backgroundSize: '100% 28px',
              backgroundPosition: '0 4px',
              backgroundAttachment: 'local',
            }}
          />
          <p id="dispatch-count" className={`mt-1 text-right font-mono text-xs tabular-nums leading-5 ${
            ownText.length >= DISPATCH_TEXT_MAX ? 'text-oxblood' : 'text-sepia'}`}>
            {ownText.length} / {DISPATCH_TEXT_MAX}<span className="sr-only"> characters</span>
          </p>
        </div>
      ) : (
      /* The template: typed body with two blanks */
      <div className="font-serif text-base leading-[28px] text-left text-ink">
        To the investigators of {circleName}: proceed with haste to
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          aria-label="Location"
          size={Math.max(8, (location || '').length + 2)}
          style={{ fieldSizing: 'content', minWidth: '6rem' }}
          className="bg-transparent border-b border-dashed border-sepia focus:border-oxblood px-2 mx-2 text-oxblood font-bold font-serif italic text-center w-full sm:w-auto max-w-[calc(100%-1rem)] placeholder-sepia/90"
          placeholder="location"
          spellCheck="false"
        />.
        Be vigilant of strange activity. Scout Investigations report the area to be
        <textarea
          value={atmosphere}
          onChange={(e) => setAtmosphere(e.target.value)}
          className="bg-transparent border-b border-dashed border-sepia focus:border-oxblood w-full mt-2 resize-none text-oxblood font-bold font-serif italic leading-[28px] placeholder-sepia/90"
          rows="2"
          placeholder="what the place is like"
          aria-label="Atmosphere"
          spellCheck="false"
        />
        <br />
        Secure the area. Light the Way.
      </div>
      )}

      {/* Stamp buttons; End Assignment asks for a second press and says what it clears */}
      <div className="mt-8 xl:mt-5 flex justify-between items-start gap-4 relative">
        {/* End Assignment: left stamp */}
        <ConfirmAction
          className="flex flex-col items-start gap-2 max-w-[11rem]"
          onConfirm={endAssignment}
          cancelLabel="Keep going"
          armedHint="Press again to end it: the dispatch clears, the hourglass is turned back to the start, and every player's ability uses and gear slots reset."
          hintClassName="[&>p]:text-sm"
          renderButton={(armed, props) => (
            <button
              {...props}
              className="relative group transform rotate-2 hover:rotate-0 transition-transform active:scale-95"
            >
              <div className={`border-[3px] rounded px-3 py-1.5 font-sans font-black uppercase tracking-widest text-xs ${
                armed
                  ? 'border-oxblood bg-oxblood text-cream'
                  : 'border-sepia text-sepia opacity-90 group-hover:opacity-100 group-hover:bg-sepia/5'
              }`}>
                {armed ? 'Yes, end it' : 'End Assignment'}
              </div>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 pointer-events-none mix-blend-overlay" />
            </button>
          )}
        />

        {/* Dispatch: right stamp */}
        <div className="flex flex-col items-end gap-2 max-w-[11rem] text-right">
          <button
            onClick={broadcastScene}
            className="relative group transform -rotate-3 hover:rotate-0 transition-transform active:scale-95"
            aria-describedby="dispatch-effect"
          >
            <div className="border-[3px] border-oxblood rounded px-4 py-1.5 text-oxblood font-sans font-black uppercase tracking-[0.15em] text-sm opacity-90 group-hover:opacity-100 group-hover:bg-oxblood/5">
              Dispatch
            </div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 pointer-events-none mix-blend-overlay" />
          </button>
          <p id="dispatch-effect" className="sr-only">
            {mode === 'own' ? "Sends your dispatch and its location to every player's desk." : "Sends the location and atmosphere to every player's desk."}
          </p>
        </div>
      </div>
      <div className="mt-6 xl:mt-4 flex items-center gap-2" aria-hidden="true">
        <PrinterMark size={12} />
        <FormLine>Form C.O. 2 · Dispatch</FormLine>
      </div>
      {receipt && (
        <p role={receipt.ok ? 'status' : 'alert'} className={`mt-4 font-serif text-base leading-snug ${receipt.ok ? 'text-seal-green' : 'text-oxblood'}`}>
          {receipt.text}
        </p>
      )}
    </div>
  );
};
