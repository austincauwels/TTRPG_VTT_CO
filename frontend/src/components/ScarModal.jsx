import React, { useState } from 'react';
import useGameStore from '../store/gameStore';

const ScarModal = () => {
  const { character, showScarModal, applyScar } = useGameStore();
  const [scarText, setScarText] = useState('');
  const [shiftDown, setShiftDown] = useState('');
  const [shiftUp, setShiftUp] = useState('');
  if (!showScarModal || !character) return null;
  const actions = ['move', 'strike', 'control', 'hide', 'sneak', 'sway', 'survey', 'read', 'sense'];
  const handleSubmit = (e) => {
    e.preventDefault();
    if (scarText && shiftDown && shiftUp && shiftDown !== shiftUp) applyScar(scarText, shiftDown, shiftUp);
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="parchment-card max-w-lg w-full">
        <h2 className="text-3xl mb-4 text-red-700">A Lasting Injury</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea className="w-full input-dark h-24" placeholder="Describe your scar..." value={scarText} onChange={(e) => setScarText(e.target.value)} required />
          <div className="grid grid-cols-2 gap-4">
            <select className="input-dark" value={shiftDown} onChange={(e) => setShiftDown(e.target.value)} required>
              <option value="">Shift Down</option>
              {actions.map(a => <option key={a} value={a} disabled={character[a] === 0}>{a} ({character[a]})</option>)}
            </select>
            <select className="input-dark" value={shiftUp} onChange={(e) => setShiftUp(e.target.value)} required>
              <option value="">Shift Up</option>
              {actions.map(a => <option key={a} value={a} disabled={character[a] === 3}>{a} ({character[a]})</option>)}
            </select>
          </div>
          <button type="submit" className="w-full btn-gold">Accept Fate</button>
        </form>
      </div>
    </div>
  );
};
export default ScarModal;
