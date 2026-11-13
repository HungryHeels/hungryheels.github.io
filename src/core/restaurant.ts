// Restaurants (Franklin Street, Chapel Hill): build-your-own menus from the restaurant's own published nutrition and
// allergen information. No dates and no meal periods: a restaurant menu is treated as always available, with hours
// unknown unless an official source states them. The published menu is national; the local store may differ.
//
// Hard rules (same as the dining halls): nothing is invented. A missing value is null, never 0. A published
// "may contain" / shared-equipment / cross-contact statement makes an allergen UNKNOWN, so strict avoids exclude it.
import type { HallId, MenuItem } from './types.ts';
import { HALL_NAMES } from './types.ts';

export type RestaurantId = 'sweetgreen' | 'chipotle';
export const RESTAURANT_IDS: RestaurantId[] = ['sweetgreen', 'chipotle'];
export const RESTAURANT_NAMES: Record<RestaurantId, string> = { sweetgreen: 'Sweetgreen', chipotle: 'Chipotle' };
/** The restaurant's own web domain: an official source must be on it. */
export const RESTAURANT_DOMAINS: Record<RestaurantId, string> = { sweetgreen: 'sweetgreen.com', chipotle: 'chipotle.com' };
/** A place on the picker: a dining hall (dated menus with meal periods) or a restaurant (one always-on menu). */
export type PlaceId = HallId | RestaurantId;
export const PLACE_IDS: PlaceId[] = ['chase', 'top-of-lenoir', 'sweetgreen', 'chipotle'];
export const PLACE_NAMES: Record<PlaceId, string> = { ...HALL_NAMES, ...RESTAURANT_NAMES };
export const isRestaurant = (p: PlaceId | string | null | undefined): p is RestaurantId => p === 'sweetgreen' || p === 'chipotle';
export const LOCATION_NOTE = 'Franklin Street, Chapel Hill';

export type ComponentRole = 'base' | 'protein' | 'topping' | 'sauce' | 'side';
export const ROLES: ComponentRole[] = ['base', 'protein', 'topping', 'sauce', 'side'];
export const ROLE_LABELS: Record<ComponentRole, string> = { base: 'Base', protein: 'Protein', topping: 'Topping', sauce: 'Sauce or dressing', side: 'Side' };
export const ROLE_PLURAL: Record<ComponentRole, string> = { base: 'Bases', protein: 'Proteins', topping: 'Toppings', sauce: 'Sauces and dressings', side: 'Sides' };

export interface RestaurantProvenance {
  kind: 'official';
  publisher: string;            // e.g. "Chipotle Mexican Grill"
  sourceUrl: string;            // the official document or page, on the restaurant's own domain
  documentTitle: string;
  documentDate: string | null;  // as printed on the document; null when it states none
  documentVersion: string | null;
  retrievedAt: string;          // ISO with the America/New_York offset
  sha256: string | null;        // of the saved source file, when one was saved
  permission: string;           // who granted written permission to republish, and when (required by their terms)
}
export interface CrossContact { text: string; allergens: string[] }  // verbatim statement + which allergen flags it covers
export interface PlaceHours { text: string; sourceUrl: string }

export interface RestaurantComponent {
  item: MenuItem;               // id is "<restaurant>:<component id>"
  role: ComponentRole;
  serving: string | null;       // as published, e.g. "4 oz"
  /** An extra serving ONLY where the restaurant's own data defines one. "added" = values of the added amount;
   *  "total" = values of the whole doubled serving. Never computed by multiplying. */
  extra: { item: MenuItem; kind: 'added' | 'total'; serving: string | null } | null;
}
export interface RestaurantPreset {
  id: string; name: string; componentIds: string[];
  /** The preset's own published totals, when the restaurant publishes them. */
  nutrition: { calories: number | null; protein: number | null; fat: number | null; carbs: number | null } | null;
}
export interface RestaurantMenu {
  id: RestaurantId;
  name: string;
  provenance: RestaurantProvenance;
  components: RestaurantComponent[];
  presets: RestaurantPreset[];
  crossContact: CrossContact[];
  hours: PlaceHours | null;
  notes: string[];              // import notes shown with the provenance
}

export const HOURS_UNKNOWN = 'Hours unknown: check with the restaurant before you go.';
export const NATIONAL_MENU_NOTE = 'This is the restaurant’s national published menu. The Franklin Street store may not carry every item, recipes can change, and prices are not included.';
export const NOT_AFFILIATED = (name: string) => `${name} is named only to identify it. Hungry Heels is not affiliated with, endorsed by or sponsored by ${name}.`;

export function componentById(menu: RestaurantMenu, id: string): RestaurantComponent | undefined {
  return menu.components.find(c => c.item.id === id || c.item.id === `${menu.id}:${id}`);
}
