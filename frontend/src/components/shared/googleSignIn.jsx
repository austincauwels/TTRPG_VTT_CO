import React, { useEffect, useRef, useState } from 'react';

// Sign in with Google (docs/refactor/AUTH.md). Without a client ID in the build nothing
// loads from Google and no Google button is drawn.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

// Google Identity Services, loaded once, on first use.
let googleScript = null;
export const loadGoogleScript = () => {
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
      googleScript = null; // let a later visit try again
      throw err;
    });
  }
  return googleScript;
};

// Google is set up once per page, with one callback. It hands the credential to the
// newest button still on the page (the login slip's, the request slip's, or the account
// card's); the screens that show two at once give both the same handler.
let initialized = false;
const handlers = [];
const setUp = (google) => {
  if (initialized) return;
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => handlers[handlers.length - 1]?.(response),
  });
  initialized = true;
};

export const GOOGLE_LOAD_FAILED = 'Sign in with Google could not load. Please check your connection and reload the page.';

// Google's own standard button, drawn into a box of ours. onCredential receives
// { credential } after the person picks an account; onLoadError runs if Google's script
// cannot load. text is Google's wording: 'signin_with' or 'continue_with'.
export const GoogleButton = ({ onCredential, onLoadError, text = 'signin_with', maxWidth = 400, className = '' }) => {
  const boxRef = useRef(null);
  const handlerRef = useRef(onCredential);
  handlerRef.current = onCredential;
  const errorRef = useRef(onLoadError);
  errorRef.current = onLoadError;
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    let cancelled = false;
    const mine = (response) => handlerRef.current?.(response);
    handlers.push(mine);
    loadGoogleScript()
      .then((google) => {
        const box = boxRef.current;
        if (cancelled || !box) return;
        setUp(google);
        google.accounts.id.renderButton(box, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text,
          shape: 'rectangular',
          width: Math.min(maxWidth, Math.max(200, box.offsetWidth || 300)),
        });
        setDrawn(true);
      })
      .catch(() => { if (!cancelled) errorRef.current?.(GOOGLE_LOAD_FAILED); });
    return () => {
      cancelled = true;
      const at = handlers.indexOf(mine);
      if (at !== -1) handlers.splice(at, 1);
    };
  }, [text, maxWidth]);

  if (!GOOGLE_CLIENT_ID) return null;
  return <div ref={boxRef} data-google-button={drawn ? 'drawn' : 'waiting'} className={`flex justify-center min-h-[44px] ${className}`} />;
};
