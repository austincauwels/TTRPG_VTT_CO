// Plain-language messages for the campaign create and join forms. The server's detail
// strings come from backend/vtt/routers/campaigns.py and engine.py; anything we do not
// recognise is shown as the server wrote it, and a FastAPI validation list (an array)
// falls back to a general message so React never tries to render an object.

// The server's own rule for codes (_ALLOWED_CAMPAIGN_CODE_RE), checked before sending.
export const CAMPAIGN_CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
export const CAMPAIGN_CODE_RULE = '3 to 32 letters, numbers, hyphens or underscores, with no spaces.';

const KNOWN = [
  [/already in use/i, 'Another campaign already uses that code. Choose a different code.'],
  [/must be 3.32 alphanumeric/i, `A campaign code must be ${CAMPAIGN_CODE_RULE}`],
  [/must not be a number/i, 'A campaign code needs at least one letter.'],
  [/name must be 1.80/i, 'Give the campaign a name of up to 80 characters.'],
  [/code not found/i, 'No campaign uses that code. Check the spelling with your GM and try again.'],
  [/invalid campaign code format/i, `That is not a campaign code. Codes are ${CAMPAIGN_CODE_RULE}`],
  [/has been retired/i, 'That campaign has ended and takes no new investigators. Ask your GM for the code of a current campaign.'],
  [/failed to fetch|networkerror|load failed/i, 'Could not reach the server. Check your connection and try again.'],
  [/^unknown error$/i, 'Something went wrong on the server. Try again in a moment.'],
  [/not allowed/i,'You can only do this with your own investigators. Sign out and back in if this looks wrong.'],
];

export const campaignErrorText = (detail, fallback) => {
  if (typeof detail === 'string' && detail.trim()) {
    const hit = KNOWN.find(([re]) => re.test(detail));
    return hit ? hit[1] : detail;
  }
  return fallback;
};

export const NETWORK_ERROR = 'Could not reach the server. Check your connection and try again.';
