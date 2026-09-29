import { fixturePolicy } from './fixture-policy.ts';

export interface ExtractedFixture {
  kind: string;
  amountMinor: number;
  currency: string;
  parties: string[];
  documentDate: string;
  page: number;
  recognized: boolean;
}
const extracted: Record<string, Omit<ExtractedFixture, 'recognized'>> = {
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
export function extractFixture(
  hash: string,
  fallback: Omit<ExtractedFixture, 'recognized'>,
): ExtractedFixture {
  const value = extracted[hash];
  return value
    ? { ...value, recognized: true }
    : { ...fallback, recognized: false };
}
export function compareFixtures(values: ExtractedFixture[]) {
  const contract = values.find((v) => v.kind === 'contract'),
    invoice = values.find((v) => v.kind === 'invoice');
  const findings: any[] = [];
  if (contract && invoice && contract.amountMinor !== invoice.amountMinor)
    findings.push({
      code: 'amount-mismatch',
      severity: 'warning',
      message: `Contract ${contract.currency} ${(contract.amountMinor / 100).toFixed(2)} differs from invoice ${invoice.currency} ${(invoice.amountMinor / 100).toFixed(2)}.`,
      sources: [
        { kind: 'contract', page: contract.page },
        { kind: 'invoice', page: invoice.page },
      ],
    });
  const unrecognized = values.some((v) => !v.recognized);
  return {
    findings,
    summary: findings.length
      ? 'A document amount mismatch requires human review.'
      : unrecognized
        ? 'No predefined fixture data is available for one or more files; showing the case-declared amount and currency as a simulated placeholder.'
        : 'No predefined fixture discrepancy was detected.',
    suggestedRequest:
      findings.length && contract
        ? `Please provide a corrected invoice matching the contract amount of ${contract.currency} ${(contract.amountMinor / 100).toFixed(2)}.`
        : '',
  };
}
