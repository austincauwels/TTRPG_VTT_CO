import React from 'react';

// Quirk 2 (FRONTEND.md section 6): onSubmit reads createError from this render's props,
// so after a first failure the form still collapses. Kept as it is.
export const RegisterInvestigationForm = ({
  handleCreateCampaign, createError, setShowRegisterForm,
  newCampName, setNewCampName, newCampCode, setNewCampCode, isCreating,
}) => (
    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '1px solid rgb(var(--c-sepia) / 0.15)', background: 'rgb(var(--c-parchment-deep) / 0.3)' }}>
      <form onSubmit={async (e) => { await handleCreateCampaign(e); if (!createError) setShowRegisterForm(false); }} className="space-y-3">
        <div>
          <label className="font-sans font-bold text-xs tracking-widest uppercase text-sepia block mb-1">Investigation Name</label>
          <input type="text" value={newCampName} onChange={e => setNewCampName(e.target.value)}
            placeholder="e.g. The Fairelands"
            className="w-full bg-cream/60 border border-sepia/30 px-3 py-2 font-serif text-xl text-ink placeholder-sepia/60 outline-none focus:border-oxblood" />
        </div>
        <div>
          <label className="font-sans font-bold text-xs tracking-widest uppercase text-sepia block mb-1">Access Cipher</label>
          <input type="text" value={newCampCode} onChange={e => setNewCampCode(e.target.value)}
            placeholder="e.g. fairelands-01"
            className="w-full bg-cream/60 border border-sepia/30 px-3 py-2 font-serif text-xl text-ink placeholder-sepia/60 outline-none focus:border-oxblood" />
        </div>
        {createError && <p className="font-serif text-base text-oxblood">{createError}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={isCreating || !newCampName.trim() || !newCampCode.trim()}
            className="flex-1 bg-oxblood text-cream font-sans font-black text-sm tracking-widest uppercase px-3 py-2.5 rounded border border-ink hover:brightness-125 transition disabled:opacity-40">
            {isCreating ? 'Registering…' : 'Confirm Registration'}
          </button>
          <button type="button" onClick={() => setShowRegisterForm(false)}
            className="px-4 py-2 font-sans font-bold text-sm uppercase text-sepia hover:text-oxblood transition-colors rounded"
            style={{ border: '1px solid rgb(var(--c-sepia) / 0.3)' }}>
            ✕
          </button>
        </div>
      </form>
    </div>
);
