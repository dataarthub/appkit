/**
 * Theme definition for PDF business documents
 */

export interface PdfTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderColor: string;
  backgroundColor: string;
  tableHeaderBg: string;
  tableRowAltBg: string;
  textColor: string;
  mutedTextColor: string;
  fontFamily: string;
  fontSize: {
    xs: number;
    sm: number;
    base: number;
    md: number;
    lg: number;
    xl: number;
    title: number;
  };
  spacing: {
    pagePadding: number;
    sectionGap: number;
    itemGap: number;
  };
}

export const defaultPdfTheme: PdfTheme = {
  primaryColor: '#1e293b',
  secondaryColor: '#475569',
  accentColor: '#2563eb',
  borderColor: '#cbd5e1',
  backgroundColor: '#ffffff',
  tableHeaderBg: '#f1f5f9',
  tableRowAltBg: '#f8fafc',
  textColor: '#0f172a',
  mutedTextColor: '#64748b',
  fontFamily: 'sans-serif',
  fontSize: {
    xs: 7,
    sm: 8,
    base: 9,
    md: 10,
    lg: 12,
    xl: 14,
    title: 18,
  },
  spacing: {
    pagePadding: 30,
    sectionGap: 14,
    itemGap: 6,
  },
};

export type PartialPdfTheme = Partial<Omit<PdfTheme, 'fontSize' | 'spacing'>> & {
  fontSize?: Partial<PdfTheme['fontSize']>;
  spacing?: Partial<PdfTheme['spacing']>;
};

/**
 * Merges the default theme with partial custom theme settings.
 */
export function mergePdfTheme(customTheme?: PartialPdfTheme): PdfTheme {
  if (!customTheme) return defaultPdfTheme;
  return {
    ...defaultPdfTheme,
    ...customTheme,
    fontSize: {
      ...defaultPdfTheme.fontSize,
      ...customTheme.fontSize,
    },
    spacing: {
      ...defaultPdfTheme.spacing,
      ...customTheme.spacing,
    },
  };
}
