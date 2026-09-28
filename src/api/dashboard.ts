import type { Hono } from 'hono';
import type { AppEnv } from './types.ts';

const completed = new Set(['Approved', 'Rejected']);

export function mountDashboard(app: Hono<AppEnv>) {
  app.get('/api/dashboard', async (c) => {
    const session = c.get('session');
    if (session.role === 'demo-admin')
      return c.json({ error: 'Business access denied' }, 403);
    const organizationIds = session.organizations.map((item) => item.id);
    if (!organizationIds.length)
      return c.json({
        totals: { all: 0, awaitingClient: 0, active: 0, completed: 0 },
        byStatus: {},
        completedTurnaroundHours: null,
        oldestActiveHours: null,
        generatedAt: new Date().toISOString(),
      });
    const placeholders = organizationIds.map(() => '?').join(',');
    const rows = (
      await c.env.DB.prepare(
        `SELECT c.id,COALESCE(c.workflow_status,c.status) status,c.created_at,c.updated_at,d.created_at decision_at
         FROM cases c LEFT JOIN review_decisions d ON d.case_id=c.id
         WHERE c.bank_id=? AND c.organization_id IN (${placeholders})`,
      )
        .bind(session.bankId, ...organizationIds)
        .all<{
          id: string;
          status: string;
          created_at: string;
          updated_at: string;
          decision_at: string | null;
        }>()
    ).results;
    const byStatus: Record<string, number> = {};
    let completedDuration = 0;
    let completedCount = 0;
    let oldestActive = 0;
    const now = Date.now();
    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      const started = Date.parse(row.created_at);
      if (completed.has(row.status) && row.decision_at) {
        const ended = Date.parse(row.decision_at);
        if (Number.isFinite(started) && Number.isFinite(ended) && ended >= started) {
          completedDuration += ended - started;
          completedCount += 1;
        }
      } else if (Number.isFinite(started)) {
        oldestActive = Math.max(oldestActive, now - started);
      }
    }
    const completedTotal = rows.filter((row) => completed.has(row.status)).length;
    return c.json({
      totals: {
        all: rows.length,
        awaitingClient: byStatus.AwaitingClient ?? 0,
        active: rows.length - completedTotal,
        completed: completedTotal,
      },
      byStatus,
      completedTurnaroundHours:
        completedCount > 0
          ? Math.round((completedDuration / completedCount / 3_600_000) * 10) / 10
          : null,
      oldestActiveHours:
        oldestActive > 0
          ? Math.round((oldestActive / 3_600_000) * 10) / 10
          : null,
      generatedAt: new Date().toISOString(),
    });
  });
}
