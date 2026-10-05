import React from 'react';
import { pressable } from '../shared/a11y';
import { TicketFront } from './RailwayTicket';

// The player's railway ticket, Newfaire to the Chapter House: pressed, it opens the
// character creator. The card lies in .ticket-body, which wide screens draw as one layer
// over the flickering shadow, so the card's cut edges are drawn into it once.
// On the wide desk it lies 64px in from the Herald's left edge while the Herald is at least
// 672px wide (1440 and up). On a narrower Herald (550px at 1024 to 1196 wide) it moves left
// over the Herald's edge, to 12px past it, and the Lightkeeper's ticket moves right, to 64px
// in, so a gap of 36px always stays between them, the player's ticket clear of the Last
// Played tome and the Lightkeeper's on the screen (iPad pass, 2026-10-05: they overlapped by
// up to 105px). Both follow the Herald's width in step (percentages of the Herald's box).
export const NewCharacterTicket = ({ onOpen }) => (
  <div
    {...pressable(onOpen, 'New character')}
    data-hub="ticket"
    data-cast="0.35"
    className="ticket hub-ticket cursor-pointer relative lg:landscape:absolute w-full lg:landscape:w-[230px] lg:landscape:h-[330px] rotate-[-2deg] lg:landscape:rotate-[-4deg] lg:landscape:bottom-[56px] lg:landscape:left-[clamp(-12px,calc(62.295%_-_354.6px),64px)] lg:landscape:hover:-translate-y-3 lg:landscape:hover:-translate-x-1 lg:landscape:hover:rotate-[-5deg] z-30"
  >
    <span className="cast" aria-hidden="true" />
    <span className="ticket-body">
      <span className="ticket-card ticket-front">
        <TicketFront kind="player" />
      </span>
    </span>
  </div>
);
