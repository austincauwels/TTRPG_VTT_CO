import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { campaignErrorText } from '../utils/campaignErrors';

import { useCampaignEntry } from './campaignSelector/useCampaignEntry';
import { useAutoLastPlayed } from './campaignSelector/useAutoLastPlayed';
import { RejoinInviteBanner } from './campaignSelector/RejoinInviteBanner';
import { DeskStyles } from './campaignSelector/DeskStyles';
import { DeskBackdrop } from './campaignSelector/DeskBackdrop';
import { CandleCluster, CandleLight } from './campaignSelector/CandleCluster';
import { CryptidSketches } from './campaignSelector/CryptidSketches';
import { HubHeader } from './campaignSelector/HubHeader';
import { ActiveRegisterTome } from './campaignSelector/ActiveRegisterTome';
import { LastSessionTome } from './campaignSelector/LastSessionTome';
import { HalcyonHerald, HalcyonHeraldStrip } from './campaignSelector/HalcyonHerald';
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

  // The new-campaign form on the Lightkeeper Ledger page
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  // Fetch user data on mount so book covers show accurate counts without needing to open the book
  useEffect(() => {
    if (accessSession?.userId) {
      fetchUserData(accessSession.userId);
    }
  }, [accessSession?.userId]);

  useAutoLastPlayed({ lastPlayedCampaign, characters, gmCampaigns, setLastPlayed });

  // One candle burns for the chapter, and one more for each investigator in play or campaign
  // you run, up to three.
  const litCandles = 1 + Math.min(2, characters.filter(c => c.status === 'active').length + gmCampaigns.length);

  const handleLogout = () => {
    logout();
    setStage('LOGIN');
  };

  // The tome opens the book at the page for the user's role. The GM pamphlet keeps its own
  // new-campaign form on its back.
  const openRoster = () => handleOpenRoster();

  const handleCampaignCreated = async (camp) => {
    setShowRegisterForm(false);
    await fetchUserData(accessSession?.userId);
    enterAsGM({ campaign_code: camp.campaign_code, name: camp.name, id: camp.id });
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
      const error = campaignErrorText(result.detail, 'Could not send the request to join. Try again in a moment.');
      setJoinForms(f => ({ ...f, [charId]: { ...f[charId], loading: false, error } }));
    }
  };

  return (
    <div className="scene-container min-h-screen w-full relative overflow-hidden select-none flex flex-col font-serif bg-night">
      <RejoinInviteBanner rejoinInvite={rejoinInvite} setStage={setStage} setRejoinInvite={setRejoinInvite} />

      <DeskStyles />
      <DeskBackdrop />
      <CandleCluster lit={litCandles} />
      <CryptidSketches />
      <HubHeader onLogout={handleLogout} />

      {/* 6. PHYSICAL DESK LAYOUT: a free composition from lg up; below it the desk stacks in
          one column (tomes side by side, pamphlets in a row, the Herald folded at the foot) */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center lg:justify-center gap-10 lg:gap-12 px-4 pt-[5.5rem] pb-12 sm:px-8 sm:pt-28 lg:p-12 z-30 perspective-[1500px]">
        
        {/* LEFT AREA: MASSIVE LEATHER TOMES */}
        <div className="grid grid-cols-2 items-start gap-6 sm:gap-10 w-full max-w-[680px] pr-3 sm:pr-4 lg:pr-0 lg:max-w-none lg:flex lg:gap-6 lg:items-center lg:justify-center lg:w-[50%] lg:ml-4 z-30">
          
          <ActiveRegisterTome characters={characters} gmCampaigns={gmCampaigns} onOpen={openRoster} />

          {/* TOME II: LAST SESSION */}
          <LastSessionTome lastPlayedCampaign={lastPlayedCampaign} onResume={handleLastPlayed} />

        </div>

        {/* RIGHT AREA: SHIFTED MESSY DESK PAMPHLETS & NEWSPAPER */}
        {/* We use a wider container to ensure everything stays far right and avoids books */}
        <div className="relative w-full lg:w-[50%] lg:min-w-[550px] lg:h-[600px] perspective-[1200px] flex flex-col lg:flex-row items-center gap-10 lg:gap-0">
          
          <HalcyonHerald />

          {/* The pamphlets share a row below lg and never overlap; from lg up this wrapper
              steps aside (display: contents) and they lie loose on the desk */}
          <div className="grid grid-cols-2 gap-6 sm:gap-10 w-full max-w-[540px] lg:contents">
            {/* PAMPHLET I: NEW CHARACTER (Turn-of-the-Century Victorian Style) */}
            <NewInvestigatorPamphlet onOpen={() => setStage('CHARACTER_CREATION')} />

            {/* PAMPHLET II: GM OPERATIONS, flips to entry form */}
            <GMAccessPamphlet userId={accessSession?.userId} onCreated={handleCampaignCreated} />
          </div>

          <HalcyonHeraldStrip />
        </div>

      </main>

      {/* The candles' light on the desk and the objects near them */}
      <CandleLight lit={litCandles} />

      {/* FOREGROUND ATMOSPHERICS */}
      <ForegroundAtmosphere />

      {/* BOOK OVERLAY */}
      {showBook && (
        <RosterBook
          defaultPage={accessSession?.role === 'GM' ? 'ledger' : 'registry'}
          isClosingBook={isClosingBook}
          closeBook={closeBook}
          registryProps={{
            isLoadingBook, characters, enterAsPlayer, refreshBook,
            joinForms, setJoinForms, handleJoinForChar, setStage,
          }}
          ledgerProps={{
            gmCampaigns, enterAsGM, isLoadingBook, showRegisterForm, setShowRegisterForm,
            userId: accessSession?.userId, onCampaignCreated: handleCampaignCreated,
          }}
        />
      )}
    </div>
  );
};
