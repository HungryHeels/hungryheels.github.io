// The site icon (browser tab, home screen, install): the Hungry Heel mascot, built from the same drawing as the
// header mascot in src/client/art.ts so they never drift apart. An icon file can't use the site's CSS, so the
// colors are written in here (the light-theme values from style.css). Not a UNC mark: an original sneaker character.
import { mascotSvg } from '../client/art.ts';

const NAVY = '#13294b', CAROLINA = '#7bafd4', TILE = '#e6eff8', FORK = '#7d8796';

/** A standalone 512 × 512 SVG: a pale-blue rounded tile with the mascot centred inside the maskable safe zone. */
export function iconSvg(): string {
  // The whole figure, feet included, framed on its own bounds (x 4–58, y 9–62) and centred in a 300px box, so it
  // stays inside the circle that home screens may cut the icon to (maskable safe zone: the central 80%).
  const inner = mascotSvg('wave')
    .replace(/viewBox="[^"]*"/, 'viewBox="4 7.5 55 55"')
    .replace(/^<svg /, '<svg x="106" y="104" width="300" height="300" ')
    .replace(/ aria-hidden="true" focusable="false"/, '');
  const style = `.m-sole,.m-toe{fill:#fff;stroke:${NAVY};stroke-width:2.2;stroke-linejoin:round}` +
    `.m-upper{fill:${CAROLINA};stroke:${NAVY};stroke-width:2.2;stroke-linejoin:round}.m-band,.m-ink{fill:${NAVY}}.m-shine{fill:#fff}` +
    `.m-line,.m-lace,.m-mouth{fill:none;stroke:${NAVY};stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.m-mouth.m-open{fill:${NAVY}}` +
    `.m-cheek{display:none}.m-limb{fill:none;stroke:${NAVY};stroke-width:3;stroke-linecap:round}.m-hand,.m-foot,.m-dot{fill:${NAVY}}` +
    `.m-fork{fill:none;stroke:${FORK};stroke-width:2.2;stroke-linecap:round}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><style>${style}</style>` +
    `<rect width="512" height="512" rx="112" fill="${TILE}"/><circle cx="256" cy="262" r="196" fill="#fff" opacity=".7"/>${inner}</svg>`;
}

/** The icon as a data: URI for the page's own <link rel="icon">, so the single file makes no requests. */
export const iconDataUri = () => 'data:image/svg+xml,' + encodeURIComponent(iconSvg());
