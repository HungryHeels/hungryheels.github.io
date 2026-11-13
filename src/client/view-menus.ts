// Menus: the full menu for a hall, day and meal, with filters; and "Update menus" for importing saved pages.
import { h, clear } from './dom.ts';
import { S } from './state.ts';
import { go } from './nav.ts';
import { chip, kcalLine, provenanceLine, useEst } from './ui.ts';
import { effective } from '../core/estimate.ts';
import { dataSection } from './view-data.ts';
import { restaurantMenus } from './view-restaurant.ts';
import { PLACE_NAMES, isRestaurant } from '../core/restaurant.ts';
import { href, noMenuNotice, openItem, pickerBar } from './view-common.ts';
import { campus, sprite } from './mascot.ts';
import { keywordSprite } from './art.ts';
import { evaluateItem } from '../core/engine.ts';
import { nutritionBadge } from '../sources/nutrition-import.ts';
import type { MenuDay, MenuItem } from '../core/types.ts';

const kcal = (it: MenuItem) => kcalLine(it, 1);

function browse(day: MenuDay): HTMLElement {
  const period = day.periods.find(p => p.name === S.period);
  if (!period) return h('div');
  const list = h('div', { class: 'items' });
  const count = h('p', { class: 'muted', role: 'status' });
  const stations = period.stations.map(s => s.name);
  if (S.station && !stations.includes(S.station)) S.station = '';
  const draw = () => {
    clear(list);
    const term = S.search.trim().toLowerCase();
    type Row = { it: MenuItem; st: string; status: string };
    const rows: Row[] = []; const seen = new Set<string>(); let total = 0;
    for (const st of period.stations) for (const id of st.itemIds) {
      const it = day.items[id]; if (!it || seen.has(id)) continue; seen.add(id); total++;
      if (S.station && st.name !== S.station) continue;
      if (term && !it.name.toLowerCase().includes(term) && !(it.ingredients ?? '').toLowerCase().includes(term)) continue;
      const status = evaluateItem(it, S.profile).status;
      if (S.hideNonFits && status === 'excluded') continue;
      rows.push({ it, st: st.name, status });
    }
    const nv = (it: MenuItem, k: 'protein' | 'calories', d: number) => effective(it, k, useEst()).value ?? d;
    if (S.sortBy === 'protein') rows.sort((a, b) => nv(b.it, 'protein', -1) - nv(a.it, 'protein', -1));
    if (S.sortBy === 'calories') rows.sort((a, b) => nv(a.it, 'calories', 1e9) - nv(b.it, 'calories', 1e9));
    if (S.sortBy === 'name') rows.sort((a, b) => a.it.name.localeCompare(b.it.name));
    count.textContent = `Showing ${rows.length} of ${total} items`;
    const rowEl = (r: Row) => h('li', null, h('button', { type: 'button', class: 'item-row', 'data-fk': 'item:' + r.it.id, onClick: () => openItem(day, 'item:')(r.it.id) },
      h('span', { class: 'item-main' }, h('span', { class: 'item-name' }, r.it.name),
        h('small', null, (S.sortBy !== 'station' ? r.st + ' · ' : '') + kcal(r.it) + (r.it.nutrition.source ? ` · ${nutritionBadge(r.it.nutrition, useEst()).text}` : ''))),
      r.status === 'match' ? chip('Fits', 'ok') : r.status === 'excluded' ? chip('Not for you', 'bad') : chip('Unsure', 'warn')));
    if (S.sortBy === 'station') {
      const groups = new Map<string, Row[]>();
      for (const r of rows) (groups.get(r.st) ?? groups.set(r.st, []).get(r.st)!).push(r);
      for (const [st, rs] of groups) {
        const g = keywordSprite(st);   // a picture only when the station name clearly names the food
        list.appendChild(h('section', { class: 'station-group' }, h('h2', { class: 'station' }, g ? sprite(g, 'glyph glyph-sm') : null, st), h('ul', { class: 'list' }, rs.map(rowEl))));
      }
    } else if (rows.length) list.appendChild(h('ul', { class: 'list' }, rows.map(rowEl)));
    if (!rows.length) list.appendChild(h('div', { class: 'empty-list' }, sprite('plate', 'glyph glyph-lg'), h('p', { class: 'muted' }, 'Nothing matches these filters.')));
  };
  const q = h('input', { type: 'search', id: 'item-search', placeholder: 'e.g. tofu, chicken, rice', value: S.search });
  q.addEventListener('input', () => { S.search = q.value; draw(); });
  draw();
  const wide = typeof window !== 'undefined' && window.innerWidth >= 960;
  const active = [S.station ? 1 : 0, S.sortBy !== 'station' ? 1 : 0, S.hideNonFits ? 0 : 1].reduce((x, y) => x + y, 0);
  const filters = h('form', { class: 'filters card', role: 'search', 'aria-label': 'Filter the menu', onSubmit: (e: Event) => e.preventDefault() },
    h('label', { class: 'field', for: 'item-search' }, 'Search items or ingredients', q),
    h('details', { class: 'filter-more', ...(wide ? { open: true } : {}) }, h('summary', null, active ? `Filters (${active} on)` : 'Filters'),
      h('div', { class: 'filters' },
        h('label', { class: 'field', for: 'station-pick' }, 'Station',
          h('select', { id: 'station-pick', onChange: (e: Event) => go(() => { S.station = (e.target as HTMLSelectElement).value; }) },
            h('option', { value: '' }, `All stations (${stations.length})`), stations.map(st => h('option', { value: st, ...(S.station === st ? { selected: true } : {}) }, st)))),
        h('label', { class: 'field', for: 'sort-pick' }, 'Sort',
          h('select', { id: 'sort-pick', onChange: (e: Event) => go(() => { S.sortBy = (e.target as HTMLSelectElement).value as typeof S.sortBy; }) },
            ([['station', 'By station'], ['protein', 'Most protein'], ['calories', 'Fewest calories'], ['name', 'A to Z']] as const).map(([v, l]) => h('option', { value: v, ...(S.sortBy === v ? { selected: true } : {}) }, l)))),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'only-fits', checked: S.hideNonFits, onChange: (e: Event) => go(() => { S.hideNonFits = (e.target as HTMLInputElement).checked; }) }), ' Only show what fits me'),
        h('p', { class: 'muted' }, 'Fits = passes every rule. Unsure = a diet rule couldn’t be confirmed. Not for you = fails a rule. ', h('a', { href: href('me', { section: 'diet' }) }, 'Your rules')))));
  return h('div', { class: 'cols menus-cols' }, h('div', { class: 'filter-col' }, filters), h('div', { class: 'main-col' }, count, list, provenanceLine(day)));
}

export function menusView(): HTMLElement {
  const v = h('div', { class: 'page menus' });
  v.appendChild(h('div', { class: 'page-head' }, h('h1', { id: 'page-h', tabindex: '-1' }, campus('library'), 'Menus'),
    h('p', { class: 'lede' }, S.menusView === 'update'
      ? 'Add menu pages you saved in Safari, see what changed, and check which days still need saving.'
      : isRestaurant(S.place) ? `Everything ${PLACE_NAMES[S.place]} publishes, checked against your rules. Open an item for ingredients, allergens and why.`
      : 'Every item on the saved menu, checked against your rules. Tap an item for ingredients, allergens and why.')));
  v.appendChild(h('nav', { class: 'subnav', 'aria-label': 'Menus' },
    h('a', { href: href('menus'), 'aria-current': S.menusView === 'browse' ? 'page' : null }, 'Browse'),
    h('a', { href: href('menus', { view: 'update' }), 'aria-current': S.menusView === 'update' ? 'page' : null }, 'Update menus')));
  if (S.loading) { v.appendChild(h('p', { class: 'muted', role: 'status' }, 'Loading menus…')); return v; }
  if (S.menusView === 'update') { v.appendChild(dataSection()); return v; }
  if (isRestaurant(S.place)) { v.appendChild(restaurantMenus(S.place)); return v; }
  const { el, day } = pickerBar();
  v.appendChild(el);
  if (!day || day.noMenuPosted) { v.appendChild(noMenuNotice(day)); return v; }
  v.appendChild(browse(day));
  return v;
}
