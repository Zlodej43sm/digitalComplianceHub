import type { Session } from '../contracts/session.ts';
import { statusText, useI18n } from './i18n.tsx';

export type Dashboard = {
  totals: { all: number; awaitingClient: number; active: number; completed: number };
  byStatus: Record<string, number>;
  completedTurnaroundHours: number | null;
  oldestActiveHours: number | null;
  generatedAt: string;
};

export function WorkspaceHeader({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { language, setLanguage, t } = useI18n();
  const title = session.role === 'client' ? t('clientWorkspace') : session.role === 'manager' ? t('managerWorkspace') : t('complianceWorkspace');
  return <>
    <div className="demo-safety" role="note"><strong>{t('synthetic')}</strong><span>{t('simulated')}</span></div>
    <div className="page-heading">
      <div><p className="eyebrow">{title.toUpperCase()}</p><h1>{session.role === 'client' ? t('casesDocuments') : t('assignedQueue')}</h1><p>{session.displayName}</p></div>
      <div className="header-actions"><label>{t('language')}<select aria-label={t('language')} value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'uk')}><option value="en">{t('english')}</option><option value="uk">{t('ukrainian')}</option></select></label><button className="button subtle" onClick={onLogout}>{t('signOut')}</button></div>
    </div>
  </>;
}

export function DashboardCards({ dashboard }: { dashboard: Dashboard | null }) {
  const { t } = useI18n();
  const cards = [
    [t('active'), dashboard?.totals.active ?? '—'],
    [t('awaitingClient'), dashboard?.totals.awaitingClient ?? '—'],
    [t('completed'), dashboard?.totals.completed ?? '—'],
    [t('completedTurnaround'), dashboard?.completedTurnaroundHours == null ? t('noCompleted') : `${dashboard.completedTurnaroundHours} ${t('hours')}`],
  ];
  return <section className="metric-grid" aria-label={t('currentState')}>{cards.map(([label, value]) => <div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>;
}

export function StateSummary({ status, next }: { status: string; next: string }) {
  const { t } = useI18n();
  return <div className="state-summary"><div><span>{t('currentState')}</span><strong>{statusText(status, t)}</strong></div><div><span>{t('nextAction')}</span><strong>{next}</strong></div></div>;
}

export function EmptyState({ children }: { children: React.ReactNode }) { return <p className="empty-state">{children}</p>; }
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) { const { t } = useI18n(); return <div className="error-state" role="alert"><p>{message}</p>{onRetry && <button className="button subtle" onClick={onRetry}>{t('retry')}</button>}</div>; }
