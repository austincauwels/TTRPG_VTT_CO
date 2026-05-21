import React from 'react';
import { AppRouter } from './components/AppRouter';

function App() {
  // GLOBAL THEME WRAPPER 
  // These classes apply universally across the entire application:
  // - antialiased: Smooths font rendering for that crisp, print-like text.
  // - font-serif: Enforces the turn-of-the-century typography globally.
  // - selection:bg-oxblood selection:text-parchment: Customizes highlight colors.
  // - bg-zinc-950: Provides an absolute dark base layer beneath all views.
  
  return (
    <div className="w-full min-h-screen bg-zinc-950 text-parchment font-serif antialiased selection:bg-oxblood selection:text-parchment flex flex-col">
      
      {/* ROUTING ENGINE: The router assumes full control of the screen real estate from here. */}
      <div className="flex-grow flex flex-col relative w-full h-full">
        <AppRouter />
      </div>

    </div>
  );
}

export default App;