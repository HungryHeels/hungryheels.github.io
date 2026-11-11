# Hungry Heels design system

Direction: **a calm, practical reference website**, like a well-made transit or library site: plain system type, one strong navy, white cards, a lot of left-aligned text and tables. It should feel trustworthy and quick to scan, not like a marketing page or a game. Not based on comparing real sites: the UXKIN library was tried twice (Nov 11) and could not be reached from the build environment. Built from the existing brand colors and the rules below. Only raw values allowed outside the tokens: the print stylesheet and the white switch knob.

No UNC logos, wordmarks, seals or trademarked colors used as branding. Navy and light blue are generic colors here; the word "Unofficial" always sits next to the name.

## Color (CSS variables in `src/client/style.css`)
| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#f4f5f7` | `#0b1322` | Page background |
| `--card` | `#ffffff` | `#16233b` | Cards, header, panels |
| `--text` | `#13294b` | `#eef3fa` | Body text and headings |
| `--muted` | `#4f5b6e` | `#aab8cd` | Secondary text (≥ 4.5:1 on `--card` and `--bg`) |
| `--line` | `#d5dbe6` | `#2c3d5c` | Borders and dividers |
| `--accent` | `#1b5c8c` | `#7bafd4` | Links, selected-option outline, switches |
| `--accent-text` | `#ffffff` | `#0b1322` | Text on `--accent` |
| `--carolina` | `#7bafd4` | `#7bafd4` | **Brand light blue:** portion badges, meal-card top stripe, art fills. Never text on white (2.35:1) |
| `--carolina-edge` | `#4a86b8` | `#7bafd4` | Deeper light blue for marks and edges that must read on white: active-nav underline, primary button border, "Unofficial" tag border (3.89:1 on white, 3.57:1 on `--bg`) |
| `--primary` / `--primary-text` | `#7bafd4` / `#13294b` | `#7bafd4` / `#0b1322` | **Primary action:** light-blue fill with navy text (6.17:1 light, 7.89:1 dark). Hover `--primary-hover` `#6aa3cc` / `#8fbcdc` (5.34:1 / 9.19:1) |
| `--navy` | `#13294b` | `#13294b` | Fixed deep navy (same value as light `--text`) |
| `--warm` | `#f6f1e8` | `#1f2a3d` | Warm neutral: total and nutrition tiles, footer, "Unofficial" tag. `--text` 12.90:1 / 12.93:1, `--muted` 6.11:1 / 7.17:1 |
| `--say-bg` / `--say-text` | `#13294b` / `#ffffff` | `#dce8f7` / `#13294b` | Mascot speech bubble (14.52:1 / 11.70:1) |
| `--badge-text` | `#13294b` | `#13294b` | Text on `--carolina` (stays dark in both themes for contrast) |
| `--overlay` | `rgba(0,0,0,.45)` | same | Dims the page behind dish details |
| `--ok` / `--ok-bg` | `#14612f` / `#e3f3e8` | `#9ee0b4` / `#12351f` | Fits, passed |
| `--warn` / `--warn-bg` | `#6e4300` / `#fff1d6` | `#ffd88a` / `#40300d` | **Warnings only:** “Contains …” allergens, unsure, stale, confirm with staff. Never for neutral information such as where nutrition came from. |
| `--sel-bg` | `#e6eff8` | `#1b2c48` | Selected option (hall, meal, mode): tint + 2px `--accent` outline + ✓. Filled `--accent` is reserved for primary actions. |
| `--bad` / `--bad-bg` | `#8c1d1d` / `#fde6e6` | `#ffb4b4` / `#431818` | Not for you, removed |
| `--focus` | `#0b57d0` | `#9cc3ff` | Focus ring |

High contrast (`data-contrast=high`) darkens `--muted`, `--line` and the status colors, doubles control borders, turns primary buttons solid (`#0a3d66`/white 11.2:1; dark `#a9d1f0`/black 13.1:1) and hides the campus band, in both themes.
Art colors (`--m-*` mascot, `--s-ink` sprites, `--q-*` campus band) are tokens too, with dark values; they are decorative and carry no meaning.
Every text pair above was checked for WCAG AA, and a computed sweep of all visible text on Landing, Today, Menus, Me and dish details passes in both themes (lowest 6.09:1 light, 5.55:1 dark). Status is never color alone: every status also has a symbol (✓ △ ✕ ?) and a word.

## Typography
System UI stack only (no web fonts, no outbound requests): `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Tabular numbers in tables.

| Token | Size / line height | Use |
|---|---|---|
| `--fs-xs` | 13 / 1.4 | Footnotes, chips |
| `--fs-sm` | 14 / 1.45 | Secondary text, tables |
| `--fs-md` | 16 / 1.5 | Body (minimum for reading text) |
| `--fs-lg` | 18 / 1.4 | Dish names, card titles |
| `--fs-xl` | 22 / 1.3 | Section headings (h2) |
| `--fs-2xl` | 28 / 1.2 | Page title on phones |
| `--fs-3xl` | 36 / 1.1 | Page title on desktop |

Weights: 400 body, 600 labels and buttons, 700 headings and dish names. Paragraphs max 68ch.

## Spacing and layout
4-based scale: `--s1` 4, `--s2` 8, `--s3` 12, `--s4` 16, `--s5` 24, `--s6` 32, `--s7` 48. Page gutter 16px on phones, 24px from 760px. Content width 1120px. Sections separated by `--s6`.
- **Today:** one column on phones; from 960px, meal card (wide column) + side column (other hall, whole day).
- **Menus:** filters above the list on phones; from 960px, a sticky filter sidebar (260px) + item list. Item details open as a bottom sheet on phones and a right-side panel on desktop.
- **Me:** one column of sections; from 960px, a sticky in-page section list on the left.

## Shape and depth
Radius: `--r1` 6 (inputs), `--r2` 10 (buttons; the selected option inside a segmented control uses `--r2` minus its 3px inset), `--r3` 14 (cards, panels), pill (999px) for chips, pills and badges. One shadow, `--shadow: 0 1px 2px rgba(19,41,75,.12)`, cards only; none in dark mode.

## Components
- **Header:** white bar, sticky; the mascot button, the name "Hungry Heels" + "Unofficial" tag on the left, three text links (Today, Menus, Me) on the right. The active link is bold with a 3px `--carolina-edge` underline and `aria-current="page"`. No bottom tab bar. Under it, the decorative campus band (64px desktop, 40px tablet, a 14px strip on phones; not sticky).
- **Buttons:** primary (`--primary` light-blue fill, navy text, `--carolina-edge` border; at most one per view, and not used for “Another idea”), secondary (card background, `--line` border), quiet (text link style). Min 44px tall. Hover darkens the border; focus shows the 3px `--focus` ring; disabled is 55% opacity with a not-allowed cursor.
- **Selected options** (segmented controls, meal pills): `--sel-bg` tint, 2px `--accent` inset outline and a ✓, never the filled primary style.
- **Links:** `--accent`, underlined in body text; nav links not underlined until hover.
- **Inputs and selects:** 44px, `--r1`, `--line` border, `--bg` fill, visible label above.
- **Cards:** `--card`, 1px `--line`, `--r3`, 16px padding. One card per idea; never a grid of identical marketing cards.
- **Chips:** status words with a symbol, `--fs-xs`, pill radius.
- **Footer:** full width, `--muted` text: the allergy disclaimer, the unaffiliated notice, and links to Privacy, How to update menus, Report a problem and Source code.

## Estimates
An estimated number always starts with “~” and sits next to the word “estimate” (cell label, list line or total label). Estimated nutrition cells use a dashed `--muted` border and no fill, so they never look like published numbers. The dish details explain the basis in an `--info-bg` note. Totals that include an estimate use “~”; totals of published numbers only never do.

## Imagery and icons
No photos or emoji icons. Text symbols only where they carry meaning (✓ △ ✕ ? ‹ › ★ ☆), always with a text label nearby. The site icon (`src/pwa/icon.svg`) is a plain fork-and-plate mark, not a UNC mark.

Original inline SVG art lives in `src/client/art.ts` (drawn for this project; colors from tokens; no lettering, no external references; `test/art.test.ts` guards this). **Never** add or imitate a UNC mark: no Old Well or any domed or columned campus landmark, no ram, no Tar Heel foot or footprint, no interlocking monogram, no wordmark or official font, nothing traced from unc.edu.
- **Mascot, the "Hungry Heel":** a high-top sneaker (not a foot) with a face, stick legs and a fork. Poses: idle, wave, think (loading), happy (a new meal was built), sad/shrug ("No meal fits today"). In the header it is a real `button` ("Hungry Heel mascot: tap to say hello"): a tap waves and shows a short line, also announced in the live region. It hops once per new meal and shows the thinking pose while menus load. Elsewhere (loading, empty state, landing hero on desktop) it is `aria-hidden`.
- **Food sprites:** plate, bowl, fruit, salad, burger, pizza slice, coffee. Course glyphs on dish rows (by dish name, then station, else plate for a main and bowl for a side), station glyphs on Menus only when the station name names that food, and the empty-list picture. Always `aria-hidden`, always beside words, never meaning on their own. A dish row press scales its glyph slightly.
- **Campus band:** sky, round oaks, lamp posts, lawn and a brick walk. Generic: no buildings, no landmark.
- **Motion:** wave, hop, thinking dots and press feedback only, all under 1.2 s. Nothing waits for an animation. With `prefers-reduced-motion` the poses still change but nothing moves.
- **Copy:** friendly and local through the hall names already used (Chase, Lenoir). No university slogans, and the mascot never says anything about safety or allergies.
