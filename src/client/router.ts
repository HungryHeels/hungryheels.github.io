// Hash routes so the site works from GitHub Pages and from a single file on disk, and so Back/Forward,
// bookmarks and shared links restore what you were looking at. Pure functions (no DOM) so they can be tested.
//   #/                    Today        #/menus              Menus         #/me                 Me
//   query: hall=chase|top-of-lenoir, date=YYYY-MM-DD, period=Dinner, item=<recipe id>, view=update, section=<id>, profile=<shared>
import type { HallId } from '../core/types.ts';

export type Page = 'today' | 'menus' | 'me';
export interface Route { page: Page; hall?: HallId; date?: string; period?: string; item?: string; view?: 'update'; section?: string; profile?: string; mode?: 'day'; about?: true }
export const PAGE_TITLES: Record<Page, string> = { today: 'Today', menus: 'Menus', me: 'Me' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  // Old share links were "#profile=...": keep them working.
  if (/^profile=/.test(h)) return { page: 'me', profile: h.slice(8) };
  const [path, query = ''] = h.split('?');
  const page: Page = /^\/?menus\b/.test(path) ? 'menus' : /^\/?me\b/.test(path) ? 'me' : 'today';
  const q = new URLSearchParams(query);
  const r: Route = { page };
  const hall = q.get('hall'); if (hall === 'chase' || hall === 'top-of-lenoir') r.hall = hall;
  const date = q.get('date'); if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) r.date = date;
  const period = q.get('period'); if (period && period.length < 40) r.period = period;
  const item = q.get('item'); if (item && /^[\w-]{1,20}$/.test(item)) r.item = item;
  if (q.get('view') === 'update') r.view = 'update';
  if (q.get('mode') === 'day') r.mode = 'day';
  if (page === 'today' && q.get('about') === '1') r.about = true;
  const section = q.get('section'); if (section && /^[a-z-]{1,20}$/.test(section)) r.section = section;
  const profile = q.get('profile'); if (profile && /^[A-Za-z0-9_-]+$/.test(profile)) r.profile = profile;
  return r;
}

export function routeHash(r: Route): string {
  const q = new URLSearchParams();
  if (r.page !== 'me') {
    if (r.hall) q.set('hall', r.hall);
    if (r.date) q.set('date', r.date);
    if (r.period) q.set('period', r.period);
    if (r.item) q.set('item', r.item);
    if (r.page === 'menus' && r.view) q.set('view', r.view);
    if (r.page === 'today' && r.mode) q.set('mode', r.mode);
    if (r.page === 'today' && r.about) q.set('about', '1');
  }
  if (r.section) q.set('section', r.section);
  if (r.profile) q.set('profile', r.profile);
  const s = q.toString();
  return '#/' + (r.page === 'today' ? '' : r.page) + (s ? '?' + s : '');
}
