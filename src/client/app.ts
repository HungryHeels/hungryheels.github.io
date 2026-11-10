import { h, clear } from './dom.ts';
import { S, FIRST_DATE, allDays, dayFor, lastDate, loadProfile, nextDateWithData, saveProfile, setPattern } from './state.ts';
import { clearImported, importFile, importOfficialCsv, loadImported, loadSeed, persistence } from './imports.ts';
import { buildMeals, candidatesFor, periodItems, type Meal } from '../core/meals.ts';
import { evaluateItem, matchSentence } from '../core/engine.ts';
import { ALLERGEN_IDS, ALLERGEN_LABELS, PATTERN_DEFINITIONS, PATTERN_LABELS, type PatternId } from '../core/profile.ts';
import { HALL_NAMES, type HallId, type MenuDay, type MenuItem } from '../core/types.ts';
import { addDays, defaultPeriod, formatDate, formatSaved, nyNow, servingNow } from '../core/schedule.ts';
import { computeMissing } from '../core/validate.ts';
import { ANIMAL_BASED_DEFAULT } from '../core/profile.ts';

const DISCLAIMER = 'Menus can change and data may be incomplete. If you have an allergy, confirm with dining staff. Not medical advice.';
const UNOFFICIAL = 'Hungry Heels is an independent, unofficial project for personal use. It is not affiliated with or endorsed by UNC-Chapel Hill or Carolina Dining Services.';
let root: HTMLElement;
let live: HTMLElement;

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? 'unknown' : String(Math.round(n * 10) / 10));
const unit = (m: string) => (m === 'calories' ? '' : m === 'sodium' ? ' mg' : ' g');

function announce(msg: string) { live.textContent = ''; setTimeout(() => (live.textContent = msg), 30); }

// ---------------- helpers ----------------
function currentDay(): MenuDay | null { return dayFor(S.hall, S.date); }
function ensurePeriod(day: MenuDay | null) {
  if (!day || day.noMenuPosted || !day.periods.length) { S.period = null; return; }
  if (!S.period || !day.periods.some(p => p.name === S.period)) S.period = defaultPeriod(day, nyNow());
}
function go(fn: () => void, msg?: string) { fn(); render(); if (msg) announce(msg); }

// ---------------- shared widgets ----------------
function chip(text: string, kind: 'ok' | 'warn' | 'bad' | 'info'): HTMLElement {
  const sym = { ok: '✓ ', warn: '△ ', bad: '✕ ', info: '' }[kind];
  return h('span', { class: 'chip chip-' + kind }, sym + text);
}
function disclaimerBlock(): HTMLElement {
  return h('footer', { class: 'legal' }, h('p', null, DISCLAIMER), h('p', null, UNOFFICIAL));
}
function sw(label: string, checked: boolean, onChange: (v: boolean) => void, hint?: string): HTMLElement {
  const input = h('input', { type: 'checkbox', role: 'switch', checked, onChange: (e: Event) => onChange((e.target as HTMLInputElement).checked) });
  return h('label', { class: 'row switch' }, h('span', { class: 'row-text' }, h('span', null, label), hint ? h('small', null, hint) : null), input);
}

function nutritionGrid(item: MenuItem, extra = false): HTMLElement {
  const n = item.nutrition;
  if (!extra && n.calories === null && n.protein === null && n.fat === null && n.carbs === null) {
    return h('p', { class: 'nutri-none' }, 'Calories, protein, fat and carbs: ', h('em', null, 'unknown'), ' (not published in the saved page)');
  }
  const cells: Array<[string, string, number | null | undefined]> = [['Calories', 'calories', n.calories], ['Protein', 'protein', n.protein], ['Fat', 'fat', n.fat], ['Carbs', 'carbs', n.carbs]];
  if (extra) cells.push(['Fiber', 'fiber', n.fiber], ['Sugar', 'sugar', n.sugar], ['Sodium', 'sodium', n.sodium]);
  return h('dl', { class: 'nutri' }, cells.map(([lab, key, v]) =>
    h('div', null, h('dt', null, lab), h('dd', { class: v === null || v === undefined ? 'unk' : '' }, v === null || v === undefined ? 'unknown' : fmt(v) + unit(key)))));
}

function provenanceLine(day: MenuDay): HTMLElement {
  const p = day.provenance;
  const kind = p.kind === 'official' ? 'official UNC page' : p.kind === 'third_party' ? 'third-party copy' : 'demo data';
  const ver = p.verification === 'user_saved_page' ? 'saved by hand, not verified by UNC' : p.verification === 'official_export' ? 'official export' : 'unverified';
  return h('p', { class: 'prov' }, `Source: ${p.source} (${kind}; ${ver}). Saved ${formatSaved(p.retrievedAt)}.`);
}

// ---------------- Quiz ----------------
function quizView(): HTMLElement {
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

// ---------------- Menu header controls ----------------
function hallSwitch(): HTMLElement {
  return h('div', { class: 'seg', role: 'group', 'aria-label': 'Dining hall' }, (['chase', 'top-of-lenoir'] as HallId[]).map(hl =>
    h('button', { type: 'button', 'aria-pressed': S.hall === hl, class: S.hall === hl ? 'on' : '', onClick: () => go(() => { S.hall = hl; S.period = null; S.idea = 0; }, `${HALL_NAMES[hl]} selected.`) }, HALL_NAMES[hl])));
}
function dateBar(day: MenuDay | null): HTMLElement {
  const last = lastDate();
  const move = (n: number) => go(() => { S.date = addDays(S.date, n); S.period = null; S.idea = 0; }, `Showing ${formatDate(addDays(S.date, n))}.`);
  return h('div', { class: 'datebar' },
    h('button', { type: 'button', 'aria-label': 'Previous day', disabled: S.date <= FIRST_DATE, onClick: () => move(-1) }, '‹'),
    h('div', { class: 'date-mid' }, h('strong', null, formatDate(S.date)), h('small', null, day ? `Saved ${formatSaved(day.provenance.retrievedAt)}` : 'No saved page')),
    h('button', { type: 'button', 'aria-label': 'Next day', disabled: S.date >= last, onClick: () => move(1) }, '›'));
}
function periodPills(day: MenuDay): HTMLElement {
  return h('div', { class: 'pills', role: 'group', 'aria-label': 'Meal period' }, day.periods.map(p =>
    h('button', { type: 'button', class: 'pill' + (p.name === S.period ? ' on' : ''), 'aria-pressed': p.name === S.period, onClick: () => go(() => { S.period = p.name; S.idea = 0; }, `${p.name} selected.`) },
      p.name, p.hours ? h('small', null, ' ' + p.hours) : h('small', null, ' hours unverified'))));
}
function servingLine(day: MenuDay): HTMLElement | null {
  const s = servingNow(day, nyNow());
  if (s.state === 'not_today') return null;
  const txt = s.state === 'serving' ? `Serving now: ${s.period.name} (${s.period.hours})`
    : s.state === 'next' ? `Next: ${s.period.name} (${s.period.hours})`
    : s.state === 'closed' ? 'All published meal periods have ended for today.'
    : `Serving time unverified. ${s.why}`;
  return h('p', { class: 'serving' }, txt);
}

function limitsDisclosure(): HTMLElement {
  const p = S.profile;
  const num = (label: string, val: number | undefined, set: (n: number | undefined) => void, ph: string) =>
    h('label', { class: 'field' }, label, h('input', { type: 'number', inputmode: 'numeric', min: 0, value: val ?? '', placeholder: ph,
      onChange: (e: Event) => { const v = (e.target as HTMLInputElement).value; set(v === '' ? undefined : Math.max(0, Number(v))); S.idea = 0; saveProfile(); render(); } }));
  return h('details', { class: 'limits' }, h('summary', null, 'Nutrition limits'),
    h('p', { class: 'muted' }, 'Per meal. Leave a target blank to ignore it. Only published values are used; unknown values are never guessed, so a target can only be checked when every part of a meal has that value.'),
    num('Calorie cap', p.calorieCap, n => { p.calorieCap = n ?? 1000; }, '1000'),
    num('Protein target (g)', p.targets.protein, n => { p.targets = { ...p.targets, protein: n }; }, 'e.g. 40'),
    num('Fat target (g)', p.targets.fat, n => { p.targets = { ...p.targets, fat: n }; }, 'e.g. 25'),
    num('Carb target (g)', p.targets.carbs, n => { p.targets = { ...p.targets, carbs: n }; }, 'e.g. 60'),
    h('label', { class: 'field' }, 'Largest portion multiplier',
      h('select', { onChange: (e: Event) => { p.maxPortion = Number((e.target as HTMLSelectElement).value) as 1 | 2 | 3; S.idea = 0; saveProfile(); render(); } },
        [1, 2, 3].map(n => h('option', { value: n, ...(p.maxPortion === n ? { selected: true } : {}) }, n === 1 ? '1× (no extra portions)' : `Up to ${n}×`)))),
    h('p', { class: 'muted' }, 'With targets set, the app can serve double or triple portions of an item so a meal can reach your numbers when only a few items fit your diet.'));
}

// ---------------- Meal card ----------------
function totalsRow(m: Meal): HTMLElement {
  const t = m.totals;
  if (t.calories.min === 0 && t.protein.min === 0 && t.fat.min === 0 && t.carbs.min === 0 && !t.calories.complete) {
    return h('p', { class: 'nutri-none', 'aria-label': 'Meal totals' }, 'Meal totals: ', h('em', null, 'unknown'), ' (no nutrition published for these items)');
  }
  const cell = (lab: string, key: 'calories' | 'protein' | 'fat' | 'carbs') => {
    const x = t[key];
    const known = x.complete ? fmt(x.value) + unit(key) : (x.min > 0 ? `${fmt(x.min)}+${unit(key)}` : 'unknown');
    return h('div', null, h('dt', null, lab), h('dd', { class: x.complete ? '' : 'unk' }, known, x.complete ? null : h('small', null, ' minimum')));
  };
  return h('dl', { class: 'nutri totals', 'aria-label': 'Meal totals' }, cell('Calories', 'calories'), cell('Protein', 'protein'), cell('Fat', 'fat'), cell('Carbs', 'carbs'));
}
function mealCard(m: Meal, day: MenuDay): HTMLElement {
  return h('article', { class: 'meal' },
    h('div', { class: 'meal-head' }, h('h3', null, `${m.period} at ${HALL_NAMES[day.hall]}`),
      m.tier === 'confirmed' ? chip('Confirmed', 'ok') : chip('Possible', 'warn')),
    h('p', { class: 'muted' }, m.tier === 'confirmed' ? 'Every part matches your rules on UNC’s published labels, allergens and ingredients.'
      : `Not every part could be confirmed: ${m.unconfirmed.map(u => `${u.name} (${u.why})`).join('; ')}.`),
    h('ol', { class: 'parts' }, m.parts.map(p => h('li', null,
      h('button', { type: 'button', class: 'part', onClick: () => go(() => { S.sheet = { item: p.item.id, dayKey: `${day.hall}:${day.date}` }; }) },
        h('span', { class: 'part-top' }, h('strong', null, p.item.name), p.portions > 1 ? h('span', { class: 'badge' }, `${p.portions}× portion`) : null),
        h('small', null, `${p.role === 'main' ? 'Main' : 'Side'} · ${p.station}`),
        nutritionGrid({ ...p.item, nutrition: scale(p.item, p.portions) }))))),
    h('h4', null, 'Meal totals'), totalsRow(m),
    m.unknownNutrition.length ? h('p', { class: 'warn-text' }, `Totals are minimums. No published nutrition for: ${m.unknownNutrition.join(', ')}.`) : null,
    m.targetNotes.length ? h('ul', { class: 'notes' }, m.targetNotes.map(n => h('li', null, n))) : null,
    h('p', { class: 'why' }, whyText(m)));
}
function scale(it: MenuItem, k: number) {
  const n = it.nutrition; const f = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * k * 10) / 10);
  return { calories: f(n.calories), protein: f(n.protein), fat: f(n.fat), carbs: f(n.carbs), fiber: f(n.fiber), sugar: f(n.sugar), sodium: f(n.sodium) };
}
function whyText(m: Meal): string {
  const label = S.profile.pattern === 'none' ? 'your rules' : `your ${PATTERN_LABELS[S.profile.pattern]} diet`;
  const picks = m.parts.map(p => p.item.name).join(', ');
  const strict = [S.profile.allergens.length ? `${S.profile.allergens.map(a => ALLERGEN_LABELS[a].toLowerCase()).join(', ')} allergy` : '', S.profile.avoidGluten ? 'gluten' : '', S.profile.avoidDairy ? 'dairy' : '', S.profile.avoidEgg ? 'egg' : '',
    ...S.profile.avoidIngredients, S.profile.halalStyle ? 'pork and alcohol' : ''].filter(Boolean);
  return `Why this meal: ${picks} all pass ${label}${strict.length ? ` and were checked against your avoid list (${strict.join(', ')})` : ''}. Items we could not rule out for your avoid list are never recommended.`;
}

function mealPane(day: MenuDay): HTMLElement {
  const wrap = h('div', { class: 'pane', 'aria-live': 'polite' });
  if (!S.period) return wrap;
  const r = buildMeals(day, S.period, S.profile);
  if (r.banner) wrap.appendChild(h('div', { class: 'banner ' + (r.noMealToday ? 'bad' : 'warn'), role: 'status' }, r.banner));
  if (r.noMealToday) {
    wrap.appendChild(h('div', { class: 'empty' }, h('h3', null, 'No meal fits today'),
      h('p', null, 'Nothing on this menu passes all of your rules. We did not loosen them.'),
      h('button', { class: 'primary', type: 'button', onClick: () => go(() => { S.menuTab = 'all'; }) }, 'Browse all items')));
    return wrap;
  }
  const n = r.meals.length;
  const meal = r.meals[S.idea % n];
  if (r.period && r.period !== S.period) wrap.appendChild(h('p', { class: 'muted' }, `Showing ${r.period} (you picked ${S.period}).`));
  wrap.appendChild(mealCard(meal, day));
  wrap.appendChild(h('div', { class: 'actions' },
    h('button', { class: 'primary', type: 'button', disabled: n < 2, onClick: () => go(() => { S.idea = (S.idea + 1) % n; }, `Idea ${((S.idea + 1) % n) + 1} of ${n}.`) }, `Another idea (${(S.idea % n) + 1} of ${n})`),
    h('button', { class: 'linkish', type: 'button', onClick: () => go(() => { S.tab = 'you'; }) }, 'Rules & customize')));
  return wrap;
}

// ---------------- All items ----------------
function allItemsPane(day: MenuDay): HTMLElement {
  const wrap = h('div', { class: 'pane' });
  const period = day.periods.find(p => p.name === S.period);
  if (!period) return wrap;
  const q = h('input', { type: 'search', class: 'search', placeholder: 'Search items', 'aria-label': 'Search items', value: S.search });
  const list = h('div', { class: 'items' });
  const draw = () => {
    clear(list);
    const term = S.search.trim().toLowerCase();
    let shown = 0;
    for (const st of period.stations) {
      const rows = st.itemIds.map(id => day.items[id]).filter(it => it && (!term || it.name.toLowerCase().includes(term)))
        .map(it => ({ it, ev: evaluateItem(it, S.profile) })).filter(x => !S.hideNonFits || x.ev.status === 'match' || x.ev.status === 'potential');
      if (!rows.length) continue;
      shown += rows.length;
      list.appendChild(h('section', null, h('h3', { class: 'station' }, st.name), h('ul', { class: 'list' }, rows.map(({ it, ev }) => h('li', null,
        h('button', { type: 'button', class: 'item-row', onClick: () => go(() => { S.sheet = { item: it.id, dayKey: `${day.hall}:${day.date}` }; }) },
          h('span', { class: 'item-name' }, it.name),
          ev.status === 'match' ? chip('Fits', 'ok') : ev.status === 'potential' ? chip('Possible', 'warn') : ev.status === 'insufficient' ? chip('Unknown', 'warn') : chip('Not for you', 'bad')))))));
    }
    if (!shown) list.appendChild(h('p', { class: 'muted' }, 'No items match.'));
  };
  q.addEventListener('input', () => { S.search = q.value; draw(); });
  draw();
  wrap.append(q, sw('Hide items that do not fit', S.hideNonFits, v => go(() => { S.hideNonFits = v; })), list);
  return wrap;
}

// ---------------- Item sheet ----------------
function sheetView(): HTMLElement | null {
  if (!S.sheet) return null;
  const day = allDays().find(d => `${d.hall}:${d.date}` === S.sheet!.dayKey);
  const it = day?.items[S.sheet.item];
  if (!day || !it) return null;
  const ev = evaluateItem(it, S.profile);
  const close = () => go(() => { S.sheet = null; });
  const where = day.periods.filter(p => p.stations.some(s => s.itemIds.includes(it.id))).map(p => p.name).join(', ');
  const box = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sheet-h', tabindex: '-1' },
    h('div', { class: 'sheet-head' }, h('h2', { id: 'sheet-h' }, it.name), h('button', { type: 'button', class: 'close', 'aria-label': 'Close', onClick: close }, 'Close')),
    h('p', null, ev.status === 'match' ? chip('Fits your rules', 'ok') : ev.status === 'excluded' ? chip('Not for you', 'bad') : chip('Could not confirm', 'warn')),
    h('p', null, matchSentence(it, S.profile, ev)),
    h('h3', null, 'Nutrition'), nutritionGrid(it, true),
    it.nutrition.calories === null ? h('p', { class: 'muted' }, 'UNC’s saved page does not include nutrition. Open the item on dining.unc.edu to see it, or import an official export in You › Menu data.') : null,
    h('h3', null, 'Allergens and labels'),
    h('p', null, it.allergens.length ? `UNC lists: ${it.allergens.map(a => a.replace('_', ' ')).join(', ')}.` : 'UNC lists no major allergens for this item. Lists can be incomplete.'),
    h('p', null, [it.labels.vegan ? 'Labeled vegan' : '', it.labels.vegetarian ? 'Labeled vegetarian' : '', it.labels.halal ? 'Labeled halal by UNC' : '', it.labels.madeWithoutGluten ? 'Labeled made without gluten' : ''].filter(Boolean).join(' · ') || 'No diet labels published.'),
    h('p', { class: 'muted' }, 'Labels are UNC’s, not ours, and we make no certification claims.'),
    h('h3', null, 'Ingredients'), h('p', { class: 'ingr' }, it.ingredients ?? 'No ingredient text was published (treated as unknown).'),
    h('p', { class: 'muted' }, `Served at ${HALL_NAMES[day.hall]} on ${formatDate(day.date)}: ${where}.`),
    it.warnings.length ? h('ul', { class: 'notes' }, it.warnings.map(w => h('li', null, w))) : null,
    provenanceLine(day), h('p', { class: 'muted' }, DISCLAIMER));
  const back = h('div', { class: 'scrim', onClick: (e: Event) => { if (e.target === back) close(); } }, box);
  back.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') close(); });
  setTimeout(() => box.focus(), 0);
  return back;
}

// ---------------- Menu tab ----------------
function menuView(): HTMLElement {
  if (!S.onboarded) return quizView();
  const day = currentDay();
  ensurePeriod(day);
  const v = h('div', { class: 'view' }, hallSwitch(), dateBar(day));
  if (S.loading) { v.appendChild(h('p', { class: 'muted', role: 'status' }, 'Loading built-in menus…')); return v; }
  if (S.seedError) v.appendChild(h('div', { class: 'banner warn' }, S.seedError));
  if (!day) {
    const nxt = nextDateWithData(S.hall, S.date);
    v.appendChild(h('div', { class: 'banner warn', role: 'status' }, h('p', null, `No saved menu for ${HALL_NAMES[S.hall]} on ${formatDate(S.date)}.`),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'primary', onClick: () => go(() => { S.tab = 'you'; }) }, 'Menu data'),
        nxt ? h('button', { type: 'button', onClick: () => go(() => { S.date = nxt; S.period = null; }) }, `Jump to ${formatDate(nxt)}`) : null)));
    v.appendChild(limitsDisclosure()); v.appendChild(disclaimerBlock());
    return v;
  }
  if (day.noMenuPosted) {
    v.appendChild(h('div', { class: 'banner warn', role: 'status' }, h('p', null, `No menu was posted when you saved this page (${formatDate(day.date)}). It may be a break day or not published yet.`),
      h('p', null, 'You can re-save the page later from dining.unc.edu and import it again in You › Menu data.'),
      h('button', { type: 'button', onClick: () => go(() => { S.tab = 'you'; }) }, 'Menu data')));
    v.appendChild(provenanceLine(day)); v.appendChild(disclaimerBlock());
    return v;
  }
  v.appendChild(periodPills(day));
  const sv = servingLine(day); if (sv) v.appendChild(sv);
  v.appendChild(h('div', { class: 'seg tabs', role: 'group', 'aria-label': 'View' },
    h('button', { type: 'button', class: S.menuTab === 'meal' ? 'on' : '', 'aria-pressed': S.menuTab === 'meal', onClick: () => go(() => { S.menuTab = 'meal'; }) }, 'My meal'),
    h('button', { type: 'button', class: S.menuTab === 'all' ? 'on' : '', 'aria-pressed': S.menuTab === 'all', onClick: () => go(() => { S.menuTab = 'all'; }) }, 'All items')));
  v.appendChild(S.menuTab === 'meal' ? mealPane(day) : allItemsPane(day));
  v.appendChild(limitsDisclosure());
  v.appendChild(provenanceLine(day));
  v.appendChild(disclaimerBlock());
  return v;
}

// ---------------- You tab ----------------
function youView(): HTMLElement {
  const p = S.profile;
  const upd = () => { S.idea = 0; saveProfile(); render(); };
  const presets: PatternId[] = ['none', 'vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];
  const v = h('div', { class: 'view you' });
  v.appendChild(h('section', { 'aria-labelledby': 'diet-h' }, h('h2', { id: 'diet-h' }, 'Diet'),
    h('div', { class: 'group', role: 'radiogroup', 'aria-label': 'Diet' }, presets.map(id =>
      h('label', { class: 'row radio' }, h('span', { class: 'row-text' }, h('span', null, PATTERN_LABELS[id]), h('small', null, PATTERN_DEFINITIONS[id])),
        h('input', { type: 'radio', name: 'diet', checked: p.pattern === id, onChange: () => { setPattern(id); S.idea = 0; render(); } })))),
    p.pattern === 'pescatarian' ? h('div', { class: 'group' }, sw('Include dairy', p.allowDairy, x => { p.allowDairy = x; upd(); }), sw('Include eggs', p.allowEgg, x => { p.allowEgg = x; upd(); })) : null,
    p.pattern === 'animal_based' ? h('div', { class: 'group' }, h('p', { class: 'muted pad' }, `Default allowed: ${ANIMAL_BASED_DEFAULT.join(', ')}. Turn a food group on to allow it.`),
      (['vegetables', 'grains', 'legumes', 'nuts_seeds'] as const).map(c => sw(`Allow ${c.replace('_', ' / ')}`, !p.animalBasedExcluded.includes(c),
        x => { p.animalBasedExcluded = x ? p.animalBasedExcluded.filter(y => y !== c) : [...p.animalBasedExcluded, c]; upd(); }))) : null));

  v.appendChild(h('section', { 'aria-labelledby': 'allergy-h' }, h('h2', { id: 'allergy-h' }, 'Allergies and strict avoids'),
    h('p', { class: 'muted' }, 'These are strict. If we cannot confirm an item is free of something here, it is never recommended.'),
    h('div', { class: 'group' }, ALLERGEN_IDS.map(a => sw(`${ALLERGEN_LABELS[a]} allergy`, p.allergens.includes(a), x => { p.allergens = x ? [...p.allergens, a] : p.allergens.filter(y => y !== a); upd(); }))),
    h('div', { class: 'group' },
      sw('Avoid gluten', p.avoidGluten, x => { p.avoidGluten = x; upd(); }, 'Wheat, barley, rye, malt and similar'),
      sw('Avoid dairy', p.avoidDairy, x => { p.avoidDairy = x; upd(); }),
      sw('Avoid egg', p.avoidEgg, x => { p.avoidEgg = x; upd(); }),
      sw('No pork or alcohol (halal-style)', p.halalStyle, x => { p.halalStyle = x; upd(); }, 'An ingredient rule only. This is not a halal certification.')),
    customAvoid(upd)));

  v.appendChild(h('section', { 'aria-labelledby': 'nutr-h' }, h('h2', { id: 'nutr-h' }, 'Nutrition priorities and limits'), limitsDisclosure()));
  v.appendChild(dataSection());
  v.appendChild(h('section', { 'aria-labelledby': 'about-h' }, h('h2', { id: 'about-h' }, 'About'),
    h('p', null, UNOFFICIAL), h('p', null, DISCLAIMER),
    h('p', { class: 'muted' }, 'Privacy: your diet choices stay in this browser. Menus come from pages you save yourself; nothing is uploaded and no analytics are used. This app never contacts dining.unc.edu.'),
    S.storageNote ? h('p', { class: 'warn-text' }, S.storageNote) : null));
  return v;
}
function customAvoid(upd: () => void): HTMLElement {
  const p = S.profile;
  const input = h('input', { type: 'text', id: 'custom-avoid', placeholder: 'e.g. mushroom, pork, cilantro', autocomplete: 'off' });
  const add = () => { const t = input.value.trim().toLowerCase(); if (t && !p.avoidIngredients.includes(t)) { p.avoidIngredients = [...p.avoidIngredients, t]; upd(); } };
  return h('div', { class: 'group pad' }, h('label', { for: 'custom-avoid' }, 'Avoid any ingredient'),
    h('div', { class: 'inline' }, input, h('button', { type: 'button', onClick: add }, 'Add')),
    h('ul', { class: 'chips' }, p.avoidIngredients.map(t => h('li', null, t, h('button', { type: 'button', 'aria-label': `Remove ${t}`, onClick: () => { p.avoidIngredients = p.avoidIngredients.filter(x => x !== t); upd(); } }, '×')))),
    h('p', { class: 'muted' }, 'Matched against item names and ingredient text. Items with no ingredient list are excluded.'));
}

// ---------------- Menu data ----------------
async function handleFiles(files: FileList | File[]) {
  const list = [...files];
  if (!list.length) return;
  S.importing = true; S.importResults = []; render();
  for (const f of list) {
    const { result, day } = await importFile(f);
    S.importResults.push(result);
    if (day) { S.imported = [...S.imported.filter(d => !(d.hall === day.hall && d.date === day.date)), day]; }
    render();
  }
  S.importing = false; S.idea = 0; render();
  announce(`Import finished. ${S.importResults.filter(r => r.ok).length} of ${list.length} files read.`);
}
function dataSection(): HTMLElement {
  const sec = h('section', { 'aria-labelledby': 'data-h' }, h('h2', { id: 'data-h' }, 'Menu data'));
  const fileInput = h('input', { type: 'file', id: 'pick', multiple: true, accept: '.webarchive,.html,.htm', class: 'sr', onChange: (e: Event) => { const el = e.target as HTMLInputElement; if (el.files) void handleFiles(el.files); } });
  const drop = h('div', { class: 'drop', 'data-testid': 'drop' }, h('label', { for: 'pick', class: 'primary btn' }, 'Choose saved pages'), h('p', { class: 'muted' }, 'or drag and drop .webarchive, .html or .htm files here'));
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer?.files) void handleFiles(e.dataTransfer.files); });
  sec.append(fileInput, drop);
  if (S.importing) sec.appendChild(h('p', { role: 'status' }, 'Reading files…'));
  if (S.importResults.length) {
    sec.appendChild(h('ul', { class: 'results', 'aria-live': 'polite' }, S.importResults.map(r => h('li', { class: r.ok ? 'ok' : 'bad' },
      h('strong', null, r.file), r.ok ? h('div', null, chip(r.noMenu ? 'No menu posted' : 'Imported', r.noMenu ? 'warn' : 'ok'), ` ${HALL_NAMES[r.hall as HallId]} · ${formatDate(r.date!)} · ${r.items} items · ${r.periods} periods`) : h('div', null, chip('Could not import', 'bad'), ' ' + r.error),
      r.notes.length ? h('ul', { class: 'notes' }, r.notes.map(n => h('li', null, n))) : null))));
  }
  // coverage
  const days = allDays(); const last = lastDate();
  for (const hall of ['chase', 'top-of-lenoir'] as HallId[]) {
    const c = computeMissing(days, hall, FIRST_DATE, last);
    sec.appendChild(h('p', { class: 'cov' }, h('strong', null, HALL_NAMES[hall]), ` through ${formatDate(last)}: ${c.imported} with menus, ${c.noMenu} with no menu posted, ${c.missing} missing.`));
  }
  sec.appendChild(h('button', { type: 'button', 'aria-expanded': S.showDays, onClick: () => go(() => { S.showDays = !S.showDays; }) }, S.showDays ? 'Hide day-by-day' : 'Show day-by-day'));
  if (S.showDays) {
    const hc = ['chase', 'top-of-lenoir'].map(hl => computeMissing(days, hl as HallId, FIRST_DATE, last));
    sec.appendChild(h('div', { class: 'tablewrap' }, h('table', null, h('caption', null, 'Coverage by day'),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Date'), h('th', { scope: 'col' }, 'Chase'), h('th', { scope: 'col' }, 'Top of Lenoir'))),
      h('tbody', null, hc[0].days.map((row, i) => h('tr', null, h('th', { scope: 'row' }, formatDate(row.date)), covCell(row), covCell(hc[1].days[i])))))));
  }
  sec.appendChild(h('details', { class: 'howto' }, h('summary', null, 'How to save a page in Safari'),
    h('ol', null, h('li', null, 'On a Mac, open dining.unc.edu, choose Locations, then Chase or Top of Lenoir, and pick the date.'),
      h('li', null, 'Wait for the menu to finish loading, then choose File › Save As… and set Format to Web Archive.'),
      h('li', null, 'Repeat for each date, then come back here and choose the files.')),
    h('p', null, h('strong', null, 'A saved page contains: '), 'item names, stations, meal periods and hours, ingredient text, UNC’s allergen and diet labels.'),
    h('p', null, h('strong', null, 'It does not contain: '), 'calories, protein, fat or carbs. UNC loads those only when you tap an item, so they show as unknown here.'),
    h('p', { class: 'muted' }, 'Saving a Web Archive is a Mac Safari feature. Re-importing a day replaces it. A no-menu day (such as a break) is recorded as “no menu posted”; re-save it later if UNC publishes one.')));
  // official nutrition
  const csv = h('input', { type: 'file', id: 'csv', accept: '.csv', class: 'sr', onChange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    const r = await importOfficialCsv(await f.text(), [...S.seed, ...S.imported]);
    S.nutritionMsg = r.errors.length ? r.errors.join(' ') : `Applied official nutrition to ${r.applied} item entries.`; S.idea = 0; render();
  } });
  sec.appendChild(h('div', { class: 'group pad' }, h('h3', null, 'Official nutrition file (optional)'),
    h('p', { class: 'muted' }, 'If Carolina Dining sends a CSV with columns hall, name, calories, protein, fat, carbs (and optionally recipe_id), import it here to fill in nutrition.'),
    csv, h('label', { for: 'csv', class: 'btn' }, 'Choose CSV'), S.nutritionMsg ? h('p', { role: 'status' }, S.nutritionMsg) : null));
  sec.appendChild(h('div', { class: 'actions' }, h('button', { type: 'button', class: 'danger', onClick: async () => { await clearImported(); S.imported = []; S.importResults = []; render(); announce('Imported pages removed.'); } }, 'Remove imported pages'),
    h('p', { class: 'muted' }, `Built-in menus are not removed. Imports are stored ${persistence === 'indexeddb' ? 'in this browser (IndexedDB)' : 'in memory only; this browser blocked storage, so they will be lost when you close the page'}.`)));
  return sec;
}
function covCell(r: { status: string; itemCount: number }): HTMLElement {
  return h('td', null, r.status === 'imported' ? chip(`${r.itemCount} items`, 'ok') : r.status === 'no_menu' ? chip('No menu posted', 'warn') : chip('Missing', 'bad'));
}

// ---------------- Shell ----------------
function render() {
  const keepScroll = window.scrollY;
  clear(root);
  const header = h('header', { class: 'top' }, h('h1', { tabindex: '-1', id: 'title' }, S.tab === 'menu' ? 'Hungry Heels' : 'You'),
    h('p', { class: 'unofficial' }, 'Unofficial · personal use · not affiliated with UNC'));
  const main = h('main', { id: 'main' }, S.tab === 'menu' ? menuView() : youView());
  const nav = h('nav', { class: 'tabbar', 'aria-label': 'Main' },
    h('button', { type: 'button', 'aria-current': S.tab === 'menu' ? 'page' : null, class: S.tab === 'menu' ? 'on' : '', onClick: () => go(() => { S.tab = 'menu'; }) }, h('span', { 'aria-hidden': 'true' }, '🍽'), 'Menu'),
    h('button', { type: 'button', 'aria-current': S.tab === 'you' ? 'page' : null, class: S.tab === 'you' ? 'on' : '', onClick: () => go(() => { S.tab = 'you'; }) }, h('span', { 'aria-hidden': 'true' }, '⚙'), 'You'));
  root.append(header, main, nav);
  const sh = sheetView(); if (sh) root.appendChild(sh);
  window.scrollTo(0, keepScroll);
}

export async function start() {
  root = document.getElementById('app')!;
  live = document.getElementById('live')!;
  loadProfile();
  render();
  const [seed, imported] = await Promise.all([loadSeed(), loadImported()]);
  S.seed = seed.days; S.seedError = seed.error; S.imported = imported; S.loading = false;
  const now = nyNow();
  const last = lastDate();
  S.date = now.date < FIRST_DATE ? FIRST_DATE : now.date > last ? last : now.date;
  render();
  (window as any).__hh = { S, render, handleFiles };
}
void candidatesFor; void periodItems;
