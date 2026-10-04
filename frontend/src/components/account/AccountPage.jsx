import React, { useCallback, useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import {
  cancelEmailChange, changePassword, changeUsername, fetchAccount, fetchAuthConfig, linkGoogleToAccount,
  removeGoogleSignIn, requestEmailChange, resendEmailChange,
} from '../../utils/api';
import { PASSWORD_RULE, USERNAME_RULE, emailProblem, newPasswordProblem, usernameProblem } from '../../utils/authErrors';
import { PaperSheet } from '../shared/PaperSheet';
import { DateStamp, FormLine, SerialNo, serialFor, stampDate } from '../shared/PrintMarks';
import { GOOGLE_CLIENT_ID, GoogleButton } from '../shared/googleSignIn';
import { isEditableTarget, pageKeyBlocked } from '../shared/a11y';
import { leaveAccountPage } from './accountAddress';

// The account page (owner's request, 2026-10-04): the username, the email address, the
// password and the Google sign-in, each a line on one paper form with its own change. Every
// change carries a proof of the account (docs/refactor/AUTH.md, The account page): the
// current password, or a Google sign-in of the account's own Google account made just now.
// It opens from "Account" on the account card and goes back to where it was opened.

const labelClass = 'block font-sans font-black text-sm uppercase tracking-[0.18em] text-oxblood mb-0.5';
const inputClass = [
  'w-full bg-transparent border-0 border-b border-sepia/40 rounded-none px-0 py-2',
  'font-serif font-bold text-lg text-ink caret-oxblood transition-colors',
  'hover:border-sepia/70 focus:border-oxblood aria-[invalid=true]:border-oxblood',
  'autofill:shadow-[inset_0_0_0_1000px_rgb(var(--c-parchment))] autofill:[-webkit-text-fill-color:rgb(var(--c-ink))]',
].join(' ');
const noteClass = 'font-serif text-base leading-snug text-sepia';
const errorTextClass = 'font-serif text-base leading-snug text-oxblood';
const buttonBase = 'min-h-[44px] px-5 py-2.5 rounded font-sans font-black text-sm uppercase tracking-widest transition disabled:opacity-60 disabled:cursor-wait';
const primaryClass = `${buttonBase} w-full sm:w-auto bg-oxblood text-cream border border-ink hover:brightness-125`;
// The change on each line: printed in ink, so the form's one oxblood button is its Save
const lineActionClass = 'w-full sm:w-auto shrink-0 min-h-[44px] px-4 py-2 rounded font-sans font-black text-xs uppercase tracking-widest text-ink border border-ink/35 hover:bg-ink hover:text-parchment transition-colors whitespace-nowrap';
const textButtonClass = 'min-h-[44px] px-3 font-sans font-bold text-sm uppercase tracking-widest text-sepia hover:text-oxblood underline-offset-4 hover:underline transition-colors';
const valueClass = 'font-serif font-bold text-xl leading-snug text-ink break-words';
// Addresses wrap only where they must, not mid-word whenever the line is short
const dataValueClass = 'font-mono text-base leading-snug text-ink [overflow-wrap:anywhere]';
const blankValueClass = 'font-serif italic text-lg leading-snug text-sepia';

const BACK_LABEL = {
  HOME: 'Back to chapter hub',
  DESK: 'Back to your desk',
  GM_DASH: 'Back to the Lightkeeper\'s Desk',
};

const SOMETHING_WRONG = 'Something went wrong. Please try again.';

// A tick drawn with a pen, beside what was just saved
const Tick = () => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="16" height="16" className="shrink-0">
    <path d="M2.5 8.6 6.3 12 13.6 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// One labelled ledger line, as on the admission slip. A field error replaces the help text.
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

// For a password manager: whose password a form asks for
const AccountNameForManagers = ({ name }) => (
  <input type="text" name="username" autoComplete="username" value={name || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
);

const focusLater = (id) => requestAnimationFrame(() => document.getElementById(id)?.focus());

// Whether a refusal is about the value typed into a change's own field, so it belongs under
// that field: its status is one of the field's and its message names the field. Anything
// else (Google refusing a sign-in, also 400; "The account changed while this was being
// saved", 409; too many attempts) belongs to the whole form.
const aboutField = (err, statuses, words) => statuses.includes(err?.status) && words.test(err?.message || '');

// Which proofs this account can give: the current password unless it has none of its own,
// and Google when a Google account is linked and Google sign-in is on. An account whose
// password is not known to the server (hasPassword null) and has Google starts on Google.
const proofWays = (account, googleOn) => {
  const google = Boolean(account.googleLinked && googleOn);
  const password = account.hasPassword !== false;
  let first = null;
  if (password && (account.hasPassword === true || !google)) first = 'password';
  else if (google) first = 'google';
  return { first, both: google && password };
};

// A change with its proof. check() shows the change's own field errors and answers whether
// it can go; send(proof) sends it and resolves once it is saved (the page then closes the
// form). A refused proof marks the password field; fieldError(err) may take any other
// refusal onto the change's own field (it answers true when it did).
const ChangeForm = ({
  id, account, googleOn, firstFieldId, check, send, fieldError, submitLabel, busyLabel, onCancel, children,
}) => {
  const ways = proofWays(account, googleOn);
  const [way, setWay] = useState(ways.first);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const passwordId = `${id}-current-password`;

  useEffect(() => { focusLater(firstFieldId || passwordId); }, []);

  const run = async (proof) => {
    setBusy(true);
    setFormError('');
    setPasswordError('');
    try {
      await send(proof);
    } catch (err) {
      setBusy(false);
      const message = err?.message || SOMETHING_WRONG;
      if (err?.status === 403 && proof.password) {
        setPasswordError(message);
        focusLater(passwordId);
      } else if (!fieldError?.(err)) {
        setFormError(message);
      }
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (busy || !check()) return;
    if (way !== 'password') return; // Google's button sends it
    if (!password) {
      setPasswordError('Enter your current password.');
      focusLater(passwordId);
      return;
    }
    run({ password });
  };

  const onCredential = ({ credential }) => {
    if (busy || !check()) return;
    run({ credential });
  };

  const switchWay = () => {
    setWay((current) => (current === 'password' ? 'google' : 'password'));
    setPasswordError('');
    setFormError('');
  };

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
      {children}
      {way === 'password' && (
        <>
          <AccountNameForManagers name={account.name} />
          <Field
            id={passwordId} label="Current password" type="password" autoComplete="current-password"
            value={password} error={passwordError}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
          />
        </>
      )}
      {way === 'google' && (
        <div>
          <p className={labelClass}>Confirm with Google</p>
          <GoogleButton text="continue_with" maxWidth={320} className="mt-2 sm:justify-start" onCredential={onCredential} onLoadError={setFormError} />
          <p role="status" className={busy ? `mt-2 italic ${noteClass}` : 'sr-only'}>{busy ? busyLabel : ''}</p>
        </div>
      )}
      {way === null && <p role="alert" className={errorTextClass}>Sign in with Google is not available right now.</p>}
      {formError && <p role="alert" className={errorTextClass}>{formError}</p>}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-2 gap-y-1 pt-1">
        {way === 'password' && (
          <button type="submit" disabled={busy} className={primaryClass}>{busy ? busyLabel : submitLabel}</button>
        )}
        {ways.both && (
          <button type="button" onClick={switchWay} className={textButtonClass}>
            {way === 'password' ? 'Use Google instead' : 'Use password instead'}
          </button>
        )}
        <button type="button" onClick={onCancel} className={textButtonClass}>Cancel</button>
      </div>
    </form>
  );
};

// One line of the form: its label and value, the change at its end, what waits on it
// (below), and the change's form under it while it is open.
const Line = ({ id, label, children, action, below, notice, form }) => (
  <section aria-labelledby={`${id}-label`} className="py-5 border-t border-dashed border-sepia/45 first:border-t-0 first:pt-1">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="min-w-0">
        <h3 id={`${id}-label`} className={labelClass}>{label}</h3>
        <div className="mt-1">{children}</div>
      </div>
      {action}
    </div>
    {below}
    {notice && (
      <p className="mt-2 flex items-center gap-2 font-serif text-base font-semibold text-seal-green"><Tick /> {notice}</p>
    )}
    {form}
  </section>
);

const UsernameForm = ({ account, googleOn, onSaved, onCancel }) => {
  const [name, setName] = useState(account.name || '');
  const [error, setError] = useState('');
  const check = () => {
    const problem = usernameProblem(name.trim());
    setError(problem);
    if (problem) focusLater('account-new-username');
    return !problem;
  };
  const fieldError = (err) => {
    if (!aboutField(err, [400, 422], /username/i)) return false;
    setError(err.message);
    focusLater('account-new-username');
    return true;
  };
  return (
    <ChangeForm
      id="account-username" account={account} googleOn={googleOn} firstFieldId="account-new-username"
      check={check} fieldError={fieldError} submitLabel="Save username" busyLabel="Saving…" onCancel={onCancel}
      send={async (proof) => onSaved(await changeUsername(name.trim(), proof))}
    >
      <Field
        id="account-new-username" label="New username" type="text" maxLength={32} autoComplete="off"
        autoCapitalize="none" autoCorrect="off" spellCheck={false}
        value={name} error={error} help={USERNAME_RULE}
        onChange={(e) => { setName(e.target.value); setError(''); }}
      />
    </ChangeForm>
  );
};

const EmailForm = ({ account, googleOn, onSaved, onCancel }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const check = () => {
    const problem = emailProblem(email);
    setError(problem);
    if (problem) focusLater('account-new-email');
    return !problem;
  };
  const fieldError = (err) => {
    if (!aboutField(err, [400, 409, 422], /email address/i)) return false;
    setError(err.message);
    focusLater('account-new-email');
    return true;
  };
  return (
    <ChangeForm
      id="account-email" account={account} googleOn={googleOn} firstFieldId="account-new-email"
      check={check} fieldError={fieldError} submitLabel="Send confirmation link" busyLabel="Sending…" onCancel={onCancel}
      send={async (proof) => onSaved(await requestEmailChange(email.trim(), proof))}
    >
      <Field
        id="account-new-email" label="New email" type="email" inputMode="email" autoComplete="email"
        autoCapitalize="none" autoCorrect="off" spellCheck={false}
        value={email} error={error}
        onChange={(e) => { setEmail(e.target.value); setError(''); }}
      />
    </ChangeForm>
  );
};

const PasswordForm = ({ account, googleOn, setting, onSaved, onCancel }) => {
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const edit = (key) => (e) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    setErrors((current) => ({
      ...current,
      [key]: '',
      confirm: key === 'confirm' || next.confirm === next.password ? '' : current.confirm,
    }));
  };
  const checkConfirm = () => {
    if (values.confirm && values.confirm !== values.password) {
      setErrors((current) => ({ ...current, confirm: 'The two passwords do not match.' }));
    }
  };
  const check = () => {
    const next = {
      password: newPasswordProblem(values.password),
      confirm: values.confirm === values.password ? '' : 'The two passwords do not match.',
    };
    setErrors(next);
    if (next.password) focusLater('account-new-password');
    else if (next.confirm) focusLater('account-confirm-password');
    return !next.password && !next.confirm;
  };
  const fieldError = (err) => {
    if (err?.status !== 422) return false;
    setErrors({ password: err.message || SOMETHING_WRONG });
    focusLater('account-new-password');
    return true;
  };
  return (
    <ChangeForm
      id="account-password" account={account} googleOn={googleOn} firstFieldId="account-new-password"
      check={check} fieldError={fieldError} submitLabel={setting ? 'Set password' : 'Save password'}
      busyLabel="Saving…" onCancel={onCancel}
      send={async (proof) => onSaved(await savePassword(values.password, proof))}
    >
      <Field
        id="account-new-password" label="New password" type="password" autoComplete="new-password"
        value={values.password} error={errors.password} help={PASSWORD_RULE} onChange={edit('password')}
      />
      <Field
        id="account-confirm-password" label="Confirm password" type="password" autoComplete="new-password"
        value={values.confirm} error={errors.confirm} onChange={edit('confirm')} onBlur={checkConfirm}
      />
    </ChangeForm>
  );
};

// A new password, and removing Google sign-in, end every other sign-in of the account,
// and the server closes the account's sockets, this browser's too (4401, which the store
// takes for a logout). So this browser's socket is put down first and opened again
// afterwards, with the new token the answer carries once there is one.
const withNewSession = async (request) => {
  const channel = useGameStore.getState().socketGameId;
  if (channel != null) useGameStore.getState().disconnect();
  try {
    const { token, ...account } = await request();
    if (token) {
      useGameStore.setState((s) => ({ accessSession: s.accessSession ? { ...s.accessSession, token } : s.accessSession }));
    }
    return account;
  } finally {
    const { accessSession, socketGameId, connect } = useGameStore.getState();
    if (channel != null && accessSession?.token && socketGameId == null) connect(channel, { keepLog: true });
  }
};

const savePassword = (newPassword, proof) => withNewSession(() => changePassword(newPassword, proof));

const RemoveGoogleForm = ({ account, onSaved, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { focusLater('account-remove-google-password'); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!password) { setError('Enter your current password.'); focusLater('account-remove-google-password'); return; }
    setBusy(true);
    setError('');
    setFormError('');
    try {
      onSaved(await withNewSession(() => removeGoogleSignIn(password)));
    } catch (err) {
      setBusy(false);
      if (err?.status === 403) { setError(err.message || SOMETHING_WRONG); focusLater('account-remove-google-password'); }
      else setFormError(err?.message || SOMETHING_WRONG);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
      <p className={noteClass}>
        This also signs the account out everywhere else, including every browser that signed in with Google.
        This one stays signed in.
      </p>
      <AccountNameForManagers name={account.name} />
      <Field
        id="account-remove-google-password" label="Current password" type="password" autoComplete="current-password"
        value={password} error={error} onChange={(e) => { setPassword(e.target.value); setError(''); }}
      />
      {formError && <p role="alert" className={errorTextClass}>{formError}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 pt-1">
        <button type="submit" disabled={busy} className={primaryClass}>{busy ? 'Removing…' : 'Remove Google sign-in'}</button>
        <button type="button" onClick={onCancel} className={textButtonClass}>Cancel</button>
      </div>
    </form>
  );
};

// "Add Google sign-in": Google's own button, then the account's password if Google's email
// is not the account's (POST /api/auth/me/google).
const AddGoogleForm = ({ account, onSaved, onCancel }) => {
  const [credential, setCredential] = useState(null);
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (cred, pass) => {
    setBusy(true);
    setError('');
    setFieldError('');
    try {
      onSaved(await linkGoogleToAccount(cred, pass));
    } catch (err) {
      setBusy(false);
      const message = err?.message || SOMETHING_WRONG;
      if (err?.status === 403 && /enter your account's password/i.test(message)) {
        setAskPassword(true); // Google's email is not the account's: the password proves the account
        focusLater('account-add-google-password');
      } else if (err?.status === 403 && pass) {
        setFieldError(message);
        focusLater('account-add-google-password');
      } else {
        setError(message);
        if (err?.status === 400 || err?.status === 503) { setCredential(null); setAskPassword(false); }
      }
    }
  };

  const submitPassword = (e) => {
    e.preventDefault();
    if (busy) return;
    if (!password) { setFieldError('Enter your current password.'); focusLater('account-add-google-password'); return; }
    send(credential, password);
  };

  return askPassword ? (
    <form onSubmit={submitPassword} noValidate className="mt-4 space-y-4">
      <AccountNameForManagers name={account.name} />
      <Field
        id="account-add-google-password" label="Current password" type="password" autoComplete="current-password"
        value={password} error={fieldError} onChange={(e) => { setPassword(e.target.value); setFieldError(''); }}
      />
      {error && <p role="alert" className={errorTextClass}>{error}</p>}
      <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 pt-1">
        <button type="submit" disabled={busy} className={primaryClass}>{busy ? 'Adding…' : 'Add Google sign-in'}</button>
        <button type="button" onClick={onCancel} className={textButtonClass}>Cancel</button>
      </div>
    </form>
  ) : (
    <div className="mt-4 space-y-3">
      <GoogleButton
        text="continue_with" maxWidth={320} className="sm:justify-start"
        onCredential={({ credential: cred }) => { setCredential(cred); send(cred, null); }}
        onLoadError={setError}
      />
      <p role="status" className={busy ? `italic ${noteClass}` : 'sr-only'}>{busy ? 'Adding…' : ''}</p>
      {error && <p role="alert" className={errorTextClass}>{error}</p>}
      <button type="button" onClick={onCancel} className={textButtonClass}>Cancel</button>
    </div>
  );
};

// The change of address that waits for its link: where it went, a new link, or no change.
const PendingEmail = ({ address, justSent, onChanged, onNotice }) => {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const act = (what, request, notice) => async () => {
    setBusy(what);
    setError('');
    try {
      const account = await request();
      onChanged(account);
      onNotice(notice);
    } catch (err) {
      setError(err?.message || SOMETHING_WRONG);
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="mt-3 flow-root rounded-sm border border-dashed border-oxblood/50 bg-parchment-deep/40 px-3 py-2.5">
      {justSent && <DateStamp label="Link sent" date={stampDate(new Date())} tone="oxblood" tilt={4} className="float-right ml-3 mb-1" />}
      <p className="font-serif text-base leading-snug text-ink">
        Waiting for confirmation at
        <span className="block font-mono [overflow-wrap:anywhere]">{address}</span>
      </p>
      {error && <p role="alert" className={`mt-1 ${errorTextClass}`}>{error}</p>}
      <div className="mt-1 flex flex-wrap gap-x-1 -ml-3">
        <button type="button" disabled={Boolean(busy)} onClick={act('resend', resendEmailChange, 'Link sent.')} className={textButtonClass}>
          {busy === 'resend' ? 'Sending…' : 'Resend link'}
        </button>
        <button type="button" disabled={Boolean(busy)} onClick={act('cancel', cancelEmailChange, 'Change cancelled.')} className={textButtonClass}>
          {busy === 'cancel' ? 'Cancelling…' : 'Cancel change'}
        </button>
      </div>
    </div>
  );
};

// returnTo: the stage the page was opened from, which names the way back.
export const AccountPage = ({ returnTo }) => {
  const accessSession = useGameStore((s) => s.accessSession);
  const [account, setAccount] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [googleOn, setGoogleOn] = useState(false);
  const [passwordLoginOn, setPasswordLoginOn] = useState(true);
  const [openForm, setOpenForm] = useState(null); // username | email | password | google-add | google-remove
  const [notice, setNotice] = useState(null);     // { at, text } after a change
  const [refusal, setRefusal] = useState(null);   // { at, text }: a change refused before its form
  const openFormRef = useRef(null);
  openFormRef.current = openForm;

  const load = useCallback(() => {
    setLoadFailed(false);
    Promise.all([fetchAccount(), fetchAuthConfig()]).then(([me, config]) => {
      if (me) setAccount(me);
      else setLoadFailed(true);
      setGoogleOn(Boolean(GOOGLE_CLIENT_ID) && config?.google !== false);
      setPasswordLoginOn(config?.password_login !== false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { document.getElementById('account-heading')?.focus({ preventScroll: true }); }, []);

  const closeForm = useCallback((focus = true) => {
    const at = openFormRef.current;
    setOpenForm(null);
    if (focus && at) focusLater(`account-${at.startsWith('google') ? 'google' : at}-action`);
  }, []);

  // Escape: out of a field first, then out of an open change, then back to where the page was opened
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (isEditableTarget(e.target)) { e.target.blur(); return; }
      if (pageKeyBlocked(e)) return;
      if (openFormRef.current) { closeForm(); return; }
      leaveAccountPage();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeForm]);

  const open = (form) => {
    setNotice(null);
    setRefusal(null);
    setOpenForm(form);
  };

  // A change was saved: the account as the server now has it, and a word on its line
  const saved = (at, text) => (next) => {
    setAccount(next);
    if (next?.name) {
      useGameStore.setState((s) => ({ accessSession: s.accessSession ? { ...s.accessSession, name: next.name } : s.accessSession }));
    }
    setNotice({ at, text });
    closeForm();
  };

  const userKey = account?.userId ?? accessSession?.userId;
  const lineNotice = (at) => (notice?.at === at ? notice.text : null);
  const canRemoveGoogle = passwordLoginOn;

  let body;
  if (!account) {
    body = loadFailed ? (
      <div className="space-y-4">
        <p role="alert" className={errorTextClass}>The account could not be loaded.</p>
        <button type="button" onClick={load} className={primaryClass}>Try again</button>
      </div>
    ) : (
      <p role="status" className={`italic ${noteClass}`}>Loading…</p>
    );
  } else {
    const setting = account.hasPassword === false;
    body = (
      <div>
        <Line
          id="account-username" label="Username"
          action={openForm !== 'username' && (
            <button id="account-username-action" type="button" onClick={() => open('username')} className={lineActionClass}>Change username</button>
          )}
          notice={lineNotice('username')}
          form={openForm === 'username' && (
            <UsernameForm account={account} googleOn={googleOn} onSaved={saved('username', 'Username changed.')} onCancel={() => closeForm()} />
          )}
        >
          <p className={valueClass}>{account.name}</p>
        </Line>

        <Line
          id="account-email" label="Email"
          action={openForm !== 'email' && (
            <button id="account-email-action" type="button" onClick={() => open('email')} className={lineActionClass}>Change email</button>
          )}
          below={account.pendingEmail && (
            <PendingEmail
              address={account.pendingEmail}
              justSent={lineNotice('email') === 'Link sent.'}
              onChanged={setAccount}
              onNotice={(text) => setNotice({ at: 'email', text })}
            />
          )}
          notice={lineNotice('email') === 'Change cancelled.' ? 'Change cancelled.' : null}
          form={openForm === 'email' && (
            <EmailForm account={account} googleOn={googleOn} onSaved={saved('email', 'Link sent.')} onCancel={() => closeForm()} />
          )}
        >
          <p className={dataValueClass}>{account.email}</p>
        </Line>

        <Line
          id="account-password" label="Password"
          action={openForm !== 'password' && (
            <button id="account-password-action" type="button" onClick={() => open('password')} className={lineActionClass}>
              {setting ? 'Set a password' : 'Change password'}
            </button>
          )}
          notice={lineNotice('password')}
          form={openForm === 'password' && (
            <PasswordForm
              account={account} googleOn={googleOn} setting={setting}
              onSaved={saved('password', setting ? 'Password set.' : 'Password changed.')} onCancel={() => closeForm()}
            />
          )}
        >
          {account.hasPassword === true && (
            <p className={dataValueClass}><span aria-hidden="true" className="tracking-[0.3em]">••••••••</span><span className="sr-only">Set</span></p>
          )}
          {account.hasPassword === false && <p className={blankValueClass}>Not set</p>}
        </Line>

        <Line
          id="account-google" label="Google sign-in"
          action={account.googleLinked ? (
            canRemoveGoogle && openForm !== 'google-remove' && (
              <button
                id="account-google-action" type="button" className={lineActionClass}
                onClick={() => (account.hasPassword === false
                  ? (setNotice(null), setRefusal({ at: 'google', text: 'Set a password before you remove Google sign-in.' }))
                  : open('google-remove'))}
              >
                Remove Google sign-in
              </button>
            )
          ) : (
            googleOn && openForm !== 'google-add' && (
              <button id="account-google-action" type="button" onClick={() => open('google-add')} className={lineActionClass}>Add Google sign-in</button>
            )
          )}
          below={account.googleLinked && !canRemoveGoogle && (
            <p className={`mt-2 ${noteClass}`}>
              Password sign-in is turned off on this site, so Google sign-in cannot be removed: it is how this
              account signs in.
            </p>
          )}
          notice={lineNotice('google')}
          form={(
            <>
              {refusal?.at === 'google' && <p role="alert" className={`mt-2 ${errorTextClass}`}>{refusal.text}</p>}
              {openForm === 'google-remove' && (
                <RemoveGoogleForm
                  account={account} onSaved={saved('google', 'Google sign-in removed. Every other sign-in has ended.')}
                  onCancel={() => closeForm()}
                />
              )}
              {openForm === 'google-add' && (
                <AddGoogleForm account={account} onSaved={saved('google', 'Google sign-in added.')} onCancel={() => closeForm()} />
              )}
            </>
          )}
        >
          {account.googleLinked
            ? <p className={dataValueClass}>{account.googleEmail || 'Linked'}</p>
            : <p className={blankValueClass}>Not linked</p>}
        </Line>
      </div>
    );
  }

  const serial = userKey != null ? serialFor(`member-${userKey}`) : null;

  return (
    <div className="min-h-screen bg-night text-cream font-serif py-6 sm:py-8">
      {/* As on the creator: the way back sits right of the title from lg, under it on phones */}
      <header className="w-full mb-5 sm:mb-8 px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-start gap-y-3">
        <div className="hidden lg:block" aria-hidden="true" />
        <div className="text-center">
          <h1 className="text-[28px] sm:text-5xl mb-2 font-display tracking-[0.1em] text-cream">CANDELA OBSCURA</h1>
          <h2 id="account-heading" tabIndex={-1} className="text-sm font-sans font-black tracking-widest text-oxblood-lit uppercase focus:outline-none">Account</h2>
        </div>
        <div className="flex justify-center lg:justify-end">
          <button
            type="button"
            onClick={leaveAccountPage}
            className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm font-sans font-bold uppercase tracking-widest text-parchment-deep hover:text-cream transition-colors bg-transparent hover:bg-cream/5 border border-cream/20 hover:border-cream/40 rounded px-4 py-2.5 lg:py-2"
          >
            {BACK_LABEL[returnTo] || 'Back'}
          </button>
        </div>
      </header>

      <main className="px-4 pb-16">
        <div className="mx-auto w-full max-w-2xl rotate-[-0.3deg] lg:rotate-[-0.5deg]">
          <PaperSheet
            bodyClassName="px-4 pt-5 pb-4 sm:px-10 sm:pt-12 sm:pb-8"
            printLine="Form C.O. 8 · Chapter member"
            serial={serial}
          >
            {/* The corners carry the form and the member number from sm; on a phone they print here */}
            <div className="sm:hidden mb-3 flex items-baseline justify-between gap-2" aria-hidden="true">
              <FormLine>Chapter member</FormLine>
              {serial && <SerialNo value={serial} />}
            </div>
            {body}
          </PaperSheet>
        </div>
      </main>

      <p role="status" className="sr-only">{notice?.text || ''}</p>
    </div>
  );
};

export default AccountPage;
