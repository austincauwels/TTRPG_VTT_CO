import { useState } from 'react';
import { playPaperSound } from '../../game/rollSounds';

// Book open/close state and the ways into a campaign. enterAsPlayer and enterAsGM keep their
// call order: set character, connect, set last played, close book, set stage.
// The book opening and closing on the desk plays the paper sound (owner's round 3 item 21);
// a close that leaves the hub for another screen ({ silent: true }) does not, since the
// book is never seen closing.
export const useCampaignEntry = ({
  accessSession, characters, gmCampaigns, lastPlayedCampaign,
  setLocalCharacter, connect, setLastPlayed, setStage, fetchUserData,
}) => {
  const [showBook, setShowBook] = useState(false);
  const [isClosingBook, setIsClosingBook] = useState(false);
  const [isLoadingBook, setIsLoadingBook] = useState(false);

  // Also used directly as a click or Escape handler, so its argument may be an event
  const closeBook = (options) => {
    if (!options?.silent) playPaperSound();
    setIsClosingBook(true);
    setTimeout(() => { setShowBook(false); setIsClosingBook(false); }, 420);
  };

  const handleOpenRoster = async () => {
    playPaperSound();
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
    closeBook({ silent: true });
    setStage('DESK');
  };

  const enterAsGM = (camp) => {
    connect(camp.campaign_code);
    setLastPlayed({ type: 'gm', campaignCode: camp.campaign_code, campaignName: camp.name, campaignId: camp.id });
    closeBook({ silent: true });
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
