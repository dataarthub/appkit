import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prepareProposalBatch, type ProposalBatchEntry } from './batch';

type Row = { amount: number; note: string };
function entry(id: string): ProposalBatchEntry<Row> {
  return { proposal: { id, targetId: id, baseVersion: 1, createdAt: '2026-09-17T00:00:00Z', changes: [{ field: 'amount', before: 10, after: 20 }, { field: 'note', before: 'old', after: 'new' }] }, currentRecord: Object.freeze({ amount: 10, note: 'old' }), currentVersion: 1, selected: true, decisions: { amount: 'accepted', note: 'rejected' } };
}
describe('Proposal batch preflight', () => {
  it('composes all selected candidates without mutating records and excludes unselected proposals', () => {
    const a = entry('a'); const b = { ...entry('b'), selected: false, currentVersion: 99 };
    const result = prepareProposalBatch([a, b]); assert(result.canApply); assert.equal(result.selectedCount, 1);
    assert.deepEqual(result.payloads.map(p => p.candidateRecord), [{ amount: 20, note: 'old' }]);
    assert.equal(a.currentRecord.amount, 10); assert(Object.isFrozen(result.payloads)); assert(Object.isFrozen(result.payloads[0].candidateRecord));
  });
  it('returns no executable partial payloads when any selected row is pending, rejected or conflicted', () => {
    for (const [overrides, code] of [[{ decisions: {} }, 'pending'], [{ decisions: { amount: 'rejected', note: 'rejected' } }, 'no_changes'], [{ currentVersion: 2 }, 'conflict'], [{ currentRecord: { amount: 11, note: 'old' } }, 'conflict']] as const) {
      const result = prepareProposalBatch([entry('a'), { ...entry('b'), ...overrides }]);
      assert(!result.canApply); assert.equal(result.issues[0].code, code); assert.deepEqual(result.payloads, []);
    }
  });
  it('checks composed whole records and hides thrown validator details', () => {
    const result = prepareProposalBatch([entry('a')], candidate => ({ valid: candidate.amount < 15 }));
    assert(!result.canApply); assert.equal(result.issues[0].code, 'invalid_candidate');
    const thrown = prepareProposalBatch([entry('a')], () => { throw new Error('PRIVATE'); });
    assert(!JSON.stringify(thrown).includes('PRIVATE')); assert(!thrown.canApply);
  });
  it('rejects duplicate proposal identities and duplicate selected targets', () => {
    assert.equal(prepareProposalBatch([entry('a'), { ...entry('a'), selected: false }]).issues[0].code, 'duplicate_proposal');
    const b = entry('b'); const sameTarget = { ...b, proposal: { ...b.proposal, targetId: 'a' } };
    assert.equal(prepareProposalBatch([entry('a'), sameTarget]).issues[0].code, 'duplicate_target');
    assert(prepareProposalBatch([entry('a'), { ...sameTarget, selected: false }]).canApply);
  });
  it('does not validate excluded records and does not apply empty batches', () => {
    let calls = 0; const validate = () => { calls++; return { valid: true }; };
    assert(!prepareProposalBatch([], validate).canApply);
    assert(!prepareProposalBatch([{ ...entry('a'), selected: false }], validate).canApply); assert.equal(calls, 0);
  });
  it('rejects malformed decisions instead of treating them as decided', () => {
    const item = entry('a');
    assert(!prepareProposalBatch([{ ...item, decisions: { amount: 'accepted', note: 'bad' as 'accepted' } }]).canApply);
  });
});
