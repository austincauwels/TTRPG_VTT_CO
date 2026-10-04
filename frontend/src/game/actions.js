export function driveKeyFor(action) {
  return ['move','strike','control'].includes(action) ? 'nerve'
       : ['hide','sneak','sway'].includes(action)    ? 'cunning'
       : 'intuition';
}

// Rulebook labels for the action keys (the keys sneak and read are labelled Read and Focus).
export const ACTION_LABEL = {
  move: 'Move', strike: 'Strike', control: 'Control',
  sway: 'Sway', sneak: 'Read', hide: 'Hide',
  survey: 'Survey', read: 'Focus', sense: 'Sense',
};
