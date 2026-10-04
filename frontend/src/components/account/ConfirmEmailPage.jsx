import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import { cancelEmailChange, checkEmailChange, confirmEmailChange } from '../../utils/api';
import { PaperSheet } from '../shared/PaperSheet';
import { DateStamp, serialFor, stampDate } from '../shared/PrintMarks';
import { leaveEmailLink, showAccountPageInstead } from './accountAddress';

// /confirm-email?token=...: the link mailed to a new address (docs/refactor/AUTH.md, The
// account page). It works for the account that asked for the change, signed in, so the
// router shows the sign-in slip first when nobody is signed in. Opening the page only reads
// what the link would change; the page shows the account and the new address, and the
// link is used only when the owner presses Confirm new email. A link that reached the
// owner from someone else (a mistyped address) never changes anything on its own.

const errorTextClass = 'font-serif text-lg leading-snug text-oxblood';
const noteClass = 'font-serif text-base leading-snug text-sepia';
const buttonBase = 'w-full min-h-[44px] px-6 py-2.5 rounded font-sans font-black text-sm uppercase tracking-widest transition disabled:opacity-60 disabled:cursor-wait';
const primaryClass = `${buttonBase} bg-oxblood text-cream border border-ink hover:brightness-125`;
const quietClass = `${buttonBase} bg-transparent text-ink border border-ink/30 hover:bg-ink hover:text-parchment`;
const addressClass = 'block mt-1 font-mono text-base text-ink [overflow-wrap:anywhere]';

const LINK_DEAD = 'This link has expired or has already been used.';
const SOMETHING_WRONG = 'Something went wrong. Please try again.';

export const ConfirmEmailPage = ({ token }) => {
  const logout = useGameStore((s) => s.logout);
  // reading | ask | confirming | cancelling | done | cancelled | dead (used, expired, none)
  // | other (another account) | stopped (refused for good) | refused (try again)
  const [state, setState] = useState(token ? 'reading' : 'dead');
  const [message, setMessage] = useState(token ? '' : LINK_DEAD);
  const [change, setChange] = useState(null);   // { name, email, newEmail }
  const [email, setEmail] = useState('');       // the address once confirmed
  const [retry, setRetry] = useState(null);     // the step to try again
  const started = useRef(false);
  const actionRef = useRef(null);

  const fail = (step) => (err) => {
    setMessage(err?.message || SOMETHING_WRONG);
    const status = err?.status;
    if (status === 400) setState('dead');
    else if (status === 403) setState('other');
    else if (status === 409) setState('stopped');
    else { setRetry(() => step); setState('refused'); }
  };

  const read = () => {
    setState('reading');
    setMessage('');
    checkEmailChange(token)
      .then((answer) => { setChange(answer); setState('ask'); })
      .catch(fail(read));
  };

  const confirm = () => {
    setState('confirming');
    setMessage('');
    confirmEmailChange(token)
      .then((account) => { setEmail(account?.email || change?.newEmail || ''); setState('done'); })
      .catch(fail(confirm));
  };

  const cancel = () => {
    setState('cancelling');
    setMessage('');
    cancelEmailChange()
      .then(() => setState('cancelled'))
      .catch(fail(cancel));
  };

  // Reading changes nothing, so it runs once the page opens; the change waits for a click.
  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    read();
  }, [token]);

  useEffect(() => { if (!['reading', 'confirming', 'cancelling'].includes(state)) actionRef.current?.focus(); }, [state]);

  const asking = state === 'ask' || state === 'confirming' || state === 'cancelling';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-night px-4 py-10 sm:py-14">
      <div className="w-full max-w-md animate-fadeIn rotate-[-0.6deg] sm:rotate-[-1deg]">
        <PaperSheet
          bodyClassName="px-5 pt-7 pb-6 sm:px-9 sm:pt-10 sm:pb-8"
          printLine="Form C.O. 8 · Chapter member"
          serial={serialFor(new Date().toDateString())}
          role="region"
          aria-labelledby="confirm-email-heading"
        >
          <header className="text-center">
            <h1 className="font-display text-2xl sm:text-3xl leading-none tracking-[0.1em] uppercase text-ink whitespace-nowrap">
              Candela Obscura
            </h1>
            <div aria-hidden="true" className="mt-3 mb-5 border-t-[3px] border-double border-sepia/60" />
            <h2 id="confirm-email-heading" className="font-display text-xl sm:text-2xl leading-tight uppercase tracking-[0.06em] text-oxblood">
              New Email Address
            </h2>
          </header>

          <div className="mt-6 space-y-5">
            {state === 'reading' && (
              <p role="status" className="font-serif italic text-lg text-sepia text-center">Reading the link…</p>
            )}

            {asking && change && (
              <>
                <div className="space-y-3">
                  <p className="font-serif text-lg leading-snug text-ink">
                    {/* a no-break space keeps "to" with the name, not alone on a line */}
                    Change the email address of <strong className="font-semibold break-words">{change.name}</strong>{' '}to
                    <span className={addressClass}>{change.newEmail}</span>
                  </p>
                  {change.email && (
                    <p className={noteClass}>
                      Your address now:
                      <span className="block font-mono [overflow-wrap:anywhere]">{change.email}</span>
                    </p>
                  )}
                  <p className={noteClass}>Confirm only if the new address is yours.</p>
                </div>
                <p role="status" className="sr-only">
                  {state === 'confirming' ? 'Confirming…' : state === 'cancelling' ? 'Cancelling…' : ''}
                </p>
                <div className="space-y-2">
                  <button ref={actionRef} type="button" onClick={confirm} disabled={state !== 'ask'} className={primaryClass}>
                    {state === 'confirming' ? 'Confirming…' : 'Confirm new email'}
                  </button>
                  <button type="button" onClick={cancel} disabled={state !== 'ask'} className={quietClass}>
                    {state === 'cancelling' ? 'Cancelling…' : 'Cancel change'}
                  </button>
                </div>
              </>
            )}

            {state === 'done' && (
              <>
                <div role="status" className="flow-root">
                  <DateStamp label="Confirmed" date={stampDate(new Date())} tone="green" tilt={3} className="float-right ml-3 mt-0.5 mb-1" />
                  <p className="font-serif text-lg leading-snug text-ink">
                    <strong className="font-semibold text-seal-green">Email changed.</strong>
                    {email && <span className={addressClass}>{email}</span>}
                  </p>
                </div>
                <button ref={actionRef} type="button" onClick={showAccountPageInstead} className={primaryClass}>Continue</button>
              </>
            )}

            {state === 'cancelled' && (
              <>
                <p role="status" className="font-serif text-lg leading-snug text-ink">
                  <strong className="font-semibold">Change cancelled.</strong> Your email address stays as it was
                  {change?.email ? <span className={addressClass}>{change.email}</span> : '.'}
                </p>
                <button ref={actionRef} type="button" onClick={showAccountPageInstead} className={primaryClass}>Go to account</button>
              </>
            )}

            {(state === 'dead' || state === 'stopped') && (
              <>
                <p role="alert" className={errorTextClass}>{message || LINK_DEAD}</p>
                <button ref={actionRef} type="button" onClick={showAccountPageInstead} className={primaryClass}>Go to account</button>
              </>
            )}

            {state === 'other' && (
              <>
                <p role="alert" className={errorTextClass}>{message}</p>
                <button ref={actionRef} type="button" onClick={logout} className={primaryClass}>Sign out</button>
                <button type="button" onClick={leaveEmailLink} className={quietClass}>Continue</button>
              </>
            )}

            {state === 'refused' && (
              <>
                <p role="alert" className={errorTextClass}>{message}</p>
                <button ref={actionRef} type="button" onClick={() => (retry || read)()} className={primaryClass}>Try again</button>
                <button type="button" onClick={showAccountPageInstead} className={quietClass}>Go to account</button>
              </>
            )}
          </div>
        </PaperSheet>
      </div>
    </div>
  );
};

export default ConfirmEmailPage;
