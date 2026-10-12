import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { ConfirmAction } from '../shared/ConfirmAction';

// A player may take their investigator out of its campaign at any time (decision 1 of fix
// round 4, playtest ghost-member-no-release), from the foot of the sheet on their desk or
// from the hub's registry row. Two presses; the armed line says what goes with them.
export const leaveHint = (name, campaignName) =>
  `Press again to leave ${campaignName || 'the campaign'}. ${name} comes back to you, free to join another campaign. Their circle votes, relationships and this assignment's report there are dropped.`;

// What a leave that did not go through says
export const leaveError = (result, name) => (result?.status === 0
  ? `Could not reach the server, so ${name} is still in the campaign. Check your connection and try again.`
  : result?.status === 409
    ? `${name} is no longer in the campaign.`
    : `${name} did not leave the campaign. Try again in a moment.`);

// The desk's way out, under the investigator's sheet. Going through takes the desk back to
// the hub, which says so (the store's releaseMember and investigator_released).
export const LeaveCampaign = ({ character, campaignName }) => {
  const releaseMember = useGameStore(s => s.releaseMember);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!character?.id || character.status !== 'active' || character.is_dead) return null;
  const name = character.name || 'Your investigator';
  const leave = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const result = await releaseMember(character.id);
    setBusy(false);
    if (!result.success) setError(leaveError(result, name));
  };
  return (
    <div className="relative mt-8 pt-4 border-t border-ink/10">
      <ConfirmAction
        className="flex flex-wrap items-center gap-3"
        hintClassName="basis-full"
        onConfirm={leave}
        disabled={busy}
        cancelLabel="Stay"
        armedHint={leaveHint(name, campaignName)}
        renderButton={(armed, props) => (
          <button
            {...props}
            className={`disabled:opacity-50 disabled:cursor-wait font-sans text-xs font-black uppercase tracking-widest px-4 py-2 min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] border rounded transition-colors ${
              armed ? 'bg-ink text-cream border-ink' : 'border-sepia/50 text-sepia hover:bg-sepia/10'
            }`}
          >
            {busy ? 'Leaving…' : armed ? 'Yes, leave' : 'Leave the campaign'}
          </button>
        )}
      />
      {error && <p role="alert" className="mt-2 font-serif text-base text-oxblood leading-snug">{error}</p>}
    </div>
  );
};
