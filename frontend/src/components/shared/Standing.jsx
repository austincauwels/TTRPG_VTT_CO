import React from 'react';

// How an investigator stands, in a few words on a circle card: incapacitated, and the scars
// they carry. Nothing for one who is able to act and unmarked. The dead are not shown here
// (the circle's cards leave them out; the Lightkeeper's roster stamps them Deceased).
export const Standing = ({ inv, className = '' }) => {
  const down = !!inv?.incapacitated && !inv?.is_dead;
  const scars = inv?.scars_count || 0;
  if (!down && scars === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 font-sans text-xs font-bold uppercase tracking-wider ${className}`}>
      {down && <span className="text-oxblood">Incapacitated</span>}
      {scars > 0 && <span className="text-sepia">{scars} {scars === 1 ? 'scar' : 'scars'}</span>}
    </span>
  );
};
