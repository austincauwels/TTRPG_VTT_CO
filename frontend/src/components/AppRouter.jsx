import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import { apiFetch } from '../utils/api';
import { campaignErrorText, NETWORK_ERROR } from '../utils/campaignErrors';

import LoginScreen from './LoginScreen';
import { CampaignSelector } from './CampaignSelector';
import { MainDeskView } from './pc/MainDeskView';
import { OperationsPanel } from './gm/OperationsPanel';
import { CharacterCreator } from './CharacterCreator';

export const AppRouter = () => {
  const {
    stage, setLocalCharacter, setStage, connect, accessSession, joinCampaign,
    fetchUserData, setLastPlayed, character, lastPlayedCampaign, characters,
    rejoinInvite, setRejoinInvite,
  } = useGameStore();

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
          return {
            ok: false,
            error: response.status === 413
              ? 'The portrait is too large to save. Choose a smaller picture, then save again.'
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
          <header className="max-w-6xl mx-auto mb-4 sm:mb-6 px-4 text-center">
            <h1 className="text-4xl sm:text-5xl mb-2 font-display tracking-[0.1em] text-cream">CANDELA OBSCURA</h1>
            <p className="text-sm font-sans font-black tracking-widest text-oxblood-lit uppercase">New Investigator</p>
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