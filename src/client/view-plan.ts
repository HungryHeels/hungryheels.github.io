import { h } from './dom.ts';
import { S, dayFor, saveHistory, saveProfile, saveSaved } from './state.ts';
import { go } from './nav.ts';
import { chip, disclaimerBlock, numField } from './ui.ts';
import { gapList } from './views.ts';
import { dateBar, hallSwitch, openItem, recent, staffBox } from './view-menu.ts';
import { compareHalls, liveText, rankHalls } from '../core/discover.ts';
import { planDay, recheckSaved, totalText, type DayPlan } from '../core/plan.ts';
import { HALL_NAMES, type HallId } from '../core/types.ts';
import { addDays, formatDate, nyNow } from '../core/schedule.ts';

function bestNow(): HTMLElement {
  const now = nyNow();
  const halls: HallId[] = ['chase', 'top-of-lenoir'];
  const isToday = S.date === now.date;
  const picks = rankHalls(compareHalls(halls.map(hall => ({ hall, today: dayFor(hall, S.date), yesterday: dayFor(hall, addDays(S.date, -1)) })), isToday ? null : S.period, S.profile,
    isToday ? now : { date: '0000-00-00', minutes: 0 }, { recentMains: recent() }));
  return h('section', { class: 'panel', 'aria-labelledby': 'best-h' },
    h('h2', { id: 'best-h' }, isToday ? 'Best fit right now' : `Compare halls · ${formatDate(S.date)}`),
    h('p', { class: 'muted' }, isToday ? 'Each hall’s meal that is serving now (or next), ranked by how well its best idea fits you. Hours come from the saved pages.' : `Each hall’s ${S.period ?? 'meal'} on this day, best fit first.`),
    h('ol', { class: 'cmp' }, picks.map((p, i) => h('li', null,
      h('div', { class: 'cmp-head' }, h('strong', null, `${i + 1}. ${HALL_NAMES[p.hall]}`), p.period ? h('span', null, ` · ${p.period}`) : null,
        p.best ? (p.best.tier === 'confirmed' ? chip('Fits', 'ok') : chip('Mostly confirmed', 'warn')) : chip('No meal', 'bad')),
      p.live && isToday ? h('small', null, liveText(p.live)) : null,
      p.best ? [
        h('p', null, p.best.parts.map(x => x.item.name + (x.portions > 1 ? ` ×${x.portions}` : '')).join(' + ')),
        h('small', null, `${totalText(p.best.totals.calories, 'calories')} · ${totalText(p.best.totals.protein, 'protein')} protein${p.result?.fallback ? ' · ' + (p.result.banner ?? '') : ''}`),
        h('div', null, h('button', { type: 'button', 'data-fk': 'cmp-open:' + p.hall, onClick: () => go(() => { S.hall = p.hall; S.period = p.result?.period ?? p.period; S.idea = 0; S.tab = 'menu'; S.menuTab = 'meal'; }, `Showing ${HALL_NAMES[p.hall]}.`) }, 'Open this meal')),
      ] : h('small', null, p.why)))));
}

function planner(): HTMLElement {
  const p = S.profile;
  const daily = p.daily ?? {};
  const day = dayFor(S.planHall, S.date);
  const set = (k: 'calories' | 'protein' | 'fat' | 'carbs') => (n: number | undefined) => go(() => { S.profile.daily = { ...(S.profile.daily ?? {}), [k]: n || undefined }; saveProfile(); });
  const sec = h('section', { class: 'panel', 'aria-labelledby': 'plan-h' }, h('h2', { id: 'plan-h' }, 'Plan my day'),
    h('p', { class: 'muted' }, 'Breakfast, lunch and dinner at one hall against whole-day targets. Same diet rules as single meals; only known values count, and unknown parts show as minimums.'),
    hallSwitch(S.planHall, hl => { S.planHall = hl; }, 'Hall for the day plan'),
    h('details', { class: 'limits', open: !Object.values(daily).some(Boolean) }, h('summary', null, 'Daily targets'),
      h('div', { class: 'grid2' },
        numField('Calories per day', daily.calories, set('calories'), 'e.g. 2200', 'd-cal'), numField('Protein per day (g)', daily.protein, set('protein'), 'e.g. 120', 'd-pro'),
        numField('Fat per day (g)', daily.fat, set('fat'), 'e.g. 70', 'd-fat'), numField('Carbs per day (g)', daily.carbs, set('carbs'), 'e.g. 250', 'd-carb'))));
  if (!day || day.noMenuPosted) { sec.appendChild(h('p', { class: 'banner warn' }, `No menu saved for ${HALL_NAMES[S.planHall]} on ${formatDate(S.date)}.`)); return sec; }
  const plan: DayPlan = planDay(day, p, daily, { recentMains: recent() });
  if (p.allergens.length) sec.appendChild(h('p', { class: 'staff', role: 'note' }, h('strong', null, '⚠ Confirm with staff. '), 'You have an allergy set. Menus and recipes can change, so confirm with dining staff before eating.'));
  for (const n of plan.notes) sec.appendChild(h('p', { class: 'banner warn', role: 'status' }, n));
  sec.appendChild(h('ol', { class: 'dayplan' }, plan.slots.map(s => h('li', null,
    h('h3', null, (s.result.period ?? s.period) === s.slot ? s.slot : `${s.slot} · ${s.result.period ?? s.period}`),
    s.meal ? [
      h('ul', { class: 'mini' }, s.meal.parts.map(x => h('li', null, h('button', { type: 'button', class: 'tlink', 'data-fk': 'plan:' + x.item.id, onClick: () => openItem(day, 'plan:')(x.item.id) }, x.item.name + (x.portions > 1 ? ` ×${x.portions}` : ''))))),
      h('small', null, `${totalText(s.meal.totals.calories, 'calories')} · ${totalText(s.meal.totals.protein, 'protein')} protein · ${s.meal.tier === 'confirmed' ? '✓ fits' : '△ mostly confirmed'}`),
      staffBox(s.meal, true),
    ] : h('p', { class: 'muted' }, 'Nothing fits your rules for this meal.')))));
  sec.appendChild(h('div', { class: 'total-row' },
    h('div', null, h('small', null, 'Day calories'), h('strong', null, totalText(plan.totals.calories, 'calories'))),
    h('div', null, h('small', null, 'Day protein'), h('strong', null, totalText(plan.totals.protein, 'protein'))),
    h('div', null, h('small', null, 'Fat · Carbs'), h('strong', null, `${totalText(plan.totals.fat, 'fat')} · ${totalText(plan.totals.carbs, 'carbs')}`))));
  const g = gapList(plan.gaps); if (g) sec.appendChild(g);
  return sec;
}

function savedList(): HTMLElement {
  const sec = h('section', { class: 'panel', 'aria-labelledby': 'saved-h' }, h('h2', { id: 'saved-h' }, `Saved meals (${S.saved.length})`));
  if (!S.saved.length) { sec.appendChild(h('p', { class: 'muted' }, 'Tap ☆ Save on a meal to keep it here. Saved meals are re-checked against your current rules every time.')); return sec; }
  sec.appendChild(h('ul', { class: 'saved' }, S.saved.map(s => {
    const day = dayFor(s.hall, s.date);
    const chk = recheckSaved(s, day, S.profile);
    return h('li', null,
      h('div', { class: 'cmp-head' }, h('strong', null, `${s.period} · ${HALL_NAMES[s.hall]} · ${formatDate(s.date)}`), chk.ok ? (chk.notes.length ? chip('Mostly confirmed', 'warn') : chip('Still fits', 'ok')) : chip('No longer fits', 'bad')),
      h('p', null, s.parts.map(x => x.name + (x.portions > 1 ? ` ×${x.portions}` : '')).join(' + ')),
      chk.problems.length ? h('ul', { class: 'notes' }, chk.problems.map(x => h('li', null, x))) : null,
      h('div', { class: 'actions' },
        chk.ok ? h('button', { type: 'button', onClick: () => go(() => { S.hall = s.hall; S.date = s.date; S.period = s.period; S.idea = 0; S.tab = 'menu'; S.menuTab = 'meal'; }) }, 'Open day') : null,
        h('button', { type: 'button', class: 'danger', 'aria-label': `Remove saved meal ${s.parts[0]?.name ?? ''}`, onClick: () => go(() => { S.saved = S.saved.filter(x => x !== s); saveSaved(); }, 'Removed.') }, 'Remove')));
  })));
  return sec;
}

function historyList(): HTMLElement {
  const sec = h('section', { class: 'panel', 'aria-labelledby': 'hist-h' }, h('h2', { id: 'hist-h' }, 'What you’ve had'));
  if (!S.history.length) { sec.appendChild(h('p', { class: 'muted' }, 'Tap “I’ll have this” on a meal to log it. Mains you had in the last 7 days are suggested a little later, for variety. Stored only in this browser.')); return sec; }
  sec.appendChild(h('ul', { class: 'notes' }, S.history.slice(0, 20).map(x => h('li', null, `${formatDate(x.date)} · ${x.period} · ${HALL_NAMES[x.hall]}: ${x.items.join(' + ')}`))));
  sec.appendChild(h('button', { type: 'button', class: 'danger', onClick: () => go(() => { S.history = []; saveHistory(); }, 'History cleared.') }, 'Clear history'));
  return sec;
}

export function planView(): HTMLElement {
  const v = h('div', { class: 'view' });
  v.appendChild(dateBar(dayFor(S.hall, S.date)));
  if (S.loading) { v.appendChild(h('p', { class: 'muted', role: 'status' }, 'Loading menus…')); return v; }
  v.append(bestNow(), planner(), savedList(), historyList(), disclaimerBlock());
  return v;
}
