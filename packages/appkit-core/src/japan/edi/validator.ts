import type { EdiDocument, VatexCategoryId } from './types';
import { PEPPOL_PARTY_ID_SCHEMES } from './types';

/**
 * One diagnostic from the represented-field Japanese EDI validation subset.
 *
 * @see {@link validateEdiDocument} for validation usage and scope.
 */
export interface EdiValidationIssue {

  /** Diagnostic importance: error prevents valid=true; warning/info do not. */
  severity: 'error' | 'warning' | 'info';

  /** Stable rule identifier for programmatic diagnostic handling. */
  code: string;

  /** JSON-style path to the field that triggered the diagnostic. */
  path: string;

  /** Human-readable Japanese diagnostic text. */
  message: string;
}

/**
 * Validation outcome for the represented fields, without full JP PINT certification.
 *
 * @see {@link validateEdiDocument} for validation usage and scope.
 */
export interface EdiValidationResult {

  /** True when no error-severity diagnostic was produced; warnings may remain. */
  valid: boolean;

  /** Collected diagnostics in validation order; empty when no issues were detected. */
  issues: EdiValidationIssue[];
}

// JP PINT 1.1.3 aligned tax-category list (not the VAT exemption-reason list).
const VALID_VATEX_CATEGORIES: VatexCategoryId[] = ['S', 'AA', 'E', 'G', 'O'];

const VALID_PINT_DOC_TYPE_CODES: Record<string, string[]> = {
  Invoice: ['380', '384', '389'],
  CreditNote: ['381'],
  PurchaseOrder: [],
  DespatchAdvice: [],
  RemittanceAdvice: [],
  Quotation: [],
};

const VALID_ICD_SCHEMES: string[] = Object.values(PEPPOL_PARTY_ID_SCHEMES);

function addIssue(issues: EdiValidationIssue[], severity: 'error' | 'warning' | 'info', code: string, path: string, message: string) {
  issues.push({ severity, code, path, message });
}

/**
 * Checks the represented Japanese invoice fields only. This is not full JP PINT/Schematron validation.
 * Tax identifier scheme VAT is distinct from party/endpoint identification. See docs for the exact subset.
 * @param doc - EDI document to validate
 * @returns Validation result containing a valid flag and a list of issues
 *
 * @example
 * ```typescript
 * import { validateEdiDocument } from '@alneas/appkit-core/japan/edi';
 *
 * export function convert(doc: Parameters<typeof validateEdiDocument>[0]) {
 *   return validateEdiDocument(doc);
 * }
 * ```
 */
export function validateEdiDocument(doc: EdiDocument): EdiValidationResult {
  const issues: EdiValidationIssue[] = [];

  validateHeader(doc, issues);
  validateParties(doc, issues);
  validateReferences(doc, issues);
  validateLines(doc, issues);
  validateFinancials(doc, issues);
  validateExtensions(doc, issues);

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  };
}

function validateHeader(doc: EdiDocument, issues: EdiValidationIssue[]) {
  if (!doc.id) {
    addIssue(issues, 'error', 'PINT-001', '$.id', '文書番号 (id) は必須です');
  }

  if (!doc.issue_date) {
    addIssue(issues, 'error', 'PINT-002', '$.issue_date', '発行日 (issue_date) は必須です');
  }

  if (!doc.currency) {
    addIssue(issues, 'error', 'PINT-003', '$.currency', '通貨コード (currency) は必須です');
  }

  if (!doc.schema_version) {
    addIssue(issues, 'error', 'PINT-004', '$.schema_version', 'スキーマバージョン (schema_version) は必須です');
  }

  const validCodes = VALID_PINT_DOC_TYPE_CODES[doc.doc_type];
  if (validCodes && validCodes.length > 0) {
    if (!doc.doc_type_code || !validCodes.includes(doc.doc_type_code)) {
      addIssue(
        issues,
        'error',
        'PINT-005',
        '$.doc_type_code',
        `${doc.doc_type} の doc_type_code は ${validCodes.join('/')} のいずれかである必要があります (現在: ${doc.doc_type_code})`,
      );
    }
  }
}

function validateParties(doc: EdiDocument, issues: EdiValidationIssue[]) {
  if (!doc.supplier) {
    addIssue(issues, 'error', 'PINT-010', '$.supplier', '売手情報 (supplier) は必須です');
    return;
  }

  if (!doc.supplier.id || !doc.supplier.id.scheme || !doc.supplier.id.value) {
    addIssue(issues, 'error', 'PINT-011', '$.supplier.id', '売手ID (supplier.id) は scheme + value が必要です');
  }

  if (doc.supplier.id && !VALID_ICD_SCHEMES.includes(doc.supplier.id.scheme)) {
    addIssue(
      issues,
      'warning',
      'PINT-012',
      '$.supplier.id.scheme',
      `売手ID scheme は Peppol ICD (${VALID_ICD_SCHEMES.join(', ')}) を推奨します (現在: ${doc.supplier.id.scheme})`,
    );
  }

  if (doc.doc_type === 'Invoice' || doc.doc_type === 'CreditNote') {
    if (!doc.supplier.tax_id || doc.supplier.tax_id.scheme !== 'VAT' || !/^T[0-9]{13}$/.test(doc.supplier.tax_id.value)) {
      addIssue(
        issues,
        'error',
        'PINT-013',
        '$.supplier.tax_id',
        '適格請求書/返還インボイスには supplier.tax_id (scheme=VAT, T+13桁) が必要です（限定した項目検査）',
      );
    }
  }

  if (!doc.buyer) {
    addIssue(issues, 'error', 'PINT-014', '$.buyer', '買手情報 (buyer) は必須です');
  }
}

function validateReferences(doc: EdiDocument, issues: EdiValidationIssue[]) {
  if (doc.doc_type === 'CreditNote') {
    const cn = doc as typeof doc & { references: { billing_reference?: { id?: string } } };
    if (!cn.references?.billing_reference?.id) {
      addIssue(
        issues,
        'error',
        'PINT-020',
        '$.references.billing_reference.id',
        '返還インボイス (CreditNote) には references.billing_reference.id (元請求書番号) が必須です',
      );
    }
  }

  if (doc.doc_type === 'DespatchAdvice') {
    const da = doc as typeof doc & { references?: { order_reference?: string } };
    if (!da.references?.order_reference) {
      addIssue(
        issues,
        'error',
        'PINT-021',
        '$.references.order_reference',
        '納品書 (DespatchAdvice) には references.order_reference (発注書番号) が必須です',
      );
    }
  }
}

function validateLines(doc: EdiDocument, issues: EdiValidationIssue[]) {
  if (!('lines' in doc)) return;

  for (const [index, line] of (doc as { lines: Array<{ line_id?: string; quantity?: number; unit_price?: number; net_amount?: number }> }).lines.entries()) {
    const prefix = `$.lines[${index}]`;

    if (!line.line_id) {
      addIssue(issues, 'error', 'PINT-030', `${prefix}.line_id`, '明細行ID (line_id) は必須です');
    }

    if (!line.quantity || line.quantity <= 0) {
      addIssue(issues, 'warning', 'PINT-031', `${prefix}.quantity`, `数量が0または未設定です (${line.quantity})`);
    }

    if (!line.unit_price || line.unit_price < 0) {
      addIssue(issues, 'warning', 'PINT-032', `${prefix}.unit_price`, `単価が未設定です (${line.unit_price})`);
    }
  }
}

function validateFinancials(doc: EdiDocument, issues: EdiValidationIssue[]) {
  if (!('financials' in doc) || !doc.financials) return;

  const f = doc.financials as {
    tax_total?: {
      tax_amount?: { value?: number; currency?: string };
      tax_subtotals?: Array<{
        taxable_amount?: { value?: number };
        tax_amount?: { value?: number };
        tax_category?: { id?: string; percent?: number; tax_scheme?: string };
      }>;
    };
    tax_inclusive_amount?: { value?: number };
    payable_amount?: { value?: number };
  };

  if (f.tax_total) {
    if (!f.tax_total.tax_amount || f.tax_total.tax_amount.value === undefined) {
      addIssue(issues, 'error', 'PINT-040', '$.financials.tax_total.tax_amount', '総税額 (tax_amount) は必須です');
    }

    if (f.tax_total.tax_subtotals) {
      const subtotalSum = f.tax_total.tax_subtotals.reduce((sum, st) => sum + (st.tax_amount?.value ?? 0), 0);
      const declaredTotal = f.tax_total.tax_amount?.value ?? 0;

      if (Math.abs(subtotalSum - declaredTotal) > 0.01) {
        addIssue(
          issues,
          'error',
          'PINT-041',
          '$.financials.tax_total.tax_amount',
          `税サブトータルの合計 (${subtotalSum}) が宣言された総税額 (${declaredTotal}) と一致しません`,
        );
      }

      for (const [index, st] of f.tax_total.tax_subtotals.entries()) {
        const stPrefix = `$.financials.tax_total.tax_subtotals[${index}]`;

        if (!st.tax_category?.id || !VALID_VATEX_CATEGORIES.includes(st.tax_category.id as VatexCategoryId)) {
          addIssue(
            issues,
            'error',
            'PINT-042',
            `${stPrefix}.tax_category.id`,
            `税率区分コードは VATEX (${VALID_VATEX_CATEGORIES.join('/')}) のいずれかである必要があります (現在: ${st.tax_category?.id})`,
          );
        }

        if (!Number.isFinite(st.tax_category?.percent) || (st.tax_category?.percent ?? -1) < 0) {
          addIssue(
            issues,
            'error',
            'PINT-043',
            `${stPrefix}.tax_category.percent`,
            '税率 (percent) は必須です (非課税の場合は0)',
          );
        }

        if (st.tax_category?.id !== 'E' && (st.tax_category?.percent ?? 0) === 0) {
          addIssue(
            issues,
            'warning',
            'PINT-044',
            `${stPrefix}.tax_category.percent`,
            `税率区分 ${st.tax_category?.id} の税率が0%です。非課税(E)の場合は id=E を使用してください`,
          );
        }
      }
    }

    if (!Number.isFinite(f.tax_inclusive_amount?.value)) {
      addIssue(issues, 'error', 'PINT-045', '$.financials.tax_inclusive_amount', '税込合計 (tax_inclusive_amount) は必須です');
    }

    if (!Number.isFinite(f.payable_amount?.value)) {
      addIssue(issues, 'error', 'PINT-046', '$.financials.payable_amount', '支払請求額 (payable_amount) は必須です');
    }
  }
}

function validateExtensions(doc: EdiDocument, issues: EdiValidationIssue[]) {
  if (!doc.extensions || doc.extensions.length === 0) return;

  for (const [index, ext] of doc.extensions.entries()) {
    const prefix = `$.extensions[${index}]`;

    if (!ext.namespace) {
      addIssue(issues, 'error', 'PINT-050', `${prefix}.namespace`, '拡張の namespace は必須です');
    }

    if (!ext.extension_id) {
      addIssue(issues, 'error', 'PINT-051', `${prefix}.extension_id`, '拡張の extension_id は必須です');
    }

    if (!ext.version) {
      addIssue(issues, 'warning', 'PINT-052', `${prefix}.version`, '拡張のバージョン指定を推奨します');
    }
  }
}
