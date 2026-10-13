import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { ConfirmAction } from '../shared/ConfirmAction';
import { InfoTerm } from '../shared/ActionInfo';

// A player may take their investigator out of its campaign at any time (decision 1 of fix
// round 4, playtest ghost-member-no-release), from the foot of the sheet on their desk or
// from the hub's registry row. Two presses; the armed line says what the second does in one
// short sentence, and what goes with the investigator is behind its "i" (issue #62: the
// line was a paragraph). sealed is the circle's is_finalized where it is known (the desk);
// the hub has no circle, so its detail says what happens if the circle is sealed.
// trainDice is how many Train dice the investigator holds where it is known (the desk);
// they go, as at Retire, so the hub, which does not know, says so in any case.
export const trainLost = (trainDice) => (trainDice === undefined || trainDice > 0 ? ' Any Train die they hold is lost.' : '');
export const leaveHint = (campaignName) => `Press again to leave ${campaignName || 'the campaign'}.`;
export const leaveDetail = (name, sealed, trainDice) => {
  const dropped = `${name} comes back to you, free to join another campaign. Their circle votes, relationships and this assignment's report there are dropped.`;
  const pools = sealed === undefined ? ' If the circle is sealed, Stitch, Refresh and Train come down to the smaller maximum, with nothing refunded.'
    : sealed ? ' Stitch, Refresh and Train come down to the smaller maximum, with nothing refunded.' : '';
  return `${dropped}${pools}${trainLost(trainDice)}`;
};

// The "i" beside an armed Leave or Release. Its slip lies against the nearest positioned box
// (the caller's), so it stays on the screen wherever the term wraps to: above it at the foot
// of a sheet, where the paper ends just below, and under it on the hub's registry row.
export const ArmedDetail = ({ label, text, above = true }) => (
  <span className="font-sans not-italic text-xs font-black uppercase tracking-widest text-sepia">
    <InfoTerm label={label} text={text} anchored={false}
      slipClassName={`left-0 ${above ? 'bottom-full mb-1' : 'top-full mt-1'} w-[min(24rem,100%)]`} />
  </span>
);

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
  const sealed = useGameStore(s => !!s.circle?.is_finalized);
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
        armedHint={leaveHint(campaignName)}
        armedInfo={<ArmedDetail label="What leaving does" text={leaveDetail(name, sealed, character.train_bonus ? (character.train_dice || 1) : 0)} />}
        renderButton={(armed, props) => (
          <button
            {...props}
            className={`disabled:opacity-50 disabled:cursor-wait font-sans text-xs font-black uppercase tracking-widest px-4 py-2 min-h-[40px] [@media(pointer:coarse)]:min-h-[44px] border rounded transition-colors ${
              armed ? 'bg-ink text-cream border-ink' : 'border-sepia/50 text-sepia hover:bg-sepia/10'
            }`}
          >
            {busy ? 'Leaving…' : armed ? 'Leave' : 'Leave the campaign'}
          </button>
        )}
      />
      {error && <p role="alert" className="mt-2 font-serif text-base text-oxblood leading-snug">{error}</p>}
    </div>
  );
};
