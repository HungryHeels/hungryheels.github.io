# Data flow and privacy

1. You save a page in Safari. 2. You give the file to the app (file picker or drag-and-drop). 3. The app reads it **in your browser** (binary plist reader, then the page parser). 4. Parsed days are kept in your browser's IndexedDB (falls back to memory, and tells you). 5. Your diet and avoid choices are kept in your browser's localStorage.

Nothing is uploaded. There are no analytics, accounts or third-party requests; the page makes no network calls at all (the browser check confirmed zero requests). The built-in menus ship inside the page as gzip+base64 data. The page carries `noindex` so search engines are asked not to list it.
