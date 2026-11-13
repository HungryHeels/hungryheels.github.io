// Me: your rules, goals, saved meals, profiles and display settings. Everything here stays in this browser.
import { campus } from './mascot.ts';
import { h } from './dom.ts';
import { S, activeName, addProfile, dayFor, deleteProfile, renameProfile, saveDisplay, saveProfile, saveSaved, setPattern, switchProfile } from './state.ts';
import { announce, go, render } from './nav.ts';
import { chip, copyText, DISCLAIMER, downloadText, numField, sw, UNOFFICIAL } from './ui.ts';
import { routeHash } from './router.ts';
import { expandAvoid } from '../core/engine.ts';
import { recheckSaved } from '../core/plan.ts';
import { recheckRestaurantSaved } from '../core/restaurant-meals.ts';
import { RESTAURANT_NAMES } from '../core/restaurant.ts';
import { ALLERGEN_IDS, ALLERGEN_LABELS, ANIMAL_BASED_DEFAULT, PATTERN_DEFINITIONS, PATTERN_LABELS, defaultProfile, type PatternId } from '../core/profile.ts';
import { EXTRA_PRESETS, exportProfiles, importProfiles, profileToHash } from '../core/profile-io.ts';
import { HALL_NAMES } from '../core/types.ts';
import { formatDate } from '../core/schedule.ts';

const upd = (msg?: string) => { S.idea = 0; saveProfile(); render(); if (msg) announce(msg); };
export const ME_SECTIONS: Array<[string, string]> = [['diet', 'Diet'], ['avoid', 'Allergies and avoids'], ['goals', 'Goals'], ['saved', 'Saved meals'], ['profiles', 'Profiles'], ['display', 'Display'], ['privacy', 'Privacy and about']];
const sec = (id: string, title: string, ...kids: Array<Node | null | Array<Node | null>>) =>
  h('section', { id: 'me-' + id, class: 'me-section', 'aria-labelledby': 'me-' + id + '-h' }, h('h2', { id: 'me-' + id + '-h', tabindex: '-1' }, title), ...kids);

function diet(): HTMLElement {
  const p = S.profile;
  const presets: PatternId[] = ['none', 'vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];
  return sec('diet', 'Diet',
    h('fieldset', { class: 'card group' }, h('legend', { class: 'sr' }, 'Diet'), presets.map(id =>
      h('label', { class: 'row radio' }, h('input', { type: 'radio', name: 'diet', checked: p.pattern === id, 'data-fk': 'diet:' + id, onChange: () => { setPattern(id); S.idea = 0; render(); announce(`${PATTERN_LABELS[id]} selected.`); } }),
        h('span', { class: 'row-text' }, h('span', null, PATTERN_LABELS[id]), h('small', null, PATTERN_DEFINITIONS[id]))))),
    p.pattern === 'pescatarian' ? h('div', { class: 'card group' }, sw('Include dairy', p.allowDairy, x => { p.allowDairy = x; upd(); }, undefined, 'pes-dairy'), sw('Include eggs', p.allowEgg, x => { p.allowEgg = x; upd(); }, undefined, 'pes-egg')) : null,
    p.pattern === 'animal_based' ? h('div', { class: 'card group' }, h('p', { class: 'muted pad' }, `Allowed by default: ${ANIMAL_BASED_DEFAULT.join(', ')}. Turn a food group on to allow it.`),
      (['vegetables', 'grains', 'legumes', 'nuts_seeds'] as const).map(c => sw(`Allow ${c.replace('_', ' / ')}`, !p.animalBasedExcluded.includes(c),
        x => { p.animalBasedExcluded = x ? p.animalBasedExcluded.filter(y => y !== c) : [...p.animalBasedExcluded, c]; upd(); }, undefined, 'ab:' + c))) : null,
    h('details', { class: 'more' }, h('summary', null, 'More starting points'),
      h('ul', { class: 'presets' }, EXTRA_PRESETS.map(pr => h('li', null, h('strong', null, pr.name), h('small', { class: 'block' }, pr.description),
        h('button', { type: 'button', onClick: () => { S.profile = pr.apply(S.profile); upd(`${pr.name} applied.`); } }, 'Apply'))))));
}

function avoids(): HTMLElement {
  const p = S.profile;
  const input = h('input', { type: 'text', id: 'custom-avoid', placeholder: 'e.g. mushroom, pork, cilantro', autocomplete: 'off' });
  const add = () => {
    const nu = input.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t && !p.avoidIngredients.includes(t));
    if (nu.length) { p.avoidIngredients = [...p.avoidIngredients, ...nu]; upd(`Added ${nu.join(', ')}.`); }
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  return sec('avoid', 'Allergies and avoids',
    h('p', { class: 'muted' }, 'Strict: if an item can’t be confirmed free of something here, it is never recommended.'),
    h('div', { class: 'card group cols2' }, ALLERGEN_IDS.map(a => sw(`${ALLERGEN_LABELS[a]} allergy`, p.allergens.includes(a), x => { p.allergens = x ? [...p.allergens, a] : p.allergens.filter(y => y !== a); upd(); }, undefined, 'al:' + a))),
    h('div', { class: 'card group' },
      sw('Avoid gluten', p.avoidGluten, x => { p.avoidGluten = x; upd(); }, 'Wheat, barley, rye, malt and similar', 'av:gluten'),
      sw('Avoid dairy', p.avoidDairy, x => { p.avoidDairy = x; upd(); }, undefined, 'av:dairy'),
      sw('Avoid egg', p.avoidEgg, x => { p.avoidEgg = x; upd(); }, undefined, 'av:egg'),
      sw('No pork or alcohol (halal-style)', p.halalStyle, x => { p.halalStyle = x; upd(); }, 'An ingredient rule only, not a halal certification.', 'av:halal')),
    h('div', { class: 'card pad' }, h('label', { for: 'custom-avoid' }, h('strong', null, 'Avoid any ingredient')),
      h('div', { class: 'inline' }, input, h('button', { type: 'button', onClick: add }, 'Add')),
      p.avoidIngredients.length ? h('ul', { class: 'chips' }, p.avoidIngredients.map(t => h('li', null, t,
        h('button', { type: 'button', 'aria-label': `Remove ${t}`, onClick: () => { p.avoidIngredients = p.avoidIngredients.filter(x => x !== t); upd(`Removed ${t}.`); } }, '×')))) : null,
      p.avoidIngredients.length ? h('details', { class: 'more' }, h('summary', null, 'What each avoid also matches'),
        h('ul', { class: 'notes' }, p.avoidIngredients.map(t => h('li', null, h('strong', null, t + ': '), expandAvoid(t).filter(x => x !== t).slice(0, 25).join(', ') || 'just this word and its plural')))) : null,
      h('p', { class: 'muted' }, 'Matched in names and ingredient text, with plurals, common synonyms (cilantro = coriander leaves) and food groups (“pork” covers bacon and ham). Items with no ingredient list are excluded.')));
}

function goals(): HTMLElement {
  const p = S.profile;
  const set = (fn: (n: number | undefined) => void) => (n: number | undefined) => { fn(n); upd(); };
  const daily = p.daily ?? {};
  const setD = (k: 'calories' | 'protein' | 'fat' | 'carbs') => (n: number | undefined) => { S.profile.daily = { ...(S.profile.daily ?? {}), [k]: n || undefined }; upd(); };
  return sec('goals', 'Goals',
    h('p', { class: 'muted' }, 'Leave a box blank to ignore it. Published numbers are always used first. Where a dish has none, a labeled estimate can fill the gap (switch below).'),
    h('div', { class: 'card group' }, sw('Fill missing numbers with estimates', S.profile.useEstimates !== false, x => { S.profile.useEstimates = x; upd(x ? 'Estimates on. They are marked with ~.' : 'Estimates off. Missing numbers show as unknown.'); },
      'Typical values for similar foods (USDA-style reference values) times a typical serving. Marked with “~” everywhere. Checked against dishes with published numbers: about half are within 30% on calories; protein is usually within 2 g. Never used for allergy or diet rules.', 'g-est')),
    h('div', { class: 'card' }, h('h3', null, 'Per meal'),
      h('div', { class: 'grid2' },
        numField('Calorie cap', p.calorieCap, set(n => { p.calorieCap = n ?? 1000; }), '1000', 'g-cap'),
        numField('Calorie target', p.targets.calories, set(n => { p.targets = { ...p.targets, calories: n || undefined }; }), 'e.g. 700', 'g-cal'),
        numField('Protein (g)', p.targets.protein, set(n => { p.targets = { ...p.targets, protein: n || undefined }; }), 'e.g. 40', 'g-pro'),
        numField('Fat (g)', p.targets.fat, set(n => { p.targets = { ...p.targets, fat: n || undefined }; }), 'e.g. 25', 'g-fat'),
        numField('Carbs (g)', p.targets.carbs, set(n => { p.targets = { ...p.targets, carbs: n || undefined }; }), 'e.g. 60', 'g-carb'),
        h('label', { class: 'field' }, 'Extra portions',
          h('select', { 'data-fk': 'g-port', onChange: (e: Event) => { p.maxPortion = Number((e.target as HTMLSelectElement).value) as 1 | 2 | 3; upd(); } },
            [1, 2, 3].map(n => h('option', { value: n, ...(p.maxPortion === n ? { selected: true } : {}) }, n === 1 ? 'None' : `Up to ${n}×`)))))),
    h('div', { class: 'card' }, h('h3', null, 'Per day (used by “Whole day” on Today)'),
      h('div', { class: 'grid2' },
        numField('Calories', daily.calories, setD('calories'), 'e.g. 2200', 'd-cal'), numField('Protein (g)', daily.protein, setD('protein'), 'e.g. 120', 'd-pro'),
        numField('Fat (g)', daily.fat, setD('fat'), 'e.g. 70', 'd-fat'), numField('Carbs (g)', daily.carbs, setD('carbs'), 'e.g. 250', 'd-carb'))));
}

function saved(): HTMLElement {
  if (!S.saved.length) return sec('saved', 'Saved meals', h('p', { class: 'muted' }, 'Tap ☆ Save on a meal to keep it here. Saved meals are re-checked against your current rules, and their mains are suggested a little later for a week so you get variety.'));
  return sec('saved', `Saved meals (${S.saved.length})`,
    h('ul', { class: 'saved' }, S.saved.map(s => {
      const chk = s.place ? recheckRestaurantSaved(s, S.restaurants.find(x => x.id === s.place) ?? null, S.profile) : recheckSaved(s, dayFor(s.hall, s.date), S.profile);
      return h('li', { class: 'card' },
        h('div', { class: 'cmp-head' }, h('strong', null, s.place ? `${RESTAURANT_NAMES[s.place]} · saved ${formatDate(s.date)}` : `${s.period} · ${HALL_NAMES[s.hall]} · ${formatDate(s.date)}`), chk.ok ? (chk.notes.length ? chip('Mostly confirmed', 'warn') : chip('Still fits', 'ok')) : chip('No longer fits', 'bad')),
        h('p', null, s.parts.map(x => x.name + (x.portions > 1 ? ` ×${x.portions}` : '')).join(' + ')),
        chk.problems.length ? h('ul', { class: 'notes' }, chk.problems.map(x => h('li', null, x))) : null,
        h('div', { class: 'actions' },
          chk.ok ? h('a', { class: 'btn', href: s.place ? routeHash({ page: 'today', place: s.place }) : routeHash({ page: 'today', hall: s.hall, date: s.date, period: s.period }) }, 'Open') : null,
          h('button', { type: 'button', class: 'quiet danger', 'aria-label': `Remove saved meal ${s.parts[0]?.name ?? ''}`, onClick: () => go(() => { S.saved = S.saved.filter(x => x !== s); saveSaved(); }, 'Removed.') }, 'Remove')));
    })));
}

function profiles(): HTMLElement {
  const share = async () => {
    const url = location.href.split('#')[0] + profileToHash(S.profile, activeName());
    const ok = await copyText(url);
    go(() => { S.flash = ok ? 'Share link copied. It carries only these settings, inside the link itself; nothing is uploaded.' : `Copying was blocked. The link is: ${url}`; });
  };
  const fileIn = h('input', { type: 'file', id: 'profile-import', accept: '.json,application/json', class: 'sr', onChange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    const r = importProfiles(await f.text());
    if (r.errors.length) { go(() => { S.flash = r.errors.join(' '); }); return; }
    for (const x of r.profiles) addProfile(x.name, x.profile);
    go(() => { S.flash = `Imported ${r.profiles.length} profile(s). The last one is now active.`; });
  } });
  return sec('profiles', 'Profiles',
    h('div', { class: 'card' },
      h('div', { class: 'grid2' },
        h('label', { class: 'field', for: 'profile-pick' }, 'Active profile',
          h('select', { id: 'profile-pick', onChange: (e: Event) => go(() => switchProfile((e.target as HTMLSelectElement).value), 'Profile switched.') },
            S.profiles.map(x => h('option', { value: x.id, ...(x.id === S.activeId ? { selected: true } : {}) }, x.name)))),
        h('label', { class: 'field', for: 'profile-name' }, 'Name', h('input', { type: 'text', id: 'profile-name', value: activeName(), maxlength: 40, autocomplete: 'off',
          onChange: (e: Event) => { renameProfile(S.activeId, (e.target as HTMLInputElement).value); render(); announce('Profile renamed.'); } }))),
      h('div', { class: 'actions' },
        h('button', { type: 'button', onClick: () => go(() => addProfile('New profile', defaultProfile('none')), 'New profile added.') }, 'New'),
        h('button', { type: 'button', onClick: () => go(() => addProfile(activeName() + ' copy', JSON.parse(JSON.stringify(S.profile))), 'Profile copied.') }, 'Duplicate'),
        h('button', { type: 'button', onClick: () => void share() }, 'Copy share link'),
        h('button', { type: 'button', onClick: () => downloadText('hungry-heels-profiles.json', exportProfiles(S.profiles)) }, 'Export'),
        fileIn, h('label', { for: 'profile-import', class: 'btn' }, 'Import'),
        S.profiles.length > 1 ? h('button', { type: 'button', class: 'quiet danger', onClick: () => go(() => deleteProfile(S.activeId), 'Profile deleted.') }, 'Delete') : null),
      h('p', { class: 'muted' }, 'A share link keeps the settings after the # sign, which browsers never send to a server.')));
}

function display(): HTMLElement {
  const d = S.display;
  const seg = <T extends string>(label: string, cur: T, opts: Array<[T, string]>, set: (v: T) => void) =>
    h('div', { class: 'field' }, h('span', null, label), h('div', { class: 'seg', role: 'group', 'aria-label': label }, opts.map(([v, l]) =>
      h('button', { type: 'button', 'aria-pressed': cur === v, class: cur === v ? 'on' : '', 'data-fk': `disp:${label}:${v}`, onClick: () => go(() => { set(v); saveDisplay(); }, `${label}: ${l}.`) }, l))));
  return sec('display', 'Display', h('div', { class: 'card grid2' },
    seg('Theme', d.theme, [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], v => { S.display.theme = v; }),
    seg('Text size', d.text, [['normal', 'Normal'], ['large', 'Large']], v => { S.display.text = v; }),
    seg('Contrast', d.contrast, [['normal', 'Normal'], ['high', 'High']], v => { S.display.contrast = v; })));
}

function privacy(): HTMLElement {
  return sec('privacy', 'Privacy and about',
    h('div', { class: 'card prose' },
      h('p', null, UNOFFICIAL), h('p', null, h('strong', null, DISCLAIMER)),
      h('p', null, 'Your profiles, goals, saved meals, imported menus and any nutrition you type in stay in this browser. Nothing is uploaded, there are no accounts or analytics, and this site never contacts dining.unc.edu. Menus come only from pages saved by hand.'),
      h('p', null, '“Report a wrong result” opens a prefilled GitHub issue in a new tab with the item, hall, date, your diet rules and the evidence. Nothing is sent unless you submit it there, and you can edit it first.'),
      S.storageNote ? h('p', { class: 'warn-text' }, S.storageNote) : null));
}

export function meView(): HTMLElement {
  const v = h('div', { class: 'page me' });
  v.appendChild(h('div', { class: 'page-head' }, h('h1', { id: 'page-h', tabindex: '-1' }, campus('dogwood'), S.profiles.length > 1 ? `Me · ${activeName()}` : 'Me'),
    h('p', { class: 'lede' }, 'Your rules, goals and saved meals. They stay in this browser.')));
  const toc = h('nav', { class: 'toc', 'aria-label': 'On this page' }, h('ul', null, ME_SECTIONS.map(([id, label]) =>
    h('li', null, h('a', { href: routeHash({ page: 'me', section: id }) }, label)))));
  v.appendChild(h('div', { class: 'cols me-cols' }, h('div', { class: 'toc-col' }, toc),
    h('div', { class: 'main-col' }, diet(), avoids(), goals(), saved(), profiles(), display(), privacy())));
  return v;
}
