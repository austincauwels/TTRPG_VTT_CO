import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../store/gameStore';
import {
  confirmPasswordReset, createGoogleAccount, fetchAuthConfig, linkGoogleAccount, registerWithPassword,
  requestPasswordReset, signInWithGoogle, signInWithPassword,
} from '../utils/api';
import {
  PASSWORD_RULE, USERNAME_RULE, emailProblem, newPasswordProblem, usernameProblem,
} from '../utils/authErrors';
import { PaperSheet } from './shared/PaperSheet';
import { DateStamp, serialFor, stampDate } from './shared/PrintMarks';
import { GOOGLE_CLIENT_ID, GoogleButton } from './shared/googleSignIn';

// The admission slip is cut from the creator's paper (shared/PaperSheet) and filled in
// the way the creator's Profile sheet is: oxblood labels over ledger lines, one oxblood
// primary. When Google's button is on the slip it is the primary, and the password
// buttons are drawn in outline so nothing competes with it. The same slip asks for a
// reset link and, at /reset-password, takes the new password.
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
// A line of the slip's own small print that can be followed, under the password field
const slipLinkClass = 'min-h-[32px] font-serif italic text-base text-sepia underline decoration-sepia/40 underline-offset-4 hover:text-oxblood hover:decoration-oxblood transition-colors';

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

// A thin printed rule with words in the middle ("or sign in with Google")
const RuleHeading = ({ id, children }) => (
  <h3 id={id} className="mb-3 flex items-center gap-3 font-serif italic text-base text-sepia">
    <span aria-hidden="true" className="flex-1 border-t border-sepia/40" />
    {children}
    <span aria-hidden="true" className="flex-1 border-t border-sepia/40" />
  </h3>
);

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
const PasswordForms = ({ registering, setRegistering, googleShown, onSignedIn, onPasswordLoginOff, onForgot, initialUsername = '' }) => {
  const [values, setValues] = useState(() => ({ ...EMPTY_VALUES, username: initialUsername }));
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
        {!registering && onForgot && (
          <div className="-mt-2.5 flex justify-end">
            <button type="button" onClick={onForgot} className={slipLinkClass}>Forgot your password?</button>
          </div>
        )}
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

        {googleShown && !registering && formError && (
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

// The text the owner wrote for the slip once a reset link has been asked for (round 3, item 23).
const RESET_SENT_TEXT = 'Check your email. If an account uses that address, we\'ve sent it a link to set a new password. The link works once and expires in one hour. If nothing arrives in a few minutes, check your spam folder.';

// Asks for a reset link by email. The answer is the same whether or not an account uses
// the address, so the slip then shows the same text either way.
const ForgotPasswordForm = ({ onSent, onPasswordLoginOff }) => {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = emailProblem(email);
    setFieldError(problem);
    setFormError('');
    if (problem) { document.getElementById('resetEmail')?.focus(); return; }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      onSent();
    } catch (err) {
      setBusy(false);
      if (err.status === 403) onPasswordLoginOff(err.message);
      else if (err.status === 422) setFieldError(emailProblem(email) || 'That does not look like an email address. Check it and try again.');
      else setFormError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        id="resetEmail" label="Email" type="email" autoComplete="email" inputMode="email" {...usernameInputProps}
        value={email} error={fieldError}
        onChange={(e) => { setEmail(e.target.value); setFieldError(''); }}
      />
      {formError && <p role="alert" className={errorTextClass}>{formError}</p>}
      <div className="pt-1">
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </div>
    </form>
  );
};

// /reset-password?token=...: the new password, twice, with the register rule. A link that
// has run out (or a page without a token) offers a new one instead. The server's words
// are shown as they come: a link that a newer one replaced answers "A newer link was sent.
// Use the latest email."
const RESET_LINK_DEAD = 'This link has expired or has already been used. Please ask for a new one.';
const ResetPasswordForm = ({ token, onDone, onAskAgain, onPasswordLoginOff }) => {
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [deadLink, setDeadLink] = useState(token ? '' : RESET_LINK_DEAD);
  const [busy, setBusy] = useState(false);
  const askAgainRef = useRef(null);

  useEffect(() => { if (deadLink) askAgainRef.current?.focus(); }, [deadLink]);

  const edit = (key) => (e) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    setFieldErrors((current) => ({
      ...current,
      [key]: '',
      confirm: key === 'confirm' || next.confirm === next.password ? '' : current.confirm,
    }));
  };

  const checkConfirm = () => {
    if (values.confirm && values.confirm !== values.password) {
      setFieldErrors((current) => ({ ...current, confirm: 'The two passwords do not match.' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {
      password: newPasswordProblem(values.password),
      confirm: values.confirm === values.password ? '' : 'The two passwords do not match.',
    };
    setFieldErrors(errors);
    setFormError('');
    if (focusFirstError(errors, [['password', 'newPassword'], ['confirm', 'confirmNewPassword']])) return;
    setBusy(true);
    try {
      onDone(await confirmPasswordReset(token, values.password));
    } catch (err) {
      setBusy(false);
      if (err.status === 400) setDeadLink(err.message || RESET_LINK_DEAD);
      else if (err.status === 403) onPasswordLoginOff(err.message);
      else if (err.status === 422) { setFieldErrors({ password: err.message }); document.getElementById('newPassword')?.focus(); }
      else setFormError(err.message);
    }
  };

  if (deadLink) {
    return (
      <div className="space-y-5">
        <p role="alert" className={errorTextClass}>{deadLink}</p>
        <button ref={askAgainRef} type="button" onClick={onAskAgain} className={primaryClass}>Ask for a new link</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        id="newPassword" label="New password" type="password" autoComplete="new-password"
        value={values.password} onChange={edit('password')} error={fieldErrors.password} help={PASSWORD_RULE}
      />
      <Field
        id="confirmNewPassword" label="Confirm password" type="password" autoComplete="new-password"
        value={values.confirm} onChange={edit('confirm')} onBlur={checkConfirm} error={fieldErrors.confirm}
      />
      {formError && <p role="alert" className={errorTextClass}>{formError}</p>}
      <div className="pt-1">
        <button type="submit" disabled={busy} className={primaryClass}>
          {busy ? 'Setting password…' : 'Set new password'}
        </button>
      </div>
    </form>
  );
};

// resetToken: given at /reset-password (an empty string when the link has no token).
// onLeaveReset takes the page back off that address.
const LoginScreen = ({ resetToken = null, onLeaveReset }) => {
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
  // signin | register | forgot (asking for a reset link) | sent | reset (/reset-password)
  const [screen, setScreen] = useState(resetToken !== null ? 'reset' : 'signin');
  // After a new password is set: the username to sign in with, and whether Google was unlinked
  const [afterReset, setAfterReset] = useState(null);
  // { linkToken, suggestedName, email } after a Google sign-in that needs an account
  const [pendingGoogle, setPendingGoogle] = useState(null);
  const headingRef = useRef(null);
  const focusAfterStep = useRef(null);

  const showGoogle = Boolean(GOOGLE_CLIENT_ID) && authConfig.google !== false;
  const showPassword = authConfig.password_login !== false;
  const registering = screen === 'register';

  useEffect(() => {
    let cancelled = false;
    fetchAuthConfig().then((config) => {
      if (!cancelled && config) setAuthConfig(config);
    });
    return () => { cancelled = true; };
  }, []);

  // A step change replaces the control that was used, so focus would fall to the page.
  // Send it to the new step's heading (Google's account step, a sent link) or to its
  // first field.
  useEffect(() => {
    const target = focusAfterStep.current;
    focusAfterStep.current = null;
    if (target === 'heading') headingRef.current?.focus();
    else if (target) document.getElementById(target)?.focus();
  }, [pendingGoogle, screen]);

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

  const leaveResetAddress = () => { if (resetToken !== null) onLeaveReset?.(); };

  const goTo = (next) => {
    focusAfterStep.current = { signin: 'username', register: 'username', forgot: 'resetEmail', sent: 'resetSent' }[next] || 'heading';
    setSignInError('');
    setScreen(next);
    leaveResetAddress();
  };

  const passwordLoginOff = (message) => {
    setAuthConfig((current) => ({ ...current, password_login: false }));
    setScreen('signin');
    leaveResetAddress();
    setSignInError(message || 'Password sign-in is turned off. Please use Sign in with Google.');
    headingRef.current?.focus(); // the form that had focus is about to go
  };

  const leaveGoogleStep = () => {
    focusAfterStep.current = 'heading';
    setPendingGoogle(null);
    setScreen('signin');
  };

  // The new password is set. Every earlier sign-in has ended, this browser's too, so the
  // slip goes back to signing in, with the username filled in.
  const resetDone = (data) => {
    if (useGameStore.getState().accessSession) useGameStore.getState().logout();
    setAfterReset({ username: data?.name || '', googleUnlinked: data?.googleUnlinked === true, on: stampDate(new Date()) });
    focusAfterStep.current = data?.name ? 'password' : 'username';
    setScreen('signin');
    leaveResetAddress();
  };

  const noWayIn = !showGoogle && !showPassword;
  const title = pendingGoogle ? 'One More Step'
    : { register: 'Enlist with the Chapter', forgot: 'Forgotten Password', sent: 'Forgotten Password', reset: 'Set a New Password' }[screen]
      || 'Chapter Admission';
  let lead;
  if (pendingGoogle) {
    lead = pendingGoogle.email
      ? <><span className="not-italic font-semibold text-ink break-all">{pendingGoogle.email}</span> is not linked to an account here yet.</>
      : 'This Google account is not linked to an account here yet.';
  } else if (noWayIn && (screen === 'signin' || screen === 'register')) {
    lead = 'Signing in is not available right now. Please try again later.';
  }
  const atSignIn = !pendingGoogle && (screen === 'signin' || screen === 'register');

  // Signing in with Google, offered again on the slips that ask for a reset link: the
  // other way back in for an account linked to Google.
  const googleWayBack = showGoogle && (
    <section aria-labelledby="google-way-heading" className="mt-6">
      <RuleHeading id="google-way-heading">or sign in with Google</RuleHeading>
      <GoogleButton onCredential={handleGoogleCredential} onLoadError={setSignInError} />
      <p role="status" className={googleBusy ? `mt-2 text-center italic ${noteClass}` : 'sr-only'}>
        {googleBusy ? 'Signing in…' : ''}
      </p>
      {signInError && <p role="alert" className={`mt-3 text-center ${errorTextClass}`}>{signInError}</p>}
    </section>
  );
  const backToSignIn = (
    <div className="mt-5 pt-3 border-t border-sepia/25 text-center">
      <button type="button" onClick={() => goTo('signin')} className={textButtonClass}>Back to sign in</button>
    </div>
  );

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
              bodyClassName="px-5 pt-7 pb-6 sm:px-9 sm:pt-10 sm:pb-8"
              printLine="Form C.O. 0 · Admission"
              serial={serialFor(new Date().toDateString())}
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
                {lead && <p className="mt-1.5 font-serif italic text-base sm:text-lg leading-snug text-sepia">{lead}</p>}
              </header>

              {/* A new password was just set: stamped on the slip */}
              {afterReset && atSignIn && !registering && (
                <div role="status" className="mt-5 flow-root">
                  <DateStamp label="Password set" date={afterReset.on} tone="green" tilt={3} className="float-right ml-3 mt-0.5 mb-1" />
                  <p className="font-serif text-base leading-snug text-ink">
                    <strong className="font-semibold text-seal-green">Your new password is set.</strong>
                    {afterReset.googleUnlinked && (
                      <> Your account&apos;s Google link was removed; you can link it again by signing in with Google.</>
                    )}
                  </p>
                </div>
              )}

              {/* Sign in with Google. Kept mounted (hidden) on the other slips so Google's button survives them. */}
              {showGoogle && (
                <div className={atSignIn ? 'mt-6' : 'hidden'}>
                  <GoogleButton onCredential={handleGoogleCredential} onLoadError={setSignInError} />
                  <p role="status" className={googleBusy && atSignIn ? `mt-2 text-center italic ${noteClass}` : 'sr-only'}>
                    {googleBusy && atSignIn ? 'Signing in…' : ''}
                  </p>
                </div>
              )}

              {signInError && atSignIn && (
                <p role="alert" className={`mt-4 text-center ${errorTextClass}`}>{signInError}</p>
              )}

              {pendingGoogle ? (
                <GoogleAccountChoice
                  pending={pendingGoogle}
                  onSignedIn={setAccessSession}
                  onBack={leaveGoogleStep}
                />
              ) : screen === 'forgot' ? (
                <div className="mt-6">
                  <ForgotPasswordForm onSent={() => goTo('sent')} onPasswordLoginOff={passwordLoginOff} />
                  {googleWayBack}
                  {backToSignIn}
                </div>
              ) : screen === 'sent' ? (
                <div className="mt-6">
                  <div className="flow-root">
                    <DateStamp label="Link sent" date={stampDate(new Date())} tone="oxblood" tilt={4} className="float-right ml-3 mt-1 mb-1" />
                    <p id="resetSent" role="status" tabIndex={-1} className="font-serif text-lg leading-snug text-ink focus:outline-none">{RESET_SENT_TEXT}</p>
                  </div>
                  {googleWayBack}
                  {backToSignIn}
                </div>
              ) : screen === 'reset' ? (
                <div className="mt-6">
                  <ResetPasswordForm
                    token={resetToken}
                    onDone={resetDone}
                    onAskAgain={() => goTo('forgot')}
                    onPasswordLoginOff={passwordLoginOff}
                  />
                  {backToSignIn}
                </div>
              ) : showPassword && (
                <section aria-labelledby="password-heading" className={showGoogle ? 'mt-6' : 'mt-7'}>
                  {showGoogle ? (
                    <RuleHeading id="password-heading">or use a username and password</RuleHeading>
                  ) : (
                    <h3 id="password-heading" className="sr-only">{registering ? 'Create an account' : 'Sign in'}</h3>
                  )}
                  <PasswordForms
                    key={afterReset ? `after-reset-${afterReset.username}` : 'forms'}
                    registering={registering}
                    setRegistering={(next) => goTo(next ? 'register' : 'signin')}
                    googleShown={showGoogle}
                    onSignedIn={setAccessSession}
                    onPasswordLoginOff={passwordLoginOff}
                    onForgot={() => goTo('forgot')}
                    initialUsername={afterReset?.username || ''}
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
