import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import { confirmEmailChange } from '../../utils/api';
import { PaperSheet } from '../shared/PaperSheet';
import { DateStamp, serialFor, stampDate } from '../shared/PrintMarks';
import { leaveEmailLink, showAccountPageInstead } from './accountAddress';

// /confirm-email?token=...: the link mailed to a new address (docs/refactor/AUTH.md, The
// account page). It works for the account that asked for the change, signed in, so the
// router shows the sign-in slip first when nobody is signed in. The change is sent once,
// as soon as the page opens.

const errorTextClass = 'font-serif text-lg leading-snug text-oxblood';
const buttonBase = 'w-full min-h-[44px] px-6 py-2.5 rounded font-sans font-black text-sm uppercase tracking-widest transition disabled:opacity-60 disabled:cursor-wait';
const primaryClass = `${buttonBase} bg-oxblood text-cream border border-ink hover:brightness-125`;
const quietClass = `${buttonBase} bg-transparent text-ink border border-ink/30 hover:bg-ink hover:text-parchment`;

const LINK_DEAD = 'This link has expired or has already been used.';

export const ConfirmEmailPage = ({ token }) => {
  const logout = useGameStore((s) => s.logout);
  // working | done | dead (used, expired or none) | other (another account) | refused
  const [state, setState] = useState(token ? 'working' : 'dead');
  const [message, setMessage] = useState(token ? '' : LINK_DEAD);
  const [email, setEmail] = useState('');
  const sent = useRef(false);
  const actionRef = useRef(null);

  const send = () => {
    setState('working');
    setMessage('');
    confirmEmailChange(token)
      .then((account) => { setEmail(account?.email || ''); setState('done'); })
      .catch((err) => {
        setMessage(err?.message || 'Something went wrong. Please try again.');
        setState(err?.status === 400 ? 'dead' : err?.status === 403 ? 'other' : 'refused');
      });
  };

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    send();
  }, [token]);

  useEffect(() => { if (state !== 'working') actionRef.current?.focus(); }, [state]);

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
            {state === 'working' && (
              <p role="status" className="font-serif italic text-lg text-sepia text-center">Confirming…</p>
            )}

            {state === 'done' && (
              <>
                <div role="status" className="flow-root">
                  <DateStamp label="Confirmed" date={stampDate(new Date())} tone="green" tilt={3} className="float-right ml-3 mt-0.5 mb-1" />
                  <p className="font-serif text-lg leading-snug text-ink">
                    <strong className="font-semibold text-seal-green">Email changed.</strong>
                    {email && <span className="block mt-1 font-mono text-base [overflow-wrap:anywhere]">{email}</span>}
                  </p>
                </div>
                <button ref={actionRef} type="button" onClick={showAccountPageInstead} className={primaryClass}>Continue</button>
              </>
            )}

            {state === 'dead' && (
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
                <button ref={actionRef} type="button" onClick={send} className={primaryClass}>Try again</button>
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
