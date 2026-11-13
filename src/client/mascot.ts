// The header mascot: a real button that waves (and says a line) when tapped, shows the thinking pose while menus
// load and does a quick happy hop when a new meal is built. Purely decorative feedback: it never blocks or delays
// anything, and with prefers-reduced-motion the poses still change but nothing moves (see style.css).
import { h } from './dom.ts';
import { announce } from './nav.ts';
import { MASCOT_LINES, campusSvg, mascotSvg, spriteSvg, type Campus, type Pose, type Sprite } from './art.ts';

/** An inline SVG string inside a span. Only ever used with the constant art strings from art.ts. */
export function artSpan(svgText: string, cls: string): HTMLElement {
  const s = h('span', { class: cls, 'aria-hidden': 'true' });
  s.innerHTML = svgText;
  return s;
}
export const sprite = (name: Sprite, cls = 'glyph') => artSpan(spriteSvg(name), cls);
export const figure = (pose: Pose, cls = 'mascot-fig') => artSpan(mascotSvg(pose), cls);
/** A small campus mark (landmark or dogwood), e.g. before a page title. Decorative only. */
export const campus = (name: Campus, cls = 'h-glyph') => artSpan(campusSvg(name), cls);

let wrap: HTMLElement | null = null;
let fig: HTMLElement | null = null;
let say: HTMLElement | null = null;
let base: Pose = 'idle';
let shown: Pose | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let sayTimer: ReturnType<typeof setTimeout> | undefined;
let lastCheer = '';
let line = 0;

function paint(p: Pose) {
  if (!fig || shown === p) return;
  fig.innerHTML = mascotSvg(p); shown = p;
}
function play(p: Pose, anim: 'wave' | 'hop', ms: number) {
  if (!wrap) return;
  clearTimeout(timer);
  paint(p);
  wrap.classList.remove('is-wave', 'is-hop');
  void wrap.offsetWidth;   // restart the animation if it is already playing
  wrap.classList.add('is-' + anim);
  timer = setTimeout(() => { wrap?.classList.remove('is-wave', 'is-hop'); timer = undefined; paint(base); }, ms);
}
function hello() {
  const text = MASCOT_LINES[line++ % MASCOT_LINES.length];
  play('wave', 'wave', 1400);
  if (say) {
    say.textContent = text; say.hidden = false;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { if (say) say.hidden = true; }, 2800);
  }
  announce(text);
}

/** The mascot for the header. The same node is reused on every render, so a wave in progress is not reset. */
export function headerMascot(pose: Pose): HTMLElement {
  if (!wrap) {
    fig = h('span', { class: 'mascot-fig', 'aria-hidden': 'true' });
    say = h('span', { class: 'mascot-say', 'aria-hidden': 'true', hidden: true });
    wrap = h('span', { class: 'mascot' },
      h('button', { type: 'button', class: 'mascot-btn', 'data-fk': 'mascot', 'aria-label': 'Hungry Heel mascot: tap to say hello', onClick: hello }, fig),
      say);
  }
  base = pose;
  if (timer === undefined) paint(base);
  return wrap;
}

/** A meal was built. Hop once per new meal (not on every redraw of the same one). */
export function cheer(key: string) {
  if (key === lastCheer) return;
  lastCheer = key;
  play('happy', 'hop', 900);
}
