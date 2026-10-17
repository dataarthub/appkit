import { defaultNotificationMessages, type NotificationMessages } from '../messages';
/**
 * Google Chat Notification Adapter
 * Implements the NotificationAdapter interface for Google Chat
 */

import type {
  NotificationAdapter,
  NotificationPayload,
  PaymentDuePayload,
  ApprovalPayload,
  InventoryAlertPayload,
} from '../types';
import { GoogleChatClient } from './client';

/**
 * Get base URL for links
 */
function getBaseUrl(): string {
  return typeof window !== 'undefined'
    ? window.location.origin
    : process.env.PUBLIC_URL || 'http://localhost:3000';
}

/**
 * Google Chat Notification Adapter
 * Note: spaceId is used as userId for Google Chat (space or DM)
 */
export class GoogleChatNotificationAdapter implements NotificationAdapter {
  /**
   * Creates a new instance of GoogleChatNotificationAdapter.
   * @param client An instance of GoogleChatClient
   */
  constructor(private client: GoogleChatClient, private messages: Readonly<NotificationMessages> = defaultNotificationMessages) {}

  /**
   * Sends a generic notification to the specified Google Chat space.
   * @param _spaceId Target space ID
   * @param payload Notification data payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendNotification(_spaceId: string, payload: NotificationPayload): Promise<boolean> {
    const card = GoogleChatClient.createNotificationCard({
      title: payload.title,
      body: payload.body,
      link: payload.link,
    });

    return this.client.sendWebhookMessage({
      text: payload.title,
      cards: [card],
    });
  }

  /**
   * Sends a payment due date notification.
   * @param _spaceId Target space ID
   * @param payload Payment due date notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendPaymentDueNotification(_spaceId: string, payload: PaymentDuePayload): Promise<boolean> {
    const card = GoogleChatClient.createNotificationCard({
      title: this.messages.paymentTitle,
      body: this.messages.paymentBody(payload),
      link: {
        label: this.messages.invoiceLabel,
        url: `${getBaseUrl()}/invoices/${payload.invoiceId}`,
      },
    });

    return this.client.sendWebhookMessage({
      text: this.messages.paymentText,
      cards: [card],
    });
  }

  /**
   * Sends an approval request notification in card format.
   * @param _spaceId Target space ID
   * @param payload Approval request notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendApprovalNotification(_spaceId: string, payload: ApprovalPayload): Promise<boolean> {
    const card = GoogleChatClient.createApprovalCard({
      title: `📋 ${payload.title}`,
      description: payload.description,
      approveLabel: this.messages.approveLabel,
      rejectLabel: this.messages.rejectLabel,
      approveAction: JSON.stringify({ action: 'approve', type: payload.type, id: payload.id }),
      rejectAction: JSON.stringify({ action: 'reject', type: payload.type, id: payload.id }),
    });

    return this.client.sendWebhookMessage({
      text: payload.title,
      cards: [card],
    });
  }

  /**
   * Sends an inventory alert notification when stock falls below a threshold.
   * @param _spaceId Target space ID
   * @param payload Inventory alert notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendInventoryAlert(_spaceId: string, payload: InventoryAlertPayload): Promise<boolean> {
    const card = GoogleChatClient.createNotificationCard({
      title: this.messages.inventoryTitle,
      body: this.messages.inventoryBody(payload),
      link: {
        label: this.messages.productLabel,
        url: `${getBaseUrl()}/products/${payload.productId}`,
      },
    });

    return this.client.sendWebhookMessage({
      text: this.messages.inventoryText,
      cards: [card],
    });
  }

  /**
   * Sends a generic notification to multiple spaces in batch.
   * @param _spaceIds Array of target space IDs
   * @param payload Notification data payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async multicast(_spaceIds: string[], payload: NotificationPayload): Promise<boolean> {
    // Note: Google Chat webhooks typically send to a single space
    // For multicast, you'd need to configure multiple webhooks or use the API
    // For now, we'll just send to the first configured webhook
    return this.sendNotification(_spaceIds[0] || '', payload);
  }
}
