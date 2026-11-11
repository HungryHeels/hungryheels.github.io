// The landing content: what Hungry Heels is, how it works, its rules and limits. It is the Today page for
// first-time visitors (the diet question is built in) and reopens from the footer ("About Hungry Heels").
// Every number here is computed from the loaded menus, so it stays true when menus are updated.
import { h } from './dom.ts';
import { S, allDays, setPattern } from './state.ts';
import { go } from './nav.ts';
import { DISCLAIMER } from './ui.ts';
import { href } from './view-common.ts';
import { routeHash } from './router.ts';
import { computeMissing } from '../core/validate.ts';
import { PATTERN_DEFINITIONS, PATTERN_LABELS, type PatternId } from '../core/profile.ts';
import { HALL_NAMES, type HallId } from '../core/types.ts';
import { formatDate } from '../core/schedule.ts';

const PICKS: PatternId[] = ['vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];

function dietQuestion(): HTMLElement {
  const choose = (p: PatternId) => go(() => { setPattern(p); S.about = false; window.scrollTo(0, 0); }, `${PATTERN_LABELS[p]} saved. Showing a meal.`);
  const current = S.onboarded ? S.profile.pattern : null;
  return h('section', { class: 'quiz card', id: 'quiz', 'aria-labelledby': 'quiz-h' },
    h('h2', { id: 'quiz-h', tabindex: '-1' }, 'What do you eat?'),
    h('p', { class: 'muted' }, 'Tap one to see a meal. Allergies, ingredients to avoid and nutrition goals can be added any time on the Me page.'),
    h('div', { class: 'quiz-grid' },
      PICKS.map(p => h('button', { class: 'big', type: 'button', 'aria-pressed': current === p, onClick: () => choose(p) }, PATTERN_LABELS[p])),
      h('button', { class: 'big quiet', type: 'button', 'aria-pressed': current === 'none', onClick: () => choose('none') }, 'No specific diet')),
    h('details', { class: 'more' }, h('summary', null, 'What do these mean?'),
      h('dl', { class: 'defs' }, PICKS.flatMap(p => [h('dt', null, PATTERN_LABELS[p]), h('dd', null, PATTERN_DEFINITIONS[p])]))));
}

function facts(): HTMLElement {
  if (S.loading) return h('p', { class: 'muted', role: 'status' }, 'Loading the saved menus…');
  const days = allDays();
  const halls: HallId[] = ['chase', 'top-of-lenoir'];
  const rows = halls.map(hall => {
    const ds = days.filter(d => d.hall === hall).map(d => d.date).sort();
    if (!ds.length) return h('li', null, h('strong', null, HALL_NAMES[hall] + ': '), 'no saved menus yet.');
    const c = computeMissing(days, hall, ds[0], ds[ds.length - 1]);
    return h('li', null, h('strong', null, HALL_NAMES[hall] + ': '),
      `${formatDate(ds[0])} to ${formatDate(ds[ds.length - 1])}, ${c.imported} day${c.imported === 1 ? '' : 's'} with menus`,
      c.noMenu ? `, ${c.noMenu} with no menu posted` : '', c.missing ? `, ${c.missing} not saved` : '', '.');
  });
  const seen = new Map<string, boolean>();
  for (const d of days) for (const it of Object.values(d.items)) seen.set(d.hall + ':' + it.id, it.nutrition.calories !== null && it.nutrition.protein !== null);
  const total = seen.size, known = [...seen.values()].filter(Boolean).length;
  const share = total ? known / total : 0;
  const word = share > 0.9 ? 'almost all' : share > 0.6 ? 'most' : share > 0.4 ? 'about half' : share > 0.25 ? 'about a third' : share > 0 ? 'a few' : 'none';
  return h('div', { class: 'stack' },
    h('ul', { class: 'facts' }, rows),
    h('p', null, `Calories and protein are known for ${known.toLocaleString('en-US')} of the ${total.toLocaleString('en-US')} dishes on these menus (${word}), counting each hall’s version of a dish separately. Fat and carbs are not published anywhere yet, so they show as unknown. Nothing is estimated.`),
    h('p', null, 'Menus come from pages saved by hand, so they can go out of date. Anyone can add a newer one on ', h('a', { href: routeHash({ page: 'menus', view: 'update' }) }, 'Menus › Update menus'), '.'));
}

const FAQ: Array<[string, string]> = [
  ['Is this official?', 'No. Hungry Heels is an independent, unofficial project for personal use. It is not affiliated with or endorsed by UNC-Chapel Hill or Carolina Dining Services.'],
  ['Is it safe for my allergy?', 'Hungry Heels never claims a dish is allergy-safe. It leaves out anything it can’t confirm is free of what you avoid, but menus and recipes change and the published data can be incomplete. Always confirm with dining staff.'],
  ['Why is nutrition often unknown?', 'A saved menu page lists ingredients and allergens but not nutrition; UNC shows nutrition only when you tap an item. Calories and protein come from a third-party listing where the names match exactly. You can type in numbers from UNC’s item panel yourself, and an official nutrition file can be imported if one becomes available.'],
  ['How do menus get updated?', 'Someone saves the hall’s menu page in Safari (File › Save As › Web Archive) and adds it on Menus › Update menus. The site never downloads anything from dining.unc.edu itself.'],
  ['Does it cost anything?', 'No. There is no account, no sign-up and nothing to buy.'],
];

export function landingView(): HTMLElement {
  const findMeal = () => { const q = document.getElementById('quiz-h'); q?.scrollIntoView({ block: 'start' }); q?.focus({ preventScroll: true }); };
  return h('div', { class: 'page landing' },
    h('div', { class: 'hero' },
      h('div', { class: 'hero-text' },
        h('h1', { id: 'page-h', tabindex: '-1' }, 'One dining-hall meal that fits how you eat.'),
        h('p', { class: 'lede' }, 'Pick your diet and anything you avoid. Hungry Heels checks every dish on the Chase and Top of Lenoir menus and shows you one complete meal: a main and sides that pass every rule.'),
        h('div', { class: 'actions' },
          S.onboarded
            ? h('a', { class: 'btn primary', href: routeHash({ page: 'today' }) }, 'Back to my meal')
            : h('button', { type: 'button', class: 'primary', onClick: findMeal }, 'Find my meal'),
          h('a', { class: 'btn', href: href('menus') }, 'Browse the full menu')),
        h('p', { class: 'muted' }, 'Unofficial. Not affiliated with UNC or Carolina Dining Services.')),
      dietQuestion()),

    h('section', { class: 'band', 'aria-labelledby': 'how-h' }, h('h2', { id: 'how-h' }, 'How it works'),
      h('ol', { class: 'steps' },
        h('li', null, h('strong', null, 'Tell it what you eat and what you avoid. '), 'Six diet choices, the nine major allergens, gluten, dairy, egg, no pork or alcohol, and any ingredient you type.'),
        h('li', null, h('strong', null, 'Get one meal for the hall and time you pick. '), 'Another idea is a tap away, and “Whole day” plans breakfast, lunch and dinner.'),
        h('li', null, h('strong', null, 'Tap any dish to see why. '), 'Ingredients, allergens, nutrition where it is known, and each rule with the evidence that decided it.'))),

    h('section', { class: 'band', 'aria-labelledby': 'promise-h' }, h('h2', { id: 'promise-h' }, 'If you avoid it, it’s never recommended.'),
      h('ul', { class: 'points' },
        h('li', null, 'If an ingredient list is missing or unclear, the dish is left out rather than guessed.'),
        h('li', null, 'When UNC’s diet label disagrees with its own allergen list, the allergen list wins.'),
        h('li', null, 'If nothing fits, you are told so. Your rules are never loosened to fill a plate.')),
      h('p', { class: 'staff', role: 'note' }, h('strong', null, DISCLAIMER))),

    h('section', { class: 'band', 'aria-labelledby': 'data-h2' }, h('h2', { id: 'data-h2' }, 'What’s in it, and what isn’t'), facts()),

    h('section', { class: 'band', 'aria-labelledby': 'priv-h' }, h('h2', { id: 'priv-h' }, 'Private by design'),
      h('ul', { class: 'points' },
        h('li', null, 'No account and no tracking. Your choices stay in this browser.'),
        h('li', null, 'Nothing is uploaded, and the site never contacts dining.unc.edu.'),
        h('li', null, 'Works offline once you have opened it.'))),

    h('section', { class: 'band', 'aria-labelledby': 'faq-h' }, h('h2', { id: 'faq-h' }, 'Questions'),
      h('div', { class: 'faq' }, FAQ.map(([q, a]) => h('details', { class: 'more' }, h('summary', null, q), h('p', null, a))))));
}
