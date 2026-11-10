import { readPageFile, PlistError } from '../sources/bplist.ts';
import { PageError, parseUncPage } from '../sources/unc-page.ts';
import { borrowNutrition } from '../core/borrow.ts';
import { decodeSeed, type SeedFile } from '../core/seed.ts';
import { EAT_UNC_META, EAT_UNC_SNAPSHOT } from '../sources/snapshot-data.ts';
import { applyOfficial, parseOfficialCsv, type OfficialRow } from '../sources/nutrition-import.ts';
import { validateDay } from '../core/validate.ts';
import type { MenuDay } from '../core/types.ts';
import { SEED_B64 } from './seed-data.ts';

export interface FileResult {
  file: string; ok: boolean; hall?: string; date?: string; items?: number; periods?: number; noMenu?: boolean;
  notes: string[]; error?: string;
}

// ---------- persistence (IndexedDB with in-memory fallback) ----------
const DB = 'hungry-heels', STORE = 'days', META = 'meta';
let memory = new Map<string, MenuDay>();
let memoryNutrition: string | null = null;
export let persistence: 'indexeddb' | 'memory' = 'indexeddb';

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => { rq.result.createObjectStore(STORE); rq.result.createObjectStore(META); };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    } catch (e) { rej(e); }
  });
}
function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => res(r ? (r as IDBRequest<T>).result : undefined);
    t.onerror = () => rej(t.error);
  });
}

export async function loadImported(): Promise<MenuDay[]> {
  try {
    const db = await openDb();
    const all = await tx<MenuDay[]>(db, STORE, 'readonly', s => s.getAll());
    persistence = 'indexeddb';
    return all ?? [];
  } catch {
    persistence = 'memory';
    return [...memory.values()];
  }
}
async function saveDay(d: MenuDay) {
  const key = `${d.hall}:${d.date}`;
  if (persistence === 'memory') { memory.set(key, d); return; }
  try { const db = await openDb(); await tx(db, STORE, 'readwrite', s => { s.put(d, key); }); }
  catch { persistence = 'memory'; memory.set(key, d); }
}
export async function clearImported(): Promise<void> {
  memory = new Map();
  try { const db = await openDb(); await tx(db, STORE, 'readwrite', s => { s.clear(); }); } catch { /* memory only */ }
}
export async function loadOfficialNutrition(): Promise<string | null> {
  try { const db = await openDb(); return ((await tx<string>(db, META, 'readonly', s => s.get('official-nutrition'))) as string | undefined) ?? null; }
  catch { return memoryNutrition; }
}
export async function saveOfficialNutrition(text: string | null): Promise<void> {
  memoryNutrition = text;
  try { const db = await openDb(); await tx(db, META, 'readwrite', s => { if (text === null) s.delete('official-nutrition'); else s.put(text, 'official-nutrition'); }); } catch { /* memory only */ }
}

// ---------- built-in seed ----------
export async function loadSeed(): Promise<{ days: MenuDay[]; error: string | null }> {
  try {
    if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack the built-in menus (it needs a newer Safari, Chrome or Firefox). You can still import saved pages.');
    const bin = Uint8Array.from(atob(SEED_B64), c => c.charCodeAt(0));
    const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    const days = decodeSeed(JSON.parse(text) as SeedFile);
    for (const d of days) borrowNutrition(d, EAT_UNC_SNAPSHOT, EAT_UNC_META);
    return { days, error: null };
  } catch (e) {
    return { days: [], error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------- importing files the student saved ----------
export async function importFile(file: File): Promise<{ result: FileResult; day: MenuDay | null }> {
  const res: FileResult = { file: file.name, ok: false, notes: [] };
  try {
    if (!/\.(webarchive|html?)$/i.test(file.name)) throw new PageError('This file type is not supported. Save the page as a Web Archive (.webarchive) or Page Source (.html).');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const html = readPageFile(bytes);
    const parsed = parseUncPage(html, { source: 'dining.unc.edu page saved by you', retrievedAt: new Date(file.lastModified).toISOString(), fileName: file.name });
    const { unknownClasses, ...day } = parsed as MenuDay & { unknownClasses: string[] };
    borrowNutrition(day as MenuDay, EAT_UNC_SNAPSHOT, EAT_UNC_META);
    const official = await loadOfficialNutrition();
    if (official) applyOfficial(day as MenuDay, parseOfficialCsv(official).rows, 'the official Carolina Dining export you imported');
    res.ok = true; res.hall = day.hall; res.date = day.date; res.items = Object.keys(day.items).length; res.periods = day.periods.length; res.noMenu = day.noMenuPosted;
    res.notes.push(...day.notes);
    if (unknownClasses.length) res.notes.push(`Unrecognized labels were ignored, not guessed: ${unknownClasses.join(', ')}.`);
    for (const p of validateDay(day as MenuDay)) res.notes.push(p.text);
    await saveDay(day as MenuDay);
    return { result: res, day: day as MenuDay };
  } catch (e) {
    res.error = friendly(e);
    return { result: res, day: null };
  }
}
function friendly(e: unknown): string {
  if (e instanceof PageError) return e.message;
  if (e instanceof PlistError) return 'This file could not be read as a Safari web archive (' + e.message + ') Try saving it again.';
  return 'The file could not be read: ' + (e instanceof Error ? e.message : String(e));
}

export async function importOfficialCsv(text: string, days: MenuDay[]): Promise<{ applied: number; errors: string[] }> {
  const { rows, errors } = parseOfficialCsv(text);
  if (errors.length) return { applied: 0, errors };
  let applied = 0;
  for (const d of days) applied += applyOfficial(d, rows as OfficialRow[], 'the official Carolina Dining export you imported');
  if (applied) await saveOfficialNutrition(text);
  return { applied, errors: applied ? [] : ['No rows matched any menu item by recipe id or exact name.'] };
}
