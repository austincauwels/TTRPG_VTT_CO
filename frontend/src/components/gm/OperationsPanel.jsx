import React, { useState, useEffect } from 'react';
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

const wideTab = (tab) => tab === 'archives' || tab === 'map';

export const OperationsPanel = () => {
  const [activeTab, setActiveTab] = useState('roster');
  const [pendingIndex, setPendingIndex] = useState(0);
  const [selectedInvestigator, setSelectedInvestigator] = useState(null);
  const [isFinalizingRoster, setIsFinalizingRoster] = useState(false);
  const [showCircleStatus, setShowCircleStatus] = useState(false);
  const { logout, setStage, accessSession, lastPlayedCampaign, campaignRoster, fetchRoster, approveInvestigator, rejectInvestigator, connect, socket,
          activityLog, circle, circleCreation, finalizeRoster, fetchCircleCreationState } = useGameStore();

  const rosterFinalized = campaignRoster?.roster_finalized === true;

  const activeCampaignId = lastPlayedCampaign?.campaignId || accessSession?.campaignId;
  const activeCampaignCode = lastPlayedCampaign?.campaignCode || accessSession?.campaignCode;

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

  const handleStamp = (characterId) => {
    approveInvestigator(characterId, activeCampaignId);
    setPendingIndex(0);
  };

  const handleReject = (characterId) => {
    rejectInvestigator(characterId, activeCampaignId);
    setPendingIndex(0);
  };

  const handleFinalizeRoster = async () => {
    setIsFinalizingRoster(true);
    await finalizeRoster(activeCampaignId, circle?.id || 1);
    setIsFinalizingRoster(false);
  };

  const handleSelectInvestigator = (inv) => setSelectedInvestigator(inv);

  return (
    <div className="min-h-screen bg-[#020617] text-[#f1f5f9] font-serif bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12 relative">
      
      <GMDeskHeader activeCampaignId={activeCampaignId} setStage={setStage} />

      <main className="max-w-[1500px] mx-auto p-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT PANEL */}
          <div className={`${activeTab === 'map' ? 'lg:col-span-2' : activeTab === 'archives' ? 'lg:col-span-3' : 'lg:col-span-3'} flex flex-col gap-6`}>
            <GMSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === 'roster' && <SceneManager />}
          </div>

          {/* CENTER PANEL */}
          <div className={activeTab === 'map' ? 'lg:col-span-10' : activeTab === 'archives' ? 'lg:col-span-9' : 'lg:col-span-6'}>
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
              <div className="bg-[#0c1c32] p-8 rounded-sm shadow-2xl border border-[#1e3a5f] min-h-[850px] flex flex-col gap-8">

                {!rosterFinalized && (
                  <div>
                    <CorrespondenceStack
                      campaignRoster={campaignRoster}
                      pendingIndex={pendingIndex}
                      setPendingIndex={setPendingIndex}
                      handleStamp={handleStamp}
                      handleReject={handleReject}
                    />

                    {/* Finalize Roster slip */}
                    <FinalizeRosterSlip
                      handleFinalizeRoster={handleFinalizeRoster}
                      isFinalizingRoster={isFinalizingRoster}
                      campaignRoster={campaignRoster}
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
                <ActiveCircleMembers campaignRoster={campaignRoster} onSelect={handleSelectInvestigator} />

                {/* TENSION CLOCK — pinned to bottom */}
                <TensionSection />


              </div>
            )}
            {activeTab === 'circle' && <CirclePage />}
            {activeTab === 'archives' && (
              <div className="bg-[#0c1c32] p-8 rounded-sm shadow-2xl border border-[#1e3a5f] min-h-[850px]">
                <NotebookView isGM={true} />
              </div>
            )}
            {activeTab === 'map' && (
              <FairelandsMap />
            )}
          </div>

          {!wideTab(activeTab) && (
            <div className="lg:col-span-3">
              <div className="bg-[#0f172a] border border-slate-800 rounded-sm shadow-2xl overflow-hidden">
                <div className="grayscale sepia-[.2] hue-rotate-[190deg] brightness-90">
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
