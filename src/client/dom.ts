type Child = Node | string | number | null | undefined | false | Child[];
export type Props = Record<string, any>;

/** The string to set for an attribute, or null to leave it out. ARIA state attributes keep "true"/"false"
 *  (aria-pressed="" is invalid and was announced wrongly); other booleans are presence-only. */
export function attrValue(k: string, v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (k.startsWith('aria-') && typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === false) return null;
  return v === true ? '' : String(v);
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || (v === false && !k.startsWith('aria-'))) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (k === 'checked' || k === 'value' || k === 'disabled' || k === 'multiple') (el as any)[k] = v;
    else { const a = attrValue(k, v); if (a !== null) el.setAttribute(k, a); }
  }
  add(el, children);
  return el;
}
function add(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) add(el, c);
    else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}
export function clear(el: Element) { while (el.firstChild) el.removeChild(el.firstChild); }
