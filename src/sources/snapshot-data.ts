import type { SnapshotEntry, SnapshotMeta } from '../core/borrow.ts';

// The hand-transcribed Eat UNC copy (Nov 5, 2026) was not available when this repo was rebuilt,
// so nothing is borrowed yet. Nutrition therefore shows as unknown. To add it, put the list in
// data/eatunc-2026-11-05.txt (hall | name | calories | protein) and run `npm run build:seed`.
export const EAT_UNC_META: SnapshotMeta = { source: "Eat UNC's Nov 5 listing", kind: 'third_party', asOf: '2026-11-05' };
export const EAT_UNC_SNAPSHOT: SnapshotEntry[] = [];
