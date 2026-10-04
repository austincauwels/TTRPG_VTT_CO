import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../store/gameStore';
import {
  createGoogleAccount, fetchAuthConfig, linkGoogleAccount, registerWithPassword,
  signInWithGoogle, signInWithPassword,
} from '../utils/api';
import {
  PASSWORD_RULE, USERNAME_RULE, emailProblem, newPasswordProblem, usernameProblem,
} from '../utils/authErrors';
import { PaperSheet } from './shared/PaperSheet';

// Sign in with Google (docs/refactor/AUTH.md). Without a client ID in the build the
// screen loads nothing from Google and shows only the password form.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

// The admission slip is cut from the creator's paper (shared/PaperSheet) and filled in
// the way the creator's Profile sheet is: oxblood labels over ledger lines, one oxblood
// primary. When Google's button is on the slip it is the primary, and the password
// buttons are drawn in outline so nothing competes with it.
const labelClass = 'block font-sans font-black text-sm uppercase tracking-[0.18em] text-oxblood mb-0.5';
const inputClass = [
  'w-full bg-transparent border-0 border-b border-sepia/40 rounded-none px-0 py-2',
  'font-serif font-bold text-lg text-ink caret-oxblood transition-colors',
  'hover:border-sepia/70 focus:border-oxblood aria-[invalid=true]:border-oxblood',
  // Browser autofill paints its own blue box; keep the paper under the ink.
  'autofill:shadow-[inset_0_0_0_1000px_rgb(var(--c-parchment))] autofill:[-webkit-text-fill-color:rgb(var(--c-ink))]',
].join(' ');
const noteClass = 'font-serif text-base leading-snug text-sepia';
const errorTextClass = 'font-serif text-base leading-snug text-oxblood';
const buttonBase = 'w-full min-h-[44px] px-6 py-2.5 rounded font-sans font-black text-sm uppercase tracking-widest transition disabled:opacity-60 disabled:cursor-wait';
const primaryClass = `${buttonBase} bg-oxblood text-cream border border-ink hover:brightness-125`;
const outlineClass = `${buttonBase} bg-transparent text-oxblood border-2 border-oxblood hover:bg-oxblood hover:text-cream`;
const textButtonClass = 'min-h-[44px] px-3 font-sans font-bold text-sm uppercase tracking-widest text-sepia hover:text-oxblood underline-offset-4 hover:underline transition-colors';

// The slip is laid on the map by hand, so it sits a little crooked, like the cards and
// slips on the desks (owner's choice, 2026-10-04). Less tilt on a phone, where the slip
// fills the width.
const SLIP_TILT = 'rotate-[-0.6deg] sm:rotate-[-1deg] lg:rotate-[-1.6deg]';

// A strip of translucent paper tape with torn ends, drawn in CSS, across one top corner.
// On a phone the strips are shorter and sit closer in, so they stay inside the gutter.
const TAPE_TORN_ENDS = 'polygon(2% 0, 98% 0, 100% 22%, 97% 42%, 100% 61%, 97.5% 80%, 99% 100%, 1% 100%, 3% 79%, 0 58%, 2.5% 38%, 0 18%)';
const TAPE_SIZE = 'w-20 h-6 -top-1.5 sm:w-24 sm:h-7 sm:-top-[9px]';
const TAPE_LEFT = `${TAPE_SIZE} -left-4 sm:-left-[30px] rotate-[-38deg]`;
const TAPE_RIGHT = `${TAPE_SIZE} -right-4 sm:-right-[30px] rotate-[36deg]`;
const Tape = ({ className }) => (
  <span
    aria-hidden="true"
    className={`absolute z-20 block pointer-events-none ${className}`}
    style={{
      background: 'linear-gradient(rgb(var(--c-cream) / 0.18), transparent 45%), rgb(var(--c-parchment-deep) / 0.62)',
      clipPath: TAPE_TORN_ENDS,
    }}
  />
);

// Google Identity Services, loaded once, on first use.
let googleScript = null;
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!googleScript) {
    googleScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => (window.google?.accounts?.id
        ? resolve(window.google)
        : reject(new Error('Google Identity Services did not start')));
      script.onerror = () => reject(new Error('Google Identity Services did not load'));
      document.head.appendChild(script);
    }).catch((err) => {
      googleScript = null; // let a later visit to the screen try again
      throw err;
    });
  }
  return googleScript;
};

// One labelled ledger line. A field error replaces the help text while it stands.
const Field = ({ id, label, error, help, ...input }) => {
  const noteId = error ? `${id}-error` : help ? `${id}-help` : undefined;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        name={id}
        className={inputClass}
        aria-invalid={error ? true : undefined}
        aria-describedby={noteId}
        {...input}
      />
      {error
        ? <p id={noteId} className={`mt-1 ${errorTextClass}`}>{error}</p>
        : help && <p id={noteId} className={`mt-1 ${noteClass}`}>{help}</p>}
    </div>
  );
};

// Moves focus to the first field with an error. Returns true when there was one.
const focusFirstError = (errors, order) => {
  const first = order.find(([key]) => errors[key]);
  if (first) document.getElementById(first[1])?.focus();
  return Boolean(first);
};

const usernameInputProps = { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false };

// After a Google sign-in that belongs to no user yet: link an existing account
// (username and password, once) or create a new one (name prefilled from Google).
const GoogleAccountChoice = ({ pending, onSignedIn, onBack }) => {
  const [choice, setChoice] = useState('link');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState({ username: '', password: '' });
  const [newName, setNewName] = useState(pending.suggestedName);

  const run = async (request) => {
    setError('');
    setBusy(true);
    try {
      onSignedIn(await request());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const handleLink = (e) => {
    e.preventDefault();
    const errors = {
      linkUsername: link.username ? '' : 'Enter the username of the account you already have.',
      linkPassword: link.password ? '' : 'Enter that account\'s password.',
    };
    setFieldErrors(errors);
    if (focusFirstError(errors, [['linkUsername', 'linkUsername'], ['linkPassword', 'linkPassword']])) return;
    run(() => linkGoogleAccount(pending.linkToken, link.username, link.password));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    const name = newName.trim();
    const errors = { newUsername: usernameProblem(name) };
    setFieldErrors(errors);
    if (focusFirstError(errors, [['newUsername', 'newUsername']])) return;
    run(() => createGoogleAccount(pending.linkToken, name));
  };

  const choose = (next) => {
    setChoice(next);
    setError('');
    setFieldErrors({});
  };

  const editLink = (key, id) => (e) => {
    setLink((current) => ({ ...current, [key]: e.target.value }));
    if (fieldErrors[id]) setFieldErrors((current) => ({ ...current, [id]: '' }));
  };

  const choiceClass = (active) => `min-h-[44px] px-3 py-2 rounded border font-sans font-black text-xs uppercase tracking-wider leading-snug transition-colors ${
    active ? 'bg-oxblood border-oxblood text-cream' : 'bg-transparent border-sepia/50 text-ink hover:bg-parchment-deep/70'}`;

  return (
    <div className="mt-6 space-y-5">
      <div role="group" aria-label="How to continue" className="grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={choice === 'link'} onClick={() => choose('link')} className={choiceClass(choice === 'link')}>
          Link my existing account
        </button>
        <button type="button" aria-pressed={choice === 'create'} onClick={() => choose('create')} className={choiceClass(choice === 'create')}>
          Create a new account
        </button>
      </div>

      {choice === 'link' ? (
        <form onSubmit={handleLink} noValidate className="space-y-4">
          <p className={noteClass}>
            Enter the username and password of the account you already have, this one time.
            After that, Google signs you in.
          </p>
          <Field
            id="linkUsername" label="Username" type="text" autoComplete="username" {...usernameInputProps}
            value={link.username} onChange={editLink('username', 'linkUsername')} error={fieldErrors.linkUsername}
          />
          <Field
            id="linkPassword" label="Password" type="password" autoComplete="current-password"
            value={link.password} onChange={editLink('password', 'linkPassword')} error={fieldErrors.linkPassword}
          />
          {error && <p role="alert" className={errorTextClass}>{error}</p>}
          <button type="submit" disabled={busy} className={primaryClass}>
            {busy ? 'Linking…' : 'Link and sign in'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <p className={noteClass}>Choose the name other players will see. You will sign in with Google.</p>
          <Field
            id="newUsername" label="Username" type="text" autoComplete="username" maxLength={32}
            value={newName} help={USERNAME_RULE} error={fieldErrors.newUsername}
            onChange={(e) => { setNewName(e.target.value); setFieldErrors({}); }}
          />
          {error && <p role="alert" className={errorTextClass}>{error}</p>}
          <button type="submit" disabled={busy} className={primaryClass}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      )}

      <div className="text-center">
        <button type="button" onClick={onBack} className={textButtonClass}>Back to sign in</button>
      </div>
    </div>
  );
};

const SIGN_IN_FIELDS = [['username', 'username'], ['password', 'password']];
const REGISTER_FIELDS = [['username', 'username'], ['email', 'email'], ['password', 'password'], ['confirm', 'confirmPassword']];
const EMPTY_VALUES = { username: '', email: '', password: '', confirm: '' };

// The fallback to Google: sign in with a username and password, or create such an
// account. The typed username and password carry over between the two.
const PasswordForms = ({ registering, setRegistering, googleShown, onSignedIn, onPasswordLoginOff }) => {
  const [values, setValues] = useState(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitClass = googleShown ? outlineClass : primaryClass;

  const edit = (key) => (e) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    // Typing clears that field's error; the mismatch clears once the two agree.
    setFieldErrors((current) => ({
      ...current,
      [key]: '',
      confirm: key === 'confirm' || next.confirm === next.password ? '' : current.confirm,
    }));
  };

  // The confirmation is checked once the player leaves it, not on every key.
  const checkConfirm = () => {
    if (values.confirm && values.confirm !== values.password) {
      setFieldErrors((current) => ({ ...current, confirm: 'The two passwords do not match.' }));
    }
  };

  const switchTo = (next) => {
    setFieldErrors({});
    setFormError('');
    setRegistering(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = registering
      ? {
        username: usernameProblem(values.username),
        email: emailProblem(values.email),
        password: newPasswordProblem(values.password),
        confirm: values.confirm === values.password ? '' : 'The two passwords do not match.',
      }
      : {
        username: values.username ? '' : 'Enter your username.',
        password: values.password ? '' : 'Enter your password.',
      };
    setFieldErrors(errors);
    setFormError('');
    if (focusFirstError(errors, registering ? REGISTER_FIELDS : SIGN_IN_FIELDS)) return;

    setBusy(true);
    try {
      onSignedIn(registering
        ? await registerWithPassword(values.username, values.email.trim(), values.password)
        : await signInWithPassword(values.username, values.password));
    } catch (err) {
      setBusy(false);
      // 403: the server turned password login off after this page loaded.
      if (err.status === 403) onPasswordLoginOff(err.message);
      else setFormError(err.message);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          id="username" label="Username" type="text" autoComplete="username" {...usernameInputProps}
          value={values.username} onChange={edit('username')} error={fieldErrors.username}
          help={registering ? USERNAME_RULE : undefined}
        />
        {registering && (
          <Field
            id="email" label="Email" type="email" autoComplete="email" inputMode="email" {...usernameInputProps}
            value={values.email} onChange={edit('email')} error={fieldErrors.email}
          />
        )}
        <Field
          id="password" label="Password" type="password"
          autoComplete={registering ? 'new-password' : 'current-password'}
          value={values.password} onChange={edit('password')} error={fieldErrors.password}
          help={registering ? PASSWORD_RULE : undefined}
        />
        {registering && (
          <Field
            id="confirmPassword" label="Confirm password" type="password" autoComplete="new-password"
            value={values.confirm} onChange={edit('confirm')} onBlur={checkConfirm} error={fieldErrors.confirm}
          />
        )}

        {formError && <p role="alert" className={errorTextClass}>{formError}</p>}

        <div className="pt-1">
          <button type="submit" disabled={busy} className={submitClass}>
            {registering
              ? (busy ? 'Creating account…' : 'Create account')
              : (busy ? 'Signing in…' : 'Sign in')}
          </button>
        </div>

        {googleShown && !registering && (
          <p className={`${noteClass} italic text-center`}>
            An account linked to Google by its email address signs in with Google only; its old
            password no longer works.
          </p>
        )}
      </form>

      <div className="mt-5 pt-3 border-t border-sepia/25 flex flex-wrap items-center justify-center gap-x-1">
        {registering ? (
          <button type="button" onClick={() => switchTo(false)} className={textButtonClass}>Back to sign in</button>
        ) : (
          <>
            <span className={noteClass}>New to the chapter?</span>
            <button type="button" onClick={() => switchTo(true)} className={textButtonClass}>Create an account</button>
          </>
        )}
      </div>
    </>
  );
};

const LoginScreen = () => {
  const officialMap = import.meta.env.VITE_MAP_OFFICIAL;
  const backupMap = import.meta.env.VITE_MAP_PUBLIC;
  const [imgError, setImgError] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const mapSrc = (!imgError && officialMap) || backupMap;
  const showingOfficialMap = Boolean(officialMap) && mapSrc === officialMap && !mapFailed;

  const setAccessSession = useGameStore((s) => s.setAccessSession);

  // Which ways of signing in the server allows. Both are offered until it answers.
  const [authConfig, setAuthConfig] = useState({ google: true, password_login: true });
  const [signInError, setSignInError] = useState(''); // Google and server-wide notices
  const [googleBusy, setGoogleBusy] = useState(false);
  const [registering, setRegistering] = useState(false);
  // { linkToken, suggestedName, email } after a Google sign-in that needs an account
  const [pendingGoogle, setPendingGoogle] = useState(null);
  const googleButtonRef = useRef(null);
  const headingRef = useRef(null);
  const focusAfterStep = useRef(null);

  const showGoogle = Boolean(GOOGLE_CLIENT_ID) && authConfig.google !== false;
  const showPassword = authConfig.password_login !== false;

  useEffect(() => {
    let cancelled = false;
    fetchAuthConfig().then((config) => {
      if (!cancelled && config) setAuthConfig(config);
    });
    return () => { cancelled = true; };
  }, []);

  // A step change replaces the control that was used, so focus would fall to the page.
  // Send it to the new step's heading (Google's account step, and back from it) or to
  // the first field (sign in and create account).
  useEffect(() => {
    const target = focusAfterStep.current;
    focusAfterStep.current = null;
    if (target === 'heading') headingRef.current?.focus();
    else if (target === 'field') document.getElementById('username')?.focus();
  }, [pendingGoogle, registering]);

  const handleGoogleCredential = async ({ credential }) => {
    setSignInError('');
    setGoogleBusy(true);
    try {
      const data = await signInWithGoogle(credential);
      if (data.needs_account) {
        focusAfterStep.current = 'heading';
        setPendingGoogle({ linkToken: data.link_token, suggestedName: data.suggested_name || '', email: data.email || '' });
      } else {
        setAccessSession(data);
      }
    } catch (err) {
      setSignInError(err.message);
    } finally {
      setGoogleBusy(false);
    }
  };

  // Google calls back into whatever the latest render's handler is.
  const credentialHandler = useRef(handleGoogleCredential);
  credentialHandler.current = handleGoogleCredential;

  useEffect(() => {
    if (!showGoogle) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then((google) => {
        const container = googleButtonRef.current;
        if (cancelled || !container) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => credentialHandler.current(response),
        });
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: Math.min(400, Math.max(200, container.offsetWidth || 300)),
        });
      })
      .catch(() => {
        if (!cancelled) setSignInError('Sign in with Google could not load. Please check your connection and reload the page.');
      });
    return () => { cancelled = true; };
  }, [showGoogle]);

  const passwordLoginOff = (message) => {
    setAuthConfig((current) => ({ ...current, password_login: false }));
    setRegistering(false);
    setSignInError(message || 'Password sign-in is turned off. Please use Sign in with Google.');
    headingRef.current?.focus(); // the form that had focus is about to go
  };

  const switchRegistering = (next) => {
    focusAfterStep.current = 'field';
    setSignInError('');
    setRegistering(next);
  };

  const leaveGoogleStep = () => {
    focusAfterStep.current = 'heading';
    setPendingGoogle(null);
  };

  const noWayIn = !showGoogle && !showPassword;
  const title = pendingGoogle ? 'One More Step' : registering ? 'Enlist with the Chapter' : 'Chapter Admission';
  let lead;
  if (pendingGoogle) {
    lead = pendingGoogle.email
      ? <><span className="not-italic font-semibold text-ink break-all">{pendingGoogle.email}</span> is not linked to an account here yet. Link the account you already have, or create a new one.</>
      : 'This Google account is not linked to an account here yet. Link the account you already have, or create a new one.';
  } else if (noWayIn) {
    lead = 'Signing in is not available right now. Please try again later.';
  } else if (registering) {
    lead = showGoogle
      ? 'Sign in with Google and choose your name in the next step, or make an account with a password below.'
      : 'Choose a username and password for your account.';
  } else {
    lead = showPassword
      ? 'Sign in to reach your investigators and campaigns.'
      : 'Sign in with your Google account to reach your investigators and campaigns.';
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-x-clip bg-night">
      {/* The Fairelands map, fixed behind the slip, with the public map as its fallback */}
      {mapSrc && !mapFailed && (
        <img
          src={mapSrc}
          alt=""
          decoding="async"
          onError={() => (mapSrc === officialMap && backupMap ? setImgError(true) : setMapFailed(true))}
          className="fixed inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
      )}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgb(var(--c-night) / 0.7) 115%)' }}
      />

      {/* On a wide screen the slip lies right of Newfaire, so the city and the Glass Sea stay in view. */}
      <main className="relative flex-1 flex items-center justify-center lg:justify-end px-4 py-10 sm:py-14 lg:pr-[8vw]">
        <div className="relative w-full max-w-md lg:max-w-[30rem] animate-fadeIn">
          {/* Laid on the map by hand: a little crooked, taped down at the two top corners. */}
          <div className={`relative ${SLIP_TILT}`}>
            <PaperSheet
              bodyClassName="px-5 pt-7 pb-6 sm:px-9 sm:pt-9 sm:pb-8"
              role="region"
              aria-labelledby="login-heading"
            >
              <header className="text-center">
                <h1 className="font-display text-2xl sm:text-3xl leading-none tracking-[0.1em] uppercase text-ink whitespace-nowrap">
                  Candela Obscura
                </h1>
                <div aria-hidden="true" className="mt-3 mb-5 border-t-[3px] border-double border-sepia/60" />
                <h2
                  id="login-heading"
                  ref={headingRef}
                  tabIndex={-1}
                  className="font-display text-xl sm:text-2xl leading-tight uppercase tracking-[0.06em] text-oxblood"
                >
                  {title}
                </h2>
                <p className="mt-1.5 font-serif italic text-base sm:text-lg leading-snug text-sepia">{lead}</p>
              </header>

              {/* Sign in with Google. Kept mounted (hidden) during the account step so Google's button survives it. */}
              {showGoogle && (
                <div className={pendingGoogle ? 'hidden' : 'mt-6'}>
                  <div ref={googleButtonRef} className="flex justify-center min-h-[44px]" />
                  <p role="status" className={googleBusy ? `mt-2 text-center italic ${noteClass}` : 'sr-only'}>
                    {googleBusy ? 'Signing in…' : ''}
                  </p>
                </div>
              )}

              {signInError && !pendingGoogle && (
                <p role="alert" className={`mt-4 text-center ${errorTextClass}`}>{signInError}</p>
              )}

              {pendingGoogle ? (
                <GoogleAccountChoice
                  pending={pendingGoogle}
                  onSignedIn={setAccessSession}
                  onBack={leaveGoogleStep}
                />
              ) : showPassword && (
                <section aria-labelledby="password-heading" className={showGoogle ? 'mt-6' : 'mt-7'}>
                  {showGoogle ? (
                    <h3 id="password-heading" className="mb-3 flex items-center gap-3 font-serif italic text-base text-sepia">
                      <span aria-hidden="true" className="flex-1 border-t border-sepia/40" />
                      or use a username and password
                      <span aria-hidden="true" className="flex-1 border-t border-sepia/40" />
                    </h3>
                  ) : (
                    <h3 id="password-heading" className="sr-only">{registering ? 'Create an account' : 'Sign in'}</h3>
                  )}
                  <PasswordForms
                    registering={registering}
                    setRegistering={switchRegistering}
                    googleShown={showGoogle}
                    onSignedIn={setAccessSession}
                    onPasswordLoginOff={passwordLoginOff}
                  />
                </section>
              )}
            </PaperSheet>
            <Tape className={TAPE_LEFT} />
            <Tape className={TAPE_RIGHT} />
          </div>
        </div>
      </main>

      {/* The map's own credit line is cropped off by the cover fit, so it is repeated here
          on a small paper label tucked into the map's corner. */}
      {showingOfficialMap && (
        <footer className="relative px-4 pb-5 flex justify-center lg:justify-start lg:pl-[3vw]">
          <p className="max-w-sm rotate-[0.8deg] rounded-sm border border-sepia/40 bg-parchment-deep px-3 py-1.5 font-serif text-sm leading-snug text-ink shadow-[2px_4px_8px_rgba(0,0,0,0.55)]">
            The Fairelands map from the <cite>Candela Obscura Core Rulebook</cite>. Art by Marc Moreau.
            {' '}™ and © 2023 by Darrington Press LLC.
          </p>
        </footer>
      )}
    </div>
  );
};

export default LoginScreen;
