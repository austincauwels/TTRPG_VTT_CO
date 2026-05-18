import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // --- STATE PARAMETERS ---
  socket: null,
  character: null,
  circle: null,
  lastRoll: null,
  showScarModal: false,
  isRolling: false, // <-- 1. Add the rolling state flag
  
  // --- 1. CONNECTION & DATA ROUTING ---
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
          isRolling: false // <-- This line resets the screen from "Casting Lots..." back to the tray view
        });
      }
      else if (message.type === 'trigger_scar') {
        set({ character: message.payload.character, showScarModal: true });
      }
    };
    
    set({ socket });
  },

  setLocalCharacter: (characterData) => {
    set({ character: characterData });
  },

  // --- 3. GAMEPLAY ACTION TRANSMITTERS ---
  rollAction: (actionName, driveSpent = 0) => {
    const { socket } = get();
    
    // 2. Wipe previous dice and trigger rolling state immediately
    set({ lastRoll: null, isRolling: true });
    
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'roll',
        payload: { action: actionName, drive_spent: driveSpent }
      }));
    }
  },

  // ... (Keep existing updateDrive, takeMark, applyScar, etc.)

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

  applyScar: (scarText, shiftDown, shiftUp) => {
    const { socket } = get();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'apply_scar',
        payload: { scar_text: scarText, shift_down: shiftDown, shift_up: shiftUp }
      }));
    }
    // Automatically close the frontend modal once the network payload fires
    set({ showScarModal: false }); 
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

  closeScarModal: () => set({ showScarModal: false })
}));

export default useGameStore;