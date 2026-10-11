import { useLayoutEffect } from 'react';

// A textarea that grows with its words. Browsers with field-sizing: content do it in CSS
// (GROW_STYLE on the field); elsewhere the height follows the content here, on each change
// of `value` (for a field that holds its own text, pass the text it last got).
const NATIVE = typeof CSS !== 'undefined' && !!CSS.supports?.('field-sizing', 'content');

export const GROW_STYLE = { fieldSizing: 'content' };

// Set a textarea's height to its content (the fallback; a no-op where CSS does it)
export const fitHeight = (el) => {
  if (!el || NATIVE) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

export const useAutoGrow = (ref, value) => {
  useLayoutEffect(() => { fitHeight(ref.current); }, [ref, value]);
};
