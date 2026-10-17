import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import type { RecordProposal } from "@alneas/appkit-core/ai";
import { useProposalReview } from './use-proposal-review';
import { ProposalFieldReview } from './ProposalFieldReview';

type Invoice = {
  id: string;
  amount: number;
  notes: string | null;
};

const baseInvoice: Invoice = {
  id: 'inv-1',
  amount: 100,
  notes: null,
};

const proposal: RecordProposal<Invoice> = {
  id: 'prop-1',
  targetId: 'inv-1',
  baseVersion: 1,
  createdAt: '2026-10-16',
  changes: [
    { field: 'amount', before: 100, after: 120, reason: 'price update' },
    { field: 'notes', before: null, after: 'urgent' },
  ],
};

function ReviewTestComponent({ currentVersion = 1 }: { currentVersion?: number }) {
  const review = useProposalReview({
    proposal,
    currentRecord: baseInvoice,
    currentVersion,
    onApply: async () => {},
  });

  return (
    <div>
      <span data-testid="status">{review.reviewStatus}</span>
      <span data-testid="can-apply">{review.canApply ? 'yes' : 'no'}</span>
      <span data-testid="consistency">{review.consistency.ok ? 'ok' : 'conflict'}</span>
      {proposal.changes.map(change => (
        <ProposalFieldReview
          key={change.field}
          change={change}
          decision={review.decisions[change.field] ?? 'pending'}
          onDecisionChange={dec => review.setDecision(change.field, dec)}
        />
      ))}
    </div>
  );
}

describe('Proposal Review Hooks and Presentation in @alneas/appkit-react/ai', () => {
  it('renders initial state with pending status and disabled application', () => {
    const html = renderToStaticMarkup(<ReviewTestComponent />);
    expect(html).toContain('all_pending');
    expect(html).toContain('no');
    expect(html).toContain('ok');
    expect(html).toContain('amount');
    expect(html).toContain('100');
    expect(html).toContain('120');
    expect(html).toContain('price update');
  });

  it('detects version mismatch during SSR or render phase', () => {
    const html = renderToStaticMarkup(<ReviewTestComponent currentVersion={2} />);
    expect(html).toContain('conflict');
  });
});
