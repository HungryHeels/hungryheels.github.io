# Hungry Heels design system

Direction (visual redesign, Nov 11): **calm, precise, luminous**. A fast utility for picking a meal, not a marketing page. Apple-inspired as principles only (restraint, strong type hierarchy, precise alignment, disciplined light and material), never copying Apple's logo, imagery, labels or layouts. "Futuristic" means advanced, not noisy: solid surfaces with hairline edges, one accent, no neon, no glass everywhere, no particles, no long entrances. Only raw values allowed outside the tokens: the print stylesheet, the white switch knob, and the thumb shadow.

Carolina layer (Nov 13): the redesign's surfaces, type, radii and motion stay; the accent family is a Carolina-blue-style light blue with deep navy text, and original art (a mascot, food sprites, a campus band) adds a Chapel Hill feel. Generic colors and original drawings only: nothing official-looking, no UNC marks (see Imagery).

No UNC logos, wordmarks, seals or trademarked colors used as branding. The word "Unofficial" always sits next to the name.

- **Primary motif:** the hairline edge. Surfaces are solid with a 1px `--line` border; in dark mode they also get a faint top highlight (`--edge`). Surfaces get lighter as they rise in dark mode instead of casting shadows.
- **Supporting motif:** the live "now" marker in the meal pills: the word "now" plus a softly lit dot.
- **Signature moment:** the meal card is the one raised surface (`--e2`, `--r4`), with a thin Carolina-blue light along its top edge (`--glow`), an inset grouped list of dishes and large tabular totals.
- **Material:** the only translucent surface is the sticky header (backdrop blur, solid fallback; solid in high contrast).

## Color (CSS variables in `src/client/style.css`)
| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#f5f6f8` | `#090c12` | Page background |
| `--card` | `#ffffff` | `#12161f` | Cards, panels, list groups |
| `--surface-2` | `#f0f2f5` | `#191e29` | Inset tiles (totals, nutrition, rule rows), row hover |
| `--fill` / `--fill-hover` / `--fill-active` | `#eceff3` / `#e2e6ec` / `#d7dce4` | `#1e2430` / `#272e3c` / `#303848` | Secondary buttons and selection tracks |
| `--thumb` | `#ffffff` | `#363f51` | The raised selected option on a track |
| `--text` | `#13294b` (navy) | `#eef1f6` | Body text and headings |
| `--muted` | `#525d6e` | `#a4adbb` | Secondary text (≥ 4.5:1 on every surface, measured) |
| `--line` | `#e1e5eb` | `#252b37` | Hairline borders and dividers (decorative) |
| `--line-strong` | `#8b95a5` | `#6a7486` | Input and switch borders (≥ 3:1 on `--card`) |
| `--accent` / `--accent-hover` / `--accent-active` | `#1b5c8c` / `#174f79` / `#13436a` | `#7bafd4` / `#8fbcdc` / `#a6cbe5` | Links, selection check marks, focus (7.10:1 on white; 6.6:1+ on dark surfaces) |
| `--accent-text` | `#ffffff` | `#0b1322` | Text on `--accent` |
| `--accent-tint` / `--sel-bg` | `#e6eff8` | `#18263b` | Quiet-button hover, chosen quiz answer |
| `--primary` / `--primary-text` (hover `--primary-hover`, press `--primary-active`) | `#7bafd4` / `#13294b` (hover `#6aa3cc`, press `#5b97c2`) | `#7bafd4` / `#0b1322` (hover `#8fbcdc`, press `#a6cbe5`) | **Primary action:** light-blue fill with navy text (6.17:1 light, 7.89:1 dark; hover 5.34:1 / 9.19:1) |
| `--carolina` | `#7bafd4` | `#7bafd4` | Brand light blue: portion badge (navy `--badge-text`, 6.17:1), meal-card top light, art fills. Never text on white (2.35:1) |
| `--carolina-edge` | `#4a86b8` | `#7bafd4` | Marks and edges that must read on light surfaces: active-nav bar, primary button border, "Unofficial" tag border (3.89:1 on white) |
| `--warm` | `#f6f1e8` | `#17191d` | Warm neutral: footer and "Unofficial" tag |
| `--say-bg` / `--say-text` | `#13294b` / `#ffffff` | `#dce8f7` / `#13294b` | Mascot speech bubble (14.52:1 / 11.70:1) |
| `--ok` / `--ok-bg` | `#13692f` / `#e5f4ea` | `#8fe0a8` / `#0f2a19` | Fits, passed |
| `--warn` / `--warn-bg` | `#7a4800` / `#fdf1da` | `#ffd27f` / `#33260b` | **Warnings only:** “Contains …”, unsure, stale, confirm with staff. Never for neutral information. |
| `--bad` / `--bad-bg` | `#a3201f` / `#fde9e8` | `#ffaaa5` / `#3a1514` | Not for you, removed |
| `--info` / `--info-bg` | `#0f2a52` / `#eaf1fb` | `#dbe7f8` / `#15213a` | Neutral notes (estimates, shared profile) |
| `--label-bg` / `--label-fg` | `#ffffff` / `#000000` | `#000000` / `#ffffff` | Ingredients label panel in dish details only (store-label look: black on white, inverted in dark) |
| `--focus` | `#1b5c8c` | `#9cc3ff` | Focus ring (3px, 2px offset; inset inside tracks) |
| `--overlay` | `rgba(9,13,22,.42)` | `rgba(0,0,0,.6)` | Dims the page behind dish details |
| `--row-hi` | `#eaf2fb` | `#172338` | The current idea's row in the “All ideas” table (with a ▶ marker, not color alone) |

### Art palette (decorative only)
These fill the original drawings in `src/client/art.ts` and nothing else. The art is always `aria-hidden` and sits beside words, so these colors carry no meaning and have no contrast requirement; never use them for text, status or controls.

| Token | Light | Dark | Fills |
|---|---|---|---|
| `--m-ink` | `#13294b` | `#0b1322` | Mascot outline, face |
| `--m-limb` | `#13294b` | `#dce8f7` | Mascot legs and arms |
| `--m-fork` | `#7d8796` | `#c3cddb` | Mascot's fork |
| `--m-sole` | `#ffffff` | `#eef3fa` | Sneaker sole and laces |
| `--m-cheek` | `#f2a7a0` | `#f2a7a0` | Cheeks (light value in both themes) |
| `--s-ink` | `#13294b` | `#dce8f7` | Food sprite outlines (course and station glyphs, empty-list picture) |
| `--q-sky` / `--q-cloud` | `#d3e6f4` / `#ffffff` | `#162238` / `#25344f` | Campus band sky and clouds |
| `--q-grass` | `#86b36f` | `#1c3627` | Lawn |
| `--q-oak` / `--q-oak2` / `--q-trunk` | `#3f7a4a` / `#2f6340` / `#6b4a33` | `#2c5839` / `#21442d` / `#4a3426` | Round oaks (two greens) and trunks |
| `--q-brick` / `--q-joint` | `#b5523b` / `#e8c4b5` | `#743829` / `#9b5c4b` | Brick walk and mortar |
| `--q-post` / `--q-light` | `#13294b` / `#fff4d0` | `#a4adbb` / `#ffd88a` | Lamp posts and their light |
| `--q-stone` / `--q-stone2` | `#f3eee3` / `#d8cdb8` | `#56607a` / `#454e66` | Landmark stone: walls, columns, belfry and spire (`--q-stone2` for bases, cornices and shaded faces) |
| `--q-dome` / `--q-shade` | `#e6dfd0` / `#8c8170` | `#4d5770` / `#1b2232` | The library dome; shadows and recesses |
| `--q-open` | `#5f574b` | `#ffd88a` | Windows, portals and belfry openings: dark by day, lit at night |
| `--q-brick2` | `#96412e` | `#5e2c20` | The bell tower's darker brick piers |
| `--q-stand` / `--q-stand2` / `--q-tier` | `#cfcac0` / `#b9b3a7` / `#a9a296` | `#353d51` / `#2c3345` / `#232a3a` | Stadium stands (two tones) and tier lines |

The sneaker body and food fills use `--carolina` and the surface tokens above. High contrast hides the campus band.

High contrast (`data-contrast=high`) darkens `--muted`, `--line` and the status colors, turns primary buttons solid (`#063a7a`/white; dark `#a9d1f0`/black), hides the campus band, removes translucency and glow, flattens fills to the card color and gives controls 2px borders, in both themes. Status is never color alone: every status also has a symbol (✓ △ ✕ ?) and a word.

## Typography
System UI stack only (no web fonts, no outbound requests): `--font` = `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`; `--font-display` swaps in `"SF Pro Display"` for headings and large totals. No font files are shipped. Tabular numbers for totals, nutrition, hours and tables. Headings use `text-wrap: balance`.

Line heights: `--lh-tight` 1.15 (display text and totals), `--lh-snug` 1.3 (titles, the ingredients label), `--lh-body` 1.5 (reading text). Tracking tokens: `--tr-display` −.028em, `--tr-title` −.018em, `--tr-head` −.01em, `--tr-body` −.003em, `--tr-eyebrow` +.06em (uppercase only).

| Token | Size | Role | Tracking |
|---|---|---|---|
| `--fs-2xs` | 12 | Caption: chips, eyebrows (uppercase station names, table heads) | `+.06em` on uppercase |
| `--fs-xs` | 13 | Footnote: meta lines, totals labels | 0 |
| `--fs-sm` | 14 | Callout: buttons, secondary text, tables | 0 |
| `--fs-md` | 16 | Body (minimum for reading text) | `-.003em` |
| `--fs-lg` | 17 | Headline: dish names, card titles, h3 | `-.01em` |
| `--fs-xl` | 22 | Title: section headings (h2), meal card title (26 from 760px) | `-.018em` |
| `--fs-2xl` | 30 | Display: page title on phones, totals numbers | `-.028em` |
| `--fs-3xl` | 40 | Display: page title on desktop (landing headline is fluid, 32–52) | `-.028em` |

Weights: 400 body, 600 labels and buttons, 650 dish names and h3, 700 headings and totals. Paragraphs max 68ch.

## Spacing, layout and motion
4-based scale: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 24, `--s6` 32, `--s7` 48, `--s8` 64. `--gutter` 16px on phones, 24px from 760px, 32px from 1200px, never less than the safe-area inset. `--width` (content) 1120px. `--header-h` 56px: the sticky header's height, also the offset for sticky sidebars and in-page scroll targets. `--pill` 999px: the pill radius.
- **Today:** one column on phones; from 960px, meal card (wide column) + side column (other hall, your rules).
- **Menus:** filters above the list on phones; from 960px, a sticky filter sidebar (260px) + item list. Item details open as a bottom sheet on phones (with a grabber) and a floating right panel on desktop.
- **Me:** one column of sections with a chip row of section links on phones; from 960px, a sticky section list on the left.

Motion: `--dur-1` 120ms (state changes), `--dur-2` 200ms (switches, disclosure chevrons), `--dur-3` 320ms (reserved for overlays), one easing `--ease` (`cubic-bezier(.2,.8,.2,1)`). No entrance animations: the app redraws the whole view on each change, so they would replay. `prefers-reduced-motion` removes all transitions and the press scale.

## Shape and depth
Radius: `--r1` 8 (inputs), `--r2` 12 (buttons, tracks, banners), `--r3` 18 (cards, list groups), `--r4` 24 (meal card, sheet), pill for chips and badges. Elevation: `--e1` (cards: barely there), `--e2` (meal card only), `--e3` (sheet). In dark mode, `--e1` is none and `--edge` adds the top highlight.

## Components
- **Header:** sticky, translucent `--header-bg` with a hairline; the mascot button, the name + "Unofficial" tag (`--warm` fill, `--carolina-edge` border) on the left, three text links (Today, Menus, Me). The active link is `--text` with a 3px `--carolina-edge` bar and `aria-current="page"`. No bottom tab bar. Under it, the decorative campus band (72px desktop, 48px tablet, 40px on phones; not sticky). The brand name uses the system's rounded face where there is one (`ui-rounded`, Apple devices), else the display font.
- **Buttons:** primary (`--primary` light-blue fill, navy text, `--carolina-edge` border; at most one per view, not used for “Another idea”), secondary (neutral `--fill`, no border; the idea controls sit on `--card` with a hairline so they read above the meal card), quiet (accent text, tint on hover). Min 44px. Hover changes the fill; press scales to .985; focus shows the 3px `--focus` ring; disabled is 50% opacity with a not-allowed cursor.
- **Place picker:** one segmented group labeled “Place”, always 2 × 2: Chase, Top of Lenoir (row 1), Sweetgreen, Chipotle (row 2), with the same track, raised thumb and ✓. For a restaurant the date bar and meal pills are replaced by a `--card` info box: name · Franklin Street, “Hours unknown…”, and the national-menu note in `--muted`. Restaurant names are plain text in the system font; never a logo, brand color or trade dress.
- **Selected options** (hall, One meal / Whole day, meal pills, display settings): a `--fill` track with the chosen option as a raised `--thumb` and a ✓, never the filled primary style. The date bar uses the same track, but its date is an action, so it has no thumb.
- **Links:** `--accent`, underlined in body text with a thin offset underline; nav links not underlined.
- **Inputs and selects:** 44px, `--r1`, `--line-strong` border, `--card` fill, visible label above.
- **Cards:** `--card`, 1px `--line`, `--r3`, 16px padding (24px from 760px). One card per idea; never a grid of identical marketing cards.
- **Lists** (plate, menu items, Me rows): an inset group with hairline separators; whole rows are native buttons with a hover tint.
- **Disclosures:** `<details>` with one hairline chevron that turns when open.
- **Ingredients label** (dish details): one bordered panel in `--label-bg`/`--label-fg`, `--fs-sm` at 1.3 leading, square corners (it imitates a printed label, not the app's material). Bold uppercase “INGREDIENTS:” heading (a real h3, uppercased by CSS) followed by the ingredients as one flowing paragraph that is an inline `ul` (commas and brackets are real text). A ruled “CONTAINS:” line lists only allergens UNC declares. Under it: a `.prov` source line and a “Show original text” disclosure. Never claims weight order, “free of” or allergy safety.
- **Chips:** status words with a symbol, `--fs-2xs`, pill radius: `chip-ok` (✓ Fits), `chip-warn` (△ Unsure, stale), `chip-bad` (✕ Not for you, no meal).
- **Nutrition source line:** “Nutrition: Official / Entered by you / Eat UNC (3rd party) / Estimate / Not published” in `--fs-xs`, `--muted` (Official in `--ok`). Never amber: it is information, not a warning. The allergen line (“△ Contains …”) is its own line, bold, in `--warn`.
- **Banners:** full-width notes, `--r2`, `--fs-sm`, a 35%-tinted border of their color: `info` (neutral facts, fallbacks explained, the shared-profile offer), `warn` (no menu posted, rules forced fewer sides), `bad` (no meal fits). The flash banner is `info` with an OK button and `role="status"`. High contrast gives warn and bad a solid border.
- **Confirm-with-staff box:** `--warn-bg` panel, `--r2`, a bold “⚠ Confirm with staff” line, then one bullet per reason (allergy set, unconfirmed dish, label contradicts allergens). Sits between the totals and the meal actions; in Whole day the allergy line appears once above the plan.
- **Totals tiles:** a responsive grid (min 130px) of `--surface-2` tiles: `--fs-xs` label (+ “(estimate)” when it includes one), value in `--font-display`, `--fs-2xl`, tabular. “Fat and carbs: not published” is one muted line, never an “unknown · unknown” tile.
- **Target gaps:** a list under the totals, `--fs-sm`, 600 weight, symbol first: ✓ on target (`--ok`), ↓ short or ? can't tell (`--warn`), ↑ over (`--bad`). Estimated gaps say “about … (estimate)”.
- **Rule checklist** (Details, dish details, restaurant rows): rows on `--surface-2`, `--r2`; a symbol column (✓ `--ok`, ✕ `--bad`, ? `--warn`), the rule in bold, then “Strict avoid / Diet rule · reason · decided by <evidence>” in `--fs-xs` `--muted`. The meal version adds one muted line per dish.
- **Tables** (breakdown, all ideas, coverage, next 14 days): inside a scrolling `.tablewrap` (`--card`, hairline, `--r2`), `--fs-sm`, tabular numbers, a muted caption; numbers right-aligned; “?” not published, “+” at least, “~” estimate (italic).
- **Side cards** (Today, from 960px beside the meal): “Both halls · <meal>” (each hall's best idea with a status chip and a quiet “Switch to …”), “Your rules” (summary + link), then the provenance line (`.prov`, `--fs-xs`, `--muted`). Below the meal on phones.
- **Whole day:** one card per meal (Breakfast, Lunch, Dinner; the period name only when it differs) with the same dish rows as the meal card and a muted totals line, then a “Day total” card with totals tiles and gaps.
- **Landing** (first visit, and About): a two-column hero from 960px (fluid headline 32–52px, line height 1.05, max 15ch; muted lede; primary “Find my meal” or “Back to my meal” + secondary “Browse the full menu”; the unofficial line) beside the diet question card; then plain sections separated by a hairline and `--s6`, max 760px: numbered steps (accent numbers), bullet points with muted markers, the disclaimer in the staff style, and the FAQ as disclosures. No illustrations of people, no testimonials, no feature-card grid.
- **Menus item rows:** whole-row buttons in an inset list: name (600), a `--fs-xs` muted line (station when not grouped, calories/protein with “~” for estimates, source), a status chip on the right. Station groups have an uppercase `--fs-2xs` eyebrow heading.
- **Restaurant rows** (Sweetgreen): the same row as a `<summary>` of a `details.comp`; opening it shows a `comp-body` with the nutrition grid, source line, allergen lines, ingredients, the restaurant's labels, warnings and the rule checklist. Only one open at a time is remembered.
- **Restaurant “No data yet” card:** a normal card: “No <name> data yet”, why in one sentence, a primary link to the restaurant's own nutrition page (opens a new tab; the small print says it is only a link), the staff reminder, and “Back to the dining halls”.
- **Update menus:** a dashed drop zone (`--line-strong` 1.5px dashed on `--surface-2`; `--accent` border and `--accent-tint` while dragging) with “Choose saved pages” (primary) and “Choose a folder”; import results as cards (status chip, “What changed” disclosure); the “Next 14 days” card with a one-line summary and a “Day by day” table that opens by itself only when something needs saving; nutrition sources card; “Remove imported pages” as a danger button.
- **Me:** sections with `--header-h` scroll margin; section links as `--fill` chips on phones and a sticky muted list from 960px. Diet as radio rows, allergies and avoids as switch rows (51×31 switch, `--fill-active` track, accent when on), custom avoids as removable `--fill` chips, goals as labeled number fields in a responsive grid (columns at least 140px), saved meals as cards with a status chip.
- **Dish details:** order is verdict chip, confirm-with-staff box, nutrition grid (estimate cells dashed), source line, estimate note, “Enter values from UNC's item panel” form, allergens, ingredients label, “Why, labels and source”, report link, disclaimer. Bottom sheet with a grabber on phones; a floating right panel from 760px. Focus moves in, Tab is trapped, Escape and Back close it.
- **Form errors** (nutrition entry): the message in `warn-text`, invalid fields get `aria-invalid`, a 2px `--bad` border and `aria-describedby` pointing at the message; focus moves to the first one.
- **States:** loading = the thinking mascot (56px) and “Loading menus…”; no meal = a card with the sad mascot (88px), why, and “Browse the full menu”; no menu posted = a warn banner with “Go to <next date>” and “Add a saved page”; empty filter = “Nothing matches these filters.” (with the plate sprite on the dining-hall list).
- **Print:** white page, black text; header, picker, filters, actions, disclosures and section lists hidden; cards keep a grey hairline and lose shadows and the top light.
- **Footer:** hairline top, no fill: the allergy disclaimer, the unaffiliated notice, and links to About, Privacy, Update menus, Report a problem and Source code.

## Estimates
An estimated number always starts with “~” and sits next to the word “estimate” (cell label, list line or total label). Estimated nutrition cells use a dashed `--muted` border and no fill, so they never look like published numbers. The dish details explain the basis in an `--info-bg` note. Totals that include an estimate use “~”; totals of published numbers only never do.

## Imagery and icons
No photos or emoji icons. Text symbols only where they carry meaning (✓ △ ✕ ? ‹ › ★ ☆), always with a text label nearby. The site icon is the Hungry Heel mascot (waving, full figure on a pale-blue rounded tile), generated by `src/pwa/icon.ts` from the same drawing as the header mascot: written to `icon.svg` for the manifest (`any maskable`; the figure stays inside the central 80%) and inlined as the tab icon's data: URI. An original character, not a UNC mark.

Original inline SVG art lives in `src/client/art.ts` (drawn for this project; colors from tokens; no lettering, no external references; `test/art.test.ts` guards this). **Never** add or imitate a UNC mark: no Old Well, no ram, no Tar Heel foot or footprint, no interlocking monogram, no wordmark or official font, nothing traced from unc.edu.
- **Mascot, the "Hungry Heel":** a high-top sneaker (not a foot) with a face, stick legs and a fork. Poses: idle, wave, think (loading), happy, sad/shrug. In the header it is a real `button` ("Hungry Heel mascot: tap to say hello") drawn in a cropped small version (`mascotSvg(pose, true)`: thicker lines, no cheeks) so it reads at 40px. A tap waves and shows a short line in a bubble beside it (never over the nav), also announced in the live region. It hops on the first meal and when your rules change (not on every idea or hall) and thinks while menus load. Elsewhere it is `aria-hidden` art next to words: the landing hero (desktop), loading, "No meal fits today" (shrug), "No menu saved/posted" (shrug), empty Saved meals (idle) and a successful menu import (happy).
- **Food sprites:** 42 original pictures (biscuit, barbecue tray and sweet tea added at the owner's request, Nov 13; plate, soup, bowl, salad, veg, fruit, banana, potato, fries, rice, pasta, beans, chicken, meat, fish, shrimp, egg, tofu, cheese, bread, sandwich, burger, pizza, wrap, taco, sushi, pancake, waffle, cereal, cake, cookie, muffin, donut, ice cream, yogurt, candy, coffee, drink, sauce). Each dish row gets the one that fits the dish, chosen from its name by `src/client/dish-sprite.ts`: the kind of dish is the last food word (“Blueberry Swirl Cheesecake” is cake), “with …” and “(Made Without Gluten)” are ignored, and in “X and Y” names X wins when Y is one plain food (“Shrimp and Grits”). The station fills in only when the name says nothing; anything still unknown gets the neutral plate, never a guess. Menus station headings get a picture only when the station name names a food. Always `aria-hidden`, always beside words, never meaning on their own. Fills are `c-*` classes and outlines the theme ink, so they follow dark mode. A dish row press scales its glyph slightly.
- **Off-brand Chapel Hill things** (owner's request, Nov 13): generic, original takes on places and local favourites, never on UNC's logos or marks. Band: an old three-storey brick hall with chimneys, a domed basketball arena, the big old poplar on the quad, and low fieldstone walls along the lawns. Food glyphs: chicken biscuit, a barbecue tray with hushpuppies, sweet tea (only when the dish name says so). Footer: a plain orange basketball. Mascot lines can mention the Bell Tower or sweet tea. Still never: the Old Well, the ram, the Tar Heel foot, the argyle pattern, interlocking letters, slogans or any lookalike of them.
- **Campus sprites** (owner's request, Nov 13): small 32px versions of the band's bell tower, library and stadium, plus a dogwood blossom (the state flower). One before each page title (Today: bell tower, Menus: library, Me: dogwood) at 0.9em, and a row of all four at the top of the footer. Dish details show the dish's food glyph beside its name. Same flat style, ink outlines and token colors as the food sprites; always `aria-hidden`.
- **Campus band:** sky, round oaks, lamp posts, lawn and a brick walk, with three simplified Chapel Hill silhouettes in the middle (owner's request, Nov 13): a brick bell tower with a pale belfry and spire, a domed library with a columned portico, and a stadium bowl with light towers. Original flat drawings, impressions only: not traced from photos or official drawings, no lettering, no logos, and never the Old Well. One SVG that scales by height and stays centred, so the landmarks are always whole; at night (dark mode) windows, portals and belfry are lit with `--q-open`. 72px desktop, 48px tablet, 40px on phones (owner asked to see the landmarks there too; the meal card still starts on the first screen); hidden in high contrast and print. The sky follows the meal on screen (`data-sky`: breakfast → morning with a low sun, lunch → day, dinner → sunset, late dinner/late night → moon and stars; with no meal, the New York clock), and the oaks follow the season in New York (`data-season`: spring blossoms, summer green, fall color, winter frost). Both have dark-mode colors; high contrast hides the band.
- **Time-of-day pictures:** in the whole-day plan, each meal heading starts with a small sky for its time (breakfast sunrise, lunch midday sun, dinner sunset, late night moon), matching the campus band. They mark the time, never the food, so they can't contradict the dishes. `aria-hidden`.
- **Brick-walk divider:** the band's lawn-over-brick strip (`--brick`, a running-bond CSS gradient) separates landing sections and tops the footer. High contrast turns it into a plain 1px line.
- **Motion:** wave, hop, thinking dots and press feedback only, all under 1.2 s. Nothing waits for an animation. With `prefers-reduced-motion` the poses still change but nothing moves.
- **Copy:** friendly and local through the hall names already used (Chase, Lenoir). No university slogans, and the mascot never says anything about safety or allergies.
