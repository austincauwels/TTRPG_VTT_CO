import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialog } from '../shared/useDialog';
import { ACTION_LABEL, SCAR_TEXT_MAX, scarDisplayText } from '../../game/actions';

// The player's edit of their own sheet (issue #64, decision 1 of fix round 5): detection,
// not prevention. Everything on the sheet can be changed here at any time; the rules guide
// (each box shows its maximum, a soft warning names what the book would not do) and never
// stop a save. The server logs every change for the Lightkeeper (backend vtt/sheet_edits.py),
// which keeps the same limits: the boxes the sheet prints, and three scars, as the fourth
// is taken through the scar form.

const ROLE_SPECIALTIES = {
  Face: ['Journalist', 'Magician'],
  Muscle: ['Explorer', 'Soldier'],
  Scholar: ['Doctor', 'Professor'],
  Slink: ['Criminal', 'Detective'],
  Weird: ['Medium', 'Occultist'],
};
const DRIVES = ['nerve', 'cunning', 'intuition'];
const DRIVE_ACTIONS = {
  nerve: ['move', 'strike', 'control'],
  cunning: ['sway', 'sneak', 'hide'],
  intuition: ['survey', 'read', 'sense'],
};
const MARKS = ['body', 'brain', 'bleed'];
const DRIVE_MAX = 9;
const ACTION_MAX = 3;
const MARK_MAX = 3;
const EDIT_SCARS_MAX = 3;
const TEXT_MAX = { name: 80, pronouns: 60, style: 2000, catalyst: 2000, question: 2000 };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const splitAbilities = (field) => String(field || '').split(';').map(s => s.trim()).filter(s => s && s !== 'None');

// The sheet as the form edits it
const draftOf = (c) => ({
  name: c.name || '',
  pronouns: c.pronouns && c.pronouns !== 'Unlisted' ? c.pronouns : '',
  style: c.style || '', catalyst: c.catalyst || '', question: c.question || '',
  role: c.role || '', specialty: c.specialty || '',
  role_ability: c.role_ability && c.role_ability !== 'None' ? c.role_ability : '',
  specialty_ability: splitAbilities(c.specialty_ability),
  ...Object.fromEntries(Object.values(DRIVE_ACTIONS).flat().flatMap(a => [[a, c[a] || 0], [`gilded_${a}`, !!c[`gilded_${a}`]]])),
  ...Object.fromEntries(DRIVES.flatMap(d => [[`${d}_max`, c[`${d}_max`] || 0], [`${d}_current`, c[`${d}_current`] || 0],
    [`${d}_resistance_spent`, c[`${d}_resistance_spent`] || 0]])),
  ...Object.fromEntries(MARKS.map(t => [`${t}_marks`, c[`${t}_marks`] || 0])),
  // each scar's stored words, and the words shown (a scar left as it was keeps its stored words)
  scars: (Array.isArray(c.scars_list) ? c.scars_list : []).map(raw => ({ raw, text: String(scarDisplayText(raw) ?? '') })),
});

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The fields the edit changes from the sheet o (a draft), in the server's terms
const changesOf = (o, d) => {
  const out = {};
  for (const key of ['name', 'style', 'catalyst', 'question']) if (d[key].trim() !== o[key].trim()) out[key] = d[key].trim();
  if (d.pronouns.trim() !== o.pronouns.trim()) out.pronouns = d.pronouns.trim() || 'Unlisted';
  if (d.role !== o.role) out.role = d.role;
  // a new role is checked with the specialty it goes with
  if (d.specialty !== o.specialty || out.role) out.specialty = d.specialty;
  if (d.role_ability !== o.role_ability && d.role_ability) out.role_ability = d.role_ability;
  if (d.specialty_ability.join('; ') !== o.specialty_ability.join('; ')) out.specialty_ability = d.specialty_ability;
  for (const a of Object.values(DRIVE_ACTIONS).flat()) {
    if (d[a] !== o[a]) out[a] = d[a];
    if (d[`gilded_${a}`] !== o[`gilded_${a}`]) out[`gilded_${a}`] = d[`gilded_${a}`];
  }
  for (const k of DRIVES.flatMap(x => [`${x}_max`, `${x}_current`, `${x}_resistance_spent`]).concat(MARKS.map(t => `${t}_marks`))) {
    if (d[k] !== o[k]) out[k] = d[k];
  }
  const scars = d.scars.map(s => (s.raw != null && s.text.trim() === String(scarDisplayText(s.raw) ?? '').trim() ? s.raw : s.text.trim()));
  if (JSON.stringify(scars) !== JSON.stringify(o.scars.map(s => s.raw))) out.scars_list = scars;
  return out;
};

const small = 'min-h-[36px] [@media(pointer:coarse)]:min-h-[44px] px-3 font-sans text-xs font-black uppercase tracking-widest rounded-sm transition-colors';
const field = 'w-full bg-cream border border-sepia/40 rounded-sm px-2 py-1.5 font-serif text-base text-ink focus:border-oxblood focus:outline-none';
const Heading = ({ children }) => (
  <h3 className="font-sans text-xs font-black uppercase tracking-widest text-oxblood mb-2">{children}</h3>
);
// A soft warning: the rules' view, never a stop
const Warn = ({ children }) => (children ? <p className="font-serif text-sm italic text-oxblood/90 leading-snug mt-1">{children}</p> : null);

// A number on the sheet from min to max, with − and +: beside its name on a phone, under it
// in the columns of a wider dialog. extra goes after the name (an action's gild).
const Stepper = ({ label, value, min = 0, max, onChange, shown, extra = null }) => (
  <div className="flex items-center justify-between gap-2 min-w-0 sm:flex-col sm:items-start sm:gap-1" role="group" aria-label={label}>
    <span className="flex items-center gap-3 min-w-0">
      <span className="font-sans text-sm font-bold uppercase tracking-tight text-ink">{label}</span>
      {extra}
    </span>
    <span className="flex items-center gap-1 shrink-0">
      <button type="button" aria-label={`${label}: one less`} aria-disabled={value <= min}
        onClick={() => value > min && onChange(value - 1)}
        className="w-9 h-9 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 border border-ink/30 bg-black/5 rounded-sm font-black text-ink hover:bg-black/10 aria-disabled:opacity-30">−</button>
      <span className="font-mono tabular-nums text-sm font-black text-ink w-14 text-center" aria-live="polite">
        {shown ?? value} <span className="text-sepia font-bold">of {max}</span>
      </span>
      <button type="button" aria-label={`${label}: one more`} aria-disabled={value >= max}
        onClick={() => value < max && onChange(value + 1)}
        className="w-9 h-9 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 border border-ink/30 bg-black/5 rounded-sm font-black text-ink hover:bg-black/10 aria-disabled:opacity-30">+</button>
    </span>
  </div>
);

// roleOf and specialtyOf: each ability's role or specialty (InvestigatorDossier's tables)
export const SheetEditor = ({ character, roleOf, specialtyOf, abilityTexts = {}, onSave, onClose }) => {
  // base is the sheet the draft was last brought up to: only what the player changed from
  // it is sent, so a pip, a mark or a spend that lands while the dialog is open is not
  // written back over, nor logged as the player's
  const [base, setBase] = useState(() => draftOf(character));
  const [d, setD] = useState(base);
  const [clash, setClash] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialog({ open: true, onClose });
  // First focus on the dialog itself, not the Name field, so a phone's keyboard stays shut
  useLayoutEffect(() => { dialogRef.current?.focus({ preventScroll: true }); }, [dialogRef]);
  const id = useId();
  const set = (patch) => setD(x => ({ ...x, ...patch }));

  // The live sheet moved: what the player has not touched follows it, what they have
  // touched stays theirs (with a soft notice when the table changed it too)
  const baseRef = useRef(base);
  useEffect(() => {
    const live = draftOf(character);
    const was = baseRef.current;
    if (same(live, was)) return;
    baseRef.current = live;
    setBase(live);
    // d is this render's draft: the effect runs again only when the sheet does
    const next = {};
    let both = false;
    for (const k of Object.keys(d)) {
      const mine = !same(d[k], was[k]);
      next[k] = mine ? d[k] : live[k];
      if (mine && !same(live[k], was[k]) && !same(live[k], d[k])) both = true;
    }
    for (const drive of DRIVES) {
      next[`${drive}_current`] = Math.min(next[`${drive}_current`], next[`${drive}_max`]);
      next[`${drive}_resistance_spent`] = Math.min(next[`${drive}_resistance_spent`], Math.floor(next[`${drive}_max`] / 3));
    }
    setD(next);
    if (both) setClash(true);
  }, [character]); // eslint-disable-line react-hooks/exhaustive-deps
  const changes = useMemo(() => changesOf(base, d), [base, d]);
  const changed = Object.keys(changes).length > 0;
  const nameBlank = !d.name.trim();

  // Every ability, grouped under its role and its specialties, for the pickers
  const groups = useMemo(() => Object.entries(ROLE_SPECIALTIES).flatMap(([role, specs]) => [
    { label: `${role} (role)`, names: Object.keys(roleOf).filter(n => roleOf[n] === role) },
    ...specs.map(s => ({ label: s, names: Object.keys(specialtyOf).filter(n => specialtyOf[n] === s) })),
  ]), [roleOf, specialtyOf]);
  const offBook = (name) => name && roleOf[name] !== d.role && specialtyOf[name] !== d.specialty
    ? `Not a ${d.role || 'role'} or ${d.specialty || 'specialty'} ability.` : '';
  const taken = new Set([d.role_ability, ...d.specialty_ability].filter(Boolean));

  const setRole = (role) => {
    const specs = ROLE_SPECIALTIES[role] || [];
    set({ role, specialty: specs.includes(d.specialty) ? d.specialty : specs[0] || '' });
  };
  const setDriveMax = (drive, top) => set({
    [`${drive}_max`]: top,
    [`${drive}_current`]: Math.min(d[`${drive}_current`], top),
    [`${drive}_resistance_spent`]: Math.min(d[`${drive}_resistance_spent`], Math.floor(top / 3)),
  });

  const save = () => {
    if (!changed || nameBlank) return;
    if (onSave(changes)) onClose();
    else setError('Not connected to the table. Try again in a moment.');
  };

  const abilityOptions = (keep) => groups.map(g => (
    <optgroup key={g.label} label={g.label}>
      {g.names.filter(n => n === keep || !taken.has(n)).map(n => <option key={n} value={n}>{n}</option>)}
    </optgroup>
  ));

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-4" style={{ background: 'rgb(var(--c-night) / 0.85)' }}
      onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}
        className="relative rounded-sm w-full max-w-[640px] max-h-[90dvh] flex flex-col outline-none" onClick={e => e.stopPropagation()}
        style={{ background: 'rgb(var(--c-parchment))', border: '3px double rgb(var(--c-sepia)/0.7)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}>
        <div className="px-4 pt-5 pb-3 sm:px-8 sm:pt-7 border-b border-sepia/20">
          <h2 id={`${id}-title`} className="text-2xl font-serif font-black text-ink">Edit sheet</h2>
          <p className="text-sm font-serif italic text-sepia mt-1">Each change you save goes in the table's log.</p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-8 space-y-6">
          <section>
            <Heading>Investigator</Heading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-sepia">Name</span>
                <input type="text" value={d.name} maxLength={TEXT_MAX.name} onChange={e => set({ name: e.target.value })} className={field} />
                {nameBlank && <Warn>An investigator needs a name.</Warn>}
              </label>
              <label className="block">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-sepia">Pronouns</span>
                <input type="text" value={d.pronouns} maxLength={TEXT_MAX.pronouns} onChange={e => set({ pronouns: e.target.value })} className={field} />
              </label>
              <label className="block">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-sepia">Role</span>
                <select value={d.role} onChange={e => setRole(e.target.value)} className={field}>
                  {!ROLE_SPECIALTIES[d.role] && <option value="">Choose a role</option>}
                  {Object.keys(ROLE_SPECIALTIES).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-sepia">Specialty</span>
                <select value={d.specialty} onChange={e => set({ specialty: e.target.value })} className={field} disabled={!ROLE_SPECIALTIES[d.role]}>
                  {!(ROLE_SPECIALTIES[d.role] || []).includes(d.specialty) && <option value={d.specialty}>{d.specialty || 'Choose a specialty'}</option>}
                  {(ROLE_SPECIALTIES[d.role] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section>
            <Heading>Abilities</Heading>
            <label className="block">
              <span className="font-sans text-xs font-bold uppercase tracking-wider text-sepia">Role ability</span>
              <select value={d.role_ability} onChange={e => set({ role_ability: e.target.value })} className={field} title={abilityTexts[d.role_ability]}>
                {!d.role_ability && <option value="">Choose an ability</option>}
                {abilityOptions(d.role_ability)}
              </select>
              <Warn>{d.role_ability && roleOf[d.role_ability] !== d.role ? `Not a ${d.role || 'role'} ability.` : ''}</Warn>
            </label>
            <p className="font-sans text-xs font-bold uppercase tracking-wider text-sepia mt-3">Specialty and advancement</p>
            <ul className="mt-1 space-y-1.5">
              {d.specialty_ability.map(name => (
                <li key={name} className="border-b border-dotted border-ink/20 pb-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif font-bold text-ink min-w-0 break-words" title={abilityTexts[name]}>{name}</span>
                    <button type="button" aria-label={`Remove ${name}`}
                      onClick={() => set({ specialty_ability: d.specialty_ability.filter(n => n !== name) })}
                      className={`${small} shrink-0 border border-oxblood/50 text-oxblood hover:bg-oxblood/10`}>Remove</button>
                  </div>
                  <Warn>{offBook(name)}</Warn>
                </li>
              ))}
            </ul>
            <label className="block mt-2">
              <span className="sr-only">Add an ability</span>
              <select value="" onChange={e => e.target.value && set({ specialty_ability: [...d.specialty_ability, e.target.value] })} className={field}>
                <option value="">Add an ability</option>
                {abilityOptions(null)}
              </select>
            </label>
          </section>

          <section>
            <Heading>Actions</Heading>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3">
              {DRIVES.map(drive => (
                <div key={drive} className="space-y-2">
                  <p className="font-serif font-bold uppercase tracking-wide" style={{ color: `rgb(var(--c-drive-${drive}))` }}>{cap(drive)}</p>
                  {DRIVE_ACTIONS[drive].map(a => (
                    <Stepper key={a} label={ACTION_LABEL[a]} value={d[a]} max={ACTION_MAX} onChange={v => set({ [a]: v })}
                      extra={(
                        <label className="flex items-center gap-1.5 font-serif text-sm text-ink/80 cursor-pointer min-h-[36px] [@media(pointer:coarse)]:min-h-[44px]">
                          <input type="checkbox" checked={d[`gilded_${a}`]} onChange={e => set({ [`gilded_${a}`]: e.target.checked })}
                            aria-label={`${ACTION_LABEL[a]} gilded`} className="accent-oxblood w-4 h-4" />
                          Gilded
                        </label>
                      )} />
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section>
            <Heading>Drives</Heading>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
              {DRIVES.map(drive => {
                const top = d[`${drive}_max`];
                const resistMax = Math.floor(top / 3);
                const left = resistMax - d[`${drive}_resistance_spent`];
                return (
                  <div key={drive} className="space-y-1.5">
                    <p className="font-serif font-bold uppercase tracking-wide" style={{ color: `rgb(var(--c-drive-${drive}))` }}>{cap(drive)}</p>
                    <Stepper label="Maximum" value={top} max={DRIVE_MAX} onChange={v => setDriveMax(drive, v)} />
                    <Stepper label="Available" value={d[`${drive}_current`]} max={top} onChange={v => set({ [`${drive}_current`]: v })} />
                    {resistMax > 0
                      ? <Stepper label="Resistance" value={left} max={resistMax} onChange={v => set({ [`${drive}_resistance_spent`]: resistMax - v })} />
                      : <p className="font-sans text-sm font-bold uppercase tracking-tight text-ink flex justify-between">Resistance <span className="font-mono text-xs text-sepia italic normal-case">none</span></p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <Heading>Marks</Heading>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-1.5">
              {MARKS.map(t => (
                <Stepper key={t} label={cap(t)} value={d[`${t}_marks`]} max={MARK_MAX} onChange={v => set({ [`${t}_marks`]: v })} />
              ))}
            </div>
          </section>

          <section>
            <Heading>Scars</Heading>
            {d.scars.length === 0 && <p className="font-serif italic text-sepia">No scars.</p>}
            <div className="space-y-2">
              {d.scars.map((s, i) => (
                <div key={i}>
                  <label htmlFor={`${id}-scar-${i}`} className="sr-only">Scar {i + 1}</label>
                  <textarea id={`${id}-scar-${i}`} rows={2} maxLength={SCAR_TEXT_MAX} value={s.text}
                    onChange={e => set({ scars: d.scars.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                    className={`${field} italic resize-y`} />
                  <div className="flex items-center justify-between gap-2 mt-1">
                    {!s.text.trim() ? <Warn>A scar needs words. Remove it instead.</Warn> : <span />}
                    <button type="button" aria-label={`Remove scar ${i + 1}`}
                      onClick={() => set({ scars: d.scars.filter((_, j) => j !== i) })}
                      className={`${small} shrink-0 border border-oxblood/50 text-oxblood hover:bg-oxblood/10`}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            {d.scars.length < EDIT_SCARS_MAX && (
              <button type="button" onClick={() => set({ scars: [...d.scars, { raw: null, text: '' }] })}
                className={`${small} mt-2 border border-ink/50 text-ink hover:bg-ink hover:text-cream`}>Add a scar</button>
            )}
          </section>

          <section className="space-y-3">
            <Heading>Profile</Heading>
            {['style', 'catalyst', 'question'].map(key => (
              <label key={key} className="block">
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-sepia">{cap(key)}</span>
                <textarea rows={3} maxLength={TEXT_MAX[key]} value={d[key]} onChange={e => set({ [key]: e.target.value })} className={`${field} resize-y`} />
              </label>
            ))}
          </section>
        </div>

        <div className="px-4 py-3 sm:px-8 border-t border-sepia/20 flex flex-wrap items-center justify-end gap-3">
          {clash && <p role="status" className="basis-full font-serif text-sm italic text-oxblood/90 leading-snug">The sheet changed at the table while you edited it. Save keeps your changes.</p>}
          {error && <p role="alert" className="basis-full font-serif text-base text-oxblood leading-snug">{error}</p>}
          <button type="button" onClick={onClose}
            className="px-4 py-2 min-h-[44px] whitespace-nowrap text-xs font-sans font-black uppercase tracking-widest border border-sepia/25 hover:border-sepia/50 text-sepia transition-colors rounded-sm">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!changed || nameBlank || d.scars.some(s => !s.text.trim())}
            className="px-6 py-2 min-h-[44px] whitespace-nowrap text-xs font-sans font-black uppercase tracking-widest rounded-sm shadow transition-all disabled:opacity-40"
            style={{ background: 'rgb(var(--c-oxblood))', color: 'rgb(var(--c-cream))' }}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
