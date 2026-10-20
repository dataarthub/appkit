/**
 * Pure Web-standard and runtime-agnostic cryptographic utilities.
 *
 * Runs seamlessly in any environment (Browser, Cloudflare Workers, Deno, Bun, Node.js).
 * ZERO dependency on node:crypto, enabling synchronous SigV4 presigning and hashing in browsers.
 */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const textEncoder = new TextEncoder();

function toUint8Array(data: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (typeof data === 'string') {
    return textEncoder.encode(data);
  }
  if (data instanceof Uint8Array) {
    return data;
  }
  return new Uint8Array(data);
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Computes a SHA-256 digest synchronously without a native crypto dependency.
 *
 * @param data - Bytes to hash; string input is UTF-8 encoded.
 * @returns A new 32-byte digest.
 * @example
 * ```typescript
 * import { sha256Bytes } from '@alneas/appkit-core/storage/crypto';
 *
 * console.log(sha256Bytes("hello"));
 * ```
 */
export function sha256Bytes(data: Uint8Array | ArrayBuffer | string): Uint8Array {
  const bytes = toUint8Array(data);
  const l = bytes.length * 8;
  const newLen = ((bytes.length + 8) >> 6) + 1;
  const words = new Uint32Array(newLen * 16);

  for (let i = 0; i < bytes.length; i++) {
    words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }
  words[bytes.length >> 2] |= 0x80 << (24 - (bytes.length % 4) * 8);
  words[words.length - 1] = l & 0xffffffff;
  words[words.length - 2] = Math.floor(l / 0x100000000);

  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const W = new Uint32Array(64);

  for (let i = 0; i < words.length; i += 16) {
    for (let t = 0; t < 16; t++) W[t] = words[i + t];
    for (let t = 16; t < 64; t++) {
      const gamma0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^
                     ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^
                     (W[t - 15] >>> 3);
      const gamma1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^
                     ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^
                     (W[t - 2] >>> 10);
      W[t] = (gamma1 + W[t - 7] + gamma0 + W[t - 16]) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let t = 0; t < 64; t++) {
      const sigma1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h + sigma1 + ch + K[t] + W[t]) | 0;
      const sigma0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sigma0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (H[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (H[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (H[i] >>> 8) & 0xff;
    out[i * 4 + 3] = H[i] & 0xff;
  }
  return out;
}

/**
 * Computes a lowercase hexadecimal SHA-256 digest synchronously.
 *
 * @param data - Bytes to hash; string input is UTF-8 encoded.
 * @returns The 64-character lowercase hexadecimal digest.
 * @example
 * ```typescript
 * import { sha256Hex } from '@alneas/appkit-core/storage/crypto';
 *
 * console.log(sha256Hex("hello"));
 * ```
 */
export function sha256Hex(data: Uint8Array | ArrayBuffer | string): string {
  return bufferToHex(sha256Bytes(data));
}

/**
 * Signs bytes using HMAC with SHA-256 synchronously.
 *
 * @param key - Secret signing bytes; strings use UTF-8.
 * @param data - Message bytes; strings use UTF-8.
 * @returns A new 32-byte authentication code.
 * @example
 * ```typescript
 * import { hmacSha256 } from '@alneas/appkit-core/storage/crypto';
 *
 * console.log(hmacSha256("example-key", "hello"));
 * ```
 */
export function hmacSha256(
  key: Uint8Array | ArrayBuffer | string,
  data: Uint8Array | ArrayBuffer | string,
): Uint8Array {
  let keyBytes = toUint8Array(key);
  const dataBytes = toUint8Array(data);
  const blockSize = 64;

  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }
  if (keyBytes.length < blockSize) {
    const padded = new Uint8Array(blockSize);
    padded.set(keyBytes);
    keyBytes = padded;
  }

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = keyBytes[i] ^ 0x5c;
    iKeyPad[i] = keyBytes[i] ^ 0x36;
  }

  const innerMsg = new Uint8Array(blockSize + dataBytes.length);
  innerMsg.set(iKeyPad, 0);
  innerMsg.set(dataBytes, blockSize);
  const innerHash = sha256Bytes(innerMsg);

  const outerMsg = new Uint8Array(blockSize + 32);
  outerMsg.set(oKeyPad, 0);
  outerMsg.set(innerHash, blockSize);
  return sha256Bytes(outerMsg);
}

/**
 * Signs bytes using HMAC-SHA256 and returns lowercase hexadecimal.
 *
 * @param key - Secret signing bytes; strings use UTF-8.
 * @param data - Message bytes; strings use UTF-8.
 * @returns The 64-character lowercase hexadecimal authentication code.
 * @example
 * ```typescript
 * import { hmacSha256Hex } from '@alneas/appkit-core/storage/crypto';
 *
 * console.log(hmacSha256Hex("example-key", "hello"));
 * ```
 */
export function hmacSha256Hex(
  key: Uint8Array | ArrayBuffer | string,
  data: Uint8Array | ArrayBuffer | string,
): string {
  return bufferToHex(hmacSha256(key, data));
}

/**
 * Aliases the synchronous lowercase hexadecimal SHA-256 helper.
 *
 * @param data - Bytes to hash; strings use UTF-8.
 * @returns The 64-character digest.
 * @example
 * ```typescript
 * import { sha256HexSync } from '@alneas/appkit-core/storage/crypto';
 *
 * console.log(sha256HexSync("hello"));
 * ```
 */
export const sha256HexSync = sha256Hex;

/**
 * Encodes UTF-8 text as standard Base64.
 *
 * @param str - Unicode text to encode.
 * @returns Base64 text representing the UTF-8 bytes.
 * @example
 * ```typescript
 * import { base64EncodeUtf8 } from '@alneas/appkit-core/storage/crypto';
 *
 * console.log(base64EncodeUtf8("hello 日本語"));
 * ```
 */
export function base64EncodeUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes standard Base64 bytes into UTF-8 text.
 *
 * @param base64 - Standard Base64 encoding to decode.
 * @returns Decoded text; malformed UTF-8 uses replacement characters.
 * @throws Throws when atob rejects malformed Base64.
 * @example
 * ```typescript
 * import { base64DecodeUtf8 } from '@alneas/appkit-core/storage/crypto';
 *
 * console.log(base64DecodeUtf8("aGVsbG8="));
 * ```
 */
export function base64DecodeUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
