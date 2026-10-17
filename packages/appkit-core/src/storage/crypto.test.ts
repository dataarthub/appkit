import { describe, expect, it } from 'bun:test';
import {
  sha256Hex,
  hmacSha256Hex,
  base64EncodeUtf8,
  base64DecodeUtf8,
} from './crypto';

describe('Web-standard crypto utilities (pure TypeScript, zero native dependencies)', () => {
  it('computes exact SHA-256 hash for known test vectors (RFC 6234 / NIST)', () => {
    // Empty string
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    // "Hello World"
    expect(sha256Hex('Hello World')).toBe('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
    // Uint8Array input
    expect(sha256Hex(new TextEncoder().encode('Hello World'))).toBe('a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e');
  });

  it('computes exact HMAC-SHA256 for known test vectors (RFC 4231)', () => {
    // Standard quick brown fox
    const key = 'key';
    const data = 'The quick brown fox jumps over the lazy dog';
    expect(hmacSha256Hex(key, data)).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
    expect(hmacSha256Hex(new TextEncoder().encode(key), new TextEncoder().encode(data))).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');

    // RFC 4231 Test Case 1: Key = 0x0b repeated 20 times, Data = "Hi There"
    const rfcKey1 = new Uint8Array(20).fill(0x0b);
    const rfcData1 = new TextEncoder().encode('Hi There');
    expect(hmacSha256Hex(rfcKey1, rfcData1)).toBe(
      'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    );

    // RFC 4231 Test Case 2: Key = "Jefe", Data = "what do ya want for nothing?"
    expect(hmacSha256Hex('Jefe', 'what do ya want for nothing?')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );

    // RFC 4231 Test Case 3: Key = 0xaa repeated 20 times, Data = 0xdd repeated 50 times
    const rfcKey3 = new Uint8Array(20).fill(0xaa);
    const rfcData3 = new Uint8Array(50).fill(0xdd);
    expect(hmacSha256Hex(rfcKey3, rfcData3)).toBe(
      '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe',
    );
  });

  it('encodes and decodes UTF-8 base64 symmetrically in browser/Node/workers', () => {
    const original = 'こんにちは世界！東京 / Tokyo & 123 🚀';
    const encoded = base64EncodeUtf8(original);
    const decoded = base64DecodeUtf8(encoded);
    expect(decoded).toBe(original);
  });
});
