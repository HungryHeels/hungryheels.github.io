# Source integration report

| Source | Kind | Status | Notes |
|---|---|---|---|
| dining.unc.edu location pages saved by hand (Chase, 32 days, Nov 9 to Dec 10 2026) | official page, user-saved, not verified by UNC | Built in | 28 days with menus (261 to 311 items), 4 days with no menu posted (Nov 25 to 28). Item ingredients, allergens, diet labels and period hours are read from the page. **No nutrition in the page.** |
| dining.unc.edu Top of Lenoir | official page, user-saved | Not built in | Only 2026-11-06 was saved earlier and it is not in this repo. Import via You > Menu data. That file had no Dinner tab; the reason is unknown. Compare the tabs the app finds with the live site before assuming a dinner exists. |
| Eat UNC copy of Nov 5 (third-party) | third party | Not available | The hand-transcribed file `data/eatunc-2026-11-05.txt` was not available when this repo was rebuilt, so no nutrition is borrowed. Format when supplied: `hall | name | calories | protein` per line. Borrowing happens only for the same hall, exact normalized name, and when all entries agree. |
| Official Carolina Dining nutrition export | official | Importer built, no file yet | CSV with `hall, name, calories, protein, fat, carbs, recipe_id`. Provenance becomes `official_export`. |

## Data quirks found in the real pages
- UNC labels and allergen lists sometimes contradict each other: "Mahi Mahi with Mango Salsa" is labeled vegan but lists fish; "Cajun Tofu Po Boy" is labeled vegan but flagged for milk; "Wheat Bread Slice" is labeled vegan but flagged for milk. The engine believes the allergen list and ingredient text over a label.
- Some ingredient text is run together by the page ("agentcornstarch"); those items may be excluded more often than strictly necessary, which is the safe direction.
- Period hours are published in the tab label (e.g. "Dinner (5pm-8pm)"). Periods with no hours are shown as "Serving time unverified".
