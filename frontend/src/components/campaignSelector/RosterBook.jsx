import React, { useState } from 'react';
import { useDialog } from '../shared/useDialog';
import { PlayerRegistryPage } from './PlayerRegistryPage';
import { LightkeeperLedgerPage } from './LightkeeperLedgerPage';

const PAGE_TABS = [
  { id: 'registry', label: 'Player Registry', short: 'Registry' },
  { id: 'ledger', label: 'Lightkeeper Ledger', short: 'Ledger' },
];

// The open book overlay. `.roster-book.closing` needs both classes on the same element.
// From lg up the book lies open on both pages. Below lg it shows one page at a time, with
// index tabs on its top edge to turn between them and Close beside the tabs, so Close is
// always inside the viewport. The open and close animation is the same at every width.
// The book keeps will-change only while it moves (.is-settled once it has opened).
export const RosterBook = ({ isClosingBook, closeBook, defaultPage = 'registry', registryProps, ledgerProps }) => {
  const [page, setPage] = useState(defaultPage);
  const [settled, setSettled] = useState(false);
  const bookRef = useDialog({ onClose: closeBook });

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center pb-4 lg:pb-0"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={closeBook}
    >
      <div
        ref={bookRef}
        role="dialog"
        aria-modal="true"
        aria-label="Roster book"
        className={`roster-book${isClosingBook ? ' closing' : settled ? ' is-settled' : ''} relative flex w-[calc(100vw-32px)] h-[calc(100dvh-84px)] lg:w-[90vw] lg:max-w-[1100px] 2xl:max-w-[1320px] lg:h-[85vh]`}
        style={{
          borderRadius: '4px 12px 12px 4px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.98), 0 0 0 2px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
        onAnimationEnd={e => { if (e.target === e.currentTarget && !isClosingBook) setSettled(true); }}
      >
        {/* Below lg: index tabs cut from the top of the page block, just proud of its edge
            (owner's round 4 item 10). The open page's tab is the same paper as the page and
            runs into it; the other page's tab is older paper standing behind it. Each tab's
            tap area runs on down over the blank head of the page, so it is 44px tall while
            only its top shows. Close lies on the dark beside them, clear of the page. */}
        <div className="lg:hidden absolute bottom-[calc(100%-14px)] left-[40px] right-0 z-10 flex items-end gap-1.5">
          <div className="flex items-end gap-1" role="tablist" aria-label="Roster book pages">
            {PAGE_TABS.map(tab => {
              const active = page === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  aria-label={tab.label}
                  onClick={() => setPage(tab.id)}
                  className={`book-index-tab${active ? ' is-open' : ''} relative h-[44px] min-w-[80px] px-3 pb-[14px] font-sans font-bold uppercase text-xs tracking-widest leading-none`}
                >
                  {tab.short}
                </button>
              );
            })}
          </div>
          <button
            onClick={closeBook}
            className="ml-auto mb-[14px] shrink-0 font-sans font-bold text-xs tracking-widest uppercase text-parchment-deep hover:text-cream transition-colors px-2.5 min-h-[44px] whitespace-nowrap"
          >
            Close book
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
