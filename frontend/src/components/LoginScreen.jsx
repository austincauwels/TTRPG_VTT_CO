import React, { useEffect, useRef, useState } from 'react';
import useGameStore from '../store/gameStore';
import {
  apiFetch, createGoogleAccount, fetchAuthConfig, linkGoogleAccount, signInWithGoogle,
} from '../utils/api';

// Sign in with Google (docs/refactor/AUTH.md). Without a client ID in the build the
// screen loads nothing from Google and shows only the password form.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const inputClass = "w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors";
const primaryButtonClass = "w-full bg-red-800 hover:bg-red-900 text-white py-3 px-4 font-serif text-lg tracking-wider transition-colors border border-transparent hover:border-parchment/50 shadow-md disabled:opacity-60 disabled:cursor-wait";
const secondaryButtonClass = "w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 font-serif text-sm tracking-widest uppercase transition-colors border border-zinc-600";
const errorClass = "text-sm text-red-200 bg-red-950/60 border border-red-900 px-3 py-2";

// Google Identity Services, loaded once, on first use.
let googleScript = null;
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!googleScript) {
    googleScript = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.onload = () => (window.google?.accounts?.id
        ? resolve(window.google)
        : reject(new Error('Google Identity Services did not start')));
      script.onerror = () => reject(new Error('Google Identity Services did not load'));
      document.head.appendChild(script);
    }).catch((err) => {
      googleScript = null; // let a later visit to the screen try again
      throw err;
    });
  }
  return googleScript;
};

// After a Google sign-in that belongs to no user yet: link an existing account
// (username and password, once) or create a new one (name prefilled from Google).
const GoogleAccountChoice = ({ pending, onSignedIn, onBack }) => {
  const [choice, setChoice] = useState('link');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (request) => {
    setError('');
    setBusy(true);
    try {
      onSignedIn(await request());
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const handleLink = (e) => {
    e.preventDefault();
    run(() => linkGoogleAccount(pending.linkToken, e.target.linkUsername.value, e.target.linkPassword.value));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    run(() => createGoogleAccount(pending.linkToken, e.target.newUsername.value.trim()));
  };

  const choose = (next) => {
    setChoice(next);
    setError('');
  };

  const tabClass = (active) => `w-full py-2 px-3 font-serif text-xs tracking-widest uppercase transition-colors border ${
    active ? 'bg-red-900 border-oxblood text-white' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600 text-zinc-300'}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-200">
        {pending.email
          ? <>No investigator is linked to <span className="font-semibold text-white">{pending.email}</span> yet.</>
          : 'No investigator is linked to this Google account yet.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button type="button" aria-pressed={choice === 'link'} onClick={() => choose('link')} className={tabClass(choice === 'link')}>
          Link my existing account
        </button>
        <button type="button" aria-pressed={choice === 'create'} onClick={() => choose('create')} className={tabClass(choice === 'create')}>
          Create a new account
        </button>
      </div>

      {choice === 'link' ? (
        <form onSubmit={handleLink} className="space-y-4">
          <p className="text-xs text-zinc-400">
            Enter your username and password this one time. After that, Google signs you in.
          </p>
          <div>
            <label className="block text-sm font-semibold text-white mb-1" htmlFor="linkUsername">
              Identification
            </label>
            <input type="text" id="linkUsername" required autoComplete="username" className={inputClass} placeholder="Username" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1" htmlFor="linkPassword">
              Cipher
            </label>
            <input type="password" id="linkPassword" required autoComplete="current-password" className={inputClass} placeholder="Password" />
          </div>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? 'Linking...' : 'Link and Enter'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-xs text-zinc-400">
            Choose the name other players will see. You will sign in with Google.
          </p>
          <div>
            <label className="block text-sm font-semibold text-white mb-1" htmlFor="newUsername">
              Identification
            </label>
            <input
              type="text"
              id="newUsername"
              required
              minLength={2}
              maxLength={32}
              defaultValue={pending.suggestedName}
              className={inputClass}
              placeholder="username"
            />
          </div>
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? 'Enlisting...' : 'Enlist with the Order'}
          </button>
        </form>
      )}

      {error && <p role="alert" className={errorClass}>{error}</p>}

      <button type="button" onClick={onBack} className={secondaryButtonClass}>
        Back
      </button>
    </div>
  );
};

const LoginScreen = () => {
  const officialMap = import.meta.env.VITE_MAP_OFFICIAL;
  const backupMap = import.meta.env.VITE_MAP_PUBLIC;
  const [imgError, setImgError] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const backgroundImage = imgError ? backupMap : officialMap;

  const { setAccessSession } = useGameStore();

  // Which ways of signing in the server allows. Both are offered until it answers.
  const [authConfig, setAuthConfig] = useState({ google: true, password_login: true });
  const [signInError, setSignInError] = useState(''); // shown inline above the forms
  const [googleBusy, setGoogleBusy] = useState(false);
  // { linkToken, suggestedName, email } after a Google sign-in that needs an account
  const [pendingGoogle, setPendingGoogle] = useState(null);
  const googleButtonRef = useRef(null);

  const showGoogle = Boolean(GOOGLE_CLIENT_ID) && authConfig.google !== false;
  const showPassword = authConfig.password_login !== false;

  useEffect(() => {
    let cancelled = false;
    fetchAuthConfig().then((config) => {
      if (!cancelled && config) setAuthConfig(config);
    });
    return () => { cancelled = true; };
  }, []);

  const handleGoogleCredential = async ({ credential }) => {
    setSignInError('');
    setGoogleBusy(true);
    try {
      const data = await signInWithGoogle(credential);
      if (data.needs_account) {
        setPendingGoogle({ linkToken: data.link_token, suggestedName: data.suggested_name || '', email: data.email || '' });
      } else {
        setAccessSession(data);
      }
    } catch (err) {
      setSignInError(err.message);
    } finally {
      setGoogleBusy(false);
    }
  };

  // Google calls back into whatever the latest render's handler is.
  const credentialHandler = useRef(handleGoogleCredential);
  credentialHandler.current = handleGoogleCredential;

  useEffect(() => {
    if (!showGoogle) return undefined;
    let cancelled = false;
    loadGoogleScript()
      .then((google) => {
        const container = googleButtonRef.current;
        if (cancelled || !container) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => credentialHandler.current(response),
        });
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          width: Math.min(400, Math.max(200, container.offsetWidth || 300)),
        });
      })
      .catch(() => {
        if (!cancelled) setSignInError('Sign in with Google could not load. Please check your connection and reload the page.');
      });
    return () => { cancelled = true; };
  }, [showGoogle]);

  // 403 from login or register: the server turned password login off after this page
  // loaded. Hide the form and say so.
  const passwordLoginRefused = async (response) => {
    if (response.status !== 403) return false;
    const body = await response.json().catch(() => ({}));
    setAuthConfig((current) => ({ ...current, password_login: false }));
    setSignInError(typeof body.detail === 'string' ? body.detail : 'Password sign-in is turned off.');
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (await passwordLoginRefused(response)) return;
      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      setAccessSession(data);
    } catch (err) {
      alert("The Order does not recognize your identity.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
      alert("Ciphers do not match. Please re-enter.");
      return;
    }

    try {
      const response = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      if (await passwordLoginRefused(response)) return;
      if (!response.ok) {
        const err = await response.json();
        const detail = err.detail;
        const message = typeof detail === 'string' ? detail
          : Array.isArray(detail) ? detail.map(d => d.msg).join(', ')
          : "Registration failed";
        throw new Error(message);
      }

      const data = await response.json();
      setAccessSession(data);
    } catch (err) {
      alert(err.message === "Registration failed"
        ? "The Order could not enlist you at this time."
        : err.message);
    }
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
          <h2 className="text-4xl font-serif text-center text-white mb-6 border-b-2 border-oxblood pb-2">
            {pendingGoogle ? "One More Step" : isRegistering ? "Enlist as Investigator" : "Investigator Access"}
          </h2>

          {/* Sign in with Google. Kept mounted (hidden) during the account choice so Google's button survives. */}
          {showGoogle && (
            <div className={pendingGoogle ? 'hidden' : 'mb-6'}>
              <div ref={googleButtonRef} className="flex justify-center min-h-[44px]" />
              {googleBusy && <p className="mt-2 text-center text-sm text-zinc-300">Signing in...</p>}
              {showPassword && (
                <div className="flex items-center gap-3 mt-6 text-xs font-serif uppercase tracking-widest text-zinc-400" aria-hidden="true">
                  <span className="flex-1 border-t border-zinc-600" />
                  or
                  <span className="flex-1 border-t border-zinc-600" />
                </div>
              )}
            </div>
          )}

          {signInError && !pendingGoogle && <p role="alert" className={`${errorClass} mb-6`}>{signInError}</p>}

          {pendingGoogle ? (
            <GoogleAccountChoice
              pending={pendingGoogle}
              onSignedIn={setAccessSession}
              onBack={() => setPendingGoogle(null)}
            />
          ) : !showPassword ? (
            !showGoogle && (
              <p className="text-center text-sm text-zinc-300">
                Signing in is not available right now. Please try again later.
              </p>
            )
          ) : isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1" htmlFor="username">
                  Identification
                </label>
                <input
                  type="text"
                  id="username"
                  required
                  className="w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors"
                  placeholder="username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-1" htmlFor="email">
                  Correspondence
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  className="w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors"
                  placeholder="email address"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-1" htmlFor="password">
                  Cipher
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  className="w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors"
                  placeholder="password"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-1" htmlFor="confirmPassword">
                  Confirm Cipher
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  required
                  className="w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors"
                  placeholder="confirm password"
                />
              </div>

              <div className="pt-6 space-y-3">
                <button
                  type="submit"
                  className="w-full bg-red-800 hover:bg-red-900 text-white py-3 px-4 font-serif text-lg tracking-wider transition-colors border border-transparent hover:border-parchment/50 shadow-md"
                >
                  Enlist with the Order
                </button>

                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 font-serif text-sm tracking-widest uppercase transition-colors border border-zinc-600"
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1" htmlFor="username">
                  Identification
                </label>
                <input
                  type="text"
                  id="username"
                  className="w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors"
                  placeholder="Username"
                />
              </div>

              <div>
                <label className="block text-xl font-semibold text-white mb-1" htmlFor="password">
                  Cipher
                </label>
                <input
                  type="password"
                  id="password"
                  className="w-full p-2 bg-transparent border-b-2 border-zinc-500 text-white focus:border-oxblood focus:outline-none transition-colors"
                  placeholder="Password"
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
                  onClick={() => setIsRegistering(true)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 font-serif text-sm tracking-widest uppercase transition-colors border border-zinc-600"
                >
                  Create New Account
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div> // This closes the main background container
  );
};

export default LoginScreen;
