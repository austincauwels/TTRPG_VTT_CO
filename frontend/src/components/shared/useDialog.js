import { useEffect, useRef } from 'react';

// Keyboard behavior shared by every dialog and the roster book:
// - focus moves into the dialog when it opens (unless a field inside already took it),
// - Tab and Shift+Tab stay inside it,
// - Escape calls onClose (pass no onClose for a dialog that must be answered),
// - focus goes back to whatever opened it when it closes.
// Only the top dialog reacts when two are open. Attach the returned ref to the dialog box;
// pass a new `view` when the same dialog swaps its box for another (a form, then a receipt).

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

const stack = [];

const focusables = (node) => Array.from(node.querySelectorAll(FOCUSABLE))
  .filter(el => el.offsetParent !== null || el === document.activeElement);

export const useDialog = ({ open = true, onClose, view } = {}) => {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Read the opener while rendering, before an autoFocus field inside moves focus.
  const openerRef = useRef(null);
  if (!open) openerRef.current = null;
  else if (openerRef.current === null && typeof document !== 'undefined') {
    openerRef.current = document.activeElement || document.body;
  }

  useEffect(() => {
    if (!open) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const opener = openerRef.current;
    const entry = {};
    stack.push(entry);

    if (!node.contains(document.activeElement)) {
      const first = focusables(node)[0];
      if (first) first.focus({ preventScroll: true });
      else {
        if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '-1');
        node.focus({ preventScroll: true });
      }
    }

    const onKeyDown = (e) => {
      if (stack[stack.length - 1] !== entry || e.defaultPrevented) return;
      if (e.key === 'Escape' && closeRef.current) {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const box = ref.current || node;
      const items = focusables(box);
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!box.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (active === first || active === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const at = stack.indexOf(entry);
      if (at !== -1) stack.splice(at, 1);
      if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, view]);

  return ref;
};
