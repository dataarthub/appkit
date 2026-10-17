import { expect, test } from 'bun:test';
import { japaneseNotificationMessages } from './index';

test('Japanese business reminder presentation has one owner and preserves yen labels', () => {
  const messages = japaneseNotificationMessages;
  expect(messages.paymentTitle).toBe('💰 支払期日のお知らせ');
  expect(messages.paymentBody({ partnerName: '取引先', amount: 1000, dueDate: '2026-10-16', invoiceId: '1' })).toContain('¥1,000');
  expect(messages.inventoryBody({ productName: '商品', currentStock: 1, threshold: 2, productId: 'p' })).toContain('残り 1 個');
  expect(messages.approveLabel).toBe('承認');
  expect(messages.rejectLabel).toBe('却下');
  expect(Object.isFrozen(messages)).toBe(true);
});
