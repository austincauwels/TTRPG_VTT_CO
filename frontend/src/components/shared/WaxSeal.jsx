import React from 'react';
import { GiCandleHolder } from 'react-icons/gi';

// Her original wax seal (MainDeskView.jsx in the first version of the app; owner's round 3
// item 16): a round red seal in her three reds, darkest at the lower right, with a soft
// light at its upper edge, a dashed ring pressed into it, and the candle-holder mark
// pressed into the middle in a darker red. It lies turned 12 degrees, as she placed it.
// Every measure is a share of the seal's width (container units), so it reads the same at
// 32px on a slip and at 128px on the member ID strip. The styles are .wax-seal-* in
// index.css. pressed plays the press once when the seal first appears (.seal-press; still
// under reduced motion). Decorative: the words beside it say what was sealed.
//   size   the seal's width and height in px; a width class on className (a size per
//          breakpoint) wins over it
export const WaxSeal = ({ size = 40, pressed = false, className = '', style }) => (
  <span aria-hidden="true"
    className={`wax-seal ${pressed ? 'seal-press' : ''} ${className}`}
    style={{ '--seal-size': `${size}px`, ...style }}>
    <span className="wax-seal-body">
      <span className="wax-seal-ring">
        <GiCandleHolder className="wax-seal-mark" focusable="false" />
      </span>
    </span>
  </span>
);
