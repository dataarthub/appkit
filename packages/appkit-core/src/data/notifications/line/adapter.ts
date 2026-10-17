import { defaultNotificationMessages, type NotificationMessages } from '../messages';
/**
 * LINE Notification Adapter
 * Implements the NotificationAdapter interface for LINE
 */

import type {
  NotificationAdapter,
  NotificationPayload,
  PaymentDuePayload,
  ApprovalPayload,
  InventoryAlertPayload,
} from '../types';
import { LineClient } from './client';

/**
 * Get base URL for links
 */
function getBaseUrl(): string {
  // In production, use env variable
  return typeof window !== 'undefined'
    ? window.location.origin
    : process.env.PUBLIC_URL || 'http://localhost:3000';
}

/**
 * LINE Notification Adapter
 */
export class LineNotificationAdapter implements NotificationAdapter {
  /**
   * Creates a new instance of LineNotificationAdapter.
   * @param client An instance of LineClient
   */
  constructor(private client: LineClient, private messages: Readonly<NotificationMessages> = defaultNotificationMessages) {}

  /**
   * Sends a generic notification to the specified LINE user.
   * @param userId LINE user ID
   * @param payload Notification data payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    const message = LineClient.createNotificationMessage({
      title: payload.title,
      body: payload.body,
      link: payload.link,
    });

    return this.client.pushMessage(userId, [message]);
  }

  /**
   * Sends a payment due date notification to the specified LINE user.
   * @param userId LINE user ID
   * @param payload Payment due date notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendPaymentDueNotification(userId: string, payload: PaymentDuePayload): Promise<boolean> {
    const message = LineClient.createNotificationMessage({
      title: this.messages.paymentTitle,
      body: this.messages.paymentBody(payload),
      link: {
        label: this.messages.invoiceLabel,
        url: `${getBaseUrl()}/invoices/${payload.invoiceId}`,
      },
    });

    return this.client.pushMessage(userId, [message]);
  }

  /**
   * Sends an approval request notification in card format (Flex Message) to the specified LINE user.
   * @param userId LINE user ID
   * @param payload Approval request notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendApprovalNotification(userId: string, payload: ApprovalPayload): Promise<boolean> {
    const message = LineClient.createApprovalMessage({
      title: `📋 ${payload.title}`,
      description: payload.description,
      approveLabel: this.messages.approveLabel,
      rejectLabel: this.messages.rejectLabel,
      approveData: `action=approve&type=${payload.type}&id=${payload.id}`,
      rejectData: `action=reject&type=${payload.type}&id=${payload.id}`,
    });

    return this.client.pushMessage(userId, [message]);
  }

  /**
   * Sends an inventory alert notification to the specified LINE user.
   * @param userId LINE user ID
   * @param payload Inventory alert notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendInventoryAlert(userId: string, payload: InventoryAlertPayload): Promise<boolean> {
    const message = LineClient.createNotificationMessage({
      title: this.messages.inventoryTitle,
      body: this.messages.inventoryBody(payload),
      link: {
        label: this.messages.productLabel,
        url: `${getBaseUrl()}/products/${payload.productId}`,
      },
    });

    return this.client.pushMessage(userId, [message]);
  }

  /**
   * Sends a generic notification to multiple LINE users concurrently.
   * @param userIds Array of LINE user IDs
   * @param payload Notification data payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async multicast(userIds: string[], payload: NotificationPayload): Promise<boolean> {
    const message = LineClient.createNotificationMessage({
      title: payload.title,
      body: payload.body,
      link: payload.link,
    });

    return this.client.multicast(userIds, [message]);
  }
}
