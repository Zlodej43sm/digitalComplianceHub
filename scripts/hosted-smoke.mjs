import assert from 'node:assert/strict';

const origin = (process.argv[2] ?? '').replace(/\/$/, '');
if (!/^https:\/\/[a-z0-9.-]+$/.test(origin)) throw new Error('Pass the exact HTTPS demo origin.');
const mutationHeaders = { Origin: origin, 'Sec-Fetch-Site': 'same-origin', 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' };
async function login(suffix) {
  const accounts = await fetch(`${origin}/api/local/accounts`).then((response) => response.json());
  const account = accounts.find((item) => item.id === suffix || item.id === `demo-${suffix}`); assert.ok(account, suffix);
  const response = await fetch(`${origin}/api/local/session`, { method: 'POST', headers: mutationHeaders, body: JSON.stringify({ accountId: account.id }) });
  assert.equal(response.status, 200); const setCookie = response.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /Secure/i); assert.match(setCookie, /SameSite=Strict/i);
  return setCookie.split(';')[0];
}
async function get(path, cookie) { return fetch(origin + path, { headers: cookie ? { Cookie: cookie } : {} }); }
const health = await get('/api/health'); assert.equal(health.status, 200); assert.equal(health.headers.get('cache-control'), 'no-store');
assert.ok(health.headers.get('content-security-policy')); assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
assert.equal((await get('/api/me')).status, 401);
const crossOrigin = await fetch(`${origin}/api/local/session`, { method: 'POST', headers: { ...mutationHeaders, Origin: 'https://attacker.invalid' }, body: '{}' }); assert.equal(crossOrigin.status, 403);

const north = await login('client-northstar'), cedar = await login('client-cedar');
const northCases = (await (await get('/api/cases', north)).json()).cases, cedarCases = (await (await get('/api/cases', cedar)).json()).cases;
const northIds = new Set(northCases.map((item) => item.id)), cedarIds = new Set(cedarCases.map((item) => item.id));
for (const id of northIds) assert.ok(!cedarIds.has(id));
const northDashboard = await (await get('/api/dashboard', north)).json();
assert.equal(northDashboard.totals.all, northCases.length);
assert.equal(northDashboard.totals.awaitingClient, northCases.filter((item) => item.status === 'AwaitingClient').length);
const cedarNotices = (await (await get('/api/notifications', cedar)).json()).notifications;
for (const notice of cedarNotices) assert.ok(cedarIds.has(notice.case_id));
if (northCases[0]) {
  assert.equal((await get(`/api/cases/${northCases[0].id}`, cedar)).status, 404);
  const forbidden = await fetch(`${origin}/api/cases/${northCases[0].id}/compliance/decision`, { method: 'POST', headers: { ...mutationHeaders, Cookie: north }, body: JSON.stringify({ revision: northCases[0].revision, outcome: 'Approved', reason: 'forbidden client attempt' }) });
  assert.equal(forbidden.status, 403);
  const detail = await (await get(`/api/cases/${northCases[0].id}`, north)).json();
  if (detail.documents?.[0]) assert.equal((await get(`/api/cases/${northCases[0].id}/documents/${detail.documents[0].version_id}`, cedar)).status, 404);
}
const draft = northCases.find((item) => item.status === 'Draft');
if (draft) {
  const form = new FormData(); form.set('kind', 'invoice'); form.set('file', new File(['not a fixture'], 'unknown.pdf', { type: 'application/pdf' }));
  const rejected = await fetch(`${origin}/api/cases/${draft.id}/documents`, { method: 'POST', headers: { Cookie: north, Origin: origin, 'Sec-Fetch-Site': 'same-origin', 'X-CSRF-Protection': '1' }, body: form });
  assert.equal(rejected.status, 400);
}
console.log(`Hosted smoke passed for ${origin}: headers, sessions, CSRF, tenant scope, statistics, notifications, files, roles and fixture allowlist.`);
