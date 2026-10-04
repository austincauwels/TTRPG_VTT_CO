import React from 'react';
import { pressable } from '../shared/a11y';
import { TicketFront } from './RailwayTicket';

// The player's railway ticket, Newfaire to the Chapter House: pressed, it opens the
// character creator.
export const NewCharacterTicket = ({ onOpen }) => (
  <div
    {...pressable(onOpen, 'New character')}
    data-hub="ticket"
    data-cast="0.35"
    className="ticket cursor-pointer relative lg:absolute w-full h-[250px] sm:h-[310px] lg:w-[230px] lg:h-[330px] rotate-[-2deg] lg:rotate-[-4deg] lg:bottom-[56px] lg:left-[64px] lg:hover:-translate-y-3 lg:hover:-translate-x-1 lg:hover:rotate-[-5deg] z-30"
  >
    <span className="cast" aria-hidden="true" />
    <span className="ticket-card ticket-front">
      <TicketFront kind="player" />
    </span>
  </div>
);
