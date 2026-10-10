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
import { CryptidSketch, dropPapers, notebookSlots, sketchInSlot, useShownPapers } from './campaignSelector/CryptidSketches';
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
import { apiFetch } from '../utils/api';
import { usePendingApprovalWatch } from './campaignSelector/usePendingApprovalWatch';

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
  usePendingApprovalWatch({ characters, userId: accessSession?.userId, fetchUserData, setHubNotice });

  // Load the paper sound while the desk is idle, not on the first turn of the book
  useEffect(() => {
    const idle = typeof window !== 'undefined' && window.requestIdleCallback;
    const id = idle ? window.requestIdleCallback(warmPaperSound, { timeout: 2000 }) : setTimeout(warmPaperSound, 1200);
    return () => (idle ? window.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  const deskRef = useRef(null);
  // Each visit drops the loose papers a little differently (the user's request,
  // 2026-10-08): one draw as the hub mounts (dropPapers in CryptidSketches.jsx), kept until
  // you leave, so nothing moves while you are here and a reload draws again. Each paper's
  // place and angle vary about its own spot, within ranges for each paper and screen that
  // keep the desk's rules, and the pile is shuffled where neither a rule nor the desk's
  // layers depend on its order (DeskStyles.jsx, The drop).
  const [drop] = useState(dropPapers);

  // A few sketches from the user's own notebooks, chosen at random on each visit, lie on the
  // desk in place of some of the prints (owner's request, 2026-10-07). They take papers in
  // this visit's own order among those the desk shows at its size (notebookSlots in
  // CryptidSketches.jsx), so on the wide desk a different print gives way each time (on
  // phones and tablets the torn page is the only one that can). The prints stay when there
  // are none, or the call fails.
  const [notebookSketches, setNotebookSketches] = useState([]);
  useEffect(() => {
    let live = true;
    apiFetch('/api/notebook/hub-sketches')
      .then(r => (r.ok ? r.json() : []))
      .then(list => { if (live && Array.isArray(list)) setNotebookSketches(list); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  const shownPapers = useShownPapers(deskRef);
  const slots = notebookSlots(drop, shownPapers);
  const sketchFor = (which) => sketchInSlot(notebookSketches, which, slots);

  // Every object on the desk throws its shadow away from the candles, the papers from
  // wherever this visit dropped them
  useCastShadows(deskRef, [!!lastPlayedCampaign]);

  // The chapter's three candles, and one more for each investigator in play or campaign
  // you run, up to six.
  const litCandles = 3 + Math.min(3, characters.filter(c => c.status === 'active').length + gmCampaigns.length);

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
    <div className={`scene-container${showBook ? ' hub-still' : ''} h-[100dvh] lg:landscape:h-auto lg:landscape:min-h-screen w-full relative overflow-hidden select-none flex flex-col font-serif bg-night`}>
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
        <main className="hub-main relative flex-1 min-h-0 w-full max-w-[1600px] mx-auto flex flex-col lg:landscape:flex-row items-center lg:landscape:justify-center gap-6 sm:gap-8 lg:landscape:gap-12 lg:landscape:p-12">
          {/* LEFT: THE CANDLES AND THE TOMES. From lg the candles stand on a strip of desk
              of their own just above the Case Ledger's head (.hub-candles in DeskStyles.jsx),
              placed by the tomes and not by the window, so however short the window they
              never come down onto the books (owner's bug, 2026-10-04). Below lg both boxes
              step aside (display: contents) and the candles keep their strip at the top of
              the room. Neither box may form a stacking context (no z-index, transform or
              opacity), or the candles' light has nothing to blend with. */}
          <div className="hub-left contents lg:landscape:relative lg:landscape:flex lg:landscape:flex-col lg:landscape:self-stretch lg:landscape:w-[50%] lg:landscape:ml-[3.5vw]">
            <div className="hub-candles contents lg:landscape:block lg:landscape:relative">
              <CandleCluster lit={litCandles} />
              {/* The candles' light on the desk and the objects near them, and the room's shade */}
              <CandleLight lit={litCandles} />
            </div>

            {/* THE TOMES, with papers dropped round them and tucked under their heads and
                feet. Every paper is at least as large as a railway ticket (owner, 2026-10-05)
                and lies at its own angle in a pile (owner, 2026-10-05: scattered, some under
                the newspaper and each other); where each lies, its angle, its place in the
                pile and on which screens it shows are in DeskStyles.jsx (Loose papers): from
                lg placed by the tomes themselves, so at least a third of every picture
                shows; on phones and tablets in the tomes' row's own size (cqw, cqh), only as
                many as there is room for. The tomes lie over every paper, and the pile's
                layers are set there too (z-index), not by the order below; within a layer
                each visit shuffles the pile, and drops each paper a little off its spot
                and angle (The drop). */}
            <div className="hub-tomes relative grid grid-cols-2 items-end justify-items-center gap-3 sm:gap-8 w-full max-w-[760px] lg:landscape:max-w-none lg:landscape:flex lg:landscape:gap-[2.2vw] lg:landscape:items-center lg:landscape:justify-center z-30">
              <HalcyonHerald phone />
              <CryptidSketch which="pinned" drop={drop} notebook={sketchFor('pinned')} />
              <CryptidSketch which="photo" drop={drop} />
              <CryptidSketch which="tomes" drop={drop} notebook={sketchFor('tomes')} />
              <CryptidSketch which="herald" drop={drop} notebook={sketchFor('herald')} />
              <CryptidSketch which="candles" drop={drop} notebook={sketchFor('candles')} />
              <CryptidSketch which="page" drop={drop} notebook={sketchFor('page')} />
              <CryptidSketch which="postcard" drop={drop} />
              <CryptidSketch which="sketchbook" drop={drop} />
              <CaseLedgerTome characters={characters} gmCampaigns={gmCampaigns} onOpen={openRoster} />
              <LastPlayedTome lastPlayedCampaign={lastPlayedCampaign} onResume={handleLastPlayed} />
            </div>
          </div>

          {/* RIGHT: THE HERALD AND THE TICKETS lying on it */}
          <div className="hub-right relative shrink-0 w-full lg:landscape:w-[50%] lg:landscape:min-w-[550px] lg:landscape:h-[600px] flex flex-col lg:landscape:flex-row items-center gap-3 sm:gap-6 lg:landscape:gap-0">
            <HalcyonHerald />
            {/* From lg, papers on the Herald round the tickets and under the Herald's edges,
                placed in the Herald's own pixels as the Herald and the tickets are
                (.hub-right > .sketch) */}
            <CryptidSketch which="page" drop={drop} notebook={sketchFor('page')} />
            <CryptidSketch which="postcard" drop={drop} />
            <CryptidSketch which="bestiary" drop={drop} notebook={sketchFor('bestiary')} />

            {/* The tickets share a row below lg and never overlap; from lg up this wrapper
                steps aside (display: contents) and they lie loose on the desk */}
            <div className="grid grid-cols-2 gap-3 sm:gap-8 w-full max-w-[560px] lg:landscape:contents">
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
