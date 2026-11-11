import { h } from './dom.ts';
import { S, allDays, firstDate, lastDate, type FileResult } from './state.ts';
import { announce, go, render } from './nav.ts';
import { chip } from './ui.ts';
import { clearImported, filesFromDrop, filesFromInput, importBatch, importOfficial, persistence, reapplyLayers, removeOfficial, saveManual } from './imports.ts';
import { checklistCounts, refreshChecklist, type ChecklistRow } from '../core/refresh.ts';
import { computeMissing } from '../core/validate.ts';
import { HALL_NAMES, type HallId } from '../core/types.ts';
import { formatDate, nyNow } from '../core/schedule.ts';

async function handle(files: Array<{ file: File; path: string }>) {
  if (!files.length) return;
  S.importing = true; S.importResults = []; S.importSummary = 'Reading files…'; render();
  const { results, skipped } = await importBatch(files, render);
  S.importResults = results;
  const ok = results.filter(r => r.ok && !r.dropped).length;
  S.importSummary = `Imported ${ok} day${ok === 1 ? '' : 's'} from ${files.length - skipped} saved page${files.length - skipped === 1 ? '' : 's'}.` +
    (skipped ? ` Skipped ${skipped} other file${skipped === 1 ? '' : 's'}.` : '') + (results.some(r => !r.ok) ? ` ${results.filter(r => !r.ok).length} could not be read.` : '');
  S.importing = false; S.idea = 0; render();
  announce(S.importSummary);
}

function resultItem(r: FileResult): HTMLElement {
  const head = r.ok
    ? h('div', null, r.dropped ? chip('Older duplicate', 'warn') : chip(r.noMenu ? 'No menu posted' : r.replaced ? 'Updated' : 'Imported', r.noMenu || r.dropped ? 'warn' : 'ok'),
      ` ${HALL_NAMES[r.hall as HallId]} · ${formatDate(r.date!)} · ${r.items} items · ${r.periods} periods`)
    : h('div', null, chip('Could not import', 'bad'), ' ' + r.error);
  const d = r.diff;
  return h('li', { class: r.ok ? 'ok' : 'bad' }, h('strong', null, r.file), head,
    !r.dropped && r.ok ? h('p', { class: 'muted' }, d ? `Replaces the ${r.replaced === 'built-in' ? 'built-in' : 'earlier imported'} copy. ${d.summary}` : 'New day (nothing to compare with).') : null,
    d && !d.same ? h('details', { class: 'more' }, h('summary', null, 'What changed'),
      d.added.length ? h('p', null, h('strong', null, 'New: '), d.added.join(', ')) : null,
      d.removed.length ? h('p', null, h('strong', null, 'Gone: '), d.removed.join(', ')) : null,
      d.changed.length ? h('ul', { class: 'notes' }, d.changed.map(c => h('li', null, `${c.name}: ${c.what.join('; ')}`))) : null,
      d.hoursChanged.length ? h('p', null, h('strong', null, 'Hours: '), d.hoursChanged.map(x => `${x.period} ${x.from ?? 'unknown'} → ${x.to ?? 'unknown'}`).join('; ')) : null,
      d.periodsAdded.length || d.periodsRemoved.length ? h('p', null, h('strong', null, 'Periods: '), [d.periodsAdded.length ? '+' + d.periodsAdded.join(', +') : '', d.periodsRemoved.length ? '−' + d.periodsRemoved.join(', −') : ''].filter(Boolean).join(' ')) : null) : null,
    r.notes.length ? h('ul', { class: 'notes' }, r.notes.map(n => h('li', null, n))) : null);
}

function statusChip(r: ChecklistRow): HTMLElement {
  return r.status === 'ok' ? chip('Saved', 'ok') : r.status === 'stale' ? chip('Stale', 'warn') : r.status === 'no_menu' ? chip('No menu', 'warn') : chip('Missing', 'bad');
}
function checklist(): HTMLElement {
  const today = nyNow().date;
  const rows = refreshChecklist(allDays(), today, 14);
  const c = checklistCounts(rows);
  const need = rows.filter(r => r.status !== 'ok');
  const by = new Map<string, ChecklistRow[]>();
  for (const r of rows) (by.get(r.date) ?? by.set(r.date, []).get(r.date)!).push(r);
  return h('div', { class: 'group pad', id: 'next14' }, h('h3', null, 'Next 14 days'),
    h('p', null, need.length ? `${c.ok} of ${rows.length} hall-days are saved and current. To do: ${c.missing} missing, ${c.stale} stale, ${c.no_menu} with no menu posted.` : `All ${rows.length} hall-days for the next two weeks are saved and current.`),
    // The day-by-day table opens by itself only when something needs saving; otherwise it is one line.
    h('details', { class: 'more', id: 'next14-days', ...(need.length ? { open: true } : {}) }, h('summary', null, 'Day by day'),
    h('div', { class: 'tablewrap' }, h('table', null, h('caption', null, `What to save, ${formatDate(today)} to ${formatDate(rows[rows.length - 1].date)}`),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Date'), h('th', { scope: 'col' }, 'Chase'), h('th', { scope: 'col' }, 'Top of Lenoir'))),
      h('tbody', null, [...by.entries()].map(([date, rs]) => h('tr', null, h('th', { scope: 'row' }, formatDate(date)),
        rs.map(r => h('td', { title: r.text }, statusChip(r), r.status === 'stale' ? h('small', { class: 'block' }, r.text.split(';')[0]) : null)))))))),
    h('p', { class: 'muted' }, 'Stale = saved 7 or more days before a date that hasn’t happened yet; menus can change, so re-save it. Dates come from inside each page (America/New_York).'));
}

export function dataSection(): HTMLElement {
  const sec = h('section', { class: 'update', 'aria-labelledby': 'data-h' }, h('h2', { id: 'data-h', class: 'sr' }, 'Update menus'));
  const fileInput = h('input', { type: 'file', id: 'pick', multiple: true, accept: '.webarchive,.html,.htm', class: 'sr', onChange: (e: Event) => { const el = e.target as HTMLInputElement; if (el.files) void handle(filesFromInput(el.files)); } });
  const dirInput = h('input', { type: 'file', id: 'pick-dir', multiple: true, class: 'sr', onChange: (e: Event) => { const el = e.target as HTMLInputElement; if (el.files) void handle(filesFromInput(el.files)); } });
  dirInput.setAttribute('webkitdirectory', ''); dirInput.setAttribute('directory', '');
  const drop = h('div', { class: 'drop', 'data-testid': 'drop' },
    h('div', { class: 'actions' }, h('label', { for: 'pick', class: 'primary btn' }, 'Choose saved pages'), h('label', { for: 'pick-dir', class: 'btn' }, 'Choose a folder')),
    h('p', { class: 'muted' }, 'or drag files or a whole folder here. Hall and date are read from inside each page, so file names don’t matter. Other files are skipped.'));
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer) void filesFromDrop(e.dataTransfer).then(handle); });
  sec.append(fileInput, dirInput, drop);
  if (S.importSummary) sec.appendChild(h('p', { role: 'status', class: 'banner info' }, S.importSummary));
  if (S.importResults.length) sec.appendChild(h('ul', { class: 'results' }, S.importResults.map(resultItem)));
  sec.appendChild(checklist());

  const days = allDays(); const first = firstDate(), last = lastDate();
  for (const hall of ['chase', 'top-of-lenoir'] as HallId[]) {
    const c = computeMissing(days, hall, first, last);
    sec.appendChild(h('p', { class: 'cov' }, h('strong', null, HALL_NAMES[hall]), ` ${formatDate(first)} to ${formatDate(last)}: ${c.imported} with menus, ${c.noMenu} with no menu posted, ${c.missing} missing.`));
  }
  sec.appendChild(h('button', { type: 'button', 'aria-expanded': S.showDays, 'data-fk': 'show-days', onClick: () => go(() => { S.showDays = !S.showDays; }) }, S.showDays ? 'Hide every day' : 'Show every day'));
  if (S.showDays) {
    const hc = (['chase', 'top-of-lenoir'] as HallId[]).map(hl => computeMissing(days, hl, first, last));
    const cell = (r: { status: string; itemCount: number }) => h('td', null, r.status === 'imported' ? chip(`${r.itemCount} items`, 'ok') : r.status === 'no_menu' ? chip('No menu posted', 'warn') : chip('Missing', 'bad'));
    sec.appendChild(h('div', { class: 'tablewrap' }, h('table', null, h('caption', null, 'Coverage by day'),
      h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Date'), h('th', { scope: 'col' }, 'Chase'), h('th', { scope: 'col' }, 'Top of Lenoir'))),
      h('tbody', null, hc[0].days.map((row, i) => h('tr', null, h('th', { scope: 'row' }, formatDate(row.date)), cell(row), cell(hc[1].days[i])))))));
  }
  sec.appendChild(h('details', { class: 'howto' }, h('summary', null, 'How to refresh a day (Safari on a Mac)'),
    h('ol', null, h('li', null, 'Open dining.unc.edu in Safari, choose Locations, then Chase or Top of Lenoir, and pick the date.'),
      h('li', null, 'Wait for the menu to finish loading, then choose File › Save As… and set Format to Web Archive.'),
      h('li', null, 'Repeat for each date in the list above (put them in one folder), then come back and choose the folder, or drag it here.'),
      h('li', null, 'Check “What changed” for each day. Re-importing a day replaces it; the newest save wins when a batch has duplicates.')),
    h('p', null, h('strong', null, 'A saved page contains: '), 'item names, stations, meal periods and hours, ingredient text, UNC’s allergen and diet labels.'),
    h('p', null, h('strong', null, 'It does not contain: '), 'calories, protein, fat or carbs. UNC loads those only when you tap an item, so they show as unknown unless another source fills them in.'),
    h('p', { class: 'muted' }, 'This app never downloads pages for you; dining.unc.edu asks automated tools not to. A no-menu day (such as a break) is recorded as “no menu posted”; re-save it later.')));

  // Nutrition sources
  const csv = h('input', { type: 'file', id: 'csv', accept: '.csv,.json,.txt,.tsv', class: 'sr', onChange: async (e: Event) => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    S.nutritionMsg = await importOfficial(await f.text(), f.name); S.idea = 0; render(); announce(S.nutritionMsg);
  } });
  sec.appendChild(h('div', { class: 'group pad' }, h('h3', null, 'Nutrition sources'),
    h('p', { class: 'muted' }, 'Order of trust: an official file you import > numbers you entered > Eat UNC’s third-party listing > a labeled estimate (marked “~”, can be turned off on the Me page). Estimates never replace a published number.'),
    h('p', null, S.official ? `Official file: ${S.official.rows.length} rows (${S.official.label}).` : 'No official nutrition file imported.'),
    h('p', { class: 'muted' }, 'If Carolina Dining sends an export (CSV or JSON; a PDF converted to CSV works), import it here. Columns can be named like name / recipe name, recipe id, location, calories, protein, total fat, total carbohydrate; units such as “12 g” are fine.'),
    csv, h('div', { class: 'actions' }, h('label', { for: 'csv', class: 'btn' }, 'Choose nutrition file'),
      S.official ? h('button', { type: 'button', class: 'danger', onClick: async () => { await removeOfficial(); S.nutritionMsg = 'Official nutrition removed.'; render(); } }, 'Remove official file') : null),
    S.nutritionMsg ? h('p', { role: 'status' }, S.nutritionMsg) : null,
    h('h4', null, `Entered by you (${S.manual.length})`),
    S.manual.length ? h('ul', { class: 'notes' }, S.manual.map(m => h('li', null, `${m.name} (${HALL_NAMES[m.hall]}): ${[m.calories !== null ? m.calories + ' kcal' : '', m.protein !== null ? m.protein + ' g protein' : '', m.fat !== null ? m.fat + ' g fat' : '', m.carbs !== null ? m.carbs + ' g carbs' : ''].filter(Boolean).join(', ')} `,
      h('button', { type: 'button', class: 'linkish', 'aria-label': `Remove your entry for ${m.name}`, onClick: async () => { await saveManual(S.manual.filter(x => x !== m)); render(); announce('Removed.'); } }, 'Remove'))))
      : h('p', { class: 'muted' }, 'Open any item and use “Enter values from UNC’s item panel”.')));
  sec.appendChild(h('div', { class: 'actions' }, h('button', { type: 'button', class: 'danger', onClick: async () => { await clearImported(); S.imported = []; S.importResults = []; S.importSummary = null; reapplyLayers(); render(); announce('Imported pages removed.'); } }, 'Remove imported pages'),
    h('p', { class: 'muted' }, `Built-in menus are not removed. Imports are stored ${persistence === 'indexeddb' ? 'in this browser (IndexedDB)' : 'in memory only; this browser blocked storage, so they will be lost when you close the page'}.`)));
  return sec;
}
