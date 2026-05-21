// src/components/LoginScreen.jsx
import React, { useState } from 'react';

const LoginScreen = () => {
  // Use Vite environment variables
  const officialMap = import.meta.env.VITE_MAP_OFFICIAL;
  const backupMap = import.meta.env.VITE_MAP_PUBLIC;

  // State to track if the primary image failed to load
  const [imgError, setImgError] = useState(false);

  // Determine the background image
  const backgroundImage = imgError ? backupMap : officialMap;

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-900 bg-cover bg-center"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Invisible img tag solely used to detect if the official map exists/loads */}
      <img 
        src={officialMap} 
        alt="map preloader" 
        style={{ display: 'none' }} 
        onError={() => setImgError(true)} 
      />

      {/* The Header - Matching your 'Desk' views */}
      <header className="absolute top-8 text-center drop-shadow-xl bg-oxblood/80 px-8 py-3 border-y-2 border-parchment">
        <h1 className="text-4xl md:text-5xl font-serif text-parchment tracking-widest uppercase">
          Candela Obscura
        </h1>
      </header>

      {/* Login Container */}
      <div className="bg-mahogany/95 border-2 border-oxblood p-8 rounded-sm shadow-2xl w-full max-w-md backdrop-blur-sm z-10 mt-16">
        
        {/* 'Aged Paper' inner container */}
        <div className="bg-[#e8dec5] p-6 border border-amber-900/30 inset-shadow-sm">
          <h2 className="text-2xl font-serif text-center text-zinc-900 mb-6 border-b-2 border-oxblood pb-2">
            Investigator Access
          </h2>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-800 mb-1" htmlFor="username">
                Identification
              </label>
              <input 
                type="text" 
                id="username"
                className="w-full p-2 bg-transparent border-b-2 border-zinc-500 focus:border-oxblood focus:outline-none transition-colors"
                placeholder="Enter your designation..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-800 mb-1" htmlFor="password">
                Cipher
              </label>
              <input 
                type="password" 
                id="password"
                className="w-full p-2 bg-transparent border-b-2 border-zinc-500 focus:border-oxblood focus:outline-none transition-colors"
                placeholder="Enter secure cipher..."
              />
            </div>

            <div className="pt-6">
              <button 
                type="button" 
                className="w-full bg-oxblood hover:bg-red-900 text-parchment py-3 px-4 font-serif text-lg tracking-wider transition-colors border border-transparent hover:border-parchment/50 shadow-md"
              >
                Enter the Chapter
              </button>
            </div>
            
            <div className="text-center pt-4">
               <button type="button" className="text-zinc-600 hover:text-oxblood text-sm underline underline-offset-2 transition-colors">
                 Register New Investigator
               </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;