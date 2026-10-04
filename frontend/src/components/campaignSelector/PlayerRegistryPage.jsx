import React from 'react';
import { UnaffiliatedCharacterRow } from './UnaffiliatedCharacterRow';

export const PlayerRegistryPage = ({
  isLoadingBook, characters, enterAsPlayer, refreshBook,
  joinForms, setJoinForms, handleJoinForChar, closeBook, setStage, hiddenOnNarrow = false,
}) => (
  <div className={`book-page flex flex-col overflow-hidden min-w-0 max-lg:rounded-r-xl ${hiddenOnNarrow ? 'max-lg:hidden' : ''}`} style={{ flex: 1, borderRight: '2px solid rgba(90,58,40,0.25)' }}>
    <div className="px-4 pt-4 lg:px-7 lg:pt-6 pb-3 shrink-0" style={{ borderBottom: '2px solid rgba(90,58,40,0.18)' }}>
      <p className="font-mono-data text-xs lg:text-[18px] tracking-[0.3em] lg:tracking-[0.4em] text-[#5a3a28]/60 uppercase mb-1">List of Investigators</p>
      <h2 className="font-cinzel text-[26px] sm:text-3xl lg:text-4xl leading-tight font-black text-[#8b1a1a]">Player Registry</h2>
    </div>

    <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4 space-y-5">
      {isLoadingBook ? (
        <p className="font-garamond text-[32px] italic text-[#5a3a28]/50">Retrieving dossiers…</p>
      ) : (
        <>
          {/* Active characters */}
          {characters.filter(c => c.status === 'active').length > 0 && (
            <div>
              <p className="font-mono-data text-xs lg:text-[18px] tracking-[0.25em] lg:tracking-[0.35em] uppercase mb-2 text-emerald-700">Active Campaigns</p>
              <div className="space-y-1.5">
                {characters.filter(c => c.status === 'active').map(char => (
                  <button
                    key={char.id}
                    onClick={() => enterAsPlayer(char)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#5a3a28]/10 transition-colors text-left group"
                    style={{ border: '1px solid rgba(90,58,40,0.15)' }}
                  >
                    <span className="text-emerald-600 text-xl shrink-0">●</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-garamond font-bold text-xl text-[#2b1a0e] group-hover:text-[#8b1a1a] transition-colors truncate">{char.name}</p>
                      {char.campaign_name && (
                        <p className="font-mono-data text-base tracking-[0.2em] uppercase text-[#5a3a28]/50 truncate">{char.campaign_name}</p>
                      )}
                    </div>
                    <span className="font-mono-data text-base text-emerald-600 shrink-0 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">Enter →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pending characters */}
          {characters.filter(c => c.status === 'pending').length > 0 && (
            <div>
              <p className="font-mono-data text-xs lg:text-[18px] tracking-[0.25em] lg:tracking-[0.35em] uppercase mb-2 text-[#7a5a18]">Awaiting Lightkeeper Approval</p>
              <div className="space-y-1.5">
                {characters.filter(c => c.status === 'pending').map(char => (
                  <div key={char.id} className="flex items-center gap-3 px-3 py-2.5"
                    style={{ border: '1px solid rgba(196,157,71,0.2)', background: 'rgba(196,157,71,0.04)' }}>
                    <span className="text-[#c49d47]/60 text-xl shrink-0">◌</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-garamond font-bold text-xl text-[#2b1a0e]/70 truncate">{char.name}</p>
                      {char.campaign_name && (
                        <p className="font-mono-data text-base tracking-[0.2em] uppercase text-[#5a3a28]/40 truncate">{char.campaign_name}</p>
                      )}
                    </div>
                    <button
                      onClick={refreshBook}
                      disabled={isLoadingBook}
                      className="font-mono-data text-base tracking-[0.2em] uppercase text-[#3b82f6]/60 hover:text-[#3b82f6] transition-colors shrink-0"
                      style={{ border: '1px solid rgba(59,130,246,0.2)', padding: '4px 12px' }}
                    >
                      {isLoadingBook ? '…' : 'Refresh'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unaffiliated characters with inline join form */}
          {characters.filter(c => c.status === 'unaffiliated').length > 0 && (
            <div>
              <p className="font-mono-data text-xs lg:text-[18px] tracking-[0.25em] lg:tracking-[0.35em] uppercase mb-2 text-[#5a3a28]/50">Unaffiliated Investigators</p>
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
                    />
                  );
                })}
              </div>
            </div>
          )}

          {characters.length === 0 && (
            <p className="font-garamond text-[28px] italic text-[#5a3a28]/40">No investigators Registered.</p>
          )}
        </>
      )}
    </div>

    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '2px solid rgba(90,58,40,0.12)' }}>
      <button
        onClick={() => { closeBook(); setStage('CHARACTER_CREATION'); }}
        className="w-full font-cinzel text-base sm:text-xl leading-tight font-bold tracking-widest uppercase text-[#8b1a1a] hover:text-[#c42222] transition-colors py-2 hover:bg-[#8b1a1a]/05"
        style={{ border: '1px solid rgba(139,26,26,0.25)' }}
      >
        + Register New Investigator
      </button>
    </div>
  </div>
);
