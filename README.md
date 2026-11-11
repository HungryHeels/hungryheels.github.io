# Hungry Heels

An **unofficial, independent, unaffiliated** meal picker for the Chase and Top of Lenoir dining halls at UNC-Chapel Hill. It is not endorsed by UNC-Chapel Hill or Carolina Dining Services, and it uses no UNC logos or trademarks.

> Menus can change and data may be incomplete. If you have an allergy, confirm with dining staff. Not medical advice.

Live site: https://hungryheels.github.io/

## What it does
- **Menu tab.** Pick a diet (Vegetarian, Pescatarian, Vegan, Animal-based, Carnivore, or none) and get **one complete meal**: a main plus sides, with “Another idea”. Each part shows where its nutrition came from (Official / Entered by you / Eat UNC (3rd party) / Not published). Unknown parts make totals a minimum (“280+ cal”). With targets set, the card shows the honest gap (“Protein 32 g of 40 g: 8 g short”), and if nothing meets the targets the closest meal is shown and the app says so.
- **Strict avoids.** Big 9 allergens, gluten, dairy, egg, any custom ingredient (with plurals, synonyms and food groups: “pork” covers bacon and ham, “cilantro” covers coriander leaves), and “no pork or alcohol”. If an item can't be confirmed free of something you avoid, it is **never** recommended. Fallbacks may change the meal's structure or period, never the rules, and the app says when one was used.
- **Trust.** Details lists every rule for the meal and which evidence decided it (UNC allergen list, ingredient text, UNC label, item name). A “Confirm with staff” box appears whenever anything is uncertain, whenever you have an allergy set, and when UNC's own label contradicts its allergen list. “Report a wrong result” opens a prefilled GitHub issue (item, hall, date, your diet rules and the evidence; no name or contact details); nothing is sent unless you submit it.
- **Plan tab.** Best fit right now (compares both halls for the meal being served now or next, with a countdown, including late periods that run past midnight), a breakfast + lunch + dinner planner against daily targets, saved meals (re-checked against your current rules every time) and an optional “what you've had” log that gently varies mains across the week.
- **You tab.** Several profiles, a share link (settings live after the `#`, which browsers never send to a server), JSON export/import, extra starting points (a low-FODMAP-style avoid list; high-protein cut/bulk macro targets; none are medical advice), nutrition goals, display settings (theme, large text, high contrast) and Menu data.
- Works offline once opened from https://hungryheels.github.io/ (a same-origin cache; it never contacts another site). `HungryHeels.html` is the same app as one file you can open from disk; it makes no requests at all.

## Where the data comes from (and what it lacks)
The menus come from pages saved by hand in Safari (File > Save As > Web Archive). The app never contacts dining.unc.edu (its robots.txt disallows automated access to the date pages).
A saved page contains item names, stations, meal periods and hours, ingredient text, and UNC's allergen and diet labels. **It does not contain calories, protein, fat or carbs**; UNC loads those only when you tap an item. Nutrition comes, in this order of trust, from: an official export you import (CSV or JSON) > numbers you type in from UNC's item panel (“entered by you”, stored only in your browser) > a hand-transcribed Eat UNC (third-party) listing from Nov 5, 2026 (`data/eatunc-2026-11-05.txt`, calories and protein only, about a third of items). Fat and carbs stay **unknown** until a real source exists (see `docs/EMAIL_TO_DIETITIAN.md`).

Built in:
- **Chase**, 2026-11-09 to 2026-12-10: 28 days with menus; Nov 25 to 28 had no menu posted.
- **Top of Lenoir**, 2026-11-10 to 2026-12-10: 27 days with menus; Nov 25 to 28 had no menu posted; **Nov 9 was never saved**. Some Lenoir days have no Dinner tab in the saved page (Nov 13, 14, 20, 21 and Dec 5); the app shows exactly the periods the page contains and never guesses a missing one.
- Nothing is built in after **Dec 10, 2026**.

## How to refresh a day
1. On a Mac, open dining.unc.edu in Safari > Locations > Chase or Top of Lenoir, choose the date, wait for the menu to load.
2. File > Save As, Format: **Web Archive**. Repeat for each date; put the files in one folder.
3. Open Hungry Heels > You > Menu data > **Choose a folder** (or drag the folder in, or choose files). Hall and date are read from inside each page, so file names don't matter; other files are skipped, and if a folder has two saves of the same day the newer one is used.
4. Check each day's **What changed** (new / gone / changed items, period and hour changes) and the **Next 14 days** checklist: Missing, Stale (saved 7+ days before a date that hasn't happened yet), No menu (re-save later).
5. To make days permanent for everyone: `npm run build:seed -- <folder>` then `npm run build`, and commit `src/client/seed-data.ts`, `index.html`, `HungryHeels.html` and `web/`.

## Develop
```
npm install
npm run check      # typecheck + unit tests (includes the preset, strict and property audits)
npm run build      # writes index.html, HungryHeels.html, web/, sw.js, manifest.webmanifest, icon.svg
npm run e2e        # browser checks with Playwright (Chromium by default; pass firefox / webkit if installed)
```
Zero runtime dependencies. `src/core` is the shared engine (diet rules, meals, planning, trust, refresh); `src/sources` parses pages and nutrition files; `src/client` is the UI (`app.ts` shell plus one `view-*.ts` per screen).

## Docs
`docs/SETUP_GITHUB.md` (publishing and the Claude bug-fix helper), `docs/SOURCE_INTEGRATION_REPORT.md`, `docs/DATA_FLOW_AND_PRIVACY.md`, `docs/EMAIL_TO_DIETITIAN.md`.
