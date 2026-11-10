import type { MenuDay, MenuItem } from './types.ts';

// Compact, de-duplicated storage for the built-in menus: items are stored once (by id + fingerprint)
// and days refer to them. Used by scripts/build-seed.ts (encode) and the client (decode).
export interface SeedFile {
  version: 1;
  items: Record<string, MenuItem>;
  days: Array<Omit<MenuDay, 'items'> & { itemRefs: Record<string, string> }>;
}

function fingerprint(it: MenuItem): string {
  const s = JSON.stringify([it.name, it.ingredients, it.allergens, it.labels]);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function encodeSeed(days: MenuDay[]): SeedFile {
  const items: Record<string, MenuItem> = {};
  const out: SeedFile['days'] = [];
  for (const d of days) {
    const refs: Record<string, string> = {};
    for (const [id, it] of Object.entries(d.items)) {
      const key = id + ':' + fingerprint(it);
      items[key] ??= it;
      refs[id] = key;
    }
    const { items: _i, ...rest } = d;
    out.push({ ...rest, itemRefs: refs });
  }
  return { version: 1, items, days: out };
}

export function decodeSeed(seed: SeedFile): MenuDay[] {
  return seed.days.map(({ itemRefs, ...rest }) => {
    const items: Record<string, MenuItem> = {};
    for (const [id, key] of Object.entries(itemRefs)) {
      const src = seed.items[key];
      items[id] = { ...src, allergens: [...src.allergens], labels: { ...src.labels }, nutrition: { ...src.nutrition }, warnings: [...src.warnings] };
    }
    return { ...rest, items } as MenuDay;
  });
}
