/**
 * Google Chat API Client
 * Handles sending messages via webhooks and API
 */

export interface GoogleChatConfig {
  webhookUrl?: string;
  serviceAccountKey?: string;
}

export interface GoogleChatCard {
  header?: {
    title: string;
    subtitle?: string;
    imageUrl?: string;
  };
  sections: GoogleChatSection[];
}

export interface GoogleChatSection {
  widgets: GoogleChatWidget[];
}

export type GoogleChatWidget =
  | { textParagraph: { text: string } }
  | { buttons: GoogleChatButton[] };

export interface GoogleChatButton {
  textButton: {
    text: string;
    onClick: {
      openLink?: { url: string };
      action?: {
        actionMethodName: string;
        parameters?: Array<{ key: string; value: string }>;
      };
    };
  };
}

/**
 * Google Chat API Client
 */
export class GoogleChatClient {
  private config: GoogleChatConfig;

  /**
   * Creates a new instance of GoogleChatClient.
   * @param config Google Chat client configuration settings
   */
  constructor(config: GoogleChatConfig) {
    this.config = config;
  }

  /**
   * Send message via webhook
   */
  async sendWebhookMessage(message: { text?: string; cards?: GoogleChatCard[] }): Promise<boolean> {
    if (!this.config.webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  }

  /**
   * Create notification card
   */
  static createNotificationCard(options: {
    title: string;
    body: string;
    link?: { label: string; url: string };
  }): GoogleChatCard {
    const widgets: GoogleChatWidget[] = [
      {
        textParagraph: {
          text: options.body,
        },
      },
    ];

    if (options.link) {
      widgets.push({
        buttons: [
          {
            textButton: {
              text: options.link.label,
              onClick: {
                openLink: { url: options.link.url },
              },
            },
          },
        ],
      });
    }

    return {
      header: {
        title: options.title,
      },
      sections: [{ widgets }],
    };
  }

  /**
   * Create approval card with buttons
   */
  static createApprovalCard(options: {
    title: string;
    description: string;
    approveLabel?: string;
    rejectLabel?: string;
    approveAction: string;
    rejectAction: string;
  }): GoogleChatCard {
    return {
      header: {
        title: options.title,
      },
      sections: [
        {
          widgets: [
            {
              textParagraph: {
                text: options.description,
              },
            },
            {
              buttons: [
                {
                  textButton: {
                    text: options.approveLabel ?? 'Approve',
                    onClick: {
                      action: {
                        actionMethodName: 'approve',
                        parameters: [{ key: 'data', value: options.approveAction }],
                      },
                    },
                  },
                },
                {
                  textButton: {
                    text: options.rejectLabel ?? 'Reject',
                    onClick: {
                      action: {
                        actionMethodName: 'reject',
                        parameters: [{ key: 'data', value: options.rejectAction }],
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }
}

/**
 * Create Google Chat client from database settings (unified table)
 */
export async function createGoogleChatClient(
  supabase: unknown,
  organizationId: string,
  Client: new (config: GoogleChatConfig) => GoogleChatClient = GoogleChatClient,
): Promise<GoogleChatClient | null> {
  // @ts-expect-error supabase typing
  const { data } = await supabase
    .from('notification_provider_settings')
    .select('config, enabled')
    .eq('organization_id', organizationId)
    .eq('provider', 'google-chat')
    .single();

  if (!data || !data.enabled || !data.config) {
    return null;
  }

  const config = data.config as Record<string, string>;
  if (!config.webhook_url) {
    return null;
  }

  return new Client({
    webhookUrl: config.webhook_url,
    serviceAccountKey: config.service_account_key,
  });
}
