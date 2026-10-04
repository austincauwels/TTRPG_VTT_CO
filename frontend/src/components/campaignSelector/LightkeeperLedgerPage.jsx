import React from 'react';
import { RegisterInvestigationForm } from './RegisterInvestigationForm';

export const LightkeeperLedgerPage = ({
  closeBook, gmCampaigns, enterAsGM, isLoadingBook, showRegisterForm, setShowRegisterForm,
  handleCreateCampaign, createError, newCampName, setNewCampName, newCampCode, setNewCampCode, isCreating,
  hiddenOnNarrow = false,
}) => (
  <div className={`book-page-right flex flex-col overflow-hidden min-w-0 ${hiddenOnNarrow ? 'max-lg:hidden' : ''}`} style={{ flex: 1, borderRadius: '0 12px 12px 0' }}>
    <div className="px-4 pt-4 lg:px-7 lg:pt-6 pb-3 shrink-0 flex items-start justify-between" style={{ borderBottom: '2px solid rgb(var(--c-sepia) / 0.18)' }}>
      <div>
        <p className="font-sans font-bold text-xs lg:text-sm tracking-widest text-sepia uppercase mb-1">List of Campaigns</p>
        <h2 className="font-display text-3xl lg:text-4xl leading-tight text-oxblood">Lightkeeper Ledger</h2>
      </div>
      <button
        onClick={closeBook}
        className="hidden lg:block font-sans font-bold text-xs tracking-widest uppercase text-sepia hover:text-oxblood transition-colors mt-1 px-3 py-2 rounded"
        style={{ border: '1px solid rgb(var(--c-sepia) / 0.3)' }}
      >
        ✕ Close
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4 space-y-5">
      {/* Active GM campaigns */}
      {gmCampaigns.length > 0 && (
        <div>
          <p className="font-sans font-bold text-xs lg:text-sm tracking-widest uppercase mb-2 text-seal-green">Active Investigations</p>
          <div className="space-y-1.5">
            {gmCampaigns.map(camp => (
              <button
                key={camp.id}
                onClick={() => enterAsGM(camp)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sepia/10 transition-colors text-left group"
                style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)' }}
              >
                <span className="text-seal-green text-lg shrink-0">▶</span>
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-bold text-xl text-ink group-hover:text-oxblood transition-colors truncate">{camp.name}</p>
                  <p className="font-mono text-sm text-sepia truncate">{camp.campaign_code}</p>
                </div>
                <span className="font-sans font-bold text-xs uppercase tracking-widest text-oxblood shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Open →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {gmCampaigns.length === 0 && !isLoadingBook && (
        <p className="font-serif text-xl italic text-sepia">No active investigations found.</p>
      )}
    </div>

    {/* Expandable registration form */}
    {showRegisterForm && (
      <RegisterInvestigationForm
        handleCreateCampaign={handleCreateCampaign}
        createError={createError}
        setShowRegisterForm={setShowRegisterForm}
        newCampName={newCampName}
        setNewCampName={setNewCampName}
        newCampCode={newCampCode}
        setNewCampCode={setNewCampCode}
        isCreating={isCreating}
      />
    )}

    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '2px solid rgb(var(--c-sepia) / 0.12)' }}>
      <button
        onClick={() => setShowRegisterForm(r => !r)}
        className="w-full font-sans font-black text-sm leading-tight tracking-widest uppercase text-oxblood transition-colors py-2.5 rounded hover:bg-oxblood/5"
        style={{ border: '1px solid rgb(var(--c-oxblood) / 0.35)' }}
      >
        {showRegisterForm ? '− Collapse Form' : '+ Register Investigation'}
      </button>
    </div>
  </div>
);
