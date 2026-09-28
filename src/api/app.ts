import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import type { HealthResponse } from '../contracts/health';

const app = new Hono();
app.use('*', secureHeaders());
app.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});
app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    service: 'digital-compliance-hub',
  } satisfies HealthResponse),
);
app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((_error, c) => c.json({ error: 'Internal server error' }, 500));

export default app;
