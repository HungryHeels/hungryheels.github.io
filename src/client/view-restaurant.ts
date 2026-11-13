// Franklin Street restaurants (Sweetgreen, Chipotle): a bowl built from the restaurant's own published components,
// and the full component list. No dates or meal periods; hours are unknown unless an official source states them.
import { h, clear } from './dom.ts';
import { S, activeName } from './state.ts';
import { go } from './nav.ts';
import { chip, copyText, DISCLAIMER, kcalLine, nutritionGrid, sourceBadge, tt } from './ui.ts';
import { checkList, contributionTable, gapList, profileSummary, ruleTable } from './views.ts';
import { href, placeSwitch } from './view-common.ts';
import { buildBowls, bowlText, mealTitle, type BowlResult } from '../core/restaurant-meals.ts';
import { evaluateItem, explainChecks } from '../core/engine.ts';
import { gapReadout } from '../core/plan.ts';
import { mealChecklist, reportIssueUrl, staffFlags } from '../core/trust.ts';
import { formatSaved } from '../core/schedule.ts';
import type { Meal, MealPart } from '../core/meals.ts';
import type { MenuItem } from '../core/types.ts';
import {
  HOURS_UNKNOWN, LOCATION_NOTE, RESTAURANT_INFO, STORE_MENU_NOTE, NATIONAL_MENU_NOTE, NOT_AFFILIATED, RESTAURANT_NAMES, ROLE_LABELS, ROLE_PLURAL, ROLES,
  type ComponentRole, type RestaurantId, type RestaurantMenu,
} from '../core/restaurant.ts';


export function menuFor(id: RestaurantId): RestaurantMenu | null { return S.restaurants.find(m => m.id === id) ?? null; }

const allergenWords = (a: string[]) => a.map(x => x.replace('_', ' ')).join(', ');
/** "Contains …" / "May contain …" lines for one component, as the restaurant publishes them. */
function allergenLines(it: MenuItem): Array<HTMLElement | null> {
  return [
    it.allergensUnknown ? h('small', { class: 'plate-allergen' }, '? Allergen information not published')
      : it.allergens.length || it.otherAllergens?.length ? h('small', { class: 'plate-allergen' }, '△ Contains ' + allergenWords([...it.allergens, ...(it.otherAllergens ?? [])])) : null,
    it.mayContain?.length ? h('small', { class: 'plate-allergen' }, '△ May contain ' + allergenWords(it.mayContain) + ' (cross-contact)') : null,
  ];
}

/** The picker for a restaurant: the place switch plus where, hours and the national-menu caveat. */
function placeBar(id: RestaurantId, menu: RestaurantMenu | null): HTMLElement {
  const name = RESTAURANT_NAMES[id];
  return h('section', { class: 'picker', 'aria-label': 'Place' },
    h('div', { class: 'picker-row' }, placeSwitch(),
      h('div', { class: 'place-info' },
        h('p', null, h('strong', null, `${name} · ${menu?.address ?? LOCATION_NOTE}`)),
        h('p', null, menu?.hours ? [`Hours: ${menu.hours.text} `, h('small', null, '(from ', h('a', { href: menu.hours.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, `${name}’s site`), ')')] : HOURS_UNKNOWN),
        h('p', { class: 'muted' }, menu?.scope === 'store' ? STORE_MENU_NOTE(name, menu.address, menu.provenance.documentDate) : NATIONAL_MENU_NOTE))));
}

function crossContactBox(menu: RestaurantMenu): HTMLElement | null {
  if (!menu.crossContact.length) return null;
  return h('div', { class: 'staff', role: 'note' }, h('strong', null, `△ ${menu.name}’s own allergen statement`),
    h('ul', null, menu.crossContact.map(c => h('li', null, '“' + c.text + '”'))),
    h('small', null, 'Because of this statement, every strict allergy or avoid it covers excludes all items.'));
}

function pendingCard(id: RestaurantId): HTMLElement {
  const name = RESTAURANT_NAMES[id];
  const info = RESTAURANT_INFO[id];
  return h('section', { class: 'card pending', 'aria-labelledby': 'pending-h' },
    h('h2', { id: 'pending-h' }, `No ${name} data yet`),
    h('p', null, `${name}’s terms of use don’t allow copying its nutrition and allergen information, so Hungry Heels can’t check ${name} dishes against your rules or build a bowl. Nothing is guessed.`),
    h('p', null, 'Check the restaurant’s own information instead:'),
    h('p', null, h('a', { class: 'btn primary', href: info.url, target: '_blank', rel: 'noopener noreferrer', 'data-fk': 'official-info' }, `Open ${info.label}`),
      h('small', { class: 'block' }, `Opens ${name}’s website in a new tab. Hungry Heels doesn’t contact ${name}; it’s only a link.`)),
    h('p', { class: 'muted' }, `If you have an allergy, confirm with ${name} staff before ordering.`),
    h('div', { class: 'actions' }, h('button', { type: 'button', 'data-fk': 'pending-chase', onClick: () => go(() => { S.place = S.hall; S.idea = 0; }) }, 'Back to the dining halls')));
}

function provenance(menu: RestaurantMenu): HTMLElement {
  const p = menu.provenance;
  return h('section', { class: 'side-note' },
    h('p', { class: 'prov' }, `Source: ${p.publisher}, “${p.documentTitle}” (${p.documentDate ?? 'date not stated'}${p.documentVersion ? ', version ' + p.documentVersion : ''}). Official; saved by hand ${formatSaved(p.retrievedAt)}. `,
      h('a', { href: p.sourceUrl, target: '_blank', rel: 'noopener noreferrer' }, 'Official source')),
    h('p', { class: 'prov' }, `Used with ${menu.name}’s permission for this unofficial, personal-use site. ` + NOT_AFFILIATED(menu.name)));
}

function staffBox(m: Meal, menu: RestaurantMenu): HTMLElement | null {
  const f = staffFlags(m, S.profile).map(x => x.replace('dining staff', 'restaurant staff').replace('check with staff', 'ask the restaurant'));
  if (!f.length) return null;
  return h('div', { class: 'staff', role: 'note' }, h('strong', null, '⚠ Confirm with the restaurant'), h('ul', null, f.map(x => h('li', null, x))),
    h('small', null, `Recipes and suppliers can differ at the ${menu.name} on ${LOCATION_NOTE.replace(', Chapel Hill', '')}.`));
}

type BowlPart = MealPart & { component?: ComponentRole };
function bowlList(m: Meal, prefix: string): HTMLElement {
  return h('ul', { class: 'plate' }, m.parts.map((p: BowlPart) => h('li', null,
    h('button', { type: 'button', class: 'plate-row', 'data-fk': prefix + p.item.id, onClick: () => openComponent(p.item.id) },
      h('span', { class: 'plate-main' },
        h('span', { class: 'plate-name' }, p.item.name),
        h('small', null, `${p.component ? ROLE_LABELS[p.component] : p.station} · ${kcalLine(p.item, 1)}`),
        ...allergenLines(p.item),
        h('small', null, sourceBadge(p.item))),
      h('span', { class: 'chev', 'aria-hidden': 'true' }, '›')))));
}
/** Opens the component's details on the Menus page. */
function openComponent(id: string) { go(() => { S.page = 'menus'; S.menusView = 'browse'; S.openComp = id; S.search = ''; }); }

function totals(m: Meal): HTMLElement {
  const t = m.totals;
  const showFc = t.fat.complete || t.fat.min > 0 || t.carbs.complete || t.carbs.min > 0;
  return h('dl', { class: 'totals' },
    h('div', null, h('dt', null, 'Calories'), h('dd', null, tt(t.calories, 'calories'))),
    h('div', null, h('dt', null, 'Protein'), h('dd', null, tt(t.protein, 'protein'))),
    showFc ? h('div', null, h('dt', null, 'Fat · Carbs'), h('dd', null, `${tt(t.fat, 'fat')} · ${tt(t.carbs, 'carbs')}`)) : null);
}

function bowlCard(m: Meal, menu: RestaurantMenu, r: BowlResult, idx: number): HTMLElement {
  const share = async () => {
    const t = bowlText(m, menu, DISCLAIMER);
    if (typeof navigator.share === 'function') { try { await navigator.share({ text: t }); return; } catch { /* fall back to copying */ } }
    const ok = await copyText(t);
    go(() => { S.flash = ok ? 'Bowl copied as text.' : 'Copying was blocked by the browser.'; });
  };
  const report = reportIssueUrl({ hall: S.hall, date: '', period: null, placeName: `${menu.name} (${LOCATION_NOTE})`, items: m.parts.map(p => p.item), profileSummary: profileSummary(S.profile),
    checks: m.parts.map(p => ({ name: p.item.name, rows: explainChecks(p.item, S.profile) })), verdict: `Recommended bowl (${m.tier === 'confirmed' ? 'fits your rules' : 'mostly confirmed'})`, savedAt: menu.provenance.retrievedAt });
  return h('article', { class: 'meal card', 'aria-labelledby': 'meal-h' },
    h('header', { class: 'meal-head' }, h('h2', { id: 'meal-h' }, mealTitle(menu)),
      m.tier === 'confirmed' ? chip('Fits your rules', 'ok') : chip('Mostly confirmed', 'warn')),
    bowlList(m, 'part:'),
    totals(m),
    gapList(gapReadout(m.totals, S.profile.targets, null, false)),
    m.unknownNutrition.length ? h('p', { class: 'muted' }, `${menu.name} publishes no value for some numbers of ${m.unknownNutrition.join(', ')}, so “+” totals are minimums. Nothing is estimated here.`) : null,
    staffBox(m, menu),
    h('div', { class: 'meal-actions' }, h('button', { type: 'button', 'data-fk': 'share-meal', onClick: () => void share() }, 'Share')),
    h('details', { class: 'more' }, h('summary', null, 'Why it fits, ingredients and other ideas'),
      h('h3', null, 'Rule checklist'), ruleTable(mealChecklist(m, S.profile)),
      h('h3', null, 'Ingredients'),
      m.parts.map(p => h('p', { class: 'ingr' }, h('strong', null, p.item.name + ': '), p.item.ingredients ?? 'not published (treated as unknown).')),
      h('h3', null, 'Breakdown'), contributionTable(m, openComponent),
      r.meals.length > 1 ? [h('h3', null, 'All ideas'), h('ol', { class: 'notes' }, r.meals.map((x, k) => h('li', null,
        h('button', { type: 'button', class: 'tlink', 'aria-current': k === idx ? 'true' : null, onClick: () => go(() => { S.idea = k; }, `Idea ${k + 1} of ${r.meals.length}.`) },
          x.parts.map(p => p.item.name).join(' + ')), x.tier === 'confirmed' ? '' : ' (mostly confirmed)')))] : null,
      h('p', null, h('a', { href: report, target: '_blank', rel: 'noopener noreferrer' }, 'Report a wrong result'), h('small', null, ' (opens a prefilled GitHub issue; nothing is sent unless you submit it)'))));
}

function presetsCard(menu: RestaurantMenu, r: BowlResult): HTMLElement | null {
  if (!menu.presets.length) return null;
  return h('section', { class: 'card side', 'aria-labelledby': 'presets-h' },
    h('h2', { id: 'presets-h' }, `${menu.name}’s published bowls that fit`),
    r.presets.length ? h('ul', { class: 'cmp' }, r.presets.map(x => h('li', null,
      h('div', { class: 'cmp-head' }, h('strong', null, x.preset.name), x.meal.tier === 'confirmed' ? chip('Fits', 'ok') : chip('Mostly confirmed', 'warn')),
      h('p', null, x.meal.parts.map(p => p.item.name).join(' + ')),
      h('small', null, `${tt(x.meal.totals.calories, 'calories')} · ${tt(x.meal.totals.protein, 'protein')} protein · ${x.publishedTotals ? `${menu.name}’s published totals` : 'sum of published components'}`))))
      : h('p', null, 'None of them fit your rules.'),
    r.presetsExcluded && r.presets.length ? h('p', { class: 'muted' }, `${r.presetsExcluded} other published bowl${r.presetsExcluded > 1 ? 's' : ''} ${r.presetsExcluded > 1 ? 'do' : 'does'} not fit your rules.`) : null);
}

export function restaurantToday(id: RestaurantId): HTMLElement {
  const v = h('div', { class: 'page today' });
  const menu = menuFor(id);
  const dishMenu = !!menu && !menu.components.some(c => c.role === 'base');
  v.appendChild(h('div', { class: 'page-head' }, h('h1', { id: 'page-h', tabindex: '-1' }, menu ? mealTitle(menu) : `${RESTAURANT_NAMES[id]}`),
    h('p', { class: 'lede' }, dishMenu
      ? `One of ${RESTAURANT_NAMES[id]}’s published menu items that fits your rules. ${RESTAURANT_NAMES[id]}’s nutrition page lists finished menu items, not custom-bowl ingredients, so custom bowls aren’t covered.`
      : `A build-your-own bowl from ${RESTAURANT_NAMES[id]}’s published components that fits your rules.`)));
  v.appendChild(placeBar(id, menu));
  if (!menu) { v.appendChild(pendingCard(id)); return v; }
  const r = buildBowls(menu, S.profile);
  const main = h('div', { class: 'main-col stack', 'aria-live': 'polite' });
  const cc = crossContactBox(menu);
  if (cc) main.appendChild(cc);
  if (r.noMeal) {
    main.appendChild(h('div', { class: 'banner bad', role: 'status' }, r.banner ?? 'No bowl fits your rules.'));
    main.appendChild(h('div', { class: 'card' }, h('h2', null, 'No meal fits'),
      h('p', null, 'Nothing here passes all of your rules, and they were not loosened.' + (menu.crossContact.some(c => c.allergens.length >= 9) && (S.profile.allergens.length || S.profile.avoidGluten || S.profile.avoidDairy || S.profile.avoidEgg) ? ` ${menu.name} says cross-contamination may occur with any allergen, so no item can be confirmed free of yours.` : '')),
      h('a', { class: 'btn primary', href: href('menus') }, `See everything on the ${menu.name} menu`)));
  } else {
    const n = r.meals.length, i = S.idea % n;
    main.appendChild(h('div', { class: 'actions idea-nav' },
      n > 1 ? h('button', { type: 'button', 'aria-label': 'Previous idea', 'data-fk': 'idea-prev', onClick: () => go(() => { S.idea = (i - 1 + n) % n; }, `Idea ${((i - 1 + n) % n) + 1} of ${n}.`) }, '‹ Back') : null,
      h('button', { class: 'grow', type: 'button', disabled: n < 2, 'data-fk': 'idea-next', onClick: () => go(() => { S.idea = (i + 1) % n; }, `Idea ${((i + 1) % n) + 1} of ${n}.`) }, n < 2 ? 'Only idea' : `Another idea (${i + 1} of ${n})`)));
    main.appendChild(bowlCard(r.meals[i], menu, r, i));
  }
  const side = h('aside', { class: 'side-col', 'aria-label': 'More for this place' },
    presetsCard(menu, r),
    h('section', { class: 'card side', 'aria-labelledby': 'rules-h' }, h('h2', { id: 'rules-h' }, S.profiles.length > 1 ? `Rules: ${activeName()}` : 'Your rules'),
      h('p', null, profileSummary(S.profile)), h('a', { href: href('me', { section: 'diet' }) }, 'Change rules')),
    provenance(menu));
  v.appendChild(h('div', { class: 'cols' }, main, side));
  return v;
}

/** Menus page for a restaurant: every published component by role, each with its evidence. */
export function restaurantMenus(id: RestaurantId): HTMLElement {
  const v = h('div', { class: 'stack' });
  const menu = menuFor(id);
  v.appendChild(placeBar(id, menu));
  if (!menu) { v.appendChild(pendingCard(id)); return v; }
  const cc = crossContactBox(menu);
  if (cc) v.appendChild(cc);
  const list = h('div', { class: 'items' });
  const count = h('p', { class: 'muted', role: 'status' });
  const draw = () => {
    clear(list);
    const term = S.search.trim().toLowerCase();
    let shown = 0;
    const groups: Array<{ title: string; comps: RestaurantMenu['components'] }> = [];
    for (const role of ROLES) {
      const cs = menu.components.filter(c => c.role === role);
      if (role === 'dish' || cs.some(c => c.category)) {
        for (const cat of [...new Set(cs.map(c => c.category ?? ROLE_PLURAL[role]))]) groups.push({ title: cat, comps: cs.filter(c => (c.category ?? ROLE_PLURAL[role]) === cat) });
      } else groups.push({ title: ROLE_PLURAL[role], comps: cs });
    }
    for (const g of groups) {
      const rows = g.comps.map(c => ({ c, status: evaluateItem(c.item, S.profile).status }))
        .filter(x => (!term || x.c.item.name.toLowerCase().includes(term) || (x.c.item.ingredients ?? '').toLowerCase().includes(term)) && (!S.hideNonFits || x.status !== 'excluded' || x.c.item.id === S.openComp));
      if (!rows.length) continue;
      shown += rows.length;
      list.appendChild(h('section', { class: 'station-group' }, h('h2', { class: 'station' }, g.title), h('ul', { class: 'list' }, rows.map(({ c, status }) =>
        h('li', null, h('details', { class: 'comp', id: 'comp-' + c.item.id.replace(/[^a-z0-9-]/g, '-'), ...(S.openComp === c.item.id ? { open: true } : {}) },
          h('summary', { class: 'item-row', 'data-fk': 'item:' + c.item.id },
            h('span', { class: 'item-main' }, h('span', { class: 'item-name' }, c.item.name), h('small', null, (c.serving ? c.serving + ' · ' : '') + kcalLine(c.item, 1))),
            status === 'match' ? chip('Fits', 'ok') : status === 'excluded' ? chip('Not for you', 'bad') : chip('Unsure', 'warn')),
          h('div', { class: 'comp-body' },
            nutritionGrid(c.item), h('p', null, sourceBadge(c.item)),
            ...allergenLines(c.item),
            !c.item.allergensUnknown && !c.item.allergens.length && !c.item.otherAllergens?.length ? h('p', null, `${menu.name} declares no major allergens for it.`) : null,
            h('p', { class: 'ingr' }, h('strong', null, 'Ingredients: '), c.item.ingredients ?? 'not published (treated as unknown).'),
            h('p', { class: 'ingr' }, h('strong', null, `${menu.name} labels: `), [c.item.labels.vegan ? 'vegan' : '', c.item.labels.vegetarian ? 'vegetarian' : '', c.item.labels.madeWithoutGluten ? 'gluten-free' : ''].filter(Boolean).join(', ') || 'none published'),
            c.extra ? h('p', { class: 'ingr' }, `Extra serving (as published): ${kcalLine(c.extra.item, 1)}${c.extra.kind === 'total' ? ' for the whole double serving' : ' added'}.`) : null,
            c.item.warnings.map(w => h('p', { class: 'muted' }, w)),
            h('h3', null, 'Your rules'), checkList(explainChecks(c.item, S.profile)))))))));
    }
    count.textContent = `Showing ${shown} of ${menu.components.length} ${menu.components.some(c => c.role === 'base') ? 'components' : 'menu items'}`;
    if (!shown) list.appendChild(h('p', { class: 'muted' }, 'Nothing matches these filters.'));
  };
  const q = h('input', { type: 'search', id: 'item-search', placeholder: 'e.g. chicken, rice', value: S.search });
  q.addEventListener('input', () => { S.search = q.value; draw(); });
  draw();
  const filters = h('form', { class: 'filters card', role: 'search', 'aria-label': 'Filter the menu', onSubmit: (e: Event) => e.preventDefault() },
    h('label', { class: 'field', for: 'item-search' }, 'Search components or ingredients', q),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'only-fits', checked: S.hideNonFits, onChange: (e: Event) => go(() => { S.hideNonFits = (e.target as HTMLInputElement).checked; }) }), ' Only show what fits me'),
    h('p', { class: 'muted' }, 'Fits = passes every rule. Unsure = a diet rule couldn’t be confirmed. Not for you = fails a rule. A “may contain” statement counts as not confirmed, so strict avoids exclude it.'));
  v.appendChild(h('div', { class: 'cols menus-cols' }, h('div', { class: 'filter-col' }, filters), h('div', { class: 'main-col' }, count, list, provenance(menu))));
  if (S.openComp) { const oc = S.openComp; S.openComp = null; queueMicrotask(() => document.getElementById('comp-' + oc.replace(/[^a-z0-9-]/g, '-'))?.scrollIntoView({ block: 'center' })); }
  return v;
}

