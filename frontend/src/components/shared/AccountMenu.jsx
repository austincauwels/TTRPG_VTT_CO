import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useGameStore from '../../store/gameStore';
import { fetchAccount, fetchAuthConfig, linkGoogleToAccount } from '../../utils/api';
import { FormLine, SerialNo, serialFor } from './PrintMarks';
import { GOOGLE_CLIENT_ID, GoogleButton } from './googleSignIn';

// The signed-in account: a member's card that opens from "Account" on the hub and on both
// desks (owner's round 3 item 22). It names the account, offers "Link Google account" to
// an account without Google (then shows "Google linked"), and holds Sign out. The card is
// paper on every desk; only the button that opens it takes the colours of where it sits.

const TRIGGER = {
  // the hub's night header
  night: 'min-h-[40px] text-xs uppercase tracking-widest font-sans font-bold text-parchment-deep hover:text-cream border border-cream/20 hover:border-cream/40 hover:bg-cream/5 rounded px-3 py-2',
  // the player desk's header below xl, beside its Back to chapter hub
  desk: 'text-xs sm:text-sm uppercase tracking-widest font-sans font-bold text-parchment-deep hover:text-cream bg-transparent hover:bg-cream/5 border border-cream/20 hover:border-cream/40 rounded px-4 py-2.5 lg:py-2',
  // the player desk's paper band (xl)
  paper: 'font-sans text-xs font-black uppercase tracking-widest text-sepia hover:text-ink hover:bg-black/5 border border-ink/25 hover:border-ink/50 rounded px-3 py-1.5',
  // the Lightkeeper's Desk bar
  gm: 'min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-sans font-bold uppercase tracking-widest text-cream hover:bg-gm-night bg-gm-night/80 border border-moonlight-steel/60 hover:border-moonlight-steel rounded px-4 py-2',
};

const CARD_WIDTH = 304; // px; narrower on a phone, where it keeps 8px from each edge
const EDGE = 8;

const buttonBase = 'w-full min-h-[44px] px-4 py-2 rounded font-sans font-black text-xs uppercase tracking-widest transition disabled:opacity-60 disabled:cursor-wait';
const primaryClass = `${buttonBase} bg-oxblood text-cream border border-ink hover:brightness-125`;
const outlineClass = `${buttonBase} bg-transparent text-oxblood border-2 border-oxblood hover:bg-oxblood hover:text-cream`;
const quietClass = `${buttonBase} bg-transparent text-ink border border-ink/30 hover:bg-ink hover:text-parchment`;
const textButtonClass = 'min-h-[40px] px-2 font-sans font-bold text-xs uppercase tracking-widest text-sepia hover:text-oxblood underline-offset-4 hover:underline transition-colors';
const errorTextClass = 'font-serif text-base leading-snug text-oxblood';

const Chevron = ({ open }) => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 12 12" width="10" height="10"
    className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
    <path d="M2 4.2 6 8l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// A tick drawn with a pen, for "Google linked"
const Tick = () => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16" className="shrink-0">
    <path d="M2.5 8.6 6.3 12 13.6 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// "Link Google account": Google's own button, then the account's password if Google's
// email is not the account's. Calls onLinked with the account once the server says so.
const LinkGoogleStep = ({ accountName, onLinked, onCancel }) => {
  const [credential, setCredential] = useState(null);
  const [askPassword, setAskPassword] = useState('');   // the server's reason, once it asks
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);

  const send = async (cred, pass) => {
    setBusy(true);
    setError('');
    setFieldError('');
    try {
      onLinked(await linkGoogleToAccount(cred, pass));
    } catch (err) {
      setBusy(false);
      const message = err.message || 'Something went wrong. Please try again.';
      if (err.status === 403 && /enter your account's password/i.test(message)) {
        // Google's email is not the account's: the password proves the account
        setAskPassword(message);
      } else if (err.status === 403 && pass) {
        setFieldError(message);
        passwordRef.current?.focus();
      } else {
        setError(message);
        if (err.status === 400 || err.status === 503) { setCredential(null); setAskPassword(''); }
      }
    }
  };

  useEffect(() => { if (askPassword) passwordRef.current?.focus(); }, [askPassword]);

  const onCredential = ({ credential: cred }) => {
    setCredential(cred);
    send(cred, null);
  };

  const submitPassword = (e) => {
    e.preventDefault();
    if (!password) { setFieldError('Enter your password.'); passwordRef.current?.focus(); return; }
    send(credential, password);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-sans text-xs font-black uppercase tracking-[0.18em] text-oxblood">Link Google account</h3>
      {askPassword ? (
        <form onSubmit={submitPassword} noValidate className="space-y-3">
          <p className="font-serif text-base leading-snug text-ink">{askPassword}</p>
          {/* For a password manager: whose password this is */}
          <input type="text" name="username" autoComplete="username" value={accountName || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
          <div>
            <label htmlFor="account-link-password" className="block font-sans font-black text-xs uppercase tracking-[0.18em] text-oxblood mb-0.5">Password</label>
            <input
              ref={passwordRef} id="account-link-password" type="password" autoComplete="current-password"
              value={password} onChange={(e) => { setPassword(e.target.value); setFieldError(''); }}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'account-link-password-error' : undefined}
              className="w-full bg-transparent border-0 border-b border-sepia/40 rounded-none px-0 py-1.5 font-serif font-bold text-lg text-ink caret-oxblood hover:border-sepia/70 focus:border-oxblood aria-[invalid=true]:border-oxblood"
            />
            {fieldError && <p id="account-link-password-error" className={`mt-1 ${errorTextClass}`}>{fieldError}</p>}
          </div>
          {error && <p role="alert" className={errorTextClass}>{error}</p>}
          <button type="submit" disabled={busy} className={primaryClass}>{busy ? 'Linking…' : 'Link'}</button>
        </form>
      ) : (
        <>
          <GoogleButton text="continue_with" maxWidth={272} onCredential={onCredential} onLoadError={setError} />
          <p role="status" className={busy ? 'font-serif italic text-base text-sepia text-center' : 'sr-only'}>{busy ? 'Linking…' : ''}</p>
          {error && <p role="alert" className={errorTextClass}>{error}</p>}
        </>
      )}
      <div className="text-center">
        <button type="button" onClick={onCancel} className={textButtonClass}>Cancel</button>
      </div>
    </div>
  );
};

export const AccountMenu = ({ tone = 'night', className = '', onSignOut }) => {
  const accessSession = useGameStore((s) => s.accessSession);
  const logout = useGameStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(null);      // GET /api/auth/me, once it answers
  const [googleOn, setGoogleOn] = useState(false);   // the server and this build offer Google
  const [linking, setLinking] = useState(false);
  const [justLinked, setJustLinked] = useState(false);
  const [place, setPlace] = useState(null);
  const triggerRef = useRef(null);
  const cardRef = useRef(null);
  const cardId = useId();

  const close = useCallback((returnFocus) => {
    setOpen(false);
    setLinking(false);
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // What the card says is read each time it opens
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    Promise.all([fetchAccount(), fetchAuthConfig()]).then(([me, config]) => {
      if (cancelled) return;
      if (me) setAccount(me);
      setGoogleOn(Boolean(GOOGLE_CLIENT_ID) && config?.google !== false);
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
    // Tabbing out of the card closes it. Google's sign-in window takes the focus away from
    // the whole page while it is open; that is not leaving the card.
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
        {account?.email && <p className="font-mono text-sm text-sepia break-all leading-snug">{account.email}</p>}

        {account && (googleOn || account.googleLinked) && (
          <div className="mt-3 pt-3 border-t border-dashed border-sepia/45">
            {account.googleLinked ? (
              <p className="flex items-center gap-2 font-serif text-base font-semibold text-seal-green">
                <Tick /> Google linked
              </p>
            ) : linking ? (
              <LinkGoogleStep
                accountName={name}
                onCancel={() => setLinking(false)}
                onLinked={(me) => { setAccount((current) => ({ ...current, ...me, googleLinked: true })); setLinking(false); setJustLinked(true); }}
              />
            ) : (
              <button type="button" onClick={() => setLinking(true)} className={outlineClass}>Link Google account</button>
            )}
          </div>
        )}
        <p role="status" className="sr-only">{justLinked && account?.googleLinked ? 'Google linked.' : ''}</p>

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
        onClick={() => (open ? close(false) : (setJustLinked(false), setOpen(true)))}
        className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors ${TRIGGER[tone] || TRIGGER.night} ${className}`}
      >
        Account <Chevron open={open} />
      </button>
      {card}
    </>
  );
};
