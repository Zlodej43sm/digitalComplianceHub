import type { CaseStatus } from '../src/domain/case.ts';

export interface PreviewCase {
  id: string;
  title: string;
  company: string;
  scenario: string;
  status: CaseStatus;
  amount: string;
  documents: string[];
  nextAction: string;
  expectedOutcome: string;
  note: string;
}

/** Fictional presentation fixtures, not persisted records or generated AI results. */
export const scenarios: PreviewCase[] = [
  {
    id: 'FX-2026-001',
    title: 'Equipment supply agreement',
    company: 'Northstar Demo Ltd',
    scenario: 'Complete package',
    status: 'Submitted',
    amount: 'EUR 24,000.00',
    documents: ['Contract · v1', 'Invoice · v1'],
    nextAction: 'Manager checks the document package',
    expectedOutcome:
      'Manager completes formal checks, then compliance reviews and approves with a reason.',
    note: 'The contract and invoice both specify EUR 24,000.00. All names and amounts are fictional.',
  },
  {
    id: 'FX-2026-002',
    title: 'Consulting services agreement',
    company: 'Northstar Demo Ltd',
    scenario: 'Missing contract',
    status: 'AwaitingClient',
    amount: 'EUR 8,500.00',
    documents: ['Invoice · v1'],
    nextAction: 'Client supplies the missing contract',
    expectedOutcome:
      'Client adds the contract and resubmits. Manager repeats checks before compliance review.',
    note: 'Submission allows an incomplete package. The manager requests the missing contract during formal review.',
  },
  {
    id: 'FX-2026-003',
    title: 'Software licensing agreement',
    company: 'Northstar Demo Ltd',
    scenario: 'Amount mismatch',
    status: 'ComplianceReview',
    amount: 'EUR 12,500.00',
    documents: ['Contract · v1', 'Invoice · v1'],
    nextAction: 'Compliance requests a corrected invoice',
    expectedOutcome:
      'Client uploads invoice v2 for EUR 12,000.00. Manager rechecks, then compliance decides.',
    note: 'Contract: EUR 12,000.00. Invoice v1: EUR 12,500.00. The planned corrected invoice v2 is EUR 12,000.00.',
  },
];
