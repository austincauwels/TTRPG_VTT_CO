import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useGameStore from '../../store/gameStore';
import { SafeIcon } from '../shared/SafeIcon';
import { apiUrl } from '../../utils/api';

import { GMSidebar } from './GMSidebar';
import { SceneManager, TensionClock } from './SceneManager';
import { CirclePage } from './CirclePage';
import { PlayerRosterCard } from './PlayerRosterCard';
import { GMCharacterSheet } from './GMCharacterSheet';
import { DiceVault } from '../pc/DiceVault';
import { NotebookView } from '../shared/NotebookView';

const wideTab = (tab) => tab === 'archives' || tab === 'map';

const CARD_ROTATIONS = [-4, 3, -2, 5, -3, 2, -5, 4];

const InvestigatorBusinessCard = ({ inv, onClick, index = 0 }) => {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];
  const penFont = inv.pen_font || 'Caveat';
  const accentColor = inv.ink_color || '#2a1a0e';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04, rotate: 0, zIndex: 10 }}
      whileTap={{ scale: 0.97 }}
      style={{ rotate: rotation }}
      className="relative cursor-pointer text-left shadow-[4px_6px_16px_rgba(0,0,0,0.65)]"
    >
      <div className="w-full rounded-sm overflow-hidden border border-black/20 bg-white" style={{ minHeight: '140px' }}>
        {/* Accent stripe — player's ink color */}
        <div className="h-3 w-full" style={{ background: accentColor }} />

        <div className="flex">
          {/* Profile photo — shown only when present */}
          {inv.profile_pic && (
            <div className="shrink-0 border-r border-black/10">
              <img
                src={inv.profile_pic}
                alt={inv.name}
                className="w-24 object-cover"
                style={{ minHeight: '128px', height: '100%' }}
              />
            </div>
          )}

          {/* Text content */}
          <div className="px-4 py-3 flex-1 min-w-0">
            <p
              className="text-2xl font-bold leading-tight mb-2 truncate text-black"
              style={{ fontFamily: penFont }}
            >
              {inv.name}
            </p>

            <div className="h-px w-full mb-3" style={{ background: accentColor, opacity: 0.25 }} />

            <div className="space-y-1">
              {inv.role_class && (
                <p className="font-mono text-base uppercase tracking-wider truncate text-black">
                  {inv.role_class}
                </p>
              )}
              {inv.specialty && (
                <p className="font-mono text-sm uppercase tracking-wider truncate text-black">
                  {inv.specialty}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
};


export const OperationsPanel = () => {
  const [activeTab, setActiveTab] = useState('roster');
  const [mapOrigin, setMapOrigin] = useState('50% 50%');
  const [mapHover, setMapHover] = useState(false);
  const [pendingIndex, setPendingIndex] = useState(0);
  const [selectedInvestigator, setSelectedInvestigator] = useState(null);
  const [isFinalizingRoster, setIsFinalizingRoster] = useState(false);
  const [showCircleStatus, setShowCircleStatus] = useState(false);
  const [retireConfirm, setRetireConfirm] = useState(false);
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

  const handleRetireCampaign = async () => {
    if (!activeCampaignId) return;
    const res = await fetch(apiUrl(`/campaign/${activeCampaignId}/retire`), { method: 'POST' });
    if (!res.ok) console.error("Failed to retire campaign");
    setRetireConfirm(false);
  };

  const handleMapMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (((e.clientX - rect.left) / rect.width) * 100).toFixed(1);
    const y = (((e.clientY - rect.top)  / rect.height) * 100).toFixed(1);
    setMapOrigin(`${x}% ${y}%`);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#f1f5f9] font-serif bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12 relative">
      
      {/* HEADER CONTROLS */}
      <div className="absolute top-4 right-6 z-50 flex gap-2 items-center">
        {retireConfirm ? (
          <>
            <span className="text-xs text-slate-400 uppercase tracking-widest">Confirm retire?</span>
            <button onClick={handleRetireCampaign} className="text-sm font-bold uppercase tracking-[0.2em] text-white bg-red-900 hover:bg-red-700 border border-red-700 px-3 py-2">
              Yes, Retire
            </button>
            <button onClick={() => setRetireConfirm(false)} className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-white bg-[#0f172a]/80 border border-slate-600 px-3 py-2">
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setRetireConfirm(true)}
            className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-red-400 transition-colors bg-[#0f172a]/80 border border-slate-700/50 hover:border-red-800/50 px-4 py-2"
          >
            [ Retire Campaign ]
          </button>
        )}
        <button
          onClick={() => setStage('HOME')}
          className="text-sm font-bold uppercase tracking-[0.2em] text-[#3b82f6] hover:text-white transition-colors bg-[#0f172a]/80 hover:bg-[#0f172a] border border-[#3b82f6]/50 hover:border-[#3b82f6] px-4 py-2"
        >
          [ Abandon Archive ]
        </button>
      </div>
      
      {/* ORIGINAL HEADER */}
      <header className="w-full bg-[#0f172a] py-6 flex flex-col items-center justify-center border-b border-black/60 shadow-xl">
        <h1 className="text-4xl font-serif font-bold tracking-[0.15em] text-slate-100 uppercase">CANDELA OBSCURA</h1>
        <h2 className="text-[11px] font-sans font-black tracking-[0.35em] text-[#3b82f6] uppercase mt-1.5">Lightkeeper Operations Terminal</h2>
      </header>

      {/* GM CONTROL BAR */}
      <div className="w-full bg-[#1e293b] border-b border-slate-700 py-4 shadow-md z-40 flex justify-center">
        <div className="w-full max-w-[1500px] px-8 flex items-center pl-[40px] gap-8">
          <div className="flex items-center gap-3 text-[#3b82f6]">
            <SafeIcon name="GiEyeShield" size={45} />
            <span className="font-serif text-xl font-bold tracking-[0.2em] uppercase text-slate-100">
              Lightkeeper's Desk
            </span>
          </div>
        </div>
      </div>

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

                {/* CORRESPONDENCE STACK — hidden once roster is finalized */}
                {!rosterFinalized && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-[1px] flex-1 bg-[#1e3a5f]/60" />
                      <h3 className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#93c5fd]/70">
                        Correspondence — Pending Review
                      </h3>
                      <div className="h-[1px] flex-1 bg-[#1e3a5f]/60" />
                    </div>
                    {(() => {
                      const pending = campaignRoster.pending_investigators || [];
                      if (pending.length === 0) {
                        return (
                          <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest text-center py-6 italic">
                            No pending correspondence.
                          </p>
                        );
                      }
                      const current = pending[pendingIndex];
                      return (
                        <div className="flex flex-col items-center gap-4">
                          <AnimatePresence mode="wait">
                            {current && (
                              <PlayerRosterCard
                                key={current.id}
                                investigator={current}
                                onStamp={() => handleStamp(current.id)}
                                onReject={() => handleReject(current.id)}
                              />
                            )}
                          </AnimatePresence>
                          {pending.length > 1 && (
                            <div className="flex items-center gap-5">
                              <button
                                onClick={() => setPendingIndex(i => Math.max(0, i - 1))}
                                disabled={pendingIndex === 0}
                                className="w-8 h-8 flex items-center justify-center font-mono font-black text-lg text-amber-600/70 hover:text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >‹</button>
                              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                                {pendingIndex + 1} / {pending.length}
                              </span>
                              <button
                                onClick={() => setPendingIndex(i => Math.min(pending.length - 1, i + 1))}
                                disabled={pendingIndex === pending.length - 1}
                                className="w-8 h-8 flex items-center justify-center font-mono font-black text-lg text-amber-600/70 hover:text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >›</button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Finalize Roster slip */}
                    <button
                      onClick={handleFinalizeRoster}
                      disabled={isFinalizingRoster}
                      className="relative w-full mt-5 transform -rotate-1 hover:rotate-0 transition-all duration-300 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div
                        className="w-full px-6 py-4 shadow-[4px_6px_14px_rgba(0,0,0,0.55)]"
                        style={{
                          clipPath: 'polygon(0% 2%, 99% 0%, 100% 98%, 1% 100%)',
                          background: 'linear-gradient(135deg, #f0e6cc 55%, #d4b896 88%, #6b4e3a 100%)',
                          borderLeft: '3px solid #8b0000',
                        }}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <SafeIcon name="GiWaxSeal" size={28} className="text-[#8b0000] opacity-75" />
                              <span className="font-serif font-black uppercase tracking-[0.2em] text-sm text-[#2c2420]">
                                {isFinalizingRoster ? 'Finalizing…' : 'Finalize Roster'}
                              </span>
                            </div>
                            <span className="font-mono text-[9px] text-[#7a6a5a] uppercase tracking-widest">
                              {campaignRoster.active_investigators?.length || 0} / 5 investigators
                            </span>
                          </div>
                          <p className="font-mono text-sm text-[#5a4a3a] italic leading-snug">
                            Warning: Finalizing the roster locks circle details and closes all player formation popups.
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Circle Formation Status summary */}
                    <div className="mt-3">
                      <button
                        onClick={() => setShowCircleStatus(s => !s)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/60 border border-slate-700 text-left"
                      >
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-blue-400/70">
                          Circle Formation Status
                        </span>
                        <span className="font-mono text-slate-500 text-xs">{showCircleStatus ? '▲' : '▼'}</span>
                      </button>
                      <AnimatePresence>
                        {showCircleStatus && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-slate-900/60 border border-slate-700 border-t-0 p-3 space-y-2">
                              {/* Name vote leader */}
                              {(() => {
                                const nameVotes = circleCreation.votes?.name_vote || [];
                                const tally = {};
                                nameVotes.forEach(v => { tally[v.value] = (tally[v.value] || 0) + 1; });
                                const leader = Object.entries(tally).sort((a,b) => b[1]-a[1])[0];
                                const suggestCount = (circleCreation.votes?.name_suggest || []).length;
                                return (
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Circle Name</span>
                                    <span className="font-mono text-xs text-slate-200">
                                      {leader ? `"${leader[0]}" (${leader[1]} vote${leader[1] > 1 ? 's' : ''})` : suggestCount > 0 ? `${suggestCount} suggest${suggestCount > 1 ? 'ions' : 'ion'}, no votes` : 'No suggestions yet'}
                                    </span>
                                  </div>
                                );
                              })()}
                              {/* Ability vote leader */}
                              {(() => {
                                const abilityVotes = circleCreation.votes?.ability || [];
                                const tally = {};
                                abilityVotes.forEach(v => { tally[v.value] = (tally[v.value] || 0) + 1; });
                                const leader = Object.entries(tally).sort((a,b) => b[1]-a[1])[0];
                                return (
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Circle Ability</span>
                                    <span className="font-mono text-xs text-slate-200">
                                      {leader ? `${leader[0]} (${leader[1]})` : 'No votes yet'}
                                    </span>
                                  </div>
                                );
                              })()}
                              {/* Insignia vote leader */}
                              {(() => {
                                const insVotes = circleCreation.votes?.insignia || [];
                                const tally = {};
                                insVotes.forEach(v => { tally[v.value] = (tally[v.value] || 0) + 1; });
                                const leader = Object.entries(tally).sort((a,b) => b[1]-a[1])[0];
                                return leader ? (
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Insignia</span>
                                    <span className="font-mono text-xs text-slate-200">{leader[0].replace('Gi','')} ({leader[1]})</span>
                                  </div>
                                ) : null;
                              })()}
                              {/* Question vote leader */}
                              {(() => {
                                const qVotes = circleCreation.votes?.question || [];
                                const tally = {};
                                qVotes.forEach(v => { tally[v.value] = (tally[v.value] || 0) + 1; });
                                const leader = Object.entries(tally).sort((a,b) => b[1]-a[1])[0];
                                return (
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Question</span>
                                    <span className="font-mono text-xs text-slate-200">
                                      {leader ? `Q${leader[0].replace('q','')} selected (${leader[1]} vote${leader[1] > 1 ? 's' : ''})` : 'No votes yet'}
                                    </span>
                                  </div>
                                );
                              })()}
                              {/* Relationships */}
                              {(() => {
                                const rels = circleCreation.relationships || [];
                                const confirmed = rels.filter(r => r.status === 'accepted').length;
                                const total = rels.length;
                                return (
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-xs text-slate-400 uppercase tracking-wider">Relationships</span>
                                    <span className="font-mono text-xs text-slate-200">
                                      {confirmed} confirmed / {total} proposed
                                    </span>
                                  </div>
                                );
                              })()}
                              {/* Player personal answers */}
                              {circleCreation.activeInvestigators?.some(inv => inv.personal_circle_answer) && (
                                <div className="mt-2 pt-2 border-t border-slate-700 space-y-2">
                                  <span className="font-mono text-xs text-slate-400 uppercase tracking-wider block">Player History Answers</span>
                                  {circleCreation.activeInvestigators.map(inv => inv.personal_circle_answer ? (
                                    <div key={inv.id} className="bg-slate-800/40 rounded-sm p-2">
                                      <p className="font-mono text-xs text-slate-400 uppercase mb-1">{inv.name}</p>
                                      <p className="font-serif text-xs text-slate-200 italic leading-snug">"{inv.personal_circle_answer}"</p>
                                    </div>
                                  ) : null)}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* ACTIVE CIRCLE MEMBERS */}
                <div className="rounded-sm border border-[#1e3a5f] bg-[#0a1525] p-4 shadow-inner">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-[1px] flex-1 bg-[#2d5a8e]/50" />
                    <h3 className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#60a5fa]">
                      Active Circle Members
                    </h3>
                    <div className="h-[1px] flex-1 bg-[#2d5a8e]/50" />
                  </div>
                  {campaignRoster.active_investigators?.length === 0 ? (
                    <p className="font-mono text-[10px] text-[#3b82f6]/40 uppercase tracking-widest text-center py-6 italic">
                      No active investigators on record.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-4 pt-2 pb-2">
                      <AnimatePresence>
                        {campaignRoster.active_investigators.map((inv, i) => (
                          <InvestigatorBusinessCard key={inv.id} inv={inv} index={i} onClick={() => handleSelectInvestigator(inv)} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* TENSION CLOCK — pinned to bottom */}
                <div className="mt-auto">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-[1px] flex-1 bg-red-900/30" />
                    <h3 className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-red-500/60">
                      Tension
                    </h3>
                    <div className="h-[1px] flex-1 bg-red-900/30" />
                  </div>
                  <div className="flex justify-center pb-4">
                    <TensionClock />
                  </div>
                </div>

              </div>
            )}
            {activeTab === 'circle' && <CirclePage />}
            {activeTab === 'archives' && (
              <div className="bg-[#0c1c32] p-8 rounded-sm shadow-2xl border border-[#1e3a5f] min-h-[850px]">
                <NotebookView isGM={true} />
              </div>
            )}
            {activeTab === 'map' && (
              <div
                className="rounded-sm shadow-2xl border border-slate-700 overflow-hidden bg-[#0a0a0a] cursor-crosshair"
                onMouseMove={handleMapMouseMove}
                onMouseEnter={() => setMapHover(true)}
                onMouseLeave={() => setMapHover(false)}
              >
                <img
                  src="/images/The_Fairelands_map.png"
                  alt="The Fairelands"
                  className="w-full h-auto block"
                  style={{
                    transform: mapHover ? 'scale(4)' : 'scale(1)',
                    transformOrigin: mapOrigin,
                    transition: mapHover ? 'transform 0.15s ease-out' : 'transform 0.35s ease-out',
                  }}
                />
              </div>
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