import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { apiFetch } from '../../../utils/api';
import { ConfirmAction } from '../../shared/ConfirmAction';

// The title, then the Lightkeeper's Desk bar, which carries Retire and Sign Out in its
// own flow: right-aligned on desktop, full-width rows of their own on phones.
export const GMDeskHeader = ({ activeCampaignId, campaignName, campaignCode, setStage }) => {
  const [retireBusy, setRetireBusy] = useState(false);
  const [retireError, setRetireError] = useState('');

  const handleRetireCampaign = async () => {
    if (!activeCampaignId || retireBusy) return;
    setRetireBusy(true);
    setRetireError('');
    try {
      const res = await apiFetch(`/campaign/${activeCampaignId}/retire`, { method: 'POST' });
      if (!res.ok) {
        console.error("Failed to retire campaign");
        setRetireError('The campaign was not retired. Try again in a moment.');
      }
    } catch {
      setRetireError('Could not reach the server, so the campaign was not retired. Check your connection and try again.');
    }
    setRetireBusy(false);
  };

  return (
    <>
    {/* From xl (a desk that fits the screen) the title header steps aside, kept for screen
        readers, and the control bar below is the desk's one slim band, with the campaign's
        name and code printed in it */}
    <header className="w-full bg-gm-night px-4 py-5 lg:py-6 flex flex-col items-center justify-center text-center border-b border-black/60 shadow-xl xl:sr-only">
      <h1 className="font-display text-[28px] sm:text-4xl tracking-[0.1em] text-cream uppercase">CANDELA OBSCURA</h1>
      {campaignName && (
        <h2 className="text-xs font-sans font-bold tracking-widest text-moonlight-steel uppercase mt-1.5">{campaignName}</h2>
      )}
      {campaignCode && (
        <p className="font-serif text-base text-parchment-deep mt-1">
          Campaign code <span className="font-mono text-cream">{campaignCode}</span>
        </p>
      )}
    </header>

    {/* GM CONTROL BAR */}
    <div className="w-full bg-gm-slate border-b border-moonlight-steel/20 py-3 lg:py-4 xl:py-2 shadow-md z-40 flex justify-center xl:shrink-0">
      <div className="w-full max-w-[1500px] 2xl:max-w-[1840px] xl:max-w-none 2xl:max-w-none px-4 lg:px-8 lg:pl-[40px] xl:px-5 2xl:px-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-8">
        <div className="flex items-center gap-3 text-moonlight-steel min-w-0">
          <SafeIcon name="GiEyeShield" size={45} className="shrink-0 w-8 h-8 lg:w-[45px] lg:h-[45px] xl:w-9 xl:h-9" />
          <span className="font-display text-xl lg:text-2xl xl:text-xl tracking-[0.08em] uppercase text-cream whitespace-nowrap">
            Lightkeeper's Desk
          </span>
          {(campaignName || campaignCode) && (
            <span aria-hidden="true" className="hidden xl:flex items-baseline gap-3 min-w-0 pl-4 ml-1 border-l border-moonlight-steel/30">
              {campaignName && <span className="font-sans text-xs font-bold tracking-widest uppercase text-moonlight-steel truncate">{campaignName}</span>}
              {campaignCode && (
                <span className="font-serif text-base text-parchment-deep whitespace-nowrap">
                  Campaign code <span className="font-mono text-cream">{campaignCode}</span>
                </span>
              )}
            </span>
          )}
        </div>

        {/* HEADER CONTROLS */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ConfirmAction
            className="contents"
            hintClassName="order-first basis-full lg:max-w-[26rem] lg:justify-end lg:text-right"
            tone="night"
            disabled={retireBusy || !activeCampaignId}
            onConfirm={handleRetireCampaign}
            cancelLabel="Keep campaign"
            armedHint={`Press again to retire ${campaignName || 'this campaign'}. Every investigator leaves it and no one can join. Nothing is deleted.`}
            renderButton={(armed, props) => (
              <button
                {...props}
                className={`w-full lg:w-auto min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-sans font-bold uppercase tracking-widest rounded px-4 py-2 transition disabled:opacity-50 disabled:cursor-wait ${
                  armed
                    ? 'text-cream bg-oxblood hover:brightness-125 border border-oxblood-lit/50'
                    : 'text-moonlight-steel hover:text-oxblood-lit bg-gm-night/80 border border-moonlight-steel/30 hover:border-oxblood-lit/60'
                }`}
              >
                {retireBusy ? 'Retiring…' : armed ? 'Yes, retire campaign' : 'Retire campaign…'}
              </button>
            )}
          />
          <button
            onClick={() => setStage('HOME')}
            className="w-full lg:w-auto min-h-[44px] lg:min-h-0 text-xs lg:text-sm font-sans font-bold uppercase tracking-widest text-cream hover:bg-gm-night transition-colors bg-gm-night/80 border border-moonlight-steel/60 hover:border-moonlight-steel rounded px-4 py-2"
          >
            Back to chapter hub
          </button>
        </div>
        {retireError && <p role="alert" className="font-serif text-base text-oxblood-lit lg:text-right">{retireError}</p>}
      </div>
    </div>
    </>
  );
};
