// Turns UNC's ingredient text into a structure for display only (the store-label panel in dish details).
// Pure, no DOM. The engine never reads this: diet and allergy rules keep matching the raw text exactly as before.
//
// Honest limits:
// - Splits only where the text itself has commas, semicolons or brackets. It never guesses word boundaries, so
//   text without punctuation (UNC's saved pages lowercase it and strip all punctuation) stays one entry, as published.
// - Order is kept as given. Nothing here claims it is by weight.

export interface IngredientNode {
  /** The ingredient as written (whitespace tidied, first letter capitalized). */
  name: string;
  /** Sub-ingredients from the brackets right after it; null when there are none. */
  sub: IngredientNode[] | null;
  /** Text UNC wrote after the brackets, e.g. "shredded" in "Cheese (milk, salt) shredded". */
  after?: string;
  /** True for a lead-in such as "Contains 2% or less of" that introduces the entries after it. */
  lead?: boolean;
}

export interface ParsedIngredients {
  items: IngredientNode[];
  /** False when the text had no commas, semicolons or brackets, so it could not be split into ingredients. */
  structured: boolean;
}

const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const CLOSE = new Set([')', ']', '}']);
// Lead-ins that introduce a group on packaged-food labels. Kept as their own entry, never merged into an ingredient.
const LEAD = /^(contains\s+(?:less\s+than\s+)?(?:\d+(?:\.\d+)?\s*%|one)\s+(?:or\s+less\s+)?(?:of\s*(?:the\s+following\s*)?(?:ingredients?\s*)?)?|contains\s+one\s+or\s+more\s+of\s+the\s+following\s*(?:oils?\s*)?|may\s+contain\s+one\s+or\s+more\s+of\s+the\s+following\s*(?:oils?\s*)?|less\s+than\s+\d+(?:\.\d+)?\s*%\s+of\s*(?:the\s+following\s*)?)\s*:?\s*/i;

/** Sentence case for one entry: capitalize the first letter, keep the rest as UNC wrote it. */
export function sentenceCase(s: string): string {
  const i = s.search(/\p{L}/u);
  return i < 0 ? s : s.slice(0, i) + s[i].toUpperCase() + s.slice(i + 1);
}

function tidy(s: string): string {
  return s.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').replace(/^[\s.,;:]+|[\s.,;:]+$/g, '').trim();
}

/** Parse ingredient text. Returns null for null, empty or punctuation-only text (shown as "not listed", never as an empty list). */
export function parseIngredients(raw: string | null | undefined): ParsedIngredients | null {
  if (raw === null || raw === undefined) return null;
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!/\p{Ll}/u.test(text)) text = text.toLowerCase(); // ALL-CAPS text reads as sentence case like the rest
  if (!tidy(text.replace(/[()[\]{}]/g, ' '))) return null;
  const structured = /[,;()[\]{}]/.test(text);
  let pos = 0;

  // Parses a comma/semicolon separated list until the matching closer (or the end of the text).
  function list(closer: string | null): IngredientNode[] {
    const out: IngredientNode[] = [];
    let buf = '';
    let cur: IngredientNode | null = null; // entry that already has a bracket group; text after it becomes `after`
    const flush = () => {
      const t = tidy(buf);
      buf = '';
      if (cur) { if (t) cur.after = t; out.push(cur); cur = null; return; }
      if (!t) return;
      const m = LEAD.exec(t);
      if (m && m[0].length > 0) {
        out.push({ name: sentenceCase(tidy(m[0])), sub: null, lead: true });
        const rest = tidy(t.slice(m[0].length));
        if (rest) out.push({ name: sentenceCase(rest), sub: null });
        return;
      }
      out.push({ name: sentenceCase(t), sub: null });
    };
    while (pos < text.length) {
      const c = text[pos];
      if (c in OPEN) {
        pos++;
        const inner = list(OPEN[c]);
        const name = tidy(buf);
        buf = '';
        if (cur) { out.push(cur); cur = null; }
        if (name) {
          // "Contains 2% or less of (salt, sugar)": the lead-in keeps its own entry and owns the group.
          const m = LEAD.exec(name);
          cur = { name: sentenceCase(m && m[0].length === name.length ? tidy(name) : name), sub: inner.length ? inner : null, ...(m && m[0].length === name.length ? { lead: true } : {}) };
        } else if (out.length && !out[out.length - 1].sub && inner.length) {
          // "Cheese, (milk, salt)" style: attach to the previous entry.
          out[out.length - 1].sub = inner;
        } else out.push(...inner);
        continue;
      }
      if (CLOSE.has(c)) {
        pos++;
        if (closer !== null) { flush(); return out; } // any closer ends the group, so a mismatched bracket can't swallow the rest
        continue; // a stray closer at the top level is dropped
      }
      if (c === ',' || c === ';') { pos++; flush(); continue; }
      if (c === '.' && (pos + 1 >= text.length || text[pos + 1] === ' ' || CLOSE.has(text[pos + 1])) && !/\d$/.test(buf)) {
        // A period ending a sentence ("...salt. Contains: milk") separates entries; "2.5%" does not.
        pos++; flush(); continue;
      }
      buf += c;
      pos++;
    }
    flush(); // unclosed bracket: close it at the end of the text
    return out;
  }

  const items = list(null);
  return items.length ? { items, structured } : null;
}

/** The parsed structure as one line, e.g. "Marinara sauce (Tomatoes, Olive oil), Salt". Used by tests and the copy text. */
export function ingredientsToText(items: IngredientNode[]): string {
  return items.map(n => n.name + (n.lead ? ':' : '') + (n.sub ? ` (${ingredientsToText(n.sub)})` : '') + (n.after ? ' ' + n.after : '')).join(', ').replace(/:, /g, ': ');
}
