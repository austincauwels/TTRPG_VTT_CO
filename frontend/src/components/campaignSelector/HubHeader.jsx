import React from 'react';
import { AccountMenu } from '../shared/AccountMenu';

// Title centered, the account card (which holds Sign out) in normal flow: its own row
// above the title on narrow screens, the right-hand column on wide ones, so the two never
// overlap. The hub is shared by players and the Lightkeeper, so it wears the warm night of
// the desk, not the GM's blue.
export const HubHeader = ({ onLogout }) => (
  <div className="relative z-50 w-full">
    <header className="w-full bg-night px-4 pt-3 pb-5 lg:px-6 lg:py-6 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-start gap-y-2 border-b border-sepia/40 shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
      <div className="hidden lg:block" aria-hidden="true" />
      <div className="flex flex-col items-center text-center">
        <h1 className="font-display text-[28px] sm:text-4xl tracking-[0.1em] text-cream uppercase">CANDELA OBSCURA</h1>
        <h2 className="text-xs font-sans font-bold tracking-widest text-oxblood-lit uppercase mt-1.5">Chapter Hub</h2>
      </div>
      <div className="flex justify-end order-first lg:order-none lg:-mt-2">
        <AccountMenu tone="night" onSignOut={onLogout} />
      </div>
    </header>
  </div>
);
