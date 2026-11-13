// Ingredients shown like a packaged-food label in dish details. Display only: rules keep using the raw text.
import { h } from './dom.ts';
import { formatSaved } from '../core/schedule.ts';
import { HALL_NAMES, type MenuDay, type MenuItem } from '../core/types.ts';
import { parseIngredients, type IngredientNode } from '../sources/ingredients.ts';

const ALLERGEN_NAMES: Record<string, string> = { milk: 'Milk', egg: 'Egg', wheat: 'Wheat', soy: 'Soy', sesame: 'Sesame', fish: 'Fish',
  shellfish: 'Shellfish', peanut: 'Peanut', tree_nut: 'Tree nut' };
export const allergenName = (a: string) => ALLERGEN_NAMES[a] ?? a.replace(/_/g, ' ');

// One flowing paragraph that is still a list for screen readers. Commas and brackets are real text, so copying works.
function list(nodes: IngredientNode[], top: boolean): HTMLElement {
  return h('ul', { class: 'label-list', role: 'list' }, nodes.map((n, i) => {
    const last = i === nodes.length - 1;
    const sep = n.lead ? ': ' : last ? (top ? '.' : '') : ', ';
    return h('li', null, n.name,
      n.sub ? [' (', list(n.sub, false), ')'] : null,
      n.after ? ' ' + n.after : null,
      sep);
  }));
}

export function ingredientsLabel(day: MenuDay, it: MenuItem): HTMLElement[] {
  const parsed = parseIngredients(it.ingredients);
  const contains = it.allergens.map(allergenName);
  const p = day.provenance;
  return [
    h('section', { class: 'label', 'aria-labelledby': 'label-h' },
      h('h3', { id: 'label-h', class: 'label-h' }, 'Ingredients:'), ' ',
      parsed ? list(parsed.items, true) : h('p', { class: 'label-none' }, 'Ingredients not listed by UNC for this item'),
      h('p', { class: 'label-contains' }, h('strong', null, 'Contains:'), ' ',
        contains.length ? h('span', { class: 'label-caps' }, contains.join(', ')) : 'No allergens declared in UNC’s data. This does not mean allergen-free.')),
    h('p', { class: 'prov' }, `Source: ${p.source}, ${HALL_NAMES[day.hall]}, menu for ${day.date}. Saved ${formatSaved(p.retrievedAt)}.`,
      parsed && !parsed.structured ? ' UNC’s page gives this text without commas or brackets, so it is shown as one run of words, as published.' : '',
      ' Allergens are the ones UNC declares; lists can be incomplete.'),
    it.ingredients ? h('details', { class: 'more' }, h('summary', null, 'Show original text'), h('p', { class: 'ingr' }, it.ingredients)) : null,
  ].filter((x): x is HTMLElement => !!x);
}
