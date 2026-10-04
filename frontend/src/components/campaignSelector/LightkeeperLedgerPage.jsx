import React from 'react';
import useGameStore from '../../store/gameStore';
import { CreateCampaignForm } from './CreateCampaignForm';
import { RowDelete, DeletedSlip, DeleteError } from './RowDelete';
import { useDeleteUndo } from './useDeleteUndo';
import { FormLine, BlankRows } from '../shared/PrintMarks';

// "Delete campaign Beta? 4 investigators return to their players."
const deleteQuestion = (camp) => {
  const n = camp.investigator_count || 0;
  const back = n === 0 ? '' : n === 1
    ? ' 1 investigator returns to their player.'
    : ` ${n} investigators return to their players.`;
  return `Delete campaign ${camp.name}?${back}`;
};

export const LightkeeperLedgerPage = ({
  closeBook, gmCampaigns, enterAsGM, isLoadingBook, showRegisterForm, setShowRegisterForm,
  userId, onCampaignCreated, hiddenOnNarrow = false,
}) => {
  const deleteCampaign = useGameStore(s => s.deleteCampaign);
  const restoreCampaign = useGameStore(s => s.restoreCampaign);
  const removal = useDeleteUndo({
    remove: deleteCampaign, restore: restoreCampaign, describe: (camp) => `Campaign ${camp.name}`,
  });

  return (
  <div className={`book-page-right flex flex-col overflow-hidden min-w-0 ${hiddenOnNarrow ? 'max-lg:hidden' : ''}`} style={{ flex: 1, borderRadius: '0 12px 12px 0' }}>
    <div className="px-4 pt-4 lg:px-7 lg:pt-6 pb-3 shrink-0 flex items-start justify-between gap-3" style={{ borderBottom: '2px solid rgb(var(--c-sepia) / 0.18)' }}>
      <div>
        <h2 className="font-display text-3xl lg:text-4xl leading-tight text-oxblood">Lightkeeper Ledger</h2>
        <FormLine className="block mt-1">Office of the Lightkeeper · Vol. II</FormLine>
      </div>
      <button
        onClick={closeBook}
        className="hidden lg:block shrink-0 font-sans font-bold text-xs tracking-widest uppercase text-sepia hover:text-oxblood transition-colors mt-1 px-3 py-2 rounded"
        style={{ border: '1px solid rgb(var(--c-sepia) / 0.3)' }}
      >
        Close book
      </button>
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
      {gmCampaigns.length > 0 && (
        <div className="space-y-1.5">
          {gmCampaigns.map(camp => (
            <div key={camp.id} className="flex flex-wrap items-center" style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)' }}>
            <button
              onClick={() => enterAsGM(camp)}
              className="flex-1 min-w-0 max-sm:basis-full flex items-center gap-3 px-3 py-2.5 hover:bg-sepia/10 transition-colors text-left group"
            >
              <span aria-hidden="true" className="text-seal-green text-lg shrink-0">▶</span>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-xl text-ink group-hover:text-oxblood transition-colors truncate">{camp.name}</p>
                <p className="font-serif text-base text-sepia">
                  Campaign code <span className="font-mono text-ink break-all">{camp.campaign_code}</span>
                </p>
              </div>
              <span className="font-sans font-bold text-xs uppercase tracking-widest text-oxblood shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Run →</span>
            </button>
            <RowDelete
              name={`campaign ${camp.name}`}
              question={deleteQuestion(camp)}
              onConfirm={() => removal.confirmDelete(camp)}
              busy={removal.busyId === camp.id}
            />
            </div>
          ))}
        </div>
      )}

      {gmCampaigns.length === 0 && !isLoadingBook && <BlankRows rows={3} label="No campaigns" />}
    </div>

    {showRegisterForm ? (
      <CreateCampaignForm
        userId={userId}
        onCreated={onCampaignCreated}
        onCancel={() => setShowRegisterForm(false)}
      />
    ) : (
      <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '2px solid rgb(var(--c-sepia) / 0.12)' }}>
        <button
          onClick={() => setShowRegisterForm(true)}
          className="w-full font-sans font-black text-sm leading-tight tracking-widest uppercase text-oxblood transition-colors py-2.5 rounded hover:bg-oxblood/5"
          style={{ border: '1px solid rgb(var(--c-oxblood) / 0.35)' }}
        >
          + New campaign
        </button>
      </div>
    )}
  </div>
  );
};
