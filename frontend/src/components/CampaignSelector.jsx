import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { createCampaign } from '../api/campaigns';

import { useCampaignEntry } from './campaignSelector/useCampaignEntry';
import { useAutoLastPlayed } from './campaignSelector/useAutoLastPlayed';
import { RejoinInviteBanner } from './campaignSelector/RejoinInviteBanner';
import { DeskStyles } from './campaignSelector/DeskStyles';
import { DeskBackdrop } from './campaignSelector/DeskBackdrop';
import { CandleCluster } from './campaignSelector/CandleCluster';
import { CryptidSketches } from './campaignSelector/CryptidSketches';
import { HubHeader } from './campaignSelector/HubHeader';
import { ActiveRegisterTome } from './campaignSelector/ActiveRegisterTome';
import { LastSessionTome } from './campaignSelector/LastSessionTome';
import { HalcyonHerald } from './campaignSelector/HalcyonHerald';
import { NewInvestigatorPamphlet } from './campaignSelector/NewInvestigatorPamphlet';
import { GMAccessPamphlet } from './campaignSelector/GMAccessPamphlet';
import { ForegroundAtmosphere } from './campaignSelector/ForegroundAtmosphere';
import { RosterBook } from './campaignSelector/RosterBook';

export const CampaignSelector = () => {
  const {
    setStage, connect, logout, accessSession, character, characters, gmCampaigns,
    lastPlayedCampaign, joinCampaign, refreshCharacterStatus, fetchUserData,
    setLastPlayed, setLocalCharacter, rejoinInvite, setRejoinInvite,
  } = useGameStore();

  // Book overlay state and the ways into a campaign
  const {
    showBook, isClosingBook, isLoadingBook,
    closeBook, handleOpenRoster, refreshBook,
    enterAsPlayer, enterAsGM, handleLastPlayed,
  } = useCampaignEntry({
    accessSession, characters, gmCampaigns, lastPlayedCampaign,
    setLocalCharacter, connect, setLastPlayed, setStage, fetchUserData,
  });

  // Per-character inline join form state  { [charId]: { code, pen, error, loading } }
  const [joinForms, setJoinForms] = useState({});

  // Campaign creation state (right page of book)
  const [newCampName, setNewCampName] = useState('');
  const [newCampCode, setNewCampCode] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Fetch user data on mount so book covers show accurate counts without needing to open the book
  useEffect(() => {
    if (accessSession?.userId) {
      fetchUserData(accessSession.userId);
    }
  }, [accessSession?.userId]);

  useAutoLastPlayed({ lastPlayedCampaign, characters, gmCampaigns, setLastPlayed });

  const handleLogout = () => {
    logout();
    setStage('LOGIN');
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!newCampName.trim() || !newCampCode.trim()) return;
    setIsCreating(true);
    setCreateError('');
    try {
      const res = await createCampaign(newCampName.trim(), newCampCode.trim(), accessSession?.userId);
      if (res.ok) {
        const camp = await res.json();
        setNewCampName('');
        setNewCampCode('');
        await fetchUserData(accessSession?.userId);
        enterAsGM({ campaign_code: camp.campaign_code, name: camp.name, id: camp.id });
      } else {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.detail || 'Failed to create campaign.');
      }
    } catch (err) {
      setCreateError('Network error — try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinForChar = async (charId) => {
    const form = joinForms[charId] || {};
    if (!form.code?.trim()) return;
    setJoinForms(f => ({ ...f, [charId]: { ...f[charId], loading: true, error: '' } }));
    const result = await joinCampaign(charId, form.code.trim(), form.pen || 'Caveat');
    if (result.success) {
      await fetchUserData(accessSession?.userId);
      setJoinForms(f => ({ ...f, [charId]: { expanded: false, code: '', pen: 'Caveat', loading: false, error: '' } }));
    } else {
      setJoinForms(f => ({ ...f, [charId]: { ...f[charId], loading: false, error: result.detail || 'Invalid code.' } }));
    }
  };

  return (
    <div className="scene-container min-h-screen w-full relative overflow-hidden select-none flex flex-col font-serif bg-black">
      <RejoinInviteBanner rejoinInvite={rejoinInvite} setStage={setStage} setRejoinInvite={setRejoinInvite} />

      <DeskStyles />
      <DeskBackdrop />
      <CandleCluster />
      <CryptidSketches />
      <HubHeader onLogout={handleLogout} />

      {/* 6. PHYSICAL DESK LAYOUT */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto flex items-center justify-center gap-12 p-12 z-30 perspective-[1500px]">
        
        {/* LEFT AREA: MASSIVE LEATHER TOMES */}
        <div className="flex gap-6 items-center justify-center w-[50%] ml-4 z-30">
          
          <ActiveRegisterTome characters={characters} gmCampaigns={gmCampaigns} onOpen={handleOpenRoster} />

          {/* TOME II: LAST SESSION */}
          <LastSessionTome lastPlayedCampaign={lastPlayedCampaign} onResume={handleLastPlayed} />

        </div>

        {/* RIGHT AREA: SHIFTED MESSY DESK PAMPHLETS & NEWSPAPER */}
        {/* We use a wider container to ensure everything stays far right and avoids books */}
        <div className="relative w-[50%] min-w-[550px] h-[600px] perspective-[1200px] flex items-center">
          
          <HalcyonHerald />

          {/* PAMPHLET I: NEW CHARACTER (Turn-of-the-Century Victorian Style) */}
          <NewInvestigatorPamphlet onOpen={() => setStage('CHARACTER_CREATION')} />

          {/* PAMPHLET II: GM OPERATIONS — flips to entry form */}
          <GMAccessPamphlet accessSession={accessSession} fetchUserData={fetchUserData} enterAsGM={enterAsGM} />
        </div>

      </main>

      {/* FOREGROUND ATMOSPHERICS */}
      <ForegroundAtmosphere />

      {/* BOOK OVERLAY */}
      {showBook && (
        <RosterBook
          isClosingBook={isClosingBook}
          closeBook={closeBook}
          registryProps={{
            isLoadingBook, characters, enterAsPlayer, refreshBook,
            joinForms, setJoinForms, handleJoinForChar, setStage,
          }}
          ledgerProps={{
            gmCampaigns, enterAsGM, isLoadingBook, showRegisterForm, setShowRegisterForm,
            handleCreateCampaign, createError, newCampName, setNewCampName, newCampCode, setNewCampCode, isCreating,
          }}
        />
      )}
    </div>
  );
};
