# Hungry Heels: notes for Claude

Unofficial, unaffiliated meal picker for UNC dining menus the user saves by hand. Read README.md first.

Hard rules (never break):
- Never invent menu items, ingredients, nutrition, allergens, hours or dates. Missing = `null`/"unknown", never 0 and never "free of".
- Never scrape or fetch dining.unc.edu. The app only parses files the user hands it.
- Never say "allergy-safe" or claim certification. Keep the disclaimer: "Menus can change and data may be incomplete. If you have an allergy, confirm with dining staff. Not medical advice."
- Never loosen diet rules to make a result appear. Strict avoids (allergy, gluten/dairy/egg, custom, halal-style) exclude uncertain items.
- UNC's own labels can contradict its allergen list (real examples exist). Allergen declarations and ingredient lists override labels.
- All dates/times are America/New_York.

Workflow: `npm install`, `npm run check` (typecheck + tests), `npm run build` (regenerates index.html and HungryHeels.html; commit them). `npm run build:seed -- <folder of saved pages>` regenerates src/client/seed-data.ts.
Add a test for every bug you fix.
