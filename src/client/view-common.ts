// Pieces shared by the Today and Menus pages: the hall / date / meal picker, the first-run question and helpers.
import { h } from './dom.ts';
import { S, dayFor, firstDate, lastDate, nextDateWithData, setPattern } from './state.ts';
import { go } from './nav.ts';
import { routeHash, type Page, type Route } from './router.ts';
import { liveState, liveText, recentMains, type HistoryEntry } from '../core/discover.ts';
import { staleness } from '../core/refresh.ts';
import { PATTERN_DEFINITIONS, PATTERN_LABELS, type PatternId } from '../core/profile.ts';
import { HALL_NAMES, type HallId, type MenuDay } from '../core/types.ts';
import { addDays, defaultPeriod, formatDate, nyNow } from '../core/schedule.ts';

export function currentDay(): MenuDay | null { return dayFor(S.hall, S.date); }
export function ensurePeriod(day: MenuDay | null) {
  if (!day || day.noMenuPosted || !day.periods.length) { S.period = null; return; }
  if (!S.period || !day.periods.some(p => p.name === S.period)) S.period = defaultPeriod(day, nyNow());
}
/** Address of a page, keeping the hall, date and meal you are looking at. */
export function href(page: Page, extra: Partial<Route> = {}): string {
  return routeHash({ page, hall: S.hall, date: S.date, period: S.period ?? undefined, ...extra });
}
export const openItem = (day: MenuDay, from: string) => (id: string) => go(() => { S.sheet = { item: id, dayKey: `${day.hall}:${day.date}`, opener: from + id }; });
/** Saved meals double as "what I plan to eat": their mains are suggested a little later for a week, for variety. */
export const recent = () => recentMains(S.saved.map((s): HistoryEntry => ({ date: s.date, hall: s.hall, period: s.period, main: s.parts[0]?.name ?? '', items: [], at: s.savedAt })), S.date);

export function quiz(): HTMLElement {
  const picks: PatternId[] = ['vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];
  const choose = (p: PatternId) => go(() => { setPattern(p); }, `${PATTERN_LABELS[p]} saved. Showing a meal.`);
  return h('section', { class: 'quiz card', 'aria-labelledby': 'quiz-h' },
    h('h2', { id: 'quiz-h', tabindex: '-1' }, 'What do you eat?'),
    h('p', { class: 'muted' }, 'Pick one to see a meal from today’s menu. Add allergies and goals any time on the Me page.'),
    h('div', { class: 'quiz-grid' }, picks.map(p => h('button', { class: 'big', type: 'button', onClick: () => choose(p) }, PATTERN_LABELS[p])),
      h('button', { class: 'big quiet', type: 'button', onClick: () => choose('none') }, 'No specific diet')),
    h('details', { class: 'more' }, h('summary', null, 'What do these mean?'),
      h('dl', { class: 'defs' }, picks.flatMap(p => [h('dt', null, PATTERN_LABELS[p]), h('dd', null, PATTERN_DEFINITIONS[p])]))));
}

function hallSwitch(): HTMLElement {
  return h('div', { class: 'seg', role: 'group', 'aria-label': 'Dining hall' }, (['chase', 'top-of-lenoir'] as HallId[]).map(hl =>
    h('button', { type: 'button', 'aria-pressed': S.hall === hl, class: S.hall === hl ? 'on' : '', 'data-fk': 'hall:' + hl,
      onClick: () => go(() => { S.hall = hl; S.period = null; S.idea = 0; }, `${HALL_NAMES[hl]} selected.`) }, HALL_NAMES[hl])));
}
function dateControl(day: MenuDay | null): HTMLElement {
  const set = (d: string) => go(() => { S.date = d; S.period = null; S.idea = 0; }, `Showing ${formatDate(d)}.`);
  const st = day ? staleness(day) : null;
  const today = nyNow().date;
  const input = h('input', { type: 'date', id: 'date-pick', value: S.date, min: firstDate(), max: lastDate(), 'aria-label': 'Date',
    onChange: (e: Event) => { const v = (e.target as HTMLInputElement).value; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) set(v); } });
  return h('div', { class: 'datectl' },
    h('div', { class: 'datebar' },
      h('button', { type: 'button', 'aria-label': 'Previous day', 'data-fk': 'date-prev', disabled: S.date <= firstDate(), onClick: () => set(addDays(S.date, -1)) }, '‹'),
      h('label', { class: 'date-mid', for: 'date-pick' }, h('strong', null, formatDate(S.date) + (S.date === today ? ' · today' : '')), input),
      h('button', { type: 'button', 'aria-label': 'Next day', 'data-fk': 'date-next', disabled: S.date >= lastDate(), onClick: () => set(addDays(S.date, 1)) }, '›')),
    h('small', { class: 'saved-at' + (st?.stale ? ' stale' : '') }, !day ? 'No saved page for this day' : st!.stale ? '△ ' + st!.text : st!.text));
}
function periodPills(day: MenuDay): HTMLElement {
  const now = nyNow();
  const ls = day.date === now.date ? liveState(day, dayFor(day.hall, addDays(day.date, -1)), now) : null;
  const liveName = ls?.state === 'serving' && ls.date === day.date ? ls.period.name : null;
  return h('div', { class: 'pills', role: 'group', 'aria-label': 'Meal' }, day.periods.map(p =>
    h('button', { type: 'button', class: 'pill' + (p.name === S.period ? ' on' : ''), 'aria-pressed': p.name === S.period, 'data-fk': 'period:' + p.name, onClick: () => go(() => { S.period = p.name; S.idea = 0; }, `${p.name} selected.`) },
      h('span', null, p.name, p.name === liveName ? h('span', { class: 'now' }, ' ● now') : null), h('small', null, p.hours ?? 'hours unverified'))));
}

/** Hall, date and meal in one bar. Returns the day (or null) so the page can decide what to show. */
export function pickerBar(): { el: HTMLElement; day: MenuDay | null } {
  const day = currentDay();
  ensurePeriod(day);
  const now = nyNow();
  const live = day && day.date === now.date ? liveText(liveState(day, dayFor(day.hall, addDays(day.date, -1)), now)) : null;
  const el = h('section', { class: 'picker', 'aria-label': 'Hall, date and meal' },
    h('div', { class: 'picker-row' }, hallSwitch(), dateControl(day)),
    day && !day.noMenuPosted ? periodPills(day) : null,
    live ? h('p', { class: 'serving' }, live) : null);
  return { el, day };
}

export function noMenuNotice(day: MenuDay | null): HTMLElement {
  const nxt = nextDateWithData(S.hall, S.date);
  return h('div', { class: 'banner warn', role: 'status' },
    h('p', null, !day ? `No menu saved for ${HALL_NAMES[S.hall]} on ${formatDate(S.date)}.` : `No menu was posted when this page was saved (${formatDate(day.date)}). It may be a break day.`),
    h('div', { class: 'actions' },
      nxt ? h('button', { type: 'button', class: 'primary', onClick: () => go(() => { S.date = nxt; S.period = null; S.idea = 0; }) }, `Go to ${formatDate(nxt)}`) : null,
      h('a', { class: 'btn', href: href('menus', { view: 'update' }) }, 'Add a saved page')));
}
