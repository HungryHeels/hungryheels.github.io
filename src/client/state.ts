import { defaultProfile, type PatternId, type Profile } from '../core/profile.ts';
import { sanitizeProfile, type NamedProfile } from '../core/profile-io.ts';
import type { HallId, MenuDay } from '../core/types.ts';
import type { SavedMeal } from '../core/plan.ts';
import type { DayDiff } from '../core/refresh.ts';
import type { ManualEntry, OfficialRow } from '../sources/nutrition-import.ts';
import type { Page } from './router.ts';

export const FIRST_DATE = '2026-11-09';
export const LAST_DATE = '2026-12-10';
const KEY_V1 = 'hh-profile-v1';
const KEY = 'hh-profiles-v2';
const KEY_SAVED = 'hh-saved-v1';
const KEY_DISPLAY = 'hh-display-v1';

export interface FileResult {
  file: string; ok: boolean; hall?: string; date?: string; items?: number; periods?: number; noMenu?: boolean;
  notes: string[]; error?: string; diff?: DayDiff | null; replaced?: 'built-in' | 'import' | null; dropped?: boolean;
}
export interface Display { theme: 'system' | 'light' | 'dark'; text: 'normal' | 'large'; contrast: 'normal' | 'high' }

export interface AppState {
  seed: MenuDay[]; imported: MenuDay[]; seedError: string | null; loading: boolean;
  hall: HallId; date: string; period: string | null;
  page: Page; mode: 'meal' | 'day'; menusView: 'browse' | 'update'; station: string; search: string; hideNonFits: boolean; section: string | null; about: boolean;
  profiles: NamedProfile[]; activeId: string; profile: Profile; onboarded: boolean; idea: number;
  sheet: { item: string; dayKey: string; opener: string | null } | null;
  importResults: FileResult[]; importing: boolean; importSummary: string | null; showDays: boolean; nutritionMsg: string | null;
  storageNote: string | null; sortBy: 'station' | 'protein' | 'calories' | 'name';
  official: { rows: OfficialRow[]; label: string; text: string } | null; manual: ManualEntry[];
  saved: SavedMeal[]; display: Display;
  incoming: { profile: Profile; name: string | null } | null;
  flash: string | null;
}

export const S: AppState = {
  seed: [], imported: [], seedError: null, loading: true,
  hall: 'chase', date: FIRST_DATE, period: null,
  page: 'today', mode: 'meal', menusView: 'browse', station: '', search: '', hideNonFits: true, section: null, about: false,
  profiles: [], activeId: '', profile: defaultProfile('none'), onboarded: false, idea: 0,
  sheet: null, importResults: [], importing: false, importSummary: null, showDays: false, nutritionMsg: null, storageNote: null,
  sortBy: 'station', official: null, manual: [], saved: [], display: { theme: 'system', text: 'normal', contrast: 'normal' },
  incoming: null, flash: null,
};

// ---------- localStorage with an in-memory fallback ----------
const mem = new Map<string, string>();
const BLOCKED = 'Your browser is blocking saved settings, so your choices will reset when you close this page.';
function read(key: string): string | null {
  try { return localStorage.getItem(key) ?? mem.get(key) ?? null; } catch { S.storageNote = BLOCKED; return mem.get(key) ?? null; }
}
function write(key: string, val: string) {
  mem.set(key, val);
  try { localStorage.setItem(key, val); } catch { S.storageNote = BLOCKED; }
}
function readJson<T>(key: string, fallback: T): T { try { const r = read(key); return r ? (JSON.parse(r) as T) : fallback; } catch { return fallback; } }

const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function loadProfile() {
  const v2 = readJson<{ active?: string; list?: Array<{ id: string; name: string; profile: unknown }>; onboarded?: boolean } | null>(KEY, null);
  let list: NamedProfile[] = [];
  if (v2?.list) list = v2.list.map(x => ({ id: String(x.id), name: String(x.name || 'Profile').slice(0, 40), profile: sanitizeProfile(x.profile) })).filter((x): x is NamedProfile => !!x.profile);
  else {
    const v1 = readJson<{ profile?: unknown; onboarded?: boolean } | null>(KEY_V1, null);
    const p = v1 ? sanitizeProfile(v1.profile) : null;
    if (p) list = [{ id: newId(), name: 'My profile', profile: p }];
    S.onboarded = !!v1?.onboarded;
  }
  if (v2) S.onboarded = !!v2.onboarded;
  if (!list.length) list = [{ id: newId(), name: 'My profile', profile: defaultProfile('none') }];
  S.profiles = list;
  S.activeId = list.some(x => x.id === v2?.active) ? v2!.active! : list[0].id;
  S.profile = list.find(x => x.id === S.activeId)!.profile;
  S.saved = readJson<SavedMeal[]>(KEY_SAVED, []).filter(x => x && Array.isArray(x.parts)).slice(0, 100);
  const d = readJson<Partial<Display>>(KEY_DISPLAY, {});
  S.display = { theme: d.theme === 'light' || d.theme === 'dark' ? d.theme : 'system', text: d.text === 'large' ? 'large' : 'normal', contrast: d.contrast === 'high' ? 'high' : 'normal' };
}
export function saveProfile() {
  const cur = S.profiles.find(x => x.id === S.activeId);
  if (cur) cur.profile = S.profile;
  write(KEY, JSON.stringify({ active: S.activeId, list: S.profiles, onboarded: S.onboarded }));
}
export function setPattern(p: PatternId) {
  S.profile = { ...defaultProfile(p), allergens: S.profile.allergens, avoidGluten: S.profile.avoidGluten, avoidDairy: S.profile.avoidDairy, avoidEgg: S.profile.avoidEgg,
    avoidIngredients: S.profile.avoidIngredients, halalStyle: S.profile.halalStyle, calorieCap: S.profile.calorieCap, targets: S.profile.targets, maxPortion: S.profile.maxPortion, daily: S.profile.daily };
  S.onboarded = true; S.idea = 0; saveProfile();
}
export function switchProfile(id: string) {
  const p = S.profiles.find(x => x.id === id); if (!p) return;
  S.activeId = id; S.profile = p.profile; S.idea = 0; saveProfile();
}
export function addProfile(name: string, profile: Profile) {
  const np = { id: newId(), name: name.slice(0, 40) || 'Profile', profile };
  S.profiles = [...S.profiles, np]; S.activeId = np.id; S.profile = profile; S.onboarded = true; S.idea = 0; saveProfile();
}
export function deleteProfile(id: string) {
  if (S.profiles.length < 2) return;
  S.profiles = S.profiles.filter(x => x.id !== id);
  if (S.activeId === id) { S.activeId = S.profiles[0].id; S.profile = S.profiles[0].profile; }
  saveProfile();
}
export function renameProfile(id: string, name: string) { const p = S.profiles.find(x => x.id === id); if (p) { p.name = name.trim().slice(0, 40) || p.name; saveProfile(); } }
export function activeName(): string { return S.profiles.find(x => x.id === S.activeId)?.name ?? 'Profile'; }

export function saveSaved() { write(KEY_SAVED, JSON.stringify(S.saved.slice(0, 100))); }
export function saveDisplay() { write(KEY_DISPLAY, JSON.stringify(S.display)); }

// ---------- menu days ----------
export function allDays(): MenuDay[] {
  const by = new Map<string, MenuDay>();
  for (const d of S.seed) by.set(`${d.hall}:${d.date}`, d);
  for (const d of S.imported) by.set(`${d.hall}:${d.date}`, d); // user import takes priority
  return [...by.values()];
}
export function dayFor(hall: HallId, date: string): MenuDay | null {
  return S.imported.find(d => d.hall === hall && d.date === date) ?? S.seed.find(d => d.hall === hall && d.date === date) ?? null;
}
export function lastDate(): string {
  let m = LAST_DATE;
  for (const d of S.imported) if (d.date > m) m = d.date;
  return m;
}
export function firstDate(): string {
  let m = FIRST_DATE;
  for (const d of S.imported) if (d.date < m) m = d.date;
  return m;
}
export function nextDateWithData(hall: HallId, from: string): string | null {
  const ds = allDays().filter(d => d.hall === hall && !d.noMenuPosted && d.date > from).map(d => d.date).sort();
  return ds[0] ?? null;
}
