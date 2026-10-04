import React from 'react';

// Quirk 2 (FRONTEND.md section 6): onSubmit reads createError from this render's props,
// so after a first failure the form still collapses. Kept as it is.
export const RegisterInvestigationForm = ({
  handleCreateCampaign, createError, setShowRegisterForm,
  newCampName, setNewCampName, newCampCode, setNewCampCode, isCreating,
}) => (
    <div className="px-7 py-4 shrink-0" style={{ borderTop: '1px solid rgba(60,40,20,0.15)', background: 'rgba(60,40,20,0.04)' }}>
      <form onSubmit={async (e) => { await handleCreateCampaign(e); if (!createError) setShowRegisterForm(false); }} className="space-y-3">
        <div>
          <label className="font-cinzel text-base font-bold tracking-widest uppercase text-[#3c2814]/50 block mb-1">Investigation Name</label>
          <input type="text" value={newCampName} onChange={e => setNewCampName(e.target.value)}
            placeholder="e.g. The Fairelands"
            className="w-full bg-white/50 border border-[#3c2814]/25 px-3 py-2 font-garamond text-[28px] text-[#2b1a0e] placeholder-[#3c2814]/30 outline-none focus:border-[#7a5a18]/50" />
        </div>
        <div>
          <label className="font-cinzel text-base font-bold tracking-widest uppercase text-[#3c2814]/50 block mb-1">Access Cipher</label>
          <input type="text" value={newCampCode} onChange={e => setNewCampCode(e.target.value)}
            placeholder="e.g. fairelands-01"
            className="w-full bg-white/50 border border-[#3c2814]/25 px-3 py-2 font-garamond text-[28px] text-[#2b1a0e] placeholder-[#3c2814]/30 outline-none focus:border-[#7a5a18]/50" />
        </div>
        {createError && <p className="font-mono-data text-[18px] text-red-700">{createError}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={isCreating || !newCampName.trim() || !newCampCode.trim()}
            className="flex-1 bg-[#3c2814] text-[#c49d47] font-cinzel text-[18px] font-bold tracking-widest uppercase px-3 py-2 hover:bg-[#5a3a1a] transition-colors disabled:opacity-40"
            style={{ border: '1px solid rgba(196,157,71,0.3)' }}>
            {isCreating ? 'Registering…' : 'Confirm Registration'}
          </button>
          <button type="button" onClick={() => setShowRegisterForm(false)}
            className="px-4 py-2 font-cinzel text-base tracking-widest uppercase text-[#3c2814]/50 hover:text-[#3c2814] transition-colors"
            style={{ border: '1px solid rgba(60,40,20,0.2)' }}>
            ✕
          </button>
        </div>
      </form>
    </div>
);
