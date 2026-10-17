/**
 * @fileoverview Proposal Static Type Checking Tests
 *
 * FieldChange<TRecord> の Mapped Union による型安全性、
 * 数値項目への文字列代入の拒否、未知のフィールドの拒否、非対応値の拒否を
 * @ts-expect-error および tsc により検証するテスト。
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { FieldChange } from './types';

type TestInvoice = {
  id: string;
  customerName: string;
  amount: number;
  isTaxExempt: boolean;
  notes: string | null;
  items: string[]; // 配列（初版ではサポート外型）
  details: { code: string }; // オブジェクト（初版ではサポート外型）
};

describe('FieldChange Mapped Union Type Safety', () => {
  it('accepts valid field changes conforming to record schema', () => {
    const validAmountChange: FieldChange<TestInvoice> = {
      field: 'amount',
      before: 10000,
      after: 12000,
    };

    const validNotesChange: FieldChange<TestInvoice> = {
      field: 'notes',
      before: null,
      after: 'メモ更新',
    };

    assert.equal(validAmountChange.field, 'amount');
    assert.equal(validNotesChange.field, 'notes');
  });

  it('type-checks invalid assignments via static expectations', () => {
    // 1. 数値項目 (amount) に文字列を割り当てた場合は型エラー
    // @ts-expect-error Type '{ field: "amount"; before: number; after: string; }' is not assignable to type 'FieldChange<TestInvoice>'.
    const _invalidAmountType: FieldChange<TestInvoice> = {
      field: 'amount',
      before: 1000,
      after: '1200',
    };

    // 2. 未知のフィールド (unknownField) を指定した場合は型エラー
    const _unknownFieldChange: FieldChange<TestInvoice> = {
      // @ts-expect-error Type '"unknownField"' is not assignable to keyof TestInvoice
      field: 'unknownField',
      before: 'a',
      after: 'b',
    };

    // 3. 非対応値（配列項目 items）を指定した場合は型エラー
    const _unsupportedArrayChange: FieldChange<TestInvoice> = {
      field: 'items',
      // @ts-expect-error Type 'string[]' is not assignable to SupportedPrimitive
      before: ['a'],
      // @ts-expect-error Type 'string[]' is not assignable to SupportedPrimitive
      after: ['b'],
    };

    // 4. 非対応値（オブジェクト項目 details）を指定した場合は型エラー
    const _unsupportedObjectChange: FieldChange<TestInvoice> = {
      field: 'details',
      // @ts-expect-error Type '{ code: string }' is not assignable to SupportedPrimitive
      before: { code: '1' },
      // @ts-expect-error Type '{ code: string }' is not assignable to SupportedPrimitive
      after: { code: '2' },
    };

    assert.equal(typeof _invalidAmountType, 'object');
    assert.equal(typeof _unknownFieldChange, 'object');
    assert.equal(typeof _unsupportedArrayChange, 'object');
    assert.equal(typeof _unsupportedObjectChange, 'object');
  });

  it('supports interface definitions without index signatures and enforces type safety', () => {
    interface CustomerInterface {
      id: string;
      creditLimit: number;
      isTaxExempt: boolean;
    }

    const validChange: FieldChange<CustomerInterface> = {
      field: 'creditLimit',
      before: 1000,
      after: 2000,
    };

    // 数値項目への文字列代入は interface でも拒否される
    // @ts-expect-error Type '{ field: "creditLimit"; before: number; after: string; }' is not assignable to type 'FieldChange<CustomerInterface>'.
    const _invalidType: FieldChange<CustomerInterface> = {
      field: 'creditLimit',
      before: 1000,
      after: '2000',
    };

    // 未知の項目は interface でも拒否される
    const _unknownField: FieldChange<CustomerInterface> = {
      // @ts-expect-error Type '"unknown"' is not assignable to keyof CustomerInterface
      field: 'unknown',
      before: 'a',
      after: 'b',
    };

    assert.equal(validChange.field, 'creditLimit');
    assert.equal(typeof _invalidType, 'object');
    assert.equal(typeof _unknownField, 'object');
  });
});
