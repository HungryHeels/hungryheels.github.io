// Saving, sharing and importing profiles. Everything is validated field by field: an imported or shared
// profile can never smuggle in anything except the documented settings.
import { ALLERGEN_IDS, ANIMAL_BASED_DEFAULT_EXCLUDED, defaultProfile, type AllergenId, type MacroTargets, type PatternId, type Profile } from './profile.ts';
import type { FoodCat } from './foods.ts';

const PATTERNS: PatternId[] = ['none', 'vegetarian', 'pescatarian', 'vegan', 'animal_based', 'carnivore'];
const AB_CATS: FoodCat[] = ['grains', 'legumes', 'vegetables', 'nuts_seeds', 'fruit', 'dairy', 'egg', 'honey'];
const num = (v: unknown, lo: number, hi: number): number | undefined => (typeof v === 'number' && isFinite(v) && v >= lo && v <= hi ? Math.round(v) : undefined);

/** Accept only known fields with valid values. Unknown or bad fields fall back to defaults. Returns null if not a profile at all. */
export function sanitizeProfile(x: unknown): Profile | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (!PATTERNS.includes(o.pattern as PatternId)) return null;
  const p = defaultProfile(o.pattern as PatternId);
  if (typeof o.allowDairy === 'boolean') p.allowDairy = o.allowDairy;
  if (typeof o.allowEgg === 'boolean') p.allowEgg = o.allowEgg;
  if (Array.isArray(o.animalBasedExcluded)) p.animalBasedExcluded = o.animalBasedExcluded.filter((c): c is FoodCat => AB_CATS.includes(c as FoodCat));
  if (Array.isArray(o.allergens)) p.allergens = [...new Set(o.allergens.filter((a): a is AllergenId => ALLERGEN_IDS.includes(a as AllergenId)))];
  for (const k of ['avoidGluten', 'avoidDairy', 'avoidEgg', 'halalStyle'] as const) if (typeof o[k] === 'boolean') p[k] = o[k] as boolean;
  if (Array.isArray(o.avoidIngredients)) p.avoidIngredients = [...new Set(o.avoidIngredients.filter((t): t is string => typeof t === 'string').map(t => t.trim().toLowerCase().slice(0, 60)).filter(Boolean))].slice(0, 60);
  const cap = num(o.calorieCap, 100, 5000); if (cap !== undefined) p.calorieCap = cap;
  if (o.targets && typeof o.targets === 'object') {
    const t = o.targets as Record<string, unknown>; const out: MacroTargets = {};
    const c = num(t.calories, 50, 5000), pr = num(t.protein, 1, 400), f = num(t.fat, 1, 300), cb = num(t.carbs, 1, 800);
    if (c) out.calories = c; if (pr) out.protein = pr; if (f) out.fat = f; if (cb) out.carbs = cb;
    p.targets = out;
  }
  if (o.maxPortion === 1 || o.maxPortion === 2 || o.maxPortion === 3) p.maxPortion = o.maxPortion;
  if (typeof o.useEstimates === 'boolean') p.useEstimates = o.useEstimates;
  if (o.daily && typeof o.daily === 'object') {
    const t = o.daily as Record<string, unknown>; const out: MacroTargets = {};
    const c = num(t.calories, 200, 10000), pr = num(t.protein, 1, 800), f = num(t.fat, 1, 600), cb = num(t.carbs, 1, 1500);
    if (c) out.calories = c; if (pr) out.protein = pr; if (f) out.fat = f; if (cb) out.carbs = cb;
    p.daily = out;
  }
  return p;
}

// ---------- share link (URL fragment only: never sent to any server) ----------
function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s); let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
export function profileToHash(p: Profile, name?: string): string {
  return '#/me?profile=' + b64url(JSON.stringify({ v: 1, name: name?.slice(0, 40), profile: p }));
}
export function profileFromHash(hash: string): { profile: Profile; name: string | null } | null {
  const m = /[#&?]profile=([A-Za-z0-9_-]+)/.exec(hash);
  if (!m) return null;
  try {
    const j = JSON.parse(unb64url(m[1]));
    const profile = sanitizeProfile(j?.profile);
    if (!profile) return null;
    return { profile, name: typeof j.name === 'string' ? j.name.slice(0, 40) : null };
  } catch { return null; }
}

// ---------- JSON export / import ----------
export interface NamedProfile { id: string; name: string; profile: Profile }
export function exportProfiles(list: NamedProfile[]): string {
  return JSON.stringify({ app: 'hungry-heels', kind: 'profiles', version: 1, profiles: list.map(x => ({ name: x.name, profile: x.profile })) }, null, 2);
}
export function importProfiles(text: string): { profiles: Array<{ name: string; profile: Profile }>; errors: string[] } {
  let j: any;
  try { j = JSON.parse(text); } catch { return { profiles: [], errors: ['That file is not valid JSON.'] }; }
  const raw: unknown[] = Array.isArray(j?.profiles) ? j.profiles : j?.pattern ? [{ name: 'Imported', profile: j }] : j?.profile ? [j] : [];
  const out: Array<{ name: string; profile: Profile }> = [];
  for (const r of raw.slice(0, 20)) {
    const o = r as any; const p = sanitizeProfile(o?.profile);
    if (p) out.push({ name: typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 40) : 'Imported', profile: p });
  }
  return { profiles: out, errors: out.length ? [] : ['No profiles were found in that file.'] };
}

// ---------- extra presets (starting points; never medical advice) ----------
export interface ExtraPreset { id: string; name: string; description: string; apply: (p: Profile) => Profile }
/** Common high-FODMAP ingredients, as a strict custom avoid list. A starting point only, not a FODMAP diet. */
export const LOW_FODMAP_STYLE_AVOIDS = ['garlic', 'onion', 'shallot', 'leek', 'wheat', 'rye', 'barley', 'apple', 'pear', 'mango', 'watermelon', 'cherries', 'honey', 'agave',
  'high fructose corn syrup', 'inulin', 'chicory', 'cauliflower', 'mushroom', 'asparagus', 'artichoke', 'beans', 'lentils', 'chickpea', 'cashew', 'pistachio', 'milk', 'ice cream', 'yogurt', 'ricotta', 'cottage cheese'];
export const EXTRA_PRESETS: ExtraPreset[] = [
  { id: 'low_fodmap_style', name: 'Low-FODMAP style avoid list',
    description: `Adds ${LOW_FODMAP_STYLE_AVOIDS.length} common high-FODMAP ingredients (garlic, onion, wheat, milk, beans…) to your strict avoid list. A starting point only: not a FODMAP diet, not medical advice. Ask a dietitian.`,
    apply: p => ({ ...p, avoidIngredients: [...new Set([...p.avoidIngredients, ...LOW_FODMAP_STYLE_AVOIDS])] }) },
  { id: 'high_protein_cut', name: 'High-protein, lower calorie (macro targets)',
    description: 'Per meal: 40 g protein target and a 650 calorie cap; day: 140 g protein, 2000 calories. Only changes targets, never diet rules. Not medical advice.',
    apply: p => ({ ...p, targets: { ...p.targets, protein: 40, calories: undefined }, calorieCap: 650, maxPortion: 2, daily: { ...p.daily, protein: 140, calories: 2000 } }) },
  { id: 'high_protein_bulk', name: 'High-protein, higher calorie (macro targets)',
    description: 'Per meal: 50 g protein and 1100 calorie targets; day: 170 g protein, 3200 calories. Only changes targets, never diet rules. Not medical advice.',
    apply: p => ({ ...p, targets: { ...p.targets, protein: 50, calories: 1100 }, calorieCap: 1300, maxPortion: 3, daily: { ...p.daily, protein: 170, calories: 3200 } }) },
];
export { ANIMAL_BASED_DEFAULT_EXCLUDED };
