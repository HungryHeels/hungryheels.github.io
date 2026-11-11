// Detail components shared by the meal card, the item sheet and the planner. Text always carries the meaning.
import { h } from './dom.ts';
import { S } from './state.ts';
import { effective, type MacroKey } from '../core/estimate.ts';
import type { Meal, MacroTotal, BuildResult } from '../core/meals.ts';
import { BASIS_LABEL, type CheckRow } from '../core/engine.ts';
import type { Profile } from '../core/profile.ts';
import { ALLERGEN_LABELS, PATTERN_LABELS } from '../core/profile.ts';
import type { RuleRow } from '../core/trust.ts';
import type { GapRow } from '../core/plan.ts';

const r1 = (n: number) => Math.round(n * 10) / 10;
const sym = (o: CheckRow['outcome']) => (o === 'pass' ? '✓' : o === 'fail' ? '✕' : '?');

/** Per-part contribution table (values scaled by portion). */
export function contributionTable(m: Meal, onOpen: (id: string) => void): HTMLElement {
  const est = S.profile.useEstimates !== false;
  const cellFor = (it: Meal['parts'][number]['item'], key: MacroKey, k: number) => {
    const e = effective(it, key, est);
    return e.value === null ? h('td', { class: 'unk' }, '?') : h('td', { class: e.estimated ? 'est' : '' }, (e.estimated ? '~' : '') + String(r1(e.value * k)));
  };
  const sum = (key: MacroKey) => { const t = m.totals[key]; return t.complete ? String(r1(t.value!)) : est && t.est !== null ? `~${r1(t.est)}` : t.min > 0 ? `${r1(t.min)}+` : '?'; };
  return h('div', { class: 'tablewrap' }, h('table', { class: 'contrib' },
    h('caption', null, 'What each part adds (portion-scaled; ~ = estimate, ? = not published, + = at least)'),
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Part'), h('th', { scope: 'col' }, 'Qty'), h('th', { scope: 'col' }, 'kcal'), h('th', { scope: 'col' }, 'Protein g'), h('th', { scope: 'col' }, 'Fat g'), h('th', { scope: 'col' }, 'Carbs g'))),
    h('tbody', null, m.parts.map(p => h('tr', null,
      h('th', { scope: 'row' }, h('button', { type: 'button', class: 'tlink', onClick: () => onOpen(p.item.id) }, p.item.name)),
      h('td', null, `${p.portions}×`), cellFor(p.item, 'calories', p.portions), cellFor(p.item, 'protein', p.portions), cellFor(p.item, 'fat', p.portions), cellFor(p.item, 'carbs', p.portions)))),
    h('tfoot', null, h('tr', null, h('th', { scope: 'row' }, 'Total'), h('td', null, ''), h('td', null, sum('calories')), h('td', null, sum('protein')), h('td', null, sum('fat')), h('td', null, sum('carbs'))))));
}

/** One item's rule checks, with the kind of evidence that decided each. */
export function checkList(rows: CheckRow[]): HTMLElement {
  if (!rows.length) return h('p', { class: 'muted' }, 'No diet or avoid rules are set, so there is nothing to check.');
  const word = (r: CheckRow) => (r.outcome === 'pass' ? 'Pass' : r.outcome === 'fail' ? (r.group === 'strict' ? 'Blocked' : 'Fails') : 'Unconfirmed');
  return h('ul', { class: 'checks compact' }, rows.map(r => h('li', { class: 'c-' + r.outcome },
    h('span', { class: 'c-sym', 'aria-hidden': 'true' }, sym(r.outcome)),
    h('span', { class: 'c-body' }, h('strong', null, `${word(r)}: ${r.label}`), h('small', null, `${r.group === 'strict' ? 'Strict avoid' : 'Diet rule'} · ${r.why} · decided by ${BASIS_LABEL[r.basis]}`)))));
}

/** Whole-meal rule checklist: one row per rule, each part's evidence underneath. */
export function ruleTable(rows: RuleRow[]): HTMLElement {
  if (!rows.length) return h('p', { class: 'muted' }, 'No diet or avoid rules are set, so nothing was checked.');
  const word = (r: RuleRow) => (r.outcome === 'pass' ? 'Pass' : r.outcome === 'fail' ? 'Fails' : 'Unconfirmed');
  return h('ul', { class: 'checks rules' }, rows.map(r => h('li', { class: 'c-' + r.outcome },
    h('span', { class: 'c-sym', 'aria-hidden': 'true' }, sym(r.outcome)),
    h('span', { class: 'c-body' }, h('strong', null, `${word(r)}: ${r.label}`), h('small', null, `${r.group === 'strict' ? 'Strict avoid' : 'Diet rule'} · ${r.decidedBy}`),
      h('ul', { class: 'rule-parts' }, r.parts.map(x => h('li', null, `${sym(x.outcome)} ${x.name}: ${x.why} (${BASIS_LABEL[x.basis]})`)))))));
}

export function gapList(rows: GapRow[]): HTMLElement | null {
  if (!rows.length) return null;
  const s = (g: GapRow) => (g.status === 'on_target' || g.status === 'within_cap' || g.status === 'at_least_target' ? '✓' : g.status === 'under' ? '↓' : g.status === 'over' || g.status === 'over_cap' ? '↑' : '?');
  return h('ul', { class: 'gaps', 'aria-label': 'Targets' }, rows.map(g => h('li', { class: 'g-' + g.status }, h('span', { 'aria-hidden': 'true' }, s(g) + ' '), g.text)));
}

export function ideasTable(r: BuildResult, current: number, onPick: (i: number) => void): HTMLElement {
  const v = (t: MacroTotal) => (t.complete ? String(Math.round(t.value!)) : S.profile.useEstimates !== false && t.est !== null ? `~${Math.round(t.est)}` : t.min > 0 ? `${Math.round(t.min)}+` : '?');
  return h('div', { class: 'tablewrap' }, h('table', { class: 'ideas' },
    h('caption', null, `All ${r.meals.length} ideas, ranked (confirmed first)`),
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, '#'), h('th', { scope: 'col' }, 'Main'), h('th', { scope: 'col' }, 'kcal'), h('th', { scope: 'col' }, 'Protein'), h('th', { scope: 'col' }, 'Tier'))),
    h('tbody', null, r.meals.map((m, i) => h('tr', { class: i === current ? 'cur' : '', 'aria-current': i === current ? 'true' : null },
      h('td', null, String(i + 1)),
      h('th', { scope: 'row' }, h('button', { type: 'button', class: 'tlink', onClick: () => onPick(i) }, m.parts[0].item.name), h('small', null, m.parts.length > 1 ? ` + ${m.parts.length - 1} side${m.parts.length > 2 ? 's' : ''}` : '')),
      h('td', null, v(m.totals.calories)), h('td', null, v(m.totals.protein)),
      h('td', null, m.tier === 'confirmed' ? '✓ Conf.' : '△ Poss.'))))));
}

export function profileSummary(p: Profile): string {
  const bits = [PATTERN_LABELS[p.pattern]];
  if (p.allergens.length) bits.push(p.allergens.map(a => ALLERGEN_LABELS[a]).join(', ') + ' allergy');
  if (p.avoidGluten) bits.push('no gluten'); if (p.avoidDairy) bits.push('no dairy'); if (p.avoidEgg) bits.push('no egg');
  if (p.halalStyle) bits.push('no pork/alcohol');
  if (p.avoidIngredients.length) bits.push(`avoids ${p.avoidIngredients.length > 4 ? p.avoidIngredients.slice(0, 4).join(', ') + ` +${p.avoidIngredients.length - 4} more` : p.avoidIngredients.join(', ')}`);
  const t = p.targets;
  const tg = [t.calories ? `${t.calories} kcal` : '', t.protein ? `${t.protein}g protein` : '', t.fat ? `${t.fat}g fat` : '', t.carbs ? `${t.carbs}g carbs` : ''].filter(Boolean);
  bits.push(`≤${p.calorieCap} kcal` + (tg.length ? ', ' + tg.join(', ') : ''));
  if (p.maxPortion > 1) bits.push(`up to ${p.maxPortion}× portions`);
  return bits.join(' · ');
}
