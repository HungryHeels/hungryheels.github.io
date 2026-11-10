# Publishing on GitHub Pages and the Claude bug-fix helper

## 1. Publish the site (free address: https://hungryheels.github.io/)
1. Open https://github.com/HungryHeels/hungryheels.github.io/settings/pages
2. Under "Build and deployment", set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, then Save.
3. Wait a minute or two, then open https://hungryheels.github.io/. (`index.html` at the repo root is the built app.)
A custom domain such as hungryheels.com costs money; GitHub Pages can serve one later (Settings > Pages > Custom domain).

## 2. Let Claude fix bugs from GitHub (UNVERIFIED, not yet run)
`.github/workflows/claude.yml` runs Claude when **you** write `@claude` in an issue or pull request comment on this repo.
1. Install the Claude GitHub app on the repo (the action's README suggests running `/install-github-app` inside Claude Code; or install the app from the GitHub Marketplace).
2. Add your Anthropic API key as a repository secret named `ANTHROPIC_API_KEY` (Settings > Secrets and variables > Actions). API usage is billed to that key.
3. Open an issue describing the bug and include `@claude`. Claude proposes a fix as a pull request; you review and merge.
The workflow only reacts to comments from the repository owner so strangers can't trigger paid runs. Merging a fix does not publish it by itself: `index.html` is the built app, so CLAUDE.md tells Claude to run `npm run build` and commit the result.

## 3. Updating menus
Saved pages are 5 to 15 MB each and are not stored in the repo. Regenerate the seed locally with `npm run build:seed -- <folder>`, run `npm run build`, commit `src/client/seed-data.ts`, `index.html` and `HungryHeels.html`.
