/**
 * @fileoverview Proposal Core Unit Tests
 *
 * 変更提案の入力検証、不変性保証、整合性検査（バージョン/before値照合）、
 * 候補レコード合成、適用ペイロード生成、メタデータ共有参照排除の完全な単体テスト。
 * （app-core 規則に従い node:test / node:assert/strict を使用）
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApplyPayload,
  buildCandidateRecord,
  canApplyProposal,
  computeReviewStatus,
  verifyCurrentState,
} from './engine';
import type { ReviewDecisions } from './types';
import { proposalFieldTypes, validateProposalInput } from './validation';

type InvoiceRecord = {
  id: string;
  customerName: string;
  amount: number;
  taxRate: number;
  isTaxExempt: boolean;
  notes: string | null;
  version: number;
};

const baseInvoice: InvoiceRecord = {
  id: 'inv-101',
  customerName: 'Acme Corp',
  amount: 10000,
  taxRate: 10,
  isTaxExempt: false,
  notes: null,
  version: 3,
};

const invoiceFieldOptions = {
  fields: {
    customerName: proposalFieldTypes.string,
    amount: proposalFieldTypes.finiteNumber,
    taxRate: proposalFieldTypes.finiteNumber,
    isTaxExempt: proposalFieldTypes.boolean,
    notes: proposalFieldTypes.nullableString,
  },
};

const sampleProposalInput = {
  id: 'prop-001',
  targetId: 'inv-101',
  targetName: 'Acme Corp 請求書修正',
  baseVersion: 3,
  changes: [
    {
      field: 'amount',
      label: '請求金額',
      before: 10000,
      after: 12000,
      reason: '追加発注分の反映',
    },
    {
      field: 'notes',
      label: '備考',
      before: null,
      after: '特記事項: 翌月末払い',
      reason: '顧客要望による追記',
    },
  ],
  metadata: {
    sourceModel: 'gpt-4o',
    confidenceScore: 0.95,
  },
  createdAt: '2026-09-17T10:00:00Z',
};

describe('validateProposalInput', () => {
  it('validates a correct proposal input and freezes output', () => {
    const res = validateProposalInput<InvoiceRecord>(sampleProposalInput, invoiceFieldOptions);
    assert.equal(res.ok, true);
    if (!res.ok) return;

    assert.equal(res.data.id, 'prop-001');
    assert.equal(res.data.targetId, 'inv-101');
    assert.equal(res.data.changes.length, 2);
    assert.equal(Object.isFrozen(res.data), true);
    assert.equal(Object.isFrozen(res.data.changes), true);
    assert.equal(Object.isFrozen(res.data.changes[0]), true);
    assert.equal(Object.isFrozen(res.data.metadata), true);
    assert.equal(res.data.metadata?.sourceModel, 'gpt-4o');
  });

  it('requires explicit field definition options', () => {
    // @ts-expect-error Missing required options
    const res = validateProposalInput(sampleProposalInput);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.errors[0].path, 'options.fields');
  });

  it('rejects field changes not defined in options.fields', () => {
    const res = validateProposalInput<InvoiceRecord>(sampleProposalInput, {
      fields: {
        customerName: proposalFieldTypes.string, // amount, notes は未定義
      },
    });

    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.errors.some((e) => e.message.includes('not defined in allowed fields')), true);
  });

  it('rejects un-registered inherited Object prototype properties such as toString', () => {
    const unregisteredTest = {
      ...sampleProposalInput,
      changes: [
        {
          field: 'toString',
          before: 'a',
          after: 'b',
        },
      ],
    };

    // options.fields は普通の Object なので Object.prototype.toString がプロトタイプチェーンに存在する
    const res = validateProposalInput<Record<string, unknown>>(unregisteredTest, {
      fields: {
        customerName: proposalFieldTypes.string,
      },
    });

    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(
      res.errors.some((e) => e.message.includes("Field 'toString' is not defined in allowed fields")),
      true
    );
  });

  it('rejects field validator that is not a function', () => {
    const nonFunctionValidatorTest = {
      ...sampleProposalInput,
      changes: [
        {
          field: 'customerName',
          before: 'Old',
          after: 'New',
        },
      ],
    };

    const res = validateProposalInput<Record<string, unknown>>(nonFunctionValidatorTest, {
      fields: {
        // @ts-expect-error non-function validator
        customerName: 'not_a_function',
      },
    });

    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(
      res.errors.some((e) => e.message.includes("Field 'customerName' is not defined in allowed fields")),
      true
    );
  });

  it('rejects field-specific type mismatch (e.g. string in number field)', () => {
    const invalidTypeInput = {
      ...sampleProposalInput,
      changes: [
        {
          field: 'amount',
          before: 10000,
          after: '12000円', // finiteNumber に違反
        },
      ],
    };

    const res = validateProposalInput<InvoiceRecord>(invalidTypeInput, invoiceFieldOptions);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(
      res.errors.some((e) => e.message.includes('failed field-specific type validation')),
      true
    );
  });

  it('rejects forbidden keys (__proto__, constructor, prototype)', () => {
    const dangerousInput = {
      ...sampleProposalInput,
      __proto__: { injected: true },
      changes: [
        {
          field: '__proto__',
          before: 'a',
          after: 'b',
        },
      ],
    };

    const res = validateProposalInput(dangerousInput, invoiceFieldOptions);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.errors.some((e) => e.message.includes('Forbidden')), true);
  });

  it('rejects duplicate fields in changes array', () => {
    const duplicateInput = {
      ...sampleProposalInput,
      changes: [
        { field: 'amount', before: 10000, after: 12000 },
        { field: 'amount', before: 10000, after: 15000 },
      ],
    };

    const res = validateProposalInput<InvoiceRecord>(duplicateInput, invoiceFieldOptions);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.errors.some((e) => e.message.includes('Duplicate field change detected')), true);
  });

  it('rejects non-finite numbers (NaN, Infinity)', () => {
    const nanInput = {
      ...sampleProposalInput,
      changes: [{ field: 'amount', before: 10000, after: NaN }],
    };

    const res = validateProposalInput<InvoiceRecord>(nanInput, invoiceFieldOptions);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.errors.some((e) => e.message.includes('supported primitive')), true);
  });

  it('rejects objects and arrays as values (unsupported in v1)', () => {
    const objectInput = {
      ...sampleProposalInput,
      changes: [{ field: 'notes', before: {}, after: { key: 'val' } }],
    };

    const res = validateProposalInput(objectInput, invoiceFieldOptions);
    assert.equal(res.ok, false);
    if (res.ok) return;
    assert.equal(res.errors.some((e) => e.message.includes('supported primitive')), true);
  });

  it('isolates metadata references and prevents mutation after validation', () => {
    const mutableMetadata: Record<string, string> = {
      author: 'AI Agent',
      sessionId: 'session-123',
    };

    const inputWithMetadata = {
      ...sampleProposalInput,
      metadata: mutableMetadata,
    };

    const res = validateProposalInput<InvoiceRecord>(inputWithMetadata, invoiceFieldOptions);
    assert.equal(res.ok, true);
    if (!res.ok) return;

    // 元の mutableMetadata を後から変更する
    mutableMetadata.author = 'MALICIOUS OVERWRITE';
    mutableMetadata.newKey = 'INJECTED';

    // safeProposal の metadata は影響を受けない
    assert.equal(res.data.metadata?.author, 'AI Agent');
    assert.equal(res.data.metadata?.newKey, undefined);
  });
});

describe('buildCandidateRecord & Immutability', () => {
  it('does NOT mutate the original record even when frozen', () => {
    const validated = validateProposalInput<InvoiceRecord>(sampleProposalInput, invoiceFieldOptions);
    if (!validated.ok) throw new Error('Validation failed');
    const proposal = validated.data;

    const frozenInvoice = Object.freeze({ ...baseInvoice });
    const decisions: ReviewDecisions<InvoiceRecord> = {
      amount: 'accepted',
      notes: 'rejected',
    };

    const candidate = buildCandidateRecord(frozenInvoice, proposal, decisions);

    assert.notEqual(candidate, frozenInvoice);
    assert.equal(candidate.amount, 12000); // 採用された変更が反映
    assert.equal(candidate.notes, null); // 却下された項目は元値のまま
    assert.equal(frozenInvoice.amount, 10000); // 元データは不変
  });
});

describe('verifyCurrentState (Consistency Checking)', () => {
  const validated = validateProposalInput<InvoiceRecord>(sampleProposalInput, invoiceFieldOptions);
  if (!validated.ok) throw new Error('Validation failed');
  const proposal = validated.data;

  it('returns ok: true when version matches and before values match', () => {
    const decisions: ReviewDecisions<InvoiceRecord> = {
      amount: 'accepted',
      notes: 'accepted',
    };

    const result = verifyCurrentState(baseInvoice, 3, proposal, decisions);
    assert.equal(result.ok, true);
  });

  it('detects version mismatch', () => {
    const decisions: ReviewDecisions<InvoiceRecord> = {
      amount: 'accepted',
      notes: 'accepted',
    };

    // 提案時バージョンは 3 だが、最新バージョンは 4 に進んでいる
    const result = verifyCurrentState(baseInvoice, 4, proposal, decisions);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'version_mismatch');
    assert.equal(result.currentVersion, 4);
    assert.equal(result.expectedVersion, 3);
  });

  it('detects before value mismatch on accepted fields (uncommitted edit conflict)', () => {
    const decisions: ReviewDecisions<InvoiceRecord> = {
      amount: 'accepted',
      notes: 'accepted',
    };

    // フォーム上で amount がすでに手動で 10500 に変更されている（提案の before: 10000 と不一致）
    const modifiedInvoice = { ...baseInvoice, amount: 10500 };
    const result = verifyCurrentState(modifiedInvoice, 3, proposal, decisions);

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, 'before_value_mismatch');
    assert.equal(result.conflictedFields.length, 1);
    assert.equal(result.conflictedFields[0].field, 'amount');
    assert.equal(result.conflictedFields[0].expectedBefore, 10000);
    assert.equal(result.conflictedFields[0].actualCurrent, 10500);
  });

  it('ignores before value mismatch on REJECTED fields', () => {
    // amount は競合しているが、ユーザーが明示的に reject した場合
    const modifiedInvoice = { ...baseInvoice, amount: 10500 };
    const decisions: ReviewDecisions<InvoiceRecord> = {
      amount: 'rejected',
      notes: 'accepted', // notes の現在値は null で before と一致
    };

    const result = verifyCurrentState(modifiedInvoice, 3, proposal, decisions);
    assert.equal(result.ok, true);
  });
});

describe('computeReviewStatus', () => {
  const validated = validateProposalInput<InvoiceRecord>(sampleProposalInput, invoiceFieldOptions);
  if (!validated.ok) throw new Error('Validation failed');
  const proposal = validated.data;

  it('computes all_pending initially', () => {
    assert.equal(computeReviewStatus(proposal, {}), 'all_pending');
  });

  it('computes partially_decided when some fields are pending', () => {
    assert.equal(computeReviewStatus(proposal, { amount: 'accepted' }), 'partially_decided');
  });

  it('computes all_accepted when all fields are accepted', () => {
    assert.equal(
      computeReviewStatus(proposal, { amount: 'accepted', notes: 'accepted' }),
      'all_accepted'
    );
  });

  it('computes all_rejected when all fields are rejected', () => {
    assert.equal(
      computeReviewStatus(proposal, { amount: 'rejected', notes: 'rejected' }),
      'all_rejected'
    );
  });

  it('computes mixed when some accepted and some rejected with zero pending', () => {
    assert.equal(
      computeReviewStatus(proposal, { amount: 'accepted', notes: 'rejected' }),
      'mixed'
    );
  });
});

describe('canApplyProposal', () => {
  const validated = validateProposalInput<InvoiceRecord>(sampleProposalInput, invoiceFieldOptions);
  if (!validated.ok) throw new Error('Validation failed');
  const proposal = validated.data;

  it('returns false if any field is still pending', () => {
    const consistency = verifyCurrentState(baseInvoice, 3, proposal, { amount: 'accepted' });
    const canApply = canApplyProposal({
      proposal,
      decisions: { amount: 'accepted' }, // notes is pending
      consistency,
    });
    assert.equal(canApply, false);
  });

  it('returns false if all fields are rejected (0 accepted)', () => {
    const decisions: ReviewDecisions<InvoiceRecord> = { amount: 'rejected', notes: 'rejected' };
    const consistency = verifyCurrentState(baseInvoice, 3, proposal, decisions);
    const canApply = canApplyProposal({
      proposal,
      decisions,
      consistency,
    });
    assert.equal(canApply, false);
  });

  it('returns false if consistency check fails', () => {
    const decisions: ReviewDecisions<InvoiceRecord> = { amount: 'accepted', notes: 'rejected' };
    const consistency = verifyCurrentState(baseInvoice, 4, proposal, decisions); // version mismatch
    const canApply = canApplyProposal({
      proposal,
      decisions,
      consistency,
    });
    assert.equal(canApply, false);
  });

  it('returns false if custom candidate validation fails', () => {
    const decisions: ReviewDecisions<InvoiceRecord> = { amount: 'accepted', notes: 'rejected' };
    const consistency = verifyCurrentState(baseInvoice, 3, proposal, decisions);
    const canApply = canApplyProposal({
      proposal,
      decisions,
      consistency,
      candidateValidation: { valid: false, errors: { amount: '上限額オーバー' } },
    });
    assert.equal(canApply, false);
  });

  it('returns true when completely decided, accepted >= 1, and no errors', () => {
    const decisions: ReviewDecisions<InvoiceRecord> = { amount: 'accepted', notes: 'rejected' };
    const consistency = verifyCurrentState(baseInvoice, 3, proposal, decisions);
    const canApply = canApplyProposal({
      proposal,
      decisions,
      consistency,
      candidateValidation: { valid: true },
    });
    assert.equal(canApply, true);
  });
});

describe('buildApplyPayload', () => {
  it('constructs an immutable apply payload with only accepted changes', () => {
    const validated = validateProposalInput<InvoiceRecord>(sampleProposalInput, invoiceFieldOptions);
    if (!validated.ok) throw new Error('Validation failed');
    const proposal = validated.data;

    const decisions: ReviewDecisions<InvoiceRecord> = {
      amount: 'accepted',
      notes: 'rejected',
    };

    const candidate = buildCandidateRecord(baseInvoice, proposal, decisions);
    const payload = buildApplyPayload({
      proposal,
      candidateRecord: candidate,
      decisions,
    });

    assert.equal(payload.proposalId, 'prop-001');
    assert.equal(payload.targetId, 'inv-101');
    assert.equal(payload.baseVersion, 3);
    assert.deepEqual(payload.acceptedFields, ['amount']);
    assert.equal(payload.acceptedChanges.length, 1);
    assert.equal(payload.acceptedChanges[0].field, 'amount');
    assert.equal(payload.candidateRecord.amount, 12000);
    assert.equal(Object.isFrozen(payload.acceptedFields), true);
    assert.equal(Object.isFrozen(payload.candidateRecord), true);
  });
});
