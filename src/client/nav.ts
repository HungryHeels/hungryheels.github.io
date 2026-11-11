// Re-render plumbing shared by every view, plus focus management so keyboard and screen-reader users don't lose
// their place when the whole view is redrawn.
let renderFn: () => void = () => {};
let live: HTMLElement | null = null;
let pendingFocus: string | null = null;

export function setRender(fn: () => void, liveRegion: HTMLElement) { renderFn = fn; live = liveRegion; }
export function render() { renderFn(); }
export function announce(msg: string) { if (!live) return; live.textContent = ''; setTimeout(() => { if (live) live.textContent = msg; }, 30); }
/** Apply a state change, redraw, and optionally announce it. */
export function go(fn: () => void, msg?: string) { fn(); renderFn(); if (msg) announce(msg); }
/** After the next render, focus the element with this data-fk key (e.g. the button that opened a sheet). */
export function focusAfterRender(key: string | null) { pendingFocus = key; }
export function takePendingFocus(): string | null { const k = pendingFocus; pendingFocus = null; return k; }

/** Where the focus is, as a key that survives a re-render: an explicit data-fk, an id, or the index path from root. */
export function focusKey(root: HTMLElement): string | null {
  const a = document.activeElement as HTMLElement | null;
  if (!a || !root.contains(a) || a === root) return null;
  const fk = a.closest('[data-fk]') as HTMLElement | null;
  if (fk && fk === a) return 'fk:' + fk.dataset.fk;
  if (a.id) return 'id:' + a.id;
  const path: number[] = [];
  for (let el: Element | null = a; el && el !== root; el = el.parentElement) path.unshift([...el.parentElement!.children].indexOf(el));
  return 'path:' + a.tagName + ':' + path.join('.');
}
export function restoreFocus(root: HTMLElement, key: string | null) {
  if (!key) return;
  let el: HTMLElement | null = null;
  if (key.startsWith('fk:')) el = root.querySelector(`[data-fk="${CSS.escape(key.slice(3))}"]`);
  else if (key.startsWith('id:')) el = document.getElementById(key.slice(3));
  else {
    const [, tag, p] = key.split(':');
    let cur: Element | null = root;
    for (const i of p.split('.').map(Number)) { cur = cur?.children[i] ?? null; if (!cur) break; }
    if (cur && cur.tagName === tag) el = cur as HTMLElement;
  }
  el?.focus({ preventScroll: true });
}
