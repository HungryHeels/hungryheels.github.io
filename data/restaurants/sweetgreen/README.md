# Sweetgreen (Franklin Street, Chapel Hill): official data goes here

**Status: built in.** Official page for the 122 East Franklin Street store, extracted by `scripts/extract-sweetgreen.ts` from the saved copy in `source/` (git-ignored). Permission and provenance are in `source.json`. Refresh steps: `docs/RESTAURANTS.md`.

To add or refresh data:

Save Sweetgreen's own published nutrition and allergen information (from sweetgreen.com only) into `source/`, then copy
`source.template.json` to `source.json` and `components.template.csv` to `components.csv` and fill them in
exactly as published. Full rules: `docs/RESTAURANTS.md`. Never add values from memory, third-party sites or
delivery apps; leave unknown cells empty.
