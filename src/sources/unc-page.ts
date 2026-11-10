import type { HallId, MenuDay, MenuItem, Period, Provenance, Station } from '../core/types.ts';

export class PageError extends Error {}

const ALLERGEN_MAP: Record<string, string | null> = {
  has_milk: 'milk', has_egg: 'egg', has_wheat: 'wheat', has_gluten: 'wheat', has_soy: 'soy',
  has_sesame: 'sesame', has_fish: 'fish', has_shellfish: 'shellfish', has_peanut: 'peanut',
  has_tree_nut: 'tree_nut', has_treenut: 'tree_nut', has_tree_nuts: 'tree_nut',
};
const IGNORED_PROPS = new Set(['smart_choice', 'local', 'organic', 'pool', 'cool_foods', 'sustainable_seafood']);
const KNOWN_PROPS = new Set(['vegan', 'vegetarian', 'halal', 'made_without_gluten']);
// Classes that appear on the page chrome (filters/indicators), not on items.
const CHROME_CLASSES = new Set(['allergen-filter', 'allergen-filters', 'allergen-indicator', 'allergen-disclaimer',
  'allergen-mindful', 'prop-filter', 'prop-indicator']);

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/** America/New_York calendar date for an epoch-seconds value. */
export function nyDateFromEpoch(sec: number): string {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(new Date(sec * 1000));
}

function clock(s: string): number | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(s.trim());
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toLowerCase() === 'pm') h += 12;
  return h * 60 + (m[2] ? parseInt(m[2], 10) : 0);
}

export function parsePeriodLabel(label: string): { name: string; hours: string | null; startMin: number | null; endMin: number | null } {
  const text = decodeEntities(label).replace(/\s+/g, ' ').trim();
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(text);
  if (!m) return { name: text, hours: null, startMin: null, endMin: null };
  const hours = m[2].trim();
  const parts = hours.split(/\s*[-–—]\s*/);
  let startMin: number | null = null, endMin: number | null = null;
  if (parts.length === 2) {
    startMin = clock(parts[0]);
    endMin = clock(parts[1]);
    if (startMin !== null && endMin !== null && endMin <= startMin) endMin += 24 * 60;
  }
  return { name: m[1].trim(), hours, startMin, endMin };
}

export interface ParseNotes { unknownClasses: string[]; notes: string[] }

export function parseUncPage(html: string, prov: Omit<Provenance, 'kind' | 'verification'> & Partial<Provenance>): MenuDay & ParseNotes {
  const canon = /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i.exec(html) ?? /<link[^>]*href="([^"]+)"[^>]*rel="canonical"/i.exec(html);
  if (!canon || !/dining\.unc\.edu/i.test(canon[1])) throw new PageError('This does not look like a dining.unc.edu page.');
  const slug = /\/locations\/([^/]+)\/?/.exec(canon[1])?.[1];
  if (slug !== 'chase' && slug !== 'top-of-lenoir') {
    throw new PageError(slug ? `This app supports Chase and Top of Lenoir; this page is "${slug}".` : 'This page is not a dining location page.');
  }
  const hall = slug as HallId;
  const ts = /<input[^>]*id="date-timestamp"[^>]*value="(\d+)"/i.exec(html) ?? /<input[^>]*value="(\d+)"[^>]*id="date-timestamp"/i.exec(html);
  if (!ts) throw new PageError('Could not find the menu date in this page. Save the page from a date view on dining.unc.edu.');
  const date = nyDateFromEpoch(parseInt(ts[1], 10));

  // Tabs (labels) and panels (content), same order.
  const tabLabels: string[] = [];
  for (const m of html.matchAll(/class="c-tabs-nav__link-inner">([^<]*)</g)) tabLabels.push(m[1]);
  const panelStarts: number[] = [];
  for (const m of html.matchAll(/role="tabpanel"\s+id="tabinfo-\d+"/g)) panelStarts.push(m.index!);

  const items: Record<string, MenuItem> = {};
  const unknown = new Set<string>();
  const notes: string[] = [];
  const periods: Period[] = [];

  if (tabLabels.length !== panelStarts.length) {
    notes.push(`Found ${tabLabels.length} meal-period tabs but ${panelStarts.length} panels.`);
  }
  const n = Math.min(tabLabels.length, panelStarts.length);
  const itemRe = /<li class="menu-item-li[^"]*"[^>]*?data-searchable="([^"]*)"[^>]*>[\s\S]*?<a[^>]*class="([^"]*show-nutrition[^"]*)"[^>]*?data-recipe="(\d+)"[^>]*>([^<]*)<\/a>/g;

  for (let i = 0; i < n; i++) {
    const label = parsePeriodLabel(tabLabels[i]);
    const seg = html.slice(panelStarts[i], i + 1 < n ? panelStarts[i + 1] : html.indexOf('nutrition-slider', panelStarts[i]) > 0 ? html.indexOf('id="nutrition-slider"', panelStarts[i]) : html.length);
    const stations: Station[] = [];
    const stParts = seg.split('<div class="menu-station">');
    for (let s = 1; s < stParts.length; s++) {
      const part = stParts[s];
      const nm = /class="toggle-menu-station-data[^"]*"[^>]*>([^<]*)</.exec(part);
      const station: Station = { name: nm ? decodeEntities(nm[1]).trim() : 'Station', itemIds: [] };
      itemRe.lastIndex = 0;
      for (const m of part.matchAll(itemRe)) {
        const id = m[3];
        const name = decodeEntities(m[4]).replace(/\s+/g, ' ').trim();
        if (!name) continue;
        const classes = m[2].split(/\s+/).filter(Boolean);
        const allergens = new Set<string>();
        const labels = { vegan: false, vegetarian: false, halal: false, madeWithoutGluten: false };
        for (const c of classes) {
          if (c === 'show-nutrition' || CHROME_CLASSES.has(c)) continue;
          if (c.startsWith('allergen-')) {
            const k = c.slice(9);
            if (k in ALLERGEN_MAP && ALLERGEN_MAP[k]) allergens.add(ALLERGEN_MAP[k]!);
            else unknown.add(c);
          } else if (c.startsWith('prop-')) {
            const k = c.slice(5);
            if (k === 'vegan') labels.vegan = true;
            else if (k === 'vegetarian') labels.vegetarian = true;
            else if (k === 'halal') labels.halal = true;
            else if (k === 'made_without_gluten') labels.madeWithoutGluten = true;
            else if (!IGNORED_PROPS.has(k)) unknown.add(c);
          } else unknown.add(c);
        }
        const ing = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
        const prev = items[id];
        if (prev) {
          for (const a of allergens) if (!prev.allergens.includes(a)) prev.allergens.push(a);
        } else {
          items[id] = {
            id, name, ingredients: ing ? ing : null, allergens: [...allergens].sort(), labels,
            nutrition: { calories: null, protein: null, fat: null, carbs: null },
            warnings: [],
          };
        }
        if (!station.itemIds.includes(id)) station.itemIds.push(id);
      }
      if (station.itemIds.length) stations.push(station);
    }
    if (stations.length) periods.push({ name: label.name, hours: label.hours, startMin: label.startMin, endMin: label.endMin, stations });
  }
  void KNOWN_PROPS;

  const itemCount = Object.keys(items).length;
  const noMenuPosted = periods.length === 0 || itemCount === 0;
  if (noMenuPosted) {
    if (/menu-item-li/.test(html) && itemCount === 0) throw new PageError('The page has menu entries but none could be read. The page layout may have changed.');
    notes.push('No menu was posted when this page was saved (no meal periods or items).');
  }
  const provenance: Provenance = {
    source: prov.source, kind: prov.kind ?? 'official', retrievedAt: prov.retrievedAt,
    verification: prov.verification ?? 'user_saved_page', fileName: prov.fileName,
  };
  return { hall, date, periods, items, provenance, noMenuPosted, notes, unknownClasses: [...unknown].sort() };
}
