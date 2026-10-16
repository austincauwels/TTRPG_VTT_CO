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
// A long word in a narrow column used to split mid-word ("CASSAN / DRA"). The name shrinks
// to fit its longest word instead, to 14px at the least; words still wrap at the spaces,
// and break-words splits one only when even 14px cannot hold it.
const nameFit = (name) => {
  const longest = Math.max(1, ...String(name || '').split(/\s+/).map(w => w.length));
  return longest > 6 ? { fontSize: `${Math.max(14, Math.min(24, Math.floor(150 / longest)))}px` } : undefined;
};

// The state of a living investigator at a glance, in a line or two: incapacitated (or a scar owed),
// the marks on each track, a mark an open soak or Death Defy offer holds (held_marks), the
// scars, and advancements waiting. Empty for one in good order.
export const glanceOf = (inv) => {
  const marks = [['Body', inv.body_marks], ['Brain', inv.brain_marks], ['Bleed', inv.bleed_marks]]
    .filter(([, n]) => n > 0).map(([name, n]) => `${n} ${name}`);
  const scars = inv.scars_count || 0;
  const picks = inv.advancement_picks || 0;
  const heldTypes = Array.isArray(inv.held_marks?.mark_types) ? inv.held_marks.mark_types : [];
  const held = heldTypes.length
    // Equal types counted once: "2 Bleed marks held", "Body and Bleed marks held"
    ? `${[...new Set(heldTypes)].map((t) => {
      const n = heldTypes.filter(x => x === t).length;
      return `${n > 1 ? `${n} ` : ''}${t.charAt(0).toUpperCase()}${t.slice(1)}`;
    }).join(' and ')} ${heldTypes.length === 1 ? 'mark' : 'marks'} held${inv.held_marks.ability ? `: ${inv.held_marks.ability}?` : ''}`
    : null;
  return [
    inv.incapacitated ? (inv.scar_pending ? 'Incapacitated: scar owed' : 'Incapacitated') : null,
    marks.length ? `Marks: ${marks.join(', ')}` : null,
    held,
    scars > 0 ? `${scars} ${scars === 1 ? 'scar' : 'scars'}` : null,
    picks > 0 ? `${picks} ${picks === 1 ? 'advancement' : 'advancements'} waiting` : null,
  ].filter(Boolean);
};

// fallen: a dead investigator since replaced. The card is a record, not a button: their
// sheet is no longer on the roster to open.
export const InvestigatorBusinessCard = ({ inv, onClick, index = 0, deceased = false, fallen = false }) => {
  const Tag = fallen ? motion.div : motion.button;
  const glance = deceased || fallen ? [] : glanceOf(inv);
  const rotation = tiltFor(inv.id ?? inv.name, { min: 0.8, max: 2, sign: index % 2 ? 1 : -1 });
  const penFont = inv.pen_font || 'Caveat';
  deceased = deceased || fallen;
  const accentColor = deceased ? 'rgb(var(--c-ink))' : (inv.ink_color || 'rgb(var(--c-ink))');
  // The player changed the sheet by hand since the Lightkeeper last opened it (issue #64);
  // opening it takes the dot away
  const edited = !fallen && !!inv.sheet_edited;

  return (
    <Tag
      {...(fallen ? { role: 'group' } : { type: 'button', onClick })}
      aria-label={fallen ? `${inv.name}, fallen` : `Open ${inv.name}'s investigator sheet${deceased ? ' (deceased)' : ''}${edited ? ', changed by the player' : ''}`}
      title={edited ? 'Changed by the player since you last opened the sheet' : undefined}
      {...(fallen ? {} : { whileHover: { scale: 1.04, rotate: 0, zIndex: 10 }, whileTap: { scale: 0.97 } })}
      style={{ rotate: rotation }}
      className={`relative max-w-full min-w-0 ${fallen ? '' : 'cursor-pointer'} text-left shadow-[4px_6px_16px_rgba(0,0,0,0.65)]`}
    >
      {edited && (
        <span aria-hidden="true" data-sheet-edited=""
          className="absolute -top-1.5 -right-1.5 z-10 w-4 h-4 rounded-full bg-oxblood border-2 border-cream shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
      )}
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
              style={{ fontFamily: penFont, ...nameFit(inv.name) }}
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
            {glance.length > 0 && (
              <p className={`mt-2 font-sans text-xs font-bold leading-snug ${inv.incapacitated ? 'text-oxblood' : 'text-ink/80'}`}>
                {glance.join(' · ')}
              </p>
            )}
            {deceased && (
              <span aria-hidden="true" className="mt-3 -rotate-3 inline-flex items-center gap-1 border-2 border-ink rounded-sm px-1.5 py-0.5 font-sans text-xs font-black uppercase tracking-wider leading-tight text-ink">
                <MourningCross className="h-[0.95em]" /> {fallen ? 'Fallen' : 'Deceased'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Tag>
  );
};
