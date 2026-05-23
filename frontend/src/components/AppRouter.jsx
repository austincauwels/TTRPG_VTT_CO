import React from 'react';
import useGameStore from '../store/gameStore';

// View Components
import LoginScreen from './LoginScreen';
import { CampaignSelector } from './CampaignSelector';
import { MainDeskView } from './pc/MainDeskView';
import { OperationsPanel } from './gm/OperationsPanel';
import { CharacterCreator } from './CharacterCreator';

// A temporary placeholder until we build Step 3
const CampaignSelectorPlaceholder = () => {
  const { setStage } = useGameStore();
  return (
    <div className="min-h-screen bg-zinc-900 text-[#fdfaf4] flex flex-col items-center justify-center font-serif">
      <h1 className="text-3xl mb-6">Campaign Hub (Step 3 Placeholder)</h1>
      <div className="flex gap-4">
        <button onClick={() => setStage('CHARACTER_CREATION')} className="px-4 py-2 bg-oxblood text-white border border-white">New Character</button>
        <button onClick={() => setStage('DESK')} className="px-4 py-2 bg-zinc-700 text-white border border-white">Resume PC Game</button>
        <button onClick={() => setStage('GM_DASH')} className="px-4 py-2 bg-zinc-700 text-white border border-white">Lightkeeper Dash</button>
      </div>
    </div>
  );
};

export const AppRouter = () => {
  const { stage, setLocalCharacter, setStage, connect, accessSession, joinCampaign } = useGameStore();

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
            onSubmit={async (characterData) => {
              try {
                // Formatting payload
                const a = characterData.actions || {};
                const payload = {
                  name: characterData.name || "Unknown Investigator",
                  pronouns: characterData.pronouns || "Unlisted",
                  style: characterData.style || "",
                  catalyst: characterData.catalyst || "",
                  question: characterData.question || "",
                  role_ability: characterData.roleAbility || "None",
                  specialty_ability: characterData.specialtyAbility || "None",
                  gear: characterData.gear || [],
                  profile_pic: characterData.profilePic || null,
                  move:    a.move    || 0,
                  strike:  a.strike  || 0,
                  control: a.control || 0,
                  hide:    a.hide    || 0,
                  sneak:   a.sneak   || 0,
                  sway:    a.sway    || 0,
                  survey:  a.survey  || 0,
                  read:    a.read    || 0,
                  sense:   a.sense   || 0,
                };

                const response = await fetch('/api/investigators/forge', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("Forge Failed");

                const savedCharacter = await response.json();
                setLocalCharacter(savedCharacter);

                if (characterData.mode === 'join' && characterData.campaignCode) {
                  const joinResult = await joinCampaign(savedCharacter.id, characterData.campaignCode);
                  if (joinResult?.success) {
                    connect(savedCharacter.id);
                    setStage('DESK');
                  } else {
                    console.error("Failed to join campaign:", joinResult?.detail);
                    setStage('HOME');
                  }
                } else {
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