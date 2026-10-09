import React from 'react';

// The circle's file, as separate papers (owner's round 3 item 24): the charter, the
// assignment report, the resources ledger, the history and the relationships each lie on
// the desk as their own paper, a little crooked, side by side. CirclePapers lays them out by
// its own width (.circle-papers in index.css): one under the other on a phone, two columns
// from 40rem, three from 62rem; the browser balances the columns and a paper never breaks
// across two.
//
// kind picks the paper: 'charter' (a certificate with a printed double frame), 'ruled'
// (a ruled form), 'manila' (the stores' ledger card), 'laid' (older laid paper) and
// 'plain'. tape lays a strip of tape over its top edge. The strip is lifted by a transform,
// not a negative top: in the columns the part above the paper's top was laid in the column
// before, so a paper at the head of a column left a strip of tape on the bare desk at the
// foot of the one before it.
const PAPER = {
  charter: 'bg-cream circle-paper-charter',
  ruled: 'bg-cream paper-ruled',
  manila: 'bg-parchment-deep circle-paper-manila',
  laid: 'bg-parchment circle-paper-laid',
  plain: 'bg-cream',
};

export const CirclePaper = ({ kind = 'plain', tilt = 0, tape = false, className = '', style, children, ...rest }) => (
  <section
    className={`circle-paper hand-placed relative text-ink border border-sepia/25 rounded-sm px-4 pt-4 pb-4 sm:px-5 ${PAPER[kind] || PAPER.plain} ${className}`}
    style={{ '--tilt': `${tilt}deg`, ...style }}
    {...rest}
  >
    {tape && (
      <span aria-hidden="true" className="absolute z-10 top-0 left-1/2 -translate-x-1/2 -translate-y-2.5 w-16 h-4 bg-parchment-deep/80 -rotate-2 border border-ink/5 mix-blend-multiply shadow-sm pointer-events-none" />
    )}
    {children}
  </section>
);

export const CirclePapers = ({ className = '', children }) => (
  <div className={`circle-papers ${className}`}>
    <div className="circle-papers-flow">{children}</div>
  </div>
);
