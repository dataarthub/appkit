/**
 * Common Notification Types
 * Shared interfaces for all notification adapters (LINE, Slack, Google Chat)
 */

/**
 * Common notification payload structure
 */
export interface NotificationPayload {
  title: string;
  body: string;
  link?: {
    label: string;
    url: string;
  };
}

/**
 * Approval request payload
 */
export interface ApprovalPayload {
  title: string;
  description: string;
  type: string; // 'expense', 'purchase', etc.
  id: string;
}

/**
 * Payment due notification payload
 */
export interface PaymentDuePayload {
  partnerName: string;
  amount: number;
  dueDate: string;
  invoiceId: string;
}

/**
 * Inventory alert payload
 */
export interface InventoryAlertPayload {
  productName: string;
  currentStock: number;
  threshold: number;
  productId: string;
}

/**
 * Base notification adapter interface
 * All notification providers (LINE, Slack, Google Chat) implement this
 */
export interface NotificationAdapter {
  /**
   * Send a general notification
   */
  sendNotification(userId: string, payload: NotificationPayload): Promise<boolean>;

  /**
   * Send payment due reminder
   */
  sendPaymentDueNotification(userId: string, payload: PaymentDuePayload): Promise<boolean>;

  /**
   * Send approval request with action buttons
   */
  sendApprovalNotification(userId: string, payload: ApprovalPayload): Promise<boolean>;

  /**
   * Send inventory alert
   */
  sendInventoryAlert(userId: string, payload: InventoryAlertPayload): Promise<boolean>;

  /**
   * Send to multiple users (multicast)
   */
  multicast(userIds: string[], payload: NotificationPayload): Promise<boolean>;
}

/**
 * Notification provider type
 */
export type NotificationProvider = 'line' | 'slack' | 'google-chat';

/**
 * Provider configuration
 */
export interface ProviderConfig {
  provider: NotificationProvider;
  enabled: boolean;
  config: Record<string, unknown>;
}
