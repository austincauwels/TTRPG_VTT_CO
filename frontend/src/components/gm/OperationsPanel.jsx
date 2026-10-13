import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import useGameStore from '../../store/gameStore';

import { SceneManager } from './SceneManager';
import { CirclePage } from './CirclePage';
import { GMCharacterSheet } from './GMCharacterSheet';
import { DiceVault } from '../pc/DiceVault';
import { NotebookView } from '../shared/NotebookView';
import { GMDeskHeader } from './desk/GMDeskHeader';
import { CorrespondenceStack } from './desk/CorrespondenceStack';
import { JoinRequestPopup, useNewRequests } from './desk/JoinRequestPopup';
import { FinalizeRosterSlip, FinalizedSlip } from './desk/FinalizeRosterSlip';
import { CircleFormationStatus } from './desk/CircleFormationStatus';
import { ActiveCircleMembers } from './desk/ActiveCircleMembers';
import { TensionSection } from './desk/TensionSection';
import { FairelandsMap } from './desk/FairelandsMap';
import { CircleLedger } from './desk/CircleLedger';
import { ConnectionBanner } from '../shared/ConnectionBanner';
import { TimerBell } from '../shared/TimerBell';
import { TableStrip } from '../shared/TableStrip';
import { livingMembers } from '../../game/roster';

// The desk's pages (tabs from md, the drawer's first slips on a phone)
const PAGES = ['roster', 'circle', 'archives', 'map', 'requests'];

// The pages with the table (the dice, the log and the notes) beside them
const TABLE_PAGES = ['roster', 'requests', 'circle'];

// Each page's columns from lg: the roster's three (the dispatch, the desk, the table); the
// requests and the circle's file beside the table (the circle's file takes its width from
// xl); the notebook and the map across the desk
const GRID = {
  roster: 'xl:grid-cols-[minmax(17rem,1.3fr)_minmax(0,2.9fr)_minmax(19rem,1.3fr)]',
  requests: 'xl:grid-cols-[minmax(0,4.2fr)_minmax(19rem,1.3fr)]',
};
const CENTER_SPAN = { roster: 'lg:col-span-6', requests: 'lg:col-span-9', circle: 'lg:col-span-9 xl:col-span-full' };

export const OperationsPanel = () => {
  const [activeTab, setActiveTab] = useState('roster');
  // Below md one part of the desk shows at a time, as on the investigator's desk (issue
  // #66.3, decision 2): a page, or one of the papers beside the roster (the dice and log,
  // the pass notes, the dispatch, the hourglass), chosen from the drawer. From md every
  // part of the page shows.
  const [phonePart, setPhonePart] = useState('sheet');
  const current = phonePart === 'sheet' ? activeTab : phonePart;
  const backTo = useRef('roster');
  const [pendingIndex, setPendingIndex] = useState(0);
  const [selectedInvestigator, setSelectedInvestigator] = useState(null);
  const [isFinalizingRoster, setIsFinalizingRoster] = useState(false);
  // The formation papers lie open until the seal (the Lightkeeper may fold them)
  const [showCircleStatus, setShowCircleStatus] = useState(true);
  const [requestError, setRequestError] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');
  // The circle was finalized at this desk just now: its seal is pressed in on the sealed slip
  const [sealedNow, setSealedNow] = useState(false);
  const { logout, setStage, accessSession, lastPlayedCampaign, campaignRoster, fetchRoster, approveInvestigator, rejectInvestigator, releaseMember, connect, socket,
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

  // A request that left the campaign some other way (the player took it back, another tab
  // answered it) leaves no strip to press on its open sheet. The sheet stays open to be read,
  // with a line saying so and only Back to requests, rather than vanishing under the
  // Lightkeeper's eyes (fix round 7, 45.7); one answered at this desk closes as before.
  const answeredHere = useRef(null);
  const [goneId, setGoneId] = useState(null);
  useEffect(() => {
    if (selectedInvestigator?.status !== 'pending') return;
    const waiting = campaignRoster.pending_investigators || [];
    if (waiting.some(p => p.id === selectedInvestigator.id)) return;
    if (answeredHere.current === selectedInvestigator.id) setSelectedInvestigator(null);
    else setGoneId(selectedInvestigator.id);
  }, [campaignRoster.pending_investigators]);

  // A member released at another desk, or whose player left, has no sheet here to show
  useEffect(() => {
    if (selectedInvestigator?.status !== 'active') return;
    const members = campaignRoster.active_investigators || [];
    if (!members.some(m => m.id === selectedInvestigator.id)) setSelectedInvestigator(null);
  }, [campaignRoster.active_investigators]);

  // Releasing a member closes their sheet; the desks follow investigator_released
  const handleRelease = async (characterId) => {
    const result = await releaseMember(characterId);
    if (result.success) {
      setSelectedInvestigator(null);
      fetchRoster(activeCampaignId);
    }
    return result;
  };

  // The store actions resolve to false when the server refused or could not be reached
  const REQUEST_FAILED = 'That did not go through. Check your connection, then try again.';

  // One request at a time, so a double tap cannot approve or reject twice.
  const handleStamp = async (characterId) => {
    if (requestBusy) return false;
    setRequestBusy(true);
    setRequestError('');
    answeredHere.current = characterId;
    const p = approveInvestigator(characterId, activeCampaignId);
    setPendingIndex(0);
    const ok = await p;
    setRequestBusy(false);
    if (ok === false) answeredHere.current = null;
    if (ok === false) setRequestError(`The investigator was not approved. ${REQUEST_FAILED}`);
    return ok !== false;
  };

  const handleReject = async (characterId) => {
    if (requestBusy) return false;
    setRequestBusy(true);
    setRequestError('');
    answeredHere.current = characterId;
    const p = rejectInvestigator(characterId, activeCampaignId);
    setPendingIndex(0);
    const ok = await p;
    setRequestBusy(false);
    if (ok === false) answeredHere.current = null;
    if (ok === false) setRequestError(`The request was not rejected. ${REQUEST_FAILED}`);
    return ok !== false;
  };

  const handleFinalizeRoster = async () => {
    if (isFinalizingRoster) return;
    setIsFinalizingRoster(true);
    setFinalizeError('');
    const ok = await finalizeRoster(activeCampaignId, circle?.id || 1);
    setIsFinalizingRoster(false);
    if (ok) setSealedNow(true);
    else setFinalizeError(`The circle was not finalized. ${REQUEST_FAILED}`);
  };

  const handleSelectInvestigator = (inv) => setSelectedInvestigator(inv);

  // Choosing a page or a part closes the sheet that was open, so the Roster tab brings back
  // the roster, not the last sheet (playtest, section-hides-table-column)
  const chooseTab = (tab) => { setActiveTab(tab); setPhonePart('sheet'); setSelectedInvestigator(null); };
  // The die and back again keep a sheet that was open, as the player's keeps its tab
  const showPart = (id) => {
    const back = id === 'back';
    if (back) id = backTo.current;
    else if (id === 'dice' && current !== 'dice') backTo.current = current;
    if (back && PAGES.includes(id)) { setActiveTab(id); setPhonePart('sheet'); }
    else if (PAGES.includes(id)) chooseTab(id);
    else {
      // The dice and the notes lie beside the roster, the requests and the circle's file;
      // the dispatch and the hourglass on the roster's desk
      setPhonePart(id);
      if (!((id === 'dice' || id === 'notes') && TABLE_PAGES.includes(activeTab))) setActiveTab('roster');
    }
    window.scrollTo({ top: 0 });
  };
  const onPhone = (show) => (show ? '' : 'max-md:hidden');

  // Join requests: counted on the Requests tab, and one that comes in while the Lightkeeper
  // is elsewhere pops up (issue #66.1, decision 6)
  const pending = useMemo(() => campaignRoster.pending_investigators || [], [campaignRoster.pending_investigators]);
  const { fresh, markSeen } = useNewRequests(activeCampaignId, pending, current === 'requests');
  const popup = fresh[0];
  const viewRequest = (inv) => { markSeen([inv.id]); chooseTab('requests'); setSelectedInvestigator(inv); };

  // Below lg a new page or an opened sheet would start where the page was scrolled to, off
  // screen. Bring the top of the desk back into view.
  const mainRef = useRef(null);
  const firstView = useRef(true);
  useEffect(() => {
    if (firstView.current) { firstView.current = false; return; }
    if (!mainRef.current || !window.matchMedia('(max-width: 1023.98px)').matches) return;
    const top = mainRef.current.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top });
  }, [activeTab, selectedInvestigator?.id]);

  const onRoster = activeTab === 'roster';
  const sheetOpen = (onRoster || activeTab === 'requests') && selectedInvestigator;
  const withTable = TABLE_PAGES.includes(activeTab);

  return (
    // overflow-x-clip: as on the player's desk, the page is never wider than the screen
    <div className="min-h-screen overflow-x-clip xl:h-[100dvh] xl:min-h-0 xl:flex xl:flex-col xl:overflow-hidden bg-gm-night text-cream font-serif bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')] pb-12 xl:pb-0 relative">

      {/* Held at the top of the screen from md; below md it hangs under the slim band */}
      <ConnectionBanner className="max-md:hidden sticky top-0 z-[850]" />
      {/* The timer's chime and its words, on every page of the desk (TimerBell.jsx) */}
      <TimerBell />
      <GMDeskHeader
        activeCampaignId={activeCampaignId} campaignName={activeCampaignName} campaignCode={activeCampaignCode} setStage={setStage}
        activeTab={activeTab} onTab={chooseTab} phoneCurrent={current} onPhonePart={showPart}
        requestCount={pending.length}
        phoneBelow={<>
          <ConnectionBanner className="md:hidden relative" />
          {/* Phones: the tension, the timer and the newest log line ride under the band
              wherever the Lightkeeper is (the hourglass itself is on its own page) */}
          {current !== 'watch' && <TableStrip withLog className="md:hidden" />}
        </>}
      />

      {/* Below lg the roster's three columns dissolve (display: contents) into one column,
          ordered by how often the Lightkeeper reaches for each part during play: dice and
          log, tension, the dispatch, then the circle's investigators and Finalize. At lg the
          desk scrolls as a page. From xl it fits the screen (owner's item 24): the desk fills
          the width, every column is as tall as the window, and a column whose papers run
          longer scrolls inside itself. */}
      <main ref={mainRef} className="max-w-[1500px] 2xl:max-w-[1840px] mx-auto p-4 mt-2 lg:mt-6 xl:max-w-none 2xl:max-w-none xl:w-full xl:mx-0 xl:mt-0 xl:px-5 2xl:px-8 xl:pt-4 xl:pb-3 xl:flex-1 xl:min-h-0 xl:flex xl:flex-col">
        {/* Where the hourglass and the timer are out of sight (an open sheet, the circle,
            notebook, map and requests), the strip keeps the tension, the clock and the
            newest log line in view, across the top of the desk (on a phone it rides under
            the band) */}
        {!(onRoster && !selectedInvestigator) && (
          <TableStrip withLog gm className="max-md:hidden mb-4 xl:mb-3 rounded-sm shadow-md xl:shrink-0" />
        )}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-x-6 2xl:gap-x-8 items-start xl:items-stretch xl:flex-1 xl:min-h-0 ${GRID[activeTab] || 'xl:grid-cols-1'}`}>

          {/* LEFT PANEL: the dispatch letter, beside the roster */}
          {onRoster && (
            <div className={`order-3 lg:order-none lg:col-span-3 xl:col-span-1 flex flex-col gap-6 xl:gap-4 xl:min-h-0 xl:overflow-y-auto xl:overflow-x-hidden xl:-mx-3 xl:px-3 xl:pt-3 xl:pb-3 custom-scrollbar ${onPhone(current === 'dispatch')}`}>
              <SceneManager />
            </div>
          )}

          {/* CENTER PANEL */}
          <div data-desk="gm-center" className={`max-lg:contents ${CENTER_SPAN[activeTab] || 'lg:col-span-12'} xl:col-span-1 xl:min-h-0 ${
            activeTab === 'archives' || activeTab === 'map' ? '' : 'xl:overflow-y-auto custom-scrollbar'}`}>
            {sheetOpen && (
              <div className={onPhone(phonePart === 'sheet')}>
              <AnimatePresence mode="wait">
                <GMCharacterSheet
                  key={selectedInvestigator.id}
                  character={selectedInvestigator}
                  onClose={() => setSelectedInvestigator(null)}
                  backLabel={activeTab === 'requests' ? 'Back to requests' : 'Back to roster'}
                  // a request's sheet carries the decision, and closes once it is made
                  onApprove={async (id) => { if (await handleStamp(id)) setSelectedInvestigator(null); }}
                  onReject={async (id) => { if (await handleReject(id)) setSelectedInvestigator(null); }}
                  onRelease={handleRelease}
                  busy={requestBusy}
                  error={requestError}
                  closed={goneId === selectedInvestigator.id}
                />
              </AnimatePresence>
              </div>
            )}

            {onRoster && !selectedInvestigator && (
              // The roster is not a panel: its objects lie on the desk itself. From xl the
              // investigators' business cards lie at the top, two across (three where there
              // is room); under them the Finalize slip and the formation papers, or the
              // sealed slip, with the circle's ledger card running to the foot of the desk.
              // The hourglass stands in a column of its own beside them all, from the top of
              // the desk, and stays there while the column scrolls (sticky): its − and + and
              // the countdown under it are in view however many cards there are and however
              // long the ledger runs. Under the cards, as it stood before, the countdown
              // started below the fold once the cards took a second row (four investigators
              // at 1366 by 768). The desk is at least the column's height and grows with its
              // papers (the column scrolls): a ledger card with many members runs on past the
              // foot instead of spilling out of its paper. The join requests and Invite
              // player are on the Requests page (issue #66.1).
              <div className={`max-lg:contents p-2 lg:min-h-[850px] xl:min-h-full flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_13.5rem] 2xl:grid-cols-[minmax(0,1fr)_16rem] xl:gap-x-8 xl:gap-y-5 xl:px-2 xl:pt-1 xl:pb-2 ${
                rosterFinalized ? 'xl:grid-rows-[auto_auto_1fr]' : 'xl:grid-rows-[auto_minmax(0,1fr)]'}`}>

                {!rosterFinalized && (
                  <div className={`order-5 lg:order-none xl:row-start-2 xl:col-start-1 min-w-0 flex flex-col gap-8 xl:gap-5 ${onPhone(current === 'roster')}`}>
                    {/* Finalize Roster slip */}
                    <FinalizeRosterSlip
                      handleFinalizeRoster={handleFinalizeRoster}
                      isFinalizingRoster={isFinalizingRoster}
                      campaignRoster={campaignRoster}
                      circleCreation={circleCreation}
                      error={finalizeError}
                    />

                    {/* The formation papers as they stand on the players' desks */}
                    <CircleFormationStatus
                      showCircleStatus={showCircleStatus}
                      setShowCircleStatus={setShowCircleStatus}
                      circleCreation={circleCreation}
                    />
                  </div>
                )}

                {/* ACTIVE CIRCLE MEMBERS */}
                <ActiveCircleMembers className={`order-4 lg:order-none xl:row-start-1 xl:col-start-1 ${onPhone(current === 'roster')}`} campaignRoster={campaignRoster} onSelect={handleSelectInvestigator} />

                {/* Once finalized, the sealed slip below the investigators, and the circle's
                    ledger card under it */}
                {rosterFinalized && (
                  <div className={`order-5 lg:order-none xl:row-start-2 xl:col-start-1 xl:w-full xl:max-w-[40rem] flex flex-col gap-3 ${onPhone(current === 'roster')}`}>
                    <FinalizedSlip pressed={sealedNow} />
                  </div>
                )}
                {rosterFinalized && (
                  <CircleLedger className="hidden xl:block xl:row-start-3 xl:col-start-1" onOpen={() => chooseTab('circle')} />
                )}

                {/* TENSION CLOCK: standing beside them on desktop, right after the dice on
                    tablets, on its own page on phones */}
                <TensionSection className={`order-2 lg:order-none xl:col-start-2 xl:row-span-full xl:mt-0 xl:self-start xl:sticky xl:top-3 ${onPhone(current === 'watch')}`} />


              </div>
            )}
            {activeTab === 'requests' && !selectedInvestigator && (
              // The join requests, one at a time, and Invite player under them (on a phone,
              // out of sight while the dice or the notes are in front, as the roster is)
              <div className={`lg:min-h-[600px] xl:min-h-0 p-2 xl:px-2 xl:pt-1 xl:pb-2 w-full max-w-[40rem] mx-auto ${onPhone(current === 'requests')}`}>
                <CorrespondenceStack
                  campaignRoster={campaignRoster}
                  pendingIndex={pendingIndex}
                  setPendingIndex={setPendingIndex}
                  handleStamp={handleStamp}
                  handleReject={handleReject}
                  onView={handleSelectInvestigator}
                  campaignCode={activeCampaignCode}
                  error={requestError}
                  busy={requestBusy}
                />
              </div>
            )}
            {activeTab === 'circle' && <div className={onPhone(current === 'circle')}><CirclePage /></div>}
            {activeTab === 'archives' && (
              <div className="max-lg:contents lg:min-h-[850px] xl:min-h-0 xl:h-full xl:p-1">
                <NotebookView isGM={true} fit />
              </div>
            )}
            {activeTab === 'map' && (
              <FairelandsMap />
            )}
          </div>

          {withTable && (
            <div className={`${onRoster ? 'order-1' : ''} lg:order-none lg:col-span-3 xl:col-span-1 xl:min-h-0 ${activeTab === 'circle' ? 'xl:hidden' : ''}`}>
              {/* The Lightkeeper's dice in their real colors: felt, wood, gold gilded dice.
                  The tray, the log and the notes lie on the desk, no panel around them. On a
                  phone the dice and log, or the notes, show on their own page. */}
              <div className="xl:h-full xl:flex xl:flex-col xl:pt-1">
                <div className="xl:flex-1 xl:min-h-0">
                  <DiceVault showGmControls logEntries={activityLog} playerList={livingMembers(campaignRoster.active_investigators)} phonePart={current} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* A join request that came in while the Lightkeeper was elsewhere (issue #66.1) */}
      {popup && current !== 'requests' && (
        <JoinRequestPopup
          request={popup}
          campaignRoster={campaignRoster}
          more={fresh.length - 1}
          onApprove={handleStamp}
          onReject={handleReject}
          onView={viewRequest}
          onLater={() => markSeen([popup.id])}
          onAll={() => { markSeen(fresh.map(p => p.id)); chooseTab('requests'); }}
          busy={requestBusy}
          error={requestError}
        />
      )}
      <p role="status" className="sr-only">{popup && current !== 'requests' ? `Join request from ${popup.name || 'an investigator'}.` : ''}</p>
    </div>
  );
};
