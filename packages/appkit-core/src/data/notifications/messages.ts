import type { PaymentDuePayload, InventoryAlertPayload } from './types';

/** Presentation policy; transport and workflow logic do not select a region/currency. */
export interface NotificationMessages {
  paymentTitle: string;
  paymentText: string;
  paymentBody(payload: PaymentDuePayload): string;
  invoiceLabel: string;
  inventoryTitle: string;
  inventoryText: string;
  inventoryBody(payload: InventoryAlertPayload): string;
  productLabel: string;
  approveLabel: string;
  rejectLabel: string;
}

/** Neutral language defaults; amounts have no implicit currency. Supply a business policy. */
export const defaultNotificationMessages: Readonly<NotificationMessages> = Object.freeze({
  paymentTitle: 'Payment due',
  paymentText: 'Payment due',
  paymentBody: (payload: PaymentDuePayload) => `Payment to ${payload.partnerName}: ${payload.amount}, due ${payload.dueDate}`,
  invoiceLabel: 'View invoice',
  inventoryTitle: 'Inventory alert',
  inventoryText: 'Inventory alert',
  inventoryBody: (payload: InventoryAlertPayload) => `${payload.productName}: ${payload.currentStock} remaining (threshold: ${payload.threshold})`,
  productLabel: 'View product',
  approveLabel: 'Approve',
  rejectLabel: 'Reject',
});
