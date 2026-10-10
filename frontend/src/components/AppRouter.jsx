import React, { useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';
import { apiFetch } from '../utils/api';
import { campaignErrorText, NETWORK_ERROR } from '../utils/campaignErrors';
import { isEditableTarget, pageKeyBlocked } from './shared/a11y';

import { lazyScreen, whenIdle } from './shared/lazyScreen';
import { forgePayload } from '../game/forgePayload';

import LoginScreen from './LoginScreen';
import { ConfirmEmailPage } from './account/ConfirmEmailPage';
import { UndoEmailChangePage } from './account/UndoEmailChangePage';
import { accountPageOpen, emailTokenFromAddress, undoTokenFromAddress, watchAddress } from './account/accountAddress';
import { settleArrival, useStageHistory } from './stageHistory';

// The screens behind the sign-in slip load when first shown (shared/lazyScreen.js); App
// wraps the router in a Suspense that keeps the night stage up meanwhile.
const CampaignSelector = lazyScreen(() => import('./CampaignSelector'), 'CampaignSelector');
const MainDeskView = lazyScreen(() => import('./pc/MainDeskView'), 'MainDeskView');
const OperationsPanel = lazyScreen(() => import('./gm/OperationsPanel'), 'OperationsPanel');
const CharacterCreator = lazyScreen(() => import('./CharacterCreator'), 'CharacterCreator');
const AccountPage = lazyScreen(() => import('./account/AccountPage'), 'AccountPage');
const SIGNED_IN_SCREENS = [CampaignSelector, MainDeskView, OperationsPanel, CharacterCreator, AccountPage];

// Escape leaves the creator for the chapter hub, as its header link does. The first Escape
// in a field only leaves the field. The draft stays in this browser for the account.
const useCreatorEscape = (stage, setStage) => {
  useEffect(() => {
    if (stage !== 'CHARACTER_CREATION') return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (isEditableTarget(e.target)) { e.target.blur(); return; }
      if (pageKeyBlocked(e)) return;
      setStage('HOME');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stage]);
};

// The emailed reset link opens /reset-password?token=... (docs/refactor/AUTH.md). The app
// has no other addresses, so this one page is picked from the address before the stage.
// It gives the token, an empty string when the link has none, or null on any other page.
const RESET_PATH = /\/reset-password\/?$/;
const resetTokenFromAddress = () => {
  if (typeof window === 'undefined' || !RESET_PATH.test(window.location.pathname)) return null;
  return new URLSearchParams(window.location.search).get('token') || '';
};

// As the page loads, before the first screen draws, the screen this browser kept gives way
// to the one the history entry was made for (stageHistory.js). The account page and the
// emailed links keep entries of their own.
if (resetTokenFromAddress() === null && !accountPageOpen() && emailTokenFromAddress() === null && undoTokenFromAddress() === null) {
  settleArrival();
}

export const AppRouter = () => {
  const {
    stage, setLocalCharacter, setStage, connect, accessSession, joinCampaign,
    fetchUserData, setLastPlayed, character, lastPlayedCampaign, characters,
    rejoinInvite, setRejoinInvite, setHubNotice,
  } = useGameStore();

  const [resetToken, setResetToken] = useState(resetTokenFromAddress);
  // Leaving the reset page takes the token off the address, so a reload or Back does not
  // offer a used link again.
  const leaveResetPage = () => {
    try { window.history.replaceState(null, '', import.meta.env.BASE_URL || '/'); } catch { /* no history */ }
    setResetToken(null);
  };

  // The account page (/account), the link that confirms a new email address
  // (/confirm-email?token=...) and the link that undoes a change of address
  // (/undo-email-change?token=...) have addresses of their own (account/accountAddress.js).
  const [accountOpen, setAccountOpen] = useState(accountPageOpen);
  const [emailToken, setEmailToken] = useState(emailTokenFromAddress);
  const [undoToken, setUndoToken] = useState(undoTokenFromAddress);
  useEffect(() => watchAddress(() => {
    setAccountOpen(accountPageOpen());
    setEmailToken(emailTokenFromAddress());
    setUndoToken(undoTokenFromAddress());
  }), []);
  const onOwnAddress = resetToken !== null || emailToken !== null || undoToken !== null
    || (accountOpen && !!accessSession);

  // Back and Forward between the hub, the creator and the desks (stageHistory.js), and
  // Escape out of the creator
  const routedStage = onOwnAddress ? null : stage;
  useStageHistory(routedStage);
  useCreatorEscape(routedStage, setStage);

  // Once someone is signed in, the other screens' code is fetched while the browser is
  // idle, so moving between the hub, the creator and the desks never waits on it
  const signedIn = !!accessSession;
  useEffect(() => (signedIn ? whenIdle(() => SIGNED_IN_SCREENS.forEach((screen) => screen.preload())) : undefined), [signedIn]);

  // Compute rejoin context — either organic death path or GM invite path
  const deadCharRejoinCode = character?.is_dead && lastPlayedCampaign?.campaignCode
    ? lastPlayedCampaign.campaignCode : null;
  const rejoinCode = deadCharRejoinCode || rejoinInvite?.campaign_code || null;
  const rejoinCampaignName = rejoinInvite?.campaign_name || lastPlayedCampaign?.campaignName || null;

  // Resolves to null when the investigator is back in the campaign, or to what went wrong.
  const handleRejoinWithChar = async (char) => {
    try {
      const res = await apiFetch('/campaign/rejoin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: char.id, campaign_code: rejoinCode }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalCharacter(data.character);
        setRejoinInvite(null);
        connect(data.character.id);
        setStage('DESK');
        return null;
      }
      const err = await res.json().catch(() => ({}));
      return campaignErrorText(err.detail, `Rejoining ${rejoinCampaignName || 'the campaign'} did not go through. Try again in a moment.`);
    } catch (err) {
      console.error('Rejoin failed:', err);
      return NETWORK_ERROR;
    }
  };

  // The creator's save. It resolves to { ok: true } once the investigator is saved and the
  // app has moved on, or to { ok: false, error, savedCharacterId? } so the creator can show
  // the error and offer a retry. When the investigator was saved but joining or rejoining
  // failed, savedCharacterId lets the retry skip the save, so no second copy is made.
  const saveInvestigator = async (characterData) => {
    let savedCharacter;
    if (characterData.existingCharacterId) {
      savedCharacter = { id: characterData.existingCharacterId };
    } else {
      try {
        const payload = forgePayload(characterData, accessSession?.userId);

        const response = await apiFetch('/api/investigators/forge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          // The server checks the portrait (PNG, JPEG or WebP, how large, how often) and
          // says what is wrong with it in words that can be shown as they are
          const detail = await response.json().then((b) => (typeof b?.detail === 'string' ? b.detail : ''), () => '');
          // A sheet the creator could not make (an old draft, say) is refused with the
          // rule it breaks (vtt/creation.py)
          return {
            ok: false,
            error: response.status === 413
              ? 'The portrait is too large to save. Choose a smaller picture, then save again.'
              : /portrait/i.test(detail)
                ? `${detail} Your other choices are kept.`
                : response.status === 422 && detail
                  ? `The investigator was not saved: ${detail} Your choices are kept; change that, then save again.`
                  : 'The investigator was not saved. Your choices are kept; try again in a moment.',
          };
        }
        savedCharacter = await response.json();
        setLocalCharacter(savedCharacter);
      } catch (err) {
        console.error("Network Error during Forge:", err);
        return { ok: false, error: 'Could not reach the server, so the investigator was not saved. Your choices are kept; check your connection and try again.' };
      }
    }

    if (characterData.mode === 'rejoin' && rejoinCode) {
      const problem = await handleRejoinWithChar(savedCharacter);
      if (problem) return { ok: false, savedCharacterId: savedCharacter.id, error: problem };
      return { ok: true };
    }
    if (characterData.mode === 'join' && characterData.campaignCode) {
      const joinResult = await joinCampaign(savedCharacter.id, characterData.campaignCode, characterData.penFont || 'Caveat');
      if (!joinResult?.success) {
        return {
          ok: false,
          savedCharacterId: savedCharacter.id,
          error: campaignErrorText(joinResult?.detail, 'The request to join did not go through. Try again in a moment.'),
        };
      }
    }
    await fetchUserData(accessSession?.userId);
    // Asking to join lands on the hub: it says the request went (it used to say nothing)
    if (characterData.mode === 'join' && characterData.campaignCode) {
      const name = characterData.name || savedCharacter?.name || 'Your investigator';
      setHubNotice(`${name} asked to join. The hub will say when the Lightkeeper answers.`);
    }
    setStage('HOME');
    return { ok: true };
  };

  // The reset page is the login slip in its reset form. Once the new password is set it
  // signs this browser out and becomes the sign-in slip; both are the same LoginScreen
  // in the same place, so the slip carries its state across.
  if (resetToken !== null) return <LoginScreen resetToken={resetToken} onLeaveReset={leaveResetPage} />;

  // The undo link works signed in or not: whoever made the change may have changed the
  // password, and the undo ends every sign-in to the account anyway.
  if (undoToken !== null) return <UndoEmailChangePage key={undoToken} token={undoToken} />;

  // Both need someone signed in; until then the stage (the sign-in slip) shows and the
  // address stays, so the page opens once they are.
  if (emailToken !== null && accessSession) return <ConfirmEmailPage key={emailToken} token={emailToken} />;
  if (accountOpen && accessSession && stage !== 'LOGIN') return <AccountPage returnTo={stage} />;

  switch (stage) {
  case 'LOGIN':
    return <LoginScreen />;

  case 'HOME':
    return <CampaignSelector />;

    case 'CHARACTER_CREATION':
      return (
        <div
          className="min-h-screen bg-night py-6 sm:py-8 font-serif"
          style={{ color: accessSession?.pen?.color || 'rgb(var(--c-cream))', fontFamily: accessSession?.pen?.font || undefined }}
        >
          {/* The way out sits where the desks keep theirs: right of the title from lg, under it
              on phones and tablets, in normal flow so it never covers the title */}
          <header className="w-full mb-4 sm:mb-6 px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-start gap-y-3">
            <div className="hidden lg:block" aria-hidden="true" />
            <div className="text-center">
              <h1 className="text-[28px] sm:text-5xl mb-2 font-display tracking-[0.1em] text-cream">CANDELA OBSCURA</h1>
              <p className="text-sm font-sans font-black tracking-widest text-oxblood-lit uppercase">New Investigator</p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <button
                type="button"
                onClick={() => setStage('HOME')}
                className="w-full sm:w-auto whitespace-nowrap text-xs sm:text-sm font-sans font-bold uppercase tracking-widest text-parchment-deep hover:text-cream transition-colors bg-transparent hover:bg-cream/5 border border-cream/20 hover:border-cream/40 rounded px-4 py-2.5 lg:py-2"
              >
                Back to chapter hub
              </button>
            </div>
          </header>

          <CharacterCreator
            globalPenStyle={accessSession?.pen}
            rejoinContext={rejoinCode ? { code: rejoinCode, campaignName: rejoinCampaignName } : null}
            draftKey={accessSession?.userId ? `candela-creator-draft:${accessSession.userId}` : 'candela-creator-draft'}
            onSubmit={saveInvestigator}
          />
        </div>
      );

    case 'DESK':
      return <MainDeskView />;

    case 'GM_DASH':
      return <OperationsPanel />;

    default:
      return <LoginScreen />;
  }
};