import { h } from './dom.ts';
import { S, allDays } from './state.ts';
import { closeSheet, render, announce } from './nav.ts';
import { chip, DISCLAIMER, nutritionGrid, provenanceLine, sourceBadge } from './ui.ts';
import { checkList, profileSummary } from './views.ts';
import { saveManual } from './imports.ts';
import { evaluateItem, explainChecks } from '../core/engine.ts';
import { labelConflict, reportIssueUrl } from '../core/trust.ts';
import { checkManual, type ManualEntry } from '../sources/nutrition-import.ts';
import type { MenuDay, MenuItem } from '../core/types.ts';

function manualForm(day: MenuDay, it: MenuItem): HTMLElement {
  const cur = S.manual.find(m => m.hall === day.hall && m.recipeId === it.id);
  const field = (label: string, key: 'calories' | 'protein' | 'fat' | 'carbs', unitTxt: string) =>
    h('label', { class: 'field' }, `${label}${unitTxt}`, h('input', { type: 'number', inputmode: 'decimal', min: 0, step: 'any', name: key, value: cur?.[key] ?? '', placeholder: 'unknown' }));
  const msg = h('p', { class: 'muted', role: 'status' });
  const form = h('form', { class: 'manual', onSubmit: async (e: Event) => {
    e.preventDefault();
    const fd = new FormData(form);
    const val = (k: string) => { const v = String(fd.get(k) ?? '').trim(); return v === '' ? null : Number(v); };
    const entry: ManualEntry = { hall: day.hall, recipeId: it.id, name: it.name, calories: val('calories'), protein: val('protein'), fat: val('fat'), carbs: val('carbs'), enteredAt: new Date().toISOString() };
    const err = checkManual(entry);
    if (err) { msg.textContent = err; return; }
    await saveManual([...S.manual.filter(m => !(m.hall === day.hall && m.recipeId === it.id)), entry]);
    render(); announce('Saved. Marked as entered by you.');
  } },
    h('p', { class: 'muted' }, 'Copy the numbers from UNC’s item panel (tap the item on dining.unc.edu). Leave a box blank if it isn’t shown. Stored only in this browser, labeled “entered by you”, never shared.'),
    h('div', { class: 'grid4' }, field('Calories', 'calories', ''), field('Protein', 'protein', ' (g)'), field('Fat', 'fat', ' (g)'), field('Carbs', 'carbs', ' (g)')),
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'primary' }, cur ? 'Update' : 'Save'),
      cur ? h('button', { type: 'button', onClick: async () => { await saveManual(S.manual.filter(m => m !== cur)); render(); announce('Your entry was removed.'); } }, 'Remove my entry') : null),
    msg);
  return form;
}

export function sheetView(): HTMLElement | null {
  if (!S.sheet) return null;
  const day = allDays().find(d => `${d.hall}:${d.date}` === S.sheet!.dayKey);
  const it = day?.items[S.sheet.item];
  if (!day || !it) return null;
  const ev = evaluateItem(it, S.profile);
  const where = day.periods.flatMap(p => p.stations.filter(s => s.itemIds.includes(it.id)).map(s => `${p.name} · ${s.name}`));
  const labels = [it.labels.vegan ? 'Vegan' : '', it.labels.vegetarian ? 'Vegetarian' : '', it.labels.halal ? 'Halal' : '', it.labels.madeWithoutGluten ? 'Made without gluten' : ''].filter(Boolean);
  const verdict = ev.status === 'match' ? 'Fits your rules' : ev.status === 'excluded' ? 'Not for you' : 'Unsure';
  const conflict = labelConflict(it);
  const report = reportIssueUrl({ hall: day.hall, date: day.date, period: where[0]?.split(' · ')[0] ?? null, items: [it], profileSummary: profileSummary(S.profile),
    checks: [{ name: it.name, rows: explainChecks(it, S.profile) }], verdict: verdict + (ev.excludedBy ? `: ${ev.excludedBy}` : ''), savedAt: day.provenance.retrievedAt });
  const n = it.nutrition;
  const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-h', tabindex: '-1' },
    h('div', { class: 'sheet-head' }, h('h2', { id: 'sheet-h' }, it.name), h('button', { type: 'button', class: 'close', 'data-fk': 'sheet-close', onClick: closeSheet }, 'Close')),
    h('p', { class: 'verdict' }, ev.status === 'match' ? chip(verdict, 'ok') : ev.status === 'excluded' ? chip(verdict, 'bad') : chip(verdict, 'warn'), ' ',
      ev.status === 'excluded' ? (ev.excludedBy ?? '').replace(/^Excluded: |^Not [a-z-]+: /, '') : ev.status !== 'match' ? `Couldn’t confirm: ${ev.unconfirmed.join('; ')}` : ''),
    conflict || ev.status !== 'match' || S.profile.allergens.length ? h('p', { class: 'staff' }, h('strong', null, '⚠ Confirm with staff. '),
      conflict ? `UNC’s labels conflict with its allergen list (${conflict}); the app believes the allergen list. ` : '', S.profile.allergens.length ? 'You have an allergy set.' : ev.status !== 'match' ? 'Not everything could be confirmed.' : '') : null,
    h('h3', null, 'Nutrition (one serving)'), nutritionGrid(it),
    h('p', { class: 'muted' }, sourceBadge(it), ' ', n.sourceLabel ? `(${n.sourceLabel})` : '(not in the saved page)', n.fat === null || n.carbs === null ? ' Unknown values are never guessed.' : ''),
    it.warnings.filter(w => /not plausible/.test(w)).map(w => h('p', { class: 'warn-text' }, w)),
    h('details', { class: 'more' }, h('summary', null, n.source === 'user' ? 'Edit the values you entered' : 'Enter values from UNC’s item panel'), manualForm(day, it)),
    h('h3', null, 'Allergens'),
    h('p', null, it.allergens.length ? `UNC lists: ${it.allergens.map(a => a.replace('_', ' ')).join(', ')}.` : 'UNC lists no major allergens.', ' ', h('span', { class: 'muted' }, 'Lists can be incomplete.')),
    h('h3', null, 'Ingredients'), h('p', { class: 'ingr' }, it.ingredients ?? 'Not published (treated as unknown).'),
    h('details', { class: 'more' }, h('summary', null, 'Why, labels and source'),
      h('h4', null, 'Rule checks'), checkList(explainChecks(it, S.profile)),
      h('h4', null, 'UNC labels'), h('p', null, labels.join(' · ') || 'None published.'),
      h('h4', null, 'Served'), h('ul', { class: 'notes' }, where.map(w => h('li', null, w))),
      provenanceLine(day)),
    h('p', null, h('a', { href: report, target: '_blank', rel: 'noopener noreferrer', class: 'btn' }, 'Report a wrong result'),
      h('small', { class: 'block' }, 'Opens a prefilled GitHub issue in a new tab (item, hall, date, your diet rules and the evidence; no name or contact details). Nothing is sent unless you submit it there.')),
    h('p', { class: 'muted' }, DISCLAIMER));
  const back = h('div', { class: 'scrim', onClick: (e: Event) => { if (e.target === back) closeSheet(); } }, box);
  back.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    // Keep focus inside the dialog.
    const f = [...box.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  return back;
}
