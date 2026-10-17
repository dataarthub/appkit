/**
 * LINE Messaging API Client
 * Handles sending messages, notifications, and flex messages
 */

export interface LineConfig {
  channelId: string;
  channelSecret: string;
  accessToken: string;
  /** Alt text when an incoming flex message omits it. Default Message. */
  fallbackAltText?: string;
}

export interface LineMessage {
  type: 'text' | 'flex';
  text?: string;
  altText?: string;
  contents?: FlexContainer;
}

export interface FlexContainer {
  type: 'bubble' | 'carousel';
  body?: FlexBox;
  footer?: FlexBox;
}

export interface FlexBox {
  type: 'box';
  layout: 'vertical' | 'horizontal';
  contents: FlexComponent[];
}

export type FlexComponent = FlexText | FlexButton | FlexSeparator;

export interface FlexText {
  type: 'text';
  text: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  weight?: 'regular' | 'bold';
  color?: string;
}

export interface FlexButton {
  type: 'button';
  action: {
    type: 'postback' | 'uri' | 'message';
    label: string;
    data?: string;
    uri?: string;
    text?: string;
  };
  style?: 'primary' | 'secondary' | 'link';
}

export interface FlexSeparator {
  type: 'separator';
}

const LINE_API_BASE = 'https://api.line.me/v2/bot';

/**
 * LINE Messaging API Client
 */
export class LineClient {
  private config: LineConfig;

  /**
   * Creates a new instance of LineClient.
   * @param config Configuration settings for the LINE Messaging API
   */
  constructor(config: LineConfig) {
    this.config = config;
  }

  private async request(endpoint: string, body: unknown): Promise<Response> {
    const response = await fetch(`${LINE_API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.accessToken}`,
      },
      body: JSON.stringify(body),
    });
    return response;
  }

  /**
   * Send push message to a single user
   */
  async pushMessage(userId: string, messages: LineMessage[]): Promise<boolean> {
    const response = await this.request('/message/push', {
      to: userId,
      messages: messages.map(this.formatMessage),
    });
    return response.ok;
  }

  /**
   * Send multicast message to multiple users
   */
  async multicast(userIds: string[], messages: LineMessage[]): Promise<boolean> {
    const response = await this.request('/message/multicast', {
      to: userIds,
      messages: messages.map(this.formatMessage),
    });
    return response.ok;
  }

  /**
   * Reply to a webhook event
   */
  async replyMessage(replyToken: string, messages: LineMessage[]): Promise<boolean> {
    const response = await this.request('/message/reply', {
      replyToken,
      messages: messages.map(this.formatMessage),
    });
    return response.ok;
  }

  private formatMessage = (msg: LineMessage): Record<string, unknown> => {
    if (msg.type === 'text') {
      return { type: 'text', text: msg.text };
    }
    return {
      type: 'flex',
      altText: msg.altText || this.config.fallbackAltText || 'Message',
      contents: msg.contents,
    };
  }

  /**
   * Create approval flex message with buttons
   */
  static createApprovalMessage(options: {
    title: string;
    description: string;
    approveLabel?: string;
    rejectLabel?: string;
    approveData: string;
    rejectData: string;
  }): LineMessage {
    return {
      type: 'flex',
      altText: options.title,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: options.title, weight: 'bold', size: 'lg' },
            { type: 'text', text: options.description, size: 'sm', color: '#666666' },
          ],
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'button',
              action: { type: 'postback', label: options.approveLabel ?? 'Approve', data: options.approveData },
              style: 'primary',
            },
            {
              type: 'button',
              action: { type: 'postback', label: options.rejectLabel ?? 'Reject', data: options.rejectData },
              style: 'secondary',
            },
          ],
        },
      },
    };
  }

  /**
   * Create notification message
   */
  static createNotificationMessage(options: {
    title: string;
    body: string;
    link?: { label: string; url: string };
  }): LineMessage {
    const contents: FlexComponent[] = [
      { type: 'text', text: options.title, weight: 'bold', size: 'md' },
      { type: 'text', text: options.body, size: 'sm', color: '#666666' },
    ];

    const footer = options.link
      ? {
          type: 'box' as const,
          layout: 'vertical' as const,
          contents: [
            {
              type: 'button' as const,
              action: { type: 'uri' as const, label: options.link.label, uri: options.link.url },
              style: 'link' as const,
            },
          ],
        }
      : undefined;

    return {
      type: 'flex',
      altText: options.title,
      contents: {
        type: 'bubble',
        body: { type: 'box', layout: 'vertical', contents },
        footer,
      },
    };
  }
}

/**
 * Create LINE client from database settings (unified table)
 */
export async function createLineClient(
  supabase: unknown,
  organizationId: string,
  Client: new (config: LineConfig) => LineClient = LineClient,
): Promise<LineClient | null> {
  // @ts-expect-error supabase typing
  const { data } = await supabase
    .from('notification_provider_settings')
    .select('config, enabled')
    .eq('organization_id', organizationId)
    .eq('provider', 'line')
    .single();

  if (!data || !data.enabled || !data.config) {
    return null;
  }

  const config = data.config as Record<string, string>;
  if (!config.channel_id || !config.channel_secret || !config.access_token) {
    return null;
  }

  return new Client({
    channelId: config.channel_id,
    channelSecret: config.channel_secret,
    accessToken: config.access_token,
  });
}
