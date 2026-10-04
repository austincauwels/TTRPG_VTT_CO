import React from 'react';
import { MotionConfig } from 'framer-motion';
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
      {/* Framer Motion springs and slides follow the reader's reduced-motion setting: under
          it, movement is dropped and only opacity changes remain. */}
      <MotionConfig reducedMotion="user">
        <div className="flex-grow flex flex-col relative w-full h-full">
          <AppRouter />
        </div>
      </MotionConfig>

    </div>
  );
}

export default App;