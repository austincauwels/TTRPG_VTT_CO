import { useEffect, useRef } from 'react';

// While one of the player's investigators waits for a Lightkeeper's approval, the hub asks
// again every POLL_MS and whenever the tab comes back, and says so when the answer comes.
// The hub has no socket, so it fetched the list once and kept saying "Waiting for the
// Lightkeeper to approve" until Check again or a reload, and even then the row changed
// without a word (playtest, pending-join-not-live).
const POLL_MS = 15000;

export const usePendingApprovalWatch = ({ characters, userId, fetchUserData, setHubNotice }) => {
  // { id: { status, name, campaign } } of the list last seen
  const seen = useRef(null);
  const anyPending = characters.some(c => c.status === 'pending');

  useEffect(() => {
    const before = seen.current;
    seen.current = Object.fromEntries(characters.map(c => [c.id, { status: c.status, name: c.name, campaign: c.campaign_name }]));
    if (!before) return;
    for (const c of characters) {
      const was = before[c.id];
      if (was?.status !== 'pending' || c.status === 'pending') continue;
      const campaign = was.campaign || 'the campaign';
      if (c.status === 'active') {
        setHubNotice(`The Lightkeeper let ${c.name} into ${campaign}. Open the Case Ledger and press Play.`);
      } else if (c.status === 'unaffiliated') {
        setHubNotice(`The Lightkeeper did not take ${c.name} into ${campaign}. ${c.name} can ask to join another campaign.`);
      }
    }
  }, [characters]);

  useEffect(() => {
    if (!anyPending || !userId) return undefined;
    const ask = () => { if (document.visibilityState === 'visible') fetchUserData(userId); };
    const timer = setInterval(ask, POLL_MS);
    document.addEventListener('visibilitychange', ask);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', ask); };
  }, [anyPending, userId]);
};
