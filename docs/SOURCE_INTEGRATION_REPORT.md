# Source integration report

| Source | Kind | Status | Notes |
|---|---|---|---|
| dining.unc.edu location pages saved by hand (Chase, 32 days, Nov 9 to Dec 10 2026) | official page, user-saved, not verified by UNC | Built in | 28 days with menus (261 to 311 items), 4 days with no menu posted (Nov 25 to 28). Item ingredients, allergens, diet labels and period hours are read from the page. **No nutrition in the page.** |
| dining.unc.edu Top of Lenoir pages saved by hand (31 days, Nov 10 to Dec 10 2026) | official page, user-saved, not verified by UNC | Built in | 27 days with menus (221 to 325 items), 4 days with no menu posted (Nov 25 to 28). **Nov 9 was not saved.** Every item has ingredient text. |
| Eat UNC copy of Nov 5 (third-party) | third party | Built in | 622 entries (331 Chase, 291 Lenoir) recovered from the student's original HungryHeels build and stored in `data/eatunc-2026-11-05.txt`. Calories and protein only (no fat, carbs, ingredients or allergens). Borrowed onto items only for the same hall + exact normalized name where all entries agree; 11 names with disagreeing duplicate values (e.g. Quinoa, White Bread at Chase; Edamame at Lenoir) stay unknown. Coverage: about 31% of Chase and 35% of Lenoir unique items. Every borrowed value carries a visible warning. |
| Official Carolina Dining nutrition export | official | Importer built, **no file yet** | CSV (comma, semicolon or tab) or JSON. Column names are flexible (`name`/`recipe name`, `recipe_id`, `location`, `calories`, `protein`, `total fat`, `total carbohydrate`), units like “12 g” are accepted, “<1”/“NA” stay unknown. Matched by recipe id, then exact name (same hall); disagreeing duplicate names stay unknown; implausible rows are skipped. Badge: **Official**. Highest priority. |
| Entered by you (UNC's item panel) | official values, typed by the student | Built | Per hall + recipe id, so it applies to every day that item is served. Stored only in the browser. Badge: **Entered by you**. Beats Eat UNC, loses to an official export. Implausible entries are refused. |

## Top of Lenoir period oddities (as saved; not guessed, not verified live)
- Days whose saved page has **no Dinner tab**: Fri Nov 13 (Breakfast, a 10:30-11am "Brunch", Lunch), Sat Nov 14 and Sat Nov 21 (Continental + Brunch only), Fri Nov 20 (Breakfast + Lunch only), Sat Dec 5 (Continental + Brunch to 4pm). The earlier Nov 6 file (a Friday, not in this repo) also had no Dinner tab, so Lenoir may close early before breaks and on some weekend days.
- One-off hours: Sun Nov 29 is Dinner-only (5pm-8:30pm); Thu Dec 3 adds Late Night (9pm-12am) and Dinner ends 8pm; Fri Dec 4 Dinner is 5pm-7pm.
- These come from the saved pages. The app shows exactly these tabs; if the live site shows a period that is missing here, re-save that day and re-import it.

## Common-sense rules (added Nov 10)
- **Implausible nutrition is ignored, never corrected.** A borrowed value is dropped (item shows "unknown" with the reason) when it is a bulk catering item, over 1,500 kcal or 100 g protein for one serving, or when protein alone would exceed the stated calories. This removes Eat UNC's Swiss Cheese (1,780 kcal / 136 g) and "Blue Cheese Dressing - Catering" (4,750 kcal).
- **Run-together ingredient words** (e.g. "smokedcucumbercheese") are also searched for foods, so hidden ingredients still count. This only ever makes rules stricter.
- **Sides must be real sides.** Garnishes and single toppings (seeds, nuts, scallions, bacon bits, raisins, raw onions, olives, shredded cheese) are never sides. Deli slices and salad-bar proteins are allowed but ranked last. Plain rice/pasta/noodles are sides, never mains. Catering items are never used.
- **Sensible plates:** no two sides of the same kind (two yogurts, two potato dishes, two fruits), sides vary across ideas, and soups rank below entrées.

## Data quirks found in the real pages
- UNC labels and allergen lists sometimes contradict each other: "Mahi Mahi with Mango Salsa" is labeled vegan but lists fish; "Cajun Tofu Po Boy" is labeled vegan but flagged for milk; "Wheat Bread Slice" is labeled vegan but flagged for milk. The engine believes the allergen list and ingredient text over a label.
- Some ingredient text is run together by the page ("agentcornstarch"); those items may be excluded more often than strictly necessary, which is the safe direction.
- Period hours are published in the tab label (e.g. "Dinner (5pm-8pm)"). Periods with no hours are shown as "Serving time unverified".

## Strictness fixes (added Nov 11)
- **Safe phrases are scoped by food category.** Phrases like “peanut butter” (not dairy) used to be removed from the ingredient text for *every* check, which hid peanut from a peanut-allergy check when UNC's allergen flag was missing. The same applied to “almond milk”, “almond flour”, “soybean oil”, “soy lecithin”, “milk chocolate”, “egg noodles”, “cream of wheat”, “sesame oil” and run-together “buttermilk”. Each phrase now only counts as safe for the categories it is a false positive for. “Bell peppers” and “tomato paste” now count as vegetables for carnivore.
- **Custom avoids never strip safe phrases** (“garlic” catches “garlic powder”, “peanut” catches “peanut butter”), match plurals (“berry”/“berries”), common synonyms (cilantro/coriander leaves, chickpea/garbanzo, shrimp/prawn, mushroom/portobello…), food-group words (“pork” = bacon, ham, sausage…; “beef” = brisket, steak… but not chicken) and run-together words. All of these only make rules stricter. The built-in preset audit still finds a meal for every preset on every day.

## Known gaps
- No official nutrition yet: fat and carbs are unknown for every built-in item; calories/protein only where Eat UNC's Nov 5 listing matched.
- Lenoir 2026-11-09 was never saved; nothing is built in after 2026-12-10.
- Eat UNC names with disagreeing duplicate values (e.g. Quinoa, White Bread at Chase; Edamame at Lenoir) stay unknown.
- Tested in headless Chromium only. Not tested in real Safari on macOS or iOS, and Firefox / WebKit could not be downloaded in the build environment.
