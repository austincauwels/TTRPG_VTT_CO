import React from 'react';
import useGameStore from '../../store/gameStore';
import { UnaffiliatedCharacterRow } from './UnaffiliatedCharacterRow';
import { RowDelete, DeletedSlip, DeleteError } from './RowDelete';
import { useDeleteUndo } from './useDeleteUndo';
import { FormLine, BlankRows } from '../shared/PrintMarks';

// Why a character on a roster has no Delete (read out with its unpressable control)
const NOT_DELETABLE = { active: 'In a campaign', pending: 'Waiting for the Lightkeeper' };

export const PlayerRegistryPage = ({
  isLoadingBook, characters, enterAsPlayer, refreshBook,
  joinForms, setJoinForms, handleJoinForChar, closeBook, setStage, hiddenOnNarrow = false,
}) => {
  const deleteCharacter = useGameStore(s => s.deleteCharacter);
  const restoreCharacter = useGameStore(s => s.restoreCharacter);
  const removal = useDeleteUndo({ remove: deleteCharacter, restore: restoreCharacter });
  const deleteControl = (char) => (
    <RowDelete
      name={char.name}
      question={`Delete ${char.name}?`}
      onConfirm={() => removal.confirmDelete(char)}
      busy={removal.busyId === char.id}
      blockedReason={NOT_DELETABLE[char.status] || null}
    />
  );

  return (
  <div className={`book-page flex flex-col overflow-hidden min-w-0 max-lg:rounded-r-xl ${hiddenOnNarrow ? 'max-lg:hidden' : ''}`} style={{ flex: 1, borderRight: '2px solid rgb(var(--c-sepia) / 0.25)' }}>
    <div className="px-4 pt-4 lg:px-7 lg:pt-6 pb-3 shrink-0" style={{ borderBottom: '2px solid rgb(var(--c-sepia) / 0.18)' }}>
      <h2 className="font-display text-3xl lg:text-4xl leading-tight text-oxblood">Player Registry</h2>
      <FormLine className="block mt-1">Candela Obscura · Chapter registry · Vol. I</FormLine>
    </div>

    <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4 space-y-5">
      <DeleteError text={removal.error} />
      {removal.deleted && (
        <DeletedSlip
          text={`${removal.deleted.name} deleted.`}
          secondsLeft={removal.secondsLeft}
          undoing={removal.deleted.undoing}
          onUndo={removal.undo}
        />
      )}
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
                  <div key={char.id} className="flex flex-wrap items-center" style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)' }}>
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
                      <p className="font-serif font-bold text-xl text-ink/80 truncate">{char.name}</p>
                      {char.campaign_name && (
                        <p className="font-serif italic text-base text-sepia truncate">{char.campaign_name}</p>
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
                    {deleteControl(char)}
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

          {characters.length === 0 && <BlankRows rows={4} label="No investigators" />}
        </>
      )}
    </div>

    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '2px solid rgb(var(--c-sepia) / 0.12)' }}>
      <button
        onClick={() => { closeBook({ silent: true }); setStage('CHARACTER_CREATION'); }}
        className="w-full font-sans font-black text-sm leading-tight tracking-widest uppercase text-oxblood transition-colors py-2.5 rounded hover:bg-oxblood/5"
        style={{ border: '1px solid rgb(var(--c-oxblood) / 0.35)' }}
      >
        + New investigator
      </button>
    </div>
  </div>
  );
};
