// Shared widgets. Meaning is always carried by text (and a symbol), never by color alone.
import { h } from './dom.ts';
import type { MenuDay, MenuItem } from '../core/types.ts';
import { formatSaved } from '../core/schedule.ts';
import { nutritionBadge } from '../sources/nutrition-import.ts';
import { S } from './state.ts';
import { effective, type MacroKey } from '../core/estimate.ts';
import { totalText, isEstimated } from '../core/plan.ts';
import type { MacroTotal } from '../core/meals.ts';

export const DISCLAIMER = 'Menus can change and data may be incomplete. If you have an allergy, confirm with dining staff. Not medical advice.';
export const UNOFFICIAL = 'Hungry Heels is an independent, unofficial project for personal use. It is not affiliated with or endorsed by UNC-Chapel Hill or Carolina Dining Services.';

export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? 'unknown' : String(Math.round(n * 10) / 10));
export const unit = (m: string) => (m === 'calories' ? '' : m === 'sodium' ? ' mg' : ' g');

export type ChipKind = 'ok' | 'warn' | 'bad' | 'info';
export function chip(text: string, kind: ChipKind): HTMLElement {
  const sym = { ok: '✓ ', warn: '△ ', bad: '✕ ', info: '' }[kind];
  return h('span', { class: 'chip chip-' + kind }, sym + text);
}
export function disclaimerBlock(): HTMLElement {
  return h('footer', { class: 'legal' }, h('p', null, DISCLAIMER), h('p', null, UNOFFICIAL));
}
export function sw(label: string, checked: boolean, onChange: (v: boolean) => void, hint?: string, fk?: string): HTMLElement {
  const input = h('input', { type: 'checkbox', role: 'switch', checked, 'data-fk': fk, onChange: (e: Event) => onChange((e.target as HTMLInputElement).checked) });
  return h('label', { class: 'row switch' }, h('span', { class: 'row-text' }, h('span', null, label), hint ? h('small', null, hint) : null), input);
}
/** Whether the student wants unknown macros filled with labeled estimates (default yes). */
export const useEst = () => S.profile.useEstimates !== false;
/** A total as text, with "~" when it includes estimates. */
export const tt = (t: MacroTotal, k: MacroKey) => totalText(t, k, useEst());
export const ttEst = (t: MacroTotal) => isEstimated(t, useEst());
/** "220 kcal · 8 g protein", with "~" on estimated numbers (scaled by portions). */
export function kcalLine(it: MenuItem, k: number): string {
  const c = effective(it, 'calories', useEst()), p = effective(it, 'protein', useEst());
  if (c.value === null && p.value === null) return 'nutrition unknown';
  const f = (v: { value: number | null; estimated: boolean }, u: string, w: string) => (v.value === null ? `${w} unknown` : `${v.estimated ? '~' : ''}${Math.round(v.value * k)}${u}`);
  return `${f(c, ' kcal', 'kcal')} · ${f(p, ' g protein', 'protein')}${c.estimated || p.estimated ? ' (estimate)' : ''}`;
}
export function sourceBadge(it: MenuItem): HTMLElement {
  const b = nutritionBadge(it.nutrition, useEst());
  return h('span', { class: 'src src-' + b.kind, title: it.nutrition.sourceLabel ?? 'No nutrition source' }, 'Nutrition: ' + b.text);
}
export function nutritionGrid(item: MenuItem): HTMLElement {
  const keys: Array<[string, MacroKey]> = [['Calories', 'calories'], ['Protein', 'protein'], ['Fat', 'fat'], ['Carbs', 'carbs']];
  return h('dl', { class: 'nutri' }, keys.map(([lab, key]) => {
    const e = effective(item, key, useEst());
    return h('div', { class: e.estimated ? 'est' : '' }, h('dt', null, lab, e.estimated ? h('small', null, ' estimate') : null),
      h('dd', { class: e.value === null ? 'unk' : '' }, e.value === null ? 'unknown' : (e.estimated ? '~' : '') + fmt(e.value) + unit(key)));
  }));
}
export function provenanceLine(day: MenuDay): HTMLElement {
  const p = day.provenance;
  const kind = p.kind === 'official' ? 'official UNC page' : p.kind === 'third_party' ? 'third-party copy' : 'demo data';
  const ver = p.verification === 'user_saved_page' ? 'saved by hand, not verified by UNC' : p.verification === 'official_export' ? 'official export' : 'unverified';
  return h('p', { class: 'prov' }, `Source: ${p.source} (${kind}; ${ver}). Saved ${formatSaved(p.retrievedAt)}.`);
}
export function numField(label: string, val: number | undefined | null, onSet: (n: number | undefined) => void, ph: string, fk: string): HTMLElement {
  return h('label', { class: 'field' }, label, h('input', { type: 'number', inputmode: 'decimal', min: 0, value: val ?? '', placeholder: ph, 'data-fk': fk,
    onChange: (e: Event) => { const v = (e.target as HTMLInputElement).value; onSet(v === '' ? undefined : Math.max(0, Number(v))); } }));
}
/** Copy text with the Clipboard API (no network). Returns false when the browser refuses. */
export async function copyText(t: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}
/** Save a text file locally through a Blob URL (no network). */
export function downloadText(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
