import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiUrl } from '../utils/api';

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
      character: null,
      characters: [],          // all characters belonging to the logged-in user
      gmCampaigns: [],         // campaigns the user manages as GM
      lastPlayedCampaign: null, // { type:'player'|'gm', characterId?, campaignCode, campaignName }
      circle: null,
      lastRoll: null,
      pendingGildedChoice: null,
      showScarModal: false,
      scarModalData: null,
      isRolling: false,
      campaignRoster: { pending_investigators: [], active_investigators: [] },
      notebookEntries: [],
      lastActivityLog: null,
      activityLog: [],
      pendingRoll: null,         // { action, driveSpend } — set before roll to show spend selector
      pendingRollMods: [],       // active ability modifier chip keys for the current pending roll
      abilityMarkOffer: null,    // { ability, mark_type, character_id, options? } — mark intercept prompt
      circleAdvancement: null,   // { circle } — set when GM advances; triggers player modal
      pendingRelationshipIntro: null, // { newCharacter, allActiveCharacters } — mid-campaign join
      rejoinInvite: null,             // { campaign_id, campaign_name, campaign_code }
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
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }

        set({
          accessSession: null,
          character: null,
          characters: [],
          gmCampaigns: [],
          lastPlayedCampaign: null,
          circle: null,
          socket: null,
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
      connect: (gameId) => {
        set({ activityLog: [], lastActivityLog: null, isRolling: false, pendingRoll: null });
        const apiBase = import.meta.env.VITE_API_URL || '';
        const wsProtocol = (apiBase.startsWith('https') || window.location.protocol === 'https:') ? 'wss:' : 'ws:';
        const wsHost = apiBase ? apiBase.replace(/^https?:\/\//, '') : window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/${gameId}`;

        const socket = new WebSocket(wsUrl);

        socket.onopen = () => console.log(`Connected to Vault Websocket: ${gameId}`);
        socket.onerror = (err) => console.error("WebSocket connection error:", err);

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
            // If this player is now active and the circle isn't finalized, fetch creation state
            if (incoming.status === 'active' && incoming.campaign_id) {
              const { circle, circleCreation } = get();
              if (!circle?.is_finalized && !circleCreation.isVisible) {
                get().fetchCircleCreationState(incoming.campaign_id);
              }
            }
            // Deceased log entry when character becomes incapacitated or dead
            if ((incoming.incapacitated === true || incoming.is_dead === true) &&
                !prevChar?.incapacitated && !prevChar?.is_dead) {
              const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
              set(state => ({
                activityLog: [{ text: `${incoming.name} is deceased.`, type: 'danger', time, inkColor: incoming.ink_color }, ...state.activityLog].slice(0, 50),
              }));
            }
          }
          else if (message.type === 'circle_update') {
            set({ circle: message.payload });
          }
          else if (message.type === 'roll_result') {
            const roll = message.payload.roll;
            set({
              lastRoll: roll,
              character: message.payload.character,
              isRolling: false,
              pendingRoll: null,
              pendingRollMods: [],
              pendingGildedChoice: roll?.needs_gilded_choice
                ? { action: message.payload.action, roll, character_id: message.payload.character_id }
                : null,
            });
          }
          else if (message.type === 'roll_error') {
            set({ isRolling: false });
          }
          else if (message.type === 'trigger_scar') {
            set({
              character: message.payload.character,
              showScarModal: true,
              scarModalData: { type: message.payload.mark_type }
            });
          }
          else if (message.type === 'scene_transition') {
            console.log(`[SCENE SHIFT]: ${message.payload.scene_name} - ${message.payload.description}`);
          }
          else if (message.type === 'notebook_entry') {
            set(state => {
              if (state.notebookEntries.some(e => e.id === message.payload.id)) return state;
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
              return {
                character: isMyCharacter ? approvedChar : state.character,
                circleCreation: {
                  ...state.circleCreation,
                  activeInvestigators: active_investigators || [],
                  isVisible: isMyCharacter ? true : state.circleCreation.isVisible,
                },
                campaignRoster: {
                  ...state.campaignRoster,
                  active_investigators: active_investigators || [],
                },
              };
            });
          }
          else if (message.type === 'investigator_rejected') {
            const { character_id, pending_investigators } = message.payload;
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
            // GM receives the report payload; store it in circleCreation.reports
            const { character_id, character_name, responses } = message.payload;
            set(state => ({
              circleCreation: {
                ...state.circleCreation,
                reports: {
                  ...(state.circleCreation.reports || {}),
                  [character_id]: { character_name, responses },
                },
              },
            }));
          }
          else if (message.type === 'circle_advanced') {
            if (!isForThisCampaign(message.payload)) return;
            set({ circle: message.payload.circle, circleAdvancement: { circle: message.payload.circle } });
          }
          else if (message.type === 'campaign_retired') {
            if (!isForThisCampaign(message.payload)) return;
            set({ stage: 'HOME', character: null, circle: null, activityLog: [], lastActivityLog: null });
          }
          else if (message.type === 'ability_mark_offer') {
            set({ abilityMarkOffer: message.payload });
          }
          else if (message.type === 'ability_intercept_offer') {
            set({ abilityMarkOffer: message.payload });
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
        };

        set({ socket });
      },

      // ==========================================
      // USER DATA & SESSION ACTIONS
      // ==========================================
      fetchUserData: async (userId) => {
        if (!userId) return;
        try {
          const [charsRes, campsRes] = await Promise.all([
            fetch(apiUrl(`/api/users/${userId}/characters`)),
            fetch(apiUrl(`/api/users/${userId}/campaigns`)),
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
          updates.accessSession = { ...(get().accessSession || {}), role: 'GM' };
        } else if (info?.type === 'player') {
          updates.accessSession = { ...(get().accessSession || {}), role: 'PLAYER' };
        }
        set(updates);
      },

      // ==========================================
      // CHARACTER & GAMEPLAY ACTIONS
      // ==========================================
      setLocalCharacter: (characterData) => {
        set({ character: characterData });
      },

      rollAction: (actionName, driveSpent = 0, isSecret = false, abilityMods = []) => {
        const { socket, pendingGildedChoice } = get();
        if (pendingGildedChoice) return;
        if (!socket || socket.readyState !== WebSocket.OPEN) {
          console.warn("Network transmission failed: Vault socket offline. Aborting roll.");
          return;
        }
        set({ lastRoll: null, isRolling: true });
        socket.send(JSON.stringify({
          type: 'roll',
          payload: { action: actionName, drive_spent: driveSpent, is_secret: isSecret, ability_mods: abilityMods }
        }));
        // Safety: clear isRolling if backend never responds within 8s
        setTimeout(() => { if (get().isRolling) set({ isRolling: false }); }, 8000);
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
        set({ abilityMarkOffer: null });
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'resolve_ability_mark', payload: { ability, choice } }));
        }
      },

      usePostRollAbility: (ability, params = {}) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'use_post_roll_ability', payload: { ability, ...params } }));
        }
      },

      interceptMark: (ability, targetCharacterId, markType) => {
        const { socket } = get();
        set({ abilityMarkOffer: null });
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'intercept_mark', payload: { ability, target_character_id: targetCharacterId, mark_type: markType } }));
        }
      },

      dismissAbilityMarkOffer: () => set({ abilityMarkOffer: null }),

      resolveGildedChoice: (action, chosenType, chosenValue) => {
        const { socket } = get();
        set({ pendingGildedChoice: null });
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'resolve_gilded',
            payload: { action, chosen_type: chosenType, chosen_value: chosenValue }
          }));
        }
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

      takeMark: (markType) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'take_mark',
            payload: { mark_type: markType }
          }));
        }
      },

      reviveCharacter: () => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'revive_character', payload: {} }));
        }
      },

      applyScar: (payloadData) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          const outPayload = typeof payloadData === 'string'
            ? { scar_text: payloadData, shift_down: null, shift_up: null }
            : {
                scar_text: payloadData.scar_text,
                shift_down: payloadData.shift_down,
                shift_up: payloadData.shift_up
              };

          socket.send(JSON.stringify({
            type: 'apply_scar',
            payload: outPayload
          }));
        }
        set({ showScarModal: false, scarModalData: null });
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
        }
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

      submitAssignmentReport: (circleId, characterId, responses) => {
        const { socket } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'submit_assignment_report',
            payload: { circle_id: circleId, character_id: characterId, responses },
          }));
        }
      },

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

      dismissCircleAdvancement: () => set({ circleAdvancement: null }),

      applyAdvancement: (choice, detail) => {
        const { socket, accessSession } = get();
        if (socket?.readyState === WebSocket.OPEN) {
          const charId = accessSession?.characterId;
          socket.send(JSON.stringify({
            type: 'apply_advancement',
            payload: { character_id: charId, choice, detail },
          }));
        }
        set({ circleAdvancement: null });
      },

      // ==========================================
      // CAMPAIGN APPROVAL FLOW ACTIONS
      // ==========================================
      fetchRoster: async (campaignId) => {
        if (!campaignId) return;
        set({ campaignRoster: { pending_investigators: [], active_investigators: [], roster_finalized: false } });
        try {
          const res = await fetch(apiUrl(`/campaign/${campaignId}/roster`));
          if (res.ok) {
            const data = await res.json();
            set({ campaignRoster: data });
          }
        } catch (err) {
          console.error("Failed to fetch campaign roster:", err);
        }
      },

      approveInvestigator: async (characterId, campaignId) => {
        try {
          const res = await fetch(apiUrl(`/campaign/approve/${characterId}`), { method: 'POST' });
          if (res.ok) {
            await get().fetchRoster(campaignId);
          }
        } catch (err) {
          console.error("Failed to approve investigator:", err);
        }
      },

      rejectInvestigator: async (characterId, campaignId) => {
        try {
          const res = await fetch(apiUrl(`/campaign/reject/${characterId}`), { method: 'POST' });
          if (res.ok) {
            await get().fetchRoster(campaignId);
          }
        } catch (err) {
          console.error("Failed to reject investigator:", err);
        }
      },

      joinCampaign: async (characterId, code, penFont = 'Caveat') => {
        try {
          const res = await fetch(
            apiUrl(`/campaign/join?character_id=${characterId}&code=${encodeURIComponent(code)}&pen_font=${encodeURIComponent(penFont)}`),
            { method: 'POST' }
          );
          if (res.ok) {
            set(state => ({
              character: state.character ? { ...state.character, status: 'pending', pen_font: penFont } : null,
              characters: state.characters.map(c =>
                c.id === characterId ? { ...c, status: 'pending' } : c
              ),
            }));
            return { success: true };
          }
          const err = await res.json().catch(() => ({}));
          return { success: false, detail: err.detail || 'Unknown error' };
        } catch (err) {
          console.error("Failed to join campaign:", err);
          return { success: false, detail: err.message };
        }
      },

      refreshCharacterStatus: async (characterId) => {
        try {
          const res = await fetch(apiUrl(`/api/investigators/${characterId}`));
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
          const charId = character?.id || '';
          const res = await fetch(apiUrl(`/api/notebook/${campaignId}/entries?role=${role}&character_id=${charId}`));
          if (res.ok) {
            set({ notebookEntries: await res.json() });
          }
        } catch (err) {
          console.error("Failed to fetch notebook entries:", err);
        }
      },

      submitNotebookEntry: async (campaignId, title, content, authorName, authorType, characterId = null, entryType = 'field_log', visibility = 'all', imageData = null) => {
        try {
          const res = await fetch(apiUrl(`/api/notebook/${campaignId}/entries`), {
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
            set(state => ({ notebookEntries: [...state.notebookEntries, entry] }));
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
          const res = await fetch(apiUrl(`/api/notebook/entries/${entryId}`), {
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

      deleteEphemeralNote: async (entryId) => {
        try {
          await fetch(apiUrl(`/api/notebook/entries/${entryId}`), { method: 'DELETE' });
          set(state => ({
            notebookEntries: state.notebookEntries.filter(e => e.id !== entryId),
          }));
        } catch (err) {
          console.error('Failed to delete note:', err);
        }
      },

      uploadNotebookImage: async (campaignId, file, title, content, authorName, authorType, entryType, characterId = null) => {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('title', title);
          formData.append('content', content || '');
          formData.append('author_name', authorName);
          formData.append('author_type', authorType);
          formData.append('entry_type', entryType);
          if (characterId) formData.append('character_id', String(characterId));
          const res = await fetch(apiUrl(`/api/notebook/${campaignId}/upload`), { method: 'POST', body: formData });
          if (res.ok) {
            const entry = await res.json();
            set(state => ({ notebookEntries: [...state.notebookEntries, entry] }));
            return { success: true, entry };
          }
          if (res.status === 413) return { success: false, tooLarge: true };
          return { success: false };
        } catch (err) {
          console.error('Failed to upload image:', err);
          return { success: false };
        }
      },

      // ==========================================
      // GM ADMINISTRATIVE ACTIONS
      // ==========================================
      gmAdjustTension: (markType, newValue) => {
        const { socket, accessSession } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'gm_update_tension',
            payload: {
              mark_type: markType,
              value: newValue,
              role: accessSession?.role
            }
          }));
        } else {
          console.warn("Vault socket offline. Cannot transmit GM override.");
        }
      },

      closeScarModal: () => set({ showScarModal: false, scarModalData: null }),

      // ==========================================
      // CIRCLE CREATION ACTIONS
      // ==========================================
      fetchCircleCreationState: async (campaignId) => {
        if (!campaignId) return;
        try {
          const res = await fetch(apiUrl(`/campaign/${campaignId}/circle-creation-state`));
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
          const res = await fetch(apiUrl('/campaign/finalize-roster'), {
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
      }),
    }
  )
);

export default useGameStore;
