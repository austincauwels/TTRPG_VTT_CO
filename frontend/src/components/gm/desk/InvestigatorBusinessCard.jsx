import React from 'react';
import { motion } from 'framer-motion';

const CARD_ROTATIONS = [-4, 3, -2, 5, -3, 2, -5, 4];

export const InvestigatorBusinessCard = ({ inv, onClick, index = 0 }) => {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];
  const penFont = inv.pen_font || 'Caveat';
  const accentColor = inv.ink_color || '#2a1a0e';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04, rotate: 0, zIndex: 10 }}
      whileTap={{ scale: 0.97 }}
      style={{ rotate: rotation }}
      className="relative cursor-pointer text-left shadow-[4px_6px_16px_rgba(0,0,0,0.65)]"
    >
      <div className="w-full rounded-sm overflow-hidden border border-black/20 bg-white" style={{ minHeight: '140px' }}>
        {/* Accent stripe — player's ink color */}
        <div className="h-3 w-full" style={{ background: accentColor }} />

        <div className="flex">
          {/* Profile photo — shown only when present */}
          {inv.profile_pic && (
            <div className="shrink-0 border-r border-black/10">
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
              className="text-2xl font-bold leading-tight mb-2 truncate text-black"
              style={{ fontFamily: penFont }}
            >
              {inv.name}
            </p>

            <div className="h-px w-full mb-3" style={{ background: accentColor, opacity: 0.25 }} />

            <div className="space-y-1">
              {inv.role_class && (
                <p className="font-mono text-base uppercase tracking-wider truncate text-black">
                  {inv.role_class}
                </p>
              )}
              {inv.specialty && (
                <p className="font-mono text-sm uppercase tracking-wider truncate text-black">
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
