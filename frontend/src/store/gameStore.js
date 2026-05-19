import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // --- STATE PARAMETERS ---
  socket: null,
  character: null,
  circle: null,
  lastRoll: null,
  showScarModal: false,
  scarModalData: null, // Track metadata about which mark triggered the scar
  isRolling: false,
  
  // --- CONNECTION & DATA ROUTING ---
  connect: (gameId) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${gameId}`;
    
    const socket = new WebSocket(wsUrl);
    
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
          scarModalData: { type: message.payload.mark_type } // Store the mark vector that popped the threshold
        });
      }
    };
    
    set({ socket });
  },

  setLocalCharacter: (characterData) => {
    set({ character: characterData });
  },

  // --- GAMEPLAY ACTION TRANSMITTERS ---
  rollAction: (actionName, driveSpent = 0) => {
    const { socket } = get();
    set({ lastRoll: null, isRolling: true });
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'roll',
        payload: { action: actionName, drive_spent: driveSpent }
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

  // CRITICAL COMPATIBILITY FIX: Expects an object containing text and shifting keys
  applyScar: (payloadData) => {
    const { socket } = get();
    if (socket && socket.readyState === WebSocket.OPEN) {
      // Unpack object structure to match backend expectation fields perfectly
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

  closeScarModal: () => set({ showScarModal: false, scarModalData: null })
}));

export default useGameStore;