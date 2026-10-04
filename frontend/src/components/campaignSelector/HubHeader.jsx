import React from 'react';
import { AccountMenu } from '../shared/AccountMenu';

// On phones and tablets one slim band (owner's round 3 item 28): the wordmark at the left
// and the account at the right, as a small paper tag (the member's card that opens from it
// holds Sign out). From lg the title stands centered with the tag in the right-hand
// column. The hub is shared by players and the Lightkeeper, so it wears the warm night of
// the desk, not the GM's blue.
export const HubHeader = ({ onLogout }) => (
  <div className="hub-header relative z-50 w-full shrink-0">
    <header className="w-full bg-night pl-4 pr-3 py-1.5 sm:py-2.5 lg:px-6 lg:py-6 flex items-center justify-between gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-start border-b border-sepia/40 shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
      <div className="hidden lg:block" aria-hidden="true" />
      <div className="min-w-0 flex items-baseline gap-3 lg:flex-col lg:items-center lg:gap-0 lg:text-center">
        <h1 className="font-display text-lg sm:text-2xl lg:text-4xl tracking-[0.1em] text-cream uppercase whitespace-nowrap">CANDELA OBSCURA</h1>
        <h2 className="sr-only lg:not-sr-only text-xs font-sans font-bold tracking-widest text-oxblood-lit uppercase lg:mt-1.5">Chapter Hub</h2>
      </div>
      <div className="shrink-0 flex justify-end lg:-mt-1">
        <AccountMenu tone="tag" onSignOut={onLogout} />
      </div>
    </header>
  </div>
);
