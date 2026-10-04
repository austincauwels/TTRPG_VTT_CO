import React from 'react';
import { UnaffiliatedCharacterRow } from './UnaffiliatedCharacterRow';

export const PlayerRegistryPage = ({
  isLoadingBook, characters, enterAsPlayer, refreshBook,
  joinForms, setJoinForms, handleJoinForChar, closeBook, setStage, hiddenOnNarrow = false,
}) => (
  <div className={`book-page flex flex-col overflow-hidden min-w-0 max-lg:rounded-r-xl ${hiddenOnNarrow ? 'max-lg:hidden' : ''}`} style={{ flex: 1, borderRight: '2px solid rgb(var(--c-sepia) / 0.25)' }}>
    <div className="px-4 pt-4 lg:px-7 lg:pt-6 pb-3 shrink-0" style={{ borderBottom: '2px solid rgb(var(--c-sepia) / 0.18)' }}>
      <h2 className="font-display text-3xl lg:text-4xl leading-tight text-oxblood">Player Registry</h2>
      <p className="font-serif italic text-base text-sepia mt-0.5">Your investigators and the campaigns they play in.</p>
    </div>

    <div className="flex-1 overflow-y-auto px-4 lg:px-7 py-4 space-y-5">
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
                  <button
                    key={char.id}
                    onClick={() => enterAsPlayer(char)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sepia/10 transition-colors text-left group"
                    style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)' }}
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
                ))}
              </div>
            </div>
          )}

          {/* Pending characters */}
          {characters.filter(c => c.status === 'pending').length > 0 && (
            <div>
              <p className="font-sans font-bold text-xs lg:text-sm tracking-widest uppercase mb-2 text-sepia">Waiting for the GM to approve</p>
              <div className="space-y-1.5">
                {characters.filter(c => c.status === 'pending').map(char => (
                  <div key={char.id} className="flex items-center gap-3 px-3 py-2.5"
                    style={{ border: '1px dashed rgb(var(--c-sepia) / 0.3)', background: 'rgb(var(--c-parchment-deep) / 0.25)' }}>
                    <span aria-hidden="true" className="text-sepia/70 text-lg shrink-0">◌</span>
                    <div className="flex-1 min-w-0">
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
                    />
                  );
                })}
              </div>
            </div>
          )}

          {characters.length === 0 && (
            <p className="font-serif text-xl italic text-sepia">You have no investigators yet. Create one below, then join a campaign with the code your GM gives you.</p>
          )}
        </>
      )}
    </div>

    <div className="px-4 py-3 lg:px-7 lg:py-4 shrink-0" style={{ borderTop: '2px solid rgb(var(--c-sepia) / 0.12)' }}>
      <button
        onClick={() => { closeBook(); setStage('CHARACTER_CREATION'); }}
        className="w-full font-sans font-black text-sm leading-tight tracking-widest uppercase text-oxblood transition-colors py-2.5 rounded hover:bg-oxblood/5"
        style={{ border: '1px solid rgb(var(--c-oxblood) / 0.35)' }}
      >
        + New investigator
      </button>
    </div>
  </div>
);
