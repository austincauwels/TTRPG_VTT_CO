import React from 'react';

// Static in-world newspaper. The sheet is a child of the Herald, so the Herald's cast
// shadow (thrown away from the candles) can lie under it. The advertisement's corner marks
// are absolute inside a box with no `relative`, so they position against the sheet: keep
// the nesting.
export const HalcyonHerald = () => (
  <div data-hub="herald" data-cast="0.22" className="herald hidden lg:block w-[960px] h-[700px] rotate-[-8deg] top-[-40px] left-[-100px] z-10">
    <span className="cast" aria-hidden="true" />
    <div className="herald-sheet p-7">
    
      {/* Elaborate Broadsheet Header */}
      <div className="border-b-[4px] border-double border-ink pb-2 mb-3 text-center relative z-20">
        <h1 className="font-display text-[46px] leading-none text-ink scale-y-[1.1] mb-1">THE HALCYON HERALD</h1>
        <div className="flex justify-between items-center font-display text-[11px] uppercase tracking-widest border-t border-ink pt-1.5">
          <span>Vol. XCIV, No. 212</span>
          <span>The Fairelands</span>
          <span>Two Pence</span>
        </div>
      </div>
    
      {/* Horizontal Layout - Main Headline spans across top */}
      <div className="border-b-[2px] border-ink pb-2 mb-3 text-center z-20">
        <h2 className="font-display text-[34px] leading-none uppercase tracking-wide text-ink">
          TERROR IN THE SIDLE!
        </h2>
        <h3 className="font-serif text-base italic font-semibold mt-1 text-ink/85">
          Authorities Baffled by Midnight Disappearances
        </h3>
      </div>

      {/* 3-Column Text Layout with Expanded Content */}
      <div className="columns-3 gap-6 font-serif text-[15px] leading-[1.6] text-justify text-ink/90 z-20 h-full overflow-hidden">
        <p className="mb-4">
          <span className="text-5xl float-left mr-2 mt-1 leading-none font-display text-ink">C</span>itizens are strongly urged to remain indoors after nightfall following a staggering series of inexplicable vanishings in the lower wards. The constabulary maintains that there is no cause for mass hysteria. Commissioner Vane stated this morning that the disappearances are likely linked to "migratory patterns of the transient population" and strictly advised the public against spreading sensationalist rumors that might incite unrest.
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
        <div className="border-2 border-ink p-4 text-center shadow-[inset_0_0_15px_rgba(0,0,0,0.1)] break-inside-avoid mt-2 bg-parchment-deep">
          <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-ink" />
          <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-ink" />
          <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-ink" />
          <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-ink" />
        
          <h4 className="font-display text-xl mb-1 uppercase leading-none mt-1">Dr. West's</h4>
          <h5 className="font-display text-xs uppercase tracking-wider mb-3 border-b border-ink/40 pb-1 mx-2">Tincture for Hysteria</h5>
          <p className="font-serif text-xs leading-tight italic px-1">
            Calms the frayed nerves of the weary traveler. Restores the essential humors of the blood. Erases dreadful visions of the Unseen. Only available at the apothecary of the Periphery. Beware of cheap imitations!
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Narrow screens: the same paper folded down to its masthead and headline, set at the foot
// of the desk so it never covers the tomes or tickets.
export const HalcyonHeraldStrip = () => (
  <div className="newspaper-strip lg:hidden w-full max-w-[560px] rotate-[-1.5deg] px-4 pt-3 pb-4 text-center">
    <div className="border-b-[3px] border-double border-ink pb-1.5 mb-2">
      <p className="font-display text-[26px] sm:text-[34px] text-ink leading-tight">THE HALCYON HERALD</p>
      <div className="flex justify-between items-center font-display text-[11px] uppercase tracking-widest border-t border-ink pt-1 mt-1">
        <span>Vol. XCIV, No. 212</span>
        <span>The Fairelands</span>
        <span>Two Pence</span>
      </div>
    </div>
    <p className="font-display text-xl sm:text-2xl leading-none uppercase tracking-wide text-ink">
      TERROR IN THE SIDLE!
    </p>
    <p className="font-serif text-sm sm:text-base italic font-semibold mt-1 text-ink/85">
      Authorities Baffled by Midnight Disappearances
    </p>
  </div>
);
