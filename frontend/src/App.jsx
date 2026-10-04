import React from 'react';
import { AppRouter } from './components/AppRouter';

function App() {
  // GLOBAL THEME WRAPPER 
  // These classes apply universally across the entire application:
  // - antialiased: Smooths font rendering for that crisp, print-like text.
  // - font-serif: Enforces the turn-of-the-century typography globally.
  // - selection:bg-oxblood selection:text-parchment: Customizes highlight colors.
  // - bg-night: the lamp-black stage beneath all views (palette in tailwind.config.js).
  
  return (
    <div className="w-full min-h-screen bg-night text-parchment font-serif antialiased selection:bg-oxblood selection:text-parchment flex flex-col">
      
      {/* ROUTING ENGINE: The router assumes full control of the screen real estate from here. */}
      <div className="flex-grow flex flex-col relative w-full h-full">
        <AppRouter />
      </div>

    </div>
  );
}

export default App;