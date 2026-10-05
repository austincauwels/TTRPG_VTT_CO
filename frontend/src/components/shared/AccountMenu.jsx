import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useGameStore from '../../store/gameStore';
import { fetchAccount } from '../../utils/api';
import { FormLine, SerialNo, serialFor } from './PrintMarks';
import { accountHref, openAccountPage } from '../account/accountAddress';

// The signed-in account: a member's card that opens from "Account" on the hub and on both
// desks (owner's round 3 item 22). It names the account (name, email, member number), leads
// to the account page, where the username, the password, the email and the Google sign-in
// change (owner's request, 2026-10-04), and holds Sign out. The card is paper on every desk;
// only the button that opens it takes the colours of where it sits.

const TRIGGER = {
  // the hub's night header
  night: 'min-h-[40px] text-xs uppercase tracking-widest font-sans font-bold text-parchment-deep hover:text-cream border border-cream/20 hover:border-cream/40 hover:bg-cream/5 rounded px-3 py-2',
  // the player desk's header below xl, beside its Back to chapter hub
  desk: 'text-xs sm:text-sm uppercase tracking-widest font-sans font-bold text-parchment-deep hover:text-cream bg-transparent hover:bg-cream/5 border border-cream/20 hover:border-cream/40 rounded px-4 py-2.5 lg:py-2 md:[@media(pointer:coarse)]:min-h-[44px]',
  // the player desk's paper band (xl)
  paper: 'font-sans text-xs font-black uppercase tracking-widest text-sepia hover:text-ink hover:bg-black/5 border border-ink/25 hover:border-ink/50 rounded px-3 py-1.5 md:[@media(pointer:coarse)]:min-h-[44px]',
  // the Lightkeeper's Desk bar
  gm: 'min-h-[44px] lg:min-h-0 md:[@media(pointer:coarse)]:min-h-[44px] text-xs lg:text-sm font-sans font-bold uppercase tracking-widest text-cream hover:bg-gm-night bg-gm-night/80 border border-moonlight-steel/60 hover:border-moonlight-steel rounded px-4 py-2',
  // the hub: a small paper tag lying at the edge of the desk, a little crooked
  tag: 'min-h-[36px] lg:min-h-[40px] -rotate-2 text-xs uppercase tracking-widest font-sans font-black text-ink bg-parchment hover:bg-parchment-deep border border-sepia/50 rounded-sm px-2.5 py-1.5 shadow-[1px_3px_7px_rgba(0,0,0,0.65)] md:[@media(pointer:coarse)]:min-h-[44px]',
};

const CARD_WIDTH = 304; // px; narrower on a phone, where it keeps 8px from each edge
const EDGE = 8;

const buttonBase = 'w-full min-h-[44px] px-4 py-2 rounded font-sans font-black text-xs uppercase tracking-widest transition';
const outlineClass = `${buttonBase} inline-flex items-center justify-center bg-transparent text-oxblood border-2 border-oxblood hover:bg-oxblood hover:text-cream`;
const quietClass = `${buttonBase} bg-transparent text-ink border border-ink/30 hover:bg-ink hover:text-parchment`;

const Chevron = ({ open }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 12 12" width="10" height="10"
    className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
    <path d="M2 4.2 6 8l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// extra: more of the desk's own controls, laid on the card above Sign out (the GM bar puts
// Retire there on phones, so its band keeps to one row).
export const AccountMenu = ({ tone = 'night', className = '', onSignOut, extra = null }) => {
  const accessSession = useGameStore((s) => s.accessSession);
  const logout = useGameStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(null);      // GET /api/auth/me, once it answers
  const [place, setPlace] = useState(null);
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const cardId = useId();

  const close = useCallback((returnFocus) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // What the card says is read each time it opens
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    fetchAccount().then((me) => {
      if (!cancelled && me) setAccount(me);
    });
    return () => { cancelled = true; };
  }, [open]);

  // Under the button, its right edge on the button's, kept inside the window
  const measure = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(CARD_WIDTH, window.innerWidth - EDGE * 2);
    const left = Math.max(EDGE, Math.min(r.right - width, window.innerWidth - width - EDGE));
    setPlace({ top: r.bottom + 8, left, width, maxHeight: Math.max(160, window.innerHeight - r.bottom - 16) });
  }, []);

  useLayoutEffect(() => { if (open) measure(); }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || cardRef.current?.contains(e.target)) return;
      close(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      close(true);
    };
    // Tabbing out of the card closes it.
    let focusTimer = null;
    const onFocusOut = () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => {
        const active = document.activeElement;
        if (!document.hasFocus() || !active || active === document.body) return;
        if (triggerRef.current?.contains(active) || cardRef.current?.contains(active)) return;
        close(false);
      }, 0);
    };
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, close, measure]);

  // Into the card when it opens
  useEffect(() => {
    if (!open || !place) return;
    const first = cardRef.current?.querySelector('button, [href], input:not([tabindex="-1"])');
    (first || cardRef.current)?.focus({ preventScroll: true });
  }, [open, Boolean(place)]);

  if (!accessSession) return null;
  const name = account?.name || accessSession.name || '';
  const userKey = account?.userId ?? accessSession.userId;

  // A real link, so it can open in a new tab; a plain click opens the page here.
  const goToAccount = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    close(false);
    openAccountPage();
  };

  const card = open && place && createPortal(
    <div
      ref={cardRef}
      id={cardId}
      role="dialog"
      aria-label="Account"
      tabIndex={-1}
      className="fixed z-[1000] focus:outline-none"
      style={{ top: place.top, left: place.left, width: place.width }}
    >
      <div
        className="relative bg-parchment paper-texture text-ink px-4 pt-3 pb-3 overflow-y-auto custom-scrollbar animate-fadeIn"
        style={{
          maxHeight: place.maxHeight,
          border: '3px double rgb(var(--c-sepia) / 0.75)',
          boxShadow: '0 14px 30px rgba(0,0,0,0.72), inset 0 0 40px rgb(var(--c-sepia) / 0.08)',
          transform: 'rotate(-0.7deg)',
        }}
      >
        <div className="flex items-baseline justify-between gap-2" aria-hidden="true">
          <FormLine>Chapter member</FormLine>
          {userKey != null && <SerialNo value={serialFor(`member-${userKey}`)} />}
        </div>
        <p className="mt-1.5 font-serif font-bold text-xl leading-tight text-ink break-words">{name}</p>
        {account?.email && <p className="font-mono text-sm text-sepia [overflow-wrap:anywhere] leading-snug">{account.email}</p>}

        <div className="mt-3 pt-3 border-t border-dashed border-sepia/45">
          <a href={accountHref} onClick={goToAccount} className={outlineClass}>Account</a>
        </div>

        {extra}

        <div className="mt-3 pt-3 border-t border-dashed border-sepia/45">
          <button type="button" onClick={() => { close(false); (onSignOut || logout)(); }} className={quietClass}>Sign out</button>
        </div>
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        aria-haspopup="dialog"
        onClick={() => (open ? close(false) : setOpen(true))}
        className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${TRIGGER[tone] || TRIGGER.night} ${className}`}
      >
        Account <Chevron open={open} />
      </button>
      {card}
    </>
  );
};
