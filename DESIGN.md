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
| `--accent` | `#1b5c8c` | `#7bafd4` | **Primary:** buttons, links, selected state |
| `--accent-text` | `#ffffff` | `#0b1322` | Text on primary |
| `--carolina` | `#7bafd4` | `#7bafd4` | **The one accent:** portion badges and the active-nav underline only |
| `--badge-text` | `#13294b` | `#13294b` | Text on `--carolina` (stays dark in both themes for contrast) |
| `--overlay` | `rgba(0,0,0,.45)` | same | Dims the page behind dish details |
| `--ok` / `--ok-bg` | `#14612f` / `#e3f3e8` | `#9ee0b4` / `#12351f` | Fits, passed |
| `--warn` / `--warn-bg` | `#6e4300` / `#fff1d6` | `#ffd88a` / `#40300d` | **Warnings only:** “Contains …” allergens, unsure, stale, confirm with staff. Never for neutral information such as where nutrition came from. |
| `--sel-bg` | `#e6eff8` | `#1b2c48` | Selected option (hall, meal, mode): tint + 2px `--accent` outline + ✓. Filled `--accent` is reserved for primary actions. |
| `--bad` / `--bad-bg` | `#8c1d1d` / `#fde6e6` | `#ffb4b4` / `#431818` | Not for you, removed |
| `--label-bg` / `--label-fg` | `#ffffff` / `#000000` | `#000000` / `#ffffff` | Ingredients label panel in dish details only (store-label look: black on white, inverted in dark) |
| `--focus` | `#0b57d0` | `#9cc3ff` | Focus ring |

High contrast (`data-contrast=high`) darkens `--muted`, `--line` and the status colors and doubles control borders, in both themes. Status is never color alone: every status also has a symbol (✓ △ ✕ ?) and a word.

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
- **Header:** white bar, sticky; the name "Hungry Heels" + "Unofficial" tag on the left, three text links (Today, Menus, Me) on the right. The active link is bold with a 3px `--carolina` underline and `aria-current="page"`. No bottom tab bar.
- **Buttons:** primary (filled `--accent`; at most one per view, and not used for “Another idea”), secondary (card background, `--line` border), quiet (text link style). Min 44px tall. Hover darkens the border; focus shows the 3px `--focus` ring; disabled is 55% opacity with a not-allowed cursor.
- **Selected options** (segmented controls, meal pills): `--sel-bg` tint, 2px `--accent` inset outline and a ✓, never the filled primary style.
- **Links:** `--accent`, underlined in body text; nav links not underlined until hover.
- **Inputs and selects:** 44px, `--r1`, `--line` border, `--bg` fill, visible label above.
- **Cards:** `--card`, 1px `--line`, `--r3`, 16px padding. One card per idea; never a grid of identical marketing cards.
- **Chips:** status words with a symbol, `--fs-xs`, pill radius.
- **Ingredients label** (dish details): one bordered panel in `--label-bg`/`--label-fg`, `--fs-sm` at 1.3 leading. Bold uppercase “INGREDIENTS:” heading (a real h3, uppercased by CSS) followed by the ingredients as one flowing paragraph that is an inline `ul` (commas and brackets are real text). A ruled “CONTAINS:” line lists only allergens UNC declares. Under it: a `.prov` source line and a “Show original text” disclosure. Never claims weight order, “free of” or allergy safety.
- **Footer:** full width, `--muted` text: the allergy disclaimer, the unaffiliated notice, and links to Privacy, How to update menus, Report a problem and Source code.

## Estimates
An estimated number always starts with “~” and sits next to the word “estimate” (cell label, list line or total label). Estimated nutrition cells use a dashed `--muted` border and no fill, so they never look like published numbers. The dish details explain the basis in an `--info-bg` note. Totals that include an estimate use “~”; totals of published numbers only never do.

## Imagery and icons
No photos, illustrations or emoji icons. Text symbols only where they carry meaning (✓ △ ✕ ? ‹ › ★ ☆), always with a text label nearby. The site icon (`src/pwa/icon.svg`) is a plain fork-and-plate mark, not a UNC mark.
