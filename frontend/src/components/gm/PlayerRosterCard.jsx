import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { ConfirmAction } from '../shared/ConfirmAction';
import { WaxSeal } from '../shared/WaxSeal';

// A join request on the GM's desk. Approving presses the Lightkeeper's wax seal onto the
// request while it goes to the server; the sealed request then leaves the desk (a short
// fade). If the server refuses, the seal lifts and the request stays.
export const PlayerRosterCard = ({ investigator, onStamp, onReject, busy = false }) => {
  const { character } = useGameStore();
  const data = investigator || character;
  const [sealing, setSealing] = useState(false);

  // The request is still here after the call ended: the approval did not go through
  useEffect(() => { if (!busy) setSealing(false); }, [busy]);

  if (!data) return null;

  const approve = () => { setSealing(true); onStamp(); };

  return (
    <motion.div
      exit={{ opacity: 0, y: -10, transition: { duration: 0.3, ease: 'easeOut' } }}
      className="relative flex flex-col gap-3 px-4 py-3 border border-sepia/30 bg-parchment rounded-sm w-full shadow-[2px_4px_10px_rgba(0,0,0,0.5)]"
    >
      <div className="min-w-0">
        <p className="font-serif text-lg font-bold text-ink break-words">{data.name || 'Unknown'}</p>
        <p className="font-sans font-bold text-xs uppercase tracking-widest text-sepia break-words">
          {[data.pronouns, data.role_class || data.role, data.specialty].filter(Boolean).join(' · ')}
        </p>
        {data.catalyst && (
          <p className="font-serif text-sm italic text-sepia break-words leading-snug mt-0.5">"{data.catalyst}"</p>
        )}
      </div>
      {(onStamp || onReject) && (
        <div className="flex flex-wrap items-center gap-2">
          {onStamp && (
            <button
              onClick={approve}
              disabled={busy}
              className="disabled:opacity-50 disabled:cursor-wait min-h-[40px] md:[@media(pointer:coarse)]:min-h-[44px] px-4 py-2 font-sans text-xs font-black uppercase tracking-widest bg-oxblood text-cream border border-ink rounded hover:brightness-125 transition"
            >
              {sealing ? 'Approving…' : 'Approve'}
            </button>
          )}
          {onReject && (
            <ConfirmAction
              className="contents"
              hintClassName="basis-full"
              onConfirm={onReject}
              disabled={busy}
              cancelLabel="Keep request"
              armedHint={`Press again to reject ${data.name || 'this investigator'}. They go back to the player, out of the campaign.`}
              renderButton={(armed, props) => (
                <button
                  {...props}
                  className={`disabled:opacity-50 disabled:cursor-wait min-h-[40px] md:[@media(pointer:coarse)]:min-h-[44px] px-4 py-2 font-sans text-xs font-black uppercase tracking-widest border rounded transition-colors ${
                    armed
                      ? 'bg-ink text-cream border-ink hover:bg-oxblood'
                      : 'border-sepia/50 text-sepia hover:bg-sepia/10'
                  }`}
                >
                  {armed ? 'Yes, reject' : 'Reject'}
                </button>
              )}
            />
          )}
        </div>
      )}
      {/* The seal pressed onto the request, at its right edge, while it is approved */}
      {sealing && (
        <div aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <WaxSeal size={64} pressed />
        </div>
      )}
    </motion.div>
  );
};
