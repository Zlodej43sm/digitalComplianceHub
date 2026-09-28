import { useEffect, useState } from 'react';
import type { Session } from '../contracts/session.ts';
import { DashboardCards, EmptyState, ErrorState, StateSummary, WorkspaceHeader, type Dashboard } from './DemoUi.tsx';
import { statusText, useI18n } from './i18n.tsx';

const headers = { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' };

export function ClientCases({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { language, t } = useI18n();
  const [cases, setCases] = useState<any[]>([]), [selected, setSelected] = useState<any>(), [dashboard, setDashboard] = useState<Dashboard | null>(null), [notifications, setNotifications] = useState<any[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === 'uk' ? 'uk-UA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  async function open(id: string) {
    setError('');
    const response = await fetch(`/api/cases/${encodeURIComponent(id)}`);
    if (!response.ok) return setError(response.status === 401 ? t('sessionExpired') : t('serviceUnavailable'));
    setSelected(await response.json());
    history.replaceState(null, '', `#case=${encodeURIComponent(id)}`);
  }
  async function load() {
    setLoading(true); setError('');
    try {
      const [caseResponse, dashboardResponse, notificationResponse] = await Promise.all([fetch('/api/cases'), fetch('/api/dashboard'), fetch('/api/notifications')]);
      if (!caseResponse.ok || !dashboardResponse.ok || !notificationResponse.ok) throw new Error(t('serviceUnavailable'));
      const caseData = await caseResponse.json();
      setCases(caseData.cases ?? []); setDashboard(await dashboardResponse.json()); setNotifications((await notificationResponse.json()).notifications ?? []);
      const requested = new URLSearchParams(location.hash.replace(/^#/, '')).get('case');
      if (requested && caseData.cases.some((item: any) => item.id === requested)) await open(requested);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function mutate(request: () => Promise<Response>, after?: () => void) {
    setError('');
    try {
      const response = await request(); const body = await response.json();
      if (!response.ok) throw new Error(body.error || t('actionFailed'));
      after?.(); if (selected?.case?.id) await open(selected.case.id); await load(); return body;
    } catch (reason) { setError((reason as Error).message); }
  }
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const created = await mutate(() => fetch('/api/cases', { method: 'POST', headers, body: JSON.stringify({ title: data.get('title'), description: data.get('description'), currency: data.get('currency'), amountMinor: Math.round(Number(data.get('amount')) * 100) }) }), () => form.reset());
    if (created?.id) await open(created.id);
  }
  async function upload(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); await mutate(() => fetch(`/api/cases/${selected.case.id}/documents`, { method: 'POST', headers: { 'X-CSRF-Protection': '1' }, body: data })); }
  async function submit() { await mutate(() => fetch(`/api/cases/${selected.case.id}/submit`, { method: 'POST', headers, body: JSON.stringify({ revision: selected.case.revision }) })); }
  async function respond(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); await mutate(() => fetch(`/api/cases/${selected.case.id}/client-response`, { method: 'POST', headers, body: JSON.stringify({ body: data.get('body') }) }), () => form.reset()); }
  const next = (status: string) => status === 'Draft' ? t('nextClientDraft') : status === 'AwaitingClient' ? t('nextClientCorrection') : ['Approved', 'Rejected'].includes(status) ? t('nextClientDone') : t('nextClientWait');

  return <main className="content">
    <WorkspaceHeader session={session} onLogout={onLogout} /><DashboardCards dashboard={dashboard} />
    {error && <ErrorState message={error} onRetry={() => void load()} />}
    <div className="workspace-grid">
      <aside className="workspace-sidebar">
        <section className="panel"><h2>{t('notifications')}</h2>{notifications.length ? notifications.map((notice) => <button className="notification" key={notice.id} onClick={() => void open(notice.case_id)}><strong>{notice.message}</strong><span>{formatDate(notice.created_at)} · {t('openCase')}</span></button>) : <EmptyState>{t('noNotifications')}</EmptyState>}</section>
        <section className="panel"><h2>{t('createCase')}</h2><form className="form-stack" onSubmit={create}><label>{t('caseTitle')}<input name="title" required minLength={3} /></label><label>{t('description')}<textarea name="description" /></label><div className="form-row"><label><span className="sr-only">Currency</span><select name="currency"><option>EUR</option><option>USD</option><option>UAH</option></select></label><label>{t('amount')}<input name="amount" required type="number" min="0.01" step="0.01" /></label></div><button className="button">{t('createDraft')}</button></form></section>
        <section className="panel"><h2>{t('myCases')}</h2>{loading ? <p role="status">{t('loading')}</p> : cases.length ? <div className="case-list">{cases.map((item) => <button className={`case-row ${selected?.case?.id === item.id ? 'active' : ''}`} key={item.id} onClick={() => void open(item.id)}><strong>{item.title}</strong><span>{statusText(item.status, t)} · {next(item.status)}</span></button>)}</div> : <EmptyState>{t('noCasesClient')}</EmptyState>}</section>
      </aside>
      <section className="panel case-detail">{!selected?.case ? <EmptyState>{t('selectCase')}</EmptyState> : <>
        <h2>{selected.case.title}</h2><StateSummary status={selected.case.status} next={next(selected.case.status)} /><p className="case-meta">{selected.case.currency} {(selected.case.amount_minor / 100).toLocaleString(language === 'uk' ? 'uk-UA' : 'en-GB', { minimumFractionDigits: 2 })} · {t('revision')} {selected.case.revision}</p>
        {['Draft', 'AwaitingClient'].includes(selected.case.status) && <form className="form-stack inset-form" onSubmit={upload}><h3>{t('documents')}</h3><div className="form-row"><select name="kind" aria-label={t('documents')}><option value="contract">{t('contract')}</option><option value="invoice">{t('invoice')}</option></select><input name="file" type="file" accept="application/pdf" required /></div><button className="button">{t('uploadFixture')}</button></form>}
        <section className="detail-section"><h3>{t('versions')}</h3>{selected.documents.length ? selected.documents.map((document: any) => <article className="document-row" key={document.version_id}><div><strong>{document.kind === 'contract' ? t('contract') : t('invoice')} · v{document.version}</strong><span>{formatDate(document.uploaded_at)}</span></div><a className="button subtle" href={`/api/cases/${selected.case.id}/documents/${document.version_id}`}>{t('download')}</a></article>) : <EmptyState>{t('nextClientDraft')}</EmptyState>}</section>
        {['Draft', 'AwaitingClient'].includes(selected.case.status) && <button className="button" disabled={!selected.documents.length} onClick={() => void submit()}>{t('submitCase')}</button>}
        <section className="detail-section"><h3>{t('messages')}</h3>{selected.messages?.length ? selected.messages.map((message: any) => <article className="timeline-item" key={message.id}><p>{message.body}</p><time>{formatDate(message.created_at)}</time></article>) : <EmptyState>{t('noMessages')}</EmptyState>}{selected.case.status === 'AwaitingClient' && <form className="form-stack inset-form" onSubmit={respond}><label>{t('response')}<textarea name="body" required /></label><button className="button subtle">{t('addResponse')}</button></form>}</section>
        <section className="detail-section"><h3>{t('audit')}</h3>{selected.audit.length ? selected.audit.map((event: any, index: number) => <article className="timeline-item" key={index}><p>{event.action} · {event.detail}</p><time>{formatDate(event.created_at)}</time></article>) : <EmptyState>{t('noAudit')}</EmptyState>}</section>
      </>}</section>
    </div>
  </main>;
}
