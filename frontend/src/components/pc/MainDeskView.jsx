import React, { useState, useEffect } from 'react';
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
  const deathDialogRef = useDialog({ open: !!character?.is_dead && !deathDismissed, onClose: () => setDeathDismissed(true) });
  const campaignName = lastPlayedCampaign?.type === 'player' ? lastPlayedCampaign.campaignName : null;

  return (
    <div className="min-h-screen bg-night text-cream font-serif selection:bg-oxblood selection:text-cream antialiased bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-28 lg:pb-12 relative">

      <ConnectionBanner />

      {/* HEADER */}
      <header className="w-full bg-night relative px-4 pt-4 pb-5 lg:px-6 lg:py-6 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-start gap-y-3 border-b border-ink/40 shadow-xl">
        <ArtDecoCorner position="top-left" />
        <ArtDecoCorner position="top-right" />

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

        {/* LOGOUT BUTTON: in normal flow, so it never covers the title */}
        <div className="relative z-10 flex justify-center lg:justify-end lg:-mt-2">
          <button
            onClick={() => setStage('HOME')}
            className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm font-sans font-bold uppercase tracking-widest text-parchment-deep hover:text-cream transition-colors bg-transparent hover:bg-cream/5 border border-cream/20 hover:border-cream/40 rounded px-4 py-2.5 lg:py-2"
          >
            Back to chapter hub
          </button>
        </div>
      </header>

      {/* REGISTRY NAVIGATION */}
      <div className="max-w-[1500px] mx-auto mt-6 px-4 relative z-30">
        <div className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 w-16 h-16 sm:w-28 sm:h-28 bg-oxblood rounded-[48%] shadow-[4px_10px_20px_rgba(0,0,0,0.85),inset_-4px_-6px_10px_rgba(0,0,0,0.35),inset_2px_2px_4px_rgb(var(--c-cream)/0.15)] flex items-center justify-center border border-ink transform rotate-12 z-40 select-none group" aria-hidden="true">
          <div className="w-11 h-11 sm:w-20 sm:h-20 rounded-full border border-dashed border-ink/20 flex items-center justify-center p-0.5 shadow-inner">
            <div className="text-oxblood drop-shadow-[0_1.5px_1px_rgb(var(--c-cream)/0.1)] shadow-inner transform -translate-y-[1px] scale-[0.55] sm:scale-100">
              <SafeIcon name="GiCandleHolder" size={62} />
            </div>
          </div>
        </div>

        <div className="w-full bg-parchment border-4 border-double border-ink p-5 relative shadow-[0_12px_30px_rgba(0,0,0,0.9)] flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 md:gap-4 text-ink pl-16 sm:pl-32 pr-3 sm:pr-6 py-3 sm:py-5 rounded-sm overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div>
              <span className="block font-serif font-bold text-xl leading-tight text-ink">{character?.name || 'Your investigator'}</span>
              {campaignName && (
                <span className="block font-serif italic text-base text-sepia leading-snug mt-0.5">{campaignName}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 md:flex gap-1.5 md:gap-2 font-sans text-xs font-black uppercase tracking-wider relative z-10">
            {['character', 'circle', 'archives'].map((tabName) => {
              const labels = { character: "Investigator", circle: "Circle", archives: "Notebook" };
              return (
                <button
                  key={tabName}
                  onClick={() => setActiveTab(tabName)}
                  aria-current={activeTab === tabName ? 'page' : undefined}
                  className={`px-1 md:px-4 py-2 md:py-1.5 min-h-[40px] md:min-h-0 leading-tight tracking-normal md:tracking-wider rounded transition-all duration-150 ${
                    activeTab === tabName ? 'bg-ink text-parchment shadow-md border border-ink' : 'bg-transparent text-sepia hover:bg-black/5 hover:text-ink'
                  }`}
                >
                  {labels[tabName]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DYNAMIC VIEW ROUTING */}
      <main className="max-w-[1500px] mx-auto p-4 mt-2">
        {scarWaiting && (
          <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-parchment text-ink border-2 border-oxblood rounded-sm px-4 py-3 shadow-[0_8px_20px_rgba(0,0,0,0.7)]">
            <p className="font-serif text-base leading-snug min-w-0 flex-1 basis-60">
              <strong className="font-bold">A scar is waiting.</strong>{' '}
              {character?.name || 'Your investigator'}'s {MARK_NAME[pendingScar.type] || 'mark'} track filled. Record the scar to finish taking it.
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
          <NotebookView isGM={false} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <TactileSidebar />
            <div className="lg:col-span-6 order-1 lg:order-none min-w-0">
              <div className="bg-cream text-ink px-4 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8 rounded-sm shadow-[0_20px_45px_rgba(0,0,0,0.85)] lg:min-h-[850px] border-2 border-ink relative font-serif overflow-hidden">
                <div className="absolute inset-0 opacity-25 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
                <BrassCornerFiligree />
                {activeTab === 'character' && <InvestigatorDossier />}
                {activeTab === 'circle' && <CircleView />}
              </div>
            </div>
            <DiceVault />
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
              Your GM invites you back to <strong className="text-cream">{rejoinInvite.campaign_name}</strong> with a new investigator.
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
            <div aria-hidden="true" className="text-oxblood-lit text-6xl mb-4 font-serif">✝</div>
            <h2 id="death-title" className="font-display text-3xl sm:text-4xl tracking-[0.08em] text-cream uppercase mb-3">
              {character?.name || 'Your investigator'} has died
            </h2>
            <p className="text-parchment-deep font-serif text-base leading-relaxed mb-8">
              With a fourth scar, {character?.name || 'your investigator'} is gone. Their sheet stays on record.
              Create a new investigator to keep playing.
            </p>
            {rejoinInvite && (
              <p className="text-oxblood-lit font-serif italic text-base mb-5">
                Your GM has invited you back to {rejoinInvite.campaign_name}.
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