/**
 * @fileoverview Stamp seal (imprint) utility for PDFs.
 *
 * This module provides functionality to generate a Data URL for a fallback stamp seal
 * (circular seal + text) when no saved stamp image is available.
 * Returns a PNG if Canvas is available in the runtime environment, or an SVG otherwise.
 */

/**
 * Name ordering rule during name parsing.
 *
 * - `auto`: Automatically infer based on character script and delimiters
 * - `family-first`: Family name first (uses the first token as the family name)
 * - `given-first`: Given name first (uses the last token as the family name)
 */
export type SealNameOrder = 'auto' | 'family-first' | 'given-first';

/**
 * Options for determining the stamp label (text on the seal face).
 */
export interface SealLabelOptions {
  /**
   * Explicit text to use on the seal face.
   * When specified, takes precedence over name parsing.
   */
  sealLabel?: string;
  /**
   * Explicit family name.
   * Used when `sealLabel` is not specified.
   */
  familyName?: string;
  /**
   * Ordering rule when inferring family name from `fullName`.
   * Defaults to `auto`.
   */
  nameOrder?: SealNameOrder;
  /**
   * Maximum character count for the seal face text.
   * Defaults to `3`.
   */
  maxChars?: number;
}

/**
 * Options for generating fallback seal SVG or Data URL.
 */
export interface FallbackSealOptions extends SealLabelOptions {
  /**
   * Overall dimension (square).
   * Applied when `width` / `height` are not specified.
   * Defaults to `256`.
   */
  size?: number;
  /**
   * SVG width.
   */
  width?: number;
  /**
   * SVG height.
   */
  height?: number;
  /**
   * Circle stroke color.
   * Defaults to `#c62828`.
   */
  circleColor?: string;
  /**
   * Text color.
   * Defaults to `#c62828`.
   */
  textColor?: string;
  /**
   * Circle stroke width.
   * Defaults to `8`.
   */
  strokeWidth?: number;
  /**
   * Font family for text.
   * Defaults to `sans-serif`.
   */
  fontFamily?: string;
  /**
   * Font weight for text.
   * Defaults to `700`.
   */
  fontWeight?: string | number;
  /**
   * Background color to use.
   * Transparent when omitted.
   */
  backgroundColor?: string;
  /**
   * Output image format.
   *
   * - `auto`: PNG if Canvas is available, otherwise SVG
   * - `png`: Prefer PNG (`null` if Canvas is unavailable)
   * - `svg`: Fixed to SVG
   *
   * Defaults to `auto`.
   */
  outputFormat?: 'auto' | 'png' | 'svg';
}

const CJK_CHAR_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/u;
const LATIN_TOKEN_RE = /^[\p{Script=Latin}][\p{Script=Latin}'`.-]*$/u;

/**
 * Trims leading/trailing whitespace from an input string, returning `""` if empty.
 *
 * @param value Target string
 * @returns Normalized string
 */
function trim(value?: string): string {
  return String(value || '').trim();
}

/**
 * Strips punctuation and symbols from both ends of a token.
 * Retains characters valid for names (letters, digits, `_`).
 *
 * @param token Token to clean
 * @returns Formatted token
 */
function cleanToken(token: string): string {
  return token.replace(/^[^\p{L}\p{N}_]+|[^\p{L}\p{N}_]+$/gu, '');
}

/**
 * Splits a full name string by half-width/full-width whitespace and converts it into a usable array of tokens.
 *
 * @param fullName Full name string
 * @returns Array of tokens
 */
function tokenizeName(fullName: string): string[] {
  return fullName
    .split(/[\s\u3000]+/u)
    .map(cleanToken)
    .filter(Boolean);
}

/**
 * Determines whether a string contains CJK characters (Japanese, Kanji, etc.).
 *
 * @param value String to test
 * @returns `true` if it contains CJK characters
 */
function containsCjk(value: string): boolean {
  return CJK_CHAR_RE.test(value);
}

/**
 * Determines whether a list of tokens consists of Latin script characters.
 *
 * @param tokens Array of name tokens
 * @returns `true` if considered Latin tokens
 */
function looksLatinTokens(tokens: string[]): boolean {
  return tokens.length > 0 && tokens.every((token) => LATIN_TOKEN_RE.test(token));
}

/**
 * Performs XML escaping for embedding within SVG strings.
 *
 * @param value Raw string
 * @returns Escaped string
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converts a UTF-8 string to Base64.
 * Uses `Buffer` or `TextEncoder + btoa` depending on the runtime environment.
 *
 * @param value Target string
 * @returns Base64 encoded string
 */
function encodeBase64Utf8(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64');
  }

  if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  throw new Error('Base64 encoding is not available in this runtime');
}

/**
 * Determines whether the Canvas API is available in the current runtime environment.
 *
 * @returns `true` if available
 */
function canUseCanvas(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function';
}

/**
 * Clamps the character length of a given string for use as a stamp face label.
 *
 * @param value Original string
 * @param maxChars Maximum character count
 * @returns Clamped string
 */
function clampSealLabel(value: string, maxChars: number): string {
  const safeMax = Number.isFinite(maxChars) ? Math.max(1, Math.min(6, Math.floor(maxChars))) : 3;
  return Array.from(value).slice(0, safeMax).join('');
}

/**
 * Resolves the label (typically family name) to display on a fallback seal.
 *
 * Priority order:
 * 1. `options.sealLabel`
 * 2. `options.familyName`
 * 3. `fullName` parsing (applying `nameOrder` rule)
 *
 * When `nameOrder: "auto"`:
 * - Names containing CJK characters: use first token
 * - 2 or more Latin words: use last token
 * - Otherwise: use first token
 *
 * @param fullName Full name (optional)
 * @param options Label resolution options
 * @returns Stamp label (`""` if empty)
 *
 * @example
 * ```ts
 * resolveSealLabel("山田 太郎") // => "山田"
 * resolveSealLabel("John Smith") // => "Smith"
 * resolveSealLabel("TANAKA", { maxChars: 2 }) // => "TA"
 * ```
 */
export function resolveSealLabel(fullName?: string, options: SealLabelOptions = {}): string {
  const maxChars = options.maxChars ?? 3;

  const explicit = trim(options.sealLabel);
  if (explicit) return clampSealLabel(explicit, maxChars);

  const familyName = trim(options.familyName);
  if (familyName) return clampSealLabel(familyName, maxChars);

  const sourceName = trim(fullName);
  if (!sourceName) return '';

  // For comma-separated names like "Smith, John", prioritize the first element.
  if (sourceName.includes(',')) {
    const beforeComma = cleanToken(sourceName.split(',')[0] || '');
    if (beforeComma) return clampSealLabel(beforeComma, maxChars);
  }

  const tokens = tokenizeName(sourceName);
  if (tokens.length === 0) return '';
  if (tokens.length === 1) return clampSealLabel(tokens[0], maxChars);

  const nameOrder = options.nameOrder ?? 'auto';
  if (nameOrder === 'family-first') return clampSealLabel(tokens[0], maxChars);
  if (nameOrder === 'given-first') return clampSealLabel(tokens[tokens.length - 1], maxChars);

  if (containsCjk(sourceName)) {
    return clampSealLabel(tokens[0], maxChars);
  }

  if (looksLatinTokens(tokens)) {
    return clampSealLabel(tokens[tokens.length - 1], maxChars);
  }

  return clampSealLabel(tokens[0], maxChars);
}

/**
 * Generates an SVG string for a fallback stamp seal.
 *
 * Can be used as a fallback when no saved stamp image is available.
 * Output is a simple red circular seal with vertically stacked characters.
 *
 * @param fullName Full name (optional)
 * @param options Generation options
 * @returns SVG string, or `null` if the seal face label cannot be resolved
 *
 * @example
 * ```ts
 * const svg = createFallbackSealSvg("山田 太郎");
 * ```
 */
export function createFallbackSealSvg(
  fullName?: string,
  options: FallbackSealOptions = {},
): string | null {
  const sealLabel = resolveSealLabel(fullName, options);
  if (!sealLabel) return null;

  const size = Number.isFinite(options.size)
    ? Math.max(64, Math.floor(options.size as number))
    : 256;
  const width = Number.isFinite(options.width)
    ? Math.max(64, Math.floor(options.width as number))
    : size;
  const height = Number.isFinite(options.height)
    ? Math.max(64, Math.floor(options.height as number))
    : size;
  const strokeWidth = Number.isFinite(options.strokeWidth)
    ? Math.max(1, Number(options.strokeWidth))
    : 8;

  const circleColor = options.circleColor || '#c62828';
  const textColor = options.textColor || '#c62828';
  const fontFamily = options.fontFamily || 'sans-serif';
  const fontWeight = options.fontWeight ?? 700;
  const radius = Math.max(8, Math.min(width, height) / 2 - 12);
  const centerX = width / 2;
  const centerY = height / 2;

  const chars = Array.from(sealLabel);
  const lineCount = chars.length;
  const drawableHeight = height * 0.62;
  const lineGap = lineCount <= 1 ? 0 : drawableHeight / (lineCount - 1);
  const startY = centerY - ((lineCount - 1) * lineGap) / 2;
  const fontSize = Math.max(
    28,
    Math.min(
      Math.floor(Math.min(width, height) / (lineCount === 1 ? 2.2 : 3.3)),
      Math.floor(width * 0.45),
    ),
  );

  const backgroundRect = options.backgroundColor
    ? `<rect x="0" y="0" width="${width}" height="${height}" fill="${escapeXml(options.backgroundColor)}" />`
    : '';

  const textNodes = chars
    .map((char, index) => {
      const y = startY + lineGap * index;
      return `<text x="${centerX.toFixed(2)}" y="${y.toFixed(2)}">${escapeXml(char)}</text>`;
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    backgroundRect,
    `<circle cx="${centerX.toFixed(2)}" cy="${centerY.toFixed(2)}" r="${radius.toFixed(2)}" fill="none" stroke="${escapeXml(circleColor)}" stroke-width="${strokeWidth}" />`,
    `<g fill="${escapeXml(textColor)}" font-family="${escapeXml(fontFamily)}" font-weight="${escapeXml(String(fontWeight))}" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">`,
    textNodes,
    '</g>',
    '</svg>',
  ].join('');
}

/**
 * Generates a PNG Data URL for a fallback stamp seal.
 * Returns `null` in environments where the Canvas API is unavailable.
 *
 * @param fullName Full name (optional)
 * @param options Generation options
 * @returns PNG Data URL, or `null` if generation fails
 */
export function createFallbackSealPngDataUrl(
  fullName?: string,
  options: FallbackSealOptions = {},
): string | null {
  if (!canUseCanvas()) return null;

  const sealLabel = resolveSealLabel(fullName, options);
  if (!sealLabel) return null;

  const size = Number.isFinite(options.size)
    ? Math.max(64, Math.floor(options.size as number))
    : 256;
  const width = Number.isFinite(options.width)
    ? Math.max(64, Math.floor(options.width as number))
    : size;
  const height = Number.isFinite(options.height)
    ? Math.max(64, Math.floor(options.height as number))
    : size;
  const strokeWidth = Number.isFinite(options.strokeWidth)
    ? Math.max(1, Number(options.strokeWidth))
    : 8;

  const circleColor = options.circleColor || '#c62828';
  const textColor = options.textColor || '#c62828';
  const fontFamily = options.fontFamily || 'sans-serif';
  const fontWeight = options.fontWeight ?? 700;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  if (options.backgroundColor) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.strokeStyle = circleColor;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) / 2 - 12, 0, Math.PI * 2);
  ctx.stroke();

  const chars = Array.from(sealLabel);
  const lineCount = chars.length;
  const drawableHeight = height * 0.62;
  const lineGap = lineCount <= 1 ? 0 : drawableHeight / (lineCount - 1);
  const startY = height / 2 - ((lineCount - 1) * lineGap) / 2;
  const fontSize = Math.max(
    28,
    Math.min(
      Math.floor(Math.min(width, height) / (lineCount === 1 ? 2.2 : 3.3)),
      Math.floor(width * 0.45),
    ),
  );

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

  chars.forEach((char, index) => {
    const y = startY + lineGap * index;
    ctx.fillText(char, width / 2, y);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Generates a Data URL for a fallback stamp seal.
 *
 * Behavior of `outputFormat`:
 * - `auto` (default): PNG when Canvas is available, otherwise SVG
 * - `png`: PNG only (`null` if Canvas is unavailable)
 * - `svg`: SVG only
 *
 * @param fullName Full name (optional)
 * @param options Generation options
 * @returns Data URL, or `null` if the seal face label cannot be resolved
 *
 * @example
 * ```ts
 * const dataUrl = createFallbackSealDataUrl("John Smith", { nameOrder: "given-first" });
 * ```
 */
export function createFallbackSealDataUrl(
  fullName?: string,
  options: FallbackSealOptions = {},
): string | null {
  const outputFormat = options.outputFormat ?? 'auto';

  if (outputFormat !== 'svg') {
    const png = createFallbackSealPngDataUrl(fullName, options);
    if (png) return png;
    if (outputFormat === 'png') return null;
  }

  const svg = createFallbackSealSvg(fullName, options);
  if (!svg) return null;
  return `data:image/svg+xml;base64,${encodeBase64Utf8(svg)}`;
}
