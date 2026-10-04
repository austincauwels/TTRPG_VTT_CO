import React from 'react';
import { motion } from 'framer-motion';

// A gentle lean, so the pen-font names stay easy to read.
const CARD_ROTATIONS = [-2, 1.5, -1, 2, -1.5, 1, -2, 1.5];

export const InvestigatorBusinessCard = ({ inv, onClick, index = 0 }) => {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];
  const penFont = inv.pen_font || 'Caveat';
  const accentColor = inv.ink_color || 'rgb(var(--c-ink))';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`Open ${inv.name}'s investigator sheet`}
      whileHover={{ scale: 1.04, rotate: 0, zIndex: 10 }}
      whileTap={{ scale: 0.97 }}
      style={{ rotate: rotation }}
      className="relative cursor-pointer text-left shadow-[4px_6px_16px_rgba(0,0,0,0.65)]"
    >
      <div className="w-full rounded-sm overflow-hidden border border-ink/20 bg-cream" style={{ minHeight: '140px' }}>
        {/* Accent stripe — player's ink color */}
        <div className="h-3 w-full" style={{ background: accentColor }} />

        <div className="flex">
          {/* Profile photo — shown only when present */}
          {inv.profile_pic && (
            <div className="shrink-0 border-r border-ink/10">
              <img
                src={inv.profile_pic}
                alt={inv.name}
                className="w-24 object-cover"
                style={{ minHeight: '128px', height: '100%' }}
              />
            </div>
          )}

          {/* Text content */}
          <div className="px-4 py-3 flex-1 min-w-0">
            <p
              className="text-2xl font-bold leading-tight mb-2 truncate text-ink"
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
          </div>
        </div>
      </div>
    </motion.button>
  );
};
