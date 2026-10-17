/**
 * Unified Notification System
 * Supports LINE, Slack, and Google Chat
 */

// Common types
export type {
  NotificationAdapter,
  NotificationProvider,
  NotificationPayload,
  PaymentDuePayload,
  ApprovalPayload,
  InventoryAlertPayload,
  ProviderConfig,
} from './types';

// Unified service
export { NotificationService, createNotificationService } from './service';
export type { NotificationServiceConfig, UserNotificationPreference } from './service';

// LINE
// LINE - Implementation extracted to dynamic import in service.ts to avoid bundling
// export {
//     LineClient,
//     createLineClient,
//     LineNotificationAdapter,
//     processWebhook,
//     verifySignature,
//     onLineEvent,
// } from './line';
export type {
  LineConfig,
  LineMessage,
  FlexContainer,
  LineWebhookEvent,
  LineWebhookBody,
  WebhookContext,
} from './line';

// Slack
// Slack - Implementation extracted to dynamic import in service.ts to avoid bundling
// export {
//     SlackClient,
//     createSlackClient,
//     SlackNotificationAdapter,
// } from './slack';
export type { SlackConfig, SlackBlock } from './slack';

// Google Chat
// Google Chat - Implementation extracted to dynamic import in service.ts to avoid bundling
// export {
//     GoogleChatClient,
//     createGoogleChatClient,
//     GoogleChatNotificationAdapter,
// } from './google-chat';
export type { GoogleChatConfig, GoogleChatCard } from './google-chat';
