import React from 'react';
import { SerialNo, FormLine, PrinterMark, serialFor } from '../shared/PrintMarks';

// The two railway tickets on the hub (owner's round 3 item 9): a card ticket of the
// Fairelands Railway, printed with the company band, its number, its class and its route,
// the form line in small print, and a stub below the perforation that carries the action.
// The bands keep her original pamphlet colors: sage for the player's ticket, near black for
// the Lightkeeper's. Styles: .ticket-* in DeskStyles.jsx. Everything printed is decoration
// for screen readers; the ticket itself is the labelled button.
export const TICKETS = {
  player: {
    band: '#5f7267',
    serial: serialFor('ticket:new-character'),
    cls: 'Third class',
    form: 'Form C.O. 7',
    route: (
      <>
        <span className="ticket-station font-display">Newfaire</span>
        <span className="ticket-to">to</span>
        <span className="ticket-station font-display">The Chapter House</span>
      </>
    ),
    action: 'New character',
  },
  gm: {
    band: 'rgb(var(--c-ink))',
    serial: serialFor('ticket:new-campaign'),
    cls: 'First class',
    form: 'Form C.O. 1',
    route: (
      <>
        <span className="ticket-station font-display">Lightkeeper&rsquo;s<br />Pass</span>
        <span className="ticket-to">all lines</span>
      </>
    ),
    action: 'New campaign',
  },
};

export const TicketFront = ({ kind }) => {
  const t = TICKETS[kind];
  return (
    <>
      <span className="ticket-main" aria-hidden="true">
        <span className="ticket-band font-display" style={{ '--band': t.band }}>Fairelands Railway</span>
        <span className="ticket-meta">
          <SerialNo value={t.serial} />
          <span className="print-small">{t.cls}</span>
        </span>
        <span className="ticket-route">{t.route}</span>
        <span className="ticket-fine">
          <PrinterMark size={10} />
          <FormLine>{t.form}</FormLine>
        </span>
      </span>
      <span className="ticket-perf" aria-hidden="true" />
      <span className="ticket-stub">
        <span data-glow className="ticket-action ink-glow font-display">{t.action}</span>
      </span>
    </>
  );
};
