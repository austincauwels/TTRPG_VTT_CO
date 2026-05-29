import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import { apiUrl } from '../utils/api';

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

  const handleRejoinWithChar = async (char) => {
    try {
      const res = await fetch(apiUrl('/campaign/rejoin'), {
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
      } else {
        await fetchUserData(accessSession?.userId);
        setStage('HOME');
      }
    } catch (err) {
      console.error('Rejoin failed:', err);
      await fetchUserData(accessSession?.userId);
      setStage('HOME');
    }
  };

  switch (stage) {
  case 'LOGIN':
    return <LoginScreen />;

  case 'HOME':
    return <CampaignSelector />;

    case 'CHARACTER_CREATION':
      return (
        <div
          className="min-h-screen bg-[#110a08] py-8 font-serif"
          style={{ color: accessSession?.pen?.color || '#fdfaf4', fontFamily: accessSession?.pen?.font || 'serif' }}
        >
          <header className="max-w-6xl mx-auto mb-6 text-center">
            <h1 className="text-5xl mb-2 font-serif font-black tracking-tight text-[#fdfaf4]">CANDELA OBSCURA</h1>
            <p className="text-sm font-sans font-black tracking-widest text-[#a82222] uppercase">Investigator Forging</p>
          </header>

          <CharacterCreator
            globalPenStyle={accessSession?.pen}
            rejoinContext={rejoinCode ? { code: rejoinCode, campaignName: rejoinCampaignName } : null}
            onSubmit={async (characterData) => {
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

                const response = await fetch(apiUrl('/api/investigators/forge'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("Forge Failed");

                const savedCharacter = await response.json();
                setLocalCharacter(savedCharacter);

                if (characterData.mode === 'rejoin' && rejoinCode) {
                  await handleRejoinWithChar(savedCharacter);
                } else if (characterData.mode === 'join' && characterData.campaignCode) {
                  const joinResult = await joinCampaign(savedCharacter.id, characterData.campaignCode, characterData.penFont || 'Caveat');
                  if (joinResult?.success) {
                    await fetchUserData(accessSession?.userId);
                    setStage('HOME');
                  } else {
                    console.error("Failed to join campaign:", joinResult?.detail);
                    await fetchUserData(accessSession?.userId);
                    setStage('HOME');
                  }
                } else {
                  await fetchUserData(accessSession?.userId);
                  setStage('HOME');
                }

              } catch (err) {
                console.error("Network Error during Forge:", err);
              }
            }}
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