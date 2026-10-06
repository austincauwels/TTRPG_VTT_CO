import React, { Component, createRef } from 'react';
import useGameStore from '../../store/gameStore';

// Catches an error thrown while a screen renders. Without it React unmounts everything
// and leaves the bare night stage, and because the screen is saved in this browser
// (the store's persisted stage), a reload can land on the same error again. The slip
// says so and offers three ways on: reload, back to the chapter hub (when the hub is not
// the screen that broke), and signing out, which clears what this browser kept and so
// gets past a saved screen that keeps breaking.
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stage: null, signedIn: false };
    this.headingRef = createRef();
  }

  static getDerivedStateFromError(error) {
    const { stage, accessSession } = useGameStore.getState();
    return { error, stage, signedIn: !!accessSession };
  }

  componentDidCatch(error, info) {
    console.error('A screen failed to draw:', error, info?.componentStack);
  }

  // The slip takes focus so a screen reader reads it: on mount when the very first screen
  // broke, on update when a later one did
  componentDidMount() {
    if (this.state.error) this.headingRef.current?.focus();
  }

  componentDidUpdate(_, prevState) {
    if (this.state.error && !prevState.error) this.headingRef.current?.focus();
  }

  goTo = (action) => {
    action();
    this.setState({ error: null });
  };

  render() {
    const { error, stage, signedIn } = this.state;
    if (!error) return this.props.children;

    const store = useGameStore.getState();
    const button = 'min-h-[44px] px-5 font-sans text-xs font-black uppercase tracking-widest rounded transition';

    return (
      <main className="min-h-screen w-full flex items-center justify-center bg-night px-4 py-10">
        <div
          role="alert"
          className="w-full max-w-md bg-parchment text-ink border border-sepia/30 rounded-sm shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3)] px-6 py-8 sm:px-8"
        >
          <h1
            ref={this.headingRef}
            tabIndex={-1}
            className="font-display text-2xl tracking-[0.06em] text-oxblood text-center"
          >
            This page stopped working
          </h1>
          <p className="mt-4 font-serif text-lg leading-relaxed text-center">
            Everything already sent to the table is saved on the server. Reload the page to try again.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={`${button} bg-oxblood text-cream border border-ink hover:brightness-125`}
            >
              Reload the page
            </button>
            {signedIn && stage !== 'HOME' && (
              <button
                type="button"
                onClick={() => this.goTo(() => store.setStage('HOME'))}
                className={`${button} bg-transparent text-sepia border border-sepia/45 hover:text-ink hover:border-ink/60`}
              >
                Back to chapter hub
              </button>
            )}
            {signedIn && (
              <button
                type="button"
                onClick={() => this.goTo(() => store.logout())}
                className={`${button} bg-transparent text-sepia border border-sepia/45 hover:text-ink hover:border-ink/60`}
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }
}
