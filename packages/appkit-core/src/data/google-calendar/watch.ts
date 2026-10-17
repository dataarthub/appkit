/**
 * Setup watch channel via server function
 *
 * Call this from your app to register push notifications.
 * The application owns this authenticated server endpoint and webhook deployment.
 *
 * @param options - Watch setup options
 * @returns Promise with channel info
 */
export async function setupWatchChannel(options: {
  calendarId: string;
  webhookUrl: string;
  functionUrl: string;
  accessToken: string;
}): Promise<{ channelId: string; resourceId: string; expiration: string }> {
  const response = await fetch(options.functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      calendarId: options.calendarId,
      webhookUrl: options.webhookUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Setup failed: ${response.status}`);
  }

  return response.json();
}
