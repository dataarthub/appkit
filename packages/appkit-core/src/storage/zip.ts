/**
 * Creates an in-memory ZIP archive using UTF-8 names and uncompressed entries.
 *
 * @param files - Entries in archive order; names must be unique relative slash paths without empty or dot segments, backslashes or NUL.
 * @returns Newly allocated archive bytes; an empty input creates a valid empty ZIP.
 * @throws Throws for unsafe/duplicate names, over 65535 entries, or sizes/offsets requiring ZIP64.
 * @remarks All entry data and archive output are held in memory. No compression, filesystem writing or ZIP64 support is provided.
 * @example
 * ```typescript
 * import { zipStored } from "@alneas/appkit-core/storage/zip";
 *
 * const archive = zipStored([{ key: "notes/readme.txt", data: new TextEncoder().encode("hello") }]);
 * console.log(archive.byteLength);
 * ```
 */
export function zipStored(files: readonly {
  /** Unique relative archive entry name, encoded as UTF-8; traversal and absolute paths are rejected. */
  key: string;
  /** Uncompressed bytes copied into the archive for this entry. */
  data: Uint8Array }[]): Uint8Array {
  if (files.length > 65535) throw new Error('ZIP64 is not supported');
  const chunks: Uint8Array[] = [], central: Uint8Array[] = [];
  const names = new Set<string>();
  let offset = 0;
  const header = (length: number) => new Uint8Array(length);
  for (const file of files) {
    if (!file.key || /[\\\0]/.test(file.key) || file.key.startsWith('/') || /^[a-z]:/i.test(file.key) || file.key.split('/').some(p => p === '.' || p === '..' || p === '') || names.has(file.key)) throw new Error('Unsafe or duplicate ZIP key');
    names.add(file.key);
    const name = new TextEncoder().encode(file.key), size = file.data.length;
    if (name.length > 65535 || size > 0xffffffff || offset + size + name.length + 30 > 0xffffffff) throw new Error('ZIP64 is not supported');
    let crc = 0xffffffff;
    for (const byte of file.data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = header(30 + name.length), l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x800, true);
    l.setUint16(12, 33, true); l.setUint32(14, crc, true); l.setUint32(18, size, true); l.setUint32(22, size, true); l.setUint16(26, name.length, true); local.set(name, 30);
    const record = header(46 + name.length), c = new DataView(record.buffer);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true); c.setUint16(14, 33, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true); record.set(name, 46);
    chunks.push(local, file.data); central.push(record); offset += local.length + size;
  }
  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  if (offset + centralSize + 22 > 0xffffffff) throw new Error('ZIP64 is not supported');
  const end = header(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  const output = new Uint8Array(offset + centralSize + 22); let cursor = 0;
  for (const chunk of [...chunks, ...central, end]) { output.set(chunk, cursor); cursor += chunk.length; }
  return output;
}
