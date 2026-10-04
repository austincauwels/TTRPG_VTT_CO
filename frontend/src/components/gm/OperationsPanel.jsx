import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/gameStore';

import { GMSidebar } from './GMSidebar';
import { SceneManager } from './SceneManager';
import { CirclePage } from './CirclePage';
import { GMCharacterSheet } from './GMCharacterSheet';
import { DiceVault } from '../pc/DiceVault';
import { NotebookView } from '../shared/NotebookView';
import { GMDeskHeader } from './desk/GMDeskHeader';
import { CorrespondenceStack } from './desk/CorrespondenceStack';
import { FinalizeRosterSlip, FinalizedSlip } from './desk/FinalizeRosterSlip';
import { CircleFormationStatus } from './desk/CircleFormationStatus';
import { ActiveCircleMembers } from './desk/ActiveCircleMembers';
import { TensionSection } from './desk/TensionSection';
import { FairelandsMap } from './desk/FairelandsMap';
import { ConnectionBanner } from '../shared/ConnectionBanner';

const wideTab = (tab) => tab === 'archives' || tab === 'map';

export const OperationsPanel = () => {
  const [activeTab, setActiveTab] = useState('roster');
  const [pendingIndex, setPendingIndex] = useState(0);
  const [selectedInvestigator, setSelectedInvestigator] = useState(null);
  const [isFinalizingRoster, setIsFinalizingRoster] = useState(false);
  const [showCircleStatus, setShowCircleStatus] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');
  // The circle was finalized at this desk just now: its seal is pressed in on the sealed slip
  const [sealedNow, setSealedNow] = useState(false);
  const { logout, setStage, accessSession, lastPlayedCampaign, campaignRoster, fetchRoster, approveInvestigator, rejectInvestigator, connect, socket,
          activityLog, circle, circleCreation, finalizeRoster, fetchCircleCreationState } = useGameStore();

  const rosterFinalized = campaignRoster?.roster_finalized === true;

  const activeCampaignId = lastPlayedCampaign?.campaignId || accessSession?.campaignId;
  const activeCampaignCode = lastPlayedCampaign?.campaignCode || accessSession?.campaignCode;
  const activeCampaignName = lastPlayedCampaign?.type === 'gm' ? lastPlayedCampaign.campaignName : null;

  // Establish WebSocket for GM on mount using the real campaign code so broadcasts land
  useEffect(() => {
    if (!socket) connect(activeCampaignCode || 'gm');
  }, []);

  // Fetch the campaign roster when the panel mounts or active campaign changes
  useEffect(() => {
    if (activeCampaignId) {
      fetchRoster(activeCampaignId);
      fetchCircleCreationState(activeCampaignId);
    }
  }, [activeCampaignId]);


  // Keep pendingIndex in bounds when the pending list shrinks
  useEffect(() => {
    const count = campaignRoster.pending_investigators?.length || 0;
    if (count === 0) { setPendingIndex(0); return; }
    if (pendingIndex >= count) setPendingIndex(count - 1);
  }, [campaignRoster.pending_investigators?.length]);

  // The store actions resolve to false when the server refused or could not be reached
  const REQUEST_FAILED = 'That did not go through. Check your connection, then try again.';

  // One request at a time, so a double tap cannot approve or reject twice.
  const handleStamp = async (characterId) => {
    if (requestBusy) return;
    setRequestBusy(true);
    setRequestError('');
    const p = approveInvestigator(characterId, activeCampaignId);
    setPendingIndex(0);
    const ok = await p;
    setRequestBusy(false);
    if (ok === false) setRequestError(`The investigator was not approved. ${REQUEST_FAILED}`);
  };

  const handleReject = async (characterId) => {
    if (requestBusy) return;
    setRequestBusy(true);
    setRequestError('');
    const p = rejectInvestigator(characterId, activeCampaignId);
    setPendingIndex(0);
    const ok = await p;
    setRequestBusy(false);
    if (ok === false) setRequestError(`The request was not rejected. ${REQUEST_FAILED}`);
  };

  const handleFinalizeRoster = async () => {
    if (isFinalizingRoster) return;
    setIsFinalizingRoster(true);
    setFinalizeError('');
    const ok = await finalizeRoster(activeCampaignId, circle?.id || 1);
    setIsFinalizingRoster(false);
    if (ok) setSealedNow(true);
    else setFinalizeError(`The circle was not finalized. ${REQUEST_FAILED}`);
  };

  const handleSelectInvestigator = (inv) => setSelectedInvestigator(inv);

  // Below lg the tab strip stays at the top while the page scrolls, so a new tab or an
  // opened character sheet would start off screen. Bring the top of the desk back into view.
  const mainRef = useRef(null);
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) { firstView.current = false; return; }
    if (!mainRef.current || !window.matchMedia('(max-width: 1023.98px)').matches) return;
    const top = mainRef.current.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top });
  }, [activeTab, selectedInvestigator?.id]);

  return (
    <div className="min-h-screen xl:h-[100dvh] xl:min-h-0 xl:flex xl:flex-col xl:overflow-hidden bg-gm-night text-cream font-serif bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12 xl:pb-0 relative">

      <ConnectionBanner />
      <GMDeskHeader activeCampaignId={activeCampaignId} campaignName={activeCampaignName} campaignCode={activeCampaignCode} setStage={setStage} />

      {/* Below lg the three columns dissolve (display: contents) into one column, ordered
          by how often the GM reaches for each part during play: the tab strip, dice and
          log, tension, the dispatch, the circle's investigators, then join requests and
          Finalize. At lg the three-column desk scrolls as a page. From xl it fits the
          screen (owner's item 24): the desk fills the width, every column is as tall as the
          window, and a column whose papers run longer scrolls inside itself. */}
      <main ref={mainRef} className="max-w-[1500px] 2xl:max-w-[1840px] mx-auto p-4 mt-2 lg:mt-6 xl:max-w-none 2xl:max-w-none xl:w-full xl:mx-0 xl:mt-0 xl:px-5 2xl:px-8 xl:pt-4 xl:pb-3 xl:flex-1 xl:min-h-0">
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-x-6 2xl:gap-x-8 items-start xl:items-stretch xl:h-full ${
          wideTab(activeTab)
            ? 'xl:grid-cols-[minmax(14rem,0.9fr)_minmax(0,4.4fr)]'
            : 'xl:grid-cols-[minmax(17rem,1.3fr)_minmax(0,2.9fr)_minmax(19rem,1.3fr)]'}`}>

          {/* LEFT PANEL */}
          <div className={`max-lg:contents ${activeTab === 'map' ? 'lg:col-span-2' : 'lg:col-span-3'} xl:col-span-1 flex flex-col gap-6 xl:gap-4 xl:min-h-0 xl:overflow-y-auto xl:overflow-x-hidden xl:-mx-3 xl:px-3 xl:pb-3 custom-scrollbar`}>
            <GMSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === 'roster' && (
              <div className="order-3 lg:order-none">
                <SceneManager />
              </div>
            )}
          </div>

          {/* CENTER PANEL */}
          <div data-desk="gm-center" className={`max-lg:contents ${activeTab === 'map' ? 'lg:col-span-10' : activeTab === 'archives' ? 'lg:col-span-9' : 'lg:col-span-6'} xl:col-span-1 xl:min-h-0 ${
            wideTab(activeTab) ? '' : 'xl:overflow-y-auto custom-scrollbar'}`}>
            {activeTab === 'roster' && selectedInvestigator && (
              <AnimatePresence mode="wait">
                <GMCharacterSheet
                  key={selectedInvestigator.id}
                  character={selectedInvestigator}
                  onClose={() => setSelectedInvestigator(null)}
                />
              </AnimatePresence>
            )}

            {activeTab === 'roster' && !selectedInvestigator && (
              // From xl the roster lies in two parts: the investigators' cards across the
              // top, then the requests or the sealed slip with the pocket watch beside them
              <div className="max-lg:contents bg-gm-night p-8 xl:p-5 rounded-sm shadow-2xl border border-gm-slate min-h-[850px] xl:min-h-0 flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_auto] xl:content-start xl:gap-x-8 xl:gap-y-5">

                {!rosterFinalized && (
                  <div className="order-5 lg:order-none xl:row-start-2 xl:col-start-1 min-w-0">
                    <CorrespondenceStack
                      campaignRoster={campaignRoster}
                      pendingIndex={pendingIndex}
                      setPendingIndex={setPendingIndex}
                      handleStamp={handleStamp}
                      handleReject={handleReject}
                      campaignCode={activeCampaignCode}
                      error={requestError}
                      busy={requestBusy}
                    />

                    {/* Finalize Roster slip */}
                    <FinalizeRosterSlip
                      handleFinalizeRoster={handleFinalizeRoster}
                      isFinalizingRoster={isFinalizingRoster}
                      campaignRoster={campaignRoster}
                      error={finalizeError}
                    />

                    {/* Circle Formation Status summary */}
                    <CircleFormationStatus
                      showCircleStatus={showCircleStatus}
                      setShowCircleStatus={setShowCircleStatus}
                      circleCreation={circleCreation}
                    />
                  </div>
                )}

                {/* ACTIVE CIRCLE MEMBERS */}
                <ActiveCircleMembers className="order-4 lg:order-none xl:row-start-1 xl:col-span-2" campaignRoster={campaignRoster} onSelect={handleSelectInvestigator} />

                {/* Once finalized, the sealed slip below the investigators */}
                {rosterFinalized && <FinalizedSlip className="order-5 lg:order-none xl:row-start-2 xl:col-start-1 xl:self-start" pressed={sealedNow} />}

                {/* TENSION CLOCK: pinned to the bottom on desktop, right after the dice on phones */}
                <TensionSection className="order-2 lg:order-none xl:row-start-2 xl:col-start-2 xl:mt-0 xl:self-start" />


              </div>
            )}
            {activeTab === 'circle' && <CirclePage />}
            {activeTab === 'archives' && (
              <div className="max-lg:contents bg-gm-night p-8 xl:p-3 rounded-sm shadow-2xl border border-gm-slate min-h-[850px] xl:min-h-0 xl:h-full">
                <NotebookView isGM={true} fit />
              </div>
            )}
            {activeTab === 'map' && (
              <FairelandsMap />
            )}
          </div>

          {!wideTab(activeTab) && (
            <div className="order-1 lg:order-none lg:col-span-3 xl:col-span-1 xl:min-h-0">
              {/* The GM's dice in their real colors: felt, wood, gold gilded dice */}
              <div className="bg-gm-night border border-gm-slate rounded-sm shadow-2xl overflow-hidden px-3 pb-3 xl:pt-3 xl:h-full xl:flex xl:flex-col">
                <div className="xl:flex-1 xl:min-h-0">
                  <DiceVault showGmControls logEntries={activityLog} playerList={campaignRoster.active_investigators} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
