# Hungry Heels

An **unofficial, independent, unaffiliated** meal picker for the Chase and Top of Lenoir dining halls at UNC-Chapel Hill. It is not endorsed by UNC-Chapel Hill or Carolina Dining Services, and it uses no UNC logos or trademarks.

> Menus can change and data may be incomplete. If you have an allergy, confirm with dining staff. Not medical advice.

Live site (after you turn on GitHub Pages): https://hungryheels.github.io/

## What it does
- Pick a diet (Vegetarian, Pescatarian, Vegan, Animal-based, Carnivore, or none) and get **one complete meal**: a main plus sides.
- Strict avoids: Big 9 allergens, gluten, dairy, egg, any custom ingredient, and "no pork or alcohol". If an item can't be confirmed free of something you avoid, it is **never** recommended.
- Macro targets per meal (calories cap, protein, fat, carbs) with optional 2x/3x portions so a meal can reach your numbers when few items fit your diet.
- "Another idea (n of N)", a browsable list of every item with why it fits or not, and a clear source and "saved at" time on everything.

## Where the data comes from (and what it lacks)
The menus come from pages the author saved by hand in Safari (File > Save As > Web Archive). The app never contacts dining.unc.edu (its robots.txt disallows automated access to the date pages).
A saved page contains item names, stations, meal periods and hours, ingredient text, and UNC's allergen and diet labels. **It does not contain calories, protein, fat or carbs**; UNC loads those only when you tap an item. Those values therefore show as **unknown** until you import an official nutrition export (see `docs/EMAIL_TO_DIETITIAN.md`) or an Eat UNC copy.

Built in: Chase, 2026-11-09 to 2026-12-10 (28 days with menus; Nov 25 to 28 had no menu posted). Top of Lenoir has no built-in days yet; import saved pages in **You > Menu data**.

## Add or refresh a day
1. On a Mac, open dining.unc.edu > Locations > Chase or Top of Lenoir, choose the date, wait for it to load.
2. File > Save As, Format: Web Archive.
3. Open Hungry Heels > You > Menu data > Choose saved pages (or drag the files in). The hall and date are read from inside each file, so file names don't matter. Re-importing a day replaces it.
4. To make a day permanent for everyone, run `npm run build:seed -- <folder>` then `npm run build`, and commit.

## Develop
```
npm install
npm run check      # typecheck + tests
npm run build      # writes index.html, HungryHeels.html, web/
```
Zero runtime dependencies. `src/core` is the shared engine; `src/sources` parses pages (binary plist reader included); `src/client` is the UI.

## Docs
`docs/SETUP_GITHUB.md` (publishing and the Claude bug-fix helper), `docs/SOURCE_INTEGRATION_REPORT.md`, `docs/DATA_FLOW_AND_PRIVACY.md`, `docs/EMAIL_TO_DIETITIAN.md`.
