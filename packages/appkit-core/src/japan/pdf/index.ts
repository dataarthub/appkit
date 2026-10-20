import { mergePdfTheme as merge } from "../../data/pdf";
import type { PartialPdfTheme, PdfTheme } from "../../data/pdf";
export * from "../../data/pdf";
export * from './business-document-presets';
export * from './legal-document-pdfmake';
/**
 * Japanese font name preset; the application must supply/embed the actual licensed font.
 *
 * @see {@link mergePdfTheme} for a regional theme example.
 */
export const defaultPdfTheme: PdfTheme = merge({ fontFamily: 'NotoSansJP' });
/**
 * Merges PDF theme overrides while preserving the Japanese font-family default.
 *
 * @param theme - Optional partial theme; omitted returns the shared defaultPdfTheme reference.
 * @returns A merged theme for supplied overrides, otherwise the shared Japanese default.
 * @remarks The host must supply/embed the named font in its PDF renderer; this function does not load font files.
 * @example
 * ```typescript
 * import { mergePdfTheme } from '@alneas/appkit-core/japan/pdf';
 *
 * console.log(mergePdfTheme({ fontFamily: 'HostJapaneseFont' }));
 * ```
 */
export function mergePdfTheme(theme?: PartialPdfTheme): PdfTheme { return theme ? merge({ ...theme, fontFamily: theme.fontFamily ?? defaultPdfTheme.fontFamily }) : defaultPdfTheme; }

export * from './stamp';
