import React from 'react';

// A campaign's own mark, as a binder would tool it in gold on a cover: the campaign's
// initials inside a frame. The frame's shape and its small ornament follow from the
// campaign's name (a fixed hash), so a campaign always keeps the same mark and two
// campaigns rarely share one. Decorative: the campaign's name is always written beside it.

const SMALL_WORDS = /^(the|a|an|of|and|in|at|to|on|for)$/i;

// "The Hollow Lantern" -> "HL", "Ashford Asylum" -> "AA", "Beta" -> "B"
export function initialsOf(name) {
  const words = String(name || '').split(/[\s\-_/]+/).filter(Boolean);
  const kept = words.filter((w) => !SMALL_WORDS.test(w));
  const letters = (kept.length ? kept : words)
    .map((w) => (w.match(/[\p{L}\p{N}]/u) || [''])[0].toUpperCase())
    .filter(Boolean);
  return letters.slice(0, 2).join('') || '·';
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Frames in a 64 x 64 box: an outer line and a finer one inside it
const FRAMES = {
  roundel: (
    <>
      <circle cx="32" cy="32" r="29" strokeWidth="1.7" />
      <circle cx="32" cy="32" r="25" strokeWidth="0.8" />
    </>
  ),
  lozenge: (
    <>
      <path d="M32 2.5 61.5 32 32 61.5 2.5 32Z" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M32 8.2 55.8 32 32 55.8 8.2 32Z" strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),
  shield: (
    <>
      <path d="M9 6H55V29C55 45 45 55 32 60.5 19 55 9 45 9 29Z" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 10H51V29C51 42.5 42.5 51 32 55.8 21.5 51 13 42.5 13 29Z" strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),
  octagon: (
    <>
      <path d="M20.4 4H43.6L60 20.4V43.6L43.6 60H20.4L4 43.6V20.4Z" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M22.1 8.2H41.9L55.8 22.1V41.9L41.9 55.8H22.1L8.2 41.9V22.1Z" strokeWidth="0.8" strokeLinejoin="round" />
    </>
  ),
};

// A four-point tooling star
const star = (x, y, r) => `M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z`;

const ORNAMENTS = {
  stars: (
    <g stroke="none" fill="currentColor">
      <path d={star(32, 14.5, 3.2)} />
      <path d={star(32, 50, 3.2)} />
    </g>
  ),
  // a waxing moon over the initials, and a small star under them
  crescent: (
    <g stroke="none" fill="currentColor">
      <path d="M31.27 8.81A5 5 0 1 0 35.25 16.43A4.3 4.3 0 0 1 31.27 8.81Z" />
      <path d={star(32, 50.5, 2.6)} />
    </g>
  ),
  dots: (
    <g stroke="none" fill="currentColor">
      <circle cx="26.5" cy="15" r="1.2" /><circle cx="32" cy="13.6" r="1.4" /><circle cx="37.5" cy="15" r="1.2" />
      <circle cx="32" cy="50.4" r="1.3" />
    </g>
  ),
  rules: (
    <g strokeWidth="0.9" strokeLinecap="round">
      <path d="M24 17.5H40" /><path d="M24 47H40" />
      <circle cx="32" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="32" cy="47" r="1.1" fill="currentColor" stroke="none" />
    </g>
  ),
};

const FRAME_KEYS = Object.keys(FRAMES);
const ORNAMENT_KEYS = Object.keys(ORNAMENTS);

export const CampaignMark = ({ name, size = 56, className = '' }) => {
  const h = hash(String(name || ''));
  const frame = FRAME_KEYS[h % FRAME_KEYS.length];
  const ornament = ORNAMENT_KEYS[(h >>> 4) % ORNAMENT_KEYS.length];
  const initials = initialsOf(name);
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64" width={size} height={size}
      className={className} fill="none" stroke="currentColor" data-mark={`${frame}-${ornament}`}>
      {FRAMES[frame]}
      {ORNAMENTS[ornament]}
      <text x="32" y="33.5" textAnchor="middle" dominantBaseline="central" stroke="none" fill="currentColor"
        className="font-display" fontSize={initials.length > 1 ? 17 : 21} letterSpacing="0.5">
        {initials}
      </text>
    </svg>
  );
};
