import type { MenuItem } from '../src/core/types.ts';

export function mkItem(name: string, over: Partial<MenuItem> & { ing?: string | null } = {}): MenuItem {
  const { ing, ...rest } = over as any;
  return {
    id: String(Math.abs(hash(name))), name,
    ingredients: ing === undefined ? name.toLowerCase() : ing,
    allergens: [], labels: { vegan: false, vegetarian: false, halal: false, madeWithoutGluten: false },
    nutrition: { calories: null, protein: null, fat: null, carbs: null }, warnings: [], ...rest,
  };
}
function hash(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

/** Build a minimal UNC-like location page. */
export function page(opts: { slug?: string; epoch?: number | null; periods: Array<{ label: string; stations: Array<{ name: string; items: Array<{ name: string; ing?: string; cls?: string; id?: string }> }> }> }): string {
  const tabs = opts.periods.map((p, i) => `<button id="tabid-${i + 1}"><div class="c-tabs-nav__link-inner">${p.label}</div></button>`).join('');
  const panels = opts.periods.map((p, i) => `<div role="tabpanel" id="tabinfo-${i + 1}" class="c-tab"><div class="c-tab__content">` +
    p.stations.map(s => `<div class="menu-station"><button type="button" class="toggle-menu-station-data" aria-expanded="true">${s.name}</button><ul>` +
      s.items.map((it, j) => `<li class="menu-item-li prop-pool search-space" data-searchable="${it.ing ?? ''}"><a href="#" class="show-nutrition ${it.cls ?? ''}" data-recipe="${it.id ?? (1000 + i * 100 + j)}" tabindex="0">${it.name}</a></li>`).join('') + '</ul></div>').join('') + '</div></div>').join('');
  const slug = opts.slug ?? 'chase';
  const ts = opts.epoch === null ? '' : `<input type="hidden" value="${opts.epoch ?? 1794632400}" id="date-timestamp">`;
  return `<html><head><link rel="canonical" href="https://dining.unc.edu/locations/${slug}/"></head><body>${ts}<div>${tabs}</div>${panels}<div id="nutrition-slider"></div></body></html>`;
}

/** Minimal binary plist writer: { WebMainResource: { WebResourceData: <bytes> } } */
export function webArchive(html: string): Uint8Array {
  const data = new TextEncoder().encode(html);
  const objs: number[][] = [];
  const str = (s: string) => { const b = [...new TextEncoder().encode(s)]; return [0x50 | Math.min(b.length, 15), ...(b.length >= 15 ? [0x12, ...be(b.length, 4)] : []), ...b]; };
  const be = (n: number, size: number) => { const out: number[] = []; for (let i = size - 1; i >= 0; i--) out.push((n >> (8 * i)) & 0xff); return out; };
  // 0: root dict, 1: "WebMainResource", 2: inner dict, 3: "WebResourceData", 4: data
  objs[1] = str('WebMainResource');
  objs[3] = str('WebResourceData');
  objs[4] = [0x4f, 0x12, ...be(data.length, 4), ...data];
  objs[0] = [0xd1, 1, 2];
  objs[2] = [0xd1, 3, 4];
  const header = [...new TextEncoder().encode('bplist00')];
  const body: number[] = [];
  const offsets: number[] = [];
  for (const o of objs) { offsets.push(header.length + body.length); body.push(...o); }
  const offTable = header.length + body.length;
  const table: number[] = []; for (const o of offsets) table.push(...be(o, 4));
  const trailer = [0, 0, 0, 0, 0, 0, 4, 1, ...be(0, 4), ...be(objs.length, 4), ...be(0, 4), ...be(0, 4), ...be(offTable, 4)];
  // trailer layout: 5 unused + sortVersion(1) + offsetSize(1) + refSize(1) + numObjects(8) + topObject(8) + offsetTable(8)
  const t = new Uint8Array(32); t[6] = 4; t[7] = 1;
  const dv = new DataView(t.buffer);
  dv.setBigUint64(8, BigInt(objs.length)); dv.setBigUint64(16, 0n); dv.setBigUint64(24, BigInt(offTable));
  void trailer;
  return new Uint8Array([...header, ...body, ...table, ...t]);
}
