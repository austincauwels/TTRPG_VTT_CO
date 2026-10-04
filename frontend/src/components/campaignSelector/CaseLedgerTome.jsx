import React from 'react';
import { pressable } from '../shared/a11y';
import { Tome } from './Tome';

// Tally marks in ink, as a clerk keeps a count: four strokes and a fifth across them. A
// count waiting for approval is pencilled in. Past twenty the clerk writes the figure.
const Tally = ({ n, pencil = false }) => {
  if (n > 20) return <span className="font-mono tabular-nums not-italic text-[0.9em]">{n}</span>;
  const strokes = [];
  let x = 1.5;
  for (let i = 0; i < n; i++) {
    const jitter = (((i * 37) % 7) - 3) * 0.12;
    if (i % 5 === 4) {
      // the fifth crosses the four before it
      strokes.push(<path key={i} d={`M${x - 13.4} ${11.2 + jitter}L${x + 0.6} ${3 - jitter}`} />);
      x += 5;
    } else {
      strokes.push(<path key={i} d={`M${x + jitter} 2.2L${x - jitter * 0.6} 12.4`} />);
      x += 3.4;
    }
  }
  const width = Math.max(4, x);
  return (
    <svg aria-hidden="true" focusable="false" viewBox={`0 0 ${width.toFixed(1)} 14`} className="ledger-tally"
      style={{ width: `${(width / 14).toFixed(2)}em` }}
      fill="none" stroke="currentColor" strokeWidth={pencil ? 1.05 : 1.35} strokeLinecap="round"
      opacity={pencil ? 0.72 : 1}>
      {strokes}
    </svg>
  );
};

// The ledger's label, pasted on the cover a little crooked: one ruled entry per kind of
// record, with its tally. An empty ledger shows its blank ruled lines.
const LedgerLabel = ({ rows }) => (
  <span className="ledger-label" aria-hidden="true">
    {rows.length > 0 ? rows.map(row => (
      <span key={row.label} className={`ledger-row${row.pencil ? ' is-pencil' : ''}`}>
        <span className="ledger-entry">{row.label}</span>
        <span className="ledger-leader" />
        <Tally n={row.n} pencil={row.pencil} />
      </span>
    )) : (
      <>
        <span className="ledger-row"><span className="ledger-leader is-blank" /></span>
        <span className="ledger-row"><span className="ledger-leader is-blank" /></span>
      </>
    )}
  </span>
);

// The green tome, the Case Ledger: it opens into the roster book. Its title, and the counts
// as ledger entries on a pasted label (owner's round 3 items 6 and 8).
export const CaseLedgerTome = ({ characters, gmCampaigns, onOpen }) => {
  const inPlay = characters.filter(c => c.status === 'active').length;
  const waiting = characters.filter(c => c.status === 'pending').length;
  const running = gmCampaigns.length;
  const rows = [
    inPlay > 0 && { label: 'In play', n: inPlay },
    waiting > 0 && { label: 'Awaiting approval', n: waiting, pencil: true },
    running > 0 && { label: 'Campaigns you run', n: running },
  ].filter(Boolean);
  const spoken = [
    inPlay > 0 && `${inPlay} in play`,
    waiting > 0 && `${waiting} waiting for approval`,
    running > 0 && `${running} campaign${running !== 1 ? 's' : ''} you run`,
  ].filter(Boolean).join(', ') || 'nothing in it yet';

  return (
    <Tome
      {...pressable(onOpen, `Case Ledger: ${spoken}`)}
      leather="rgb(var(--c-register-green))"
      sprinkled
      className="cursor-pointer w-full lg:w-[clamp(250px,20.5vw,380px)] max-w-[400px] rotate-[-2deg] lg:rotate-[-3deg] lg:-translate-y-2 lg:hover:-translate-y-4"
      frames={
        <>
          <span className="tome-frame tome-frame-blind" data-part="frame" style={{ '--fi': '5.5%' }} />
          <span className="tome-frame tome-frame-blind is-fine" data-part="frame" style={{ '--fi': '7.6%' }} />
        </>
      }
    >
      <h2 data-glow className="gilt-glow embossed-gold font-display leading-[1.02] tracking-[0.02em] text-[clamp(22px,15cqw,58px)]">
        Case<br />Ledger
      </h2>
      <span aria-hidden="true" className="block w-[22%] h-px bg-gold-leaf/35 my-[6%] shadow-[0_1px_0_rgba(255,255,255,0.08)]" />
      <LedgerLabel rows={rows} />
    </Tome>
  );
};
