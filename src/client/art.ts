// Original inline SVG art for Hungry Heels: the "Hungry Heel" mascot (a walking sneaker with a fork), a few food
// sprites and a generic campus-quad band. Drawn from scratch for this project. Deliberately NOT a footprint, a bare
// foot, a ram, a domed or columned landmark, an interlocking monogram or any university mark.
// Pure strings (no DOM) so they can be tested in Node. Colors come from CSS custom properties (see style.css), so
// the art follows light, dark and high-contrast themes. No external references of any kind.

export type Pose = 'idle' | 'wave' | 'think' | 'happy' | 'sad';
export const POSES: readonly Pose[] = ['idle', 'wave', 'think', 'happy', 'sad'];
export const SPRITES = ["plate", "soup", "bowl", "salad", "veg", "fruit", "banana", "potato", "fries", "rice", "pasta", "beans", "chicken", "meat", "fish", "shrimp", "egg", "tofu", "cheese", "bread", "sandwich", "burger", "pizza", "wrap", "taco", "sushi", "pancake", "waffle", "cereal", "cake", "cookie", "muffin", "donut", "icecream", "yogurt", "candy", "coffee", "drink", "sauce"] as const;
export type Sprite = typeof SPRITES[number];

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
// One picture per kind of food, chosen per dish by dish-sprite.ts. Fill colors are CSS classes (c-*), outlines use the
// theme's ink, so the sprites follow light, dark and high contrast. Shapes are outlined unless marked "n" (no outline);
// "l" is a line with no fill.
const BOWL = '<path class="c-blue" d="M3.5 15h25q-1 9-9 11h-7q-8-2-9-11z"/><path class="l" d="M11 29h10"/>';
const STEAM = (a: number, b: number) => `<path class="l ls-steam" d="M${a} 3.5q-2 2 0 4t0 4M${b} 3.5q-2 2 0 4t0 4"/>`;
const cube = (x: number, y: number) =>
  `<path class="c-tofu" d="M${x} ${y}l7-3.5 7 3.5-7 3.5z"/><path class="c-tofu2" d="M${x} ${y}v7l7 3.5v-7z"/><path class="c-tofu3" d="M${x + 7} ${y + 3.5}v7l7-3.5v-7z"/>`;
const maki = (x: number, y: number, mid: string) =>
  `<path class="c-nori" d="M${x - 7} ${y}v5.5a7 3.2 0 0 0 14 0V${y}z"/><ellipse class="c-nori" cx="${x}" cy="${y}" rx="7" ry="3.2"/>` +
  `<ellipse class="n c-white" cx="${x}" cy="${y}" rx="5.3" ry="2.3"/><ellipse class="n ${mid}" cx="${x}" cy="${y}" rx="2" ry="1"/>`;
const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0-${2 * r} 0z`;

const SPRITE_BODY: Record<Sprite, string> = {
  plate: '<ellipse class="c-white" cx="16" cy="19" rx="12.5" ry="8"/><ellipse class="l ls-blue" cx="16" cy="18.6" rx="7.5" ry="4.6"/>' +
    '<path class="l" d="M4 4v5q0 2 2 2.3V27M6 4v5M8 4v5q0 2-2 2.3M28 4q-3 2-3 7 0 2 2 2.5V27"/>',
  soup: STEAM(12, 20) + '<ellipse class="c-orange" cx="16" cy="15" rx="12" ry="3"/>' + BOWL,
  bowl: '<path class="c-cream" d="M5 15q2-7.5 11-7.5t11 7.5z"/><circle class="n c-green" cx="10.5" cy="12.2" r="2.3"/>' +
    '<circle class="n c-orange" cx="16" cy="10.2" r="2.3"/><circle class="n c-brown" cx="21.3" cy="12.4" r="2.2"/>' + BOWL,
  salad: '<circle class="c-green" cx="10" cy="13" r="5"/><circle class="c-lime" cx="16" cy="11" r="5.5"/><circle class="c-green" cx="22" cy="13" r="5"/>' +
    '<circle class="c-red" cx="13" cy="13.5" r="2"/><circle class="c-red" cx="20" cy="12" r="1.8"/>' + BOWL,
  veg: '<path class="c-lime" d="M8.5 17h5l1 11h-7z"/><circle class="c-green" cx="6.8" cy="15" r="4"/><circle class="c-green" cx="15.2" cy="15" r="4"/><circle class="c-green" cx="11" cy="10.5" r="4.8"/>' +
    '<path class="l ls-green" d="M24 9.5l-1-5M25.5 10l3.5-3.5M23 10.5l-4-2.5"/><path class="c-orange" d="M19.5 11.5q4-2.5 7.5.5L17 28.5q-1.6.9-1.6-.9z"/>' +
    '<path class="l" d="M20.5 16l2 1M19 20l2 1"/>',
  fruit: '<circle class="c-purple" cx="22" cy="8" r="2.2"/><circle class="c-purple" cx="26.2" cy="8" r="2.2"/><circle class="c-purple" cx="24.1" cy="11.6" r="2.2"/>' +
    '<circle class="c-purple" cx="20" cy="12" r="2.2"/><circle class="c-purple" cx="28" cy="12" r="2.1"/><circle class="c-purple" cx="24" cy="15.4" r="2.2"/>' +
    '<path class="c-red" d="M11 11q-3-2-6 0-4 3-2 9.5 2 6 6 6 1 0 2-.6 1 .6 2 .6 4 0 5.5-6 1.5-6.5-1.5-9.5-3-2-6 0z"/>' +
    '<path class="l" d="M11 11q0-3 1.5-4.5"/><path class="c-green" d="M12.5 7q3-2.5 5.5-1-2 2.8-5.5 1z"/>' +
    '<path class="c-orange" d="M15 28.5a7.5 7.5 0 0 1 15 0z"/><path class="l" d="M22.5 28.5v-5.5M22.5 28.5l-4-4M22.5 28.5l4-4"/>',
  banana: '<path class="c-yellow" d="M6 7q1 15 14 18.5 6 1.5 8.5-1.5-1-1.5-3.5-1-11-1.5-14.5-15.5z"/><path class="l" d="M9 9q3 10 13 13.5"/>' +
    '<path class="c-brown" d="M6 7l-1.5-3.2 3.1-.4 .5 3.5z"/>',
  potato: '<ellipse class="c-tan" cx="16" cy="17" rx="12.5" ry="8.5" transform="rotate(-18 16 17)"/>' +
    '<circle class="n c-brown" cx="10" cy="17" r="1"/><circle class="n c-brown" cx="17" cy="13" r="1"/><circle class="n c-brown" cx="21" cy="19" r="1"/><circle class="n c-brown" cx="14" cy="21" r=".9"/>',
  fries: '<path class="c-yellow" d="M9 15L7.6 4.5h3L12 15zM13 15V3h3v12zM17 15l1.2-11h3L20 15zM21 15l2.4-9h3L23.6 15z"/>' +
    '<path class="c-red" d="M6 13.5h20l-2.5 15h-15z"/><path class="l" d="M10 18q6 3 12 0"/>',
  rice: '<path class="l ls-brown" d="M19 2.5l-5 12M25 3.5l-8 11"/><path class="c-white" d="M5 15q2-8.5 11-8.5t11 8.5z"/>' +
    '<path class="l ls-grain" d="M9 12.5l1-.6M12.5 10l1 .4M16 12l1-.5M19.5 9.5l1 .5M21.5 12.8l1-.4M14 14l.9-.4"/>' + BOWL,
  pasta: '<ellipse class="c-white" cx="16" cy="21" rx="13" ry="7"/><path class="c-yellow" d="M7 19.5q1-8.5 9-8.5t9 8.5q-4 3-9 3t-9-3z"/>' +
    '<path class="l ls-thin" d="M10 17.5q3-4 6-1t6-1M9.5 20q4-3 7 0t6-1M12.5 13.5q3 2 6 0"/><circle class="c-red" cx="16" cy="13.5" r="2.7"/>',
  beans: '<path class="c-brown" d="M5 15q2-7 11-7t11 7z"/>' +
    '<ellipse class="c-red" cx="10.5" cy="12.4" rx="2.2" ry="1.4" transform="rotate(-20 10.5 12.4)"/><ellipse class="c-red" cx="16" cy="10.6" rx="2.2" ry="1.4" transform="rotate(15 16 10.6)"/>' +
    '<ellipse class="c-red" cx="21.4" cy="12.6" rx="2.2" ry="1.4" transform="rotate(-10 21.4 12.6)"/>' + BOWL,
  chicken: '<path class="c-white" d="M15.5 17.8l2.3-2.3 6.6 6.6-2.3 2.3z"/><circle class="c-white" cx="25.6" cy="22" r="2.3"/><circle class="c-white" cx="22.6" cy="25.4" r="2.3"/>' +
    '<ellipse class="c-tan" cx="11.5" cy="11.5" rx="9" ry="7" transform="rotate(-40 11.5 11.5)"/><path class="l" d="M7 9q2-3 5-3"/>',
  meat: '<path class="c-brown" d="M5 14q1-7.5 10.5-8.5 10.5-1 12.5 6.5 1.5 7-6 10-4.5 1.8-5.8 5-1 2.2-4.2 1.4-5-1.6-5.4-7-.2-3.2-1.6-7.4z"/>' +
    '<circle class="c-white" cx="18.5" cy="12.5" r="3"/><circle class="n c-cream" cx="18.5" cy="12.5" r="1.2"/><path class="l ls-thin" d="M8 17l4-4M10 22l5-5M21 18l3-3"/>',
  fish: '<path class="c-grey" d="M24 16l5.5-6.5v13z"/><path class="c-grey" d="M3 16q6-8.5 14.5-8.5 6 0 9 8.5-3 8.5-9 8.5Q9 24.5 3 16z"/>' +
    '<circle class="c-white" cx="9" cy="14.5" r="1.9"/><circle class="n c-ink" cx="9.3" cy="14.6" r=".85"/><path class="l" d="M13 11q2 5 0 10M18 12l2 1.5M18 16l2 1.5M18 20l2-1.5"/>',
  shrimp: '<path class="c-salmon" d="M9.5 22.5L4 21.5l2 5.5 3.5-1.5z"/>' +
    '<path class="c-salmon" d="M21 5.5q7.5 3 6.6 11.5-1 9.5-10.6 10.5-6 .3-8.5-4l4.2-3q2.6 3 5.6 2 4.8-1.6 4.8-6.3 0-4.6-4-6.6z"/>' +
    '<path class="l" d="M23.4 9.7l3-1.8M24.6 14.6h3.6M23.6 19.6l3 2M19.4 22.8l1 3"/><path class="l" d="M21 5.5q-6-2.5-10.5.5"/><circle class="n c-ink" cx="21.4" cy="8.6" r=".9"/>',
  egg: '<path class="c-white" d="M6 15.5q-1-8.5 8-9.5 6-.6 9 3 6 1 5 8.5-1 7-9 8-11 1-13-10z"/><circle class="c-yellow" cx="15.5" cy="16" r="5"/>' +
    '<ellipse class="n c-white" cx="14" cy="14.4" rx="1.4" ry="1"/>',
  tofu: cube(2, 18) + cube(16, 18) + cube(9, 9.5),
  cheese: '<path class="c-yellow" d="M3 22.5L19 8.5l10 5.5v9z"/><path class="c-yellow2" d="M3 22.5h26v5H3z"/>' +
    '<circle class="n c-yellowd" cx="16" cy="17" r="1.8"/><circle class="n c-yellowd" cx="22" cy="14.5" r="1.3"/><circle class="n c-yellowd" cx="10" cy="20.5" r="1.2"/><circle class="n c-yellowd" cx="23" cy="25" r="1.2"/><circle class="n c-yellowd" cx="9" cy="25.2" r=".9"/>',
  bread: '<path class="c-tan" d="M6.5 28.5V14q-4-1.2-4-5.2 0-6.3 13.5-6.3T29.5 8.8q0 4-4 5.2v14.5z"/>' +
    '<path class="n c-cream" d="M9 26.3V12.6q-3.6-.8-3.6-3.8 0-4.1 10.6-4.1t10.6 4.1q0 3-3.6 3.8v13.7z"/>',
  sandwich: '<path class="c-tan" d="M4 24h24l-1.2 4H5.2z"/><path class="c-red" d="M4.4 21.3h23.2V24H4.4z"/>' +
    '<path class="c-green" d="M3.5 19q2 2.6 4 0t4 0 4 0 4 0 4 0 4 0 5 .2v2.6H3.5z"/><path class="c-cream" d="M4 19.3L16 4.5l12 14.8z"/><path class="l" d="M8 17.5L16 7.6"/>',
  burger: '<path class="c-tan" d="M5 14q0-9 11-9t11 9z"/><path class="c-green" d="M4 14.5h24l-2 2.2-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6-2.4-1.6-2.4 1.6z"/>' +
    '<rect class="c-brown" x="4.5" y="17" width="23" height="4.6" rx="2.3"/><path class="c-tan" d="M5 23h22q0 4-4 4H9q-4 0-4-4z"/>' +
    '<path class="l ls-seed" d="M11 9.5l1.4-.6M16 8l1.4.3M20.5 10l1.2.7"/>',
  pizza: '<path class="c-yellow" d="M4.5 7.5Q16 2.5 27.5 7.5L16 29z"/><path class="c-tan" d="M4.5 7.5Q16 2.5 27.5 7.5l-1.3 2.6Q16 6 5.8 10.1z"/>' +
    '<circle class="c-red" cx="12.5" cy="12.5" r="2"/><circle class="c-red" cx="19.5" cy="13" r="2"/><circle class="c-red" cx="16" cy="19.5" r="1.8"/>',
  wrap: '<g transform="rotate(-35 16 16)"><rect class="c-cream" x="2.5" y="10.5" width="25" height="11" rx="5.5"/>' +
    '<path class="l" d="M8.5 10.8q-2 5.2 0 10.4M13.5 10.6q-2 5.4 0 10.8"/><ellipse class="c-green" cx="24.5" cy="16" rx="3.4" ry="5.2"/>' +
    '<circle class="n c-red" cx="24" cy="14" r="1.2"/><circle class="n c-tan" cx="25.2" cy="17.6" r="1.1"/><circle class="n c-brown" cx="23.6" cy="17.9" r=".9"/></g>',
  taco: '<g transform="rotate(-14 16 18)"><path class="c-yellow" d="M3 18a13 5 0 0 1 26 0z"/>' +
    '<path class="c-green" d="M4 18.5q1.5-4.5 4-1.5 2-4.5 4.2-1.2 2-4.5 4.2-1.2 2-4.5 4.2-1.2 2-4.5 4.2-1.2 2.2-3 3.4 1.1v4H4z"/>' +
    '<circle class="n c-red" cx="9.5" cy="16.2" r="1.5"/><circle class="n c-red" cx="16.5" cy="15.4" r="1.5"/><circle class="n c-red" cx="23" cy="15.6" r="1.4"/>' +
    '<path class="c-yellow" d="M3 18a13 12 0 0 0 26 0z"/><path class="l ls-thin" d="M7 21q9 5 18 0"/></g>',
  sushi: maki(21, 10.5, 'c-green') + maki(11, 18.5, 'c-orange'),
  pancake: '<ellipse class="c-tan" cx="16" cy="24" rx="12.5" ry="4"/><ellipse class="c-tan" cx="16" cy="19.5" rx="12.5" ry="4"/><ellipse class="c-tan" cx="16" cy="15" rx="12.5" ry="4"/>' +
    '<path class="n c-syrup" d="M7.5 14.2q8.5-4.5 17 0l-.6 4-1.6-1.6-.9 3.3-2-3.2-2.8 2.2-.8-3-2.9 2.1-.4-3z"/><rect class="c-yellow" x="13" y="10.6" width="6" height="4" rx="1"/>',
  waffle: '<rect class="c-tan" x="4.5" y="4.5" width="23" height="23" rx="5.5"/><path class="l ls-thin" d="M4.5 12.2h23M4.5 19.8h23M12.2 4.5v23M19.8 4.5v23"/>' +
    '<rect class="c-yellow" x="13.5" y="13.5" width="5" height="5" rx="1"/>',
  cereal: '<path class="l ls-grey" d="M23.5 3l-5 10"/><ellipse class="c-white" cx="16" cy="15" rx="12" ry="3.2"/>' +
    '<circle class="l ls-red" cx="9.5" cy="14.6" r="1.6"/><circle class="l ls-orange" cx="14" cy="13.6" r="1.6"/><circle class="l ls-green" cx="18.5" cy="14.8" r="1.6"/><circle class="l ls-purple" cx="22.6" cy="14" r="1.5"/>' + BOWL,
  cake: '<path class="c-cream" d="M4 15l6 4v11l-6-4z"/><path class="c-cream" d="M10 19l18-8v11l-18 8z"/><path class="n c-pink" d="M10 23.6l18-8v2.2l-18 8z"/>' +
    '<path class="c-pink" d="M4 15L22 7l6 4-18 8z"/><circle class="c-red" cx="16.5" cy="10.2" r="2.3"/><path class="l" d="M16.5 8q.5-3 3-4"/>',
  cookie: '<circle class="c-tan" cx="16" cy="16" r="12"/><circle class="n c-brown" cx="11" cy="11.5" r="1.7"/><circle class="n c-brown" cx="19" cy="10" r="1.5"/>' +
    '<circle class="n c-brown" cx="21.5" cy="17.5" r="1.8"/><circle class="n c-brown" cx="13" cy="19.5" r="1.6"/><circle class="n c-brown" cx="17" cy="23.5" r="1.3"/><circle class="n c-brown" cx="9" cy="17" r="1.1"/>',
  muffin: '<path class="c-blue" d="M7 17h18l-2.5 11h-13z"/><path class="l" d="M11.5 17l1 11M16 17v11M20.5 17l-1 11"/>' +
    '<path class="c-tan" d="M5 18.5q-1-12 11-12.5 12 .5 11 12.5z"/><circle class="n c-purple" cx="11" cy="12.5" r="1.4"/><circle class="n c-purple" cx="17.5" cy="10" r="1.4"/><circle class="n c-purple" cx="20.5" cy="14.5" r="1.4"/><circle class="n c-purple" cx="14.5" cy="15.5" r="1.3"/>',
  donut: `<path class="c-tan" fill-rule="evenodd" d="${ring(16, 16, 12.5)}${ring(16, 16, 3.6)}"/>` +
    `<path class="c-pink" fill-rule="evenodd" d="M6.5 15q.5-8.6 9.5-9 9 .4 9.5 9 0 3-2 2.2t-2.8 2.2q-1.5 1.8-3-.4-2 2.2-3.6-.2-2 1.4-3-1.3-2 .9-2.7-1.3-1.9 1-1.9-1.2z${ring(16, 16, 3.6)}"/>` +
    '<path class="l ls-yellow" d="M10 11l1.6-.8M20 9.6l1.4 1M22.3 14l1.5.3M12.5 15.8l-1 1.2"/><path class="l ls-blue" d="M15 7.8l1.5-.2M9 14.2l.4-1.5M19.4 16.6l1.2.9"/>',
  icecream: '<path class="c-tan" d="M9.5 15h13L16 30.5z"/><path class="l ls-thin" d="M11.5 18l7.5 6M20.5 18l-7.5 6M14 15l5 4.5"/>' +
    '<circle class="c-pink" cx="12" cy="12.5" r="5.2"/><circle class="c-cream" cx="20" cy="12.5" r="5.2"/><circle class="c-brown" cx="16" cy="7" r="4.6"/><circle class="c-red" cx="16" cy="2.6" r="1.6"/>',
  yogurt: '<path class="n c-purple" d="M9.9 22h12.2l-.6 6H10.5z"/><path class="n c-cream" d="M9.3 15h13.4l-.6 7H9.9z"/><path class="n c-tan" d="M8.8 10.5h14.4l-.5 4.5H9.3z"/>' +
    '<path class="l" d="M8 6h16l-2.2 22.5H10.2z"/><path class="l ls-grey" d="M20 2l-2.5 12"/><circle class="n c-red" cx="13" cy="9.4" r="1.4"/><circle class="n c-purple" cx="16.4" cy="9" r="1.3"/>',
  candy: '<path class="c-red" d="M9.5 16L3 10.5v11zM22.5 16L29 10.5v11z"/><ellipse class="c-red" cx="16" cy="16" rx="7.5" ry="6"/>' +
    '<path class="l ls-white" d="M12 11.5q4 4.5 0 9M16 10q4 6 0 12M20 11.5q-2.5 4.5 0 9"/>',
  coffee: STEAM(12, 18).replace(/3\.5/g, '2.5') + '<path class="c-white" d="M6 12h17v9q0 7-7 7h-3q-7 0-7-7z"/><path class="n c-blue" d="M6.6 16h15.8v3.5H6.6z"/><path class="l" d="M23 14.5q5 0 5 4t-5.2 4"/>',
  drink: '<path class="n c-white" d="M8 7.5h16l-2.2 21H10.2z"/><path class="n c-amber" d="M8.7 13.5h14.6l-1.5 15H10.2z"/>' +
    '<path class="l ls-straw" d="M19 2l-2.6 20"/><path class="l" d="M8 7.5h16l-2.2 21H10.2z"/><path class="l ls-white" d="M11.5 16.5l.7 8"/>',
  sauce: '<path class="c-white" d="M4.5 14h23v8q0 5.5-11.5 5.5T4.5 22z"/><ellipse class="c-red" cx="16" cy="14" rx="11.5" ry="3.6"/>' +
    '<path class="l ls-white" d="M10.5 13.5q2-1.2 4 0"/><path class="l ls-blue" d="M5 19.5q11 3.5 22 0"/>',
};

export function spriteSvg(name: Sprite): string { return svg('0 0 32 32', SPRITE_BODY[name], `sprite sprite-${name}`); }

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
