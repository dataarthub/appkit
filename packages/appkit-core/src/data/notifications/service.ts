import { defaultNotificationMessages, type NotificationMessages } from './messages';
/**
 * Unified Notification Service
 * Manages multiple notification adapters and provides a single interface
 */

import type {
  NotificationAdapter,
  NotificationProvider,
  NotificationPayload,
  PaymentDuePayload,
  ApprovalPayload,
  InventoryAlertPayload,
} from './types';

/**
 * Notification Service Configuration
 */
export interface NotificationServiceConfig {
  adapters: Map<NotificationProvider, NotificationAdapter>;
  defaultProvider?: NotificationProvider;
}

/**
 * User notification preferences
 */
export interface UserNotificationPreference {
  userId: string;
  provider: NotificationProvider;
  channelId: string; // LINE user ID, Slack channel, or Google Chat space
}

/**
 * Unified Notification Service
 */
export class NotificationService {
  private adapters: Map<NotificationProvider, NotificationAdapter>;
  // Note: defaultProvider is stored in config and accessed via constructor
  // It's kept for future use with a default send method

  /**
   * Creates a new instance of NotificationService.
   * @param config Configuration settings for the notification service
   */
  constructor(config: NotificationServiceConfig) {
    this.adapters = config.adapters;
    // defaultProvider available as config.defaultProvider if needed
  }

  /**
   * Get adapter for a specific provider
   */
  private getAdapter(provider: NotificationProvider): NotificationAdapter | undefined {
    return this.adapters.get(provider);
  }

  /**
   * Send notification to a user with their preferred provider
   */
  async sendToUser(
    preference: UserNotificationPreference,
    payload: NotificationPayload,
  ): Promise<boolean> {
    const adapter = this.getAdapter(preference.provider);
    if (!adapter) {
      console.warn(`Notification adapter for ${preference.provider} not found`);
      return false;
    }

    return adapter.sendNotification(preference.channelId, payload);
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    preferences: UserNotificationPreference[],
    payload: NotificationPayload,
  ): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      preferences.map((pref) => this.sendToUser(pref, payload)),
    );

    const success = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - success;

    return { success, failed };
  }

  /**
   * Send payment due notification
   */
  async sendPaymentDue(
    preference: UserNotificationPreference,
    payload: PaymentDuePayload,
  ): Promise<boolean> {
    const adapter = this.getAdapter(preference.provider);
    if (!adapter) return false;

    return adapter.sendPaymentDueNotification(preference.channelId, payload);
  }

  /**
   * Send approval request
   */
  async sendApproval(
    preference: UserNotificationPreference,
    payload: ApprovalPayload,
  ): Promise<boolean> {
    const adapter = this.getAdapter(preference.provider);
    if (!adapter) return false;

    return adapter.sendApprovalNotification(preference.channelId, payload);
  }

  /**
   * Send inventory alert
   */
  async sendInventoryAlert(
    preference: UserNotificationPreference,
    payload: InventoryAlertPayload,
  ): Promise<boolean> {
    const adapter = this.getAdapter(preference.provider);
    if (!adapter) return false;

    return adapter.sendInventoryAlert(preference.channelId, payload);
  }

  /**
   * Broadcast to all users on a specific provider
   */
  async broadcast(
    provider: NotificationProvider,
    channelIds: string[],
    payload: NotificationPayload,
  ): Promise<boolean> {
    const adapter = this.getAdapter(provider);
    if (!adapter) return false;

    return adapter.multicast(channelIds, payload);
  }

  /**
   * Check if a provider is available
   */
  hasProvider(provider: NotificationProvider): boolean {
    return this.adapters.has(provider);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): NotificationProvider[] {
    return Array.from(this.adapters.keys());
  }
}

/**
 * Create notification service from database settings.
 * @param messages Presentation policy forwarded to every configured adapter.
 * The generic default assumes no currency. Supply regional defaults explicitly.
 */
export async function createNotificationService(
  supabase: unknown,
  organizationId: string,
  messages: Readonly<NotificationMessages> = defaultNotificationMessages,
): Promise<NotificationService> {
  const adapters = new Map<NotificationProvider, NotificationAdapter>();

  // Dynamically import adapters to avoid bundling unused ones
  const [lineModule, slackModule, googleChatModule] = await Promise.all([
    import('./line').catch(() => null),
    import('./slack').catch(() => null),
    import('./google-chat').catch(() => null),
  ]);

  // Initialize LINE if available
  if (lineModule) {
    const lineClient = await lineModule.createLineClient(supabase, organizationId);
    if (lineClient) {
      adapters.set('line', new lineModule.LineNotificationAdapter(lineClient, messages));
    }
  }

  // Initialize Slack if available
  if (slackModule) {
    const slackClient = await slackModule.createSlackClient(supabase, organizationId);
    if (slackClient) {
      adapters.set('slack', new slackModule.SlackNotificationAdapter(slackClient, messages));
    }
  }

  // Initialize Google Chat if available
  if (googleChatModule) {
    const googleChatClient = await googleChatModule.createGoogleChatClient(
      supabase,
      organizationId,
    );
    if (googleChatClient) {
      adapters.set(
        'google-chat',
        new googleChatModule.GoogleChatNotificationAdapter(googleChatClient, messages),
      );
    }
  }

  return new NotificationService({
    adapters,
    defaultProvider: adapters.size > 0 ? Array.from(adapters.keys())[0] : undefined,
  });
}
