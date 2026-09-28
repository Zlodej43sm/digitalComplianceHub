import { readFile } from 'node:fs/promises';

const origin = (process.argv[2] ?? 'http://127.0.0.1:5178').replace(/\/$/, '');
const mutationHeaders = { Origin: origin, 'Sec-Fetch-Site': 'same-origin', 'X-CSRF-Protection': '1' };

async function session(accountSuffix) {
  const accounts = await fetch(`${origin}/api/local/accounts`).then((response) => response.json());
  const account = accounts.find((item) => item.id === accountSuffix || item.id === `demo-${accountSuffix}`);
  if (!account) throw new Error(`Demo account ${accountSuffix} is not seeded.`);
  const response = await fetch(`${origin}/api/local/session`, { method: 'POST', headers: { ...mutationHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId: account.id }) });
  if (!response.ok) throw new Error(`Could not start ${accountSuffix} session.`);
  return response.headers.get('set-cookie')?.split(';')[0] ?? '';
}
async function json(path, cookie, method = 'GET', body) {
  const response = await fetch(origin + path, { method, headers: { Cookie: cookie, ...(method === 'GET' ? {} : { ...mutationHeaders, 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const value = await response.json();
  if (!response.ok) throw new Error(`${path}: ${value.error ?? response.status}`);
  return value;
}
async function create(cookie, title, amountMinor) {
  const existing = (await json('/api/cases', cookie)).cases.find((item) => item.title === title);
  if (existing) return existing.id;
  return (await json('/api/cases', cookie, 'POST', { title, description: 'Deterministic Phase 6 synthetic demonstration scenario.', currency: 'EUR', amountMinor })).id;
}
async function upload(cookie, caseId, kind, filename) {
  const form = new FormData(); form.set('kind', kind); form.set('file', new File([await readFile(new URL(`../fixtures/documents/${filename}`, import.meta.url))], filename, { type: 'application/pdf' }));
  const response = await fetch(`${origin}/api/cases/${caseId}/documents`, { method: 'POST', headers: { Cookie: cookie, ...mutationHeaders }, body: form });
  if (!response.ok) throw new Error(`${filename}: ${(await response.json()).error}`);
}
async function prepareSubmitted(client, title, invoice, amountMinor) {
  const caseId = await create(client, title, amountMinor); const detail = await json(`/api/cases/${caseId}`, client);
  if (!detail.documents.some((item) => item.kind === 'contract')) await upload(client, caseId, 'contract', 'contract.pdf');
  if (!detail.documents.some((item) => item.kind === 'invoice')) await upload(client, caseId, 'invoice', invoice);
  const current = await json(`/api/cases/${caseId}`, client);
  if (current.case.status === 'Draft') await json(`/api/cases/${caseId}/submit`, client, 'POST', { revision: current.case.revision });
  return caseId;
}
async function managerReview(manager, caseId) {
  let detail = await json(`/api/cases/${caseId}`, manager);
  if (detail.case.status === 'Submitted') await json(`/api/cases/${caseId}/manager/start`, manager, 'POST', { revision: detail.case.revision });
  detail = await json(`/api/cases/${caseId}`, manager);
  if (detail.case.status === 'ManagerReview') {
    for (const item of ['documents-present', 'fixtures-readable', 'parties-checked', 'amount-currency-checked', 'dates-checked']) await json(`/api/cases/${caseId}/manager/checklist`, manager, 'PUT', { item, checked: true });
    await json(`/api/cases/${caseId}/manager/forward`, manager, 'POST', { revision: detail.case.revision });
  }
}

const client = await session('client-northstar'), manager = await session('manager'), compliance = await session('compliance');
await create(client, 'Demo · Missing documents', 1200000);
const discrepancy = await prepareSubmitted(client, 'Demo · Amount discrepancy', 'invoice-v1.pdf', 1250000);
await managerReview(manager, discrepancy);
const complete = await prepareSubmitted(client, 'Demo · Completed approval', 'invoice-v2.pdf', 1200000);
await managerReview(manager, complete);
const completeDetail = await json(`/api/cases/${complete}`, compliance);
if (completeDetail.case.status === 'ComplianceReview') await json(`/api/cases/${complete}/compliance/decision`, compliance, 'POST', { revision: completeDetail.case.revision, outcome: 'Approved', reason: 'Synthetic documents match; approved for the deterministic demo.' });
console.log(`Seeded Phase 6 scenarios at ${origin}: missing documents, discrepancy review and completed approval.`);
