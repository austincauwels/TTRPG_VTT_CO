import React, { useState } from 'react';
import { PlayerRegistryPage } from './PlayerRegistryPage';
import { LightkeeperLedgerPage } from './LightkeeperLedgerPage';

const PAGE_TABS = [
  { id: 'registry', label: 'Player Registry', paper: 'rgb(var(--c-parchment))', ink: 'rgb(var(--c-oxblood))' },
  { id: 'ledger', label: 'Lightkeeper Ledger', paper: 'rgb(var(--c-parchment))', ink: 'rgb(var(--c-oxblood))' },
];

// The open book overlay. `.roster-book.closing` needs both classes on the same element.
// From lg up the book lies open on both pages. Below lg it shows one page at a time, with
// folder tabs on its top edge to turn between them and Close beside the tabs, so Close is
// always inside the viewport. The open and close animation is the same at every width.
export const RosterBook = ({ isClosingBook, closeBook, defaultPage = 'registry', registryProps, ledgerProps }) => {
  const [page, setPage] = useState(defaultPage);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center pb-4 lg:pb-0"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={closeBook}
    >
      <div
        className={`roster-book${isClosingBook ? ' closing' : ''} relative flex w-[calc(100vw-32px)] h-[calc(100dvh-84px)] lg:w-[90vw] lg:max-w-[1100px] lg:h-[85vh]`}
        style={{
          borderRadius: '4px 12px 12px 4px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.98), 0 0 0 2px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Page tabs and Close, on the book's top edge (one page at a time) */}
        <div className="lg:hidden absolute bottom-full left-[30px] right-0 flex items-end gap-1">
          <div className="flex items-end gap-1" role="tablist" aria-label="Roster book pages">
            {PAGE_TABS.map(tab => {
              const active = page === tab.id;
              return (
                <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setPage(tab.id)}
                className="font-sans font-bold uppercase text-xs tracking-[0.06em] sm:tracking-widest leading-tight px-2.5 sm:px-4 transition-colors"
                style={{
                  clipPath: 'polygon(7px 0%, calc(100% - 7px) 0%, 100% 100%, 0% 100%)',
                  background: active ? tab.paper : 'rgb(var(--c-ink) / 0.95)',
                  color: active ? tab.ink : 'rgb(var(--c-parchment-deep))',
                  minHeight: active ? 44 : 38,
                  boxShadow: active ? '0 -3px 8px rgba(0,0,0,0.4)' : 'none',
                }}
              >
                {tab.label}
              </button>
            );
          })}
          </div>
          <button
            onClick={closeBook}
            className="ml-auto mb-1.5 shrink-0 font-sans font-bold text-xs tracking-widest uppercase text-parchment-deep hover:text-cream transition-colors px-2.5 min-h-[36px] whitespace-nowrap rounded"
            style={{ border: '1px solid rgb(var(--c-parchment-deep) / 0.35)' }}
          >
            ✕ Close
          </button>
        </div>

        {/* Book spine */}
        <div style={{
          width: 28, flexShrink: 0,
          background: 'linear-gradient(to right, #1a0a02, #3a1e08, #2a1205)',
          borderRadius: '4px 0 0 4px',
          boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.6)',
          borderRight: '2px solid rgba(0,0,0,0.8)',
        }} />

        <PlayerRegistryPage {...registryProps} closeBook={closeBook} hiddenOnNarrow={page !== 'registry'} />

        <LightkeeperLedgerPage {...ledgerProps} closeBook={closeBook} hiddenOnNarrow={page !== 'ledger'} />
      </div>
    </div>
  );
};
