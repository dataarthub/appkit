import { expect, test } from 'bun:test';
import { japaneseHolidayCalendar, japaneseNotificationMessages, parseLegalDocument, resolveSealLabel } from './index';
import { japaneseHolidayCalendar as integratedCalendar } from './date-utils';
import type { NotificationMessages } from "../data/notifications/messages";

test('standalone entries keep Japanese behavior and remain structurally compatible with engine integrations', () => {
  expect(japaneseHolidayCalendar).toBe(integratedCalendar);
  expect(japaneseHolidayCalendar({ year: 2024, month: 0, day: 1 })).toBe(true);
  expect(japaneseHolidayCalendar({ year: 2024, month: 0, day: 2 })).toBe(false);
  expect(resolveSealLabel('山田 太郎')).toBe('山田');
  expect(parseLegalDocument('第1条（目的）\n本文').blocks.some(block => block.type === 'article')).toBe(true);
  const compatible: NotificationMessages = japaneseNotificationMessages;
  expect(compatible.paymentBody({ partnerName: 'A', amount: 1000, dueDate: '2026-10-16', invoiceId: '1' })).toContain('¥1,000');
});
