import { defaultNotificationMessages, type NotificationMessages } from '../messages';
/**
 * Slack Notification Adapter
 * Implements the NotificationAdapter interface for Slack
 */

import type {
  NotificationAdapter,
  NotificationPayload,
  PaymentDuePayload,
  ApprovalPayload,
  InventoryAlertPayload,
} from '../types';
import { SlackClient } from './client';

/**
 * Get base URL for links
 */
function getBaseUrl(): string {
  return typeof window !== 'undefined'
    ? window.location.origin
    : process.env.PUBLIC_URL || 'http://localhost:3000';
}

/**
 * Slack Notification Adapter
 */
export class SlackNotificationAdapter implements NotificationAdapter {
  /**
   * Creates a new instance of SlackNotificationAdapter.
   * @param client An instance of SlackClient
   */
  constructor(private client: SlackClient, private messages: Readonly<NotificationMessages> = defaultNotificationMessages) {}

  /**
   * Sends a generic notification to the specified Slack channel.
   * @param channelId Target channel ID
   * @param payload Notification data payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendNotification(channelId: string, payload: NotificationPayload): Promise<boolean> {
    const blocks = SlackClient.createNotificationBlocks({
      title: payload.title,
      body: payload.body,
      link: payload.link,
    });

    return this.client.postMessage(channelId, {
      text: payload.title,
      blocks,
    });
  }

  /**
   * Sends a payment due date notification to the specified Slack channel.
   * @param channelId Target channel ID
   * @param payload Payment due date notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendPaymentDueNotification(
    channelId: string,
    payload: PaymentDuePayload,
  ): Promise<boolean> {
    const blocks = SlackClient.createNotificationBlocks({
      title: this.messages.paymentTitle,
      body: this.messages.paymentBody(payload),
      link: {
        label: this.messages.invoiceLabel,
        url: `${getBaseUrl()}/invoices/${payload.invoiceId}`,
      },
    });

    return this.client.postMessage(channelId, {
      text: this.messages.paymentText,
      blocks,
    });
  }

  /**
   * Sends an approval request notification with interactive buttons in block format to the specified Slack channel.
   * @param channelId Target channel ID
   * @param payload Approval request notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendApprovalNotification(channelId: string, payload: ApprovalPayload): Promise<boolean> {
    const blocks = SlackClient.createApprovalBlocks({
      title: `📋 ${payload.title}`,
      description: payload.description,
      approveLabel: this.messages.approveLabel,
      rejectLabel: this.messages.rejectLabel,
      approveValue: JSON.stringify({ action: 'approve', type: payload.type, id: payload.id }),
      rejectValue: JSON.stringify({ action: 'reject', type: payload.type, id: payload.id }),
    });

    return this.client.postMessage(channelId, {
      text: payload.title,
      blocks,
    });
  }

  /**
   * Sends an inventory alert notification when stock falls below a threshold to the specified Slack channel.
   * @param channelId Target channel ID
   * @param payload Inventory alert notification payload
   * @returns `true` if transmission succeeded; otherwise, `false`
   */
  async sendInventoryAlert(channelId: string, payload: InventoryAlertPayload): Promise<boolean> {
    const blocks = SlackClient.createNotificationBlocks({
      title: this.messages.inventoryTitle,
      body: this.messages.inventoryBody(payload),
      link: {
        label: this.messages.productLabel,
        url: `${getBaseUrl()}/products/${payload.productId}`,
      },
    });

    return this.client.postMessage(channelId, {
      text: this.messages.inventoryText,
      blocks,
    });
  }

  /**
   * Sends a generic notification to multiple Slack channels concurrently.
   * @param channelIds Array of target channel IDs
   * @param payload Notification data payload
   * @returns `true` if transmissions to all channels succeeded; otherwise, `false`
   */
  async multicast(channelIds: string[], payload: NotificationPayload): Promise<boolean> {
    const results = await Promise.all(
      channelIds.map((channelId) => this.sendNotification(channelId, payload)),
    );
    return results.every((result) => result);
  }
}
