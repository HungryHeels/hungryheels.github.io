import { defaultProfile, type PatternId, type Profile } from '../core/profile.ts';
import type { HallId, MenuDay } from '../core/types.ts';
import type { FileResult } from './imports.ts';

export const FIRST_DATE = '2026-11-09';
export const LAST_DATE = '2026-12-10';
const KEY = 'hh-profile-v1';

export interface AppState {
  seed: MenuDay[]; imported: MenuDay[]; seedError: string | null; loading: boolean;
  hall: HallId; date: string; period: string | null;
  tab: 'menu' | 'you'; menuTab: 'meal' | 'all'; search: string; hideNonFits: boolean;
  profile: Profile; onboarded: boolean; idea: number;
  sheet: { item: string; dayKey: string } | null;
  importResults: FileResult[]; importing: boolean; showDays: boolean; nutritionMsg: string | null;
  storageNote: string | null;
  statusFilter: 'all' | 'fits' | 'possible' | 'excluded'; stationFilter: string; sortBy: 'station' | 'protein' | 'calories' | 'density' | 'name'; nutriOnly: boolean;
}

export const S: AppState = {
  seed: [], imported: [], seedError: null, loading: true,
  hall: 'chase', date: FIRST_DATE, period: null,
  tab: 'menu', menuTab: 'meal', search: '', hideNonFits: true,
  profile: defaultProfile('none'), onboarded: false, idea: 0,
  sheet: null, importResults: [], importing: false, showDays: false, nutritionMsg: null, storageNote: null,
  statusFilter: 'all', stationFilter: '', sortBy: 'station', nutriOnly: false,
};

let mem: string | null = null;
export function loadProfile() {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { S.storageNote = 'Your browser is blocking saved settings, so your diet choices will reset when you close this page.'; raw = mem; }
  if (!raw) return;
  try {
    const j = JSON.parse(raw);
    S.profile = { ...defaultProfile(j.profile?.pattern ?? 'none'), ...j.profile };
    S.onboarded = !!j.onboarded;
  } catch { /* ignore corrupt settings */ }
}
export function saveProfile() {
  const raw = JSON.stringify({ profile: S.profile, onboarded: S.onboarded });
  mem = raw;
  try { localStorage.setItem(KEY, raw); } catch { S.storageNote = 'Your browser is blocking saved settings, so your diet choices will reset when you close this page.'; }
}
export function setPattern(p: PatternId) {
  S.profile = { ...defaultProfile(p), allergens: S.profile.allergens, avoidGluten: S.profile.avoidGluten, avoidDairy: S.profile.avoidDairy, avoidEgg: S.profile.avoidEgg,
    avoidIngredients: S.profile.avoidIngredients, halalStyle: S.profile.halalStyle, calorieCap: S.profile.calorieCap, targets: S.profile.targets, maxPortion: S.profile.maxPortion };
  S.onboarded = true; S.idea = 0; saveProfile();
}

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
export function nextDateWithData(hall: HallId, from: string): string | null {
  const ds = allDays().filter(d => d.hall === hall && !d.noMenuPosted && d.date > from).map(d => d.date).sort();
  return ds[0] ?? null;
}
