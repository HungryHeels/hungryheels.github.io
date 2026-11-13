// Original inline SVG art for Hungry Heels: the "Hungry Heel" mascot (a walking sneaker with a fork), a few food
// sprites and a campus band with simplified Chapel Hill landmarks (bell tower, library, stadium). Drawn from scratch
// for this project as plain silhouettes. Deliberately NOT a footprint, a bare foot, a ram, the Old Well, an
// interlocking monogram or any university logo or mark.
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

// ---------- campus sprites (32 x 32) ----------
// Small versions of the band's landmarks plus a dogwood blossom (the state flower). Original, flat, wordless and
// purely decorative: page-title marks and the footer row. Never the Old Well, a ram, a foot or any university mark.
export type Campus = 'belltower' | 'library' | 'stadium' | 'dogwood';
export const CAMPUS: readonly Campus[] = ['belltower', 'library', 'stadium', 'dogwood'];
const GROUND = '<path class="s-ink" d="M3 30.5h26"/>';
const CAMPUS_BODY: Record<Campus, string> = {
  belltower: '<rect class="q-stone2 c-o" x="11" y="27" width="10" height="3"/><rect class="q-brick c-o" x="12.5" y="14" width="7" height="13"/>' +
    '<path class="q-brick2" d="M14.4 16h1v9h-1zM16.6 16h1v9h-1z"/>' +
    '<rect class="q-stone c-o" x="12" y="9" width="8" height="5"/><path class="q-open" d="M13.6 13.5v-2.2a1 1 0 0 1 2 0v2.2zM16.4 13.5v-2.2a1 1 0 0 1 2 0v2.2z"/>' +
    '<rect class="q-stone c-o" x="13.5" y="5.5" width="5" height="3.5"/><path class="q-stone c-o" d="M14.3 5.5L16 .8l1.7 4.7z"/>' + GROUND,
  library: '<rect class="q-stone2 c-o" x="3" y="20" width="26" height="10"/><rect class="q-shade" x="10" y="17" width="12" height="12"/>' +
    '<path class="q-stone" d="M10.6 17.5h1.6v11h-1.6zM13.6 17.5h1.6v11h-1.6zM16.8 17.5h1.6v11h-1.6zM19.8 17.5h1.6v11h-1.6z"/>' +
    '<path class="q-stone c-o" d="M9 17h14l-7-3.5z"/><rect class="q-stone2 c-o" x="11.5" y="10.5" width="9" height="3"/>' +
    '<path class="q-dome c-o" d="M11 10.8q0-6.3 5-6.3t5 6.3z"/><rect class="q-stone c-o" x="15" y="1.8" width="2" height="2.8"/>' + GROUND,
  stadium: '<path class="q-post-fill" d="M5.4 6h1.2v12H5.4zM25.4 6h1.2v12h-1.2z"/><rect class="q-post-fill" x="3" y="3.5" width="6" height="3" rx=".6"/><rect class="q-post-fill" x="23" y="3.5" width="6" height="3" rx=".6"/>' +
    '<circle class="q-light" cx="5" cy="5" r=".8"/><circle class="q-light" cx="7" cy="5" r=".8"/><circle class="q-light" cx="25" cy="5" r=".8"/><circle class="q-light" cx="27" cy="5" r=".8"/>' +
    '<path class="q-stand c-o" d="M2 30V17q14-6 28 0v13z"/><path class="q-tier" d="M2 20.5q14-6 28 0"/>' +
    '<rect class="q-brick c-o" x="2" y="24" width="28" height="6"/><path class="q-open" d="M5 30v-2.6a1.2 1.2 0 0 1 2.4 0V30zM11 30v-2.6a1.2 1.2 0 0 1 2.4 0V30zM18.6 30v-2.6a1.2 1.2 0 0 1 2.4 0V30zM24.6 30v-2.6a1.2 1.2 0 0 1 2.4 0V30z"/>',
  dogwood: [0, 90, 180, 270].map(a => `<g transform="rotate(${a} 16 16)"><path class="c-petal" d="M16 15q-5.5-2-5.2-8 .2-3 5.2-3.6 5 .6 5.2 3.6.3 6-5.2 8z"/><path class="c-tip" d="M14.7 4.3q1.3 1.4 2.6 0-1.3-.9-2.6 0z"/></g>`).join('') +
    '<circle class="c-eye" cx="16" cy="16" r="3"/><circle class="c-dot" cx="15" cy="15.2" r=".7"/><circle class="c-dot" cx="17" cy="15.4" r=".7"/><circle class="c-dot" cx="16" cy="17" r=".7"/>',
};
export function campusSvg(name: Campus): string { return svg('0 0 32 32', CAMPUS_BODY[name], `sprite campus campus-${name}`); }

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

// ---------- campus band ----------
// Sky, round oaks, lamp posts, lawn and a brick walk, with three simplified campus silhouettes in the middle:
// a brick bell tower with a pale belfry and spire, a domed library with a columned portico, and a stadium bowl
// with light towers. Original, flat and wordless: impressions of the places, not logos or traced drawings.
// Ground line y = 96 everywhere; the brick walk repeats every 300 units so sections join without a seam.
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
/** Lawn and brick walk for a section `w` wide (a multiple of 300). */
function ground(w: number): string {
  let top = 'M0 103Q150 98 300 103', mid = 'M0 108Q150 103 300 108', bot = `Q${w - 150} 118 ${w - 300} 113`;
  for (let x = 600; x <= w; x += 300) { top += `T${x} 103`; mid += `T${x} 108`; }
  for (let x = w - 600; x >= 0; x -= 300) bot += `T${x} 113`;
  return `<rect class="q-grass" x="0" y="92" width="${w}" height="28"/>` +
    `<path class="q-brick" d="${top}V113${bot}Z"/><path class="q-joint" d="${mid}"/>`;
}
const at = (x: number, body: string) => `<g transform="translate(${x} 0)">${body}</g>`;
/** Arched opening, `w` wide, top of the arch at y. */
const arch = (x: number, y: number, w: number, h: number) => `<path class="q-open" d="M${x} ${y + h}V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V${y + h}Z"/>`;

/** Brick campanile: plinth, brick shaft with recessed panels, pale belfry with arches, lantern and spire. */
function bellTower(): string {
  return '<rect class="q-stone2" x="-12" y="88" width="24" height="8"/>' +
    '<rect class="q-brick" x="-9" y="40" width="18" height="48"/>' +
    '<rect class="q-brick2" x="-5" y="46" width="2.5" height="38"/><rect class="q-brick2" x="2.5" y="46" width="2.5" height="38"/>' +
    '<rect class="q-stone" x="-11" y="29" width="22" height="12"/>' +
    arch(-7, 31, 5, 9) + arch(2, 31, 5, 9) +
    '<rect class="q-stone2" x="-13" y="27" width="26" height="3"/>' +
    '<rect class="q-stone" x="-7.5" y="17" width="15" height="10"/>' +
    arch(-4.5, 19, 3.5, 7) + arch(1, 19, 3.5, 7) +
    '<rect class="q-stone2" x="-9" y="15.5" width="18" height="2.5"/>' +
    '<path class="q-stone" d="M-5.5 15.5L0 1L5.5 15.5Z"/>';
}
/** Library: pale wings, a columned portico on steps, a drum and a dome with a small lantern. */
function library(): string {
  let cols = '';
  for (let i = 0; i < 8; i++) cols += `<rect class="q-stone" x="${(-40 + i * 11.1).toFixed(1)}" y="64" width="4" height="25"/>`;
  let wins = '';
  for (const x of [-92, -80, -68, 60, 72, 84]) wins += `<rect class="q-open" x="${x}" y="76" width="6" height="10" rx="1"/>`;
  return '<rect class="q-stone2" x="-100" y="70" width="200" height="26"/>' +
    '<rect class="q-stone" x="-102" y="67" width="204" height="4"/>' + wins +
    '<rect class="q-shade" x="-45" y="62" width="90" height="27"/>' + cols +
    '<rect class="q-stone" x="-50" y="89" width="100" height="3"/><rect class="q-stone2" x="-54" y="92" width="108" height="4"/>' +
    '<rect class="q-stone" x="-49" y="55" width="98" height="8"/><path class="q-stone2" d="M-49 55L0 46L49 55Z"/>' +
    '<rect class="q-stone2" x="-24" y="38" width="48" height="10"/>' +
    '<path class="q-dome" d="M-25 39Q-25 15 0 15Q25 15 25 39Z"/>' +
    '<rect class="q-stone" x="-3.5" y="9" width="7" height="7"/><path class="q-stone2" d="M-4.5 9.5L0 4L4.5 9.5Z"/>';
}
/** Stadium among the trees: a long seating bowl with tiers and portals, an upper deck and two light towers. */
function stadium(): string {
  let portals = '';
  for (let x = -136; x <= 128; x += 22) portals += arch(x, 84, 8, 12);
  const tower = (x: number) => `<rect class="q-post-fill" x="${x - 1.75}" y="26" width="3.5" height="70"/><rect class="q-post-fill" x="${x - 11}" y="16" width="22" height="11" rx="1.5"/>` +
    `<circle class="q-light" cx="${x - 6}" cy="21.5" r="2.5"/><circle class="q-light" cx="${x}" cy="21.5" r="2.5"/><circle class="q-light" cx="${x + 6}" cy="21.5" r="2.5"/>`;
  return tower(-124) + tower(124) +
    '<path class="q-stand2" d="M-150 58V38Q-105 33 -55 38V54Z"/>' +
    '<path class="q-stand" d="M-150 96V54Q0 38 150 54V96Z"/>' +
    '<path class="q-tier" d="M-150 62Q0 46 150 62M-150 69Q0 54 150 69M-150 76Q0 62 150 76"/>' +
    '<rect class="q-brick" x="-150" y="82" width="300" height="14"/>' + portals;
}
const SECTION = 900;
const LANDMARKS =
  cloud(120, 22) + cloud(560, 16) + ground(SECTION) +
  at(170, stadium()) + tree(16, .75) + tree(340, .8) +
  at(505, library()) + tree(640, .95) + lamp(700) +
  `<g transform="translate(790 0) scale(1.4 1)">${bellTower()}</g>` + tree(860, .8);
const TILE =
  cloud(180, 26) + cloud(640, 18) + cloud(1010, 30) + ground(1200) +
  tree(70, 1) + tree(250, .8) + lamp(360) + tree(470, 1.1) + tree(700, .85) + lamp(820) + tree(930, 1.05) + tree(1120, .9);
const BAND_W = 4 * 1200 + SECTION;

/** The decorative band under the header: two tiles of oaks each side of the landmarks. Scales by height and stays
 *  centred, so the landmarks are always whole and in the middle, at any width. */
export function quadSvg(): string {
  return `<svg class="quad-svg" viewBox="0 0 ${BAND_W} 120" width="${BAND_W}" height="120" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">` +
    `<rect class="q-sky" x="0" y="0" width="${BAND_W}" height="120"/>` +
    `<g>${TILE}</g>${at(1200, TILE)}${at(2400, LANDMARKS)}${at(2400 + SECTION, TILE)}${at(3600 + SECTION, TILE)}</svg>`;
}

/** Short, friendly lines the mascot says when tapped. Place names only; no slogans, no claims about food safety. */
export const MASCOT_LINES = [
  'Hey there! Chase or Lenoir today?',
  'Laces tied. Let’s find you a plate.',
  'I checked every dish against your rules.',
  'Fueling up between classes? Same.',
  'Tap any dish to see why it fits.',
];
