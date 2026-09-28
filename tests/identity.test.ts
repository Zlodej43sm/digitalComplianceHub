import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp } from '../src/api/app.ts';
import { createLocalApp } from '../src/adapters/cloudflare/local-identity.ts';
import { verifyAssertion, authenticateAccess } from '../src/api/access.ts';
import {
  canReadOrganization,
  resolveSession,
} from '../src/api/authorization.ts';
import type { Database, Bindings, Statement } from '../src/api/types.ts';

function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync('migrations/0001_identity.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0002_cases_documents.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0003_review_workflow.sql', 'utf8'));
  sql.exec(readFileSync('migrations/0004_simulated_analysis.sql', 'utf8'));
  sql.exec(readFileSync('seeds/local.sql', 'utf8'));
  const DB: Database = {
    prepare(query) {
      let values: (string | number | null)[] = [];
      const stmt = sql.prepare(query);
      const wrapper: Statement = {
        bind(...args) {
          values = args;
          return wrapper;
        },
        async first<T>() {
          return (stmt.get(...values) as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: stmt.all(...values) as T[] };
        },
        async run() {
          return stmt.run(...values);
        },
      };
      return wrapper;
    },
  };
  return { sql, env: { DB } satisfies Bindings };
}
const origin = 'http://127.0.0.1:5178';
const mutationHeaders = {
  Origin: origin,
  'Content-Type': 'application/json',
  'X-CSRF-Protection': '1',
};

test('JWT verification rejects expired, wrong issuer/audience, forged and non-user assertions', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keys = createLocalJWKSet({ keys: [{ ...jwk, kid: 'test' }] });
  const issuer = 'https://demo.cloudflareaccess.com';
  const audience = 'a'.repeat(64);
  const mint = (claims = {}, key = privateKey) =>
    new SignJWT({ type: 'app', ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('user-1')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(key);
  assert.equal(
    (await verifyAssertion(await mint(), issuer, audience, keys)).subject,
    'user-1',
  );
  await assert.rejects(
    verifyAssertion(await mint(), issuer, 'b'.repeat(64), keys),
  );
  await assert.rejects(
    verifyAssertion(
      await mint(),
      'https://other.cloudflareaccess.com',
      audience,
      keys,
    ),
  );
  await assert.rejects(
    verifyAssertion(await mint({ type: 'service' }), issuer, audience, keys),
  );
  const other = await generateKeyPair('RS256');
  await assert.rejects(
    verifyAssertion(await mint({}, other.privateKey), issuer, audience, keys),
  );
  for (const claims of [
    {
      exp: Math.floor(Date.now() / 1000) - 1,
      iat: Math.floor(Date.now() / 1000) - 60,
      sub: 'user-1',
    },
    {
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000) - 7200,
      sub: 'user-1',
    },
    {
      exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000),
    },
  ]) {
    const token = await new SignJWT({ type: 'app', ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(issuer)
      .setAudience(audience)
      .sign(privateKey);
    await assert.rejects(verifyAssertion(token, issuer, audience, keys));
  }
});

test('D1 schema prevents cross-bank membership and resolves only explicit assignments', async () => {
  const { sql, env } = database();
  try {
    sql.exec(
      "INSERT INTO banks VALUES ('other-bank','Other'); INSERT INTO organizations VALUES ('other-org','other-bank','Other');",
    );
    assert.throws(() =>
      sql.exec(
        "UPDATE memberships SET organization_id = 'other-org' WHERE user_id = 'client-northstar'",
      ),
    );
    for (const subject of [
      'client-northstar',
      'client-cedar',
      'manager',
      'compliance',
      'admin',
    ]) {
      const session = await resolveSession(
        env.DB,
        { issuer: 'urn:dch:local', subject, expiresAt: Date.now() + 60000 },
        'local',
      );
      assert.ok(session);
      assert.equal(
        canReadOrganization(session, 'other-bank', 'org-northstar'),
        false,
      );
      assert.equal(
        canReadOrganization(session, 'bank-demo', 'org-northstar'),
        !['admin', 'client-cedar'].includes(subject),
      );
      assert.equal(
        canReadOrganization(session, 'bank-demo', 'org-cedar'),
        subject === 'client-cedar',
      );
    }
    assert.equal(
      await resolveSession(
        env.DB,
        {
          issuer: 'urn:unknown',
          subject: 'manager',
          expiresAt: Date.now() + 60000,
        },
        'access',
      ),
      null,
    );
  } finally {
    sql.close();
  }
});

test('real session routes enforce roles, tenant isolation, CSRF, revocation and expiry', async () => {
  const { sql, env } = database();
  const app = createLocalApp();
  const request = (path: string, init?: RequestInit) =>
    app.request(origin + path, init, env);
  const login = async (accountId: string) => {
    const response = await request('/api/local/session', {
      method: 'POST',
      headers: mutationHeaders,
      body: JSON.stringify({ accountId }),
    });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    return cookie.split(';')[0]!;
  };
  try {
    assert.equal((await request('/api/me')).status, 401);
    assert.equal(
      (
        await request('/api/me', {
          headers: {
            'X-Role': 'compliance',
            'Cf-Access-Authenticated-User-Email': 'boss@example.com',
          },
        })
      ).status,
      401,
    );
    for (const headers of [
      {},
      { ...mutationHeaders, Origin: 'https://evil.example' },
      { ...mutationHeaders, 'Sec-Fetch-Site': 'cross-site' },
      { ...mutationHeaders, 'X-CSRF-Protection': '' },
    ]) {
      assert.equal(
        (
          await request('/api/local/session', {
            method: 'POST',
            headers,
            body: '{"accountId":"manager"}',
          })
        ).status,
        403,
      );
    }
    assert.equal(
      (await app.request('https://evil.example/api/local/accounts', {}, env))
        .status,
      404,
    );
    for (const account of [
      'client-northstar',
      'client-cedar',
      'manager',
      'compliance',
      'admin',
    ]) {
      const Cookie = await login(account);
      const me = await request('/api/me?role=compliance', {
        headers: { Cookie, 'X-Role': 'compliance' },
      });
      assert.equal(me.headers.get('Cache-Control'), 'no-store');
      const session = await me.json();
      assert.equal(session.userId, account);
      assert.equal(
        session.role,
        account.startsWith('client-')
          ? 'client'
          : account === 'admin'
            ? 'demo-admin'
            : account,
      );
      const workspace = await request('/api/workspace', {
        headers: { Cookie },
      });
      assert.equal(workspace.status, account === 'admin' ? 403 : 200);
      if (account !== 'admin')
        assert.equal(
          (await workspace.json()).scenarios.length,
          account === 'client-cedar' ? 0 : 3,
        );
      const forbiddenOrg =
        account === 'client-cedar' ? 'org-northstar' : 'org-cedar';
      assert.equal(
        (
          await request(`/api/workspace?organizationId=${forbiddenOrg}`, {
            headers: { Cookie },
          })
        ).status,
        403,
      );
      assert.equal(
        (await request('/api/admin', { headers: { Cookie } })).status,
        account === 'admin' ? 200 : 403,
      );
      assert.equal(
        (
          await request('/api/local/logout', {
            method: 'POST',
            headers: { ...mutationHeaders, Cookie },
            body: '{}',
          })
        ).status,
        200,
      );
      assert.equal(
        (await request('/api/me', { headers: { Cookie } })).status,
        401,
      );
    }
    let Cookie = await login('manager');
    sql.exec('UPDATE local_sessions SET expires_at = 0');
    assert.equal(
      (await request('/api/me', { headers: { Cookie } })).status,
      401,
    );
    Cookie = await login('manager');
    sql.exec("UPDATE users SET active = 0 WHERE id = 'manager'");
    assert.equal(
      (await request('/api/me', { headers: { Cookie } })).status,
      403,
    );
    sql.exec(
      "UPDATE users SET active = 1 WHERE id = 'manager'; DELETE FROM staff_assignments WHERE user_id = 'manager'",
    );
    assert.equal(
      (
        await request('/api/workspace?organizationId=org-northstar', {
          headers: { Cookie },
        })
      ).status,
      403,
    );
    const hosted = createApp();
    assert.equal(
      (
        await hosted.request(
          origin + '/api/me',
          { headers: { Cookie, 'X-Role': 'compliance' } },
          env,
        )
      ).status,
      401,
    );
    assert.equal(
      (await hosted.request(origin + '/api/local/accounts', {}, env)).status,
      401,
    );
    assert.equal(
      await authenticateAccess(
        new Request(origin + '/api/me', { headers: { Cookie } }),
        env,
      ),
      null,
    );
  } finally {
    sql.close();
  }
});

test('verified but unprovisioned users fail closed', async () => {
  const { sql, env } = database();
  try {
    const app = createApp(async () => ({
      issuer: 'https://demo.cloudflareaccess.com',
      subject: 'unknown',
      expiresAt: Date.now() + 60000,
    }));
    assert.equal((await app.request(origin + '/api/me', {}, env)).status, 403);
  } finally {
    sql.close();
  }
});

test('signed assertion claims cannot override database roles or canonical origin', async () => {
  const { sql, env } = database();
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: 'test' }],
  });
  const issuer = 'https://demo.cloudflareaccess.com';
  const audience = 'a'.repeat(64);
  try {
    sql.prepare('UPDATE users SET issuer = ?').run(issuer);
    const app = createApp(async (request) => {
      try {
        return await verifyAssertion(
          request.headers.get('Cf-Access-Jwt-Assertion') ?? '',
          issuer,
          audience,
          keys,
        );
      } catch {
        return null;
      }
    });
    const token = await new SignJWT({
      type: 'app',
      role: 'compliance',
      organizationId: 'org-cedar',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('client-northstar')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(privateKey);
    const headers = { 'Cf-Access-Jwt-Assertion': token };
    const me = await app.request(origin + '/api/me', { headers }, env);
    assert.equal(me.status, 200);
    const session = await me.json();
    assert.equal(session.role, 'client');
    assert.deepEqual(
      session.organizations.map((org: { id: string }) => org.id),
      ['org-northstar'],
    );
    const bad = await app.request(
      origin + '/api/me',
      { headers: { 'Cf-Access-Jwt-Assertion': 'forged' } },
      env,
    );
    assert.equal(bad.status, 401);
    assert.equal(
      await authenticateAccess(new Request(origin + '/api/me', { headers }), {
        ...env,
        ACCESS_ISSUER: issuer,
        ACCESS_AUDIENCE: audience,
        APP_ORIGIN: 'https://canonical.example.com',
      }),
      null,
    );
  } finally {
    sql.close();
  }
});

test('authenticated assets support immutable upstream response headers', async () => {
  const { sql, env } = database();
  try {
    const app = createApp(async () => ({
      issuer: 'urn:dch:local',
      subject: 'admin',
      expiresAt: Date.now() + 60000,
    }));
    const response = await app.request(
      origin + '/',
      {},
      {
        ...env,
        ASSETS: {
          fetch: async () => fetch('data:text/html,<html>Admin shell</html>'),
        },
      },
    );
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '<html>Admin shell</html>');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  } finally {
    sql.close();
  }
});

test('hosted demo uses the same accounts with Secure cookies and canonical-host checks', async () => {
  const { sql, env } = database();
  const hostedOrigin = 'https://demo.example.com';
  const hostedEnv = { ...env, APP_ORIGIN: hostedOrigin };
  const app = createLocalApp(true);
  try {
    const accounts = await app.request(
      hostedOrigin + '/api/local/accounts',
      {},
      hostedEnv,
    );
    assert.equal(accounts.status, 200);
    assert.equal((await accounts.json()).length, 5);
    const login = await app.request(
      hostedOrigin + '/api/local/session',
      {
        method: 'POST',
        headers: { ...mutationHeaders, Origin: hostedOrigin },
        body: JSON.stringify({ accountId: 'client-cedar' }),
      },
      hostedEnv,
    );
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')!;
    assert.match(cookie, /Secure/);
    assert.match(cookie, /HttpOnly/);
    const headers = { Cookie: cookie.split(';')[0]! };
    const workspace = await app.request(
      hostedOrigin + '/api/workspace',
      { headers },
      hostedEnv,
    );
    assert.equal(workspace.status, 200);
    assert.equal((await workspace.json()).scenarios.length, 0);
    assert.equal(
      (
        await app.request(
          hostedOrigin + '/api/workspace?organizationId=org-northstar',
          { headers },
          hostedEnv,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await app.request(
          'https://other.example.com/api/local/accounts',
          {},
          hostedEnv,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await app.request(
          'https://other.example.com/api/me',
          { headers },
          hostedEnv,
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await app.request(
          hostedOrigin + '/api/local/logout',
          {
            method: 'POST',
            headers: {
              ...mutationHeaders,
              Origin: 'https://other.example.com',
              ...headers,
            },
            body: '{}',
          },
          hostedEnv,
        )
      ).status,
      403,
    );
  } finally {
    sql.close();
  }
});
