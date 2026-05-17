import React, { useState } from 'react';
import * as Gi from "react-icons/gi";

// Standard equipment issue ledger available to all investigators
const STANDARD_GEAR = [
  "Bleed Detector", "Bleed Containment Vial", "Hand Weapon", "Lantern", "Matches & Candles", "First Aid Kit"
];

// Complete Thematic Mapping Configuration Built from Spreadsheet Records
const ROLES = {
  "Face": {
    icon: "GiDramaMasks",
    description: "You are the charming, manipulative, and social expert of the Circle.",
    keys: [["Gather Statements"], ["Hunt Down a Lead"], ["Speak Truth to Power"]],
    baseAbilities: {
      "I Know a Guy": { icon: "GiThreeFriends", text: "Once per assignment, you can produce a contact who possesses specialized knowledge or resources." },
      "Sweet Talk": { icon: "GiLips", text: "When you Sway someone by flattering them or offering them something they want, add +1d." },
      "Cool Under Pressure": { icon: "GiIciclesAura", text: "You may spend 1 Drive to take a Brain mark instead of a Bleed mark." }
    },
    specialties: {
      "Journalist": {
        icon: "GiNewspaper",
        description: "You chase the truth, no matter what shadows it hides in.",
        gear: ["Press Credentials", "Camera", "Hidden Recording Device"],
        stats: { nerve: { move: 0, strike: 0, control: 1, max: 2 }, cunning: { sway: 2, read: 2, hide: 0, max: 4 }, intuition: { survey: 1, read: 0, sense: 0, max: 3 } }
      },
      "Magician": {
        icon: "GiMagicSwirl",
        description: "Misdirection is your shield; secrets are your currency.",
        gear: ["Sleight of Hand Toolkit", "Flash Powder", "Deck of Marked Cards"],
        stats: { nerve: { move: 0, strike: 0, control: 2, max: 2 }, cunning: { sway: 1, read: 1, hide: 1, max: 4 }, intuition: { survey: 0, read: 1, sense: 0, max: 3 } }
      }
    }
  },
  "Muscle": {
    icon: "GiBiceps",
    description: "You are the shield, the hammer, and the enforcer of the group.",
    keys: [["Protect Someone"], ["Smash Barrier"], ["Stand Ground"]],
    baseAbilities: {
      "Bodyguard": { icon: "GiShield", text: "When an ally within arm's reach takes a physical mark, you can take it instead." },
      "Unstoppable": { icon: "GiAnvil", text: "The first time you take a Body mark in a session, ignore it." },
      "Threatening Presence": { icon: "Gi怒", text: "You can use Strike instead of Sway when intimidating an NPC." }
    },
    specialties: {
      "Enforcer": {
        icon: "GiKnuckles",
        description: "You do the heavy lifting, legal or otherwise.",
        gear: ["Brass Knuckles", "Heavy Leather Coat", "Crowbar"],
        stats: { nerve: { move: 1, strike: 2, control: 0, max: 4 }, cunning: { sway: 0, read: 1, hide: 1, max: 3 }, intuition: { survey: 1, read: 0, sense: 0, max: 2 } }
      },
      "Soldier": {
        icon: "GiMilitaryHelmet",
        description: "A veteran of mud and blood, still carrying wartime instincts.",
        gear: ["Service Pistol", "Trench Knife", "Medals of Service"],
        stats: { nerve: { move: 1, strike: 1, control: 1, max: 4 }, cunning: { sway: 0, read: 0, hide: 1, max: 2 }, intuition: { survey: 2, read: 0, sense: 0, max: 3 } }
      }
    }
  },
  "Scholar": {
    icon: "GiBookPile",
    description: "You understand the mechanics of history, science, and the esoteric.",
    keys: [["Analyze Clue"], ["Translate Text"], ["Recall Lore"]],
    baseAbilities: {
      "Library Card": { icon: "GiCardExchange", text: "When researching at a university or archive, your circle gains +1 preparation pool." },
      "Anatomist": { icon: "GiHumanPyramid", text: "Your First Aid actions heal 2 marks instead of 1." },
      "Forbidden Knowledge": { icon: "GiScrollUnfurled", text: "You can spend Intuition drive to roll on ancient magical phenomena." }
    },
    specialties: {
      "Doctor": {
        icon: "GiMedicalPack",
        description: "You've sworn an oath to heal, even when dealing with unholy conditions.",
        gear: ["Surgical Tools", "Morphine Vials", "Chemical Reagents"],
        stats: { nerve: { move: 0, strike: 0, control: 1, max: 2 }, cunning: { sway: 1, read: 1, hide: 0, max: 3 }, intuition: { survey: 1, read: 1, sense: 2, max: 4 } }
      },
      "Professor": {
        icon: "GiMortarboard",
        description: "An academic seeking proof of elements mainstream science dismisses.",
        gear: ["Rare Esoteric Text", "Magnifying Glass", "Journal Notebook"],
        stats: { nerve: { move: 0, strike: 0, control: 0, max: 2 }, cunning: { sway: 1, read: 2, hide: 0, max: 4 }, intuition: { survey: 2, read: 1, sense: 0, max: 3 } }
      }
    }
  },
  "Slink": {
    icon: "GiFootsteps",
    description: "You operate in the margins, navigating locks, shadows, and tight corners.",
    keys: [["Infiltrate Space"], ["Pick Pocket"], ["Vanish from Sight"]],
    baseAbilities: {
      "Locksmith": { icon: "GiPadlockKeys", text: "You automatically bypass non-magical locks given a few moments of quiet." },
      "Shadow": { icon: "GiShadowFollower", text: "When rolling Hide in dim light or architectural cover, add +1d." },
      "Street Smarts": { icon: "GiCardDiscard", text: "You can find secure black-market lodging or hidden safehouses in any urban sector." }
    },
    specialties: {
      "Thief": {
        icon: "GiBurglarMask",
        description: "What belongs to the wealthy belongs to whoever can take it.",
        gear: ["Lockpick Set", "Glass Cutter", "Dark Silk Cloak"],
        stats: { nerve: { move: 1, strike: 0, control: 1, max: 3 }, cunning: { sway: 0, read: 1, hide: 2, max: 4 }, intuition: { survey: 1, read: 0, sense: 0, max: 2 } }
      },
      "Criminal": {
        icon: "GiFedora",
        description: "You know the underground rules, because you helped write them.",
        gear: ["Forged Identity Papers", "Pocket Knife", "Loaded Dice"],
        stats: { nerve: { move: 0, strike: 1, control: 1, max: 3 }, cunning: { sway: 1, read: 0, hide: 2, max: 4 }, intuition: { survey: 0, read: 1, sense: 0, max: 2 } }
      }
    }
  },
  "Weird": {
    icon: "GiCrystalBall",
    description: "You are attuned directly to the Bleed, sensing supernatural phenomena.",
    keys: [["Read Aura"], ["Commune with Echo"], ["Banish Entity"]],
    baseAbilities: {
      "Shatter Veil": { icon: "GiBleedingEye", text: "You can see invisible bleed traces directly with your naked eyes." },
      "Medium": { icon: "GiGhost", text: "Once per assignment, you can ask a corpse or residual spirit one question." },
      "Ward Sign": { icon: "GiHand", text: "You can present a custom emblem to briefly halt a minor bleed manifestation." }
    },
    specialties: {
      "Occultist": {
        icon: "GiPentagramFox",
        description: "You study the phenomena mainstream society labels as insanity.",
        gear: ["Tarot Deck", "Chalk & Ritual Candles", "Obsidian Dagger"],
        stats: { nerve: { move: 0, strike: 0, control: 1, max: 2 }, cunning: { sway: 1, read: 0, hide: 1, max: 3 }, intuition: { survey: 1, read: 1, sense: 2, max: 4 } }
      },
      "Medium": {
        icon: "GiCalavera",
        description: "A walking bridge between the physical world and death's doorway.",
        gear: ["Spirit Board", "Amulet Focus", "Vial of Holy Water"],
        stats: { nerve: { move: 0, strike: 0, control: 0, max: 2 }, cunning: { sway: 2, read: 1, hide: 0, max: 4 }, intuition: { survey: 0, read: 1, sense: 2, max: 4 } }
      }
    }
  }
};

const BrassCornerFiligree = () => (
  <>
    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#d4af37]" />
    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#d4af37]" />
    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#d4af37]" />
    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#d4af37]" />
  </>
);

const SafeIcon = ({ name, size = 24, className = "" }) => {
  if (!name || !Gi[name]) return <div style={{ width: size, height: size }} className="bg-[#b8860b]/10 border border-dashed border-[#b8860b]/40 rounded" />;
  return React.createElement(Gi[name], { size, className });
};

export const CharacterCreator = ({ onSubmit }) => {
  const [step, setStep] = useState(1);
  const [isForging, setIsForging] = useState(false);
  const [errorLog, setErrorLog] = useState(null);

  // Identity State
  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [style, setStyle] = useState("");
  const [catalyst, setCatalyst] = useState("");
  const [question, setQuestion] = useState("");
  
  // Archetype & Mechanics Selection State
  const [role, setRole] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [selectedRoleAbility, setSelectedRoleAbility] = useState("");
  const [selectedSpecialtyAbility, setSelectedSpecialtyAbility] = useState("");
  const [selectedGear, setSelectedGear] = useState([]);

  const renderDots = (count, max = 3, color = "bg-[#e5c158]") => (
    <div className="flex gap-2 bg-black/50 p-2 rounded-md border border-[#3e2f29]">
      {[...Array(max)].map((_, i) => (
        <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 border-[#160f0d] ${i < count ? color : 'bg-[#1c1412]'}`} />
      ))}
    </div>
  );

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    setSpecialty("");
    setSelectedRoleAbility("");
    setSelectedSpecialtyAbility("");
    setSelectedGear([]);
  };

  const toggleGear = (item) => {
    if (selectedGear.includes(item)) {
      setSelectedGear(selectedGear.filter(g => g !== item));
    } else if (selectedGear.length < 3) {
      setSelectedGear([...selectedGear, item]);
    }
  };

  // --- CONNECT TO BACKEND DATABASE ROUTE ---
  const handleForgeSubmission = async () => {
    setIsForging(true);
    setErrorLog(null);

    const activeRole = ROLES[role];
    const activeSpec = activeRole?.specialties[specialty];
    const stats = activeSpec?.stats || {};

    // Build the payload mapping accurately to schemas.py parameters
    const characterPayload = {
      name: name || "Unknown Investigator",
      pronouns: pronouns || "Unlisted",
      style: style || "",
      catalyst: catalyst || "",
      question: question || "",
      role_ability: selectedRoleAbility || "None",
      specialty_ability: selectedSpecialtyAbility || "None",
      gear: [...selectedGear, ...STANDARD_GEAR],
      profile_pic: null,

      // Action point values mapping
      move: stats.nerve?.move || 0,
      strike: stats.nerve?.strike || 0,
      control: stats.nerve?.control || 0,
      sneak: stats.cunning?.sneak || 0,
      hide: stats.cunning?.hide || 0,
      sway: stats.cunning?.sway || 0,
      survey: stats.intuition?.survey || 0,
      read: stats.intuition?.read || 0,
      sense: stats.intuition?.sense || 0,

      // Initializing Drive Pools
      nerve_max: stats.nerve?.max || 1,
      nerve_current: stats.nerve?.max || 1,
      cunning_max: stats.cunning?.max || 1,
      cunning_current: stats.cunning?.max || 1,
      intuition_max: stats.intuition?.max || 1,
      intuition_current: stats.intuition?.max || 1,

      // Base Health Tracks
      body_marks: 0,
      brain_marks: 0,
      bleed_marks: 0,
      scars_count: 0,
      scars_list: [],
      incapacitated: false
    };

    try {
      // Connect safely over your open secure proxy cloud domain
      const response = await fetch('https://animated-space-chainsaw-r495qgrq5vv5cpg74-8000.app.github.dev/api/investigators/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterPayload)
      });

      if (!response.ok) {
        throw new Error(`The Vault rejected the ledger entry: ${response.statusText}`);
      }

      const savedData = await response.json();
      
      // Pass the returned database row data upstream to App.jsx handler
      if (onSubmit) onSubmit(savedData);

    } catch (err) {
      console.error(err);
      setErrorLog(err.message);
    } finally {
      setIsForging(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#1c1311] via-[#120b0a] to-[#0f0807] py-6 px-4 text-[#f6f3eb] select-none flex items-center justify-center font-serif">
      <div className="w-full max-w-5xl bg-[#160f0d] border-2 border-[#3e2f29] rounded p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative grid grid-cols-1 lg:grid-cols-12 gap-8">
        <BrassCornerFiligree />

        {/* LEFT COLUMN: Controls & Input Fields (7 Grid units) */}
        <div className="lg:col-span-7 flex flex-col justify-between border-r border-[#3e2f29]/30 pr-0 lg:pr-8">
          
          {/* Wizard Progression Breadcrumb Track */}
          <div className="flex items-center gap-3 mb-6 font-sans font-black tracking-widest text-[11px]">
            <span className={step === 1 ? "text-[#e5c158]" : "opacity-40"}>01. IDENTITY</span>
            <div className="w-8 h-[1px] bg-[#3e2f29]" />
            <span className={step === 2 ? "text-[#e5c158]" : "opacity-40"}>02. ARCHETYPE</span>
            <div className="w-8 h-[1px] bg-[#3e2f29]" />
            <span className={step === 3 ? "text-[#e5c158]" : "opacity-40"}>03. VERIFICATION</span>
          </div>

          {errorLog && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-800 rounded text-xs text-red-300 font-sans">
              ⚠️ {errorLog}
            </div>
          )}

          {/* STEP 1: Core Narrative Parameters */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-2xl text-[#e5c158] uppercase tracking-tighter font-black font-sans">Document Identity</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1">Investigator Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-[#3e2f29] rounded p-2 text-sm focus:outline-none focus:border-[#e5c158] transition-colors" placeholder="e.g., Silas Finch" />
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1">Pronouns</label>
                  <input type="text" value={pronouns} onChange={(e) => setPronouns(e.target.value)} className="w-full bg-black/40 border border-[#3e2f29] rounded p-2 text-sm focus:outline-none focus:border-[#e5c158] transition-colors" placeholder="e.g., He/They" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1">Attire & Visual Style Description</label>
                <textarea value={style} onChange={(e) => setStyle(e.target.value)} rows="2" className="w-full bg-black/40 border border-[#3e2f29] rounded p-2 text-sm focus:outline-none focus:border-[#e5c158] transition-colors resize-none" placeholder="Describe tailored wool coats, ink-stained fingers, gold watch chains..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1">The Catalyst</label>
                  <textarea value={catalyst} onChange={(e) => setCatalyst(e.target.value)} rows="3" className="w-full bg-black/40 border border-[#3e2f29] rounded p-2 text-sm focus:outline-none focus:border-[#e5c158] transition-colors resize-none" placeholder="What drove you into the investigations of the occult? What did you witness?" />
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1">The Question</label>
                  <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows="3" className="w-full bg-black/40 border border-[#3e2f29] rounded p-2 text-sm focus:outline-none focus:border-[#e5c158] transition-colors resize-none" placeholder="What core truth are you seeking answers to, no matter the toll?" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Archetype, Specialties, and Equipment Arrays */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-2xl text-[#e5c158] uppercase tracking-tighter font-black font-sans">Choose Specialty Assignment</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1">Core Class Role</label>
                  <select value={role} onChange={handleRoleChange} className="w-full bg-black/60 border border-[#3e2f29] rounded p-2 text-sm text-[#f6f3eb] focus:outline-none focus:border-[#e5c158]">
                    <option value="">Select a Role...</option>
                    {Object.keys(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1">Specialty Focus</label>
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} disabled={!role} className="w-full bg-black/60 border border-[#3e2f29] rounded p-2 text-sm text-[#f6f3eb] focus:outline-none focus:border-[#e5c158] disabled:opacity-30">
                    <option value="">Select a Specialty...</option>
                    {role && Object.keys(ROLES[role].specialties).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {role && specialty && (
                <div className="grid grid-cols-2 gap-4 border-t border-[#3e2f29]/30 pt-4">
                  <div>
                    <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-[#e5c158] mb-2">Select Active Ability</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {Object.keys(ROLES[role].baseAbilities).map(ab => (
                        <div key={ab} onClick={() => setSelectedRoleAbility(ab)} className={`p-2 border rounded text-xs cursor-pointer transition-all ${selectedRoleAbility === ab ? 'border-[#e5c158] bg-[#e5c158]/10' : 'border-[#3e2f29] bg-black/20 hover:border-[#e5c158]/50'}`}>
                          <div className="font-bold flex items-center gap-1.5 mb-0.5 text-[#e5c158]">
                            <SafeIcon name={ROLES[role].baseAbilities[ab].icon} size={14} /> {ab}
                          </div>
                          <p className="opacity-70 leading-relaxed">{ROLES[role].baseAbilities[ab].text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-sans font-black uppercase tracking-widest text-[#e5c158] mb-2">Select 3 Field Gear Pieces</label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {ROLES[role].specialties[specialty].gear.map(item => {
                        const active = selectedGear.includes(item);
                        return (
                          <div key={item} onClick={() => toggleGear(item)} className={`p-2 border rounded text-xs cursor-pointer transition-all flex justify-between items-center ${active ? 'border-red-500 bg-red-950/20' : 'border-[#3e2f29] bg-black/20 hover:border-red-500/40'}`}>
                            <span>{item}</span>
                            <div className={`w-3.5 h-3.5 border rounded-sm flex items-center justify-center text-[10px] ${active ? 'bg-red-600 border-red-500 text-white' : 'border-[#3e2f29]'}`}>{active && "✓"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Complete Dossier Verification */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-2xl text-[#e5c158] uppercase tracking-tighter font-black font-sans">Affix Signature Stamp</h2>
              <p className="text-sm font-serif leading-relaxed opacity-70">
                By sealing this entry, you commit your investigator's stats, resources, and narrative profile into the Order's ledger archive. The network session will initialize immediately upon completion.
              </p>
              <div className="p-4 bg-black/40 border border-[#3e2f29] rounded flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#e5c158] mb-0.5">{name || "Unnamed Investigator"}</h4>
                  <p className="text-xs opacity-50">The {specialty || "Unassigned"} Focus Ledger</p>
                </div>
                <SafeIcon name="GiFountainPen" size={32} className="text-[#e5c158]/40" />
              </div>
            </div>
          )}

          {/* Wizard Control Navigation Toggle Footbar */}
          <div className="flex justify-between items-center border-t border-[#3e2f29]/30 pt-4 mt-6">
            <button type="button" disabled={step === 1 || isForging} onClick={() => setStep(s => s - 1)} className="font-sans font-black tracking-widest text-xs uppercase px-4 py-2 border border-[#3e2f29] rounded bg-black/20 disabled:opacity-20 hover:bg-black/40 transition-colors">
              Back
            </button>
            
            {step < 3 ? (
              <button type="button" disabled={(step === 2 && (!role || !specialty || !selectedRoleAbility || selectedGear.length !== 3))} onClick={() => setStep(s => s + 1)} className="font-sans font-black tracking-widest text-xs uppercase px-5 py-2 rounded bg-[#721c15] hover:bg-red-800 text-white shadow-md disabled:opacity-30 transition-colors">
                Continue
              </button>
            ) : (
              <button type="button" disabled={isForging} onClick={handleForgeSubmission} className="font-sans font-black tracking-widest text-xs uppercase px-6 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-black shadow-[0_0_15px_rgba(229,193,88,0.3)] disabled:opacity-30 transition-all flex items-center gap-2">
                {isForging ? "Cataloging..." : "Complete Dossier"}
              </button>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Real-Time Slate Ledger Blueprint Mockup (5 Grid units) */}
        <div className="lg:col-span-5 bg-black/30 p-4 rounded border border-[#3e2f29]/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#3e2f29] pb-2 mb-4">
              <SafeIcon name={role && ROLES[role] ? ROLES[role].icon : "GiScrollUnfurled"} className="text-[#e5c158]" size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest text-[#e5c158]">Ledger Core Metadata</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#3e2f29]/30 pb-1">
                <span className="opacity-40">Dossier Name:</span>
                <span className="font-bold text-[#f6f3eb]">{name || "---"}</span>
              </div>
              <div className="flex justify-between border-b border-[#3e2f29]/30 pb-1">
                <span className="opacity-40">Assigned Specialty:</span>
                <span className="font-bold text-[#e5c158]">{specialty ? `${role} (${specialty})` : "---"}</span>
              </div>

              {/* Dynamic Action Metrics Array Rendering Block */}
              <div className="mt-4 space-y-2">
                <h4 className="text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1">Expected Action Load</h4>
                
                <div className="flex justify-between items-center">
                  <span>Nerve (Move/Strike/Control):</span>
                  {renderDots(role && specialty ? ROLES[role].specialties[specialty].stats.nerve.max : 0, 4, "bg-red-600")}
                </div>
                <div className="flex justify-between items-center">
                  <span>Cunning (Sway/Read/Hide):</span>
                  {renderDots(role && specialty ? ROLES[role].specialties[specialty].stats.cunning.max : 0, 4, "bg-emerald-600")}
                </div>
                <div className="flex justify-between items-center">
                  <span>Intuition (Survey/Focus/Sense):</span>
                  {renderDots(role && specialty ? ROLES[role].specialties[specialty].stats.intuition.max : 0, 4, "bg-blue-600")}
                </div>
              </div>

              {/* Dynamic Equipment Array Checklist Layout Render */}
              <div className="mt-4">
                <h4 className="text-[10px] font-sans font-black uppercase tracking-widest text-red-400 mb-1.5">Manifest Gear Loadout</h4>
                <div className="flex flex-wrap gap-1">
                  {STANDARD_GEAR.map(g => <span key={g} className="bg-black/50 border border-[#3e2f29] rounded px-1.5 py-0.5 text-[9px] opacity-40">{g}</span>)}
                  {selectedGear.map(g => <span key={g} className="bg-red-950/40 border border-red-900/60 text-red-300 rounded px-1.5 py-0.5 text-[9px] font-bold">{g}</span>)}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#3e2f29] pt-4 mt-4 space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between mb-1"><span>Database Sync Status:</span> <span className="text-amber-500">Staging Mode</span></div>
              <div className="w-full h-2.5 bg-black/50 rounded overflow-hidden border border-[#3e2f29]">
                <div className="w-3/4 h-full bg-amber-500" />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><span>Bleed Exposure:</span> <span className="text-red-400">1 / 6 Boxes</span></div>
              <div className="w-full h-2.5 bg-black/50 rounded overflow-hidden border border-[#3e2f29]">
                <div className="w-1/6 h-full bg-red-600" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};