import { useEffect, useState } from 'react';
import type { Session } from '../contracts/session.ts';
import { DashboardCards, EmptyState, ErrorState, StateSummary, WorkspaceHeader, type Dashboard } from './DemoUi.tsx';
import { statusText, useI18n, type TranslationKey } from './i18n.tsx';

const jsonHeaders = { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' };
const checklist: [string, TranslationKey][] = [['documents-present', 'documentsPresent'], ['fixtures-readable', 'fixturesReadable'], ['parties-checked', 'partiesChecked'], ['amount-currency-checked', 'amountChecked'], ['dates-checked', 'datesChecked']];
const analysisBadgeKey = (status: string) => `analysisBadge${status.charAt(0).toUpperCase()}${status.slice(1)}` as TranslationKey;

export function ReviewWorkspace({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { language, t } = useI18n();
  const [cases, setCases] = useState<any[]>([]), [detail, setDetail] = useState<any>(), [dashboard, setDashboard] = useState<Dashboard | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === 'uk' ? 'uk-UA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  const next = (status: string) => session.role === 'manager' ? (status === 'Submitted' ? t('nextManagerSubmitted') : status === 'ManagerReview' ? t('nextManagerReview') : t('nextManagerWait')) : (status === 'ComplianceReview' ? t('nextComplianceReview') : t('nextComplianceWait'));

  async function open(id: string) {
    setError('');
    const [caseResponse, analysisResponse] = await Promise.all([fetch(`/api/cases/${encodeURIComponent(id)}`), fetch(`/api/cases/${encodeURIComponent(id)}/analysis`)]);
    if (!caseResponse.ok) return setError(caseResponse.status === 401 ? t('sessionExpired') : t('serviceUnavailable'));
    const value = await caseResponse.json(); value.analysis = analysisResponse.ok ? (await analysisResponse.json()).runs : []; setDetail(value);
    history.replaceState(null, '', `#case=${encodeURIComponent(id)}`);
  }
  async function load() {
    setLoading(true); setError('');
    try {
      const [caseResponse, dashboardResponse] = await Promise.all([fetch('/api/cases'), fetch('/api/dashboard')]);
      if (!caseResponse.ok || !dashboardResponse.ok) throw new Error(t('serviceUnavailable'));
      const data = await caseResponse.json(); setCases(data.cases ?? []); setDashboard(await dashboardResponse.json());
      const requested = new URLSearchParams(location.hash.replace(/^#/, '')).get('case');
      if (requested && data.cases.some((item: any) => item.id === requested)) await open(requested);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function command(path: string, body: any) {
    if (!detail?.case || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/cases/${detail.case.id}/${path}`, { method: path.includes('checklist') ? 'PUT' : 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || t('actionFailed'));
      await open(detail.case.id); await load();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }
  const c = detail?.case;

  return <main className="content">
    <WorkspaceHeader session={session} onLogout={onLogout} /><DashboardCards dashboard={dashboard} />
    {error && <ErrorState message={error} onRetry={() => void load()} />}
    <div className="workspace-grid">
      <aside className="workspace-sidebar"><section className="panel"><h2>{t('cases')}</h2>{loading ? <p role="status">{t('loading')}</p> : cases.length ? <div className="case-list">{cases.map((item) => <button className={`case-row ${c?.id === item.id ? 'active' : ''}`} key={item.id} onClick={() => void open(item.id)}><strong>{item.title}</strong><span>{statusText(item.status, t)} · {next(item.status)}</span></button>)}</div> : <EmptyState>{t('noCasesReview')}</EmptyState>}</section></aside>
      <section className="panel case-detail">{!c ? <EmptyState>{t('selectCase')}</EmptyState> : <>
        <h2>{c.title}</h2><StateSummary status={c.status} next={next(c.status)} /><p className="case-meta">{c.currency} {(c.amount_minor / 100).toLocaleString(language === 'uk' ? 'uk-UA' : 'en-GB', { minimumFractionDigits: 2 })} · {t('revision')} {c.revision}</p>
        <section className="detail-section"><h3>{t('documents')}</h3>{detail.documents.map((document: any) => { const run = detail.analysis?.find((r: any) => r.version_id === document.version_id); return <article className="document-row" key={document.version_id}><div><strong>{document.kind === 'contract' ? t('contract') : t('invoice')} · v{document.version}</strong><span>{formatDate(document.uploaded_at)}</span>{run && <span className="badge">{t(analysisBadgeKey(run.status))}</span>}</div><div className="row-actions"><a className="button subtle" href={`/api/cases/${c.id}/documents/${document.version_id}`}>{t('download')}</a><button className="button subtle" disabled={busy || !!run} onClick={() => void command('analysis/request', { versionId: document.version_id })}>{t('runAnalysis')}</button></div></article>; })}</section>
        <section className="detail-section"><h3>{t('analysis')}</h3><p className="footnote">{t('analysisHelp')}</p>{detail.analysis?.length ? detail.analysis.map((run: any) => <article className="analysis-result" key={run.job_id}><strong>{run.status}{run.historical ? ` · ${t('historical')}` : ''}</strong>{run.error && <p>{run.error}</p>}{run.summary && <><p>{run.summary}</p><p>{t('evidence')} {run.source_page}</p>{JSON.parse(run.findings ?? '[]').map((finding: any) => <p key={finding.code}>{finding.message}</p>)}{session.role === 'compliance' && c.status === 'ComplianceReview' && run.suggested_request && <button className="button" disabled={busy} onClick={() => void command('compliance/request-changes', { revision: c.revision, message: run.suggested_request })}>{t('suggestedRequest')}</button>}</>}{run.status === 'failed' && <button className="button subtle" disabled={busy} onClick={() => void command(`analysis/${run.job_id}/retry`, {})}>{t('retryAnalysis')}</button>}</article>) : <EmptyState>{t('noAnalysis')}</EmptyState>}</section>
        {session.role === 'manager' && c.status === 'Submitted' && <button className="button" disabled={busy} onClick={() => void command('manager/start', { revision: c.revision })}>{t('startReview')}</button>}
        {session.role === 'manager' && c.status === 'ManagerReview' && <section className="detail-section"><h3>{t('checklist')}</h3><div className="checklist">{checklist.map(([item, label]) => <label key={item}><input type="checkbox" disabled={busy} checked={detail.checklist.some((entry: any) => entry.item === item && entry.checked)} onChange={(event) => void command('manager/checklist', { item, checked: event.target.checked })} />{t(label)}</label>)}</div><button className="button" disabled={busy} onClick={() => void command('manager/forward', { revision: c.revision })}>{t('forward')}</button></section>}
        {['manager', 'compliance'].includes(session.role) && ['ManagerReview', 'ComplianceReview'].includes(c.status) && <ChangeForm busy={busy} onSend={(message) => command(`${session.role}/request-changes`, { revision: c.revision, message })} />}
        {session.role === 'compliance' && c.status === 'ComplianceReview' && <><MessageForm busy={busy} onSend={(body, visibility) => command('messages', { body, visibility })} /><DecisionForm busy={busy} onSend={(outcome, reason) => command('compliance/decision', { revision: c.revision, outcome, reason })} /></>}
        <section className="detail-section"><h3>{t('messages')}</h3>{detail.messages.length ? detail.messages.map((message: any) => <article className="timeline-item" key={message.id}><p><strong>{message.visibility === 'internal' ? t('internal') : t('clientVisible')}</strong> · {message.body}</p><time>{formatDate(message.created_at)}</time></article>) : <EmptyState>{t('noMessages')}</EmptyState>}</section>
        <section className="detail-section"><h3>{t('audit')}</h3>{detail.audit.length ? detail.audit.map((event: any, index: number) => <article className="timeline-item" key={index}><p>{event.action} · {event.detail}</p><time>{formatDate(event.created_at)}</time></article>) : <EmptyState>{t('noAudit')}</EmptyState>}</section>
      </>}</section>
    </div>
  </main>;
}

function ChangeForm({ onSend, busy }: { onSend: (value: string) => void; busy: boolean }) { const { t } = useI18n(); return <form className="form-stack inset-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; onSend(String(new FormData(form).get('message'))); form.reset(); }}><label>{t('correctionRequest')}<textarea name="message" required minLength={3} /></label><button className="button" disabled={busy}>{t('requestChanges')}</button></form>; }
function MessageForm({ onSend, busy }: { onSend: (body: string, visibility: string) => void; busy: boolean }) { const { t } = useI18n(); return <form className="form-stack inset-form" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); onSend(String(data.get('body')), String(data.get('visibility'))); form.reset(); }}><label>{t('reviewNote')}<textarea name="body" required /></label><select name="visibility" aria-label={t('reviewNote')}><option value="internal">{t('internal')}</option><option value="client">{t('clientVisible')}</option></select><button className="button subtle" disabled={busy}>{t('addNote')}</button></form>; }
function DecisionForm({ onSend, busy }: { onSend: (outcome: string, reason: string) => void; busy: boolean }) { const { t } = useI18n(); return <form className="form-stack inset-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSend(String(data.get('outcome')), String(data.get('reason'))); }}><select name="outcome" aria-label={t('recordDecision')}><option value="Approved">{t('approved')}</option><option value="Rejected">{t('rejected')}</option></select><label>{t('decisionReason')}<textarea name="reason" required minLength={3} /></label><button className="button" disabled={busy}>{t('recordDecision')}</button></form>; }
