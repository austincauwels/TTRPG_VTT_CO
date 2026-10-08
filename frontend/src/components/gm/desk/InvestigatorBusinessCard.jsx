import React from 'react';
import { motion } from 'framer-motion';
import { tiltFor } from '../../shared/handPlaced';
import { SerialNo, serialFor } from '../../shared/PrintMarks';
import { MourningCross } from '../../shared/InkMarks';

// Each card lies where the GM dropped it: a lean of 0.8 to 2 degrees, fixed per
// investigator, neighbours leaning opposite ways. Gentle enough that the pen-font names
// stay easy to read; a card straightens when picked up (hover).
// A deceased investigator's card (deceased) has a black mourning band in place of the ink
// stripe, its photo in grey, and DECEASED stamped under the role; it still opens the sheet.
export const InvestigatorBusinessCard = ({ inv, onClick, index = 0, deceased = false }) => {
  const rotation = tiltFor(inv.id ?? inv.name, { min: 0.8, max: 2, sign: index % 2 ? 1 : -1 });
  const penFont = inv.pen_font || 'Caveat';
  const accentColor = deceased ? 'rgb(var(--c-ink))' : (inv.ink_color || 'rgb(var(--c-ink))');

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Open ${inv.name}'s investigator sheet${deceased ? ' (deceased)' : ''}`}
      whileHover={{ scale: 1.04, rotate: 0, zIndex: 10 }}
      whileTap={{ scale: 0.97 }}
      style={{ rotate: rotation }}
      className="relative max-w-full min-w-0 cursor-pointer text-left shadow-[4px_6px_16px_rgba(0,0,0,0.65)]"
    >
      <div className={`w-full rounded-sm overflow-hidden border bg-cream ${deceased ? 'border-ink/60' : 'border-ink/20'}`} style={{ minHeight: '140px' }}>
        {/* Accent stripe — player's ink color; a mourning band for the dead */}
        <div className={`${deceased ? 'h-5' : 'h-3'} w-full`} style={{ background: accentColor }} />

        <div className="flex">
          {/* Profile photo — shown only when present */}
          {inv.profile_pic && (
            <div className="shrink-0 border-r border-ink/10">
              <img
                src={inv.profile_pic}
                alt={inv.name}
                className={`w-24 xl:w-20 object-cover${deceased ? ' grayscale' : ''}`}
                style={{ minHeight: '128px', height: '100%' }}
              />
            </div>
          )}

          {/* Text content, and the member's number struck in red at the corner */}
          <div className="px-4 pt-3 pb-7 flex-1 min-w-0 relative">
            <SerialNo value={serialFor(inv.id ?? inv.name)} className="absolute bottom-2 right-3 text-[11px]" />
            <p
              className="text-2xl xl:text-xl 2xl:text-2xl font-bold leading-tight mb-2 break-words text-ink"
              style={{ fontFamily: penFont }}
            >
              {inv.name}
            </p>

            <div className="h-px w-full mb-3" style={{ background: accentColor, opacity: 0.25 }} />

            <div className="space-y-1">
              {inv.role_class && (
                <p className="font-sans font-bold text-sm uppercase tracking-widest truncate text-ink">
                  {inv.role_class}
                </p>
              )}
              {inv.specialty && (
                <p className="font-sans text-xs uppercase tracking-widest truncate text-sepia">
                  {inv.specialty}
                </p>
              )}
            </div>
            {deceased && (
              <span aria-hidden="true" className="mt-3 -rotate-3 inline-flex items-center gap-1 border-2 border-ink rounded-sm px-1.5 py-0.5 font-sans text-xs font-black uppercase tracking-wider leading-tight text-ink">
                <MourningCross className="h-[0.95em]" /> Deceased
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.button>
  );
};
