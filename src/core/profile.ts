import type { FoodCat } from './foods.ts';

export type PatternId = 'none' | 'vegetarian' | 'pescatarian' | 'vegan' | 'animal_based' | 'carnivore';
export const PATTERN_LABELS: Record<PatternId, string> = {
  none: 'No specific diet', vegetarian: 'Vegetarian', pescatarian: 'Pescatarian', vegan: 'Vegan', animal_based: 'Animal-based', carnivore: 'Carnivore',
};
export const PATTERN_DEFINITIONS: Record<PatternId, string> = {
  none: 'No food-type rules. Your allergies and avoid list still apply.',
  vegetarian: 'No meat, poultry, fish, shellfish or slaughter-derived ingredients (such as gelatin). Dairy and eggs are allowed.',
  pescatarian: 'No meat or poultry. Fish and shellfish are allowed. Dairy and eggs are included by default (you can turn them off).',
  vegan: 'No meat, fish, shellfish, dairy, eggs, honey or other animal-derived ingredients.',
  animal_based: 'Animal foods plus dairy, eggs, honey and fruit. Plain vegetables, grains, legumes and nuts/seeds are excluded by default (you can change this). Definitions of "animal-based" vary; this is the app’s own default.',
  carnivore: 'Animal foods only: meat, poultry, fish, shellfish, eggs and dairy. Excludes fruit, vegetables, grains, legumes, nuts/seeds and honey. Seasonings such as salt, pepper, spices and cooking oil are ignored.',
};

export const ANIMAL_BASED_DEFAULT_EXCLUDED: FoodCat[] = ['grains', 'legumes', 'vegetables', 'nuts_seeds'];
export const ANIMAL_BASED_DEFAULT: FoodCat[] = ['dairy', 'egg', 'honey', 'fruit'];

export type AllergenId = 'milk' | 'egg' | 'wheat' | 'soy' | 'sesame' | 'fish' | 'shellfish' | 'peanut' | 'tree_nut';
export const ALLERGEN_IDS: AllergenId[] = ['milk', 'egg', 'wheat', 'soy', 'sesame', 'fish', 'shellfish', 'peanut', 'tree_nut'];
export const ALLERGEN_LABELS: Record<AllergenId, string> = {
  milk: 'Milk', egg: 'Egg', wheat: 'Wheat', soy: 'Soy', sesame: 'Sesame', fish: 'Fish', shellfish: 'Shellfish', peanut: 'Peanut', tree_nut: 'Tree nuts',
};

export interface MacroTargets { calories?: number; protein?: number; fat?: number; carbs?: number }

export interface Profile {
  pattern: PatternId;
  allowDairy: boolean;               // pescatarian default true
  allowEgg: boolean;                 // pescatarian default true
  animalBasedExcluded: FoodCat[];    // editable
  allergens: AllergenId[];           // strict
  avoidGluten: boolean;              // strict
  avoidDairy: boolean;               // strict (intolerance)
  avoidEgg: boolean;                 // strict
  avoidIngredients: string[];        // strict, free text
  halalStyle: boolean;               // strict: no pork or alcohol ingredients (not a certification)
  calorieCap: number;                // per meal, applied when calories are known
  targets: MacroTargets;             // per meal
  maxPortion: 1 | 2 | 3;
  daily?: MacroTargets;              // optional whole-day targets for the day planner
}

export function defaultProfile(pattern: PatternId = 'none'): Profile {
  return {
    pattern, allowDairy: true, allowEgg: true, animalBasedExcluded: [...ANIMAL_BASED_DEFAULT_EXCLUDED],
    allergens: [], avoidGluten: false, avoidDairy: false, avoidEgg: false, avoidIngredients: [], halalStyle: false,
    calorieCap: 1000, targets: {}, maxPortion: 3,
  };
}
