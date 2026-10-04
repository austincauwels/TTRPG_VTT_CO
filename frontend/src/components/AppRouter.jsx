import React, { useEffect, useState } from 'react';
import useGameStore from '../store/gameStore';
import { apiFetch } from '../utils/api';
import { campaignErrorText, NETWORK_ERROR } from '../utils/campaignErrors';
import { isEditableTarget, pageKeyBlocked } from './shared/a11y';

import LoginScreen from './LoginScreen';
import { CampaignSelector } from './CampaignSelector';
import { MainDeskView } from './pc/MainDeskView';
import { OperationsPanel } from './gm/OperationsPanel';
import { CharacterCreator } from './CharacterCreator';

// The first time the creator opens after the page loads. A page brought back by the
// browser's Back button with the creator still saved as the screen came back from the
// creator's own history entry, so it goes to the chapter hub instead.
let firstCreatorVisit = true;

// Three ways out of the character creator to the chapter hub: the header link, Escape,
// and the browser's Back button. The creator gets its own history entry for Back; leaving
// any other way (the link, Escape, a save) takes that entry off again, so Back from the
// hub does not land on it. The draft stays in this browser for the account either way.
const useCreatorExits = (stage, setStage) => {
  useEffect(() => {
    if (stage !== 'CHARACTER_CREATION') return undefined;
    const marked = !!window.history.state?.candelaCreator;
    if (firstCreatorVisit) {
      firstCreatorVisit = false;
      const nav = window.performance?.getEntriesByType?.('navigation')?.[0];
      if (!marked && nav?.type === 'back_forward') { setStage('HOME'); return undefined; }
    }
    if (!marked) {
      try { window.history.pushState({ ...(window.history.state || {}), candelaCreator: true }, ''); } catch { /* no history */ }
    }

    const onPop = (e) => { if (!e.state?.candelaCreator) setStage('HOME'); };
    const onKey = (e) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      // The first Escape in a field only leaves the field; the next one leaves the creator
      if (isEditableTarget(e.target)) { e.target.blur(); return; }
      if (pageKeyBlocked(e)) return;
      setStage('HOME');
    };
    window.addEventListener('popstate', onPop);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onKey);
      if (useGameStore.getState().stage !== 'CHARACTER_CREATION' && window.history.state?.candelaCreator) {
        window.history.back();
      }
    };
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

export const AppRouter = () => {
  const {
    stage, setLocalCharacter, setStage, connect, accessSession, joinCampaign,
    fetchUserData, setLastPlayed, character, lastPlayedCampaign, characters,
    rejoinInvite, setRejoinInvite,
  } = useGameStore();

  const [resetToken, setResetToken] = useState(resetTokenFromAddress);
  // Leaving the reset page takes the token off the address, so a reload or Back does not
  // offer a used link again.
  const leaveResetPage = () => {
    try { window.history.replaceState(null, '', import.meta.env.BASE_URL || '/'); } catch { /* no history */ }
    setResetToken(null);
  };

  useCreatorExits(resetToken === null ? stage : null, setStage);

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
        const a = characterData.actions || {};
        const ga = characterData.gildedActions || [];
        const ALL_ACTIONS = ['move', 'strike', 'control', 'hide', 'sneak', 'sway', 'survey', 'read', 'sense'];
        const gildedPayload = {};
        ALL_ACTIONS.forEach(act => {
          gildedPayload[`gilded_${act}`] = ga.includes(act);
        });
        const payload = {
          name: characterData.name || "Unknown Investigator",
          pronouns: characterData.pronouns || "Unlisted",
          style: characterData.style || "",
          catalyst: characterData.catalyst || "",
          question: characterData.question || "",
          role: characterData.role || "",
          specialty: characterData.specialty || "",
          role_ability: characterData.roleAbility || "None",
          specialty_ability: characterData.specialtyAbility || "None",
          gear: characterData.gear || [],
          profile_pic: characterData.profilePic || null,
          user_id: accessSession?.userId || null,
          move:    a.move    || 0,
          strike:  a.strike  || 0,
          control: a.control || 0,
          hide:    a.hide    || 0,
          sneak:   a.sneak   || 0,
          sway:    a.sway    || 0,
          survey:  a.survey  || 0,
          read:    a.read    || 0,
          sense:   a.sense   || 0,
          ...gildedPayload,
          nerve_max:     characterData.nerve_max     || 1,
          cunning_max:   characterData.cunning_max   || 1,
          intuition_max: characterData.intuition_max || 1,
          nerve_current:     characterData.nerve_max     || 1,
          cunning_current:   characterData.cunning_max   || 1,
          intuition_current: characterData.intuition_max || 1,
        };

        const response = await apiFetch('/api/investigators/forge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          // The server checks the portrait (PNG, JPEG or WebP, how large, how often) and
          // says what is wrong with it in words that can be shown as they are
          const detail = await response.json().then((b) => (typeof b?.detail === 'string' ? b.detail : ''), () => '');
          return {
            ok: false,
            error: response.status === 413
              ? 'The portrait is too large to save. Choose a smaller picture, then save again.'
              : /portrait/i.test(detail)
                ? `${detail} Your other choices are kept.`
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
    setStage('HOME');
    return { ok: true };
  };

  // The reset page is the login slip in its reset form. Once the new password is set it
  // signs this browser out and becomes the sign-in slip; both are the same LoginScreen
  // in the same place, so the slip carries its state across.
  if (resetToken !== null) return <LoginScreen resetToken={resetToken} onLeaveReset={leaveResetPage} />;

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