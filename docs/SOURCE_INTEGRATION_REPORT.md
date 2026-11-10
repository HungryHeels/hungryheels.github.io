# Source integration report

| Source | Kind | Status | Notes |
|---|---|---|---|
| dining.unc.edu location pages saved by hand (Chase, 32 days, Nov 9 to Dec 10 2026) | official page, user-saved, not verified by UNC | Built in | 28 days with menus (261 to 311 items), 4 days with no menu posted (Nov 25 to 28). Item ingredients, allergens, diet labels and period hours are read from the page. **No nutrition in the page.** |
| dining.unc.edu Top of Lenoir pages saved by hand (31 days, Nov 10 to Dec 10 2026) | official page, user-saved, not verified by UNC | Built in | 27 days with menus (221 to 325 items), 4 days with no menu posted (Nov 25 to 28). **Nov 9 was not saved.** Every item has ingredient text. |
| Eat UNC copy of Nov 5 (third-party) | third party | Built in | 622 entries (331 Chase, 291 Lenoir) recovered from the student's original HungryHeels build and stored in `data/eatunc-2026-11-05.txt`. Calories and protein only (no fat, carbs, ingredients or allergens). Borrowed onto items only for the same hall + exact normalized name where all entries agree; 11 names with disagreeing duplicate values (e.g. Quinoa, White Bread at Chase; Edamame at Lenoir) stay unknown. Coverage: about 31% of Chase and 35% of Lenoir unique items. Every borrowed value carries a visible warning. |
| Official Carolina Dining nutrition export | official | Importer built, no file yet | CSV with `hall, name, calories, protein, fat, carbs, recipe_id`. Provenance becomes `official_export`. |

## Top of Lenoir period oddities (as saved; not guessed, not verified live)
- Days whose saved page has **no Dinner tab**: Fri Nov 13 (Breakfast, a 10:30-11am "Brunch", Lunch), Sat Nov 14 and Sat Nov 21 (Continental + Brunch only), Fri Nov 20 (Breakfast + Lunch only), Sat Dec 5 (Continental + Brunch to 4pm). The earlier Nov 6 file (a Friday, not in this repo) also had no Dinner tab, so Lenoir may close early before breaks and on some weekend days.
- One-off hours: Sun Nov 29 is Dinner-only (5pm-8:30pm); Thu Dec 3 adds Late Night (9pm-12am) and Dinner ends 8pm; Fri Dec 4 Dinner is 5pm-7pm.
- These come from the saved pages. The app shows exactly these tabs; if the live site shows a period that is missing here, re-save that day and re-import it.

## Data quirks found in the real pages
- UNC labels and allergen lists sometimes contradict each other: "Mahi Mahi with Mango Salsa" is labeled vegan but lists fish; "Cajun Tofu Po Boy" is labeled vegan but flagged for milk; "Wheat Bread Slice" is labeled vegan but flagged for milk. The engine believes the allergen list and ingredient text over a label.
- Some ingredient text is run together by the page ("agentcornstarch"); those items may be excluded more often than strictly necessary, which is the safe direction.
- Period hours are published in the tab label (e.g. "Dinner (5pm-8pm)"). Periods with no hours are shown as "Serving time unverified".
