import React, { useState } from 'react';
import useGameStore from '../../store/gameStore';
import { UnaffiliatedCharacterRow } from './UnaffiliatedCharacterRow';
import { RowDelete, DeletedSlips, DeleteError } from './RowDelete';
import { useDeleteUndo } from './useDeleteUndo';
import { FormLine, BlankRows } from '../shared/PrintMarks';
import { MourningCross } from '../shared/InkMarks';
import { ConfirmAction } from '../shared/ConfirmAction';
import { ArmedDetail, leaveDetail, leaveError, leaveHint } from '../pc/LeaveCampaign';

// Why a character on a roster has no Delete (read out with its unpressable control)
const NOT_DELETABLE = { active: 'In a campaign' };

export const PlayerRegistryPage = ({
  isLoadingBook, characters, enterAsPlayer, refreshBook,
  joinForms, setJoinForms, handleJoinForChar, closeBook, setStage, hiddenOnNarrow = false,
}) => {
  const deleteCharacter = useGameStore(s => s.deleteCharacter);
  const restoreCharacter = useGameStore(s => s.restoreCharacter);
  const removal = useDeleteUndo({ remove: deleteCharacter, restore: restoreCharacter });
  // Taking back a request that is still waiting (a pending row has this in place of Delete)
  const withdrawRequest = useGameStore(s => s.withdrawRequest);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [withdrawError, setWithdrawError] = useState('');
  const withdraw = async (char) => {
    if (withdrawingId) return;
    setWithdrawingId(char.id);
    setWithdrawError('');
    const result = await withdrawRequest(char.id);
    setWithdrawingId(null);
    if (result.success) return;
    setWithdrawError(result.status === 409
      ? `The Lightkeeper had already answered ${char.name}'s request.`
      : result.status === 0
        ? `Could not reach the server, so ${char.name}'s request was not withdrawn. Check your connection and try again.`
        : `${char.name}'s request was not withdrawn. Try again in a moment.`);
  };
  // Leaving the campaign (an approved investigator's row): the investigator comes back to
  // Not in a campaign, and the hub says so
  const releaseMember = useGameStore(s => s.releaseMember);
  const setHubNotice = useGameStore(s => s.setHubNotice);
  const [leavingId, setLeavingId] = useState(null);
  const [leaveFailed, setLeaveFailed] = useState('');
  const leave = async (char) => {
    if (leavingId) return;
    setLeavingId(char.id);
    setLeaveFailed('');
    const result = await releaseMember(char.id);
    setLeavingId(null);
    if (result.success) setHubNotice(`${char.name} left ${char.campaign_name || 'the campaign'} and is free to join another campaign.`);
    else setLeaveFailed(leaveError(result, char.name));
  };
  const leaveControl = (char) => (
    <ConfirmAction
      className="contents"
      hintClassName="basis-full px-3 pb-2"
      cancelSize="min-h-[44px]"
      cancelLabel="Stay"
      disabled={leavingId === char.id}
      onConfirm={() => leave(char)}
      armedHint={leaveHint(char.campaign_name)}
      armedInfo={<ArmedDetail label="What leaving does" text={leaveDetail(char.name)} above={false} />}
      renderButton={(armed, props) => (
        <button
          {...props}
          aria-label={`${char.name} leaves ${char.campaign_name || 'the campaign'}`}
          className={`shrink-0 self-center mr-1 max-sm:mb-1 min-h-[44px] min-w-[44px] px-2.5 font-sans text-xs font-bold uppercase tracking-wider rounded-sm transition-colors disabled:opacity-60 disabled:cursor-wait ${armed
            ? 'bg-ink text-cream'
            : 'text-sepia hover:text-ink hover:bg-sepia/10'}`}
        >
          {leavingId === char.id ? 'Leaving…' : 'Leave'}
        </button>
      )}
    />
  );
  const deleteControl = (char) => (
    <RowDelete
      name={char.name}
      question={`Press again to delete ${char.name}.`}
      onConfirm={() => removal.confirmDelete(char)}
      busy={removal.busyId === char.id}
      blockedReason={NOT_DELETABLE[char.status] || null}
    />
  );

  const fallen = characters.filter(c => c.is_dead && c.status === 'retired');

  return (
  <div className={`book-page flex flex-col overflow-hidden min-w-0 max-lg:rounded-r-xl ${hiddenOnNarrow ? 'max-lg:hidden' : ''}`} style={{ flex: 1, borderRight: '2px solid rgb(var(--c-sepia) / 0.25)' }}>
    <div className="px-4 pt-4 lg:px-7 lg:pt-6 pb-3 shrink-0" style={{ borderBottom: '2px solid rgb(var(--c-sepia) / 0.18)' }}>
      <h2 className="font-display text-3xl lg:text-4xl leading-tight text-oxblood">Player Registry</h2>
      <FormLine className="block mt-1">Candela Obscura · Chapter registry · Vol. I</FormLine>
    </div>

    <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4 space-y-5">
      <DeleteError text={removal.error} />
      <DeleteError text={withdrawError} />
      <DeleteError text={leaveFailed} />
      <DeletedSlips deleted={removal.deleted} onUndo={removal.undo} />
      {isLoadingBook ? (
        <p className="font-serif text-xl italic text-sepia">Loading your investigators…</p>
      ) : (
        <>
          {/* Active characters */}
          {characters.filter(c => c.status === 'active').length > 0 && (
            <div>
              <p className="font-sans font-bold text-xs lg:text-sm tracking-widest uppercase mb-2 text-seal-green">In a campaign</p>
              <div className="space-y-1.5">
                {characters.filter(c => c.status === 'active').map(char => (
                  <div key={char.id} className="relative flex flex-wrap items-center" style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)' }}>
                  <button
                    onClick={() => enterAsPlayer(char)}
                    className="flex-1 min-w-0 max-sm:basis-full flex items-center gap-3 px-3 py-2.5 hover:bg-sepia/10 transition-colors text-left group"
                  >
                    <span aria-hidden="true" className="text-seal-green text-lg shrink-0">●</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-xl text-ink group-hover:text-oxblood transition-colors truncate">{char.name}</p>
                      {char.campaign_name && (
                        <p className="font-serif italic text-base text-sepia truncate">{char.campaign_name}</p>
                      )}
                    </div>
                    <span className="font-sans font-bold text-xs uppercase tracking-widest text-oxblood shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 group-focus-visible:opacity-100 transition-opacity">Play →</span>
                  </button>
                  {deleteControl(char)}
                  {!char.is_dead && leaveControl(char)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending characters */}
          {characters.filter(c => c.status === 'pending').length > 0 && (
            <div>
              <p className="font-sans font-bold text-xs lg:text-sm tracking-widest uppercase mb-2 text-sepia">Waiting for the Lightkeeper to approve</p>
              <div className="space-y-1.5">
                {characters.filter(c => c.status === 'pending').map(char => (
                  <div key={char.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-3 py-2.5"
                    style={{ border: '1px dashed rgb(var(--c-sepia) / 0.3)', background: 'rgb(var(--c-parchment-deep) / 0.25)' }}>
                    <span aria-hidden="true" className="text-sepia text-lg shrink-0">◌</span>
                    <div className="flex-1 min-w-0 max-sm:min-w-[calc(100%-2.5rem)]">
                      <p className="font-serif font-bold text-xl text-ink/80 truncate" title={char.name}>{char.name}</p>
                      {char.campaign_name && (
                        <p className="font-serif italic text-base text-sepia truncate" title={char.campaign_name}>{char.campaign_name}</p>
                      )}
                    </div>
                    <button
                      onClick={refreshBook}
                      disabled={isLoadingBook}
                      className="font-sans font-bold text-xs tracking-widest uppercase text-sepia hover:text-oxblood hover:border-oxblood/50 transition-colors shrink-0 rounded border border-sepia/40"
                      style={{ padding: '6px 12px' }}
                    >
                      {isLoadingBook ? 'Checking…' : 'Check again'}
                    </button>
                    <button
                      onClick={() => withdraw(char)}
                      disabled={withdrawingId === char.id}
                      aria-label={`Withdraw ${char.name}'s request`}
                      title="Take the request back. The investigator returns to Not in a campaign."
                      className="font-sans font-bold text-xs tracking-widest uppercase text-sepia hover:text-oxblood hover:border-oxblood/50 disabled:opacity-50 disabled:cursor-wait transition-colors shrink-0 rounded border border-sepia/40 mr-1 min-h-[36px] [@media(pointer:coarse)]:min-h-[44px]"
                      style={{ padding: '6px 12px' }}
                    >
                      {withdrawingId === char.id ? 'Withdrawing…' : 'Withdraw'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unaffiliated characters with inline join form */}
          {characters.filter(c => c.status === 'unaffiliated').length > 0 && (
            <div>
              <p className="font-sans font-bold text-xs lg:text-sm tracking-widest uppercase mb-2 text-sepia">Not in a campaign</p>
              <div className="space-y-2">
                {characters.filter(c => c.status === 'unaffiliated').map(char => {
                  const form = joinForms[char.id] || {};
                  return (
                    <UnaffiliatedCharacterRow
                      key={char.id}
                      char={char}
                      form={form}
                      setJoinForms={setJoinForms}
                      handleJoinForChar={handleJoinForChar}
                      trailing={deleteControl(char)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* The fallen (issue #47): a dead investigator whose player was replaced, or whose
              campaign was retired, stays with that campaign. A record only: no Play, Leave or Delete */}
          {fallen.length > 0 && (
            <div>
              <p className="font-sans font-bold text-xs lg:text-sm tracking-widest uppercase mb-2 text-sepia">Fallen</p>
              <ul className="space-y-1.5">
                {fallen.map(char => (
                  <li key={char.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"
                    style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)', background: 'rgb(var(--c-parchment-deep) / 0.2)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-xl text-ink/70 truncate" title={char.name}>{char.name}</p>
                      {char.campaign_name && (
                        <p className="font-serif italic text-base text-sepia truncate" title={char.campaign_name}>{char.campaign_name}</p>
                      )}
                    </div>
                    <span className="shrink-0 -rotate-3 inline-flex items-center gap-1 border-2 border-ink/70 rounded-sm px-1.5 py-0.5 font-sans text-xs font-black uppercase tracking-wider leading-tight text-ink/80">
                      <MourningCross className="h-[0.95em]" /> Fallen
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {characters.length === 0 && <BlankRows rows={4} label="No investigators" />}
        </>
      )}
    </div>

    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '2px solid rgb(var(--c-sepia) / 0.12)' }}>
      <button
        onClick={() => { closeBook({ silent: true }); setStage('CHARACTER_CREATION'); }}
        className="w-full font-sans font-black text-sm leading-tight tracking-widest uppercase text-oxblood transition-colors py-2.5 md:[@media(pointer:coarse)]:min-h-[44px] rounded hover:bg-oxblood/5"
        style={{ border: '1px solid rgb(var(--c-oxblood) / 0.35)' }}
      >
        + New investigator
      </button>
    </div>
  </div>
  );
};
