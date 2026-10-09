import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiFetch, configureApiAuth, WS_CLOSE_UNAUTHENTICATED } from '../utils/api';
import { playRollSound, playDiceTumble, playTensionTick } from '../game/rollSounds';

// Reconnecting after a dropped connection. The server closes an older socket on the same
// channel with 1001 when a newer one opens (another tab or device), so 1001 never
// reconnects by itself: two tabs would keep closing each other. 4401 logs out; 4403 and
// 4404 mean this channel is not the user's, which retrying will not change.
const WS_CLOSE_REPLACED = 1001;
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000];
let reconnectTimer = null;
let reconnectAttempts = 0;
// The hourglass's tension as this socket last saw it ({ id, value } of the circle), so
// a change can tick. The first circle after a (re)connect only sets it, so opening a desk
// or reconnecting never ticks for a change made while away.
let tensionSeen = null;

// A roll is never left hanging. One that cannot be sent waits for a connection that is
// on its way back (sent when the new socket opens) or is refused; one that was sent
// waits ROLL_REPLY_MS for its result. No answer on an open socket means the socket is
// dead (a phone that slept keeps it "open" for a while), so the desk opens a new one.
// A roll that was sent may have reached the table, so it is never called "not thrown":
// it carries a roll_id, and goes again with the same id on the new socket, where the
// server answers a roll it has already made with that roll's result (playtest,
// offline-roll-double: rolling again as told rolled twice). After ROLL_WAIT_MS with no
// answer the tray gives up and says the roll may have counted.
const ROLL_REPLY_MS = 6000;
const ROLL_QUEUE_MS = 10000;
const ROLL_WAIT_MS = 30000;
const ROLL_NOT_SENT = 'Not connected to the table, so no dice were thrown. Roll again once the desk is back.';
const ROLL_LOST = 'The table has not answered. The roll may have counted, so check the log before you roll again.';
const ROLL_DROPPED = 'The connection dropped before the dice came back. Roll again once the desk is back.';
const ROLL_FAILED = 'The table could not make that roll. Roll again.';
const ROLL_REFUSED = 'The table refused that roll.';
const KEEP_NOT_SENT = 'Not connected to the table, so the kept die was not sent. Keep it again once the desk is back.';
let rollTimer = null;
let queuedRoll = null;   // the roll frame waiting for the socket to open
let sentRoll = null;     // the roll frame sent at least once, waiting for its result
let sentRollGiveUpAt = 0; // when the tray stops waiting for sentRoll
let answeredRollId = null; // the roll_id of the last result shown, so a late copy is ignored
const newRollId = () => globalThis.crypto?.randomUUID?.()
  ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let rollSeq = 0;         // the id each roll_result's roll is given on this desk
let offerSeq = 0;        // the id each ability offer is given, so each gets its own countdown
let scarFormSeq = 0;     // the id each scar form is opened with, so a new one starts blank
const nextScarForm = () => { scarFormSeq += 1; return scarFormSeq; };

// Ability offers wait their turn: one is shown, the rest queue behind it (an ally's
// intercept offer used to replace a soak offer that held this investigator's own mark,
// which was then never answered). A new offer holding this investigator's own mark
// replaces an old one, whose mark the server has already landed.
const holdsOwnMark = (offer) => !!offer && !offer.intercept && (offer.action === 'soak' || offer.action === 'escape');
// Let Them In answers "1 or more Bleed marks" (p. 27): several marks from one harm ask once
const asksLetThemIn = (offer, other) => !!offer && !!other && offer.ability === 'Let Them In'
  && other.ability === 'Let Them In' && offer.character_id === other.character_id;
const queueOffer = (state, offer) => {
  if ([state.abilityMarkOffer, ...state.abilityMarkQueue].some(o => asksLetThemIn(offer, o))) return {};
  if (!state.abilityMarkOffer) return { abilityMarkOffer: offer };
  if (holdsOwnMark(offer) && holdsOwnMark(state.abilityMarkOffer)) return { abilityMarkOffer: offer };
  return { abilityMarkQueue: [...state.abilityMarkQueue, offer] };
};
const nextOffer = (state) => ({ abilityMarkOffer: state.abilityMarkQueue[0] || null, abilityMarkQueue: state.abilityMarkQueue.slice(1) });

const clearRollTimer = () => { clearTimeout(rollTimer); rollTimer = null; };

// The number of the circle's assignment, which End Assignment moves on (backend
// vtt/assignment.py); 1 before the first
export const assignmentOf = (circle) => {
  const n = circle?.backstory_answers?.assignment;
  return Number.isInteger(n) && n > 0 ? n : 1;
};

// A report the table has not answered within this long is not sent, as far as the form knows
const REPORT_REPLY_MS = 8000;
const REPORT_NO_REPLY = 'The table did not answer. If the stamp does not show, send the report again.';

// The roll did not go through: the tray goes back to idle and says so
const failRoll = (set, message) => {
  clearRollTimer();
  queuedRoll = null;
  sentRoll = null;
  set({ isRolling: false, rollWaiting: false, rollError: message });
};

// A sent roll with no answer yet waits for the next socket, which sends it again with
// its roll_id, until ROLL_WAIT_MS after it first went
const waitToResend = (set, frame) => {
  clearRollTimer();
  queuedRoll = frame;
  set({ rollWaiting: true });
  rollTimer = setTimeout(() => {
    rollTimer = null;
    if (queuedRoll === frame) failRoll(set, ROLL_LOST);
  }, Math.max(0, sentRollGiveUpAt - Date.now()));
};

// A roll that left this desk and has no answer, when its socket closes or is replaced
const sentRollUnanswered = (get) => !queuedRoll && !!sentRoll && get().isRolling;

const sendRoll = (set, get, frame) => {
  const { socket } = get();
  clearRollTimer();
  queuedRoll = null;
  try {
    socket.send(JSON.stringify(frame));
  } catch {
    // Not sent this time; a roll sent before may still have reached the table
    failRoll(set, sentRoll === frame ? ROLL_LOST : ROLL_NOT_SENT);
    return;
  }
  if (sentRoll !== frame) {
    sentRoll = frame;
    sentRollGiveUpAt = Date.now() + ROLL_WAIT_MS;
  }
  set({ rollWaiting: false });
  rollTimer = setTimeout(() => {
    rollTimer = null;
    if (!get().isRolling || sentRoll !== frame) return;
    if (Date.now() >= sentRollGiveUpAt) { failRoll(set, ROLL_LOST); return; }
    waitToResend(set, frame);
    get().reconnect();
  }, ROLL_REPLY_MS);
};

// The server's own words for a refused request (its string detail), or null
const errorDetail = async (res) => {
  try {
    const { detail } = await res.json();
    return typeof detail === 'string' ? detail : null;
  } catch {
    return null;
  }
};

// A delete or an undo from the roster book (docs/refactor/DELETION.md). Resolves to
// { success, status, detail } plus the server's answer.
const deletionRequest = async (path, method) => {
  try {
    const res = await apiFetch(path, { method });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { success: true, status: res.status, ...body };
    return { success: false, status: res.status, detail: body.detail || 'Unknown error' };
  } catch (err) {
    return { success: false, status: 0, detail: err.message };
  }
};

// Whether this socket serves the GM desk (the GM's socket is opened on the campaign's code)
const onGmDesk = (get) => {
  const { lastPlayedCampaign, socketGameId } = get();
  return lastPlayedCampaign?.type === 'gm' && socketGameId != null &&
    String(socketGameId) === String(lastPlayedCampaign.campaignCode);
};

// A member's whole sheet on its roster card (the roster names the role role_class)
const sheetOnCard = (card, sheet) => ({ ...card, ...sheet, role_class: sheet.role });

// A member's whole sheet (member_update) on its roster card, pending or active. A member who
// died keeps the card, flagged is_dead: the Lightkeeper's roster shows the dead as deceased
// cards that still open the sheet, so whatever counts the living leaves them out itself.
const withSheet = (roster, sheet) => {
  const patch = (list) => (Array.isArray(list)
    ? list.map(c => (c.id === sheet.id ? sheetOnCard(c, sheet) : c))
    : list);
  return { ...roster, pending_investigators: patch(roster.pending_investigators),
    active_investigators: patch(roster.active_investigators) };
};

// The characters a campaign delete lets go (the server's deletion.RELEASED_STATUSES);
// retired ones stay with the campaign and are hidden with it.
const RELEASED_STATUSES = ['active', 'pending'];

// What a campaign's deletion changes in the store: the campaign leaves the ledger, the
// user's characters on its roster go back to the registry, its retired ones go with it,
// and a last played record or rejoin invite pointing at it goes.
const withoutCampaign = (state, campaignId, campaignCode) => {
  const taggedIds = state.characters.filter(c => c.campaign_id === campaignId).map(c => c.id);
  const last = state.lastPlayedCampaign;
  const lastWasIt = last && (last.campaignId === campaignId
    || (last.type === 'gm' && last.campaignCode === campaignCode)
    || (last.type === 'player' && taggedIds.includes(last.characterId)));
  return {
    gmCampaigns: state.gmCampaigns.filter(c => c.id !== campaignId),
    characters: state.characters
      .filter(c => c.campaign_id !== campaignId || RELEASED_STATUSES.includes(c.status))
      .map(c => (c.campaign_id === campaignId
        ? { ...c, status: 'unaffiliated', campaign_id: null, campaign_name: null, campaign_code: null }
        : c)),
    lastPlayedCampaign: lastWasIt ? null : last,
    rejoinInvite: state.rejoinInvite?.campaign_id === campaignId ? null : state.rejoinInvite,
  };
};

// Closes this tab's socket when it is open on the channel about to be deleted (the
// server would close it), and returns a function that opens it again, for a delete that
// did not go through. Nothing to reopen when another socket has been opened meanwhile.
const closeSocketOn = (get, channel) => {
  const open = get().socketGameId;
  if (open == null || String(open) !== String(channel)) return () => {};
  get().disconnect();
  return () => {
    if (get().socket == null && get().socketGameId == null) get().connect(open, { keepLog: true });
  };
};

const useGameStore = create(
  persist(
    (set, get) => ({
      // ==========================================
      // APPLICATION ROUTING & STAGE MANAGEMENT
      // ==========================================
      stage: 'LOGIN', // Possible values: 'LOGIN', 'HOME', 'CHARACTER_CREATION', 'DESK', 'GM_DASH'
      setStage: (newStage) => set({ stage: newStage }),

      // ==========================================
      // GLOBAL GAME STATE
      // ==========================================
      accessSession: null,
      socket: null,
      socketGameId: null,        // the channel the socket was opened for (character id or campaign code)
      // 'idle' | 'connecting' | 'open' | 'reconnecting' | 'replaced' | 'refused'
      connectionState: 'idle',
      character: null,
      characters: [],          // all characters belonging to the logged-in user
      gmCampaigns: [],         // campaigns the user manages as GM
      lastPlayedCampaign: null, // { type:'player'|'gm', characterId?, campaignCode, campaignName }
      circle: null,
      lastRoll: null,
      // The server's result for the die kept in this desk's last gilded choice (roll_kept):
      // { rollId, index, is_gilded, value, outcome, seq }
      lastRollKept: null,
      // The latest roll by someone else at the table, as its dice started tumbling there
      // (the server's dice_thrown); the GM's tray shows it. { roll, kept, name, ink_color,
      // action, rating, character_id }
      tableRoll: null,
      pendingGildedChoice: null,
      showScarModal: false,
      scarModalData: null,
      pendingScar: null,         // { type, characterId }: a scar the player chose to decide later
      scarError: null,           // why the server refused the last scar sent (the form reopens)
      scarSent: null,            // { scarModalData, pendingScar } of the scar last sent
      isRolling: false,
      rollWaiting: false,        // the roll waits for the connection to come back
      rollError: null,           // why the last roll (or kept die) did not go through
      dismissedPrompts: [],      // post-roll ability prompts used or skipped on the last roll (kept here, so the Notebook trip does not bring them back)
      postRollTried: null,       // the post-roll ability last sent, taken back from dismissed if the server refuses it
      campaignRoster: { pending_investigators: [], active_investigators: [] },
      // The GM desk: the latest sheet of each roster character, by id, as member_update
      // brought it (the open GMCharacterSheet follows it)
      memberSheets: {},
      // The GM desk: counts the times its socket opened again after a drop. Nothing reached
      // the desk meanwhile, so the roster loads again, and so does an open sheet (it reads this)
      memberResync: 0,
      notebookEntries: [],
      notebookLoadError: false,
      lastActivityLog: null,
      activityLog: [],
      pendingRoll: null,         // { action, driveSpend } — set before roll to show spend selector
      pendingRollMods: [],       // active ability modifier chip keys for the current pending roll
      abilityMarkOffer: null,    // { ability, mark_type, character_id, options?, intercept?, seq } — mark intercept prompt
      abilityMarkQueue: [],      // offers waiting behind the one shown
      abilityUseError: null,     // why the server refused an ability used outside a roll
      circleAdvancement: null,   // { circle } — set when GM advances; triggers player modal
      advancementDeferred: false, // the player chose "Later" on the advancement dialog
      advancementError: null,     // why the server refused an advancement pick
      gmSheetRefusal: null,       // { action, detail, at }: a mark or scar correction the server refused
      circleRefusal: null,        // { detail, at }: a gm_update_circle the server refused (the dispatch says so)
      // The assignment report form: the ticks not sent yet, by character id, with the
      // assignment they belong to ({ assignment, evalQ, keyChecks }), kept across tabs and
      // reloads (playtest, key-ticks-lost); whether a report is on its way; why the server
      // refused the last one
      reportDrafts: {},
      reportSending: false,
      reportError: null,
      pendingRelationshipIntro: null, // { newCharacter, allActiveCharacters } — mid-campaign join
      rejoinInvite: null,             // { campaign_id, campaign_name, campaign_code }
      hubNotice: null,                // a line the hub shows once, such as a deleted campaign
      circleCreation: {
        isVisible: false,
        circleId: null,
        votes: { name_suggest: [], name_vote: [], ability: [], question: [], insignia: [] },
        backstoryAnswers: { selected_question: '', chapter_house: '' },
        relationships: [],
        activeInvestigators: [],
        reports: {},
      },

      // Automatically route to HOME on successful login, or back to LOGIN if session is cleared
      setAccessSession: (session) => {
        set({
          accessSession: session,
          stage: session ? 'HOME' : 'LOGIN',
          rejoinInvite: session?.pendingRejoinInvite || null,
        });
      },

      // Safely close the connection and wipe the local session data
      logout: () => {
        get().disconnect();

        set({
          accessSession: null,
          pendingScar: null,
          showScarModal: false,
          scarModalData: null,
          scarError: null,
          scarSent: null,
          reportDrafts: {},
          reportSending: false,
          reportError: null,
          character: null,
          characters: [],
          gmCampaigns: [],
          lastPlayedCampaign: null,
          circle: null,
          socket: null,
          memberSheets: {},
          notebookEntries: [],
          lastActivityLog: null,
          pendingRoll: null,
          circleAdvancement: null,
          pendingRelationshipIntro: null,
          rejoinInvite: null,
          stage: 'LOGIN',
          circleCreation: {
            isVisible: false,
            votes: { name_suggest: [], name_vote: [], ability: [], question: [], insignia: [] },
            backstoryAnswers: { selected_question: '', chapter_house: '' },
            relationships: [],
            activeInvestigators: [],
            reports: {},
          },
        });
      },

      // ==========================================
      // WEBSOCKET CONNECTION & EVENT HANDLERS
      // ==========================================
      // Close the current socket on purpose: its handlers go first, so the close neither
      // logs out nor schedules a reconnect, and a late frame from it cannot change state.
      disconnect: () => {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        reconnectAttempts = 0;
        const { socket } = get();
        if (socket) {
          socket.onopen = null;
          socket.onclose = null;
          socket.onmessage = null;
          socket.onerror = null;
          try { socket.close(1000); } catch { /* already closed */ }
        }
        clearRollTimer();
        queuedRoll = null;
        sentRoll = null;
        set({ socket: null, socketGameId: null, connectionState: 'idle', isRolling: false, rollWaiting: false, rollError: null });
      },

      // Open the same channel again. The server fixes a socket's campaign when it opens, so
      // after a join, a rejection or a retirement only a new socket sees the new state.
      reconnect: () => {
        const { socketGameId } = get();
        if (socketGameId == null) return;
        get().connect(socketGameId, { keepLog: true });
      },

      connect: (gameId, { keepLog = false } = {}) => {
        // One socket at a time: an older one would keep writing its own character into the store.
        const { socket: previous } = get();
        if (previous) {
          previous.onopen = null;
          previous.onclose = null;
          previous.onmessage = null;
          previous.onerror = null;
          try { previous.close(1000); } catch { /* already closed */ }
        }
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
        tensionSeen = null;
        if (keepLog) {
          // The same desk again: a roll waiting to be sent goes out on the new socket, and
          // so does one sent on the old socket with no answer, with the same roll_id
          if (sentRollUnanswered(get)) waitToResend(set, sentRoll);
          else if (!queuedRoll && get().isRolling) failRoll(set, ROLL_DROPPED);
        } else {
          clearRollTimer();
          queuedRoll = null;
          sentRoll = null;
          set({ activityLog: [], lastActivityLog: null, isRolling: false, rollWaiting: false, rollError: null, pendingRoll: null, tableRoll: null, memberSheets: {} });
        }
        const apiBase = import.meta.env.VITE_API_URL || '';
        const wsProtocol = (apiBase.startsWith('https') || window.location.protocol === 'https:') ? 'wss:' : 'ws:';
        const wsHost = apiBase ? apiBase.replace(/^https?:\/\//, '') : window.location.host;
        // Browsers cannot set headers on a WebSocket, so the login token goes in the query string.
        const token = get().accessSession?.token || '';
        const wsUrl = `${wsProtocol}//${wsHost}/ws/${gameId}?token=${encodeURIComponent(token)}`;

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          reconnectAttempts = 0;
          if (get().socket !== socket) return;
          set({ connectionState: 'open' });
          if (queuedRoll) sendRoll(set, get, queuedRoll);
          // The GM desk opened again (a drop, a laptop waking, "Use this tab"): the members'
          // changes made while it was down never came, so what it shows loads again
          if (keepLog && onGmDesk(get)) {
            set(state => ({ memberResync: state.memberResync + 1 }));
            const { lastPlayedCampaign, accessSession } = get();
            get().fetchRoster(lastPlayedCampaign.campaignId ?? accessSession?.campaignId, { keep: true });
          } else if (keepLog && get().character?.campaign_id) {
            // A player's desk: a death or a revival (member_status) that came while it was
            // down is in the roster, which its circle's cards and ally pickers read
            get().fetchRoster(get().character.campaign_id, { keep: true });
          }
        };
        socket.onerror = (err) => console.error("WebSocket connection error:", err);
        socket.onclose = (event) => {
          if (get().socket !== socket) return;
          // 4401: the token is missing, expired or no longer valid. Back to the login screen.
          if (event.code === WS_CLOSE_UNAUTHENTICATED) { get().logout(); return; }
          // A roll waiting to be sent, or sent with no answer, waits on only while the desk
          // reconnects by itself; the sent one goes again with its roll_id
          const closesForGood = event.code === WS_CLOSE_REPLACED || event.code === 4403 || event.code === 4404;
          if (closesForGood && (queuedRoll || sentRollUnanswered(get))) failRoll(set, sentRoll ? ROLL_LOST : ROLL_NOT_SENT);
          else if (sentRollUnanswered(get)) waitToResend(set, sentRoll);
          else if (!queuedRoll && get().isRolling) failRoll(set, ROLL_DROPPED);
          if (event.code === WS_CLOSE_REPLACED) { set({ connectionState: 'replaced' }); return; }
          if (event.code === 4403 || event.code === 4404) { set({ connectionState: 'refused' }); return; }
          // Anything else is a dropped connection (sleep, network change, server restart).
          set({ connectionState: 'reconnecting' });
          const delay = RECONNECT_DELAYS_MS[Math.min(reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)];
          reconnectAttempts += 1;
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (get().socket === socket) get().connect(gameId, { keepLog: true });
          }, delay);
        };

        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);

          // Returns the campaign id for the current session (player or GM)
          const activeCampaignId = () => {
            const { lastPlayedCampaign, accessSession } = get();
            return lastPlayedCampaign?.campaignId ?? accessSession?.campaignId ?? null;
          };

          // Guard: reject messages that carry a campaign_id not matching this session
          const isForThisCampaign = (payload) => {
            if (payload?.campaign_id == null) return true; // no scoping in payload — allow
            const mine = activeCampaignId();
            return mine == null || payload.campaign_id === mine;
          };

          if (message.type === 'character_update') {
            const incoming = message.payload;
            const prevChar = get().character;
            set({ character: incoming });
            // A pending scar that was recorded elsewhere (another tab) must not be recorded twice.
            const waiting = get().pendingScar;
            if (waiting && incoming?.id === waiting.characterId && waiting.scarsAtTrigger != null &&
                (incoming.scars_count ?? 0) > waiting.scarsAtTrigger) {
              set({ pendingScar: null, showScarModal: false, scarModalData: null });
            }
            // If this player is now active and the circle isn't finalized, fetch creation state
            if (incoming.status === 'active' && incoming.campaign_id) {
              const { circle, circleCreation } = get();
              if (!circle?.is_finalized && !circleCreation.isVisible) {
                get().fetchCircleCreationState(incoming.campaign_id);
              }
            }
            // A line when the character drops incapacitated or dies. Incapacitated is not
            // death (rulebook p. 14): it said "is deceased" for both, and said nothing when
            // an incapacitated investigator then died
            const becameDead = incoming.is_dead === true && !prevChar?.is_dead;
            const becameDown = incoming.incapacitated === true && !prevChar?.incapacitated && !incoming.is_dead;
            if (becameDead || becameDown) {
              const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
              set(state => ({
                activityLog: [{ text: becameDead ? `${incoming.name} is deceased.` : `${incoming.name} is incapacitated.`, type: 'danger', time, inkColor: incoming.ink_color }, ...state.activityLog].slice(0, 50),
              }));
            }
          }
          else if (message.type === 'circle_update') {
            const next = message.payload;
            const seen = tensionSeen;
            const value = next?.tension_clock ?? 0;
            tensionSeen = next ? { id: next.id, value } : null;
            // End Assignment moves the circle to its next assignment: the reports this desk
            // holds belonged to the one that ended (the server cleared them)
            const prev = get().circle;
            if (prev && next && prev.id === next.id && assignmentOf(prev) !== assignmentOf(next)) {
              set(state => ({ circleCreation: { ...state.circleCreation, reports: {} }, reportError: null }));
            }
            set({ circle: next });
            // The GM turned the tension up or down: the hourglass ticks at every desk, up to the new
            // level on a raise and once on a lowering (End Assignment's reset included)
            if (seen && next && seen.id === next.id && value !== seen.value) playTensionTick(value > seen.value ? value : 1);
          }
          else if (message.type === 'roll_result') {
            // A roll sent twice (a resend after a stall) can be answered twice: the copy
            // of a result this desk has shown is ignored, so the dice do not land again
            const rollId = message.payload.roll_id;
            if (rollId && rollId === answeredRollId) return;
            if (rollId) answeredRollId = rollId;
            sentRoll = null;
            queuedRoll = null;
            // Each roll gets an id here (the server's roll_id is per throw, not per
            // result), so what is keyed on the roll, such as the post-roll ability
            // prompts, sees a new roll as new
            const roll = message.payload.roll ? { ...message.payload.roll, id: ++rollSeq } : message.payload.roll;
            clearRollTimer();
            set({
              lastRoll: roll,
              lastRollKept: null,
              dismissedPrompts: [],
              postRollTried: null,
              tableRoll: null, // this desk's own roll is the newest on its felt
              character: message.payload.character,
              isRolling: false,
              rollWaiting: false,
              rollError: null,
              pendingRoll: null,
              pendingRollMods: [],
              pendingGildedChoice: roll?.needs_gilded_choice
                ? { action: message.payload.action, roll, character_id: message.payload.character_id }
                : null,
            });
            // The dice start tumbling on this desk now; a gilded roll's dice wait, still, for
            // the choice, and tumble when a die is kept (resolveGildedChoice)
            if (roll?.dice && !roll.needs_gilded_choice) playDiceTumble();
          }
          else if (message.type === 'roll_kept') {
            // The server scored the die this desk kept: the outcome slip, the post-roll
            // prompts and the resistance offer read it (DiceVault)
            const p = message.payload || {};
            const { lastRoll } = get();
            if (lastRoll && lastRoll.action === p.action && lastRoll.needs_gilded_choice) {
              set({ lastRollKept: { rollId: lastRoll.id, index: p.index, is_gilded: !!p.is_gilded,
                value: p.value, outcome: p.outcome, seq: ++rollSeq } });
            }
          }
          else if (message.type === 'dice_thrown') {
            // Someone else's dice start tumbling now (their roll landed, or they kept a
            // gilded die): this desk hears them, and the GM's tray shows them. Their log
            // line follows, and its result sound waits for the dice to land.
            const p = message.payload || {};
            const st = get();
            const own = p.character_id == null
              ? st.accessSession?.role === 'GM'
              : p.character_id === st.character?.id;
            if (!own) {
              playDiceTumble();
              if (Array.isArray(p.roll?.dice)) set({ tableRoll: p });
            }
          }
          else if (message.type === 'roll_error') {
            failRoll(set, ROLL_FAILED);
          }
          else if (message.type === 'trigger_scar') {
            set({
              character: message.payload.character,
              showScarModal: true,
              scarModalData: { type: message.payload.mark_type, seq: nextScarForm() },
              scarError: null,
              pendingScar: {
                type: message.payload.mark_type,
                characterId: message.payload.character_id ?? message.payload.character?.id ?? null,
                scarsAtTrigger: message.payload.character?.scars_count ?? 0,
              },
            });
          }
          else if (message.type === 'scene_transition') {
            console.log(`[SCENE SHIFT]: ${message.payload.scene_name} - ${message.payload.description}`);
          }
          else if (message.type === 'action_rejected') {
            // The server refused a message this user may not send; nothing changed on the server.
            console.warn(`Vault refused ${message.payload.action}: ${message.payload.detail}`);
            // The server's reason, such as "Not enough Nerve for that roll."
            if (message.payload.action === 'roll') failRoll(set, message.payload.detail || ROLL_REFUSED);
            // The server keeps the dice of a roll that waits for a die to be kept, and reads
            // the kept die from them; with no roll waiting (a server restart, a second
            // choice) the kept die did not count, and the server's words say to roll again
            if (message.payload.action === 'apply_advancement') {
              set({ advancementError: message.payload.detail || 'That advancement was not applied.' });
            }
            if (message.payload.action === 'resolve_gilded') {
              set({ pendingGildedChoice: null, rollError: message.payload.detail || ROLL_REFUSED });
            }
            if (message.payload.action === 'use_ability') {
              set({ abilityUseError: message.payload.detail || 'That ability was not used.' });
            }
            // A report refused (reports closed, or already filed): the form says why
            if (message.payload.action === 'submit_assignment_report') {
              set({ reportSending: false, reportError: message.payload.detail || 'The report was not filed.' });
              // "Already filed": the filed one, which this desk may not have heard of
              // (its answer was lost), loads so the form shows it
              const campaignId = get().character?.campaign_id;
              if (campaignId) get().fetchCircleCreationState(campaignId);
            }
            // A dispatch (or the hourglass's change) the server refused: nothing of it was
            // saved, and the dispatch's receipt says why
            if (message.payload.action === 'gm_update_circle') {
              set({ circleRefusal: { detail: message.payload.detail || 'That change was not made.', at: Date.now() } });
            }
            // A correction on the Lightkeeper's trauma record: the sheet reloads and says why
            if (message.payload.action === 'gm_update_scars' || message.payload.action === 'gm_update_tension') {
              set({ gmSheetRefusal: { action: message.payload.action, detail: message.payload.detail || 'That change was not made.', at: Date.now() } });
            }
            // A refused scar was not recorded: the form opens again, as it was, with the reason
            if (message.payload.action === 'apply_scar') {
              const sent = get().scarSent;
              const detail = message.payload.detail || 'The scar was not recorded.';
              if (sent) {
                set({ showScarModal: true, scarModalData: sent.scarModalData, pendingScar: sent.pendingScar,
                  scarError: detail, scarSent: null });
              } else {
                set({ abilityUseError: detail });
              }
            }
            // A burn answers a roll of that action; after a server restart there is none
            if (message.payload.action === 'burn_resistance' || message.payload.action === 'use_post_roll_ability') {
              // A refused post-roll ability gets its prompt back, so another ally can be tried
              const tried = message.payload.action === 'use_post_roll_ability' ? get().postRollTried : null;
              set(state => ({
                rollError: message.payload.detail || ROLL_REFUSED,
                dismissedPrompts: tried ? state.dismissedPrompts.filter(k => k !== tried) : state.dismissedPrompts,
                postRollTried: null,
              }));
            }
          }
          else if (message.type === 'notebook_entry') {
            set(state => {
              // An entry this desk holds takes the new copy (a redrawn sketch)
              if (state.notebookEntries.some(e => e.id === message.payload.id)) {
                return { notebookEntries: state.notebookEntries.map(e => (e.id === message.payload.id ? { ...e, ...message.payload } : e)) };
              }
              return { notebookEntries: [...state.notebookEntries, message.payload] };
            });
          }
          else if (message.type === 'activity_log') {
            const payload = message.payload;
            const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            const text = typeof payload === 'string' ? payload : payload.message;
            let logType = 'field';
            if (payload.log_type === 'roll') logType = 'roll';
            else if (payload.log_type === 'chat') logType = 'chat';
            else if (payload.log_type === 'danger') logType = 'danger';
            else if (payload.log_type === 'environment') logType = 'environment';
            const inkColor = (typeof payload === 'object' && payload.ink_color) ? payload.ink_color : null;
            set(state => ({
              lastActivityLog: payload,
              activityLog: [...state.activityLog, { text, type: logType, time, inkColor }].slice(-50),
            }));
            // A roll's final result reaches every desk at the table once, as this line
            if (logType === 'roll') playRollSound(text);
          }
          else if (message.type === 'vote_update') {
            const { vote_type, votes } = message.payload;
            set(state => ({
              circleCreation: {
                ...state.circleCreation,
                votes: { ...state.circleCreation.votes, [vote_type]: votes },
              }
            }));
          }
          else if (message.type === 'backstory_update') {
            const { question_key, answer } = message.payload;
            set(state => ({
              circleCreation: {
                ...state.circleCreation,
                backstoryAnswers: { ...state.circleCreation.backstoryAnswers, [question_key]: answer },
              }
            }));
          }
          else if (message.type === 'relationship_update') {
            set(state => ({
              circleCreation: {
                ...state.circleCreation,
                relationships: message.payload.relationships,
              }
            }));
          }
          else if (message.type === 'personal_answer_update') {
            const { character_id, answer } = message.payload;
            set(state => ({
              character: state.character?.id === character_id
                ? { ...state.character, personal_circle_answer: answer }
                : state.character,
              circleCreation: {
                ...state.circleCreation,
                activeInvestigators: state.circleCreation.activeInvestigators.map(inv =>
                  inv.id === character_id ? { ...inv, personal_circle_answer: answer } : inv
                ),
              },
            }));
          }
          else if (message.type === 'investigator_joined') {
            const { pending_investigators, campaign_code } = message.payload;
            const { lastPlayedCampaign, accessSession } = get();
            const activeCampaignCode = lastPlayedCampaign?.campaignCode || accessSession?.campaignCode;
            if (!campaign_code || campaign_code === activeCampaignCode) {
              set(state => ({
                campaignRoster: {
                  ...state.campaignRoster,
                  pending_investigators: pending_investigators || [],
                },
              }));
            }
          }
          else if (message.type === 'investigator_approved') {
            if (!isForThisCampaign(message.payload)) return;
            const { character: approvedChar, active_investigators } = message.payload;
            set(state => {
              const isMyCharacter = approvedChar?.id === state.character?.id;
              // The members' whole sheets, each on its card as member_update puts it. A rejoin
              // sends this with no roster fetch after it, and the cards lost their role line.
              const cards = [...(state.campaignRoster.pending_investigators || []),
                ...(state.campaignRoster.active_investigators || [])];
              return {
                character: isMyCharacter ? approvedChar : state.character,
                circleCreation: {
                  ...state.circleCreation,
                  activeInvestigators: active_investigators || [],
                  isVisible: isMyCharacter ? true : state.circleCreation.isVisible,
                },
                campaignRoster: {
                  ...state.campaignRoster,
                  active_investigators: (active_investigators || [])
                    .map(sheet => sheetOnCard(cards.find(c => c.id === sheet.id), sheet)),
                },
              };
            });
          }
          else if (message.type === 'investigator_rejected') {
            const { character_id, pending_investigators } = message.payload;
            // This player's socket still carries the campaign it opened with; open a new one.
            if (character_id != null && character_id === get().character?.id &&
                String(get().socketGameId) === String(character_id)) {
              setTimeout(() => get().reconnect(), 0);
            }
            set(state => {
              const isMyCharacter = character_id === state.character?.id;
              return {
                character: isMyCharacter
                  ? { ...state.character, status: 'unaffiliated', campaign_id: null }
                  : state.character,
                characters: state.characters.map(c =>
                  c.id === character_id
                    ? { ...c, status: 'unaffiliated', campaign_id: null }
                    : c
                ),
                campaignRoster: pending_investigators !== undefined
                  ? { ...state.campaignRoster, pending_investigators }
                  : state.campaignRoster,
              };
            });
          }
          else if (message.type === 'roster_finalized') {
            if (!isForThisCampaign(message.payload)) return;
            const rejectedIds = message.payload.rejected_character_ids || [];
            if (get().character?.id != null && rejectedIds.includes(get().character.id) &&
                String(get().socketGameId) === String(get().character.id)) {
              setTimeout(() => get().reconnect(), 0);
            }
            set(state => {
              const myCharId = state.character?.id;
              const iAmRejected = rejectedIds.includes(myCharId);
              return {
                circle: message.payload.circle,
                campaignRoster: { ...state.campaignRoster, roster_finalized: true },
                circleCreation: {
                  ...state.circleCreation,
                  isVisible: false,
                  // keep relationships + activeInvestigators for TactileSidebar flip cards
                },
                character: iAmRejected
                  ? { ...state.character, status: 'unaffiliated', campaign_id: null }
                  : state.character,
                characters: rejectedIds.length > 0
                  ? state.characters.map(c =>
                      rejectedIds.includes(c.id)
                        ? { ...c, status: 'unaffiliated', campaign_id: null }
                        : c
                    )
                  : state.characters,
              };
            });
          }
          else if (message.type === 'assignment_report_submitted') {
            // A report filed: the Lightkeeper's desk and its author's get it. The author's
            // form shows what was filed, and its draft goes.
            const { character_id, character_name, responses, submitted_at } = message.payload;
            const own = character_id === get().character?.id;
            set(state => {
              const drafts = { ...state.reportDrafts };
              if (own) delete drafts[character_id];
              return {
                circleCreation: {
                  ...state.circleCreation,
                  reports: {
                    ...(state.circleCreation.reports || {}),
                    [character_id]: { character_name, responses, submitted_at },
                  },
                },
                ...(own ? { reportDrafts: drafts, reportSending: false, reportError: null } : {}),
              };
            });
          }
          else if (message.type === 'circle_advanced') {
            if (!isForThisCampaign(message.payload)) return;
            set({ circle: message.payload.circle, circleAdvancement: { circle: message.payload.circle }, advancementDeferred: false });
          }
          else if (message.type === 'campaign_retired') {
            if (!isForThisCampaign(message.payload)) return;
            // A player's channel stays open (a GM can still invite them back), on a new
            // socket that no longer carries the retired campaign. The GM's campaign channel
            // closes; opening another campaign connects again.
            const { character: myChar, socketGameId } = get();
            const onCharacterChannel = myChar?.id != null && String(socketGameId) === String(myChar.id);
            setTimeout(() => (onCharacterChannel ? get().reconnect() : get().disconnect()), 0);
            set({ stage: 'HOME', character: null, circle: null, activityLog: [], lastActivityLog: null });
          }
          else if (message.type === 'campaign_deleted') {
            if (!isForThisCampaign(message.payload)) return;
            // Its Lightkeeper deleted the campaign. Back to the hub, which says so. A player's
            // character is in their registry again, and its channel opens again without the
            // campaign; the server closes the Lightkeeper's channel.
            const { campaign_id: id, campaign_code: code, campaign_name: name } = message.payload;
            const { character: myChar, socketGameId } = get();
            const onCharacterChannel = myChar?.id != null && String(socketGameId) === String(myChar.id);
            setTimeout(() => (onCharacterChannel ? get().reconnect() : get().disconnect()), 0);
            set(state => ({
              ...withoutCampaign(state, id, code),
              stage: 'HOME', character: null, circle: null, activityLog: [], lastActivityLog: null,
              hubNotice: onCharacterChannel ? `The Lightkeeper deleted campaign ${name}.` : `Campaign ${name} was deleted.`,
            }));
            get().fetchUserData(get().accessSession?.userId);
          }
          else if (message.type === 'campaign_restored') {
            // The Lightkeeper undid the delete. Sent to every socket of the Lightkeeper and of
            // the owners of the characters it put back, whatever channel it is on, so not
            // campaign-checked. The roster book is read again, so a character it shows as free
            // is back in the campaign (Join and Delete refuse it otherwise). A socket on one
            // of those characters opens again to carry the campaign.
            const { campaign_name: name, restored_character_ids: ids = [] } = message.payload || {};
            const { socketGameId, stage, characters } = get();
            if (socketGameId != null && ids.some(id => String(id) === String(socketGameId))) {
              setTimeout(() => get().reconnect(), 0);
            }
            if (stage === 'HOME' && characters.some(c => ids.includes(c.id))) {
              set({ hubNotice: `The Lightkeeper restored campaign ${name}.` });
            }
            get().fetchUserData(get().accessSession?.userId);
          }
          else if (message.type === 'character_deleted') {
            // This investigator was deleted in another tab; the server closes its channel.
            const id = message.payload?.character_id;
            const name = get().character?.name;
            setTimeout(() => get().disconnect(), 0);
            set(state => ({
              stage: state.stage === 'DESK' ? 'HOME' : state.stage,
              character: state.character?.id === id ? null : state.character,
              characters: state.characters.filter(c => c.id !== id),
              lastPlayedCampaign: state.lastPlayedCampaign?.characterId === id ? null : state.lastPlayedCampaign,
              hubNotice: name ? `${name} was deleted.` : state.hubNotice,
            }));
          }
          else if (message.type === 'ability_mark_offer') {
            set(state => queueOffer(state, { ...message.payload, seq: ++offerSeq }));
          }
          else if (message.type === 'ability_intercept_offer') {
            set(state => queueOffer(state, { ...message.payload, intercept: true, seq: ++offerSeq }));
          }
          else if (message.type === 'gm_rejoin_invite') {
            set({ rejoinInvite: message.payload });
          }
          else if (message.type === 'character_joined_mid_campaign') {
            if (!isForThisCampaign(message.payload)) return;
            const { new_character, active_investigators } = message.payload;
            set(state => ({
              circleCreation: {
                ...state.circleCreation,
                activeInvestigators: active_investigators || [],
              },
              pendingRelationshipIntro: {
                newCharacter: new_character,
                allActiveCharacters: active_investigators || [],
              },
            }));
          }
          else if (message.type === 'portrait_update') {
            // A character's photo changed (its player or the GM set it). It reaches the GM and
            // the circle, so every copy of that character on this desk takes the new photo:
            // the roster's cards, the circle's pinned photos, and the sheet if it is open.
            if (!isForThisCampaign(message.payload)) return;
            const { character_id: id, profile_pic: pic = null } = message.payload || {};
            if (id == null) return;
            const patch = (c) => (c && c.id === id
              ? { ...c, profile_pic: pic, ...('profilePic' in c ? { profilePic: pic } : {}) }
              : c);
            const patchAll = (list) => (Array.isArray(list) ? list.map(patch) : list);
            set(state => ({
              character: patch(state.character),
              characters: patchAll(state.characters),
              campaignRoster: {
                ...state.campaignRoster,
                pending_investigators: patchAll(state.campaignRoster.pending_investigators),
                active_investigators: patchAll(state.campaignRoster.active_investigators),
              },
              circleCreation: {
                ...state.circleCreation,
                activeInvestigators: patchAll(state.circleCreation.activeInvestigators),
              },
            }));
          }
          else if (message.type === 'member_status') {
            // A member died of the fourth scar, or the Lightkeeper lifted that death. A player's
            // roster is read once, when the desk opens, and the circle's cards and the ally
            // pickers leave the dead out (livingMembers), so the card takes the flag now. The
            // server sends it to the players only: the GM desk has member_update.
            if (!isForThisCampaign(message.payload)) return;
            const { character_id: id, is_dead: isDead } = message.payload || {};
            if (id == null) return;
            set(state => ({
              campaignRoster: {
                ...state.campaignRoster,
                active_investigators: Array.isArray(state.campaignRoster.active_investigators)
                  ? state.campaignRoster.active_investigators.map(c => (c.id === id ? { ...c, is_dead: !!isDead } : c))
                  : state.campaignRoster.active_investigators,
              },
            }));
          }
          else if (message.type === 'member_update') {
            // The whole sheet of a character on this campaign's roster, after any change to
            // it (drive, resistance, marks, scars, gear, ability uses, advancement...). The
            // server sends it to the campaign's GM channel only, and only the GM desk takes it.
            // Its roster card takes it (a member who died keeps the card, flagged is_dead),
            // and the open sheet reads memberSheets.
            const sheet = message.payload;
            if (!onGmDesk(get) || sheet?.id == null || !isForThisCampaign(sheet)) return;
            set(state => ({
              memberSheets: { ...state.memberSheets, [sheet.id]: sheet },
              campaignRoster: withSheet(state.campaignRoster, sheet),
            }));
          }
        };

        set(state => ({
          socket,
          socketGameId: gameId,
          // A reconnect keeps the banner up until the new socket opens.
          connectionState: state.connectionState === 'reconnecting' ? 'reconnecting' : 'connecting',
        }));
      },

      // ==========================================
      // USER DATA & SESSION ACTIONS
      // ==========================================
      fetchUserData: async (userId) => {
        if (!userId) return;
        try {
          const [charsRes, campsRes] = await Promise.all([
            apiFetch(`/api/users/${userId}/characters`),
            apiFetch(`/api/users/${userId}/campaigns`),
          ]);
          if (charsRes.ok) set({ characters: await charsRes.json() });
          if (campsRes.ok) set({ gmCampaigns: await campsRes.json() });
        } catch (err) {
          console.error('Failed to fetch user data:', err);
        }
      },

      setLastPlayed: (info) => {
        const updates = { lastPlayedCampaign: info };
        if (info?.type === 'gm') {
          updates.accessSession = { ...(get().accessSession || {}), role: 'GM', campaignId: info.campaignId ?? null };
        } else if (info?.type === 'player') {
          updates.accessSession = { ...(get().accessSession || {}), role: 'PLAYER', campaignId: info.campaignId ?? null };
        }
        set(updates);
      },

      // ==========================================
      // CHARACTER & GAMEPLAY ACTIONS
      // ==========================================
      setLocalCharacter: (characterData) => {
        set({ character: characterData });
      },

      // extra: more of the roll's payload, such as { drive } for Street Smarts
      rollAction: (actionName, driveSpent = 0, isSecret = false, abilityMods = [], extra = {}) => {
        const { socket, pendingGildedChoice, isRolling, connectionState } = get();
        if (pendingGildedChoice || isRolling) return;
        const frame = {
          type: 'roll',
          payload: { ...extra, action: actionName, drive_spent: driveSpent, is_secret: isSecret, ability_mods: abilityMods,
            roll_id: newRollId() }
        };
        set({ lastRoll: null, lastRollKept: null, isRolling: true, rollWaiting: false, rollError: null, dismissedPrompts: [], postRollTried: null });
        if (socket && socket.readyState === WebSocket.OPEN) {
          sendRoll(set, get, frame);
          return;
        }
        // The connection is on its way (opening, or reconnecting after a drop): the roll
        // goes out when the new socket opens, if that is soon
        if (socket && (connectionState === 'connecting' || connectionState === 'reconnecting')) {
          queuedRoll = frame;
          set({ rollWaiting: true });
          clearRollTimer();
          rollTimer = setTimeout(() => {
            rollTimer = null;
            if (queuedRoll === frame) failRoll(set, ROLL_NOT_SENT);
          }, ROLL_QUEUE_MS);
          return;
        }
        failRoll(set, ROLL_NOT_SENT);
      },

      selectRollAction: (action, initialDriveSpend = 0) => set({ pendingRoll: { action, driveSpend: initialDriveSpend }, pendingRollMods: [] }),
      clearPendingRoll: () => set({ pendingRoll: null, pendingRollMods: [] }),
      setPendingDriveSpend: (n) => set(state => ({ pendingRoll: state.pendingRoll ? { ...state.pendingRoll, driveSpend: n } : null })),
      toggleRollMod: (modKey) => set(state => ({
        pendingRollMods: state.pendingRollMods.includes(modKey)
          ? state.pendingRollMods.filter(k => k !== modKey)
          : [...state.pendingRollMods, modKey],
      })),

      burnResistance: (action, driveKey) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'burn_resistance', payload: { action, drive_key: driveKey } }));
        }
      },

      gmResetCharacter: (characterId) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'gm_reset_character', payload: { character_id: characterId, role: 'GM' } }));
        }
      },

      resolveAbilityMark: (ability, choice) => {
        const { socket } = get();
        set(nextOffer);
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'resolve_ability_mark', payload: { ability, choice } }));
        }
      },

      // An ability used outside a roll: the server pays its cost (backend/vtt/ability_uses.py)
      useAbility: (ability, extra = {}) => {
        const { socket } = get();
        set({ abilityUseError: null });
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'use_ability', payload: { ability, ...extra } }));
          return true;
        }
        set({ abilityUseError: 'Not connected. Try again in a moment.' });
        return false;
      },

      // Used or skipped: the prompt is dismissed for this roll, and the last refusal is cleared
      dismissPostRollPrompt: (key) => set(state => ({
        dismissedPrompts: state.dismissedPrompts.includes(key) ? state.dismissedPrompts : [...state.dismissedPrompts, key],
        rollError: null,
      })),

      usePostRollAbility: (ability, params = {}) => {
        const { socket } = get();
        set({ postRollTried: ability });
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'use_post_roll_ability', payload: { ability, ...params } }));
        }
      },

      interceptMark: (ability, targetCharacterId, markType) => {
        const { socket } = get();
        set(nextOffer);
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'intercept_mark', payload: { ability, target_character_id: targetCharacterId, mark_type: markType } }));
        }
      },

      dismissAbilityMarkOffer: () => set(nextOffer),

      // A soak or Death Defy offer holds the mark back until it is answered. Declining it
      // (or letting its countdown run out) tells the server, which lets the mark land.
      declineAbilityMark: (offer) => {
        const { socket } = get();
        set(nextOffer);
        if (offer && socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'resolve_ability_mark',
            payload: { ability: offer.ability, choice: 'decline', mark_type: offer.mark_type },
          }));
        }
      },

      resolveGildedChoice: (action, chosenType, chosenValue) => {
        const { socket } = get();
        // The choice stays open until the kept die can reach the table
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          set({ rollError: KEEP_NOT_SENT });
          return false;
        }
        socket.send(JSON.stringify({
          type: 'resolve_gilded',
          payload: { action, chosen_type: chosenType, chosen_value: chosenValue }
        }));
        set({ pendingGildedChoice: null, rollError: null });
        // The kept die decides it: the dice tumble onto the felt now
        playDiceTumble();
        return true;
      },

      updateDrive: (pool, newValue) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'update_drive',
            payload: { pool: pool, value: newValue }
          }));
        }
      },

      // Resolves to whether the mark went out, so the sheet can say when it did not.
      takeMark: (markType) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'take_mark',
            payload: { mark_type: markType }
          }));
          return true;
        }
        return false;
      },

      reviveCharacter: () => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'revive_character', payload: {} }));
        }
      },

      applyScar: (payloadData) => {
        const { socket, scarModalData, pendingScar } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          const outPayload = typeof payloadData === 'string'
            ? { scar_text: payloadData, shift_down: null, shift_up: null }
            : {
                scar_text: payloadData.scar_text,
                shift_down: payloadData.shift_down,
                shift_up: payloadData.shift_up,
                skip_shifts: !!payloadData.skip_shifts,
                // Not Again or Forbidden Ritual (game/abilityUses.js SCAR_ABILITIES)
                ...(payloadData.ability ? { ability: payloadData.ability } : {}),
              };

          socket.send(JSON.stringify({
            type: 'apply_scar',
            payload: outPayload
          }));
          // Kept so that a refusal can open the same form again
          set({ showScarModal: false, scarModalData: null, pendingScar: null, scarError: null,
            scarSent: { scarModalData, pendingScar } });
          return true;
        }
        // Not sent: keep the scar pending and the form open so nothing typed is lost.
        return false;
      },

      sendChat: (target, message) => {
        const { socket, character, accessSession } = get();
        const isGM = accessSession?.role === 'GM';
        const senderName = isGM
          ? 'Lightkeeper'
          : (character?.name || accessSession?.name || 'Unknown');
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'chat_message',
            payload: { sender_name: senderName, target, message },
          }));
          return true;
        }
        return false;
      },

      updateCircle: (updates) => {
        const { socket, accessSession } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'update_circle',
            payload: { ...updates, role: accessSession?.role }
          }));
        }
      },

      updatePenFont: (penFont) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'update_pen_font',
            payload: { pen_font: penFont },
          }));
        }
      },

      spendCircleResource: (resourceType) => {
        const { socket, circle } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'spend_resource',
            payload: { circle_id: circle?.id, resource_type: resourceType },
          }));
        }
      },

      gmToggleResourceEdit: (circleId) => {
        const { socket, accessSession } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'gm_toggle_resource_edit',
            payload: { circle_id: circleId, role: accessSession?.role },
          }));
        }
      },

      gmToggleReports: (circleId) => {
        const { socket, accessSession } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'gm_toggle_reports',
            payload: { circle_id: circleId, role: accessSession?.role },
          }));
        }
      },

      // replace: an amended report, which takes the place of the one filed (the server
      // refuses a second report without it)
      submitAssignmentReport: (circleId, characterId, responses, { replace = false } = {}) => {
        const { socket, reportSending } = get();
        if (reportSending) return false;
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'submit_assignment_report',
            payload: { circle_id: circleId, character_id: characterId, responses, ...(replace ? { replace: true } : {}) },
          }));
          set({ reportSending: true, reportError: null });
          // An answer that never comes (a dead socket) does not lock the form
          setTimeout(() => { if (get().reportSending) set({ reportSending: false, reportError: REPORT_NO_REPLY }); }, REPORT_REPLY_MS);
          return true;
        }
        set({ reportError: 'Not connected to the table, so the report was not sent. Send it again once the desk is back.' });
        return false;
      },

      // The report form's ticks before sending, for this assignment
      setReportDraft: (characterId, draft) => set(state => ({
        reportDrafts: { ...state.reportDrafts, [characterId]: { ...draft, assignment: assignmentOf(state.circle) } },
      })),

      gmAdvanceCircle: (circleId, circleAbility) => {
        const { socket, accessSession } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'gm_advance_circle',
            payload: { circle_id: circleId, circle_ability: circleAbility, role: accessSession?.role },
          }));
        }
        set({ circleAdvancement: null });
      },

      refillResources: (circleId) => {
        const { socket, accessSession } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'refill_resources',
            payload: { circle_id: circleId, role: accessSession?.role },
          }));
        }
      },

      // "Later": the picks stay on the character (advancement_picks) and the dialog comes
      // back with the next advance or the next visit to the desk
      dismissCircleAdvancement: () => set({ circleAdvancement: null, advancementDeferred: true, advancementError: null }),

      // One pick of the circle's advancement; the server checks it (engine.apply_advancement)
      // and answers with the character, or refuses it with its reason (advancementError).
      // The socket's own character is the one advanced.
      applyAdvancement: (choice, detail) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'apply_advancement', payload: { choice, detail } }));
          set({ advancementError: null });
          return true;
        }
        set({ advancementError: 'Not connected to the table, so nothing was chosen. Try again once the desk is back.' });
        return false;
      },

      // ==========================================
      // CAMPAIGN APPROVAL FLOW ACTIONS
      // ==========================================
      // keep: the cards stay on the desk while the roster loads again (the GM desk's socket
      // opened again after a drop)
      fetchRoster: async (campaignId, { keep = false } = {}) => {
        if (!campaignId) return;
        if (!keep) set({ campaignRoster: { pending_investigators: [], active_investigators: [], roster_finalized: false } });
        const sheetsAtFetch = get().memberSheets;
        try {
          const res = await apiFetch(`/campaign/${campaignId}/roster`);
          if (res.ok) {
            const data = await res.json();
            // A member_update that came while the roster loaded is newer than this answer
            set(state => ({
              campaignRoster: Object.entries(state.memberSheets)
                .filter(([id, sheet]) => sheet !== sheetsAtFetch[id])
                .reduce((roster, [, sheet]) => withSheet(roster, sheet), data),
            }));
          }
        } catch (err) {
          console.error("Failed to fetch campaign roster:", err);
        }
      },

      approveInvestigator: async (characterId, campaignId) => {
        try {
          const res = await apiFetch(`/campaign/approve/${characterId}`, { method: 'POST' });
          if (res.ok) {
            await get().fetchRoster(campaignId);
          }
          return res.ok;
        } catch (err) {
          console.error("Failed to approve investigator:", err);
          return false;
        }
      },

      rejectInvestigator: async (characterId, campaignId) => {
        try {
          const res = await apiFetch(`/campaign/reject/${characterId}`, { method: 'POST' });
          if (res.ok) {
            await get().fetchRoster(campaignId);
          }
          return res.ok;
        } catch (err) {
          console.error("Failed to reject investigator:", err);
          return false;
        }
      },

      joinCampaign: async (characterId, code, penFont = 'Caveat') => {
        try {
          const res = await apiFetch(
            `/campaign/join?character_id=${characterId}&code=${encodeURIComponent(code)}&pen_font=${encodeURIComponent(penFont)}`,
            { method: 'POST' }
          );
          if (res.ok) {
            set(state => ({
              character: state.character ? { ...state.character, status: 'pending', pen_font: penFont } : null,
              characters: state.characters.map(c =>
                c.id === characterId ? { ...c, status: 'pending' } : c
              ),
            }));
            // An open socket for this character still carries its old campaign.
            if (String(get().socketGameId) === String(characterId)) get().reconnect();
            return { success: true };
          }
          const err = await res.json().catch(() => ({}));
          return { success: false, status: res.status, detail: err.detail || 'Unknown error' };
        } catch (err) {
          console.error("Failed to join campaign:", err);
          return { success: false, status: 0, detail: err.message };
        }
      },

      refreshCharacterStatus: async (characterId) => {
        try {
          const res = await apiFetch(`/api/investigators/${characterId}`);
          if (res.ok) {
            const char = await res.json();
            set(state => ({ character: { ...state.character, status: char.status } }));
            return char.status;
          }
        } catch (err) {
          console.error("Failed to refresh character status:", err);
        }
        return null;
      },

      // ==========================================
      // NOTEBOOK ACTIONS
      // ==========================================
      fetchNotebookEntries: async (campaignId) => {
        if (!campaignId) return;
        try {
          const { accessSession, character } = get();
          const role = accessSession?.role || 'player';
          // Only a player's own character goes in the query. The GM has none (an empty
          // character_id is a 422 on servers older than the beta), and a character left in
          // the store from playing would show that character's private notes on the GM desk.
          const params = new URLSearchParams({ role });
          if (role !== 'GM' && character?.id != null) params.set('character_id', String(character.id));
          const res = await apiFetch(`/api/notebook/${campaignId}/entries?${params}`);
          if (res.ok) {
            set({ notebookEntries: await res.json(), notebookLoadError: false });
          } else {
            set({ notebookLoadError: true });
          }
        } catch (err) {
          console.error("Failed to fetch notebook entries:", err);
          set({ notebookLoadError: true });
        }
      },

      submitNotebookEntry: async (campaignId, title, content, authorName, authorType, characterId = null, entryType = 'field_log', visibility = 'all', imageData = null) => {
        try {
          const res = await apiFetch(`/api/notebook/${campaignId}/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              content,
              author_name: authorName,
              author_type: authorType,
              character_id: characterId,
              entry_type: entryType,
              visibility,
              image_data: imageData,
            }),
          });
          if (res.ok) {
            const entry = await res.json();
            // The table's socket can bring the same entry back before this reply arrives
            set(state => (state.notebookEntries.some(e => e.id === entry.id)
              ? state : { notebookEntries: [...state.notebookEntries, entry] }));
            return { success: true, entry };
          }
          return { success: false };
        } catch (err) {
          console.error("Failed to submit notebook entry:", err);
          return { success: false };
        }
      },

      updateNotebookEntry: async (entryId, title, content) => {
        try {
          const res = await apiFetch(`/api/notebook/entries/${entryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content }),
          });
          if (res.ok) {
            const entry = await res.json();
            set(state => ({
              notebookEntries: state.notebookEntries.map(e => e.id === entryId ? entry : e),
            }));
            return { success: true, entry };
          }
          return { success: false };
        } catch (err) {
          console.error('Failed to update notebook entry:', err);
          return { success: false };
        }
      },

      // Resolves to true when the server deleted it; the entry stays on the page otherwise.
      deleteEphemeralNote: async (entryId) => {
        try {
          const res = await apiFetch(`/api/notebook/entries/${entryId}`, { method: 'DELETE' });
          if (!res.ok) return false;
          set(state => ({
            notebookEntries: state.notebookEntries.filter(e => e.id !== entryId),
          }));
          return true;
        } catch (err) {
          console.error('Failed to delete note:', err);
          return false;
        }
      },

      // scene: a drawn sketch's Excalidraw scene (JSON text), sent as a file part so the
      // author can open the drawing again (backend vtt/sketch_scenes.py)
      uploadNotebookImage: async (campaignId, file, title, content, authorName, authorType, entryType, characterId = null, scene = null) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('title', title);
          formData.append('content', content || '');
          formData.append('author_name', authorName);
          formData.append('author_type', authorType);
          formData.append('entry_type', entryType);
          if (characterId) formData.append('character_id', String(characterId));
          if (scene) formData.append('scene', new Blob([scene], { type: 'application/json' }), 'scene.json');
          const res = await apiFetch(`/api/notebook/${campaignId}/upload`, { method: 'POST', body: formData });
          if (res.ok) {
            const entry = await res.json();
            set(state => (state.notebookEntries.some(e => e.id === entry.id)
              ? state : { notebookEntries: [...state.notebookEntries, entry] }));
            return { success: true, entry };
          }
          if (res.status === 413) return { success: false, tooLarge: true, detail: await errorDetail(res) };
          return { success: false, detail: await errorDetail(res) };
        } catch (err) {
          console.error('Failed to upload image:', err);
          return { success: false };
        }
      },

      // A drawn sketch's scene, for its author only: { success, scene } (scene parsed)
      fetchSketchScene: async (entryId) => {
        try {
          const res = await apiFetch(`/api/notebook/entries/${entryId}/scene`);
          if (!res.ok) return { success: false, status: res.status };
          return { success: true, scene: await res.json() };
        } catch (err) {
          console.error('Failed to load the drawing:', err);
          return { success: false };
        }
      },

      // The author keeps drawing: the picture (a PNG blob) and the scene are replaced together.
      // Without a scene (a drawing too large to keep) the picture is replaced and the sketch
      // keeps no drawing after it.
      redrawSketch: async (entryId, png, scene) => {
        try {
          const formData = new FormData();
          formData.append('file', png, 'sketch.png');
          if (scene) formData.append('scene', new Blob([scene], { type: 'application/json' }), 'scene.json');
          const res = await apiFetch(`/api/notebook/entries/${entryId}/sketch`, { method: 'PUT', body: formData });
          if (res.ok) {
            const entry = await res.json();
            set(state => ({ notebookEntries: state.notebookEntries.map(e => e.id === entryId ? entry : e) }));
            return { success: true, entry };
          }
          return { success: false, tooLarge: res.status === 413, detail: await errorDetail(res) };
        } catch (err) {
          console.error('Failed to save the drawing:', err);
          return { success: false };
        }
      },

      // ==========================================
      // GM ADMINISTRATIVE ACTIONS
      // ==========================================
      // The Lightkeeper sets a character's marks in one track, 0 to 3 (the GM sheet's Marks
      // row). True when it was sent.
      gmSetMarks: (characterId, markType, newValue) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'gm_update_tension',
            payload: { character_id: characterId, mark_type: markType, value: newValue, role: 'GM' },
          }));
          return true;
        }
        return false;
      },

      // The Lightkeeper rewords or removes a member's scars: the list as it should be, and
      // the list the sheet showed, so a scar taken meanwhile is not lost (the server refuses)
      gmSetScars: (characterId, scars, previous) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'gm_update_scars',
            payload: { character_id: characterId, scars, previous, role: 'GM' },
          }));
          return true;
        }
        return false;
      },

      // "Decide later": the form closes, the scar stays pending (a banner reopens it).
      deferScar: () => set({ showScarModal: false }),
      reopenScar: () => set(state => ({
        showScarModal: true,
        scarModalData: state.scarModalData || (state.pendingScar ? { type: state.pendingScar.type } : null),
      })),
      closeScarModal: () => set({ showScarModal: false }),
      // Not Again or Forbidden Ritual from the sheet: the scar form, for that ability
      openAbilityScar: (ability, type = '') => set({
        showScarModal: true, scarModalData: { type, ability, seq: nextScarForm() }, scarError: null,
      }),
      cancelAbilityScar: () => set({ showScarModal: false, scarModalData: null, scarError: null }),

      // ==========================================
      // CIRCLE CREATION ACTIONS
      // ==========================================
      fetchCircleCreationState: async (campaignId) => {
        if (!campaignId) return;
        try {
          const res = await apiFetch(`/campaign/${campaignId}/circle-creation-state`);
          if (res.ok) {
            const data = await res.json();
            const rawAnswers = data.backstory_answers || {};
            // Reports are persisted inside backstory_answers.reports on the backend
            const persistedReports = rawAnswers.reports || {};
            set(state => ({
              circleCreation: {
                ...state.circleCreation,
                isVisible: !data.is_finalized,
                circleId: data.circle_id || state.circleCreation.circleId,
                votes: data.votes || { name_suggest: [], name_vote: [], ability: [], question: [], insignia: [] },
                backstoryAnswers: rawAnswers,
                relationships: data.relationships || [],
                activeInvestigators: data.active_investigators || [],
                reports: { ...persistedReports, ...state.circleCreation.reports },
              },
            }));
          }
        } catch (err) {
          console.error('Failed to fetch circle creation state:', err);
        }
      },

      submitCircleVote: (circleId, characterId, voteType, value) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'circle_creation_vote',
            payload: { circle_id: circleId, character_id: characterId, vote_type: voteType, value },
          }));
        }
      },

      updateBackstoryAnswer: (circleId, questionKey, answer) => {
        const { socket } = get();
        set(state => ({
          circleCreation: {
            ...state.circleCreation,
            backstoryAnswers: { ...state.circleCreation.backstoryAnswers, [questionKey]: answer },
          }
        }));
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'circle_backstory_update',
            payload: { circle_id: circleId, question_key: questionKey, answer },
          }));
        }
      },

      updatePersonalAnswer: (circleId, characterId, answer) => {
        const { socket } = get();
        set(state => ({
          character: state.character?.id === characterId
            ? { ...state.character, personal_circle_answer: answer }
            : state.character,
        }));
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'circle_personal_answer',
            payload: { circle_id: circleId, character_id: characterId, answer },
          }));
        }
      },

      proposeRelationship: (circleId, fromCharId, toCharId, relType, lore) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'circle_relationship_propose',
            payload: { circle_id: circleId, from_character_id: fromCharId, to_character_id: toCharId, rel_type: relType, lore },
          }));
        }
      },

      respondToRelationship: (relationshipId, action, counterType = null, counterLore = null) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'circle_relationship_respond',
            payload: { relationship_id: relationshipId, action, counter_type: counterType, counter_lore: counterLore },
          }));
        }
      },

      finalizeRoster: async (campaignId, circleId) => {
        try {
          const res = await apiFetch('/campaign/finalize-roster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign_id: campaignId, circle_id: circleId }),
          });
          return res.ok;
        } catch (err) {
          console.error('Failed to finalize roster:', err);
          return false;
        }
      },

      setRejoinInvite: (invite) => set({ rejoinInvite: invite }),
      setHubNotice: (notice) => set({ hubNotice: notice }),

      // ==========================================
      // DELETING FROM THE ROSTER BOOK (docs/refactor/DELETION.md)
      // ==========================================
      // Each resolves to { success, status, detail }. A socket this tab still has open on
      // what is deleted goes first (the server would close it), and opens again when the
      // delete does not go through. A 404 or 409 means the roster book is out of date (the
      // character is back in a campaign, or already gone), so it is read again.
      deleteCharacter: async (characterId) => {
        const reopen = closeSocketOn(get, characterId);
        const result = await deletionRequest(`/api/investigators/${characterId}`, 'DELETE');
        if (result.success) {
          set(state => ({
            characters: state.characters.filter(c => c.id !== characterId),
            character: state.character?.id === characterId ? null : state.character,
            lastPlayedCampaign: state.lastPlayedCampaign?.characterId === characterId ? null : state.lastPlayedCampaign,
          }));
        } else {
          reopen();
          if (result.status === 404 || result.status === 409) await get().fetchUserData(get().accessSession?.userId);
        }
        return result;
      },

      restoreCharacter: async (characterId) => {
        const result = await deletionRequest(`/api/investigators/${characterId}/restore`, 'POST');
        if (result.success) await get().fetchUserData(get().accessSession?.userId);
        return result;
      },

      deleteCampaign: async (campaignId) => {
        const camp = get().gmCampaigns.find(c => c.id === campaignId);
        const reopen = camp ? closeSocketOn(get, camp.campaign_code) : () => {};
        const result = await deletionRequest(`/campaign/${campaignId}`, 'DELETE');
        if (result.success) {
          set(state => withoutCampaign(state, campaignId, camp?.campaign_code));
          await get().fetchUserData(get().accessSession?.userId);
        } else {
          reopen();
          if (result.status === 404) await get().fetchUserData(get().accessSession?.userId);
        }
        return result;
      },

      restoreCampaign: async (campaignId) => {
        const result = await deletionRequest(`/campaign/${campaignId}/restore`, 'POST');
        if (result.success) await get().fetchUserData(get().accessSession?.userId);
        return result;
      },

      clearRelationshipIntro: () => set({ pendingRelationshipIntro: null }),
      openRelationshipPopup: (targetInvestigator) => {
        const { circleCreation } = get();
        set({
          pendingRelationshipIntro: {
            newCharacter: targetInvestigator,
            allActiveCharacters: circleCreation.activeInvestigators || [],
          },
        });
      },
    }),
    {
      name: 'candela-vtt-storage', // The key used in localStorage

      // Partialize prevents non-serializable objects (like WebSockets) from breaking local storage
      partialize: (state) => ({
        accessSession: state.accessSession,
        stage: state.stage,
        character: state.character,
        characters: state.characters,
        gmCampaigns: state.gmCampaigns,
        lastPlayedCampaign: state.lastPlayedCampaign,
        circle: state.circle,
        rejoinInvite: state.rejoinInvite,
        pendingScar: state.pendingScar,
        reportDrafts: state.reportDrafts,
      }),

      // A session saved before login tokens existed has no token, and the server
      // refuses every call without one. Drop it, and what belonged to it, so the app
      // starts on the login screen.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted || {}) };
        if (merged.accessSession?.token) return merged;
        return {
          ...merged,
          accessSession: null,
          stage: 'LOGIN',
          character: null,
          characters: [],
          gmCampaigns: [],
          lastPlayedCampaign: null,
          circle: null,
          rejoinInvite: null,
          pendingScar: null,
        };
      },
    }
  )
);

// Every API call sends the session's token; a 401 means it is gone or expired.
configureApiAuth({
  getToken: () => useGameStore.getState().accessSession?.token || null,
  onUnauthorized: () => useGameStore.getState().logout(),
});

// A phone that wakes up or a network that comes back should not wait out the backoff.
if (typeof window !== 'undefined') {
  const retryNow = () => {
    const { connectionState, socketGameId, connect } = useGameStore.getState();
    if (connectionState === 'reconnecting' && socketGameId != null) connect(socketGameId, { keepLog: true });
  };
  window.addEventListener('online', retryNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retryNow();
  });
}

export default useGameStore;
