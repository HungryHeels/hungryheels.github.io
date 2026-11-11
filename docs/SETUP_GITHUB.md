# Publishing on GitHub Pages and the Claude bug-fix helper

## 1. Hosting (free, current answer: https://hungryheels.github.io/)
1. Open https://github.com/HungryHeels/hungryheels.github.io/settings/pages
2. Under "Build and deployment", set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, then Save.
3. Wait a minute or two, then open https://hungryheels.github.io/. `index.html` at the repo root is the built app; `sw.js`, `manifest.webmanifest` and `icon.svg` next to it let it open offline.
Free `*.github.io` hosting is the plan for now. A custom domain such as hungryheels.com costs money; GitHub Pages can serve one later (Settings > Pages > Custom domain).

## 2. Let Claude fix bugs from GitHub (owner-triggered only; NOT YET RUN)
`.github/workflows/claude.yml` runs Claude only when the repository owner writes `@claude` in an issue, issue comment or review comment. It has never been run, so treat it as unverified until step 5 works.

You need a computer with a browser. No Node or git is needed for these steps.

1. **Get an Anthropic API key.** Go to https://console.anthropic.com/ > sign in > **API Keys** > **Create Key**. Copy it (it is shown once). API usage is billed to this key's account; set a monthly spend limit under **Limits**.
2. **Install the Claude GitHub app** on this repository: open https://github.com/apps/claude > **Install** (or **Configure** if already installed) > choose the **HungryHeels** account > **Only select repositories** > pick `hungryheels.github.io` > **Install**.
3. **Add the key as a secret:** open https://github.com/HungryHeels/hungryheels.github.io/settings/secrets/actions > **New repository secret** > Name: `ANTHROPIC_API_KEY` > Secret: paste the key > **Add secret**. Never paste the key into an issue, a commit or a chat.
4. **Check who counts as owner.** The workflow only reacts to comments by `github.repository_owner`, which is the account that owns the repo (`HungryHeels`). If you comment from a different personal account, edit the three `github.repository_owner` checks in `.github/workflows/claude.yml` to your username (for example `'your-username'`). This keeps strangers from triggering paid runs.
5. **Try it:** open an issue (the in-app “Report a wrong result” button prefills one), then comment `@claude please investigate and fix this`. Watch https://github.com/HungryHeels/hungryheels.github.io/actions. Claude replies on the issue and may open a pull request.
6. **Review before merging.** `CLAUDE.md` tells Claude the hard rules and to run `npm run check` and `npm run build`. Merging a pull request into `main` publishes it on the live site within a few minutes.

If the run fails with an authentication error, re-check step 3 (exact secret name) and step 2 (the app must have access to this repository).

## 3. Updating menus
Saved pages are 5 to 15 MB each and are not stored in the repo. See “How to refresh a day” in the README. To make days permanent: `npm run build:seed -- <folder>`, then `npm run build`, and commit `src/client/seed-data.ts`, `index.html`, `HungryHeels.html` and `web/`.
