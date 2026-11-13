# Chipotle (Franklin Street, Chapel Hill): official data goes here

**Status: built in.** Chipotle's US nutrition PDF and chipotle.com/allergens statements, extracted by `scripts/extract-chipotle.ts` from the saved copies in `source/` (git-ignored). Store hours and address from locations.chipotle.com. Permission and provenance are in `source.json`. Refresh steps: `docs/RESTAURANTS.md`.

To add or refresh data:

Save Chipotle's own published nutrition and allergen information (from chipotle.com only) into `source/`, then copy
`source.template.json` to `source.json` and `components.template.csv` to `components.csv` and fill them in
exactly as published. Full rules: `docs/RESTAURANTS.md`. Never add values from memory, third-party sites or
delivery apps; leave unknown cells empty.
