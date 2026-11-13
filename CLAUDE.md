# Hungry Heels: notes for Claude

Unofficial, unaffiliated meal picker for UNC dining menus the user saves by hand. Read README.md first.

Hard rules (never break):
- Never invent menu items, ingredients, allergens, hours or dates. Missing = `null`/"unknown", never 0 and never "free of".
- Nutrition (owner's decision, Nov 11): published values stay in the `calories/protein/fat/carbs` fields and missing ones stay `null`. Labeled ESTIMATES (src/core/estimate.ts) may fill gaps in `nutrition.estimate` only: always marked "~"/"estimate" with their basis, never written into the published fields, never used for diet/allergy/avoid rules, and switchable off (`profile.useEstimates`). Keep the calibration test honest; don't tune it to pass.
- Never scrape or fetch dining.unc.edu. The app only parses files the user hands it.
- Never say "allergy-safe" or claim certification. Keep the disclaimer: "Menus can change and data may be incomplete. If you have an allergy, confirm with dining staff. Not medical advice."
- Never loosen diet rules to make a result appear. Strict avoids (allergy, gluten/dairy/egg, custom, halal-style) exclude uncertain items.
- UNC's own labels can contradict its allergen list (real examples exist). Allergen declarations and ingredient lists override labels.
- All dates/times are America/New_York.
- Restaurants (Sweetgreen, Chipotle): only their own officially published nutrition/allergen info, saved by hand into data/restaurants/<id>/ with provenance (docs/RESTAURANTS.md). Their terms forbid copying without written permission; data is added only with a permission record in source.json (Sweetgreen has one; conditions: unofficial, personal use, no charge/ads). Never call ordering systems or APIs (Chipotle's data is only there). Never fetch their sites unless robots.txt and terms were read and allow it; never scrape ordering systems or APIs. "May contain"/shared-equipment statements are uncertain (strict avoids exclude them). No logos or brand colors. Fixtures in test/fixtures/restaurants/ are synthetic and never shipped.

Workflow: `npm install`, `npm run check` (typecheck + tests), `npm run build` (regenerates index.html, HungryHeels.html, web/, sw.js, manifest.webmanifest, icon.svg; commit them), `npm run e2e` (Playwright browser checks; Chromium by default). `npm run build:seed -- <folder of saved pages>` regenerates src/client/seed-data.ts.
Add a test for every bug you fix.
Safe phrases in src/core/foods.ts are scoped per food category; never make one apply to an allergen it contains.
Layout: src/core (engine, meals, plan, trust, refresh, discover, profile-io), src/sources (page + nutrition parsing), src/client (app.ts shell + hash router in router.ts; three pages: view-today.ts, view-menus.ts, view-me.ts; view-sheet.ts dish details; view-restaurant.ts for Sweetgreen/Chipotle). Restaurant model: src/core/restaurant.ts, restaurant-meals.ts; importer src/sources/restaurant-import.ts. Follow DESIGN.md for colors, type, spacing and components.
