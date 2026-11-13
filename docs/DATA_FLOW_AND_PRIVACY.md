# Data flow and privacy

1. You save a page in Safari. 2. You give the file (or a folder of them) to the app: file picker, folder picker or drag-and-drop. 3. The app reads it **in your browser** (binary plist reader, then the page parser). 4. Parsed days are kept in your browser's IndexedDB (falls back to memory, and tells you). 5. Your profiles, saved meals, “what you've had” log and display settings are kept in localStorage. An official nutrition file you import and any nutrition you type in are kept in IndexedDB.

Nothing is uploaded. There are no analytics, accounts or third-party requests.

- `HungryHeels.html` opened from disk makes **zero** network requests (checked in Chromium with Playwright).
- On https://hungryheels.github.io/ the page also registers a service worker (`sw.js`) and a manifest so it can open offline. The service worker only fetches and caches files from the same site (the page, the manifest and the icon); it never contacts any other host. The browser check confirms no request leaves the serving origin.
- **Addresses**: the hall, date, meal and open dish are kept after the `#` (for example `#/menus?hall=chase&date=2026-11-16&period=Dinner`). Browsers never send that part to a server.
- **Share link**: the profile is encoded after the `#` in the link (`#/me?profile=…`; old `#profile=…` links still work). Browsers never send that part to a server. Opening such a link shows the settings and asks before adding them.
- **Report a wrong result** opens a GitHub “new issue” page in a new tab with the item, hall, date, period, your diet rules (as words like “Vegan · Peanut allergy”) and the evidence filled in. It contains no name, email or other personal details. Nothing is sent unless you choose to submit the issue on GitHub, and you can edit it first. Diet rules and allergies can be sensitive; delete that line before submitting if you prefer.
- **Entered by you** nutrition stays in this browser and is never shared, including in reports.

- **Restaurants** (Sweetgreen, Chipotle): their data, when added, ships inside the page like the built-in menus. The app never contacts either restaurant. The “Official source” link on a restaurant page only opens their site if you tap it.

The built-in menus ship inside the page as gzip+base64 data. The page carries `noindex` so search engines are asked not to list it.
