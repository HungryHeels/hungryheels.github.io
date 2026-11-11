import { h } from './dom.ts';
import { S, activeName, addProfile, deleteProfile, renameProfile, saveDisplay, saveProfile, setPattern, switchProfile } from './state.ts';
import { announce, go, render } from './nav.ts';
import { copyText, DISCLAIMER, downloadText, numField, sw, UNOFFICIAL } from './ui.ts';
import { dataSection } from './view-data.ts';
import { expandAvoid } from '../core/engine.ts';
import { ALLERGEN_IDS, ALLERGEN_LABELS, ANIMAL_BASED_DEFAULT, PATTERN_DEFINITIONS, PATTERN_LABELS, defaultProfile, type PatternId } from '../core/profile.ts';
import { EXTRA_PRESETS, exportProfiles, importProfiles, profileToHash } from '../core/profile-io.ts';

const upd = (msg?: string) => { S.idea = 0; saveProfile(); render(); if (msg) announce(msg); };

function profilesSection(): HTMLElement {
  const nameIn = h('input', { type: 'text', id: 'profile-name', value: activeName(), maxlength: 40, autocomplete: 'off',
    onChange: (e: Event) => { renameProfile(S.activeId, (e.target as HTMLInputElement).value); render(); announce('Profile renamed.'); } });
  const share = async () => {
    const url = location.href.split('#')[0] + profileToHash(S.profile, activeName());
    const ok = await copyText(url);
    go(() => { S.flash = ok ? 'Share link copied. It holds only your diet settings, inside the link itself; nothing is uploaded.' : `Copy was blocked. The link is: ${url}`; });
  };
  const fileIn = h('input', { type: 'file', id: 'profile-import', accept: '.json,application/json', class: 'sr', onChange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    const r = importProfiles(await f.text());
    if (r.errors.length) { go(() => { S.flash = r.errors.join(' '); }); return; }
    for (const p of r.profiles) addProfile(p.name, p.profile);
    go(() => { S.flash = `Imported ${r.profiles.length} profile(s). The last one is now active.`; });
  } });
  return h('section', { 'aria-labelledby': 'prof-h' }, h('h2', { id: 'prof-h' }, 'Profiles'),
    h('div', { class: 'group pad' },
      h('label', { class: 'field', for: 'profile-pick' }, 'Active profile',
        h('select', { id: 'profile-pick', onChange: (e: Event) => go(() => switchProfile((e.target as HTMLSelectElement).value), 'Profile switched.') },
          S.profiles.map(p => h('option', { value: p.id, ...(p.id === S.activeId ? { selected: true } : {}) }, p.name)))),
      h('label', { class: 'field', for: 'profile-name' }, 'Name', nameIn),
      h('div', { class: 'actions' },
        h('button', { type: 'button', onClick: () => go(() => addProfile('New profile', defaultProfile('none')), 'New profile added.') }, 'New'),
        h('button', { type: 'button', onClick: () => go(() => addProfile(activeName() + ' copy', JSON.parse(JSON.stringify(S.profile))), 'Profile copied.') }, 'Duplicate'),
        S.profiles.length > 1 ? h('button', { type: 'button', class: 'danger', onClick: () => go(() => deleteProfile(S.activeId), 'Profile deleted.') }, 'Delete') : null),
      h('div', { class: 'actions' },
        h('button', { type: 'button', onClick: () => void share() }, 'Copy share link'),
        h('button', { type: 'button', onClick: () => downloadText('hungry-heels-profiles.json', exportProfiles(S.profiles)) }, 'Export JSON'),
        fileIn, h('label', { for: 'profile-import', class: 'btn' }, 'Import JSON')),
      h('p', { class: 'muted' }, 'Profiles stay in this browser. A share link carries the settings after the # sign, which browsers never send to a server.')));
}

function customAvoid(): HTMLElement {
  const p = S.profile;
  const input = h('input', { type: 'text', id: 'custom-avoid', placeholder: 'e.g. mushroom, pork, cilantro', autocomplete: 'off' });
  const add = () => {
    const terms = input.value.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const nu = terms.filter(t => !p.avoidIngredients.includes(t));
    if (nu.length) { p.avoidIngredients = [...p.avoidIngredients, ...nu]; upd(`Added ${nu.join(', ')}.`); }
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
  return h('div', { class: 'group pad' }, h('label', { for: 'custom-avoid' }, 'Avoid any ingredient (comma-separated)'),
    h('div', { class: 'inline' }, input, h('button', { type: 'button', onClick: add }, 'Add')),
    h('ul', { class: 'chips' }, p.avoidIngredients.map(t => {
      const syn = expandAvoid(t).filter(x => x !== t);
      return h('li', { title: syn.length ? 'Also matches: ' + syn.slice(0, 12).join(', ') : '' }, t, syn.length ? h('small', null, ` +${syn.length}`) : null,
        h('button', { type: 'button', 'aria-label': `Remove ${t}`, onClick: () => { p.avoidIngredients = p.avoidIngredients.filter(x => x !== t); upd(`Removed ${t}.`); } }, '×'));
    })),
    p.avoidIngredients.length ? h('details', { class: 'more' }, h('summary', null, 'What each avoid also matches'),
      h('ul', { class: 'notes' }, p.avoidIngredients.map(t => h('li', null, h('strong', null, t + ': '), expandAvoid(t).filter(x => x !== t).slice(0, 25).join(', ') || 'just this word (and its plural)')))) : null,
    h('p', { class: 'muted' }, 'Strict: matched against item names and ingredient text, including plurals, common synonyms (cilantro = coriander leaves) and food groups (“pork” covers bacon and ham). Items with no ingredient list are excluded.'),
    p.avoidIngredients.length ? h('button', { type: 'button', class: 'linkish', onClick: () => { p.avoidIngredients = []; upd('Avoid list cleared.'); } }, 'Clear the avoid list') : null);
}

function goals(): HTMLElement {
  const p = S.profile;
  const set = (fn: (n: number | undefined) => void) => (n: number | undefined) => { fn(n); upd(); };
  return h('section', { 'aria-labelledby': 'nutr-h' }, h('h2', { id: 'nutr-h' }, 'Nutrition goals'),
    h('div', { class: 'group' },
      h('p', { class: 'muted pad' }, 'Per meal. Leave a box blank to ignore it. Only published values are used; unknown values are never guessed, so a target is only checked when every part of a meal has that value. The app shows the closest meal and the honest gap.'),
      h('div', { class: 'grid2' },
        numField('Calorie cap', p.calorieCap, set(n => { p.calorieCap = n ?? 1000; }), '1000', 'g-cap'),
        numField('Calorie target', p.targets.calories, set(n => { p.targets = { ...p.targets, calories: n || undefined }; }), 'e.g. 700', 'g-cal'),
        numField('Protein target (g)', p.targets.protein, set(n => { p.targets = { ...p.targets, protein: n || undefined }; }), 'e.g. 40', 'g-pro'),
        numField('Fat target (g)', p.targets.fat, set(n => { p.targets = { ...p.targets, fat: n || undefined }; }), 'e.g. 25', 'g-fat'),
        numField('Carb target (g)', p.targets.carbs, set(n => { p.targets = { ...p.targets, carbs: n || undefined }; }), 'e.g. 60', 'g-carb')),
      h('label', { class: 'field' }, 'Largest portion multiplier',
        h('select', { 'data-fk': 'g-port', onChange: (e: Event) => { p.maxPortion = Number((e.target as HTMLSelectElement).value) as 1 | 2 | 3; upd(); } },
          [1, 2, 3].map(n => h('option', { value: n, ...(p.maxPortion === n ? { selected: true } : {}) }, n === 1 ? '1× (no extra portions)' : `Up to ${n}×`)))),
      h('p', { class: 'muted pad' }, 'With targets set, the app may serve 2× or 3× of a main or protein side so a meal can reach your numbers, preferring the fewest extra portions. Fat and carbs are unknown for built-in menus until an official nutrition file is imported. Daily targets for the day planner are in the Plan tab.')));
}

function displaySection(): HTMLElement {
  const d = S.display;
  const seg = <T extends string>(label: string, cur: T, opts: Array<[T, string]>, set: (v: T) => void) =>
    h('div', { class: 'field' }, h('span', null, label), h('div', { class: 'seg', role: 'group', 'aria-label': label }, opts.map(([v, l]) =>
      h('button', { type: 'button', 'aria-pressed': cur === v, class: cur === v ? 'on' : '', 'data-fk': `disp:${label}:${v}`, onClick: () => go(() => { set(v); saveDisplay(); }, `${label}: ${l}.`) }, l))));
  return h('section', { 'aria-labelledby': 'disp-h' }, h('h2', { id: 'disp-h' }, 'Display'),
    h('div', { class: 'group' },
      seg('Theme', d.theme, [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], v => { S.display.theme = v; }),
      seg('Text size', d.text, [['normal', 'Normal'], ['large', 'Large']], v => { S.display.text = v; }),
      seg('Contrast', d.contrast, [['normal', 'Normal'], ['high', 'High']], v => { S.display.contrast = v; })));
}

export function youView(): HTMLElement {
  const p = S.profile;
  const presets: PatternId[] = ['none', 'vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];
  const v = h('div', { class: 'view you' });
  v.appendChild(profilesSection());
  v.appendChild(h('section', { 'aria-labelledby': 'diet-h' }, h('h2', { id: 'diet-h' }, 'Diet'),
    h('div', { class: 'group', role: 'radiogroup', 'aria-label': 'Diet' }, presets.map(id =>
      h('label', { class: 'row radio' }, h('span', { class: 'row-text' }, h('span', null, PATTERN_LABELS[id]), h('small', null, PATTERN_DEFINITIONS[id])),
        h('input', { type: 'radio', name: 'diet', checked: p.pattern === id, 'data-fk': 'diet:' + id, onChange: () => { setPattern(id); S.idea = 0; render(); announce(`${PATTERN_LABELS[id]} selected.`); } })))),
    p.pattern === 'pescatarian' ? h('div', { class: 'group' }, sw('Include dairy', p.allowDairy, x => { p.allowDairy = x; upd(); }, undefined, 'pes-dairy'), sw('Include eggs', p.allowEgg, x => { p.allowEgg = x; upd(); }, undefined, 'pes-egg')) : null,
    p.pattern === 'animal_based' ? h('div', { class: 'group' }, h('p', { class: 'muted pad' }, `Default allowed: ${ANIMAL_BASED_DEFAULT.join(', ')}. Turn a food group on to allow it.`),
      (['vegetables', 'grains', 'legumes', 'nuts_seeds'] as const).map(c => sw(`Allow ${c.replace('_', ' / ')}`, !p.animalBasedExcluded.includes(c),
        x => { p.animalBasedExcluded = x ? p.animalBasedExcluded.filter(y => y !== c) : [...p.animalBasedExcluded, c]; upd(); }, undefined, 'ab:' + c))) : null,
    h('details', { class: 'more' }, h('summary', null, 'More starting points'),
      h('ul', { class: 'presets' }, EXTRA_PRESETS.map(pr => h('li', null, h('strong', null, pr.name), h('small', { class: 'block' }, pr.description),
        h('button', { type: 'button', onClick: () => { S.profile = pr.apply(S.profile); upd(`${pr.name} applied.`); } }, 'Apply to this profile')))))));

  v.appendChild(h('section', { 'aria-labelledby': 'allergy-h' }, h('h2', { id: 'allergy-h' }, 'Allergies and strict avoids'),
    h('p', { class: 'muted' }, 'These are strict. If we cannot confirm an item is free of something here, it is never recommended.'),
    h('div', { class: 'group' }, ALLERGEN_IDS.map(a => sw(`${ALLERGEN_LABELS[a]} allergy`, p.allergens.includes(a), x => { p.allergens = x ? [...p.allergens, a] : p.allergens.filter(y => y !== a); upd(); }, undefined, 'al:' + a))),
    h('div', { class: 'group' },
      sw('Avoid gluten', p.avoidGluten, x => { p.avoidGluten = x; upd(); }, 'Wheat, barley, rye, malt and similar', 'av:gluten'),
      sw('Avoid dairy', p.avoidDairy, x => { p.avoidDairy = x; upd(); }, undefined, 'av:dairy'),
      sw('Avoid egg', p.avoidEgg, x => { p.avoidEgg = x; upd(); }, undefined, 'av:egg'),
      sw('No pork or alcohol (halal-style)', p.halalStyle, x => { p.halalStyle = x; upd(); }, 'An ingredient rule only. This is not a halal certification.', 'av:halal')),
    customAvoid()));
  v.appendChild(goals());
  v.appendChild(displaySection());
  v.appendChild(dataSection());
  v.appendChild(h('section', { 'aria-labelledby': 'about-h' }, h('h2', { id: 'about-h' }, 'About'),
    h('p', null, UNOFFICIAL), h('p', null, DISCLAIMER),
    h('p', { class: 'muted' }, 'Privacy: your profiles, saved meals, history and any nutrition you enter stay in this browser. Menus come from pages you save yourself; nothing is uploaded and no analytics are used. This app never contacts dining.unc.edu.'),
    S.storageNote ? h('p', { class: 'warn-text' }, S.storageNote) : null));
  return v;
}
