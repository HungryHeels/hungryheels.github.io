# Franklin Street restaurants: Sweetgreen and Chipotle

Status (Nov 13, 2026): **data pending.** The place picker, importer, bowl builder and audits are built and tested, but
no official Sweetgreen or Chipotle data is in the app yet. Both places show “No … data yet” and recommend nothing.

## Why there is no data yet
The rule for these places: use only each restaurant's **own officially published** nutrition and allergen information,
and before downloading anything, read the site's `robots.txt` and terms of use; fetch once at development time only
if both allow it; never crawl, scrape or call ordering systems or APIs; the app itself never fetches anything.

On Nov 13, 2026 the build environment could not reach either site: `www.sweetgreen.com` and `www.chipotle.com` were
both refused by the environment's network policy (HTTP 403 at the proxy; DNS failure for the fetch tool). Without
reading `robots.txt` and the terms, fetching was not allowed, so **nothing was downloaded** and nothing was
transcribed from memory. The data has to be saved by hand (below), or a later session can do it once those two hosts
are allowed in the cloud environment's network settings **and** their `robots.txt` and terms allow it.

## What to save, and where
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
  "crossContact": [
    { "text": "the restaurant's own statement, copied word for word", "allergens": "all" }
  ],
  "presets": [
    { "name": "a published bowl or salad", "components": ["component ids"], "nutrition": { "calories": 0, "protein": 0, "fat": 0, "carbs": 0 } }
  ]
}
```
- `retrievedAt` is when you saved the file, in New York time **with the offset New York had that day** (`-05:00` Nov to mid-March, `-04:00` otherwise). The importer checks this.
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
