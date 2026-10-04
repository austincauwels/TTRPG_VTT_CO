import React from 'react';

// A leather-bound tome lying on the hub's desk, seen from above (styles in DeskStyles.jsx):
// its cast shadow, the back board, the text block's fore edge and tail showing under the
// front board, the spine's foot where the leather turns round the tail of the book (one
// piece with the cover, owner's round 4 item 7), and the front board itself with the
// spine's round, the hinge groove and the cover's frames, which start clear of the hinge. `frames` are the cover's tooled frames
// (.tome-frame elements); `children` is what is lettered on the cover, and `overlay` lies
// across the whole cover (a strap). Any other props (role, tabIndex, handlers, aria-*) go
// on the tome itself. Everything but the shadow lies in .tome-body, which wide screens
// draw as one layer over the flickering shadow (DeskStyles).
export const Tome = ({ leather, frames, overlay, sprinkled = false, className = '', style, children, ...rest }) => (
  <div
    {...rest}
    data-hub="tome"
    data-cast="1"
    className={`tome group ${sprinkled ? 'tome-sprinkled ' : ''}${className}`}
    style={{ '--leather': leather, ...style }}
  >
    <span className="cast" aria-hidden="true" />
    <div className="tome-body">
      <span className="tome-board" aria-hidden="true" />
      <span className="tome-fore" data-part="pages" aria-hidden="true" />
      <span className="tome-tail" aria-hidden="true" />
      <span className="tome-foot" aria-hidden="true" />
      <div className="tome-cover" data-part="cover">
        <span className="leather-texture" aria-hidden="true" />
        <span className="tome-hinge" data-part="hinge" aria-hidden="true" />
        {frames}
        <div className="tome-content">{children}</div>
        {overlay}
      </div>
    </div>
  </div>
);
