import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  socket: null, character: null, circle: null, lastRoll: null, showScarModal: false,
  connect: (gameId) => {
    const socket = new WebSocket(`ws://animated-space-chainsaw-r495qgrq5vv5cpg74-8000.app.github.dev/ws/${gameId}`);
    socket.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === 'character_update') set({ character: m.payload });
      else if (m.type === 'circle_update') set({ circle: m.payload });
      else if (m.type === 'roll_result') set({ lastRoll: m.payload.roll, character: m.payload.character });
      else if (m.type === 'trigger_scar') set({ character: m.payload.character, showScarModal: true });
    };
    set({ socket });
  },
  rollAction: (actionName, driveSpent) => {
    const { socket, character } = get();
    if (socket && character) {
      socket.send(JSON.stringify({
        type: 'roll',
        payload: {
          character_id: character.id,
          action: actionName,
          drive_spent: parseInt(driveSpent) || 0
        }
      }));
    }
  },
  selectGilded: (driveCategory) => {
    const { socket, character } = get();
    if (socket && character) socket.send(JSON.stringify({ type: 'select_gilded', payload: { character_id: character.id, drive_category: driveCategory } }));
  },
  takeMark: (markType) => {
    const { socket, character } = get();
    if (socket && character) socket.send(JSON.stringify({ type: 'take_mark', payload: { character_id: character.id, mark_type: markType } }));
  },
  applyScar: (scarText, shiftDown, shiftUp) => {
    const { socket, character } = get();
    if (socket && character) {
      socket.send(JSON.stringify({ type: 'apply_scar', payload: { character_id: character.id, scar_text: scarText, shift_down: shiftDown, shift_up: shiftUp } }));
      set({ showScarModal: false });
    }
  },
  updateCircle: (data) => {
    const { socket, character } = get();
    if (socket && character?.circle_id) {
      socket.send(JSON.stringify({
        type: 'update_circle',
        payload: {
          circle_id: character.circle_id,
          ...data
        }
      }));
    }
  }
}));

export default useGameStore;
