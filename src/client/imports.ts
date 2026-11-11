import { readPageFile, PlistError } from '../sources/bplist.ts';
import { PageError, parseUncPage } from '../sources/unc-page.ts';
import { borrowNutrition } from '../core/borrow.ts';
import { decodeSeed, type SeedFile } from '../core/seed.ts';
import { EAT_UNC_META, EAT_UNC_SNAPSHOT } from '../sources/snapshot-data.ts';
import { applyNutritionLayers, parseOfficial, type ManualEntry } from '../sources/nutrition-import.ts';
import { validateDay } from '../core/validate.ts';
import { dedupeBatch, diffDays, isMenuFile, staleness } from '../core/refresh.ts';
import { formatSaved } from '../core/schedule.ts';
import type { MenuDay } from '../core/types.ts';
import { SEED_B64 } from './seed-data.ts';
import { S, allDays, dayFor, type FileResult } from './state.ts';

// ---------- persistence (IndexedDB with in-memory fallback) ----------
const DB = 'hungry-heels', STORE = 'days', META = 'meta';
let memory = new Map<string, MenuDay>();
const memoryMeta = new Map<string, unknown>();
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
async function getMeta<T>(key: string): Promise<T | null> {
  try { const db = await openDb(); return ((await tx<T>(db, META, 'readonly', s => s.get(key))) as T | undefined) ?? null; }
  catch { return (memoryMeta.get(key) as T) ?? null; }
}
async function setMeta(key: string, val: unknown): Promise<void> {
  memoryMeta.set(key, val);
  try { const db = await openDb(); await tx(db, META, 'readwrite', s => { if (val === null) s.delete(key); else s.put(val, key); }); } catch { /* memory only */ }
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

// ---------- nutrition layers (official file, entered by you) ----------
/** Load stored nutrition layers and apply them to every day. Fixes an old bug: a stored official file used to be
 *  applied only to pages imported later, never to the built-in days. */
export async function loadLayers(): Promise<void> {
  const official = await getMeta<{ text: string; label: string } | string>('official-nutrition');
  if (official) {
    const o = typeof official === 'string' ? { text: official, label: 'the official Carolina Dining export you imported' } : official;
    S.official = { ...o, rows: parseOfficial(o.text).rows };
  }
  S.manual = (await getMeta<ManualEntry[]>('manual-nutrition')) ?? [];
  reapplyLayers();
}
export function reapplyLayers(): { official: number; manual: number } {
  return applyNutritionLayers([...S.seed, ...S.imported], { official: S.official ? { rows: S.official.rows, label: S.official.label } : null, manual: S.manual });
}
export async function importOfficial(text: string, fileName: string): Promise<string> {
  const r = parseOfficial(text);
  if (r.errors.length) return r.errors.join(' ');
  const label = `the official nutrition file “${fileName.slice(0, 60)}” you imported ${formatSaved(new Date().toISOString())}`;
  const prev = S.official;
  S.official = { rows: r.rows, label, text };
  const n = reapplyLayers();
  if (!n.official) { S.official = prev; reapplyLayers(); return 'No rows matched any menu item by recipe id or exact name, so nothing was changed.'; }
  await setMeta('official-nutrition', { text, label });
  return `Applied official nutrition to ${n.official} menu entries.${r.skipped.length ? ` Skipped ${r.skipped.length} row(s) with implausible values: ${r.skipped.slice(0, 3).join('; ')}${r.skipped.length > 3 ? '…' : ''}` : ''}`;
}
export async function removeOfficial(): Promise<void> { S.official = null; await setMeta('official-nutrition', null); reapplyLayers(); }
export async function saveManual(list: ManualEntry[]): Promise<void> { S.manual = list; await setMeta('manual-nutrition', list); reapplyLayers(); }

// ---------- importing files the student saved ----------
async function parseFile(file: File, name: string): Promise<{ result: FileResult; day: MenuDay | null }> {
  const res: FileResult = { file: name, ok: false, notes: [] };
  try {
    if (!isMenuFile(name)) throw new PageError('This file type is not supported. Save the page as a Web Archive (.webarchive) or Page Source (.html).');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const html = readPageFile(bytes);
    const parsed = parseUncPage(html, { source: 'dining.unc.edu page saved by you', retrievedAt: new Date(file.lastModified || Date.now()).toISOString(), fileName: name });
    const { unknownClasses, ...day } = parsed as MenuDay & { unknownClasses: string[] };
    borrowNutrition(day as MenuDay, EAT_UNC_SNAPSHOT, EAT_UNC_META);
    res.ok = true; res.hall = day.hall; res.date = day.date; res.items = Object.keys(day.items).length; res.periods = day.periods.length; res.noMenu = day.noMenuPosted;
    res.notes.push(...day.notes);
    if (unknownClasses.length) res.notes.push(`Unrecognized labels were ignored, not guessed: ${unknownClasses.join(', ')}.`);
    for (const p of validateDay(day as MenuDay)) res.notes.push(p.text);
    const st = staleness(day as MenuDay);
    if (st.stale) res.notes.push(st.text + '.');
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

/** Import a batch (files or a whole folder). Hall and date come from inside each page, so file names don't matter.
 *  Re-saves of the same day in one batch: the newest is kept. Each day is compared with the version it replaces. */
export async function importBatch(files: Array<{ file: File; path: string }>, progress: () => void): Promise<{ results: FileResult[]; skipped: number }> {
  const menu = files.filter(f => isMenuFile(f.path));
  const skipped = files.length - menu.length;
  const parsed: Array<{ result: FileResult; day: MenuDay }> = [];
  const results: FileResult[] = [];
  for (const f of menu) {
    const r = await parseFile(f.file, f.path);
    if (r.day) parsed.push({ result: r.result, day: r.day }); else results.push(r.result);
    S.importSummary = `Reading ${parsed.length + results.length} of ${menu.length} files…`;
    progress();
  }
  const { keep, dropped } = dedupeBatch(parsed);
  for (const d of dropped) {
    d.entry.result.dropped = true;
    d.entry.result.notes.unshift(`Not used: ${d.keptInstead.result.file} is a newer save of the same hall and date.`);
    results.push(d.entry.result);
  }
  for (const k of keep) {
    const prev = dayFor(k.day.hall, k.day.date);
    k.result.replaced = prev ? (S.imported.includes(prev) ? 'import' : 'built-in') : null;
    k.result.diff = prev ? diffDays(prev, k.day) : null;
    await saveDay(k.day);
    S.imported = [...S.imported.filter(d => !(d.hall === k.day.hall && d.date === k.day.date)), k.day];
    results.push(k.result);
  }
  reapplyLayers();
  void allDays;
  return { results: results.sort((a, b) => ((a.hall ?? '') + (a.date ?? '') + a.file).localeCompare((b.hall ?? '') + (b.date ?? '') + b.file)), skipped };
}

/** Collect files from a drop, walking into folders (Safari, Chrome, Firefox support webkitGetAsEntry). */
export async function filesFromDrop(dt: DataTransfer): Promise<Array<{ file: File; path: string }>> {
  const out: Array<{ file: File; path: string }> = [];
  const entries = [...dt.items].map(i => (i.kind === 'file' && typeof (i as any).webkitGetAsEntry === 'function' ? (i as any).webkitGetAsEntry() : null));
  if (!entries.some(Boolean)) { for (const f of dt.files) out.push({ file: f, path: f.name }); return out; }
  const walk = async (entry: any, prefix: string): Promise<void> => {
    if (!entry) return;
    if (entry.isFile) { const f: File = await new Promise((res, rej) => entry.file(res, rej)); out.push({ file: f, path: prefix + f.name }); return; }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      for (;;) {
        const batch: any[] = await new Promise((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const e of batch) await walk(e, prefix + entry.name + '/');
      }
    }
  };
  for (const e of entries) await walk(e, '');
  return out;
}
export function filesFromInput(list: FileList): Array<{ file: File; path: string }> {
  return [...list].map(f => ({ file: f, path: (f as any).webkitRelativePath || f.name }));
}
