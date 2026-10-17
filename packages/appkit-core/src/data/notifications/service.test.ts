import { describe, it, expect } from 'bun:test';
import { NotificationService } from './service';
import type {
  NotificationAdapter,
  NotificationPayload,
  PaymentDuePayload,
  ApprovalPayload,
  InventoryAlertPayload,
} from './types';

class MockNotificationAdapter implements NotificationAdapter {
  readonly provider = 'slack' as const;
  public sentMessages: { userId: string; payload: NotificationPayload }[] = [];

  async sendNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    this.sentMessages.push({ userId, payload });
    return true;
  }

  async sendPaymentDueNotification(_userId: string, _payload: PaymentDuePayload): Promise<boolean> { return true; }
  async sendApprovalNotification(_userId: string, _payload: ApprovalPayload): Promise<boolean> { return true; }
  async sendInventoryAlert(_userId: string, _payload: InventoryAlertPayload): Promise<boolean> { return true; }
  async multicast(_userIds: string[], _payload: NotificationPayload): Promise<boolean> { return true; }
}

describe('NotificationService', () => {
  it('dispatches notifications using user preferences', async () => {
    const slackMock = new MockNotificationAdapter();
    const service = new NotificationService({
      adapters: new Map([['slack', slackMock]]),
    });

    const result = await service.sendToUser(
      {
        userId: 'user-001',
        provider: 'slack',
        channelId: 'C12345678',
      },
      {
        title: '請求書確認のお願い',
        body: '請求書 #INV-2026-001 が発行されました。',
      },
    );

    expect(result).toBe(true);
    expect(slackMock.sentMessages.length).toBe(1);
    expect(slackMock.sentMessages[0].userId).toBe('C12345678');
    expect(slackMock.sentMessages[0].payload.title).toBe('請求書確認のお願い');
  });

  it('fails gracefully when provider is not configured', async () => {
    const service = new NotificationService({
      adapters: new Map(),
    });

    const result = await service.sendToUser(
      {
        userId: 'user-002',
        provider: 'line',
        channelId: 'U123456',
      },
      {
        title: 'テスト',
        body: '通知テスト',
      },
    );

    expect(result).toBe(false);
  });
});
