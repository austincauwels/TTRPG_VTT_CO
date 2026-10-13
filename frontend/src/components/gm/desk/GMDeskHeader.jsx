import React, { useState } from 'react';
import { SafeIcon } from '../../shared/SafeIcon';
import { apiFetch } from '../../../utils/api';
import { ConfirmAction } from '../../shared/ConfirmAction';
import { AccountMenu } from '../../shared/AccountMenu';
import { PhoneDeskNav, GM_DESK_PARTS, CountBadge } from '../../pc/DeskDrawer';

// The Lightkeeper's pages, as tabs on the bar from md (on a phone, slips in the drawer)
export const GM_TABS = [
  { id: 'roster', label: 'Roster' },
  { id: 'circle', label: 'Circle' },
  { id: 'archives', label: 'Notebook' },
  { id: 'map', label: 'Map' },
  { id: 'requests', label: 'Requests' },
];

// The top of the Lightkeeper's desk, laid out as the investigator's desk is (issue #66.3,
// decision 2): below xl the title header with Back to chapter hub and Account, then the
// Lightkeeper's Desk bar with the desk's tabs (Roster, Circle, Notebook, Map and the join
// Requests with their count). From xl the header steps aside (kept for screen readers) and
// the bar is the desk's one slim band, with the campaign's name and code and the way out at
// its end. Below md the bar is a slim band held at the top of the screen with the die and
// the drawer (pc/DeskDrawer.jsx), and phoneBelow hangs under it. Retire lies on the account
// card at every size.
export const GMDeskHeader = ({ activeCampaignId, campaignName, campaignCode, setStage, activeTab, onTab, phoneCurrent, onPhonePart, requestCount = 0, phoneBelow = null }) => {
  const [retireBusy, setRetireBusy] = useState(false);
  const [retireError, setRetireError] = useState('');
  const retireHint = `Press again to retire ${campaignName || 'this campaign'} and free its living investigators.`;
  const retireLabel = (armed) => (retireBusy ? 'Retiring…' : armed ? 'Retire' : 'Retire campaign…');

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

  // Retire on the account card, above Sign out
  const retire = (
    <div className="mt-3 pt-3 border-t border-dashed border-sepia/45">
      <ConfirmAction
        className="flex flex-col gap-2"
        disabled={retireBusy || !activeCampaignId}
        onConfirm={handleRetireCampaign}
        cancelLabel="Keep campaign"
        armedHint={retireHint}
        renderButton={(armed, props) => (
          <button
            {...props}
            className={`w-full min-h-[44px] px-4 py-2 rounded font-sans font-black text-xs uppercase tracking-widest transition disabled:opacity-60 disabled:cursor-wait ${
              armed ? 'bg-oxblood text-cream border border-ink hover:brightness-125' : 'bg-transparent text-oxblood border border-oxblood/60 hover:bg-oxblood hover:text-cream'
            }`}
          >
            {retireLabel(armed)}
          </button>
        )}
      />
    </div>
  );

  const counts = { requests: requestCount };
  const hub = 'whitespace-nowrap font-sans font-bold uppercase tracking-widest text-cream border border-moonlight-steel/60 hover:border-moonlight-steel rounded transition-colors md:[@media(pointer:coarse)]:min-h-[44px]';

  return (
    <>
    <header className="w-full bg-gm-night relative border-b border-black/60 shadow-xl max-md:sr-only xl:sr-only">
      <div className="max-w-[1500px] 2xl:max-w-[1840px] mx-auto px-4 2xl:px-10 pt-4 pb-5 lg:py-6 flex flex-col items-center gap-y-3">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-[28px] sm:text-4xl tracking-[0.1em] text-cream uppercase">CANDELA OBSCURA</h1>
          {campaignName && (
            <h2 className="text-xs font-sans font-bold tracking-widest text-moonlight-steel uppercase mt-1.5">{campaignName}</h2>
          )}
          {campaignCode && (
            <p className="font-serif text-base text-parchment-deep mt-1">
              Campaign code <span className="font-mono text-cream">{campaignCode}</span>
            </p>
          )}
        </div>
        {/* In normal flow, so it never covers the title. From xl the bar carries it, and
            below md the drawer. */}
        <div className="relative z-10 flex gap-2 justify-center max-md:hidden xl:hidden">
          <button onClick={() => setStage('HOME')} className={`${hub} text-sm bg-gm-slate/70 hover:bg-gm-slate px-4 py-2.5 lg:py-2`}>
            Back to chapter hub
          </button>
          <AccountMenu tone="gm" extra={retire} />
        </div>
      </div>
    </header>

    {/* The Lightkeeper's Desk bar, held at the top of a phone's screen with what hangs under it */}
    <div className="sticky top-0 z-40 md:relative md:z-30 xl:shrink-0">
      <div className="w-full bg-gm-slate border-b border-moonlight-steel/20 shadow-[0_8px_18px_rgba(0,0,0,0.6)]">
        <div className="w-full max-w-[1500px] 2xl:max-w-[1840px] mx-auto xl:max-w-none 2xl:max-w-none px-3 md:px-4 lg:px-8 xl:px-5 2xl:px-8 py-1.5 md:py-3 xl:py-1.5 flex flex-wrap xl:flex-nowrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-3 text-moonlight-steel min-w-0 flex-1 md:flex-none xl:flex-1">
            <SafeIcon name="GiEyeShield" size={45} className="shrink-0 w-9 h-9 lg:w-[45px] lg:h-[45px] xl:w-9 xl:h-9" />
            {/* Phones: the campaign and its code, as the player's band names the investigator */}
            <span className="md:hidden min-w-0">
              <span className="block truncate font-serif font-bold text-lg leading-tight text-cream">{campaignName || "Lightkeeper's Desk"}</span>
              {campaignCode && (
                <span className="block truncate font-serif text-sm text-parchment-deep leading-snug">
                  Code <span className="font-mono text-cream">{campaignCode}</span>
                </span>
              )}
            </span>
            <span className="max-md:hidden xl:sr-only font-display text-xl lg:text-2xl tracking-[0.08em] uppercase text-cream whitespace-nowrap">
              Lightkeeper's Desk
            </span>
            {(campaignName || campaignCode) && (
              <span aria-hidden="true" className="hidden xl:flex items-baseline gap-3 min-w-0">
                {campaignName && <span className="font-sans text-xs font-bold tracking-widest uppercase text-moonlight-steel truncate">{campaignName}</span>}
                {campaignCode && (
                  <span className="font-serif text-base text-parchment-deep whitespace-nowrap">
                    Code <span className="font-mono text-cream">{campaignCode}</span>
                  </span>
                )}
              </span>
            )}
          </div>

          {/* uppercase sits on each button: Tailwind's base resets text-transform on buttons */}
          <nav aria-label="Desk sections" className="hidden md:flex flex-wrap gap-1.5 xl:gap-1 font-sans text-xs font-black xl:shrink-0">
            {GM_TABS.map(({ id, label }) => {
              const active = activeTab === id;
              const count = counts[id] || 0;
              return (
                <button
                  key={id}
                  onClick={() => onTab(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`pen-host inline-flex items-center px-4 xl:px-3 py-1.5 md:[@media(pointer:coarse)]:min-h-[44px] leading-tight uppercase tracking-widest whitespace-nowrap rounded border transition-all duration-150 ${
                    active ? 'bg-parchment text-ink border-parchment shadow-md' : 'border-transparent text-moonlight-steel [@media(hover:hover)]:hover:bg-gm-night/60 [@media(hover:hover)]:hover:text-cream'
                  }`}
                >
                  {/* The pen underline draws under a tab that is not open yet */}
                  <span className={active ? undefined : 'pen-underline'}>{label}</span>
                  {count > 0 && <CountBadge count={count} className="ml-1.5" />}
                </button>
              );
            })}
          </nav>

          <PhoneDeskNav current={phoneCurrent} onChoose={onPhonePart} onHub={() => setStage('HOME')}
            parts={GM_DESK_PARTS} counts={counts} tone="night" accountExtra={retire} />

          {/* The way out, at the bar's end behind a rule (from xl) */}
          <div className="hidden xl:flex items-center gap-2 self-stretch shrink-0 pl-3 ml-1 border-l border-moonlight-steel/30">
            <button onClick={() => setStage('HOME')} className={`${hub} text-sm bg-gm-night/80 hover:bg-gm-night px-4 py-2`}>
              Back to chapter hub
            </button>
            <AccountMenu tone="gm" extra={retire} />
          </div>
        </div>
      </div>
      {phoneBelow}
    </div>
    {retireError && <p role="alert" className="px-4 py-2 font-serif text-base text-oxblood-lit text-center bg-gm-night border-b border-oxblood-lit/40">{retireError}</p>}
    </>
  );
};
