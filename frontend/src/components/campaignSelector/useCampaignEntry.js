import { useState } from 'react';

// Book open/close state and the ways into a campaign. enterAsPlayer and enterAsGM keep their
// call order: set character, connect, set last played, close book, set stage.
export const useCampaignEntry = ({
  accessSession, characters, gmCampaigns, lastPlayedCampaign,
  setLocalCharacter, connect, setLastPlayed, setStage, fetchUserData,
}) => {
  const [showBook, setShowBook] = useState(false);
  const [isClosingBook, setIsClosingBook] = useState(false);
  const [isLoadingBook, setIsLoadingBook] = useState(false);

  const closeBook = () => {
    setIsClosingBook(true);
    setTimeout(() => { setShowBook(false); setIsClosingBook(false); }, 420);
  };

  const handleOpenRoster = async () => {
    setShowBook(true);
    setIsClosingBook(false);
    if (accessSession?.userId && characters.length === 0 && gmCampaigns.length === 0) {
      setIsLoadingBook(true);
      await fetchUserData(accessSession.userId);
      setIsLoadingBook(false);
    }
  };

  const refreshBook = async () => {
    if (!accessSession?.userId) return;
    setIsLoadingBook(true);
    await fetchUserData(accessSession.userId);
    setIsLoadingBook(false);
  };

  const enterAsPlayer = (char) => {
    setLocalCharacter({ id: char.id, name: char.name, status: char.status });
    connect(char.id);
    setLastPlayed({ type: 'player', characterId: char.id, campaignName: char.campaign_name || 'Active Campaign', campaignCode: char.campaign_code || '', campaignId: char.campaign_id || null });
    closeBook();
    setStage('DESK');
  };

  const enterAsGM = (camp) => {
    connect(camp.campaign_code);
    setLastPlayed({ type: 'gm', campaignCode: camp.campaign_code, campaignName: camp.name, campaignId: camp.id });
    closeBook();
    setStage('GM_DASH');
  };

  const handleLastPlayed = () => {
    if (!lastPlayedCampaign) return;
    if (lastPlayedCampaign.type === 'player') {
      setLocalCharacter({ id: lastPlayedCampaign.characterId, name: lastPlayedCampaign.campaignName });
      connect(lastPlayedCampaign.characterId);
      setStage('DESK');
    } else {
      const matchedCamp = gmCampaigns.find(c => c.campaign_code === lastPlayedCampaign.campaignCode);
      if (matchedCamp && !lastPlayedCampaign.campaignId) {
        setLastPlayed({ ...lastPlayedCampaign, campaignId: matchedCamp.id });
      }
      connect(lastPlayedCampaign.campaignCode);
      setStage('GM_DASH');
    }
  };

  return {
    showBook, isClosingBook, isLoadingBook,
    closeBook, handleOpenRoster, refreshBook,
    enterAsPlayer, enterAsGM, handleLastPlayed,
  };
};
