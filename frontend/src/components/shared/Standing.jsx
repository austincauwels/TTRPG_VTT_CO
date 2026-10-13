import React from 'react';
import { MourningCross } from './InkMarks';

// How an investigator stands, in a few words on a circle card: incapacitated, and the scars
// they carry. Nothing for one who is able to act and unmarked. The circle's cards leave the
// dead out; the relationships paper still lists them, stamped Dead (the Lightkeeper's
// roster stamps them Deceased).
export const Standing = ({ inv, className = '' }) => {
  if (inv?.is_dead) {
    return (
      <span className={`inline-flex items-center gap-1 font-sans text-xs font-bold uppercase tracking-wider text-oxblood ${className}`}>
        <MourningCross className="h-[0.95em]" /> Dead
      </span>
    );
  }
  const down = !!inv?.incapacitated;
  const scars = inv?.scars_count || 0;
  if (!down && scars === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 font-sans text-xs font-bold uppercase tracking-wider ${className}`}>
      {down && <span className="text-oxblood">Incapacitated</span>}
      {scars > 0 && <span className="text-sepia">{scars} {scars === 1 ? 'scar' : 'scars'}</span>}
    </span>
  );
};
