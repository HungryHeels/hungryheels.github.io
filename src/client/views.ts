// Detailed dashboard components: macro meters, contribution table, evidence checklists,
// idea comparison, day timeline and day statistics. Text always carries the meaning; bars are decoration.
import { h } from './dom.ts';
import type { Meal, MacroTotal, BuildResult } from '../core/meals.ts';
import { periodItems } from '../core/meals.ts';
import { evaluateItem, explainChecks, type CheckRow } from '../core/engine.ts';
import type { Profile } from '../core/profile.ts';
import { ALLERGEN_IDS, ALLERGEN_LABELS, PATTERN_LABELS } from '../core/profile.ts';
import type { MenuDay, MenuItem, Period } from '../core/types.ts';
import { nyNow } from '../core/schedule.ts';

type MacroKey = 'calories' | 'protein' | 'fat' | 'carbs';
export const MACRO_LABEL: Record<MacroKey, string> = { calories: 'Calories', protein: 'Protein', fat: 'Fat', carbs: 'Carbs' };
const U = (k: MacroKey) => (k === 'calories' ? ' kcal' : ' g');
const r1 = (n: number) => Math.round(n * 10) / 10;

/** One macro: value vs target (or vs calorie cap). Unknown parts make the value a minimum. */
export function macroMeter(key: MacroKey, t: MacroTotal, p: Profile): HTMLElement {
  const target = key === 'calories' ? (p.targets.calories ?? null) : (p.targets[key] ?? null);
  const cap = key === 'calories' ? p.calorieCap : null;
  const ref = target ?? cap;
  const shown = t.complete ? t.value! : t.min;
  const known = t.complete || t.min > 0;
  const valueText = !known ? 'unknown' : `${t.complete ? '' : 'at least '}${r1(shown)}${U(key)}`;
  let refText = '';
  if (target) refText = ` of ${target}${U(key)} target`;
  else if (cap) refText = ` of ${cap} kcal cap`;
  const pct = ref && known ? Math.round((shown / ref) * 100) : null;
  const status = !ref ? '' : !known ? 'cannot check' : !t.complete ? (shown > ref * 1.1 && key !== 'protein' ? 'over' : 'incomplete') : target ? (Math.abs(shown - target) / target <= 0.1 ? 'on target' : shown < target ? 'under' : 'over') : shown <= cap! ? 'within cap' : 'over cap';
  const width = pct === null ? 0 : Math.min(100, pct);
  return h('div', { class: 'meter m-' + key + (t.complete ? '' : ' partial') },
    h('div', { class: 'meter-top' }, h('span', { class: 'meter-name' }, MACRO_LABEL[key]),
      h('span', { class: 'meter-val' }, valueText, h('small', null, refText + (pct !== null ? ` · ${pct}%` : '')))),
    h('div', { class: 'meter-track', 'aria-hidden': 'true' }, h('div', { class: 'meter-fill', style: `width:${width}%` }), target ? h('div', { class: 'meter-mark', style: 'right:0' }) : null),
    status ? h('small', { class: 'meter-status s-' + status.replace(/\s/g, '-') }, statusSymbol(status) + status) : null);
}
function statusSymbol(s: string) { return s === 'on target' || s === 'within cap' ? '✓ ' : s === 'over' || s === 'over cap' ? '↑ ' : s === 'under' ? '↓ ' : '△ '; }

export function statTiles(tiles: Array<[string, string, string?]>): HTMLElement {
  return h('dl', { class: 'tiles' }, tiles.map(([k, v, sub]) => h('div', null, h('dt', null, k), h('dd', null, v, sub ? h('small', null, sub) : null))));
}

export function mealStats(m: Meal): HTMLElement {
  const n = m.parts.length;
  const confirmed = m.parts.filter(p => p.evaluation.status === 'match').length;
  const withNut = m.parts.filter(p => p.item.nutrition.calories !== null && p.item.nutrition.protein !== null).length;
  const c = m.totals.calories, pr = m.totals.protein;
  const density = c.complete && pr.complete && c.value ? `${r1((pr.value! / c.value) * 100)} g` : '—';
  const servings = m.parts.reduce((a, p) => a + p.portions, 0);
  return statTiles([
    ['Parts', String(n), servings > n ? `${servings} servings` : undefined],
    ['Confirmed', `${confirmed}/${n}`, 'parts'],
    ['Nutrition known', `${withNut}/${n}`, 'parts'],
    ['Protein density', density, density === '—' ? 'needs all values' : 'per 100 kcal'],
  ]);
}

/** Per-part contribution table (values scaled by portion). */
export function contributionTable(m: Meal, onOpen: (id: string) => void): HTMLElement {
  const cell = (v: number | null, k: number) => (v === null ? h('td', { class: 'unk' }, '?') : h('td', null, String(r1(v * k))));
  const sum = (key: MacroKey) => m.totals[key].complete ? String(r1(m.totals[key].value!)) : m.totals[key].min > 0 ? `${r1(m.totals[key].min)}+` : '?';
  return h('div', { class: 'tablewrap' }, h('table', { class: 'contrib' },
    h('caption', null, 'What each part adds (portion-scaled; ? = not published)'),
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Part'), h('th', { scope: 'col' }, 'Qty'), h('th', { scope: 'col' }, 'kcal'), h('th', { scope: 'col' }, 'Protein g'), h('th', { scope: 'col' }, 'Fat g'), h('th', { scope: 'col' }, 'Carbs g'))),
    h('tbody', null, m.parts.map(p => h('tr', null,
      h('th', { scope: 'row' }, h('button', { type: 'button', class: 'tlink', onClick: () => onOpen(p.item.id) }, p.item.name)),
      h('td', null, `${p.portions}×`), cell(p.item.nutrition.calories, p.portions), cell(p.item.nutrition.protein, p.portions), cell(p.item.nutrition.fat, p.portions), cell(p.item.nutrition.carbs, p.portions)))),
    h('tfoot', null, h('tr', null, h('th', { scope: 'row' }, 'Total'), h('td', null, ''), h('td', null, sum('calories')), h('td', null, sum('protein')), h('td', null, sum('fat')), h('td', null, sum('carbs'))))));
}

export function checkList(rows: CheckRow[], compact = false): HTMLElement {
  if (!rows.length) return h('p', { class: 'muted' }, 'No diet or avoid rules are set, so there is nothing to check.');
  const sym = (r: CheckRow) => (r.outcome === 'pass' ? '✓' : r.outcome === 'fail' ? '✕' : '?');
  const word = (r: CheckRow) => (r.outcome === 'pass' ? 'Pass' : r.outcome === 'fail' ? (r.group === 'strict' ? 'Blocked' : 'Fails') : 'Unconfirmed');
  return h('ul', { class: 'checks' + (compact ? ' compact' : '') }, rows.map(r => h('li', { class: 'c-' + r.outcome },
    h('span', { class: 'c-sym', 'aria-hidden': 'true' }, sym(r)),
    h('span', { class: 'c-body' }, h('strong', null, `${word(r)}: ${r.label}`), h('small', null, `${r.group === 'strict' ? 'Strict avoid' : 'Diet rule'} · ${r.why}`)))));
}
export function checkSummary(item: MenuItem, p: Profile): string {
  const rows = explainChecks(item, p);
  if (!rows.length) return 'No rules to check';
  const pass = rows.filter(r => r.outcome === 'pass').length;
  return `${pass} of ${rows.length} checks passed`;
}

export function ideasTable(r: BuildResult, current: number, onPick: (i: number) => void): HTMLElement {
  const v = (t: MacroTotal) => (t.complete ? String(Math.round(t.value!)) : t.min > 0 ? `${Math.round(t.min)}+` : '?');
  return h('div', { class: 'tablewrap' }, h('table', { class: 'ideas' },
    h('caption', null, `All ${r.meals.length} ideas, ranked (confirmed first)`),
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, '#'), h('th', { scope: 'col' }, 'Main'), h('th', { scope: 'col' }, 'kcal'), h('th', { scope: 'col' }, 'Protein'), h('th', { scope: 'col' }, 'Tier'))),
    h('tbody', null, r.meals.map((m, i) => h('tr', { class: i === current ? 'cur' : '', 'aria-current': i === current ? 'true' : null },
      h('td', null, String(i + 1)),
      h('th', { scope: 'row' }, h('button', { type: 'button', class: 'tlink', onClick: () => onPick(i) }, m.parts[0].item.name), h('small', null, m.parts.length > 1 ? ` + ${m.parts.length - 1} side${m.parts.length > 2 ? 's' : ''}` : '')),
      h('td', null, v(m.totals.calories)), h('td', null, v(m.totals.protein)),
      h('td', null, m.tier === 'confirmed' ? '✓ Conf.' : '△ Poss.'))))));
}

/** Visual timeline of meal periods (6am to 1am). Decorative: the period pills carry the same information as text. */
export function dayTimeline(day: MenuDay, selected: string | null): HTMLElement {
  const START = 6 * 60, END = 25 * 60, span = END - START;
  const pos = (m: number) => `${Math.max(0, Math.min(100, ((m - START) / span) * 100))}%`;
  const now = nyNow();
  const timed = day.periods.filter(p => p.startMin !== null && p.endMin !== null);
  const ticks = [6, 9, 12, 15, 18, 21, 24];
  return h('div', { class: 'timeline', 'aria-hidden': 'true' },
    h('div', { class: 'tl-track' },
      timed.map(p => h('div', { class: 'tl-block' + (p.name === selected ? ' sel' : ''), style: `left:${pos(p.startMin!)};width:calc(${pos(p.endMin!)} - ${pos(p.startMin!)})`, title: `${p.name} ${p.hours}` }, h('span', null, p.name))),
      day.date === now.date ? h('div', { class: 'tl-now', style: `left:${pos(now.minutes < START ? now.minutes + 1440 : now.minutes)}` }) : null),
    h('div', { class: 'tl-ticks' }, ticks.map(t => h('span', { style: `left:${pos(t * 60)}` }, t === 12 ? '12p' : t === 24 ? '12a' : t > 12 ? `${t - 12}p` : `${t}a`))));
}

export interface PeriodStats { items: number; stations: number; fits: number; possible: number; unknown: number; excluded: number; withNutrition: number }
export function periodStats(day: MenuDay, period: Period, p: Profile): PeriodStats {
  const list = periodItems(day, period);
  const s: PeriodStats = { items: list.length, stations: period.stations.length, fits: 0, possible: 0, unknown: 0, excluded: 0, withNutrition: 0 };
  for (const { item } of list) {
    const st = evaluateItem(item, p).status;
    if (st === 'match') s.fits++; else if (st === 'potential') s.possible++; else if (st === 'insufficient') s.unknown++; else s.excluded++;
    if (item.nutrition.calories !== null) s.withNutrition++;
  }
  return s;
}
export function periodStatsPanel(s: PeriodStats, periodName: string): HTMLElement {
  const pct = (n: number) => (s.items ? Math.round((n / s.items) * 100) : 0);
  return h('section', { class: 'panel', 'aria-label': `${periodName} at a glance` },
    h('h3', null, `${periodName} at a glance`),
    statTiles([['Items', String(s.items), `${s.stations} stations`], ['Fit you', String(s.fits), `${pct(s.fits)}%`], ['Possible', String(s.possible + s.unknown), 'unconfirmed'], ['Not for you', String(s.excluded), `${pct(s.excluded)}%`]]),
    h('div', { class: 'stack', 'aria-hidden': 'true' },
      h('span', { class: 'sk-ok', style: `flex:${s.fits}` }), h('span', { class: 'sk-warn', style: `flex:${s.possible + s.unknown}` }), h('span', { class: 'sk-bad', style: `flex:${s.excluded}` })),
    h('p', { class: 'muted' }, `Nutrition published for ${s.withNutrition} of ${s.items} items (${pct(s.withNutrition)}%). Calories and protein come from Eat UNC’s Nov 5 listing; fat and carbs are not available yet.`));
}

export function profileSummary(p: Profile): string {
  const bits = [PATTERN_LABELS[p.pattern]];
  if (p.allergens.length) bits.push(p.allergens.map(a => ALLERGEN_LABELS[a]).join(', ') + ' allergy');
  if (p.avoidGluten) bits.push('no gluten'); if (p.avoidDairy) bits.push('no dairy'); if (p.avoidEgg) bits.push('no egg');
  if (p.halalStyle) bits.push('no pork/alcohol');
  if (p.avoidIngredients.length) bits.push('avoids ' + p.avoidIngredients.join(', '));
  const t = p.targets;
  const tg = [t.protein ? `${t.protein}g protein` : '', t.fat ? `${t.fat}g fat` : '', t.carbs ? `${t.carbs}g carbs` : ''].filter(Boolean);
  bits.push(`≤${p.calorieCap} kcal` + (tg.length ? ', ' + tg.join(', ') : ''));
  if (p.maxPortion > 1) bits.push(`up to ${p.maxPortion}× portions`);
  return bits.join(' · ');
}

export function allergenGrid(item: MenuItem): HTMLElement {
  return h('ul', { class: 'agrid', 'aria-label': 'Major allergens UNC lists for this item' }, ALLERGEN_IDS.map(a => {
    const on = item.allergens.includes(a);
    return h('li', { class: on ? 'on' : '' }, h('span', { 'aria-hidden': 'true' }, on ? '●' : '○'), ` ${ALLERGEN_LABELS[a]}: `, h('strong', null, on ? 'listed' : 'not listed'));
  }));
}
