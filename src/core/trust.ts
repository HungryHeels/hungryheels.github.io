// Trust and explainability: which evidence decided each rule for a whole meal, when to tell the student to
// confirm with staff, and a prefilled "report a wrong result" link (opens GitHub; the app never fetches).
import { basisLabel, explainChecks, type CheckRow, type EvBasis } from './engine.ts';
import type { Meal } from './meals.ts';
import type { Profile } from './profile.ts';
import type { HallId, MenuItem } from './types.ts';
import { HALL_NAMES } from './types.ts';

export interface RulePart { name: string; outcome: CheckRow['outcome']; why: string; basis: EvBasis; publisher?: string }
export interface RuleRow { group: CheckRow['group']; label: string; outcome: CheckRow['outcome']; parts: RulePart[]; decidedBy: string }

/** Every rule applied to a meal, combined over its parts: fail if any part fails, unconfirmed if any part is unconfirmed. */
export function mealChecklist(meal: Meal, p: Profile): RuleRow[] {
  const by = new Map<string, RuleRow>();
  for (const part of meal.parts) for (const row of explainChecks(part.item, p)) {
    const key = row.group + ':' + row.label;
    let r = by.get(key);
    if (!r) { r = { group: row.group, label: row.label, outcome: 'pass', parts: [], decidedBy: '' }; by.set(key, r); }
    r.parts.push({ name: part.item.name, outcome: row.outcome, why: row.why, basis: row.basis, ...(row.publisher ? { publisher: row.publisher } : {}) });
    if (row.outcome === 'fail') r.outcome = 'fail';
    else if (row.outcome === 'unconfirmed' && r.outcome !== 'fail') r.outcome = 'unconfirmed';
  }
  for (const r of by.values()) {
    const bases = [...new Set(r.parts.map(x => basisLabel(x.basis, x.publisher)))];
    r.decidedBy = 'Decided by: ' + bases.join(', ');
  }
  return [...by.values()];
}

/** Reasons the student should confirm with dining staff before eating. Empty only when nothing is uncertain. */
export function staffFlags(meal: Meal, p: Profile): string[] {
  const out: string[] = [];
  const strict = p.allergens.length || p.avoidGluten || p.avoidDairy || p.avoidEgg || p.avoidIngredients.length || p.halalStyle;
  if (p.allergens.length) out.push('You have an allergy set. Menus and recipes can change, so confirm with dining staff before eating.');
  else if (strict) out.push('You have strict avoids set. Recipes can change, so check with staff if it matters.');
  for (const u of meal.unconfirmed) out.push(`${u.name}: could not confirm ${u.why || 'every diet rule'}.`);
  for (const part of meal.parts) {
    const rows = explainChecks(part.item, p);
    if (rows.some(r => /even though/.test(r.why)) || labelConflict(part.item)) out.push(`${part.item.name}: ${part.item.publisher ?? 'UNC'}’s diet label contradicts its own allergen list or ingredients. The app believes the allergen list and ingredients.`);
    const labelOnly = rows.filter(r => r.group === 'strict' && r.outcome === 'pass' && r.basis === 'label');
    if (labelOnly.length) out.push(`${part.item.name}: passes ${labelOnly.map(r => r.label).join(', ')} only because of ${part.item.publisher ?? 'UNC'}’s label.`);
  }
  return [...new Set(out)];
}

/** UNC's own diet label disagrees with its own allergen list (real examples exist in the saved pages). */
export function labelConflict(it: MenuItem): string | null {
  const a = it.allergens, L = it.labels;
  const animal = a.filter(x => ['milk', 'egg', 'fish', 'shellfish'].includes(x));
  if (L.vegan && animal.length) return `labeled vegan but lists ${animal.join(', ')}`;
  const flesh = a.filter(x => ['fish', 'shellfish'].includes(x));
  if (L.vegetarian && flesh.length) return `labeled vegetarian but lists ${flesh.join(', ')}`;
  if (L.madeWithoutGluten && a.includes('wheat')) return 'labeled made without gluten but lists wheat';
  return null;
}

export const REPO_ISSUES = 'https://github.com/HungryHeels/hungryheels.github.io/issues/new';
export interface ReportContext {
  hall: HallId; date: string; period: string | null;
  placeName?: string;            // a restaurant's name, used instead of the hall (restaurants have no dates or meal periods)
  items: MenuItem[];             // the item(s) the report is about
  profileSummary: string;        // the diet rules in plain words (no name, no email, nothing personal)
  checks: Array<{ name: string; rows: CheckRow[] }>;
  verdict: string;               // what the app said
  savedAt: string | null;
}
/** A prefilled GitHub "new issue" link. It only opens a page; nothing is sent until the student submits it there. */
export function reportIssueUrl(c: ReportContext): string {
  const what = c.items.map(i => i.name).join(' + ');
  const where = c.placeName ?? HALL_NAMES[c.hall];
  const title = c.placeName ? `Wrong result? ${what} (${where})` : `Wrong result? ${what} (${where}, ${c.date}${c.period ? ', ' + c.period : ''})`;
  const lines: string[] = [
    '**What looks wrong?** (describe it here)', '', '',
    '---', 'Filled in by Hungry Heels. It contains no name or contact details; edit anything before submitting.', '',
    c.placeName ? `- Place: ${where} (national published menu; no dates or meal periods)` : `- Hall / date / meal: ${where} / ${c.date} / ${c.period ?? 'n/a'}`,
    `- Page saved: ${c.savedAt ?? 'unknown'}`,
    `- App said: ${c.verdict}`,
    `- Rules: ${c.profileSummary}`,
  ];
  for (const it of c.items) {
    const pub = it.publisher ?? 'UNC';
    lines.push('', `**${it.name}** (${it.publisher ? 'item' : 'recipe'} ${it.id})`, `- ${pub} allergens: ${it.allergensUnknown ? 'not published' : it.allergens.length ? it.allergens.join(', ') : 'none listed'}`,
      ...(it.mayContain?.length ? [`- ${pub} may contain (cross-contact): ${it.mayContain.join(', ')}`] : []),
      `- ${pub} labels: ${Object.entries(it.labels).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}`,
      `- Ingredients: ${(it.ingredients ?? 'not published').slice(0, 400)}`);
    const ch = c.checks.find(x => x.name === it.name);
    if (ch) for (const r of ch.rows) lines.push(`- ${r.outcome.toUpperCase()} ${r.label}: ${r.why} [${basisLabel(r.basis, r.publisher)}]`);
  }
  let body = lines.join('\n');
  // Keep the URL well under browser and GitHub limits.
  if (body.length > 5000) body = body.slice(0, 5000) + '\n…(trimmed)';
  return `${REPO_ISSUES}?title=${encodeURIComponent(title.slice(0, 200))}&body=${encodeURIComponent(body)}`;
}
