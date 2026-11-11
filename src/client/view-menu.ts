import { h, clear } from './dom.ts';
import { S, activeName, dayFor, firstDate, lastDate, nextDateWithData, saveHistory, saveSaved, setPattern } from './state.ts';
import { announce, go } from './nav.ts';
import { chip, copyText, disclaimerBlock, DISCLAIMER, provenanceLine, sourceBadge } from './ui.ts';
import { contributionTable, gapList, ideasTable, profileSummary, ruleTable } from './views.ts';
import { buildMeals, type BuildResult, type Meal } from '../core/meals.ts';
import { evaluateItem, explainChecks } from '../core/engine.ts';
import { gapReadout, hitsTargets, toSaved, totalText } from '../core/plan.ts';
import { mealChecklist, reportIssueUrl, staffFlags } from '../core/trust.ts';
import { liveState, liveText, plateText, recentMains } from '../core/discover.ts';
import { staleness } from '../core/refresh.ts';
import { PATTERN_DEFINITIONS, PATTERN_LABELS, type PatternId } from '../core/profile.ts';
import { HALL_NAMES, type HallId, type MenuDay, type MenuItem } from '../core/types.ts';
import { addDays, defaultPeriod, formatDate, nyNow } from '../core/schedule.ts';

export function currentDay(): MenuDay | null { return dayFor(S.hall, S.date); }
export function ensurePeriod(day: MenuDay | null) {
  if (!day || day.noMenuPosted || !day.periods.length) { S.period = null; return; }
  if (!S.period || !day.periods.some(p => p.name === S.period)) S.period = defaultPeriod(day, nyNow());
}
export const openItem = (day: MenuDay, from: string) => (id: string) => go(() => { S.sheet = { item: id, dayKey: `${day.hall}:${day.date}`, opener: from + id }; });
export const recent = () => recentMains(S.history, S.date);

// ---------------- Quiz ----------------
export function quizView(): HTMLElement {
  const picks: PatternId[] = ['vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];
  const choose = (p: PatternId) => go(() => { setPattern(p); S.tab = 'menu'; S.menuTab = 'meal'; }, `${PATTERN_LABELS[p]} saved. Showing a meal.`);
  return h('section', { class: 'quiz', 'aria-labelledby': 'quiz-h' },
    h('h2', { id: 'quiz-h', tabindex: '-1' }, 'What do you eat?'),
    h('p', { class: 'muted' }, 'Tap one to see a meal. You can add allergies and nutrition goals later in the You tab.'),
    h('div', { class: 'quiz-grid' }, picks.map(p => h('button', { class: 'big', type: 'button', onClick: () => choose(p) }, PATTERN_LABELS[p]))),
    h('button', { class: 'linkish', type: 'button', onClick: () => choose('none') }, 'No specific diet'),
    h('details', { class: 'defs' }, h('summary', null, 'What do these mean?'),
      h('dl', null, picks.flatMap(p => [h('dt', null, PATTERN_LABELS[p]), h('dd', null, PATTERN_DEFINITIONS[p])]))));
}

// ---------------- Header controls ----------------
export function hallSwitch(cur: HallId, set: (h: HallId) => void, label = 'Dining hall'): HTMLElement {
  return h('div', { class: 'seg', role: 'group', 'aria-label': label }, (['chase', 'top-of-lenoir'] as HallId[]).map(hl =>
    h('button', { type: 'button', 'aria-pressed': cur === hl, class: cur === hl ? 'on' : '', 'data-fk': 'hall:' + label + hl, onClick: () => go(() => set(hl), `${HALL_NAMES[hl]} selected.`) }, HALL_NAMES[hl])));
}
export function dateBar(day: MenuDay | null): HTMLElement {
  const move = (n: number) => go(() => { S.date = addDays(S.date, n); S.period = null; S.idea = 0; }, `Showing ${formatDate(addDays(S.date, n))}.`);
  const st = day ? staleness(day) : null;
  return h('div', { class: 'datebar' },
    h('button', { type: 'button', 'aria-label': 'Previous day', 'data-fk': 'date-prev', disabled: S.date <= firstDate(), onClick: () => move(-1) }, '‹'),
    h('div', { class: 'date-mid' }, h('strong', null, formatDate(S.date) + (S.date === nyNow().date ? ' (today)' : '')),
      h('small', { class: st?.stale ? 'stale' : '' }, !day ? 'No saved page' : st!.stale ? '△ ' + st!.text : st!.text)),
    h('button', { type: 'button', 'aria-label': 'Next day', 'data-fk': 'date-next', disabled: S.date >= lastDate(), onClick: () => move(1) }, '›'));
}
function periodPills(day: MenuDay): HTMLElement {
  const now = nyNow();
  const ls = day.date === now.date ? liveState(day, dayFor(day.hall, addDays(day.date, -1)), now) : null;
  const liveName = ls?.state === 'serving' && ls.date === day.date ? ls.period.name : null;
  return h('div', { class: 'pills scroll', role: 'group', 'aria-label': 'Meal' }, day.periods.map(p =>
    h('button', { type: 'button', class: 'pill' + (p.name === S.period ? ' on' : ''), 'aria-pressed': p.name === S.period, 'data-fk': 'period:' + p.name, onClick: () => go(() => { S.period = p.name; S.idea = 0; }, `${p.name} selected.`) },
      h('span', null, p.name, p.name === liveName ? h('span', { class: 'now' }, ' ● now') : null), h('small', null, p.hours ?? 'hours unverified'))));
}
function liveLine(day: MenuDay): HTMLElement | null {
  const now = nyNow();
  if (day.date !== now.date) return null;
  return h('p', { class: 'serving' }, liveText(liveState(day, dayFor(day.hall, addDays(day.date, -1)), now)));
}

// ---------------- Meal card ----------------
const kcalLine = (it: MenuItem, k: number) => {
  const n = it.nutrition;
  if (n.calories === null && n.protein === null) return 'nutrition unknown';
  return [n.calories !== null ? `${Math.round(n.calories * k)} kcal` : 'kcal unknown', n.protein !== null ? `${Math.round(n.protein * k)} g protein` : 'protein unknown'].join(' · ');
};
export function isSaved(m: Meal, day: MenuDay): boolean { return S.saved.some(s => s.id === `${day.hall}:${day.date}:${m.id}`); }

export function mealActions(m: Meal, day: MenuDay): HTMLElement {
  const saved = isSaved(m, day);
  const had = S.history.some(x => x.date === day.date && x.hall === day.hall && x.period === m.period && x.main === m.parts[0].item.name);
  const share = async () => {
    const t = plateText(m, day, S.profile, DISCLAIMER);
    if (typeof navigator.share === 'function') { try { await navigator.share({ text: t }); return; } catch { /* cancelled or unavailable: fall back to copy */ } }
    const ok = await copyText(t);
    go(() => { S.flash = ok ? 'Plate copied as text.' : 'Copy was blocked by the browser.'; }, ok ? 'Plate copied as text.' : 'Copy was blocked.');
  };
  const report = reportIssueUrl({ hall: day.hall, date: day.date, period: m.period, items: m.parts.map(p => p.item), profileSummary: profileSummary(S.profile),
    checks: m.parts.map(p => ({ name: p.item.name, rows: explainChecks(p.item, S.profile) })), verdict: `Recommended (${m.tier === 'confirmed' ? 'fits your rules' : 'mostly confirmed'})`, savedAt: day.provenance.retrievedAt });
  return h('div', { class: 'meal-actions' },
    h('button', { type: 'button', 'aria-pressed': saved, 'data-fk': 'save-meal', onClick: () => go(() => {
      if (saved) S.saved = S.saved.filter(s => s.id !== `${day.hall}:${day.date}:${m.id}`); else S.saved = [toSaved(m, day), ...S.saved];
      saveSaved();
    }, saved ? 'Removed from saved meals.' : 'Meal saved. Find it in the Plan tab.') }, saved ? '★ Saved' : '☆ Save'),
    h('button', { type: 'button', 'aria-pressed': had, 'data-fk': 'have-meal', onClick: () => go(() => {
      if (had) S.history = S.history.filter(x => !(x.date === day.date && x.hall === day.hall && x.period === m.period && x.main === m.parts[0].item.name));
      else S.history = [{ date: day.date, hall: day.hall, period: m.period, main: m.parts[0].item.name, items: m.parts.map(p => p.item.name), at: new Date().toISOString() }, ...S.history];
      saveHistory();
    }, had ? 'Removed from your history.' : 'Added to your history. Other mains will be suggested first for a week.') }, had ? '✓ Having this' : 'I’ll have this'),
    h('button', { type: 'button', 'data-fk': 'share-meal', onClick: () => void share() }, 'Share as text'),
    h('a', { class: 'btn', href: report, target: '_blank', rel: 'noopener noreferrer', 'data-fk': 'report-meal' }, 'Report a wrong result'));
}

export function staffBox(m: Meal, skipGeneral = false): HTMLElement | null {
  const f = staffFlags(m, S.profile).filter(x => !skipGeneral || !/^You have (an allergy|strict avoids) set/.test(x));
  if (!f.length) return null;
  return h('div', { class: 'staff', role: 'note' }, h('strong', null, '⚠ Confirm with staff'), h('ul', null, f.map(x => h('li', null, x))));
}

function mealCard(m: Meal, day: MenuDay, r: BuildResult, idx: number): HTMLElement {
  const open = openItem(day, 'part:');
  const roleOf = (p: Meal['parts'][number]) => (m.simplified === 'animal_plate' ? 'Animal food' : p.role === 'main' ? 'Main' : 'Side');
  const gaps = gapReadout(m.totals, S.profile.targets);
  return h('article', { class: 'meal simple', 'aria-labelledby': 'meal-h' },
    h('div', { class: 'meal-head' }, h('h3', { id: 'meal-h' }, `${m.period} · ${HALL_NAMES[day.hall]}`),
      m.tier === 'confirmed' ? chip('Fits your rules', 'ok') : chip('Mostly confirmed', 'warn')),
    h('ul', { class: 'plate' }, m.parts.map(p => h('li', null,
      h('button', { type: 'button', class: 'plate-row', 'data-fk': 'part:' + p.item.id, onClick: () => open(p.item.id) },
        h('span', { class: 'plate-main' },
          h('span', { class: 'plate-name' }, p.item.name, p.portions > 1 ? h('span', { class: 'badge' }, ` ${p.portions}×`) : null),
          h('small', null, `${roleOf(p)} · ${p.station} · ${kcalLine(p.item, p.portions)}`),
          h('small', null, sourceBadge(p.item)),
          p.item.allergens.length ? h('small', { class: 'plate-allergen' }, 'Contains: ' + p.item.allergens.map(a => a.replace('_', ' ')).join(', ')) : null),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'))))),
    h('div', { class: 'total-row' },
      h('div', null, h('small', null, 'Calories'), h('strong', null, totalText(m.totals.calories, 'calories'))),
      h('div', null, h('small', null, 'Protein'), h('strong', null, totalText(m.totals.protein, 'protein'))),
      S.profile.targets.fat || S.profile.targets.carbs ? h('div', null, h('small', null, 'Fat · Carbs'), h('strong', null, `${totalText(m.totals.fat, 'fat')} · ${totalText(m.totals.carbs, 'carbs')}`)) : null),
    gapList(gaps),
    m.unknownNutrition.length ? h('p', { class: 'muted' }, `No published nutrition for ${m.unknownNutrition.join(', ')}, so totals with “+” are minimums.`) : null,
    staffBox(m),
    mealActions(m, day),
    h('details', { class: 'more' }, h('summary', null, 'Details: why it fits, ingredients, other ideas'),
      h('h4', null, 'Rule checklist'), ruleTable(mealChecklist(m, S.profile)),
      h('h4', null, 'Ingredients'),
      m.parts.map(p => h('p', { class: 'ingr' }, h('strong', null, p.item.name + ': '), p.item.ingredients ?? 'not published (treated as unknown).')),
      h('h4', null, 'Breakdown'), contributionTable(m, open),
      r.meals.length > 1 ? [h('h4', null, 'All ideas for this meal'), ideasTable(r, idx, k => go(() => { S.idea = k; }, `Idea ${k + 1} of ${r.meals.length}.`))] : null));
}

function mealPane(day: MenuDay): HTMLElement {
  const wrap = h('div', { class: 'pane', 'aria-live': 'polite' });
  if (!S.period) return wrap;
  const r = buildMeals(day, S.period, S.profile, { recentMains: recent() });
  if (r.banner) wrap.appendChild(h('div', { class: 'banner ' + (r.noMealToday ? 'bad' : 'warn'), role: 'status' }, r.banner));
  if (r.noMealToday) {
    wrap.appendChild(h('div', { class: 'empty' }, h('h3', null, 'No meal fits today'),
      h('p', null, 'Nothing on this menu passes all of your rules. We did not loosen them.'),
      h('button', { class: 'primary', type: 'button', onClick: () => go(() => { S.menuTab = 'all'; }) }, 'See all items')));
    return wrap;
  }
  const t = S.profile.targets;
  if ((t.protein || t.fat || t.carbs || t.calories) && !r.meals.some(m => hitsTargets(m.totals, t))) {
    wrap.appendChild(h('p', { class: 'banner info', role: 'status' }, 'No idea here meets all your targets with known values, so ideas are ranked closest first. The gaps are listed on the card.'));
  }
  const n = r.meals.length, i = S.idea % n;
  wrap.appendChild(mealCard(r.meals[i], day, r, i));
  wrap.appendChild(h('div', { class: 'actions' },
    n > 1 ? h('button', { class: 'ghost', type: 'button', 'aria-label': 'Previous idea', 'data-fk': 'idea-prev', onClick: () => go(() => { S.idea = (i - 1 + n) % n; }, `Idea ${((i - 1 + n) % n) + 1} of ${n}.`) }, '‹ Back') : null,
    h('button', { class: 'primary grow', type: 'button', disabled: n < 2, 'data-fk': 'idea-next', onClick: () => go(() => { S.idea = (i + 1) % n; }, `Idea ${((i + 1) % n) + 1} of ${n}.`) }, n < 2 ? 'Only idea' : `Another idea (${i + 1} of ${n})`)));
  return wrap;
}

// ---------------- All items ----------------
function allItemsPane(day: MenuDay): HTMLElement {
  const wrap = h('div', { class: 'pane' });
  const period = day.periods.find(p => p.name === S.period);
  if (!period) return wrap;
  const q = h('input', { type: 'search', class: 'search', id: 'item-search', placeholder: 'Search items or ingredients', 'aria-label': 'Search items or ingredients', value: S.search });
  const list = h('div', { class: 'items' });
  const count = h('p', { class: 'muted', role: 'status' });
  const sortSel = h('select', { 'aria-label': 'Sort', class: 'sort', 'data-fk': 'sort', onChange: (e: Event) => go(() => { S.sortBy = (e.target as HTMLSelectElement).value as typeof S.sortBy; }) },
    ([['station', 'By station'], ['protein', 'Most protein'], ['calories', 'Fewest calories'], ['name', 'A to Z']] as const).map(([v, l]) => h('option', { value: v, ...(S.sortBy === v ? { selected: true } : {}) }, l)));
  const draw = () => {
    clear(list);
    const term = S.search.trim().toLowerCase();
    type Row = { it: MenuItem; st: string; status: string };
    const rows: Row[] = []; const seen = new Set<string>(); let total = 0;
    for (const st of period.stations) for (const id of st.itemIds) {
      const it = day.items[id]; if (!it || seen.has(id)) continue; seen.add(id); total++;
      if (term && !it.name.toLowerCase().includes(term) && !(it.ingredients ?? '').toLowerCase().includes(term)) continue;
      const status = evaluateItem(it, S.profile).status;
      if (S.hideNonFits && status === 'excluded') continue;
      rows.push({ it, st: st.name, status });
    }
    const nv = (v: number | null, d: number) => (v === null ? d : v);
    if (S.sortBy === 'protein') rows.sort((a, b) => nv(b.it.nutrition.protein, -1) - nv(a.it.nutrition.protein, -1));
    if (S.sortBy === 'calories') rows.sort((a, b) => nv(a.it.nutrition.calories, 1e9) - nv(b.it.nutrition.calories, 1e9));
    if (S.sortBy === 'name') rows.sort((a, b) => a.it.name.localeCompare(b.it.name));
    count.textContent = `${rows.length} of ${total} items`;
    const rowEl = (r: Row) => h('li', null, h('button', { type: 'button', class: 'item-row', 'data-fk': 'item:' + r.it.id, onClick: () => openItem(day, 'item:')(r.it.id) },
      h('span', { class: 'item-main' }, h('span', { class: 'item-name' }, r.it.name), h('small', null, (S.sortBy !== 'station' ? r.st + ' · ' : '') + kcalLine(r.it, 1))),
      r.status === 'match' ? chip('Fits', 'ok') : r.status === 'excluded' ? chip('Not for you', 'bad') : chip('Unsure', 'warn')));
    if (S.sortBy === 'station') {
      const groups = new Map<string, Row[]>();
      for (const r of rows) (groups.get(r.st) ?? groups.set(r.st, []).get(r.st)!).push(r);
      for (const [st, rs] of groups) list.appendChild(h('section', null, h('h3', { class: 'station' }, st), h('ul', { class: 'list' }, rs.map(rowEl))));
    } else if (rows.length) list.appendChild(h('ul', { class: 'list' }, rows.map(rowEl)));
    if (!rows.length) list.appendChild(h('p', { class: 'muted' }, 'Nothing matches.'));
  };
  q.addEventListener('input', () => { S.search = q.value; draw(); });
  draw();
  const toggle = h('label', { class: 'row switch' }, h('span', { class: 'row-text' }, h('span', null, 'Only what fits me')),
    h('input', { type: 'checkbox', role: 'switch', checked: S.hideNonFits, 'data-fk': 'only-fits', onChange: (e: Event) => go(() => { S.hideNonFits = (e.target as HTMLInputElement).checked; }) }));
  wrap.append(q, h('div', { class: 'inline' }, toggle, sortSel), count, list);
  return wrap;
}

// ---------------- Menu tab ----------------
export function menuView(): HTMLElement {
  if (!S.onboarded) return quizView();
  const day = currentDay();
  ensurePeriod(day);
  const v = h('div', { class: 'view' });
  v.appendChild(hallSwitch(S.hall, hl => { S.hall = hl; S.period = null; S.idea = 0; }));
  v.appendChild(dateBar(day));
  if (S.loading) { v.appendChild(h('p', { class: 'muted', role: 'status' }, 'Loading menus…')); return v; }
  if (S.seedError) v.appendChild(h('div', { class: 'banner warn' }, S.seedError));
  if (!day || day.noMenuPosted) {
    const nxt = nextDateWithData(S.hall, S.date);
    v.appendChild(h('div', { class: 'banner warn', role: 'status' },
      h('p', null, !day ? `No menu saved for ${HALL_NAMES[S.hall]} on ${formatDate(S.date)}.` : `No menu was posted when this page was saved (${formatDate(day.date)}). It may be a break day.`),
      h('div', { class: 'actions' },
        nxt ? h('button', { type: 'button', class: 'primary', onClick: () => go(() => { S.date = nxt; S.period = null; S.idea = 0; }) }, `Go to ${formatDate(nxt)}`) : null,
        h('button', { type: 'button', onClick: () => go(() => { S.tab = 'you'; }) }, 'Add a saved page'))));
    v.appendChild(disclaimerBlock());
    return v;
  }
  v.appendChild(periodPills(day));
  const ll = liveLine(day); if (ll) v.appendChild(ll);
  v.appendChild(h('div', { class: 'seg tabs', role: 'group', 'aria-label': 'View' },
    h('button', { type: 'button', class: S.menuTab === 'meal' ? 'on' : '', 'aria-pressed': S.menuTab === 'meal', 'data-fk': 'mt-meal', onClick: () => go(() => { S.menuTab = 'meal'; }) }, 'My meal'),
    h('button', { type: 'button', class: S.menuTab === 'all' ? 'on' : '', 'aria-pressed': S.menuTab === 'all', 'data-fk': 'mt-all', onClick: () => go(() => { S.menuTab = 'all'; }) }, 'All items')));
  v.appendChild(S.menuTab === 'meal' ? mealPane(day) : allItemsPane(day));
  v.appendChild(h('p', { class: 'rules-line' }, h('span', null, `${S.profiles.length > 1 ? activeName() + ': ' : 'Your rules: '}`, profileSummary(S.profile)), ' ',
    h('button', { type: 'button', class: 'linkish', onClick: () => go(() => { S.tab = 'you'; }) }, 'Change')));
  v.appendChild(provenanceLine(day));
  v.appendChild(disclaimerBlock());
  void announce;
  return v;
}
