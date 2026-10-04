import React from 'react';

// Static in-world newspaper. The advertisement's corner marks are absolute inside a box
// with no `relative`, so they position against the newspaper: keep the nesting.
export const HalcyonHerald = () => (
  <div className="newspaper-top-fold w-[960px] h-[700px] p-7 rotate-[-8deg] top-[-40px] left-[-100px] flex flex-col overflow-hidden">
    
    {/* Elaborate Broadsheet Header */}
    <div className="border-b-[4px] border-double border-[#2b251e] pb-2 mb-3 text-center relative z-20">
      <h1 className="font-cinzel text-[42px] font-black tracking-tight text-[#1f1b15] scale-y-[1.1] mb-1">THE HALCYON HERALD</h1>
      <div className="flex justify-between items-center font-mono-data text-[8px] uppercase tracking-widest font-bold border-t border-[#2b251e] pt-1.5">
        <span>Vol. XCIV, No. 212</span>
        <span>The Fairelands</span>
        <span>Two Pence</span>
      </div>
    </div>
    
    {/* Horizontal Layout - Main Headline spans across top */}
    <div className="border-b-[2px] border-[#2b251e] pb-2 mb-3 text-center z-20">
      <h2 className="font-playfair text-3xl font-black leading-none uppercase tracking-wide text-[#1a1611]">
        TERROR IN THE SIDLE!
      </h2>
      <h3 className="font-garamond text-[15px] italic font-semibold mt-1 text-[#3b3227]">
        Authorities Baffled by Midnight Disappearances
      </h3>
    </div>

    {/* 3-Column Text Layout with Expanded Content */}
    <div className="columns-3 gap-6 font-garamond text-[14.5px] leading-[1.65] text-justify opacity-90 z-20 h-full overflow-hidden">
      <p className="mb-4">
        <span className="text-5xl float-left mr-2 mt-1 leading-none font-cinzel font-bold text-[#1f1b15]">C</span>itizens are strongly urged to remain indoors after nightfall following a staggering series of inexplicable vanishings in the lower wards. The constabulary maintains that there is no cause for mass hysteria. Commissioner Vane stated this morning that the disappearances are likely linked to "migratory patterns of the transient population" and strictly advised the public against spreading sensationalist rumors that might incite unrest.
      </p>
      <p className="mb-4">
        "It took him right out of the alley," claims one docker, visibly shaken, his hands trembling as he gestured toward the dense fog blanketing the canal. "No sound, no struggle. Just swallowed by the damp. One moment he was lighting his pipe, the next, the fog just... closed over him. There was a smell, too—like ozone and wet earth."
      </p>
      <p className="mb-4">
        Officials at the Periphery decline to comment on rumors of occult involvement, citing an ongoing municipal investigation into local infrastructure collapse. Whispers among the working class point to phenomena long dismissed by the aristocracy, suggesting that the very stones of Newfaire are waking up to claim their due.
      </p>
      <p className="mb-4">
        Unconfirmed reports from Southward suggest a similar pattern of events occurred exactly a century prior. Historians at the Antiquarian Society were unavailable for comment, though archived journals unearthed by independent researchers note a "culling of the unworthy" during that frozen, blood-stained winter of 1826.
      </p>
      <p className="mb-4">
        In unrelated news, the Briarbank tram line remains closed following yesterday's "structural anomaly." Passengers are advised to seek alternative routes until further notice, as repair crews refuse to descend into the tunnels after dark, citing "unnatural vibrations" emanating from the bedrock itself.
      </p>
      <p className="mb-4">
        The city council has scheduled a emergency hearing for Tuesday to address the plummeting morale. Attendance is mandatory for all district representatives, though several have already fled to their estates in the High Country.
      </p>

      {/* Robust Advertisement Module */}
      <div className="border-2 border-[#2b251e] p-4 text-center shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] break-inside-avoid mt-2 bg-[#d2c7ac]">
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-[#2b251e]" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-[#2b251e]" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-[#2b251e]" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-[#2b251e]" />
        
        <h4 className="font-playfair font-black text-lg mb-1 uppercase leading-none mt-1">Dr. West's</h4>
        <h5 className="font-cinzel text-[10px] font-bold mb-3 border-b border-[#2b251e]/40 pb-1 mx-2">Tincture for Hysteria</h5>
        <p className="font-garamond text-xs leading-tight italic opacity-90 px-1">
          Calms the frayed nerves of the weary traveler. Restores the essential humors of the blood. Erases dreadful visions of the Unseen. Only available at the apothecary of the Periphery. Beware of cheap imitations!
        </p>
      </div>
    </div>
  </div>
);
