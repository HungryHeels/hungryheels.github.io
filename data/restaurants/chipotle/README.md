# Chipotle (Franklin Street, Chapel Hill): official data goes here

**Status: permission recorded, no data yet.** Chipotle's nutrition and allergen chart are only in its ordering app (services.chipotle.com), which this project does not call. See `docs/RESTAURANTS.md` for the ways forward.

To add or refresh data:

Save Chipotle's own published nutrition and allergen information (from chipotle.com only) into `source/`, then copy
`source.template.json` to `source.json` and `components.template.csv` to `components.csv` and fill them in
exactly as published. Full rules: `docs/RESTAURANTS.md`. Never add values from memory, third-party sites or
delivery apps; leave unknown cells empty.
