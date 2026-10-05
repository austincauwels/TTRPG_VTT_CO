import React, { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../store/gameStore';

import { SafeIcon } from '../shared/SafeIcon';
import { ArtDecoCorner, BrassCornerFiligree } from '../shared/Decorations';
import { InvestigatorDossier } from './InvestigatorDossier';
import { CircleView, AdvancementModal } from './CircleView';
import { NotebookView } from '../shared/NotebookView';
import { TactileSidebar } from './TactileSidebar';
import { DiceVault } from './DiceVault';
import ScarModal from './ScarModal';
import { AbilityMarkOffer } from './AbilityMarkOffer';
import { CircleCreationPopup } from './CircleCreationPopup';
import { RelationshipIntroPopup } from './RelationshipIntroPopup';
import { ConnectionBanner } from '../shared/ConnectionBanner';
import { MARK_NAME } from './useMarkUndo';
import { useDialog } from '../shared/useDialog';
import { WaxSeal } from '../shared/WaxSeal';
import { ScarIcon } from '../shared/ScarIcon';
import { Watermark, FormLine, EdgeLine, serialFor } from '../shared/PrintMarks';
import { AccountMenu } from '../shared/AccountMenu';
import { MourningCross } from '../shared/InkMarks';
import { PhoneDeskNav } from './DeskDrawer';

export const MainDeskView = () => {
  const { character, circle, circleCreation, accessSession, socket, connect, logout, fetchCircleCreationState, setStage, pendingRelationshipIntro, rejoinInvite, setRejoinInvite, lastPlayedCampaign, pendingScar, showScarModal, reopenScar } = useGameStore(useShallow(s => ({
    character: s.character,
    circle: s.circle,
    circleCreation: s.circleCreation,
    accessSession: s.accessSession,
    socket: s.socket,
    connect: s.connect,
    logout: s.logout,
    fetchCircleCreationState: s.fetchCircleCreationState,
    setStage: s.setStage,
    pendingRelationshipIntro: s.pendingRelationshipIntro,
    rejoinInvite: s.rejoinInvite,
    setRejoinInvite: s.setRejoinInvite,
    lastPlayedCampaign: s.lastPlayedCampaign,
    pendingScar: s.pendingScar,
    showScarModal: s.showScarModal,
    reopenScar: s.reopenScar,
  })));
  // A scar the player chose to decide later, for the investigator on this desk
  const scarWaiting = pendingScar && !showScarModal && !character?.is_dead &&
    (pendingScar.characterId == null || pendingScar.characterId === character?.id);

  const [deathDismissed, setDeathDismissed] = useState(false);

  useEffect(() => { setDeathDismissed(false); }, [character?.id]);

  useEffect(() => {
    if (character?.id && !socket) {
      connect(character.id);
    }
  }, [character?.id]);

  useEffect(() => {
    if (character?.status === 'active' && character?.campaign_id) {
      fetchCircleCreationState(character.campaign_id);
    }
  }, [character?.status, character?.campaign_id]);

  const showCreationPopup =
    character?.status === 'active' &&
    !circle?.is_finalized &&
    circleCreation.isVisible;

  const [activeTab, setActiveTab] = useState('character');
  // Below md one part of the desk shows at a time (owner's round 4 item 14): the sheet's tab,
  // or one of the papers beside it, chosen from the drawer. From md every part shows.
  const [phonePart, setPhonePart] = useState('sheet');
  const current = phonePart === 'sheet' ? activeTab : phonePart;
  const backTo = useRef('character');
  const chooseTab = (tab) => { setActiveTab(tab); setPhonePart('sheet'); };
  const showPart = (id) => {
    if (id === 'back') id = backTo.current;
    else if (id === 'dice' && current !== 'dice') backTo.current = current;
    if (id === 'character' || id === 'circle' || id === 'archives') chooseTab(id);
    else {
      setPhonePart(id);
      if (activeTab === 'archives') setActiveTab('character');
    }
    window.scrollTo({ top: 0 });
  };
  const onPhone = (show) => (show ? '' : 'max-md:hidden');
  // From xl the Circle tab's papers lie loose on the desk instead of on one sheet, over the
  // sheet's column and the felt's (as the Notebook tab takes the whole desk)
  const circleOnDesk = activeTab === 'circle';
  const deathDialogRef = useDialog({ open: !!character?.is_dead && !deathDismissed, onClose: () => setDeathDismissed(true) });
  const campaignName = lastPlayedCampaign?.type === 'player' ? lastPlayedCampaign.campaignName : null;
  const registryNo = `Registry file // No. ${serialFor(character?.id)}-CO`;

  // Below xl the desk is a long page: the title header, the member ID strip, then the
  // columns. From xl (1280) it fits the screen (owner's item 24): the title header steps
  // aside (kept for screen readers), the member ID strip becomes one slim band with the way
  // out at its end, and the three columns run to the bottom of the window, each scrolling
  // inside itself if its papers ever run longer than the screen.
  return (
    // overflow-x-clip: nothing on the desk ever makes the page wider than the screen (a
    // sideways scroll at 1024 wide aborted WebKit on an iPad); clip, not hidden, so the
    // bands held at the top of the screen still hold
    <div className="min-h-screen overflow-x-clip xl:h-[100dvh] xl:min-h-0 xl:flex xl:flex-col xl:overflow-hidden bg-night text-cream font-serif selection:bg-oxblood selection:text-cream antialiased bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-28 lg:pb-12 xl:pb-0 relative">

      {/* Held at the top of the screen from md; below md it hangs under the slim band */}
      <ConnectionBanner className="max-md:hidden sticky top-0 z-[850]" />

      {/* HEADER */}
      <header className="w-full bg-night relative border-b border-ink/40 shadow-xl max-md:sr-only xl:sr-only">
        <ArtDecoCorner position="top-left" />
        <ArtDecoCorner position="top-right" />

        <div className="max-w-[1500px] 2xl:max-w-[1840px] mx-auto px-4 2xl:px-10 pt-4 pb-5 lg:py-6 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-start gap-y-3">
        <div className="hidden lg:block" aria-hidden="true" />

        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-[28px] sm:text-4xl tracking-[0.1em] text-cream uppercase">
            CANDELA OBSCURA
          </h1>
          <h2 className="text-xs font-sans font-bold tracking-widest text-oxblood-lit uppercase mt-1.5">
            Investigator's Desk
          </h2>

          <div className="flex items-center gap-4 mt-3 w-56">
            <div className="h-[1px] flex-1 bg-parchment-deep/25" />
            <div className="text-parchment-deep/60 relative flex items-center justify-center">
               <SafeIcon name="GiCompass" size={18} className="relative z-10" />
            </div>
            <div className="h-[1px] flex-1 bg-parchment-deep/25" />
          </div>
        </div>

        {/* LOGOUT BUTTON: in normal flow, so it never covers the title. From xl the band
            below carries it, and below md the drawer. */}
        <div className="relative z-10 flex gap-2 justify-center lg:justify-end lg:-mt-2 max-md:hidden xl:hidden">
          <button
            onClick={() => setStage('HOME')}
            className="flex-1 sm:flex-none whitespace-nowrap text-xs sm:text-sm font-sans font-bold uppercase tracking-widest text-parchment-deep hover:text-cream transition-colors bg-transparent hover:bg-cream/5 border border-cream/20 hover:border-cream/40 rounded px-4 py-2.5 lg:py-2 md:[@media(pointer:coarse)]:min-h-[44px]"
          >
            Back to chapter hub
          </button>
          <AccountMenu tone="desk" />
        </div>
        </div>
      </header>

      {/* REGISTRY NAVIGATION: the investigator's member ID strip, sealed at its left end.
          From xl it is the desk's only header: a slim band across the top. Below md it is a
          slim band too, held at the top of the screen, with the die and the drawer pull at
          its end (owner's round 4 item 14). */}
      <div className="sticky top-0 z-40 md:relative md:z-30 max-w-[1500px] 2xl:max-w-[1840px] mx-auto md:mt-6 md:px-4 2xl:px-10 xl:max-w-none 2xl:max-w-none xl:w-full xl:mx-0 xl:mt-2.5 xl:px-5 2xl:px-8 xl:shrink-0">
        {/* Her seal, pressed over the strip's left end (it carries her own 12 degree turn
            and cast shadow). Below md it keeps to the band's own 60px, clear of the
            connection message that can hang under it. */}
        <div className="absolute left-2 md:left-4 top-1.5 md:top-1/2 md:-translate-y-1/2 2xl:left-8 xl:left-3 z-40 flex" aria-hidden="true">
          <WaxSeal size={128} className="w-12 h-12 md:w-32 md:h-32 xl:w-16 xl:h-16" />
        </div>

        <div className="w-full bg-parchment border-0 border-b-4 md:border-4 border-double border-ink relative shadow-[0_8px_18px_rgba(0,0,0,0.8)] md:shadow-[0_12px_30px_rgba(0,0,0,0.9)] xl:shadow-[0_8px_18px_rgba(0,0,0,0.85)] flex flex-row justify-between items-center gap-2 md:gap-4 text-ink pl-[4.25rem] md:pl-32 xl:pl-[5.25rem] pr-2 md:pr-6 xl:pr-2 py-1.5 md:py-5 xl:py-1.5 md:rounded-sm overflow-hidden">
          {/* The registry's number, printed large and faint across the strip, misprinted:
              off level, off register. Along the top of the strip it tilts up from its right
              end, so the start of the line climbs off the top edge and never drops into
              the tabs; on phones and tablets, where the controls share the strip's row, it
              is set smaller and higher. */}
          <Watermark misprint className="lg:hidden right-3 top-0 md:top-0.5 text-[22px] md:text-[24px] text-ink/[0.08]" style={{ '--misprint-tilt': '2.5deg' }}>
            {registryNo}
          </Watermark>

          <div className="flex items-center gap-3 relative z-10 min-w-0 flex-1 md:flex-none xl:shrink-0">
            <div className="min-w-0">
              <FormLine className="hidden md:block mb-1 xl:mb-0.5">Candela Obscura Member ID</FormLine>
              <span className="block truncate md:overflow-visible md:whitespace-normal xl:inline font-serif font-bold text-lg md:text-xl xl:text-lg leading-tight text-ink">{character?.name || 'Your investigator'}</span>
              {campaignName && (
                <span className="block truncate md:overflow-visible md:whitespace-normal xl:inline font-serif italic text-sm md:text-base text-sepia leading-snug md:mt-0.5 xl:mt-0 xl:ml-3">
                  <span aria-hidden="true" className="hidden xl:inline mr-3 not-italic text-sepia/60">·</span>{campaignName}
                </span>
              )}
            </div>
          </div>

          <div className="hidden lg:block relative flex-1 self-stretch min-w-0" aria-hidden="true">
            <Watermark misprint className="right-2 top-1/2 -translate-y-1/2 text-5xl xl:text-4xl text-ink/[0.08]">
              {registryNo}
            </Watermark>
          </div>

          {/* uppercase sits on each button: Tailwind's base resets text-transform on buttons */}
          <div className="hidden md:flex gap-2 font-sans text-xs font-black relative z-10 xl:shrink-0">
            {['character', 'circle', 'archives'].map((tabName) => {
              const labels = { character: "Investigator", circle: "Circle", archives: "Notebook" };
              return (
                <button
                  key={tabName}
                  onClick={() => chooseTab(tabName)}
                  aria-current={activeTab === tabName ? 'page' : undefined}
                  className={`pen-host flex-auto md:flex-none px-1.5 md:px-4 py-2 md:py-1.5 min-h-[40px] md:min-h-0 md:[@media(pointer:coarse)]:min-h-[44px] leading-tight uppercase tracking-normal md:tracking-widest rounded transition-all duration-150 ${
                    activeTab === tabName ? 'bg-ink text-parchment shadow-md border border-ink' : 'bg-transparent text-sepia [@media(hover:hover)]:hover:bg-black/5 [@media(hover:hover)]:hover:text-ink'
                  }`}
                >
                  {/* The pen underline draws under a tab that is not open yet */}
                  <span className={activeTab === tabName ? undefined : 'pen-underline'}>{labels[tabName]}</span>
                </button>
              );
            })}
          </div>

          <PhoneDeskNav current={current} onChoose={showPart} onHub={() => setStage('HOME')} />

          {/* The way out, at the band's end behind a printed rule (from xl) */}
          <div className="hidden xl:flex items-center gap-2 self-stretch shrink-0 pl-3 ml-1 border-l border-ink/25 relative z-10">
            <button
              onClick={() => setStage('HOME')}
              className="whitespace-nowrap font-sans text-xs font-black uppercase tracking-widest text-sepia hover:text-ink hover:bg-black/5 border border-ink/25 hover:border-ink/50 rounded px-3 py-1.5 md:[@media(pointer:coarse)]:min-h-[44px] transition-colors"
            >
              Back to chapter hub
            </button>
            <AccountMenu tone="paper" />
          </div>
        </div>

        {/* Phones: the connection message rides under the band, so a page scrolled down
            never has it over the Menu and the die */}
        <ConnectionBanner className="md:hidden relative" />
      </div>

      {/* DYNAMIC VIEW ROUTING */}
      <main className="max-w-[1500px] 2xl:max-w-[1840px] mx-auto p-4 2xl:px-10 mt-2 xl:max-w-none 2xl:max-w-none xl:w-full xl:mx-0 xl:mt-0 xl:px-5 2xl:px-8 xl:pt-4 xl:pb-3 xl:flex-1 xl:min-h-0 xl:flex xl:flex-col">
        {scarWaiting && (
          <div role="status" className="mb-4 xl:mb-3 xl:shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-parchment text-ink border-2 border-oxblood rounded-sm px-4 py-3 xl:py-2 shadow-[0_8px_20px_rgba(0,0,0,0.7)]">
            <p className="font-serif text-base leading-snug min-w-0 flex-1 basis-60 flex items-center gap-2.5">
              <ScarIcon size={26} className="text-ink" />
              <span><strong className="font-bold">A scar is waiting.</strong>{' '}
              {character?.name || 'Your investigator'}'s {MARK_NAME[pendingScar.type] || 'mark'} track is full.</span>
            </p>
            <button
              onClick={reopenScar}
              className="shrink-0 min-h-[40px] px-4 font-sans text-xs font-black uppercase tracking-widest text-cream bg-oxblood border border-ink rounded hover:brightness-125 transition"
            >
              Record the scar
            </button>
          </div>
        )}
        {activeTab === 'archives' ? (
          <div className="xl:flex-1 xl:min-h-0">
            <NotebookView isGM={false} fit />
          </div>
        ) : (
          // From xl the desk fills the width: the circle and the GM's note on the left, the
          // sheet in the middle, the dice, the log and the pass notes on the right. Each
          // column is as tall as the window and keeps its papers in view.
          <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-[minmax(15rem,1fr)_minmax(0,3.1fr)_minmax(19rem,1.3fr)] gap-6 xl:gap-x-6 2xl:gap-x-8 items-start xl:items-stretch xl:flex-1 xl:min-h-0">
            <TactileSidebar phonePart={current} />
            <div className={`lg:col-span-6 ${circleOnDesk ? 'xl:col-span-2' : 'xl:col-span-1'} order-1 lg:order-none min-w-0 xl:min-h-0 ${onPhone(phonePart === 'sheet')}`}>
              {/* The investigator's sheet. From xl its printed edge line has a strip of its
                  own at the foot, under a hairline, so nothing scrolls beneath it. The Circle
                  tab is not one sheet there: its papers lie on the desk side by side. */}
              <div className={`bg-cream text-ink rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] lg:min-h-[850px] xl:min-h-0 xl:h-full border-2 border-ink relative font-serif overflow-hidden ${
                circleOnDesk ? 'xl:bg-transparent xl:border-0 xl:shadow-none xl:rounded-none' : ''}`}>
                <div className={`absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] ${circleOnDesk ? 'xl:hidden' : ''}`} />
                <div className={circleOnDesk ? 'xl:hidden' : undefined}><BrassCornerFiligree /></div>
                <EdgeLine text="Candela Obscura · Chapter registry · Printed in Newfaire" className={`bottom-2 left-10 right-10 ${circleOnDesk ? 'xl:hidden' : ''}`} />
                <div aria-hidden="true" className={`hidden ${circleOnDesk ? '' : 'xl:block'} absolute left-8 right-8 bottom-6 h-px bg-ink/15 pointer-events-none`} />
                <div data-desk="sheet" className={`relative px-4 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8 xl:overflow-y-auto custom-scrollbar ${
                  circleOnDesk ? 'xl:h-full xl:px-2 xl:pt-1.5 xl:pb-1' : 'xl:px-6 xl:pt-4 xl:pb-2 xl:h-[calc(100%-1.75rem)]'}`}>
                  {activeTab === 'character' && <InvestigatorDossier />}
                  {activeTab === 'circle' && <CircleView />}
                </div>
              </div>
            </div>
            <div className={circleOnDesk ? 'contents xl:hidden' : 'contents'}><DiceVault phonePart={current} /></div>
          </div>
        )}
        <ScarModal />
        <AbilityMarkOffer />
        <AdvancementModal />
      </main>
      {showCreationPopup && <CircleCreationPopup />}
      {pendingRelationshipIntro && <RelationshipIntroPopup />}

      {/* REJOIN INVITE BANNER — shown when Lightkeeper has sent an invite */}
      {rejoinInvite && !character?.is_dead && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[800] flex flex-wrap items-center gap-x-4 gap-y-2 bg-night border border-oxblood px-4 py-3 sm:px-6 sm:py-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] max-w-xl w-[calc(100%-2rem)]">
          <div className="flex-1 min-w-[12rem]">
            <p className="text-parchment-deep font-serif text-base leading-snug">
              Your Lightkeeper invites you back to <strong className="text-cream">{rejoinInvite.campaign_name}</strong> with a new investigator.
            </p>
          </div>
          <button
            onClick={() => setStage('CHARACTER_CREATION')}
            className="shrink-0 px-4 py-2 bg-oxblood hover:brightness-125 text-cream font-sans font-black uppercase tracking-widest text-xs border border-ink rounded transition"
          >
            Create investigator
          </button>
          <button
            onClick={() => setRejoinInvite(null)}
            className="shrink-0 min-w-[40px] min-h-[40px] text-oxblood-lit hover:text-parchment-deep font-sans text-lg leading-none transition-colors" aria-label="Dismiss invite"
          >✕</button>
        </div>
      )}

      {/* DEATH MODAL — blocks desk when investigator has perished */}
      {character?.is_dead && !deathDismissed && (
        <div className="fixed inset-0 z-[900] bg-black/90 flex flex-col items-center justify-center text-center px-6">
          <div ref={deathDialogRef} role="dialog" aria-modal="true" aria-labelledby="death-title" className="max-w-lg w-full max-h-[calc(100dvh-32px)] overflow-y-auto bg-night border-2 border-oxblood p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
            <div aria-hidden="true" className="text-oxblood-lit text-6xl mb-4 leading-none"><MourningCross /></div>
            <h2 id="death-title" className="font-display text-3xl sm:text-4xl tracking-[0.08em] text-cream uppercase mb-3">
              {character?.name || 'Your investigator'} has died
            </h2>
            <p className="text-parchment-deep font-serif text-base leading-relaxed mb-8">
              With a fourth scar, {character?.name || 'your investigator'} is gone. Their sheet stays on record.
            </p>
            {rejoinInvite && (
              <p className="text-oxblood-lit font-serif italic text-base mb-5">
                Your Lightkeeper has invited you back to {rejoinInvite.campaign_name}.
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setStage('CHARACTER_CREATION')}
                className="w-full py-3 px-6 bg-oxblood hover:brightness-125 text-cream font-sans font-black uppercase tracking-widest text-sm transition border border-ink rounded"
              >
                Create a new investigator
              </button>
              <button
                onClick={() => setDeathDismissed(true)}
                className="w-full py-2.5 px-6 bg-transparent hover:bg-ink text-oxblood-lit font-sans font-bold uppercase tracking-widest text-xs transition-colors border border-oxblood-lit/40 rounded"
              >
                Stay and look at the sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};