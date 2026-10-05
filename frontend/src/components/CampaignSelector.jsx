import React, { useState, useEffect, useRef } from 'react';
import useGameStore from '../store/gameStore';
import { campaignErrorText } from '../utils/campaignErrors';

import { useCampaignEntry } from './campaignSelector/useCampaignEntry';
import { useAutoLastPlayed } from './campaignSelector/useAutoLastPlayed';
import { RejoinInviteBanner } from './campaignSelector/RejoinInviteBanner';
import { HubNotice } from './campaignSelector/HubNotice';
import { DeskStyles } from './campaignSelector/DeskStyles';
import { DeskBackdrop } from './campaignSelector/DeskBackdrop';
import { CandleCluster, CandleLight } from './campaignSelector/CandleCluster';
import { CryptidSketch } from './campaignSelector/CryptidSketches';
import { HubHeader } from './campaignSelector/HubHeader';
import { CaseLedgerTome } from './campaignSelector/CaseLedgerTome';
import { LastPlayedTome } from './campaignSelector/LastPlayedTome';
import { HalcyonHerald } from './campaignSelector/HalcyonHerald';
import { NewCharacterTicket } from './campaignSelector/NewCharacterTicket';
import { NewCampaignTicket } from './campaignSelector/NewCampaignTicket';
import { ForegroundAtmosphere } from './campaignSelector/ForegroundAtmosphere';
import { RosterBook } from './campaignSelector/RosterBook';
import { useCastShadows } from './campaignSelector/useCastShadows';
import { warmPaperSound } from '../game/rollSounds';

export const CampaignSelector = () => {
  const {
    setStage, connect, logout, accessSession, character, characters, gmCampaigns,
    lastPlayedCampaign, joinCampaign, refreshCharacterStatus, fetchUserData,
    setLastPlayed, setLocalCharacter, rejoinInvite, setRejoinInvite, hubNotice, setHubNotice,
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

  // Load the paper sound while the desk is idle, not on the first turn of the book
  useEffect(() => {
    const idle = typeof window !== 'undefined' && window.requestIdleCallback;
    const id = idle ? window.requestIdleCallback(warmPaperSound, { timeout: 2000 }) : setTimeout(warmPaperSound, 1200);
    return () => (idle ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  // Every object on the desk throws its shadow away from the candles
  const deskRef = useRef(null);
  useCastShadows(deskRef, [!!lastPlayedCampaign]);

  // One candle burns for the chapter, and one more for each investigator in play or campaign
  // you run, up to three.
  const litCandles = 1 + Math.min(2, characters.filter(c => c.status === 'active').length + gmCampaigns.length);

  const handleLogout = () => {
    logout();
    setStage('LOGIN');
  };

  // The tome opens the book at the page for the user's role. The GM's ticket keeps its own
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
      // 409: the investigator is in a campaign or waiting for one after all (a delete was
      // undone, or another tab joined). Read the registry again so its row shows where it is.
      if (result.status === 409) await fetchUserData(accessSession?.userId);
    }
  };

  return (
    // Below lg the hub is exactly one screen tall and never scrolls (owner's round 3 item
    // 28): the slim band, then the desk, whose tomes take the height the tickets and the
    // folded Herald leave them (.hub-tomes in DeskStyles.jsx). While the roster book is open
    // the room under it holds still (.hub-still), so the book moves alone.
    <div className={`scene-container${showBook ? ' hub-still' : ''} h-[100dvh] lg:h-auto lg:min-h-screen w-full relative overflow-hidden select-none flex flex-col font-serif bg-night`}>
      <RejoinInviteBanner rejoinInvite={rejoinInvite} setStage={setStage} setRejoinInvite={setRejoinInvite} />
      <HubNotice notice={hubNotice} onDismiss={() => setHubNotice(null)} />

      <DeskStyles />
      <HubHeader onLogout={handleLogout} />

      {/* THE DESK, seen from above: wood with a leather writing inset, the candles at its left
          above the tomes, and the light and shade of the room over everything on it. None of the
          boxes between the light and the desk may form a stacking context (no z-index,
          transform, opacity or perspective), or the light has nothing to blend with. */}
      <div ref={deskRef} className="hub-room relative flex-1 min-h-0 flex flex-col">
        <DeskBackdrop />

        {/* From lg a free composition; below it a close look at the left end of the desk
            (owner's round 4 item 11): the tomes side by side with the Herald under them,
            the tickets in a row below, a few papers tucked under them */}
        <main className="hub-main relative flex-1 min-h-0 w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center lg:justify-center gap-6 sm:gap-8 lg:gap-12 lg:p-12">
          {/* LEFT: THE CANDLES AND THE TOMES. From lg the candles stand on a strip of desk
              of their own just above the Case Ledger's head (.hub-candles in DeskStyles.jsx),
              placed by the tomes and not by the window, so however short the window they
              never come down onto the books (owner's bug, 2026-10-04). Below lg both boxes
              step aside (display: contents) and the candles keep their strip at the top of
              the room. Neither box may form a stacking context (no z-index, transform or
              opacity), or the candles' light has nothing to blend with. */}
          <div className="hub-left contents lg:relative lg:flex lg:flex-col lg:self-stretch lg:w-[50%] lg:ml-[3.5vw]">
            <div className="hub-candles contents lg:block lg:relative">
              <CandleCluster lit={litCandles} />
              {/* The candles' light on the desk and the objects near them, and the room's shade */}
              <CandleLight lit={litCandles} />
            </div>

            {/* THE TOMES, with papers tucked under their heads and feet. Every paper is at
                least as large as a railway ticket (owner, 2026-10-05); where each lies, and
                on which screens, is in DeskStyles.jsx (Loose papers): from lg placed by the
                tomes themselves, so at least half of every picture shows; on phones and
                tablets in the tomes' row's own size (cqw, cqh), only as many as there is
                room for. In paint order: the folded Herald, then the papers, then the tomes. */}
            <div className="hub-tomes relative grid grid-cols-2 items-end justify-items-center gap-3 sm:gap-8 w-full max-w-[760px] lg:max-w-none lg:flex lg:gap-[2.2vw] lg:items-center lg:justify-center z-30">
              <HalcyonHerald phone />
              <CryptidSketch which="pinned" />
              <CryptidSketch which="photo" />
              <CryptidSketch which="tomes" />
              <CryptidSketch which="herald" />
              <CryptidSketch which="candles" />
              <CryptidSketch which="page" />
              <CryptidSketch which="postcard" />
              <CryptidSketch which="sketchbook" />
              <CaseLedgerTome characters={characters} gmCampaigns={gmCampaigns} onOpen={openRoster} />
              <LastPlayedTome lastPlayedCampaign={lastPlayedCampaign} onResume={handleLastPlayed} />
            </div>
          </div>

          {/* RIGHT: THE HERALD AND THE TICKETS lying on it */}
          <div className="hub-right relative shrink-0 w-full lg:w-[50%] lg:min-w-[550px] lg:h-[600px] flex flex-col lg:flex-row items-center gap-3 sm:gap-6 lg:gap-0">
            <HalcyonHerald />
            {/* From lg, papers lying on the Herald round the tickets, placed in the Herald's
                own pixels as the Herald and the tickets are (.hub-right > .sketch) */}
            <CryptidSketch which="tomes" />
            <CryptidSketch which="postcard" />
            <CryptidSketch which="bestiary" />

            {/* The tickets share a row below lg and never overlap; from lg up this wrapper
                steps aside (display: contents) and they lie loose on the desk */}
            <div className="grid grid-cols-2 gap-3 sm:gap-8 w-full max-w-[560px] lg:contents">
              <NewCharacterTicket onOpen={() => setStage('CHARACTER_CREATION')} />
              <NewCampaignTicket userId={accessSession?.userId} onCreated={handleCampaignCreated} />
            </div>
          </div>
        </main>

        <ForegroundAtmosphere />
      </div>

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
