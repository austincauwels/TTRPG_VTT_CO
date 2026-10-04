import React from 'react';
import { RegisterInvestigationForm } from './RegisterInvestigationForm';

export const LightkeeperLedgerPage = ({
  closeBook, gmCampaigns, enterAsGM, isLoadingBook, showRegisterForm, setShowRegisterForm,
  handleCreateCampaign, createError, newCampName, setNewCampName, newCampCode, setNewCampCode, isCreating,
  hiddenOnNarrow = false,
}) => (
  <div className={`book-page-right flex flex-col overflow-hidden min-w-0 ${hiddenOnNarrow ? 'max-lg:hidden' : ''}`} style={{ flex: 1, borderRadius: '0 12px 12px 0' }}>
    <div className="px-4 pt-4 lg:px-7 lg:pt-6 pb-3 shrink-0 flex items-start justify-between" style={{ borderBottom: '2px solid rgba(60,40,20,0.18)' }}>
      <div>
        <p className="font-mono-data text-xs lg:text-[18px] tracking-[0.3em] lg:tracking-[0.4em] text-[#3c2814]/60 uppercase mb-1">List of Campaigns</p>
        <h2 className="font-cinzel text-[26px] sm:text-3xl lg:text-4xl leading-tight font-black text-[#7a5a18]">Lightkeeper Ledger</h2>
      </div>
      <button
        onClick={closeBook}
        className="hidden lg:block font-mono-data text-xl tracking-[0.3em] uppercase text-[#3c2814]/40 hover:text-[#3c2814] transition-colors mt-1 px-3 py-1"
        style={{ border: '1px solid rgba(60,40,20,0.2)' }}
      >
        ✕ Close
      </button>
    </div>

    <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4 space-y-5">
      {/* Active GM campaigns */}
      {gmCampaigns.length > 0 && (
        <div>
          <p className="font-mono-data text-xs lg:text-[18px] tracking-[0.25em] lg:tracking-[0.35em] uppercase mb-2 text-[#7a5a18]/70">Active Investigations</p>
          <div className="space-y-1.5">
            {gmCampaigns.map(camp => (
              <button
                key={camp.id}
                onClick={() => enterAsGM(camp)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#3c2814]/08 transition-colors text-left group"
                style={{ border: '1px solid rgba(60,40,20,0.15)' }}
              >
                <span className="text-[#c49d47]/70 text-xl shrink-0">▶</span>
                <div className="flex-1 min-w-0">
                  <p className="font-garamond font-bold text-xl text-[#2b1a0e] group-hover:text-[#7a5a18] transition-colors truncate">{camp.name}</p>
                  <p className="font-mono-data text-base tracking-[0.2em] uppercase text-[#3c2814]/40 truncate">{camp.campaign_code}</p>
                </div>
                <span className="font-mono-data text-base text-[#c49d47]/60 shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Open →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {gmCampaigns.length === 0 && !isLoadingBook && (
        <p className="font-garamond text-[28px] italic text-[#3c2814]/40">No active investigations found.</p>
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

    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '2px solid rgba(60,40,20,0.12)' }}>
      <button
        onClick={() => setShowRegisterForm(r => !r)}
        className="w-full font-cinzel text-base sm:text-xl leading-tight font-bold tracking-widest uppercase text-[#7a5a18] hover:text-[#a07830] transition-colors py-2 hover:bg-[#7a5a18]/05"
        style={{ border: '1px solid rgba(122,90,24,0.25)' }}
      >
        {showRegisterForm ? '− Collapse Form' : '+ Register Investigation'}
      </button>
    </div>
  </div>
);
