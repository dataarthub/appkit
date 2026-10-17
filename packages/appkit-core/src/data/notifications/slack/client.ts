/**
 * Slack Web API Client
 * Handles sending messages and interactive messages
 */

export interface SlackConfig {
  botToken: string;
  appToken?: string;
}

export interface SlackBlock {
  type: string;
  [key: string]: unknown;
}

const SLACK_API_BASE = 'https://slack.com/api';

/**
 * Slack Web API Client
 */
export class SlackClient {
  private config: SlackConfig;

  /**
   * Creates a new instance of SlackClient.
   * @param config Slack Web API configuration settings
   */
  constructor(config: SlackConfig) {
    this.config = config;
  }

  private async request(endpoint: string, body: unknown): Promise<Response> {
    const response = await fetch(`${SLACK_API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.botToken}`,
      },
      body: JSON.stringify(body),
    });
    return response;
  }

  /**
   * Send message to a channel or user
   */
  async postMessage(
    channel: string,
    options: {
      text: string;
      blocks?: SlackBlock[];
    },
  ): Promise<boolean> {
    const response = await this.request('chat.postMessage', {
      channel,
      text: options.text,
      blocks: options.blocks,
    });
    const data = (await response.json()) as { ok: boolean };
    return data.ok;
  }

  /**
   * Create notification blocks
   */
  static createNotificationBlocks(options: {
    title: string;
    body: string;
    link?: { label: string; url: string };
  }): SlackBlock[] {
    const blocks: SlackBlock[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${options.title}*\n${options.body}`,
        },
      },
    ];

    if (options.link) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: options.link.label,
            },
            url: options.link.url,
          },
        ],
      });
    }

    return blocks;
  }

  /**
   * Create approval message blocks with buttons
   */
  static createApprovalBlocks(options: {
    title: string;
    description: string;
    approveLabel?: string;
    rejectLabel?: string;
    approveValue: string;
    rejectValue: string;
  }): SlackBlock[] {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${options.title}*\n${options.description}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: options.approveLabel ?? 'Approve',
            },
            style: 'primary',
            value: options.approveValue,
            action_id: 'approve_action',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: options.rejectLabel ?? 'Reject',
            },
            style: 'danger',
            value: options.rejectValue,
            action_id: 'reject_action',
          },
        ],
      },
    ];
  }
}

/**
 * Create Slack client from database settings (unified table)
 */
export async function createSlackClient(
  supabase: unknown,
  organizationId: string,
  Client: new (config: SlackConfig) => SlackClient = SlackClient,
): Promise<SlackClient | null> {
  // @ts-expect-error supabase typing
  const { data } = await supabase
    .from('notification_provider_settings')
    .select('config, enabled')
    .eq('organization_id', organizationId)
    .eq('provider', 'slack')
    .single();

  if (!data || !data.enabled || !data.config) {
    return null;
  }

  const config = data.config as Record<string, string>;
  if (!config.bot_token) {
    return null;
  }

  return new Client({
    botToken: config.bot_token,
    appToken: config.app_token,
  });
}
