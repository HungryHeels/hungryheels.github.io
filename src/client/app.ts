// Site shell: header with three pages, footer, hash router (Back/Forward and shareable links), focus management,
// display settings and start-up. Pages live in view-today.ts, view-menus.ts and view-me.ts.
import { h, clear } from './dom.ts';
import { S, addProfile, firstDate, lastDate, loadProfile } from './state.ts';
import { loadImported, loadLayers, loadSeed } from './imports.ts';
import { announce, focusAfterRender, focusKey, go, restoreFocus, setRender, setSheetCloser, takePendingFocus } from './nav.ts';
import { PAGE_TITLES, parseHash, routeHash, type Page, type Route } from './router.ts';
import { todayView } from './view-today.ts';
import { menusView } from './view-menus.ts';
import { meView } from './view-me.ts';
import { sheetView } from './view-sheet.ts';
import { profileSummary } from './views.ts';
import { DISCLAIMER } from './ui.ts';
import { headerMascot } from './mascot.ts';
import { quadSvg } from './art.ts';
import { profileFromHash } from '../core/profile-io.ts';
import { REPO_ISSUES } from '../core/trust.ts';
import { nyNow } from '../core/schedule.ts';
import { isRestaurant } from '../core/restaurant.ts';

let root: HTMLElement;
let lastSheet: string | null = null;
let lastPage: Page | null = null;
let sheetPushed = false;
const REPO = 'https://github.com/HungryHeels/hungryheels.github.io';

function applyDisplay() {
  const el = document.documentElement;
  if (S.display.theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', S.display.theme);
  el.setAttribute('data-text', S.display.text);
  el.setAttribute('data-contrast', S.display.contrast);
}

// ---------- routing ----------
function stateRoute(): Route {
  const r: Route = { page: S.page };
  if (S.page !== 'me' && isRestaurant(S.place)) r.place = S.place;
  else if (S.page !== 'me') { r.hall = S.hall; r.date = S.date; if (S.period) r.period = S.period; }
  if (S.sheet && S.sheet.dayKey === `${S.hall}:${S.date}` && S.page !== 'me') r.item = S.sheet.item;
  if (S.page === 'menus' && S.menusView === 'update') r.view = 'update';
  if (S.page === 'today' && S.mode === 'day') r.mode = 'day';
  if (S.page === 'today' && S.about) r.about = true;
  return r;
}
function applyRoute(r: Route) {
  const pageChanged = r.page !== S.page;
  S.page = r.page;
  if (r.place) S.place = r.place;
  else if (r.hall) { S.hall = r.hall; S.place = r.hall; }
  else if (r.page !== 'me' && isRestaurant(S.place) && (r.date || r.period)) S.place = S.hall;
  if (r.date && !S.loading) S.date = r.date < firstDate() ? firstDate() : r.date > lastDate() ? lastDate() : r.date;
  else if (r.date) S.date = r.date;
  if (r.period) S.period = r.period;
  S.menusView = r.view === 'update' ? 'update' : 'browse';
  S.mode = r.mode === 'day' ? 'day' : 'meal';
  S.about = r.page === 'today' && !!r.about;
  if (r.item && r.page !== 'me' && !isRestaurant(S.place)) S.sheet = { item: r.item, dayKey: `${S.hall}:${S.date}`, opener: S.sheet?.opener ?? 'item:' + r.item };
  else { if (S.sheet) focusAfterRender(S.sheet.opener); S.sheet = null; }
  S.section = r.section ?? (pageChanged ? null : S.section);
  if (r.profile) {
    const inc = profileFromHash('#profile=' + r.profile);
    if (inc) { S.incoming = inc; announce('A shared profile was found in the link. Review it at the top of the page.'); }
  }
}
function syncUrl() {
  const want = routeHash(stateRoute());
  if (want === location.hash || (want === '#/' && location.hash === '')) return;
  const sheetOpened = !!S.sheet && !lastSheet;
  try {
    if (sheetOpened || (lastPage !== null && lastPage !== S.page)) { history.pushState(null, '', want); if (sheetOpened) sheetPushed = true; }
    else history.replaceState(null, '', want);
  } catch { /* some file:// contexts refuse history changes; the page still works */ }
}
function closeSheetImpl() {
  const opener = S.sheet?.opener ?? null;
  if (sheetPushed) { sheetPushed = false; focusAfterRender(opener); history.back(); return; }   // hashchange closes it
  go(() => { S.sheet = null; });
  focusAfterRender(null);
  if (opener) (document.querySelector(`[data-fk="${CSS.escape(opener)}"]`) as HTMLElement | null)?.focus({ preventScroll: true });
}

// ---------- chrome ----------
function header(): HTMLElement {
  const link = (p: Page) => h('a', { href: routeHash({ ...stateRoute(), page: p, item: undefined, view: undefined, mode: undefined, about: undefined }), class: 'nav-link', 'aria-current': S.page === p ? 'page' : null, 'data-fk': 'nav:' + p }, PAGE_TITLES[p]);
  return h('header', { class: 'site-header' }, h('div', { class: 'wrap header-in' },
    h('div', { class: 'brand-row' }, headerMascot(S.loading ? 'think' : 'idle'),
      h('a', { class: 'brand', href: routeHash({ page: 'today' }) }, h('span', { class: 'brand-name' }, 'Hungry Heels'), h('span', { class: 'brand-tag' }, 'Unofficial'))),
    h('nav', { class: 'site-nav', 'aria-label': 'Main' }, link('today'), link('menus'), link('me'))));
}
function footer(): HTMLElement {
  return h('footer', { class: 'site-footer' }, h('div', { class: 'wrap footer-in' },
    h('div', null, h('p', null, h('strong', null, DISCLAIMER)),
      h('p', null, 'Hungry Heels is an independent, unofficial project for personal use. It is not affiliated with or endorsed by UNC-Chapel Hill or Carolina Dining Services. Menus come only from pages saved by hand; this site never contacts dining.unc.edu.'),
      h('p', null, 'Sweetgreen and Chipotle are named only to identify them. Hungry Heels is not affiliated with, endorsed by or sponsored by either; their information is used only as they publish it.')),
    h('ul', { class: 'footer-links' },
      h('li', null, h('a', { href: routeHash({ page: 'today', about: true }) }, 'About Hungry Heels')),
      h('li', null, h('a', { href: routeHash({ page: 'me', section: 'privacy' }) }, 'Privacy')),
      h('li', null, h('a', { href: routeHash({ page: 'menus', view: 'update' }) }, 'Update menus')),
      h('li', null, h('a', { href: REPO_ISSUES, target: '_blank', rel: 'noopener noreferrer' }, 'Report a problem')),
      h('li', null, h('a', { href: REPO, target: '_blank', rel: 'noopener noreferrer' }, 'Source code')))));
}
/** Decorative campus-quad band under the header (built once; a thin strip on phones). */
let quadEl: HTMLElement | null = null;
function quad(): HTMLElement {
  if (!quadEl) { quadEl = h('div', { class: 'quad', 'aria-hidden': 'true' }); quadEl.innerHTML = quadSvg(); }
  return quadEl;
}
function banners(): Array<HTMLElement | null> {
  const inc = S.incoming;
  const clearHashProfile = () => { try { history.replaceState(null, '', routeHash(stateRoute())); } catch { /* ignore */ } };
  return [
    inc ? h('div', { class: 'banner info', role: 'region', 'aria-label': 'Shared profile' },
      h('p', null, h('strong', null, `Someone shared a profile${inc.name ? ` (“${inc.name}”)` : ''}: `), profileSummary(inc.profile)),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'primary', onClick: () => go(() => { addProfile(inc.name ?? 'Shared profile', inc.profile); S.incoming = null; S.page = 'today'; clearHashProfile(); }, 'Shared profile added and active.') }, 'Add as a new profile'),
        h('button', { type: 'button', onClick: () => go(() => { S.incoming = null; clearHashProfile(); }, 'Dismissed.') }, 'Dismiss'))) : null,
    S.flash ? h('div', { class: 'banner info flash', role: 'status' }, h('span', null, S.flash), h('button', { type: 'button', class: 'quiet', 'aria-label': 'Dismiss message', onClick: () => go(() => { S.flash = null; }) }, 'OK')) : null,
  ];
}

function render() {
  const pageChanged = lastPage !== null && lastPage !== S.page;
  const keepScroll = pageChanged ? 0 : window.scrollY;
  const pending = takePendingFocus();
  const fk = pending ? 'fk:' + pending : pageChanged ? null : focusKey(root);
  applyDisplay();
  clear(root);
  const main = h('main', { id: 'main', class: 'wrap', tabindex: '-1' }, ...banners(), S.page === 'today' ? todayView() : S.page === 'menus' ? menusView() : meView());
  const head = header(), foot = footer();
  root.append(head, quad(), main, foot);
  document.title = S.page === 'today' && (S.about || !S.onboarded) ? 'Hungry Heels (unofficial): one dining-hall meal that fits how you eat' : `${PAGE_TITLES[S.page]} · Hungry Heels (unofficial)`;
  const pill = root.querySelector('.pills .pill.on') as HTMLElement | null;   // keep the chosen meal visible in the scrolling row
  if (pill?.parentElement && pill.parentElement.scrollWidth > pill.parentElement.clientWidth) { const lead = (pill.previousElementSibling as HTMLElement | null) ?? pill; pill.parentElement.scrollLeft = lead.offsetLeft - pill.parentElement.offsetLeft; }
  const sh = sheetView();
  const sheetKey = S.sheet ? S.sheet.dayKey + ':' + S.sheet.item : null;
  if (sh) { root.appendChild(sh); head.inert = true; main.inert = true; foot.inert = true; document.body.classList.add('sheet-open'); }
  else document.body.classList.remove('sheet-open');
  syncUrl();
  window.scrollTo(0, keepScroll);
  if (sh && sheetKey !== lastSheet) (sh.querySelector('.sheet') as HTMLElement).focus();
  else if (pageChanged) (root.querySelector('#page-h') as HTMLElement | null)?.focus({ preventScroll: true });
  else restoreFocus(root, fk);
  if (S.section) {
    const el = document.getElementById('me-' + S.section);
    if (el) { el.scrollIntoView({ block: 'start' }); (el.querySelector('h2') as HTMLElement | null)?.focus({ preventScroll: true }); }
    S.section = null;
  }
  lastSheet = sh ? sheetKey : null; lastPage = S.page;   // only once the details actually rendered (not while menus load)
}

function registerOffline() {
  // Offline cache and install support only when served over http(s) (e.g. GitHub Pages). The service worker
  // caches this same page from the same origin; it never contacts any other site. The single-file build opened
  // from disk skips this, so it makes no requests at all.
  if (!/^https?:$/.test(location.protocol) || !('serviceWorker' in navigator)) return;
  const link = document.createElement('link'); link.rel = 'manifest'; link.href = 'manifest.webmanifest';
  document.head.appendChild(link);
  navigator.serviceWorker.register('sw.js').catch(() => { /* not available here: the site works the same without it */ });
}

export async function start() {
  root = document.getElementById('app')!;
  setRender(render, document.getElementById('live')!);
  setSheetCloser(closeSheetImpl);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.sheet && !e.defaultPrevented) { e.preventDefault(); closeSheetImpl(); } });
  // "Skip to content" must not change the address (the address holds the page), so it just moves focus.
  document.querySelector('.skip')?.addEventListener('click', e => { e.preventDefault(); (document.getElementById('main') as HTMLElement | null)?.focus(); });
  loadProfile();
  const initial = parseHash(location.hash);
  applyRoute(initial);
  render();
  const [seed, imported] = await Promise.all([loadSeed(), loadImported()]);
  S.seed = seed.days; S.seedError = seed.error; S.imported = imported;
  await loadLayers();
  S.loading = false;
  const now = nyNow();
  const first = firstDate(), last = lastDate();
  const want = initial.date ?? now.date;
  S.date = want < first ? first : want > last ? last : want;
  if (initial.item && !isRestaurant(S.place)) S.sheet = { item: initial.item, dayKey: `${S.hall}:${S.date}`, opener: 'item:' + initial.item };
  render();
  window.addEventListener('hashchange', () => { if (!S.sheet) sheetPushed = false; applyRoute(parseHash(location.hash)); if (!S.sheet) sheetPushed = false; render(); });
  registerOffline();
  (window as any).__hh = { S, render };
}
