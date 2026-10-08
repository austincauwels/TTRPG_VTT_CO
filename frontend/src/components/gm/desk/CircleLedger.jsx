import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useGameStore from '../../../store/gameStore';
import { tiltFor } from '../../shared/handPlaced';
import { FormLine, PrinterMark, SerialNo, serialFor, stampDate } from '../../shared/PrintMarks';
import { InfoTerm } from '../../shared/ActionInfo';
import { RESOURCE_HELP, refillEntry } from '../../../game/circleResources';

// The circle at a glance, on the GM's roster: an abstract of the charter on a ruled ledger
// card lying under the investigators' cards. Illumination, the stores (what is left of
// each, under its maximum, what each does behind its "i", and when they refill), whether
// spending and reports are open, the circle's abilities and whose report is in. The whole
// file is a press away (onOpen, the Circle tab). Its rows run to the foot of the desk, as
// a ledger's do, and the card grows past it when its rows need more room (OperationsPanel's
// roster grid).
const TRACK_SIZE = 12;
// The rulebook's circle abilities, as the circle page and the Circle tab print them
const CIRCLE_ABILITY_TEXT = {
  'Stamina Training':    'Your circle has three gilded dice at the beginning of every assignment that anyone may add as +1d to any roll. Once a die has been rolled, it is expended.',
  'Nobody Left Behind':  'When a member of your circle drops incapacitated, any roll to protect or extract them has +1d.',
  'In This Together':    'When you spend drive to help an ally on a roll, on a result of 3 or less, you both earn back 1 drive point of your choice.',
  'Interdisciplinary':   'Once per campaign, each character may choose an ability from a role or specialty outside their own during advancement.',
  'Resource Management': 'When your circle hits a milestone on the Illumination Track, earn back 1 Stitch, Refresh, or Train resource.',
  'One Last Run':        'The next assignment is your last. Everyone takes all four advancement options instead of two.',
};
const RESOURCES = [
  { label: 'Stitch', key: 'stitch' },
  { label: 'Refresh', key: 'refresh' },
  { label: 'Train', key: 'train' },
];

export const CircleLedger = ({ onOpen, className = '' }) => {
  const { circle, circleCreation } = useGameStore(useShallow(s => ({ circle: s.circle, circleCreation: s.circleCreation })));
  if (!circle) return null;
  const illum = circle.illumination || 0;
  const maxCap = circle.max_capacity || 1;
  const abilities = (circle.circle_ability || '').split('\n').filter(Boolean);
  const investigators = circleCreation?.activeInvestigators || [];
  const reports = circleCreation?.reports || {};

  return (
    <section
      aria-labelledby="circle-ledger-name"
      className={`circle-ledger hand-placed relative text-ink rounded-sm ${className}`}
      style={{ '--tilt': `${tiltFor(`ledger-${circle.id ?? ''}`, { min: 0.3, max: 0.8, sign: -1 })}deg` }}
    >
      {/* The red margin line of a ledger card */}
      <span aria-hidden="true" className="absolute top-0 bottom-0 left-9 w-px bg-oxblood-lit/30 pointer-events-none" />
      <div className="relative pl-12 pr-4 pt-2.5 pb-3">
        {/* The serial is struck into the right margin; on a narrow card it drops under the
            form line, and the form line wraps, rather than either running off the paper */}
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 -mr-3" aria-hidden="true">
          <span className="flex items-center gap-1.5 min-w-0">
            <PrinterMark size={12} />
            <FormLine className="!whitespace-normal">Form C.O. 3 · Circle charter, abstract</FormLine>
          </span>
          <SerialNo value={serialFor(`circle-${circle.id ?? ''}`)} className="ml-auto" />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mt-1">
          <h3 id="circle-ledger-name" className="font-serif font-black text-xl uppercase leading-tight break-words min-w-0">
            {circle.name || 'Unnamed Circle'}
          </h3>
          <button
            type="button"
            onClick={onOpen}
            className="pen-host shrink-0 min-h-[36px] px-2.5 font-sans text-xs font-black uppercase tracking-widest text-oxblood border border-oxblood/50 hover:bg-oxblood hover:text-cream rounded-sm transition-colors"
          >
            <span className="pen-underline">Open the circle file</span>
          </button>
        </div>

        <dl className="mt-1.5">
          <div className="circle-ledger-row">
            <dt>Illumination</dt>
            <dd className="flex items-center gap-[3px] flex-wrap" role="img" aria-label={`Illumination ${illum} of ${TRACK_SIZE}`}>
              {Array.from({ length: TRACK_SIZE }).map((_, i) => (
                <span key={i} aria-hidden="true"
                  className={`block w-2.5 h-2.5 rounded-full border ${i < illum ? 'bg-ink border-ink' : 'border-ink/45'} ${(i + 1) % 3 === 0 ? 'ring-1 ring-candle-gold' : ''}`} />
              ))}
              <span aria-hidden="true" className="ml-1 font-mono tabular-nums text-sm text-sepia">{Math.min(illum, TRACK_SIZE)} / {TRACK_SIZE}{illum > TRACK_SIZE ? ` +${illum - TRACK_SIZE}` : ''}</span>
            </dd>
          </div>
          {RESOURCES.map(({ label, key }) => {
            const avail = circle[key] ?? maxCap;
            return (
              <div key={key} className="circle-ledger-row">
                {/* What it does, on its "i". The slip lies over the row's pips, clear of the
                    column of names. A ruled row keeps its pitch, so on a tablet the term's
                    reach fills the row's 32px (touch-pip) rather than making it taller. */}
                <dt>
                  <InfoTerm label={label} text={RESOURCE_HELP[key]} slipClassName="left-[8.75rem] -top-1 w-[min(17rem,calc(100vw-4rem))]"
                    hitClassName="touch-pip [--hit-y:-7px] [--hit-x:-4px]" />
                </dt>
                <dd className="flex items-center gap-1" role="img" aria-label={`${label}: ${avail} available, maximum ${maxCap}`}>
                  {Array.from({ length: Math.min(9, Math.max(avail, maxCap)) }).map((_, i) => (
                    <span key={i} aria-hidden="true" className={`block w-3 h-3 rounded-sm border ${i < avail ? 'bg-oxblood border-oxblood' : 'border-ink/40'}`} />
                  ))}
                  <span aria-hidden="true" className="ml-1.5 font-mono tabular-nums text-sm text-sepia">{avail} · max {maxCap}</span>
                </dd>
              </div>
            );
          })}
          <div className="circle-ledger-row">
            <dt>Spending</dt>
            <dd className={circle.resources_editable ? 'text-seal-green font-semibold' : 'text-sepia'}>{circle.resources_editable ? 'Open' : 'Locked'}</dd>
          </div>
          <div className="circle-ledger-row !items-start py-1">
            <dt className="pt-0.5">Refills</dt>
            <dd className="text-sm leading-snug text-sepia">{refillEntry(maxCap)}</dd>
          </div>
          <div className="circle-ledger-row">
            <dt>Reports</dt>
            <dd>
              <span className={circle.reports_open ? 'text-seal-green font-semibold' : 'text-sepia'}>{circle.reports_open ? 'Open' : 'Closed'}</span>
              {investigators.length > 0 && (
                <span className="text-sepia">
                  {' · '}
                  {investigators.filter(inv => reports[inv.id] || reports[String(inv.id)]).length} of {investigators.length} filed
                </span>
              )}
            </dd>
          </div>
          {/* Whose report is in: one ruled entry per investigator, in their ink */}
          {investigators.map(inv => {
            const report = reports[inv.id] || reports[String(inv.id)];
            return (
              <div key={inv.id} className="circle-ledger-row">
                <dt className="!normal-case !tracking-normal !font-serif !text-base !font-semibold flex items-center gap-1.5 min-w-0">
                  <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: inv.ink_color || 'rgb(var(--c-sepia))' }} />
                  <span className="truncate" title={inv.name} style={{ color: inv.ink_color || undefined }}>{inv.name}</span>
                </dt>
                <dd className={report ? 'text-seal-green font-semibold' : 'text-sepia italic'}>
                  {report ? `Report filed${(report.submitted_at || report.created_at) ? `, ${stampDate(report.submitted_at || report.created_at)}` : ''}` : 'No report yet'}
                </dd>
              </div>
            );
          })}
          {abilities.map((ability, i) => (
            <div key={ability} className="circle-ledger-row !items-start py-1">
              <dt className="pt-0.5">{i === 0 ? (abilities.length > 1 ? 'Abilities' : 'Ability') : ''}</dt>
              <dd className="text-sm leading-snug">
                <span className="font-bold uppercase">{ability}: </span>
                <span className="italic">{CIRCLE_ABILITY_TEXT[ability] || ''}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
