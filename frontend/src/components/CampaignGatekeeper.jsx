import React, { useState } from 'react';

// Thematic ink and typography profiles
const PENS = [
  { id: 'fountain', name: 'Coroner Fountain Pen', color: '#1a1918', font: 'font-serif', style: 'normal' },
  { id: 'pencil', name: 'Field Graphite Pencil', color: '#3c3b3a', font: 'font-mono', style: 'italic' },
  { id: 'quill', name: 'Occultist Stained Quill', color: '#56140b', font: 'font-serif', style: 'normal' }
];

export const CampaignGatekeeper = ({ onAccessGranted }) => {
  const [campaignCode, setCampaignCode] = useState('');
  const [userRole, setUserRole] = useState('PC'); // PC or GM
  const [selectedPen, setSelectedPen] = useState(PENS[0]);

  const handleAccess = (e) => {
    e.preventDefault();
    if (!campaignCode.trim()) return;
    
    onAccessGranted({
      campaignCode: campaignCode.toUpperCase(),
      role: userRole,
      pen: selectedPen
    });
  };

  return (
    <div className="fixed inset-0 bg-[#0d0908] text-[#f5ebd6] flex items-center justify-center p-4 font-serif z-50 bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
      <div className="w-full max-w-md bg-[#161110] border-2 border-[#3e2f29] p-8 rounded shadow-2xl relative">
        <div className="absolute top-2 right-2 text-[8px] font-mono opacity-20">AUTH_INDEX_SECURE</div>
        
        <div className="text-center border-b border-[#3e2f29] pb-4 mb-6">
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#721c15]">Candela Archive Portal</h1>
          <p className="text-[9px] font-sans font-black tracking-widest text-stone-500 uppercase mt-1">Establish Identity Coordinates for Live Synchronization</p>
        </div>

        <form onSubmit={handleAccess} className="space-y-5">
          {/* Campaign Input */}
          <div className="space-y-1">
            <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#d4af37]">Enter Assignment Campaign Code</label>
            <input 
              type="text"
              required
              value={campaignCode}
              onChange={(e) => setCampaignCode(e.target.value)}
              placeholder="e.g., REDFIELD_VAULT"
              className="w-full bg-black/40 border border-[#3e2f29] rounded p-2.5 font-mono text-sm tracking-widest uppercase focus:outline-none focus:border-[#721c15] text-[#fdfaf4]"
            />
          </div>

          {/* Role Designation Selector */}
          <div className="space-y-1">
            <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#d4af37]">Designate Clearance Level</label>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setUserRole('PC')}
                className={`py-2 border font-sans text-xs font-black uppercase tracking-wider rounded transition-all ${userRole === 'PC' ? 'bg-[#721c15] border-transparent text-white shadow-md' : 'border-[#3e2f29] bg-transparent text-stone-400 hover:bg-white/5'}`}
              >
                Investigator (PC)
              </button>
              <button
                type="button"
                onClick={() => setUserRole('GM')}
                className={`py-2 border font-sans text-xs font-black uppercase tracking-wider rounded transition-all ${userRole === 'GM' ? 'bg-[#d4af37] border-transparent text-black shadow-md' : 'border-[#3e2f29] bg-transparent text-stone-400 hover:bg-white/5'}`}
              >
                Lightkeeper (GM)
              </button>
            </div>
          </div>

          {/* Custom Interactive Pen Selection Module (Only for PCs) */}
          {userRole === 'PC' && (
            <div className="space-y-2 border-t border-[#3e2f29] pt-4 animate-fadeIn">
              <label className="block text-[9px] font-sans font-black uppercase tracking-widest text-[#d4af37]">Select Journal Ledger Pen</label>
              <div className="space-y-1.5">
                {PENS.map((pen) => (
                  <div
                    key={pen.id}
                    onClick={() => setSelectedPen(pen)}
                    className={`p-2.5 border rounded cursor-pointer transition-all flex items-center justify-between ${selectedPen.id === pen.id ? 'bg-stone-900 border-[#721c15]' : 'border-[#3e2f29]/50 bg-transparent hover:bg-white/5'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: pen.color }} />
                      <span className="text-xs font-bold tracking-wide text-stone-300">{pen.name}</span>
                    </div>
                    <span className={`text-xs opacity-80 ${pen.font} ${pen.style}`} style={{ color: pen.color }}>
                      Sample Script
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Call */}
          <button
            type="submit"
            className="w-full py-3 bg-[#721c15] hover:bg-red-800 text-white font-sans font-black text-xs uppercase tracking-widest rounded transition-colors shadow-lg mt-2"
          >
            Access Secure Connection Pipe →
          </button>
        </form>
      </div>
    </div>
  );
};