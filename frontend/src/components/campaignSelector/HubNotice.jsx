import React, { useEffect } from 'react';

const NOTICE_SECONDS = 12;

// A line the hub shows once, at the foot of the screen, such as "The Lightkeeper deleted
// campaign Beta." after a desk was sent back here. It goes by itself after a few seconds.
export const HubNotice = ({ notice, onDismiss }) => {
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(onDismiss, NOTICE_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 bg-night border border-oxblood pl-4 pr-1 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-w-xl w-[calc(100%-2rem)]">
      <p className="flex-1 min-w-0 text-parchment-deep font-serif text-base leading-snug">{notice}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 min-w-[44px] min-h-[44px] text-oxblood-lit hover:text-parchment-deep font-sans text-lg leading-none transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};
