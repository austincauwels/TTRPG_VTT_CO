// src/components/LoginScreen.jsx
import React, { useState } from 'react';
import useGameStore from '../store/gameStore';

const LoginScreen = () => {
  const officialMap = import.meta.env.VITE_MAP_OFFICIAL;
  const backupMap = import.meta.env.VITE_MAP_PUBLIC;
  const [imgError, setImgError] = useState(false);
  const backgroundImage = imgError ? backupMap : officialMap;
  
  const { setAccessSession } = useGameStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    // Placeholder: This is where you will add your fetch() logic
    console.log("Login attempted");
    setAccessSession({ role: 'PLAYER', name: 'Investigator' }); 
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-900 bg-cover bg-center relative"
      style={{ backgroundImage: `url('${backgroundImage}')` }}
    >
      {/* VIGNETTE LAYER */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.85)_120%)] pointer-events-none" />

      <img 
        src={officialMap} 
        alt="map preloader" 
        style={{ display: 'none' }} 
        onError={() => setImgError(true)} 
      />

      {/* TITLE BANNER */}
      <div className="z-10 mb-6 px-10 py-3 bg-black/90 border-t-2 border-b-2 border-oxblood shadow-2xl">
        <h1 className="text-3xl md:text-4xl font-serif text-white tracking-[0.25em] uppercase font-bold drop-shadow-lg">
          Candela Obscura
        </h1>
      </div>

      {/* Login Container */}
      <div className="bg-mahogany/95 border-2 border-oxblood p-8 rounded-sm shadow-2xl w-full max-w-md backdrop-blur-sm z-10">
        <div className="bg-[#1a1311] p-6 border border-amber-900/30 inset-shadow-sm">
          <h2 className="text-2xl font-serif text-center text-white mb-6 border-b-2 border-oxblood pb-2">
            Investigator Access
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1" htmlFor="username">
                Identification
              </label>
              <input 
                type="text" 
                id="username"
                className="w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors"
                placeholder="Enter your designation..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-1" htmlFor="password">
                Cipher
              </label>
              <input 
                type="password" 
                id="password"
                className="w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors"
                placeholder="Enter secure cipher..."
              />
            </div>

            <div className="pt-6 space-y-3">
              <button 
                type="submit" 
                className="w-full bg-red-800 hover:bg-red-900 text-white py-3 px-4 font-serif text-lg tracking-wider transition-colors border border-transparent hover:border-parchment/50 shadow-md"
              >
                Enter the Chapter
              </button>
              
              <button 
                type="button" 
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 font-serif text-sm tracking-widest uppercase transition-colors border border-zinc-600"
              >
                Create New Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div> // This closes the main background container
  );
};

export default LoginScreen;