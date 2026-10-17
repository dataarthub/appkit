import { expect, test } from 'bun:test';
import { SlackNotificationAdapter } from './slack/adapter';
import { SlackClient } from './slack/client';
import { LineNotificationAdapter } from './line/adapter';
import { GoogleChatNotificationAdapter } from './google-chat/adapter';
import { defaultNotificationMessages } from './messages';

test('all transports use explicit presentation and neutral defaults contain no yen assumption', async () => {
  const payment = { partnerName: 'Acme', amount: 1234, dueDate: '2026-10-16', invoiceId: 'i' };
  expect(defaultNotificationMessages.paymentBody(payment)).not.toContain('¥');
  const messages = { ...defaultNotificationMessages, paymentTitle: 'Custom payment', paymentBody: () => 'EUR 1234', inventoryBody: () => 'Custom stock', approveLabel: 'Yes', rejectLabel: 'No' };
  for (const [Adapter, method] of [
    [SlackNotificationAdapter, 'postMessage'],
    [LineNotificationAdapter, 'pushMessage'],
    [GoogleChatNotificationAdapter, 'sendWebhookMessage'],
  ] as const) {
    // No live provider request: capture the actual adapter's transport payload.
    const calls: unknown[] = [];
    const client = { [method]: async (...args: unknown[]) => { calls.push(args); return true; } };
    // Each tuple uses a different provider type; the stub implements its used method.
    const adapter = new (Adapter as typeof SlackNotificationAdapter)(client as unknown as SlackClient, messages);
    expect(await adapter.sendPaymentDueNotification('channel', payment)).toBe(true);
    expect(JSON.stringify(calls)).toContain('EUR 1234');
    expect(JSON.stringify(calls)).toContain('Custom payment');
    calls.length = 0;
    await adapter.sendApprovalNotification('channel', { title: 'Review', description: 'Please review', type: 'expense', id: '1' });
    expect(JSON.stringify(calls)).toContain('Yes');
    expect(JSON.stringify(calls)).toContain('No');
    calls.length = 0;
    await adapter.sendInventoryAlert('channel', { productName: 'Widget', currentStock: 1, threshold: 2, productId: 'w' });
    expect(JSON.stringify(calls)).toContain('Custom stock');
  }
});
