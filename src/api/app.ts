import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { scenarios } from '../../fixtures/scenarios.ts';
import { authenticateAccess } from './access.ts';
import {
  allowedMutation,
  canReadOrganization,
  resolveSession,
} from './authorization.ts';
import type { AppEnv, Authenticate } from './types.ts';
import { mountCases } from './cases.ts';

export function createApp(
  authenticate: Authenticate = authenticateAccess,
  mode: 'local' | 'access' = 'access',
) {
  const app = new Hono<AppEnv>();
  app.use('*', secureHeaders());
  app.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin =
        mode === 'local' ? new URL(c.req.url).origin : c.env.APP_ORIGIN;
      if (!origin || !allowedMutation(c.req.raw, origin))
        return c.json({ error: 'Request origin rejected' }, 403);
    }
    await next();
    c.header('Cache-Control', 'no-store');
  });
  app.get('/api/health', (c) =>
    c.json({ status: 'ok', service: 'digital-compliance-hub' }),
  );
  app.use('*', async (c, next) => {
    // The demo adapter exposes account selection before session authentication.
    if (mode === 'local' && c.req.path.startsWith('/api/local/')) return next();
    if (mode === 'local' && !c.req.path.startsWith('/api')) return next();
    const identity = await authenticate(c.req.raw, c.env);
    if (!identity || identity.expiresAt <= Date.now())
      return c.json({ error: 'Sign-in required' }, 401);
    if (!c.env.DB)
      return c.json({ error: 'Identity store is not configured' }, 503);
    const session = await resolveSession(c.env.DB, identity, mode);
    if (!session) return c.json({ error: 'Account has no access' }, 403);
    c.set('session', session);
    await next();
  });
  app.get('/api/me', (c) => c.json(c.get('session')));
  app.get('/api/workspace', (c) => {
    const session = c.get('session');
    if (session.role === 'demo-admin')
      return c.json({ error: 'Business access denied' }, 403);
    const requested = c.req.query('organizationId');
    if (requested && !canReadOrganization(session, session.bankId, requested))
      return c.json({ error: 'Organization access denied' }, 403);
    // Scoped synthetic outlines only; persisted cases arrive in Phase 3.
    const examples =
      canReadOrganization(session, 'bank-demo', 'org-northstar') &&
      (!requested || requested === 'org-northstar')
        ? scenarios
        : [];
    return c.json({ scenarios: examples });
  });
  app.get('/api/admin', (c) =>
    c.get('session').role === 'demo-admin'
      ? c.json({
          message:
            'Demo administration only. Review permissions are not granted.',
        })
      : c.json({ error: 'Administration access denied' }, 403),
  );
  mountCases(app);
  app.notFound(async (c) => {
    if (!c.req.path.startsWith('/api') && c.env.ASSETS) {
      const asset = await c.env.ASSETS.fetch(c.req.raw);
      // Fetch responses may have immutable headers; middleware adds security headers.
      return new Response(asset.body, asset);
    }
    return c.json({ error: 'Not found' }, 404);
  });
  app.onError((_error, c) =>
    c.json({ error: 'Service temporarily unavailable' }, 503),
  );
  return app;
}

export default createApp();
