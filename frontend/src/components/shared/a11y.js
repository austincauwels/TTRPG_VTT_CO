// Small keyboard helpers for objects drawn as paper, leather or felt that act as controls.

// Enter and Space activate, as on a native button.
export const onActivateKey = (fn) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fn(e);
  }
};

// Props that make a drawn object (a tome, a card) behave as a button.
export const pressable = (fn, label) => ({
  role: 'button',
  tabIndex: 0,
  onClick: fn,
  onKeyDown: onActivateKey(fn),
  ...(label ? { 'aria-label': label } : {}),
});

// Arrow keys inside a role="radiogroup": move to the next or previous option and choose it.
// Options are the group's [role="radio"] elements; only the chosen one (or the first, when
// none is chosen) sits in the tab order, so Tab enters and leaves the group in one step.
export const radioArrows = (e, choose) => {
  const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
  if (!(e.key in keys)) return;
  const group = e.currentTarget.closest('[role="radiogroup"]');
  if (!group) return;
  const options = Array.from(group.querySelectorAll('[role="radio"]'));
  const at = options.indexOf(e.currentTarget);
  if (at === -1) return;
  e.preventDefault();
  const next = (at + keys[e.key] + options.length) % options.length;
  options[next].focus();
  choose(next);
};

// Page-wide keys (Escape out of the creator, the arrow keys that turn the notebook's pages)
// stand aside when the key belongs to something else: a text field or a select, a widget
// that uses the key itself (radio and tab groups, sliders, menus), or an open dialog.
const KEY_OWNING_ROLES = new Set([
  'radio', 'radiogroup', 'tab', 'tablist', 'slider', 'listbox', 'option',
  'menu', 'menuitem', 'combobox', 'spinbutton', 'textbox',
]);
export const isEditableTarget = (el) =>
  !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || ''));
export const pageKeyBlocked = (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return true;
  if (typeof document !== 'undefined' && document.querySelector('[aria-modal="true"]')) return true;
  if (isEditableTarget(e.target)) return true;
  const role = e.target?.getAttribute?.('role');
  return !!role && KEY_OWNING_ROLES.has(role);
};
