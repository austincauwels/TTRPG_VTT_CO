import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      circle: null,
      lastRoll: null,
      showScarModal: false,
      scarModalData: null,
      isRolling: false,

      // Automatically route to HOME on successful login, or back to LOGIN if session is cleared
      setAccessSession: (session) => {
        set({ 
          accessSession: session,
          stage: session ? 'HOME' : 'LOGIN' 
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
          circle: null,
          socket: null,
          stage: 'LOGIN' 
        });
      },
      
      // ==========================================
      // WEBSOCKET CONNECTION & EVENT HANDLERS
      // ==========================================
      connect: (gameId) => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${gameId}`;
        
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => console.log(`Connected to Vault Websocket: ${gameId}`);
        socket.onerror = (err) => console.error("WebSocket connection error:", err);

        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          if (message.type === 'character_update') {
            set({ character: message.payload });
          } 
          else if (message.type === 'circle_update') {
            set({ circle: message.payload });
          } 
          else if (message.type === 'roll_result') {
            set({ 
              lastRoll: message.payload.roll, 
              character: message.payload.character,
              isRolling: false
            });
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
        };
        
        set({ socket });
      },

      // ==========================================
      // CHARACTER & GAMEPLAY ACTIONS
      // ==========================================
      setLocalCharacter: (characterData) => {
        set({ character: characterData });
      },

      rollAction: (actionName, driveSpent = 0) => {
        const { socket } = get();
        set({ lastRoll: null, isRolling: true });
        
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'roll',
            payload: { action: actionName, drive_spent: driveSpent }
          }));
        } else {
          console.warn("Network transmission failed: Vault socket offline. Aborting roll.");
          setTimeout(() => set({ isRolling: false }), 400);
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

      updateCircle: (updates) => {
        const { socket } = get();
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'update_circle',
            payload: updates
          }));
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

      closeScarModal: () => set({ showScarModal: false, scarModalData: null })
    }),
    {
      name: 'candela-vtt-storage', // The key used in localStorage
      
      // Partialize prevents non-serializable objects (like WebSockets) from breaking local storage
      partialize: (state) => ({
        accessSession: state.accessSession,
        stage: state.stage,
        character: state.character, 
        circle: state.circle
      }),
    }
  )
);

export default useGameStore;