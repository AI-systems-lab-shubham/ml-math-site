// Reads the character map (cmap) and the name table from a WOFF2 file, with Node's built-in Brotli. No dependencies.
// cmap and name are never transformed in WOFF2, so their bytes are the plain sfnt tables.
import fs from "node:fs";
import zlib from "node:zlib";

const TAGS = ["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL", "SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc", "feat", "fmtx", "fvar", "gvar", "hsty", "just", "lcar", "mort", "morx", "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill"];

export function woff2Tables(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString("latin1", 0, 4) !== "wOF2") throw new Error(`${file}: not a WOFF2 file`);
  const numTables = buf.readUInt16BE(12);
  const compressedSize = buf.readUInt32BE(20);
  let p = 48;
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const b = buf[p++]; v = (v << 7) | (b & 0x7f); if (!(b & 0x80)) return v >>> 0; } throw new Error("bad UIntBase128"); };
  const dir = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[p++];
    let tag;
    if ((flags & 0x3f) === 63) { tag = buf.toString("latin1", p, p + 4); p += 4; } else tag = TAGS[flags & 0x3f];
    const version = flags >> 6;
    const origLength = base128();
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    dir.push({ tag, length: transformed ? base128() : origLength });
  }
  const data = zlib.brotliDecompressSync(buf.subarray(p, p + compressedSize));
  const tables = {};
  let off = 0;
  for (const t of dir) { tables[t.tag] = data.subarray(off, off + t.length); off += t.length; }
  return tables;
}

/** Set of code points the font maps to a glyph. */
export function woff2Codepoints(file) {
  const cmap = woff2Tables(file).cmap;
  const out = new Set();
  const n = cmap.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const o = cmap.readUInt32BE(4 + i * 8 + 4);
    const fmt = cmap.readUInt16BE(o);
    if (fmt === 4) {
      const segs = cmap.readUInt16BE(o + 6) / 2;
      const endAt = o + 14, startAt = endAt + segs * 2 + 2, deltaAt = startAt + segs * 2, rangeAt = deltaAt + segs * 2;
      for (let s = 0; s < segs; s++) {
        const end = cmap.readUInt16BE(endAt + s * 2), start = cmap.readUInt16BE(startAt + s * 2);
        const delta = cmap.readInt16BE(deltaAt + s * 2), range = cmap.readUInt16BE(rangeAt + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g;
          if (range === 0) g = (c + delta) & 0xffff;
          else { const gi = rangeAt + s * 2 + range + (c - start) * 2; g = gi + 2 <= cmap.length ? cmap.readUInt16BE(gi) : 0; if (g) g = (g + delta) & 0xffff; }
          if (g) out.add(c);
        }
      }
    } else if (fmt === 12) {
      const groups = cmap.readUInt32BE(o + 12);
      for (let g = 0; g < groups; g++) {
        const a = o + 16 + g * 12;
        const start = cmap.readUInt32BE(a), end = cmap.readUInt32BE(a + 4);
        for (let c = start; c <= end; c++) out.add(c);
      }
    }
  }
  return out;
}

/** name table records as {id, text} for Windows Unicode (3, 1) strings. */
export function woff2Names(file) {
  const name = woff2Tables(file).name;
  const count = name.readUInt16BE(2), strings = name.readUInt16BE(4);
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = 6 + i * 12;
    if (name.readUInt16BE(r) !== 3) continue;
    const id = name.readUInt16BE(r + 6), len = name.readUInt16BE(r + 8), off = name.readUInt16BE(r + 10);
    out.push({ id, text: Buffer.from(name.subarray(strings + off, strings + off + len)).swap16().toString("utf16le") });
  }
  return out;
}

/** Layout feature tags (GSUB and GPOS) present in the font. */
export function woff2Features(file) {
  const tables = woff2Tables(file);
  const out = new Set();
  for (const t of ["GSUB", "GPOS"]) {
    const b = tables[t];
    if (!b) continue;
    const list = b.readUInt16BE(6);
    const n = b.readUInt16BE(list);
    for (let i = 0; i < n; i++) out.add(b.toString("latin1", list + 2 + i * 6, list + 6 + i * 6));
  }
  return out;
}
