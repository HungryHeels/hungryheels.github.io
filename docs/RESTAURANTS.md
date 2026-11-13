# Franklin Street restaurants: Sweetgreen and Chipotle

Status (Nov 12, 2026, New York time): **blocked by the restaurants' terms of use; waiting for written permission.**
The place picker, importer, bowl builder and audits are built and tested, but no Sweetgreen or Chipotle data is in
the app. Both places show “No … data yet” and recommend nothing. Nothing from either site was downloaded or copied.

## Why there is no data
The rule for these places: use only each restaurant's **own officially published** nutrition and allergen
information, and before downloading anything read the site's `robots.txt` and terms of use; fetch only if both allow
it. On Nov 12, 2026 (about 8 pm New York time) both were read, after the two hosts were allowed in the cloud
environment's network settings:

| | robots.txt | Terms of use | Result |
|---|---|---|---|
| Sweetgreen (https://www.sweetgreen.com/terms) | Allows everything (`User-agent: *`, no Disallow) | §7.1: a limited license “solely for your personal non-commercial purposes”. §8(e): “you shall not use any manual or automated software, devices or other processes … to ‘scrape’ or download data from the Services”. §8(g): “no part of Services may be copied, reproduced, distributed, republished, downloaded, displayed, posted or transmitted in any form or by any means”. | **Not allowed** |
| Chipotle (https://www.chipotle.com/terms-of-use) | Allows everything except `/error-page` (file dated Aug 6, 2026) | “Access to the Services”: use “solely for your personal, noncommercial use” and “you will not copy or distribute any part of the Services in any medium without Chipotle’s prior written authorization”. Chipotle Content “is not to be copied, distributed, displayed, reproduced, or transmitted in any form, by any means, without the prior express written consent of Chipotle”. | **Not allowed** |

Publishing either restaurant's nutrition or allergen tables on a public website (GitHub Pages) would be copying,
distributing and displaying their content. That is true whether a tool downloads it or a person types it in by hand,
so **saving the files by hand does not get around this**. The data stays out until a restaurant gives written
permission (requests to send: `docs/EMAIL_TO_RESTAURANTS.md`). Facts such as a single number may not be protected the
same way everywhere, but this project does not rely on that: the terms say no, so the answer is no until they say yes.

Meanwhile, each restaurant page links to the restaurant's own nutrition and allergen page (found from the links on
their own sites, Nov 12, 2026): Sweetgreen https://www.sweetgreen.com/nutrition (“Nutrition + Allergens Guide”),
Chipotle https://www.chipotle.com/nutrition-calculator (“Nutrition”). A link copies nothing; the app never fetches it.

If permission arrives, keep the email (or a note of who granted it and when) next to the data, record it in
`source.json` (`"permission"`, below), and only then follow the steps below.

## What to save, and where (only after written permission)
For each restaurant, save the official document by hand in a browser (File > Save As / Download), then transcribe it.

| Restaurant | Save this (from the restaurant's own site) | Put it in |
|---|---|---|
| Sweetgreen | The nutrition and allergen information Sweetgreen publishes for its menu (a nutrition/allergen guide PDF if one is linked from sweetgreen.com, otherwise the official menu pages that list each ingredient's nutrition and allergens). | `data/restaurants/sweetgreen/` |
| Chipotle | Chipotle's published U.S. nutrition facts and its allergen/ingredient statement (linked from chipotle.com; the nutrition calculator page links the downloadable facts). | `data/restaurants/chipotle/` |

The exact document URLs could **not be checked** from the build environment, so they are not hardcoded here: use the
link on the restaurant's own site, and record the URL you actually used. Only a URL on `sweetgreen.com` or
`chipotle.com` (or a subdomain) is accepted. Not acceptable: third-party nutrition sites, delivery apps, screenshots
of an ordering app, numbers from memory.

Folder layout (example for Chipotle):
```
data/restaurants/chipotle/
  README.md               what goes here (already present)
  source.template.json    copy to source.json and fill in
  components.template.csv copy to components.csv and fill in
  source/                 the saved PDF or page (git-ignored by default: it is the restaurant's document)
  source.json             provenance + cross-contact statements + published presets   (you create it)
  components.csv          one row per published component                              (you create it)
```

## source.json
```json
{
  "restaurant": "chipotle",
  "kind": "official",
  "publisher": "Chipotle Mexican Grill",
  "sourceUrl": "https://www.chipotle.com/…the exact link you saved…",
  "documentTitle": "as printed on the document or page",
  "documentDate": "as printed, e.g. \"March 2026\", or null when the document shows no date",
  "documentVersion": null,
  "retrievedAt": "2026-11-20T14:05:00-05:00",
  "sha256": "sha256 of the saved file, or null",
  "hours": null,
  "permission": "who at the restaurant granted written permission, and the date",
  "crossContact": [
    { "text": "the restaurant's own statement, copied word for word", "allergens": "all" }
  ],
  "presets": [
    { "name": "a published bowl or salad", "components": ["component ids"], "nutrition": { "calories": 0, "protein": 0, "fat": 0, "carbs": 0 } }
  ]
}
```
- `retrievedAt` is when you saved the file, in New York time **with the offset New York had that day** (`-05:00` Nov to mid-March, `-04:00` otherwise). The importer checks this.
- `permission`: required in practice: who granted written permission and when (the terms of both restaurants forbid copying without it). Keep the email itself out of the public repo if it has personal details.
- `hours`: leave `null`. Only fill it (`{ "text": "…", "sourceUrl": "https://…" }`) from the restaurant's own page **for the Franklin Street store**. Otherwise the app shows “Hours unknown: check with the restaurant”.
- `crossContact`: every “may contain”, “shared equipment”, “cross-contact” or “we cannot guarantee” statement, word for word, with the allergens it covers (`"all"` when it covers everything). These make the covered allergens *unknown* for every item, so strict avoids exclude them. A blanket `"all"` statement means anyone with an allergy, gluten, dairy or egg avoid gets an honest “No meal fits”.
- `presets`: only bowls/salads the restaurant itself publishes, listing their components by id. `nutrition` only if the restaurant publishes the preset's own totals; omit it otherwise (the app then sums the components and says so). A preset may not use a component that is not in `components.csv`.

## components.csv
One row per published component. Header (columns can be in any order; `notes`, `sodium_mg`, `fiber_g`, `sugar_g` are optional):
```
id,role,name,serving,calories,protein_g,fat_g,carbs_g,contains,may_contain,ingredients,labels,extra_for,extra_kind,notes
```
| Column | Rule |
|---|---|
| `id` | short, lowercase, unique: `chicken`, `white-rice` |
| `role` | `base`, `protein`, `topping`, `sauce` (dressings and salsas too) or `side` |
| `name`, `serving` | as published |
| `calories`, `protein_g`, `fat_g`, `carbs_g` | as published. **Empty = not published** (unknown). Write `0` only where the document prints 0. “<1” is kept as unknown. |
| `contains` | declared allergens separated by `;` (`milk`, `egg`, `wheat`, `gluten`, `soy`, `sesame`, `fish`, `shellfish`, `peanut`, `tree nuts`; other declared allergens such as `mustard` are kept as written). Write `none` when the document declares none. **Empty = no allergen information published**, which counts as unknown for every allergen. |
| `may_contain` | item-level “may contain” / cross-contact allergens, same words, or `all` |
| `ingredients` | the published ingredient list, verbatim (quote it if it contains commas), or empty |
| `labels` | only the restaurant's own labels: `vegan`, `vegetarian`, `gluten-free` |
| `extra_for`, `extra_kind` | only when the restaurant publishes an extra/double serving: `extra_for` = the component's id, `extra_kind` = `added` (values of the extra amount) or `total` (values of the whole double serving). Never computed by multiplying. |

A Mac spreadsheet (Numbers: File > Export To > CSV) is fine for this file.

## Build and check (needs Node; a cloud session can do this)
```bash
npm run build:restaurants
```
```bash
npm run check
```
```bash
npm run build
```
`build:restaurants` refuses the whole restaurant (and `npm run build` fails) on any rule break: wrong domain, kind not
`official`, a bad time offset, an unknown role or allergen word, a non-number, an implausible value, a preset with an
unknown component. Warnings (shown, not fatal) flag rows whose calories don't match 4·protein + 4·carbs + 9·fat, so
you can re-check the transcription. Then `npm run check` re-runs the preset audit and the strict allergen audit on the
real data, and `npm run build` embeds it. Commit `data/restaurants/<id>/source.json`, `components.csv`,
`src/client/restaurant-data.ts`, `index.html`, `HungryHeels.html` and `web/`.

## How the app uses it
- Place picker (Today and Menus): Chase, Top of Lenoir, Sweetgreen, Chipotle. Address: `#/?place=chipotle`, `#/menus?place=sweetgreen`.
- Restaurants have no dates or meal periods: always available, “Hours unknown” unless official hours are given, and a note that the national menu may differ at the Franklin Street store.
- Bowl builder (`src/core/restaurant-meals.ts`): one base, one protein or none (animal-based and carnivore need an animal protein), up to three toppings, at most one sauce or dressing, a side only when you set targets. Every component goes through the same strict engine as the dining halls (allergen declaration > ingredients > label > name); “may contain” and missing allergen information are unknown, so strict avoids exclude them; possible matches only for soft diet rules. Published calories/protein/fat/carbs feed the targets with an **Official** badge; no estimates are used for restaurants.
- Factual name use only: no logos, brand colors or trade dress; footer and each restaurant page say Hungry Heels is not affiliated with, endorsed by or sponsored by them.

## Tests
`test/restaurant.test.ts`: importer rules, cross-contact engine rules, bowl structure, preset audit (every diet preset
gives a valid bowl or an honest “No meal fits”), strict audit (Big 9, gluten, dairy, egg: no declared or cross-contact
match ever appears). Until real data exists they run on **synthetic** fixtures in `test/fixtures/restaurants/`
(every item named `TEST …`; never shipped). The preset and strict audits also run automatically on any real data in
`data/restaurants/`. `npm run e2e` checks the place picker at 390px and 1280px, using the synthetic fixture injected
into the page for the bowl.
