# Hungry Heels

An **unofficial, independent, unaffiliated** meal picker for the Chase and Top of Lenoir dining halls at UNC-Chapel Hill. It is not endorsed by UNC-Chapel Hill or Carolina Dining Services, and it uses no UNC logos or trademarks. It also lists two Franklin Street restaurants, **Sweetgreen** and **Chipotle**, by name only: it is not affiliated with, endorsed by or sponsored by either, and uses no logos, brand colors or trade dress.

> Menus can change and data may be incomplete. If you have an allergy, confirm with dining staff. Not medical advice.

Live site: https://hungryheels.github.io/

## What it does
A three-page website (links in the header; the address keeps the hall, date, meal and open dish, so Back/Forward, bookmarks and shared links work):

- **Today** (`#/`): first-time visitors see a short landing section (what it is, how it works, the strictness promise, what data it has and lacks, privacy, FAQ) with the diet question built in; it reopens from the footer link “About Hungry Heels” (`#/?about=1`). After that, pick a hall, date and meal and get **one complete meal** that fits your rules (a main plus sides), with “Another idea”, Save and Share. Beside it: the same meal at the other hall, and your rules. “Whole day” plans breakfast, lunch and dinner against daily targets. Details on the card list every rule with the evidence that decided it, and a “Report a wrong result” link (a prefilled GitHub issue; nothing is sent unless you submit it).
- **Places**: the picker on Today and Menus has Chase, Top of Lenoir, Sweetgreen and Chipotle (`#/?place=chipotle`). A restaurant has no dates or meal periods; it shows one build-your-own bowl (one base, one protein or none, up to three toppings, at most one sauce) from the restaurant's own published components, its published bowls that fit, “Hours unknown: check with the restaurant”, and a note that the national menu may differ at the Franklin Street store. **Sweetgreen** uses its official page for the 122 East Franklin Street store (57 published items, official hours) under recorded permission; it recommends one published menu item, not a custom bowl. Restaurant picks can be saved (they're re-checked against your rules on Me), and the dining-hall Today page has an “On Franklin Street” card with the best pick there. **Chipotle** uses Chipotle's own US nutrition sheet (a static PDF on chipotle.com) and its allergens page, with the official hours and address of 301 W Franklin St; it builds a bowl from the published components (see `docs/RESTAURANTS.md`).
- **Menus** (`#/menus`): every item on the saved menu with search and filters, each marked Fits / Unsure / Not for you; tap one for ingredients, allergens, nutrition and why. “Update menus” (`#/menus?view=update`) imports saved pages or a whole folder, shows what changed per day and a next-14-days checklist, and takes an official nutrition file.
- **Me** (`#/me`): diet, allergies and strict avoids, goals (per meal and per day), saved meals (re-checked against your current rules), profiles (share link, JSON export/import), display (theme, large text, high contrast), privacy.

Strictness: Big 9 allergens, gluten, dairy, egg, any custom ingredient (with plurals, synonyms and food groups) and “no pork or alcohol” are strict. If an item can't be confirmed free of something you avoid, it is **never** recommended. Fallbacks may change the meal's structure or period, never the rules, and the page says when one was used. A “Confirm with staff” box appears when anything is uncertain or you have an allergy set. Unknown nutrition makes totals minimums (“280+ cal”); nothing is guessed.

Works offline once opened from https://hungryheels.github.io/ (same-origin cache). `HungryHeels.html` is the same site as one file you can open from disk; it makes no requests. Design decisions are in `DESIGN.md`.

## Where the data comes from (and what it lacks)
The menus come from pages saved by hand in Safari (File > Save As > Web Archive). The app never contacts dining.unc.edu (its robots.txt disallows automated access to the date pages).
A saved page contains item names, stations, meal periods and hours, ingredient text, and UNC's allergen and diet labels. **It does not contain calories, protein, fat or carbs**; UNC loads those only when you tap an item. Nutrition comes, in this order of trust, from: an official export you import (CSV or JSON) > numbers you type in from UNC's item panel (“entered by you”, stored only in your browser) > a hand-transcribed Eat UNC (third-party) listing from Nov 5, 2026 (`data/eatunc-2026-11-05.txt`, calories and protein only, about a third of items). Fat and carbs are not published anywhere yet (see `docs/EMAIL_TO_DIETITIAN.md`).

**Estimates (marked “~”).** Where a number is missing, the site shows an estimate: the dish is matched by name (or its main ingredient) to a reference food with typical per-100 g values in the style of USDA FoodData Central, times a typical dining-hall serving. When a dish's calories are published, the estimate is scaled to them, so estimated fat and carbs agree. The reference values were written from general knowledge of the USDA tables, not looked up item by item (fdc.nal.usda.gov was not reachable from the build environment). Serving sizes were tuned against the 499 dishes with Eat UNC numbers; on those, the median calorie error is 30%, half are within 30%, about three quarters within 50%, and the median protein error is 2 g (measured on the same data used for tuning, so real accuracy is likely a little worse). Estimates never replace a published number, never decide allergy or diet rules, and can be turned off on Me › Goals.

Built in:
- **Chase**, 2026-11-09 to 2026-12-10: 28 days with menus; Nov 25 to 28 had no menu posted.
- **Top of Lenoir**, 2026-11-10 to 2026-12-10: 27 days with menus; Nov 25 to 28 had no menu posted; **Nov 9 was never saved**. Some Lenoir days have no Dinner tab in the saved page (Nov 13, 14, 20, 21 and Dec 5); the app shows exactly the periods the page contains and never guesses a missing one.
- Nothing is built in after **Dec 10, 2026**.

**Sweetgreen: built in** from https://www.sweetgreen.com/nutrition/chapel-hill (last updated Nov 12, 2026), with the permission the owner provided recorded in `data/restaurants/sweetgreen/source.json` (unofficial, personal use only). Sweetgreen's kitchen-wide cross-contamination statement means no item is recommended to anyone with an allergy or strict avoid. **Chipotle: built in** from its US nutrition sheet (OCT-2024-US-CK) and chipotle.com/allergens. No per-item allergen list is published in a usable file and Chipotle says foods may come into contact during preparation, so it recommends nothing to anyone with an allergy or strict avoid. Each restaurant page links to the restaurant's own nutrition and allergen page instead. Permission requests to send: `docs/EMAIL_TO_RESTAURANTS.md`. A “may contain” or shared-equipment statement counts as uncertain, so strict avoids exclude those items. Steps: `docs/RESTAURANTS.md`.

## How to refresh a day
1. On a Mac, open dining.unc.edu in Safari > Locations > Chase or Top of Lenoir, choose the date, wait for the menu to load.
2. File > Save As, Format: **Web Archive**. Repeat for each date; put the files in one folder.
3. Open Hungry Heels > Menus > **Update menus** > **Choose a folder** (or drag the folder in, or choose files). Hall and date are read from inside each page, so file names don't matter; other files are skipped, and if a folder has two saves of the same day the newer one is used.
4. Check each day's **What changed** (new / gone / changed items, period and hour changes) and the **Next 14 days** checklist: Missing, Stale (saved 7+ days before a date that hasn't happened yet), No menu (re-save later).
5. To make days permanent for everyone: `npm run build:seed -- <folder>` then `npm run build`, and commit `src/client/seed-data.ts`, `index.html`, `HungryHeels.html` and `web/`.

## Develop
```
npm install
npm run check      # typecheck + unit tests (includes the preset, strict and property audits)
npm run build:restaurants   # checks data/restaurants/ (npm run build also runs it)
npm run build      # writes index.html, HungryHeels.html, web/, sw.js, manifest.webmanifest, icon.svg
npm run e2e        # browser checks with Playwright (Chromium by default; pass firefox / webkit if installed)
```
Zero runtime dependencies. `src/core` is the shared engine (diet rules, meals, planning, trust, refresh); `src/sources` parses pages and nutrition files; `src/client` is the site (`app.ts` shell and router, `view-today.ts`, `view-menus.ts`, `view-me.ts`, `view-sheet.ts` for dish details).

## Docs
`docs/SETUP_GITHUB.md` (publishing and the Claude bug-fix helper), `docs/RESTAURANTS.md` (Sweetgreen and Chipotle data), `docs/EMAIL_TO_RESTAURANTS.md`, `docs/SOURCE_INTEGRATION_REPORT.md`, `docs/DATA_FLOW_AND_PRIVACY.md`, `docs/EMAIL_TO_DIETITIAN.md`.

## License
The code is open source under the MIT license (`LICENSE`). The license does **not** cover data that belongs to others: UNC dining menus, Eat UNC's listing, and Sweetgreen's (or, later, Chipotle's) published information, which are used only as described in `docs/RESTAURANTS.md` and never for money. The site is free, has no ads and charges nothing.
