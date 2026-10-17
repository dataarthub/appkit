import { mergePdfTheme as merge } from "../../data/pdf";
import type { PartialPdfTheme, PdfTheme } from "../../data/pdf";
export * from "../../data/pdf";
export * from './business-document-presets';
export * from './legal-document-pdfmake';
/** Japanese font name preset; the application must supply/embed the actual licensed font. */
export const defaultPdfTheme: PdfTheme = merge({ fontFamily: 'NotoSansJP' });
export function mergePdfTheme(theme?: PartialPdfTheme): PdfTheme { return theme ? merge({ ...theme, fontFamily: theme.fontFamily ?? defaultPdfTheme.fontFamily }) : defaultPdfTheme; }

export * from './stamp';
