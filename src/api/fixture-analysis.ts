import { fixturePolicy } from './fixture-policy.ts';

export interface ExtractedFixture {
  kind: string;
  amountMinor: number;
  currency: string;
  parties: string[];
  documentDate: string;
  page: number;
}
const extracted: Record<string, ExtractedFixture> = {
  [fixturePolicy['contract.pdf'].sha256]: {
    kind: 'contract',
    amountMinor: 1200000,
    currency: 'EUR',
    parties: ['Northstar Demo Ltd', 'Synthetic Supplier GmbH'],
    documentDate: '2026-09-01',
    page: 1,
  },
  [fixturePolicy['invoice-v1.pdf'].sha256]: {
    kind: 'invoice',
    amountMinor: 1250000,
    currency: 'EUR',
    parties: ['Northstar Demo Ltd', 'Synthetic Supplier GmbH'],
    documentDate: '2026-09-03',
    page: 1,
  },
  [fixturePolicy['invoice-v2.pdf'].sha256]: {
    kind: 'invoice',
    amountMinor: 1200000,
    currency: 'EUR',
    parties: ['Northstar Demo Ltd', 'Synthetic Supplier GmbH'],
    documentDate: '2026-09-04',
    page: 1,
  },
};
export function extractFixture(hash: string) {
  const value = extracted[hash];
  if (!value) throw new Error('Fixture hash is not supported');
  return value;
}
export function compareFixtures(values: ExtractedFixture[]) {
  const contract = values.find((v) => v.kind === 'contract'),
    invoice = values.find((v) => v.kind === 'invoice');
  const findings: any[] = [];
  if (contract && invoice && contract.amountMinor !== invoice.amountMinor)
    findings.push({
      code: 'amount-mismatch',
      severity: 'warning',
      message: `Contract EUR ${(contract.amountMinor / 100).toFixed(2)} differs from invoice EUR ${(invoice.amountMinor / 100).toFixed(2)}.`,
      sources: [
        { kind: 'contract', page: contract.page },
        { kind: 'invoice', page: invoice.page },
      ],
    });
  return {
    findings,
    summary: findings.length
      ? 'A document amount mismatch requires human review.'
      : 'No predefined fixture discrepancy was detected.',
    suggestedRequest: findings.length
      ? 'Please provide a corrected invoice matching the contract amount of EUR 12,000.00.'
      : '',
  };
}
