/** Only the fields used to format a reminder; structurally compatible with engine payloads. */
export interface JapanesePaymentReminder { partnerName: string; amount: number; dueDate: string; invoiceId?: string }
export interface JapaneseInventoryReminder { productName: string; currentStock: number; threshold: number; productId?: string }

/** Japanese business reminder defaults, including legacy yen display. */
export const japaneseNotificationMessages = Object.freeze({
  paymentTitle: '💰 支払期日のお知らせ',
  paymentText: '支払期日のお知らせ',
  paymentBody: (payload: JapanesePaymentReminder) => `${payload.partnerName}への支払い ¥${payload.amount.toLocaleString()} の期日が近づいています（${payload.dueDate}）`,
  invoiceLabel: '請求書を確認',
  inventoryTitle: '📦 在庫アラート',
  inventoryText: '在庫アラート',
  inventoryBody: (payload: JapaneseInventoryReminder) => `「${payload.productName}」の在庫が残り ${payload.currentStock} 個です（しきい値: ${payload.threshold}）`,
  productLabel: '商品を確認',
  approveLabel: '承認',
  rejectLabel: '却下',
});
