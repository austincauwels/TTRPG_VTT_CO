import React from 'react';
import { PlayerRegistryPage } from './PlayerRegistryPage';
import { LightkeeperLedgerPage } from './LightkeeperLedgerPage';

// The open book overlay. `.roster-book.closing` needs both classes on the same element.
export const RosterBook = ({ isClosingBook, closeBook, registryProps, ledgerProps }) => (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center"
    style={{ background: 'rgba(0,0,0,0.88)' }}
    onClick={closeBook}
  >
    <div
      className={`roster-book${isClosingBook ? ' closing' : ''} relative flex`}
      style={{
        width: '90vw', maxWidth: 1100, height: '85vh',
        borderRadius: '4px 12px 12px 4px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.98), 0 0 0 2px rgba(0,0,0,0.9)',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Book spine */}
      <div style={{
        width: 28, flexShrink: 0,
        background: 'linear-gradient(to right, #1a0a02, #3a1e08, #2a1205)',
        borderRadius: '4px 0 0 4px',
        boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.6)',
        borderRight: '2px solid rgba(0,0,0,0.8)',
      }} />

      <PlayerRegistryPage {...registryProps} closeBook={closeBook} />

      <LightkeeperLedgerPage {...ledgerProps} closeBook={closeBook} />
    </div>
  </div>
);
