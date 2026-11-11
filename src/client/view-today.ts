// Today: the one meal that fits you, with the other hall and a whole-day plan beside it.
import { h } from './dom.ts';
import { S, activeName, dayFor, saveSaved } from './state.ts';
import { go } from './nav.ts';
import { chip, copyText, DISCLAIMER, provenanceLine, sourceBadge } from './ui.ts';
import { contributionTable, gapList, ideasTable, profileSummary, ruleTable } from './views.ts';
import { href, noMenuNotice, openItem, pickerBar, recent } from './view-common.ts';
import { landingView } from './view-landing.ts';
import { buildMeals, type BuildResult, type Meal } from '../core/meals.ts';
import { explainChecks } from '../core/engine.ts';
import { gapReadout, hitsTargets, planDay, toSaved, totalText } from '../core/plan.ts';
import { mealChecklist, reportIssueUrl, staffFlags } from '../core/trust.ts';
import { compareHalls, plateText, rankHalls } from '../core/discover.ts';
import { HALL_NAMES, type MenuDay, type MenuItem } from '../core/types.ts';
import { addDays, formatDate, nyNow } from '../core/schedule.ts';

const kcalLine = (it: MenuItem, k: number) => {
  const n = it.nutrition;
  if (n.calories === null && n.protein === null) return 'nutrition unknown';
  return [n.calories !== null ? `${Math.round(n.calories * k)} kcal` : 'kcal unknown', n.protein !== null ? `${Math.round(n.protein * k)} g protein` : 'protein unknown'].join(' · ');
};
const savedId = (m: Meal, day: MenuDay) => `${day.hall}:${day.date}:${m.id}`;

export function staffBox(m: Meal, skipGeneral = false): HTMLElement | null {
  const f = staffFlags(m, S.profile).filter(x => !skipGeneral || !/^You have (an allergy|strict avoids) set/.test(x));
  if (!f.length) return null;
  return h('div', { class: 'staff', role: 'note' }, h('strong', null, '⚠ Confirm with staff'), h('ul', null, f.map(x => h('li', null, x))));
}

function mealCard(m: Meal, day: MenuDay, r: BuildResult, idx: number): HTMLElement {
  const open = openItem(day, 'part:');
  const roleOf = (p: Meal['parts'][number]) => (m.simplified === 'animal_plate' ? 'Animal food' : p.role === 'main' ? 'Main' : 'Side');
  const saved = S.saved.some(s => s.id === savedId(m, day));
  const share = async () => {
    const t = plateText(m, day, S.profile, DISCLAIMER);
    if (typeof navigator.share === 'function') { try { await navigator.share({ text: t }); return; } catch { /* cancelled: fall back to copying */ } }
    const ok = await copyText(t);
    go(() => { S.flash = ok ? 'Meal copied as text.' : 'Copying was blocked by the browser.'; });
  };
  const report = reportIssueUrl({ hall: day.hall, date: day.date, period: m.period, items: m.parts.map(p => p.item), profileSummary: profileSummary(S.profile),
    checks: m.parts.map(p => ({ name: p.item.name, rows: explainChecks(p.item, S.profile) })), verdict: `Recommended (${m.tier === 'confirmed' ? 'fits your rules' : 'mostly confirmed'})`, savedAt: day.provenance.retrievedAt });
  return h('article', { class: 'meal card', 'aria-labelledby': 'meal-h' },
    h('header', { class: 'meal-head' }, h('h2', { id: 'meal-h' }, `${m.period} at ${HALL_NAMES[day.hall]}`),
      m.tier === 'confirmed' ? chip('Fits your rules', 'ok') : chip('Mostly confirmed', 'warn')),
    h('ul', { class: 'plate' }, m.parts.map(p => h('li', null,
      h('button', { type: 'button', class: 'plate-row', 'data-fk': 'part:' + p.item.id, onClick: () => open(p.item.id) },
        h('span', { class: 'plate-main' },
          h('span', { class: 'plate-name' }, p.item.name, p.portions > 1 ? h('span', { class: 'badge' }, `${p.portions}×`) : null),
          h('small', null, `${roleOf(p)} · ${p.station} · ${kcalLine(p.item, p.portions)}`),
          h('small', null, sourceBadge(p.item), p.item.allergens.length ? h('span', { class: 'plate-allergen' }, ' · Contains ' + p.item.allergens.map(a => a.replace('_', ' ')).join(', ')) : null)),
        h('span', { class: 'chev', 'aria-hidden': 'true' }, '›'))))),
    h('dl', { class: 'totals' },
      h('div', null, h('dt', null, 'Calories'), h('dd', null, totalText(m.totals.calories, 'calories'))),
      h('div', null, h('dt', null, 'Protein'), h('dd', null, totalText(m.totals.protein, 'protein'))),
      S.profile.targets.fat || S.profile.targets.carbs ? h('div', null, h('dt', null, 'Fat · Carbs'), h('dd', null, `${totalText(m.totals.fat, 'fat')} · ${totalText(m.totals.carbs, 'carbs')}`)) : null),
    gapList(gapReadout(m.totals, S.profile.targets)),
    m.unknownNutrition.length ? h('p', { class: 'muted' }, `No published nutrition for ${m.unknownNutrition.join(', ')}, so “+” totals are minimums.`) : null,
    staffBox(m),
    h('div', { class: 'meal-actions' },
      h('button', { type: 'button', 'aria-pressed': saved, 'data-fk': 'save-meal', onClick: () => go(() => {
        S.saved = saved ? S.saved.filter(s => s.id !== savedId(m, day)) : [toSaved(m, day), ...S.saved]; saveSaved();
      }, saved ? 'Removed from saved meals.' : 'Saved. Find it on the Me page.') }, saved ? '★ Saved' : '☆ Save'),
      h('button', { type: 'button', 'data-fk': 'share-meal', onClick: () => void share() }, 'Share')),
    h('details', { class: 'more' }, h('summary', null, 'Why it fits, ingredients and other ideas'),
      h('h3', null, 'Rule checklist'), ruleTable(mealChecklist(m, S.profile)),
      h('h3', null, 'Ingredients'),
      m.parts.map(p => h('p', { class: 'ingr' }, h('strong', null, p.item.name + ': '), p.item.ingredients ?? 'not published (treated as unknown).')),
      h('h3', null, 'Breakdown'), contributionTable(m, open),
      r.meals.length > 1 ? [h('h3', null, 'All ideas'), ideasTable(r, idx, k => go(() => { S.idea = k; }, `Idea ${k + 1} of ${r.meals.length}.`))] : null,
      h('p', null, h('a', { href: report, target: '_blank', rel: 'noopener noreferrer' }, 'Report a wrong result'), h('small', null, ' (opens a prefilled GitHub issue; nothing is sent unless you submit it)'))));
}

function oneMeal(day: MenuDay): HTMLElement {
  const wrap = h('div', { class: 'stack', 'aria-live': 'polite' });
  if (!S.period) return wrap;
  const r = buildMeals(day, S.period, S.profile, { recentMains: recent() });
  if (r.banner) wrap.appendChild(h('div', { class: 'banner ' + (r.noMealToday ? 'bad' : 'warn'), role: 'status' }, r.banner));
  if (r.noMealToday) {
    wrap.appendChild(h('div', { class: 'card' }, h('h2', null, 'No meal fits today'),
      h('p', null, 'Nothing on this menu passes all of your rules. They were not loosened.'),
      h('a', { class: 'btn primary', href: href('menus') }, 'Browse the full menu')));
    return wrap;
  }
  const t = S.profile.targets;
  if ((t.protein || t.fat || t.carbs || t.calories) && !r.meals.some(m => hitsTargets(m.totals, t))) {
    wrap.appendChild(h('p', { class: 'banner info', role: 'status' }, 'No idea meets all your targets with known values, so the closest is shown first. The gaps are listed on the card.'));
  }
  const n = r.meals.length, i = S.idea % n;
  wrap.appendChild(mealCard(r.meals[i], day, r, i));
  wrap.appendChild(h('div', { class: 'actions' },
    n > 1 ? h('button', { type: 'button', 'aria-label': 'Previous idea', 'data-fk': 'idea-prev', onClick: () => go(() => { S.idea = (i - 1 + n) % n; }, `Idea ${((i - 1 + n) % n) + 1} of ${n}.`) }, '‹ Back') : null,
    h('button', { class: 'primary grow', type: 'button', disabled: n < 2, 'data-fk': 'idea-next', onClick: () => go(() => { S.idea = (i + 1) % n; }, `Idea ${((i + 1) % n) + 1} of ${n}.`) }, n < 2 ? 'Only idea' : `Another idea (${i + 1} of ${n})`)));
  return wrap;
}

function wholeDay(day: MenuDay): HTMLElement {
  const daily = S.profile.daily ?? {};
  const plan = planDay(day, S.profile, daily, { recentMains: recent() });
  const has = Object.values(daily).some(Boolean);
  const sec = h('div', { class: 'stack' },
    h('p', { class: 'muted' }, has ? `Breakfast, lunch and dinner at ${HALL_NAMES[day.hall]} against your daily targets. ` : 'Breakfast, lunch and dinner at this hall. ',
      h('a', { href: href('me', { section: 'goals' }) }, has ? 'Change daily targets' : 'Set daily targets')));
  if (S.profile.allergens.length) sec.appendChild(h('p', { class: 'staff', role: 'note' }, h('strong', null, '⚠ Confirm with staff. '), 'You have an allergy set. Menus and recipes can change, so confirm with dining staff before eating.'));
  for (const n of plan.notes) sec.appendChild(h('p', { class: 'banner warn', role: 'status' }, n));
  sec.appendChild(h('ol', { class: 'dayplan' }, plan.slots.map(s => h('li', { class: 'card' },
    h('h2', null, (s.result.period ?? s.period) === s.slot ? s.slot : `${s.slot} · ${s.result.period ?? s.period}`),
    s.meal ? [
      h('ul', { class: 'mini' }, s.meal.parts.map(x => h('li', null, h('button', { type: 'button', class: 'tlink', 'data-fk': 'plan:' + x.item.id, onClick: () => openItem(day, 'plan:')(x.item.id) }, x.item.name + (x.portions > 1 ? ` ×${x.portions}` : ''))))),
      h('small', null, `${totalText(s.meal.totals.calories, 'calories')} · ${totalText(s.meal.totals.protein, 'protein')} protein · ${s.meal.tier === 'confirmed' ? '✓ fits' : '△ mostly confirmed'}`),
      staffBox(s.meal, true),
    ] : h('p', { class: 'muted' }, 'Nothing fits your rules for this meal.')))));
  sec.appendChild(h('dl', { class: 'totals' },
    h('div', null, h('dt', null, 'Day calories'), h('dd', null, totalText(plan.totals.calories, 'calories'))),
    h('div', null, h('dt', null, 'Day protein'), h('dd', null, totalText(plan.totals.protein, 'protein'))),
    h('div', null, h('dt', null, 'Fat · Carbs'), h('dd', null, `${totalText(plan.totals.fat, 'fat')} · ${totalText(plan.totals.carbs, 'carbs')}`))));
  const g = gapList(plan.gaps); if (g) sec.appendChild(g);
  return sec;
}

function otherHalls(): HTMLElement {
  const now = nyNow();
  const isToday = S.date === now.date;
  const picks = rankHalls(compareHalls((['chase', 'top-of-lenoir'] as const).map(hall => ({ hall, today: dayFor(hall, S.date), yesterday: dayFor(hall, addDays(S.date, -1)) })),
    S.period, S.profile, isToday ? now : { date: '0000-00-00', minutes: 0 }, { recentMains: recent() }));
  return h('section', { class: 'card side', 'aria-labelledby': 'cmp-h' },
    h('h2', { id: 'cmp-h' }, `Both halls · ${S.period ?? 'this meal'}`),
    h('ol', { class: 'cmp' }, picks.map(p => h('li', { class: p.hall === S.hall ? 'here' : '' },
      h('div', { class: 'cmp-head' }, h('strong', null, HALL_NAMES[p.hall]), p.best ? (p.best.tier === 'confirmed' ? chip('Fits', 'ok') : chip('Mostly confirmed', 'warn')) : chip('No meal', 'bad')),
      p.best ? [
        h('p', null, p.best.parts.map(x => x.item.name).join(' + ')),
        h('small', null, `${p.period} · ${totalText(p.best.totals.calories, 'calories')} · ${totalText(p.best.totals.protein, 'protein')} protein`),
        p.hall !== S.hall ? h('div', null, h('button', { type: 'button', class: 'quiet', 'data-fk': 'cmp:' + p.hall, onClick: () => go(() => { S.hall = p.hall; S.period = p.result?.period ?? p.period; S.idea = 0; }, `Showing ${HALL_NAMES[p.hall]}.`) }, `Switch to ${HALL_NAMES[p.hall]}`)) : h('small', { class: 'block' }, 'You are looking at this hall.'),
      ] : h('small', null, p.why)))));
}

export function todayView(): HTMLElement {
  if (!S.onboarded || S.about) return landingView();
  const v = h('div', { class: 'page today' });
  v.appendChild(h('div', { class: 'page-head' }, h('h1', { id: 'page-h', tabindex: '-1' }, 'Today’s meal'),
    h('p', { class: 'lede' }, 'A meal from Chase or Top of Lenoir that fits your rules.')));
  if (S.loading) { v.appendChild(h('p', { class: 'muted', role: 'status' }, 'Loading menus…')); return v; }
  const { el, day } = pickerBar();
  v.appendChild(el);
  if (S.seedError) v.appendChild(h('div', { class: 'banner warn' }, S.seedError));
  if (!day || day.noMenuPosted) { v.appendChild(noMenuNotice(day)); return v; }
  const main = h('div', { class: 'main-col' },
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Show' },
      h('button', { type: 'button', class: S.mode === 'meal' ? 'on' : '', 'aria-pressed': S.mode === 'meal', 'data-fk': 'mode-meal', onClick: () => go(() => { S.mode = 'meal'; }) }, 'One meal'),
      h('button', { type: 'button', class: S.mode === 'day' ? 'on' : '', 'aria-pressed': S.mode === 'day', 'data-fk': 'mode-day', onClick: () => go(() => { S.mode = 'day'; }) }, 'Whole day')),
    S.mode === 'meal' ? oneMeal(day) : wholeDay(day));
  const side = h('aside', { class: 'side-col', 'aria-label': 'More for this meal' },
    otherHalls(),
    h('section', { class: 'card side', 'aria-labelledby': 'rules-h' }, h('h2', { id: 'rules-h' }, S.profiles.length > 1 ? `Rules: ${activeName()}` : 'Your rules'),
      h('p', null, profileSummary(S.profile)), h('a', { href: href('me', { section: 'diet' }) }, 'Change rules')),
    h('section', { class: 'side-note' }, provenanceLine(day), h('p', { class: 'muted' }, `Menu for ${formatDate(day.date)}.`)));
  v.appendChild(h('div', { class: 'cols' }, main, side));
  return v;
}
