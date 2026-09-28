import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { createApp } from '../../api/app.ts';
import type { Authenticate, Bindings } from '../../api/types.ts';

const cookieName = 'dch_local_session';
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
function localHost(request: Request, env: Bindings, allowHosted: boolean) {
  const url = new URL(request.url);
  if (allowHosted && url.protocol === 'https:' && url.origin === env.APP_ORIGIN)
    return true;
  return (
    url.protocol === 'http:' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  );
}
export function createLocalApp(allowHosted = false) {
  const authenticateLocal: Authenticate = async (request, env) => {
    if (!localHost(request, env, allowHosted)) return null;
    const token = request.headers
      .get('Cookie')
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    return env.DB.prepare(
      `SELECT u.issuer, u.subject, s.expires_at AS expiresAt FROM local_sessions s
    JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.issuer = 'urn:dch:local'`,
    )
      .bind(await hashToken(token), Date.now())
      .first<{ issuer: string; subject: string; expiresAt: number }>();
  };
  const app = createApp(authenticateLocal, 'local');
  app.use('/api/local/*', async (c, next) => {
    if (!localHost(c.req.raw, c.env, allowHosted))
      return c.json({ error: 'Not found' }, 404);
    await next();
  });
  app.get('/api/local/accounts', async (c) =>
    c.json(
      (
        await c.env.DB.prepare(
          `SELECT u.id, u.display_name AS name, m.role
    FROM users u JOIN memberships m ON m.user_id = u.id WHERE u.issuer = 'urn:dch:local' AND u.active = 1 ORDER BY u.id`,
        ).all()
      ).results,
    ),
  );
  app.post('/api/local/session', async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    if (
      !body ||
      typeof body !== 'object' ||
      !('accountId' in body) ||
      typeof body.accountId !== 'string'
    )
      return c.json({ error: 'Invalid account' }, 400);
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE id = ? AND issuer = 'urn:dch:local' AND active = 1",
    )
      .bind(body.accountId)
      .first<{ id: string }>();
    if (!user) return c.json({ error: 'Account has no access' }, 403);
    const oldToken = getCookie(c, cookieName);
    if (oldToken)
      await c.env.DB.prepare('DELETE FROM local_sessions WHERE token_hash = ?')
        .bind(await hashToken(oldToken))
        .run();
    await c.env.DB.prepare('DELETE FROM local_sessions WHERE expires_at <= ?')
      .bind(Date.now())
      .run();
    const token = Array.from(
      crypto.getRandomValues(new Uint8Array(32)),
      (byte) => byte.toString(16).padStart(2, '0'),
    ).join('');
    await c.env.DB.prepare('INSERT INTO local_sessions VALUES (?, ?, ?)')
      .bind(await hashToken(token), user.id, Date.now() + 30 * 60_000)
      .run();
    setCookie(c, cookieName, token, {
      secure: new URL(c.req.url).protocol === 'https:',
      httpOnly: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: 1800,
    });
    return c.json({ ok: true });
  });
  app.post('/api/local/logout', async (c) => {
    const token = getCookie(c, cookieName);
    if (token)
      await c.env.DB.prepare('DELETE FROM local_sessions WHERE token_hash = ?')
        .bind(await hashToken(token))
        .run();
    deleteCookie(c, cookieName, {
      path: '/',
      secure: new URL(c.req.url).protocol === 'https:',
      httpOnly: true,
      sameSite: 'Strict',
    });
    return c.json({ ok: true });
  });
  return app;
}
