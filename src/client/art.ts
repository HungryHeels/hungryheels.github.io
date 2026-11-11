// Original inline SVG art for Hungry Heels: the "Hungry Heel" mascot (a walking sneaker with a fork), a few food
// sprites and a generic campus-quad band. Drawn from scratch for this project. Deliberately NOT a footprint, a bare
// foot, a ram, a domed or columned landmark, an interlocking monogram or any university mark.
// Pure strings (no DOM) so they can be tested in Node. Colors come from CSS custom properties (see style.css), so
// the art follows light, dark and high-contrast themes. No external references of any kind.

export type Pose = 'idle' | 'wave' | 'think' | 'happy' | 'sad';
export const POSES: readonly Pose[] = ['idle', 'wave', 'think', 'happy', 'sad'];
export type Sprite = 'plate' | 'bowl' | 'fruit' | 'salad' | 'burger' | 'pizza' | 'coffee';
export const SPRITES: readonly Sprite[] = ['plate', 'bowl', 'fruit', 'salad', 'burger', 'pizza', 'coffee'];

const svg = (viewBox: string, body: string, cls: string) =>
  `<svg class="${cls}" viewBox="${viewBox}" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

// ---------- the Hungry Heel ----------
// A high-top sneaker seen from the side (toe to the right), with a face on the ankle panel, stick legs and arms.
const SHOE =
  '<path class="m-sole" d="M10 45H52q5 0 5 4t-4 3H13q-3 0-3-3.5z"/>' +
  '<path class="m-upper" d="M12 45V19q0-6 6-6h9q5 0 5 5v9q1 5 8 7l10 2.5q6 1.5 6 8.5z"/>' +
  '<path class="m-toe" d="M45 35.4q11 2.2 11 9.6H45z"/>' +
  '<path class="m-band" d="M12 39.5h33v2.6H12z"/>' +
  '<path class="m-line" d="M13.5 17.5q8.5 3.5 17 0"/>' +
  '<path class="m-lace" d="M33 28.5l4-2M35.5 31.5l4-2M38.5 34l3.5-1.6"/>';
const CHEEKS = '<ellipse class="m-cheek" cx="16" cy="29.5" rx="1.7" ry="1.1"/><ellipse class="m-cheek" cx="28" cy="29.5" rx="1.7" ry="1.1"/>';
const EYES = '<circle class="m-ink" cx="19" cy="25" r="2.2"/><circle class="m-ink" cx="25" cy="25" r="2.2"/><circle class="m-shine" cx="19.7" cy="24.3" r=".7"/><circle class="m-shine" cx="25.7" cy="24.3" r=".7"/>';
const LEGS = (l: string, r: string) => `<path class="m-limb" d="${l}"/><path class="m-limb" d="${r}"/>`;
const STAND = LEGS('M22 52l-1.5 7', 'M42 52l1.5 7') + '<ellipse class="m-foot" cx="19" cy="59.6" rx="3.2" ry="1.7"/><ellipse class="m-foot" cx="45" cy="59.6" rx="3.2" ry="1.7"/>';
const STEP = LEGS('M22 52l-4 6', 'M42 52l3 6.5') + '<ellipse class="m-foot" cx="16.5" cy="58.6" rx="3.2" ry="1.7"/><ellipse class="m-foot" cx="46.5" cy="59.2" rx="3.2" ry="1.7"/>';
const HAND = (x: number, y: number) => `<circle class="m-hand" cx="${x}" cy="${y}" r="1.8"/>`;
/** A fork whose handle runs from (x1,y1) (the hand) to (x2,y2), tines beyond it. */
function fork(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const p = (a: number, b: number) => `${(x2 + ux * a + px * b).toFixed(1)} ${(y2 + uy * a + py * b).toFixed(1)}`;
  return `<path class="m-fork" d="M${x1} ${y1}L${x2} ${y2}M${p(0, -2.2)}L${p(0, 2.2)}M${p(0, -2.2)}L${p(4.5, -2.2)}M${p(0, 0)}L${p(5, 0)}M${p(0, 2.2)}L${p(4.5, 2.2)}"/>`;
}

const POSE_PARTS: Record<Pose, string> = {
  idle: STEP + '<path class="m-limb" d="M12 31q-5 3-6 7.5"/>' + HAND(6, 38.5) +
    '<path class="m-limb" d="M32 25q5 2 8-1"/>' + fork(40, 24, 41, 15) + HAND(40, 24) +
    EYES + CHEEKS + '<path class="m-mouth" d="M18.5 30q3.5 3 7 0"/>',
  wave: STAND + '<g class="m-wave-arm"><path class="m-limb" d="M12 29q-6-4-6.5-11"/>' + HAND(5.5, 17.5) + '</g>' +
    '<path class="m-limb" d="M32 25q5 2 8-1"/>' + fork(40, 24, 41, 15) + HAND(40, 24) +
    EYES + CHEEKS + '<path class="m-mouth m-open" d="M18.5 29.5q3.5 4.5 7 0z"/>',
  think: STAND + '<path class="m-limb" d="M12 31q4 5 9 2.5"/>' + HAND(21, 33.2) +
    '<path class="m-limb" d="M32 25q5 2 8-1"/>' + fork(40, 24, 41, 15) + HAND(40, 24) +
    '<circle class="m-ink" cx="19.5" cy="24.4" r="2"/><circle class="m-ink" cx="25.5" cy="24.4" r="2"/>' +
    '<path class="m-line" d="M17 20.6l4-.8M23 19.8l4 .8"/><path class="m-mouth" d="M20 30.5h4"/>' +
    '<g class="m-dots"><circle class="m-dot" cx="35" cy="7" r="1.6"/><circle class="m-dot" cx="40.5" cy="4" r="2"/><circle class="m-dot" cx="47" cy="1.5" r="2.4"/></g>',
  happy: STEP + '<path class="m-limb" d="M12 29q-4-6-3-13"/>' + HAND(9, 15.5) +
    '<path class="m-limb" d="M32 24q5-5 7-12"/>' + fork(39, 12, 39.8, 4) + HAND(39, 12) +
    '<path class="m-line" d="M17 25.5q2-3 4 0M23 25.5q2-3 4 0"/>' + CHEEKS + '<path class="m-mouth m-open" d="M18 29q4 6 8 0z"/>',
  sad: STAND + '<path class="m-limb" d="M12 31q-5 1.5-7.5-2.5"/>' + HAND(4.5, 28) +
    '<path class="m-limb" d="M32 26q5 4 9.5 1.5"/>' + fork(41.5, 27.5, 49, 31) + HAND(41.5, 27.5) +
    EYES + '<path class="m-line" d="M16.8 22.6l4-1.6M27.2 22.6l-4-1.6"/><path class="m-mouth" d="M19 31.5q3-2.6 6 0"/>',
};

/** The mascot in one pose, as an SVG string. Always aria-hidden: whatever holds it carries the label. */
export function mascotSvg(pose: Pose): string {
  return svg('0 -4 64 68', `<g class="m-body">${SHOE}${POSE_PARTS[pose]}</g>`, `mascot-svg pose-${pose}`);
}

// ---------- food sprites (32 x 32) ----------
const SPRITE_BODY: Record<Sprite, string> = {
  plate: '<ellipse class="s-plate" cx="16" cy="18" rx="13" ry="9"/><ellipse class="s-plate-in" cx="16" cy="17.5" rx="8" ry="5.2"/>' +
    '<path class="s-ink" d="M4.5 6v5q0 2 2 2.4V24M6.5 6v5M8.5 6v5q0 2-2 2.4M27.5 6q-3 2-3 7 0 2 2 2.5V24"/>',
  bowl: '<path class="s-steam" d="M12 3.5q-2 2 0 4t0 4M20 3.5q-2 2 0 4t0 4"/><ellipse class="s-food" cx="16" cy="15" rx="12" ry="3"/>' +
    '<path class="s-bowl" d="M3.5 15h25q-1 9-9 11h-7q-8-2-9-11z"/><path class="s-ink" d="M11 29h10"/>',
  fruit: '<path class="s-apple" d="M16 9q-4-3-8-1-5 3-3 11 2 8 7 9 2 .5 4-.5 2 1 4 .5 5-1 7-9 2-8-3-11-4-2-8 1z"/>' +
    '<path class="s-ink" d="M16 9q0-4 2-6"/><path class="s-leaf" d="M18 6q4-4 8-2-3 4-8 2z"/><ellipse class="s-shine" cx="10.5" cy="14" rx="1.6" ry="2.6"/>',
  salad: '<circle class="s-leaf" cx="10" cy="13" r="5"/><circle class="s-leaf2" cx="16" cy="11" r="5.5"/><circle class="s-leaf" cx="22" cy="13" r="5"/>' +
    '<circle class="s-tomato" cx="13" cy="13.5" r="2"/><circle class="s-tomato" cx="20" cy="12" r="1.8"/>' +
    '<path class="s-bowl" d="M3.5 15h25q-1 9-9 11h-7q-8-2-9-11z"/>',
  burger: '<path class="s-bun" d="M5 14q0-9 11-9t11 9z"/><path class="s-leaf" d="M4 14.5h24l-2 2.2-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6z"/>' +
    '<rect class="s-patty" x="4.5" y="17" width="23" height="4.6" rx="2.3"/><path class="s-bun" d="M5 23h22q0 4-4 4H9q-4 0-4-4z"/>' +
    '<path class="s-seed" d="M11 9.5l1.4-.6M16 8l1.4.3M20.5 10l1.2.7"/>',
  pizza: '<path class="s-cheese" d="M4.5 7.5Q16 2.5 27.5 7.5L16 29z"/><path class="s-crust" d="M4.5 7.5Q16 2.5 27.5 7.5l-1.3 2.6Q16 6 5.8 10.1z"/>' +
    '<circle class="s-pep" cx="12.5" cy="12.5" r="2"/><circle class="s-pep" cx="19.5" cy="13" r="2"/><circle class="s-pep" cx="16" cy="19.5" r="1.8"/>',
  coffee: '<path class="s-steam" d="M12 2.5q-2 2 0 4t0 4M18 2.5q-2 2 0 4t0 4"/><path class="s-cup" d="M6 12h17v9q0 7-7 7h-3q-7 0-7-7z"/>' +
    '<path class="s-band" d="M6 16h17v3.5H6z"/><path class="s-ink" d="M23 14.5q5 0 5 4t-5.2 4"/>',
};

export function spriteSvg(name: Sprite): string { return svg('0 0 32 32', SPRITE_BODY[name], `sprite sprite-${name}`); }

/** A decorative glyph for a dish: by its name, then its station, then whether it is a main or a side.
 *  Only a picture; it never stands in for words and never decides anything. */
export function spriteFor(itemName: string, station: string, role: 'main' | 'side' = 'main'): Sprite {
  return keywordSprite(itemName) ?? keywordSprite(station) ?? (role === 'side' ? 'bowl' : 'plate');
}
/** A sprite only when the words clearly name that kind of food; null otherwise (no generic filler glyphs). */
export function keywordSprite(text: string): Sprite | null {
  const t = text.toLowerCase();
  if (/pizza|flatbread|calzone/.test(t)) return 'pizza';
  if (/burger|slider/.test(t)) return 'burger';
  if (/salad|greens/.test(t)) return 'salad';
  if (/coffee|latte|espresso|tea\b|cocoa|beverage|drink|caf[eé]/.test(t)) return 'coffee';
  if (/\bfruit|\bapples?\b|banana|\bgrapes?\b|melon|berries|berry\b|pineapple|\bpeach|\bpears?\b/.test(t)) return 'fruit';
  if (/soup|chili|stew|bowl|noodle|ramen|pho\b|oatmeal|grits|cereal/.test(t)) return 'bowl';
  return null;
}

// ---------- campus quad band ----------
// Generic and not of any real place: sky, a few round oak trees, lamp posts, lawn and a brick walk. No buildings.
function tree(x: number, s: number): string {
  const r = (n: number) => (n * s).toFixed(1);
  return `<rect class="q-trunk" x="${(x - 3 * s).toFixed(1)}" y="${(96 - 26 * s).toFixed(1)}" width="${r(6)}" height="${r(26)}" rx="${r(2)}"/>` +
    `<circle class="q-oak2" cx="${(x - 14 * s).toFixed(1)}" cy="${(96 - 34 * s).toFixed(1)}" r="${r(15)}"/>` +
    `<circle class="q-oak2" cx="${(x + 15 * s).toFixed(1)}" cy="${(96 - 33 * s).toFixed(1)}" r="${r(14)}"/>` +
    `<circle class="q-oak" cx="${x}" cy="${(96 - 44 * s).toFixed(1)}" r="${r(19)}"/>` +
    `<circle class="q-oak" cx="${(x - 9 * s).toFixed(1)}" cy="${(96 - 30 * s).toFixed(1)}" r="${r(12)}"/>` +
    `<circle class="q-oak" cx="${(x + 10 * s).toFixed(1)}" cy="${(96 - 29 * s).toFixed(1)}" r="${r(12)}"/>`;
}
const lamp = (x: number) => `<path class="q-post" d="M${x} 98V66"/><circle class="q-light" cx="${x}" cy="63" r="4"/>`;
const cloud = (x: number, y: number) => `<g class="q-cloud"><ellipse cx="${x}" cy="${y}" rx="26" ry="8"/><ellipse cx="${x + 14}" cy="${y - 5}" rx="15" ry="8"/><ellipse cx="${x - 12}" cy="${y - 3}" rx="11" ry="6"/></g>`;
const TILE =
  cloud(180, 26) + cloud(640, 18) + cloud(1010, 30) +
  '<rect class="q-grass" x="0" y="92" width="1200" height="28"/>' +
  tree(70, 1) + tree(250, .8) + lamp(360) + tree(470, 1.1) + tree(700, .85) + lamp(820) + tree(930, 1.05) + tree(1120, .9) +
  '<path class="q-brick" d="M0 103Q150 98 300 103T600 103T900 103T1200 103V113Q1050 118 900 113T600 113T300 113T0 113Z"/>' +
  '<path class="q-joint" d="M0 108Q150 103 300 108T600 108T900 108T1200 108"/>';

/** The decorative band under the header. Two copies of one 1200-wide tile so wide screens never run out. */
export function quadSvg(): string {
  return `<svg class="quad-svg" viewBox="0 0 2400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">` +
    '<rect class="q-sky" x="0" y="0" width="2400" height="120"/>' +
    `<g>${TILE}</g><g transform="translate(1200 0)">${TILE}</g></svg>`;
}

/** Short, friendly lines the mascot says when tapped. Place names only; no slogans, no claims about food safety. */
export const MASCOT_LINES = [
  'Hey there! Chase or Lenoir today?',
  'Laces tied. Let’s find you a plate.',
  'I checked every dish against your rules.',
  'Fueling up between classes? Same.',
  'Tap any dish to see why it fits.',
];
