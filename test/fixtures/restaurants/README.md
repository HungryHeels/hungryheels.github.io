# SYNTHETIC test fixtures (not real restaurant data)

Everything in this folder is **made up for tests**. No item, ingredient, allergen, nutrition value or URL here
comes from Sweetgreen or Chipotle, and none of it is shipped in the app: the build reads only `data/restaurants/`.
Every item name starts with `TEST`. The fixture uses `"restaurant": "chipotle"` and a placeholder path on that
domain only because the importer requires an official domain; the path does not exist.

They exist because the real official files could not be fetched from the build environment (see
`docs/RESTAURANTS.md`). Replace nothing here with real data; real data goes in `data/restaurants/<id>/`.
