import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import { undoEmailChange } from '../../utils/api';
import { PaperSheet } from '../shared/PaperSheet';
import { DateStamp, serialFor, stampDate } from '../shared/PrintMarks';
import { leaveEmailLink } from './accountAddress';

// /undo-email-change?token=...: the link mailed to the old address once a change of
// address went through (docs/refactor/AUTH.md, The account page). It needs no session:
// whoever made the change may have changed the password since. Nothing happens until the
// reader presses Undo the change, so a mail scanner that opens links changes nothing.
// Undoing puts the old address back, ends every sign-in to the account (this browser's
// too, when it is signed in to that account) and mails the old address a link to set a
// new password.

const errorTextClass = 'font-serif text-lg leading-snug text-oxblood';
const noteClass = 'font-serif text-base leading-snug text-sepia';
const buttonBase = 'w-full min-h-[44px] px-6 py-2.5 rounded font-sans font-black text-sm uppercase tracking-widest transition disabled:opacity-60 disabled:cursor-wait';
const primaryClass = `${buttonBase} bg-oxblood text-cream border border-ink hover:brightness-125`;
const quietClass = `${buttonBase} bg-transparent text-ink border border-ink/30 hover:bg-ink hover:text-parchment`;

const LINK_DEAD = 'This link has expired or has already been used.';
const SOMETHING_WRONG = 'Something went wrong. Please try again.';

export const UndoEmailChangePage = ({ token }) => {
  // ask | working | done | dead (used, expired or none) | stopped (refused for good) | refused (try again)
  const [state, setState] = useState(token ? 'ask' : 'dead');
  const [message, setMessage] = useState(token ? '' : LINK_DEAD);
  const [result, setResult] = useState(null); // { userId, name, email, passwordReset }
  const actionRef = useRef(null);

  const undo = () => {
    setState('working');
    setMessage('');
    undoEmailChange(token)
      .then((answer) => {
        setResult(answer);
        setState('done');
        // Every sign-in to that account has ended; this browser's too, if it was one.
        const { accessSession, logout } = useGameStore.getState();
        if (accessSession && answer?.userId != null && accessSession.userId === answer.userId) logout();
      })
      .catch((err) => {
        setMessage(err?.message || SOMETHING_WRONG);
        setState(err?.status === 400 ? 'dead' : err?.status === 409 ? 'stopped' : 'refused');
      });
  };

  useEffect(() => { if (state !== 'working') actionRef.current?.focus(); }, [state]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-night px-4 py-10 sm:py-14">
      <div className="w-full max-w-md animate-fadeIn rotate-[-0.6deg] sm:rotate-[-1deg]">
        <PaperSheet
          bodyClassName="px-5 pt-7 pb-6 sm:px-9 sm:pt-10 sm:pb-8"
          printLine="Form C.O. 8 · Chapter member"
          serial={serialFor(new Date().toDateString())}
          role="region"
          aria-labelledby="undo-email-heading"
        >
          <header className="text-center">
            <h1 className="font-display text-2xl sm:text-3xl leading-none tracking-[0.1em] uppercase text-ink whitespace-nowrap">
              Candela Obscura
            </h1>
            <div aria-hidden="true" className="mt-3 mb-5 border-t-[3px] border-double border-sepia/60" />
            <h2 id="undo-email-heading" className="font-display text-xl sm:text-2xl leading-tight uppercase tracking-[0.06em] text-oxblood">
              Undo Email Change
            </h2>
          </header>

          <div className="mt-6 space-y-5">
            {(state === 'ask' || state === 'working') && (
              <>
                <div className="space-y-3">
                  <p className="font-serif text-lg leading-snug text-ink">
                    Put this email address back on your Candela Obscura account?
                  </p>
                  <p className={noteClass}>
                    Undoing the change also signs the account out everywhere and sends this address a link
                    to set a new password.
                  </p>
                </div>
                <p role="status" className="sr-only">{state === 'working' ? 'Undoing…' : ''}</p>
                <div className="space-y-2">
                  <button ref={actionRef} type="button" onClick={undo} disabled={state === 'working'} className={primaryClass}>
                    {state === 'working' ? 'Undoing…' : 'Undo the change'}
                  </button>
                  <button type="button" onClick={leaveEmailLink} disabled={state === 'working'} className={quietClass}>
                    Leave it as it is
                  </button>
                </div>
              </>
            )}

            {state === 'done' && result && (
              <>
                <div role="status" className="flow-root space-y-3">
                  <DateStamp label="Undone" date={stampDate(new Date())} tone="green" tilt={3} className="float-right ml-3 mt-0.5 mb-1" />
                  <p className="font-serif text-lg leading-snug text-ink">
                    <strong className="font-semibold text-seal-green">Change undone.</strong>{' '}
                    The account <strong className="font-semibold break-words">{result.name}</strong> has this
                    address again:
                    <span className="block mt-1 font-mono text-base [overflow-wrap:anywhere]">{result.email}</span>
                  </p>
                  <p className={noteClass}>
                    {result.passwordReset
                      ? 'Every sign-in to it has ended. A link to set a new password is on its way to this address.'
                      : 'Every sign-in to it has ended. Password sign-in is off on this site, so sign in with Google using this address.'}
                  </p>
                </div>
                <button ref={actionRef} type="button" onClick={leaveEmailLink} className={primaryClass}>Continue</button>
              </>
            )}

            {(state === 'dead' || state === 'stopped') && (
              <>
                <p role="alert" className={errorTextClass}>{message || LINK_DEAD}</p>
                <button ref={actionRef} type="button" onClick={leaveEmailLink} className={primaryClass}>Continue</button>
              </>
            )}

            {state === 'refused' && (
              <>
                <p role="alert" className={errorTextClass}>{message}</p>
                <button ref={actionRef} type="button" onClick={undo} className={primaryClass}>Try again</button>
                <button type="button" onClick={leaveEmailLink} className={quietClass}>Leave it as it is</button>
              </>
            )}
          </div>
        </PaperSheet>
      </div>
    </div>
  );
};

export default UndoEmailChangePage;
