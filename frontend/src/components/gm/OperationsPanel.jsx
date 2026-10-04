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
import { FinalizeRosterSlip } from './desk/FinalizeRosterSlip';
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
    if (!ok) setFinalizeError(`The circle was not finalized. ${REQUEST_FAILED}`);
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
    <div className="min-h-screen bg-gm-night text-cream font-serif bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12 relative">
      
      <ConnectionBanner />
      <GMDeskHeader activeCampaignId={activeCampaignId} campaignName={activeCampaignName} campaignCode={activeCampaignCode} setStage={setStage} />

      {/* Below lg the three columns dissolve (display: contents) into one column, ordered
          by how often the GM reaches for each part during play: the tab strip, dice and
          log, tension, the dispatch, the circle's investigators, then join requests and
          Finalize. From lg up the three-column desk is unchanged. */}
      <main ref={mainRef} className="max-w-[1500px] mx-auto p-4 mt-2 lg:mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT PANEL */}
          <div className={`max-lg:contents ${activeTab === 'map' ? 'lg:col-span-2' : activeTab === 'archives' ? 'lg:col-span-3' : 'lg:col-span-3'} flex flex-col gap-6`}>
            <GMSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === 'roster' && (
              <div className="order-3 lg:order-none">
                <SceneManager />
              </div>
            )}
          </div>

          {/* CENTER PANEL */}
          <div className={`max-lg:contents ${activeTab === 'map' ? 'lg:col-span-10' : activeTab === 'archives' ? 'lg:col-span-9' : 'lg:col-span-6'}`}>
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
              <div className="max-lg:contents bg-gm-night p-8 rounded-sm shadow-2xl border border-gm-slate min-h-[850px] flex flex-col gap-8">

                {!rosterFinalized && (
                  <div className="order-5 lg:order-none">
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
                <ActiveCircleMembers className="order-4 lg:order-none" campaignRoster={campaignRoster} onSelect={handleSelectInvestigator} />

                {/* TENSION CLOCK: pinned to the bottom on desktop, right after the dice on phones */}
                <TensionSection className="order-2 lg:order-none" />


              </div>
            )}
            {activeTab === 'circle' && <CirclePage />}
            {activeTab === 'archives' && (
              <div className="max-lg:contents bg-gm-night p-8 rounded-sm shadow-2xl border border-gm-slate min-h-[850px]">
                <NotebookView isGM={true} />
              </div>
            )}
            {activeTab === 'map' && (
              <FairelandsMap />
            )}
          </div>

          {!wideTab(activeTab) && (
            <div className="order-1 lg:order-none lg:col-span-3">
              {/* The GM's dice in their real colors: felt, wood, gold gilded dice */}
              <div className="bg-gm-night border border-gm-slate rounded-sm shadow-2xl overflow-hidden px-3 pb-3">
                <div>
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
