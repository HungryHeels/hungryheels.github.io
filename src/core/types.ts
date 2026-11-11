// Core data types. Unknown values are always `null` — never 0, never "free of".

export type HallId = 'chase' | 'top-of-lenoir';
export const HALL_NAMES: Record<HallId, string> = { chase: 'Chase', 'top-of-lenoir': 'Top of Lenoir' };

export type SourceKind = 'official' | 'third_party' | 'demo';
export type Verification = 'user_saved_page' | 'official_export' | 'unverified' | 'demo';

export interface Provenance {
  source: string;            // e.g. "dining.unc.edu page saved by you"
  kind: SourceKind;
  retrievedAt: string | null; // ISO time (saved file's modified time) or null if unknown
  verification: Verification;
  fileName?: string;
}

export interface Nutrition {
  calories: number | null;
  protein: number | null;   // grams
  fat: number | null;       // grams
  carbs: number | null;     // grams
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;   // mg
  borrowed?: boolean;       // true if copied from a third-party listing
  source?: NutritionSource; // where the values came from; absent/null = none published
  sourceLabel?: string;     // plain-language source, e.g. "official Carolina Dining export (imported Nov 12)"
  /** A labeled estimate used only where a published value is missing (see core/estimate.ts). Never a published value. */
  estimate?: import('./estimate.ts').Estimate | null;
}
/** official = an official export; user = typed in by the student from UNC's item panel ("entered by you");
 *  third_party = Eat UNC's listing (borrowed). */
export type NutritionSource = 'official' | 'user' | 'third_party';

export interface DietLabels {
  vegan: boolean;
  vegetarian: boolean;
  halal: boolean;
  madeWithoutGluten: boolean;
}

export interface MenuItem {
  id: string;                 // UNC recipe id
  name: string;
  ingredients: string | null; // flattened ingredient text; null when empty
  allergens: string[];        // normalized: milk egg wheat soy sesame fish shellfish peanut tree_nut
  labels: DietLabels;
  nutrition: Nutrition;
  warnings: string[];
}

export interface Station { name: string; itemIds: string[] }

export interface Period {
  name: string;               // "Dinner"
  hours: string | null;       // "5pm-8pm" as published
  startMin: number | null;    // minutes after midnight, America/New_York
  endMin: number | null;
  stations: Station[];
}

export interface MenuDay {
  hall: HallId;
  date: string;               // YYYY-MM-DD, America/New_York
  periods: Period[];
  items: Record<string, MenuItem>;
  provenance: Provenance;
  noMenuPosted: boolean;      // valid page, date present, zero periods/items
  notes: string[];
}

export interface ImportNote { level: 'info' | 'warn' | 'error'; text: string }
