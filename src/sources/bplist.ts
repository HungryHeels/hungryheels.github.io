// Pure-TypeScript binary plist (bplist00) reader. No dependencies.
// Supports the object types Safari .webarchive files use.

export type PlistValue =
  | null | boolean | number | bigint | string | Date | Uint8Array
  | PlistValue[] | { [key: string]: PlistValue };

export class PlistError extends Error {}

export function parseBinaryPlist(buf: Uint8Array): PlistValue {
  if (buf.length < 40) throw new PlistError('File is too small to be a property list.');
  const magic = String.fromCharCode(...buf.subarray(0, 8));
  if (magic !== 'bplist00') throw new PlistError('Not a binary property list (missing bplist00 header).');
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const t = buf.length - 32;
  const offSize = buf[t + 6];
  const refSize = buf[t + 7];
  const numObjects = Number(dv.getBigUint64(t + 8));
  const topObject = Number(dv.getBigUint64(t + 16));
  const offTable = Number(dv.getBigUint64(t + 24));
  if (!offSize || !refSize || offTable + numObjects * offSize > t) throw new PlistError('Corrupt property list trailer.');

  const readUInt = (pos: number, size: number): number => {
    let v = 0;
    for (let i = 0; i < size; i++) v = v * 256 + buf[pos + i];
    return v;
  };
  const offsetOf = (idx: number): number => {
    if (idx >= numObjects) throw new PlistError('Object reference out of range.');
    return readUInt(offTable + idx * offSize, offSize);
  };
  const cache = new Map<number, PlistValue>();
  const utf8 = new TextDecoder('utf-8');

  const lengthAt = (pos: number, nib: number): [number, number] => {
    if (nib !== 0xf) return [nib, pos + 1];
    const m = buf[pos + 1];
    if ((m >> 4) !== 1) throw new PlistError('Bad length marker.');
    const n = 1 << (m & 0xf);
    return [readUInt(pos + 2, n), pos + 2 + n];
  };

  const obj = (idx: number, depth = 0): PlistValue => {
    if (depth > 64) throw new PlistError('Property list nested too deeply.');
    const hit = cache.get(idx);
    if (hit !== undefined) return hit;
    const pos = offsetOf(idx);
    const marker = buf[pos];
    const type = marker >> 4;
    const nib = marker & 0xf;
    let out: PlistValue;
    switch (type) {
      case 0x0:
        out = nib === 0x8 ? false : nib === 0x9 ? true : null;
        break;
      case 0x1: {
        const n = 1 << nib;
        if (n <= 4) out = readUInt(pos + 1, n);
        else if (n === 8) out = Number(dv.getBigUint64(pos + 1));
        else out = Number(dv.getBigUint64(pos + 1 + (n - 8)));
        break;
      }
      case 0x2:
        out = nib === 2 ? dv.getFloat32(pos + 1) : dv.getFloat64(pos + 1);
        break;
      case 0x3:
        out = new Date((978307200 + dv.getFloat64(pos + 1)) * 1000);
        break;
      case 0x4: {
        const [len, start] = lengthAt(pos, nib);
        out = buf.subarray(start, start + len);
        break;
      }
      case 0x5: {
        const [len, start] = lengthAt(pos, nib);
        out = utf8.decode(buf.subarray(start, start + len));
        break;
      }
      case 0x6: {
        const [len, start] = lengthAt(pos, nib);
        out = new TextDecoder('utf-16be').decode(buf.subarray(start, start + len * 2));
        break;
      }
      case 0xa: {
        const [len, start] = lengthAt(pos, nib);
        const arr: PlistValue[] = [];
        for (let i = 0; i < len; i++) arr.push(obj(readUInt(start + i * refSize, refSize), depth + 1));
        out = arr;
        break;
      }
      case 0xd: {
        const [len, start] = lengthAt(pos, nib);
        const dict: { [k: string]: PlistValue } = {};
        for (let i = 0; i < len; i++) {
          const k = obj(readUInt(start + i * refSize, refSize), depth + 1);
          const v = obj(readUInt(start + (len + i) * refSize, refSize), depth + 1);
          if (typeof k === 'string') dict[k] = v;
        }
        out = dict;
        break;
      }
      default:
        throw new PlistError('Unsupported property list object type 0x' + type.toString(16) + '.');
    }
    if (typeof out !== 'object' || out === null) cache.set(idx, out);
    else cache.set(idx, out);
    return out;
  };

  return obj(topObject);
}

/** Pull the main HTML (UTF-8) out of a Safari .webarchive. */
export function webArchiveMainHtml(buf: Uint8Array): string {
  const root = parseBinaryPlist(buf);
  if (!root || typeof root !== 'object' || Array.isArray(root) || root instanceof Date || root instanceof Uint8Array) {
    throw new PlistError('Web archive has an unexpected structure.');
  }
  const main = (root as { [k: string]: PlistValue }).WebMainResource;
  if (!main || typeof main !== 'object' || Array.isArray(main) || main instanceof Uint8Array || main instanceof Date) {
    throw new PlistError('Web archive has no main page (WebMainResource).');
  }
  const data = (main as { [k: string]: PlistValue }).WebResourceData;
  if (!(data instanceof Uint8Array)) throw new PlistError('Web archive main page has no data.');
  return new TextDecoder('utf-8').decode(data);
}

/** Read a file the student gives us: .webarchive (binary plist) or plain HTML. */
export function readPageFile(bytes: Uint8Array): string {
  const head = String.fromCharCode(...bytes.subarray(0, 8));
  if (head === 'bplist00') return webArchiveMainHtml(bytes);
  return new TextDecoder('utf-8').decode(bytes);
}
