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
| `--accent` (+ `-hover`, `-active`) | `#1b5c8c` | `#7bafd4` | Links, selection check marks, focus (7.10:1 on white; 6.6:1+ on dark surfaces) |
| `--accent-text` | `#ffffff` | `#0b1322` | Text on `--accent` |
| `--accent-tint` / `--sel-bg` | `#e6eff8` | `#18263b` | Quiet-button hover, chosen quiz answer |
| `--primary` (+ `-text`, `-hover`, `-active`) | `#7bafd4` / `#13294b` | `#7bafd4` / `#0b1322` | **Primary action:** light-blue fill with navy text (6.17:1 light, 7.89:1 dark; hover 5.34:1 / 9.19:1) |
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

High contrast (`data-contrast=high`) darkens `--muted`, `--line` and the status colors, turns primary buttons solid (`#063a7a`/white; dark `#a9d1f0`/black), hides the campus band, removes translucency and glow, flattens fills to the card color and gives controls 2px borders, in both themes. Status is never color alone: every status also has a symbol (✓ △ ✕ ?) and a word.

## Typography
System UI stack only (no web fonts, no outbound requests): `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` (`"SF Pro Display"` first for headings). No font files are shipped. Tabular numbers for totals, nutrition, hours and tables. Headings use `text-wrap: balance`.

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
4-based scale: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 24, `--s6` 32, `--s7` 48, `--s8` 64. Gutter 16px on phones, 24px from 760px, 32px from 1200px, never less than the safe-area inset. Content width 1120px.
- **Today:** one column on phones; from 960px, meal card (wide column) + side column (other hall, your rules).
- **Menus:** filters above the list on phones; from 960px, a sticky filter sidebar (260px) + item list. Item details open as a bottom sheet on phones (with a grabber) and a floating right panel on desktop.
- **Me:** one column of sections with a chip row of section links on phones; from 960px, a sticky section list on the left.

Motion: `--dur-1` 120ms (state changes), `--dur-2` 200ms (switches, disclosure chevrons), `--dur-3` 320ms (reserved for overlays), one easing `--ease` (`cubic-bezier(.2,.8,.2,1)`). No entrance animations: the app redraws the whole view on each change, so they would replay. `prefers-reduced-motion` removes all transitions and the press scale.

## Shape and depth
Radius: `--r1` 8 (inputs), `--r2` 12 (buttons, tracks, banners), `--r3` 18 (cards, list groups), `--r4` 24 (meal card, sheet), pill for chips and badges. Elevation: `--e1` (cards: barely there), `--e2` (meal card only), `--e3` (sheet). In dark mode, `--e1` is none and `--edge` adds the top highlight.

## Components
- **Header:** sticky, translucent `--header-bg` with a hairline; the mascot button, the name + "Unofficial" tag (`--warm` fill, `--carolina-edge` border) on the left, three text links (Today, Menus, Me). The active link is `--text` with a 3px `--carolina-edge` bar and `aria-current="page"`. No bottom tab bar. Under it, the decorative campus band (64px desktop, 40px tablet; on phones a 9px strip of lawn over brick, no trees; not sticky). The brand name uses the system's rounded face where there is one (`ui-rounded`, Apple devices), else the display font.
- **Buttons:** primary (`--primary` light-blue fill, navy text, `--carolina-edge` border; at most one per view, not used for “Another idea”), secondary (neutral `--fill`, no border; the idea controls sit on `--card` with a hairline so they read above the meal card), quiet (accent text, tint on hover). Min 44px. Hover changes the fill; press scales to .985; focus shows the 3px `--focus` ring; disabled is 50% opacity with a not-allowed cursor.
- **Place picker:** one segmented group labeled “Place”, always 2 × 2: Chase, Top of Lenoir (row 1), Sweetgreen, Chipotle (row 2), with the same track, raised thumb and ✓. For a restaurant the date bar and meal pills are replaced by a `--card` info box: name · Franklin Street, “Hours unknown…”, and the national-menu note in `--muted`. Restaurant names are plain text in the system font; never a logo, brand color or trade dress.
- **Selected options** (hall, One meal / Whole day, meal pills, display settings): a `--fill` track with the chosen option as a raised `--thumb` and a ✓, never the filled primary style. The date bar uses the same track, but its date is an action, so it has no thumb.
- **Links:** `--accent`, underlined in body text with a thin offset underline; nav links not underlined.
- **Inputs and selects:** 44px, `--r1`, `--line-strong` border, `--card` fill, visible label above.
- **Cards:** `--card`, 1px `--line`, `--r3`, 16px padding (24px from 760px). One card per idea; never a grid of identical marketing cards.
- **Lists** (plate, menu items, Me rows): an inset group with hairline separators; whole rows are native buttons with a hover tint.
- **Disclosures:** `<details>` with one hairline chevron that turns when open.
- **Ingredients label** (dish details): one bordered panel in `--label-bg`/`--label-fg`, `--fs-sm` at 1.3 leading, square corners (it imitates a printed label, not the app's material). Bold uppercase “INGREDIENTS:” heading (a real h3, uppercased by CSS) followed by the ingredients as one flowing paragraph that is an inline `ul` (commas and brackets are real text). A ruled “CONTAINS:” line lists only allergens UNC declares. Under it: a `.prov` source line and a “Show original text” disclosure. Never claims weight order, “free of” or allergy safety.
- **Chips:** status words with a symbol, `--fs-2xs`, pill radius.
- **Footer:** hairline top, no fill: the allergy disclaimer, the unaffiliated notice, and links to About, Privacy, Update menus, Report a problem and Source code.

## Estimates
An estimated number always starts with “~” and sits next to the word “estimate” (cell label, list line or total label). Estimated nutrition cells use a dashed `--muted` border and no fill, so they never look like published numbers. The dish details explain the basis in an `--info-bg` note. Totals that include an estimate use “~”; totals of published numbers only never do.

## Imagery and icons
No photos or emoji icons. Text symbols only where they carry meaning (✓ △ ✕ ? ‹ › ★ ☆), always with a text label nearby. The site icon (`src/pwa/icon.svg`) is a plain fork-and-plate mark, not a UNC mark.

Original inline SVG art lives in `src/client/art.ts` (drawn for this project; colors from tokens; no lettering, no external references; `test/art.test.ts` guards this). **Never** add or imitate a UNC mark: no Old Well or any domed or columned campus landmark, no ram, no Tar Heel foot or footprint, no interlocking monogram, no wordmark or official font, nothing traced from unc.edu.
- **Mascot, the "Hungry Heel":** a high-top sneaker (not a foot) with a face, stick legs and a fork. Poses: idle, wave, think (loading), happy, sad/shrug. In the header it is a real `button` ("Hungry Heel mascot: tap to say hello") drawn in a cropped small version (`mascotSvg(pose, true)`: thicker lines, no cheeks) so it reads at 40px. A tap waves and shows a short line in a bubble beside it (never over the nav), also announced in the live region. It hops on the first meal and when your rules change (not on every idea or hall) and thinks while menus load. Elsewhere it is `aria-hidden` art next to words: the landing hero (desktop), loading, "No meal fits today" (shrug), "No menu saved/posted" (shrug), empty Saved meals (idle) and a successful menu import (happy).
- **Food sprites:** 39 original pictures (plate, soup, bowl, salad, veg, fruit, banana, potato, fries, rice, pasta, beans, chicken, meat, fish, shrimp, egg, tofu, cheese, bread, sandwich, burger, pizza, wrap, taco, sushi, pancake, waffle, cereal, cake, cookie, muffin, donut, ice cream, yogurt, candy, coffee, drink, sauce). Each dish row gets the one that fits the dish, chosen from its name by `src/client/dish-sprite.ts`: the kind of dish is the last food word (“Blueberry Swirl Cheesecake” is cake), “with …” and “(Made Without Gluten)” are ignored, and in “X and Y” names X wins when Y is one plain food (“Shrimp and Grits”). The station fills in only when the name says nothing; anything still unknown gets the neutral plate, never a guess. Menus station headings get a picture only when the station name names a food. Always `aria-hidden`, always beside words, never meaning on their own. Fills are `c-*` classes and outlines the theme ink, so they follow dark mode. A dish row press scales its glyph slightly.
- **Campus band:** sky, round oaks, lamp posts, lawn and a brick walk, in two different tiles so the repeat doesn't show. Generic: no buildings, no landmark. The sky follows the meal on screen (`data-sky`: breakfast → morning with a low sun, lunch → day, dinner → sunset, late dinner/late night → moon and stars; with no meal, the New York clock). The oaks follow the season in New York (`data-season`: spring blossoms, summer green, fall color, winter frost). Both have dark-mode colors; high contrast hides the band.
- **Brick-walk divider:** the band's lawn-over-brick strip (`--brick`, a running-bond CSS gradient) separates landing sections and tops the footer. High contrast turns it into a plain 1px line.
- **Motion:** wave, hop, thinking dots and press feedback only, all under 1.2 s. Nothing waits for an animation. With `prefers-reduced-motion` the poses still change but nothing moves.
- **Copy:** friendly and local through the hall names already used (Chase, Lenoir). No university slogans, and the mascot never says anything about safety or allergies.
