/**
 * Inputs used to format a Japanese payment reminder with yen display.
 *
 * @see {@link japaneseNotificationMessages} for message formatting usage.
 */
export interface JapanesePaymentReminder {
  /** Payee display name. */
  partnerName: string;
  /** Payment amount displayed with a yen prefix; no conversion or validation. */
  amount: number;
  /** Due-date text interpolated verbatim. */
  dueDate: string;
  /** Optional host invoice reference; not used by the built-in text formatter. */
  invoiceId?: string }
/**
 * Inputs used to format a Japanese low-stock reminder.
 *
 * @see {@link japaneseNotificationMessages} for message formatting usage.
 */
export interface JapaneseInventoryReminder {
  /** Product display name. */
  productName: string;
  /** Current remaining stock count displayed verbatim. */
  currentStock: number;
  /** Low-stock threshold displayed verbatim. */
  threshold: number;
  /** Optional host product reference; not used by the built-in text formatter. */
  productId?: string }

/**
 * Japanese business reminder defaults, including legacy yen display.
 *
 * @remarks These are strings/formatters only; the host owns notification delivery. Amount formatting uses the runtime default locale with a yen prefix, not currency conversion.
 *
 * @example
 * ```typescript
 * import { japaneseNotificationMessages } from '@alneas/appkit-core/japan/notifications';
 *
 * console.log(japaneseNotificationMessages.paymentBody({ partnerName: 'Example Supplier', amount: 1000, dueDate: '2026-10-31' }));
 * console.log(japaneseNotificationMessages.inventoryBody({ productName: 'Paper', currentStock: 2, threshold: 5 }));
 * ```
 */
export const japaneseNotificationMessages = Object.freeze({

  /** Japanese payment reminder title including an emoji. */
  paymentTitle: '💰 支払期日のお知らせ',

  /** Plain Japanese payment reminder heading. */
  paymentText: '支払期日のお知らせ',

  /**
   * Formats payment reminder body text in Japanese.
   *
   * @param payload - Reminder values interpolated synchronously; no lookup or sending occurs.
   * @returns Japanese message text with the supplied amounts/dates or stock counts.
   *
   * @example
   * ```typescript
   * import { japaneseNotificationMessages } from '@alneas/appkit-core/japan/notifications';
   *
   * console.log(japaneseNotificationMessages.paymentBody({ partnerName: 'Example Supplier', amount: 1000, dueDate: '2026-10-31' }));
   * console.log(japaneseNotificationMessages.inventoryBody({ productName: 'Paper', currentStock: 2, threshold: 5 }));
   * ```
   */
  paymentBody: (payload: JapanesePaymentReminder) => `${payload.partnerName}への支払い ¥${payload.amount.toLocaleString()} の期日が近づいています（${payload.dueDate}）`,

  /** Japanese action label for opening the invoice. */
  invoiceLabel: '請求書を確認',

  /** Japanese low-stock title including an emoji. */
  inventoryTitle: '📦 在庫アラート',

  /** Plain Japanese low-stock heading. */
  inventoryText: '在庫アラート',

  /**
   * Formats inventory reminder body text in Japanese.
   *
   * @param payload - Reminder values interpolated synchronously; no lookup or sending occurs.
   * @returns Japanese message text with the supplied amounts/dates or stock counts.
   *
   * @example
   * ```typescript
   * import { japaneseNotificationMessages } from '@alneas/appkit-core/japan/notifications';
   *
   * console.log(japaneseNotificationMessages.paymentBody({ partnerName: 'Example Supplier', amount: 1000, dueDate: '2026-10-31' }));
   * console.log(japaneseNotificationMessages.inventoryBody({ productName: 'Paper', currentStock: 2, threshold: 5 }));
   * ```
   */
  inventoryBody: (payload: JapaneseInventoryReminder) => `「${payload.productName}」の在庫が残り ${payload.currentStock} 個です（しきい値: ${payload.threshold}）`,

  /** Japanese action label for opening the product. */
  productLabel: '商品を確認',

  /** Japanese approval-action label. */
  approveLabel: '承認',

  /** Japanese rejection-action label. */
  rejectLabel: '却下',
});
