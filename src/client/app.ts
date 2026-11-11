// App shell: tabs, rendering, focus management, display settings and start-up. Views live in view-*.ts.
import { h, clear } from './dom.ts';
import { S, FIRST_DATE, addProfile, firstDate, lastDate, loadProfile } from './state.ts';
import { loadImported, loadLayers, loadSeed } from './imports.ts';
import { focusKey, restoreFocus, setRender, takePendingFocus, announce, go } from './nav.ts';
import { menuView } from './view-menu.ts';
import { planView } from './view-plan.ts';
import { youView } from './view-you.ts';
import { sheetView } from './view-sheet.ts';
import { profileSummary } from './views.ts';
import { profileFromHash } from '../core/profile-io.ts';
import { nyNow } from '../core/schedule.ts';

let root: HTMLElement;
let lastSheet: string | null = null;

function applyDisplay() {
  const el = document.documentElement;
  if (S.display.theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', S.display.theme);
  el.setAttribute('data-text', S.display.text);
  el.setAttribute('data-contrast', S.display.contrast);
}

function incomingBanner(): HTMLElement | null {
  const inc = S.incoming; if (!inc) return null;
  return h('div', { class: 'banner info', role: 'region', 'aria-label': 'Shared profile' },
    h('p', null, h('strong', null, `Someone shared a profile${inc.name ? ` (“${inc.name}”)` : ''}: `), profileSummary(inc.profile)),
    h('div', { class: 'actions' },
      h('button', { type: 'button', class: 'primary', onClick: () => go(() => { addProfile(inc.name ?? 'Shared profile', inc.profile); S.incoming = null; S.tab = 'menu'; history.replaceState(null, '', location.pathname + location.search); }, 'Shared profile added and active.') }, 'Add as a new profile'),
      h('button', { type: 'button', onClick: () => go(() => { S.incoming = null; history.replaceState(null, '', location.pathname + location.search); }, 'Dismissed.') }, 'Dismiss')));
}

function tabButton(id: AppTab, label: string, icon: string): HTMLElement {
  return h('button', { type: 'button', 'aria-current': S.tab === id ? 'page' : null, class: S.tab === id ? 'on' : '', 'data-fk': 'tab:' + id,
    onClick: () => go(() => { S.tab = id; window.scrollTo(0, 0); }, `${label} tab.`) }, h('span', { 'aria-hidden': 'true' }, icon), label);
}
type AppTab = 'menu' | 'plan' | 'you';

function render() {
  const keepScroll = window.scrollY;
  const pending = takePendingFocus();
  const fk = pending ? 'fk:' + pending : focusKey(root);
  applyDisplay();
  clear(root);
  const title = S.tab === 'menu' ? 'Hungry Heels' : S.tab === 'plan' ? 'Plan' : 'You';
  const header = h('header', { class: 'top' }, h('h1', { tabindex: '-1', id: 'title' }, title),
    h('p', { class: 'unofficial' }, 'Unofficial · personal use · not affiliated with UNC'));
  const main = h('main', { id: 'main' }, incomingBanner(),
    S.flash ? h('div', { class: 'banner info flash', role: 'status' }, h('span', null, S.flash), h('button', { type: 'button', class: 'linkish', 'aria-label': 'Dismiss message', onClick: () => go(() => { S.flash = null; }) }, 'OK')) : null,
    S.tab === 'menu' ? menuView() : S.tab === 'plan' ? planView() : youView());
  const nav = h('nav', { class: 'tabbar', 'aria-label': 'Main' }, tabButton('menu', 'Menu', '🍽'), tabButton('plan', 'Plan', '📅'), tabButton('you', 'You', '⚙'));
  root.append(header, main, nav);
  const sel = root.querySelector('.pills.scroll .pill.on') as HTMLElement | null;
  if (sel && sel.parentElement) sel.parentElement.scrollLeft = sel.offsetLeft - 16;
  const sh = sheetView();
  const sheetKey = S.sheet ? S.sheet.dayKey + ':' + S.sheet.item : null;
  if (sh) {
    root.appendChild(sh);
    header.inert = true; main.inert = true; nav.inert = true;   // background is not reachable while the dialog is open
    document.body.classList.add('sheet-open');
  } else document.body.classList.remove('sheet-open');
  window.scrollTo(0, keepScroll);
  if (sh && sheetKey !== lastSheet) (sh.querySelector('.sheet') as HTMLElement).focus();
  else restoreFocus(root, fk);
  lastSheet = sheetKey;
}

function readHash() {
  const inc = profileFromHash(location.hash);
  if (inc) { S.incoming = inc; announce('A shared profile was found in the link. Review it at the top of the page.'); }
}

function registerOffline() {
  // Offline cache and install support only when served over http(s) (e.g. GitHub Pages). The service worker
  // caches this same page from the same origin; it never contacts any other site. The single-file build opened
  // from disk skips this, so it makes no requests at all.
  if (!/^https?:$/.test(location.protocol) || !('serviceWorker' in navigator)) return;
  const link = document.createElement('link'); link.rel = 'manifest'; link.href = 'manifest.webmanifest';
  document.head.appendChild(link);
  navigator.serviceWorker.register('sw.js').catch(() => { /* not available here: the app works the same without it */ });
}

export async function start() {
  root = document.getElementById('app')!;
  setRender(render, document.getElementById('live')!);
  loadProfile();
  readHash();
  render();
  const [seed, imported] = await Promise.all([loadSeed(), loadImported()]);
  S.seed = seed.days; S.seedError = seed.error; S.imported = imported;
  await loadLayers();
  S.loading = false;
  const now = nyNow();
  const first = firstDate(), last = lastDate();
  S.date = now.date < first ? first : now.date > last ? last : now.date;
  if (S.date < FIRST_DATE && !imported.length) S.date = FIRST_DATE;
  render();
  window.addEventListener('hashchange', () => { readHash(); render(); });
  registerOffline();
  (window as any).__hh = { S, render };
}
