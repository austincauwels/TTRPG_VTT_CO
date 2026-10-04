import { useEffect } from 'react';

// Fills lastPlayedCampaign from the first active character or GM campaign, so the Last
// Session tome unlocks as soon as the user has an active record. Call it after the mount
// effect that fetches the user's data, as before the split.
export const useAutoLastPlayed = ({ lastPlayedCampaign, characters, gmCampaigns, setLastPlayed }) => {
  useEffect(() => {
    if (!lastPlayedCampaign) {
      const firstActive = characters.find(c => c.status === 'active');
      if (firstActive) {
        setLastPlayed({
          type: 'player',
          characterId: firstActive.id,
          campaignName: firstActive.campaign_name || 'Active Campaign',
          campaignCode: '',
        });
      } else if (gmCampaigns.length > 0) {
        setLastPlayed({
          type: 'gm',
          campaignCode: gmCampaigns[0].campaign_code,
          campaignName: gmCampaigns[0].name,
          campaignId: gmCampaigns[0].id,
        });
      }
    }
  }, [characters, gmCampaigns]);
};
