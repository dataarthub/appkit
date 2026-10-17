import { hmacSha256 } from "../../../storage";
/**
 * LINE Webhook Handler
 * Processes incoming webhook events from LINE
 */

import { LineClient } from './client';

export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'postback';
  replyToken?: string;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';
    id: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
  timestamp: number;
}

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

export interface WebhookContext {
  organizationId: string;
  lineClient: LineClient;
  supabase: unknown;
}

type EventHandler = (event: LineWebhookEvent, ctx: WebhookContext) => Promise<void>;

/**
 * Webhook handler registry
 */
const handlers: Record<string, EventHandler[]> = {
  message: [],
  follow: [],
  unfollow: [],
  postback: [],
};

/**
 * Register event handler
 */
export function onLineEvent(eventType: string, handler: EventHandler): void {
  if (!handlers[eventType]) {
    handlers[eventType] = [];
  }
  handlers[eventType].push(handler);
}

/**
 * Process webhook body
 */
export async function processWebhook(body: LineWebhookBody, ctx: WebhookContext): Promise<void> {
  for (const event of body.events) {
    const eventHandlers = handlers[event.type] || [];
    for (const handler of eventHandlers) {
      try {
        await handler(event, ctx);
      } catch (error) {
        console.error(`Error handling LINE event ${event.type}:`, error);
      }
    }
  }
}

/**
 * Verify LINE webhook signature
 */
export function verifySignature(body: string, signature: string, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  const expected = btoa(String.fromCharCode(...hmacSha256(channelSecret, body)));
  // Constant-work comparison for equal-length encoded digests.
  if (signature.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
