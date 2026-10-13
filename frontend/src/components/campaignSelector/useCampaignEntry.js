import { useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import { playPaperSound } from '../../game/rollSounds';

// Book open/close state and the ways into a campaign. enterAsPlayer and enterAsGM keep their
// call order: set character, connect, set last played, close book, set stage.
// The book opening and closing on the desk plays the paper sound (owner's round 3 item 21);
// a close that leaves the hub for another screen ({ silent: true }) does not, since the
// book is never seen closing.
export const useCampaignEntry = ({
  accessSession, characters, gmCampaigns, lastPlayedCampaign,
  setLocalCharacter, connect, setLastPlayed, setStage, fetchUserData, setHubNotice,
}) => {
  const [showBook, setShowBook] = useState(false);
  const [isClosingBook, setIsClosingBook] = useState(false);
  const [isLoadingBook, setIsLoadingBook] = useState(false);
  // What a Play press is checking before it opens a desk: a character id, or 'last' for the
  // Last Played tome. The ref ignores a second press while the first is checked.
  const [entering, setEntering] = useState(null);
  const enteringRef = useRef(false);
  const bookOpen = useRef(false);

  // Also used directly as a click or Escape handler, so its argument may be an event
  const closeBook = (options) => {
    bookOpen.current = false;
    if (!options?.silent) playPaperSound();
    setIsClosingBook(true);
    setTimeout(() => { setShowBook(false); setIsClosingBook(false); }, 420);
  };

  const handleOpenRoster = async () => {
    playPaperSound();
    bookOpen.current = true;
    setShowBook(true);
    setIsClosingBook(false);
    if (!accessSession?.userId) return;
    // Opening the book reads the lists again, so a campaign retired meanwhile is gone from
    // it; the spinner is only for a book with nothing to show yet.
    const empty = characters.length === 0 && gmCampaigns.length === 0;
    if (empty) setIsLoadingBook(true);
    await fetchUserData(accessSession.userId);
    if (empty) setIsLoadingBook(false);
  };

  const refreshBook = async () => {
    if (!accessSession?.userId) return;
    setIsLoadingBook(true);
    await fetchUserData(accessSession.userId);
    setIsLoadingBook(false);
  };

  // The hub's lists may be from before the campaign was retired, or the investigator released
  // or replaced (issue #42): a Play reads them again first, and an investigator no longer in
  // that campaign opens no desk. The hub says so, and the book shows the lists as they are
  // now. Resolves to whether the desk may open; null when the press is to be dropped (another
  // check is running, or the player left the hub meanwhile). If the lists cannot be read,
  // the ones the hub has are used. A stale Last Played is dropped by fetchUserData itself.
  const checkStillIn = async (key, characterId, campaignId, words) => {
    if (enteringRef.current) return null;
    if (!accessSession?.userId) return true;
    enteringRef.current = true;
    setEntering(key);
    try {
      await fetchUserData(accessSession.userId);
    } finally {
      enteringRef.current = false;
      setEntering(null);
    }
    const { characters: now, stage } = useGameStore.getState();
    if (stage !== 'HOME') return null;
    const char = now.find(c => c.id === characterId);
    // A Last Played chosen by the hub itself (useAutoLastPlayed.js) names no campaign id
    const there = char && (campaignId == null ? char.campaign_id != null : char.campaign_id === campaignId);
    if (there && char.status === 'active') return true;
    setHubNotice(`${char?.name || words.name || 'Your investigator'} is no longer in ${words.campaign || 'that campaign'}.`);
    return false;
  };

  const enterAsPlayer = async (char) => {
    const ok = await checkStillIn(char.id, char.id, char.campaign_id,
      { name: char.name, campaign: char.campaign_name });
    // Closing the book while the lists were read drops the press
    if (!ok || !bookOpen.current) return;
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

  const handleLastPlayed = async () => {
    if (!lastPlayedCampaign) return;
    if (lastPlayedCampaign.type === 'player') {
      // The tome is the hub's other Play, and is checked the same way
      const last = lastPlayedCampaign;
      const ok = await checkStillIn('last', last.characterId, last.campaignId,
        { name: characters.find(c => c.id === last.characterId)?.name, campaign: last.campaignName });
      if (!ok) return;
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
    showBook, isClosingBook, isLoadingBook, entering,
    closeBook, handleOpenRoster, refreshBook,
    enterAsPlayer, enterAsGM, handleLastPlayed,
  };
};
