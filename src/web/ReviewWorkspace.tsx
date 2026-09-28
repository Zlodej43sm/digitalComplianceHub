import { useEffect, useState } from 'react';
import type { Session } from '../contracts/session.ts';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'X-CSRF-Protection': '1',
};
const checklist = [
  'documents-present',
  'fixtures-readable',
  'parties-checked',
  'amount-currency-checked',
  'dates-checked',
];
export function ReviewWorkspace({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [cases, setCases] = useState<any[]>([]),
    [detail, setDetail] = useState<any>(),
    [error, setError] = useState('');
  async function load() {
    const r = await fetch('/api/cases');
    setCases((await r.json()).cases ?? []);
  }
  async function open(id: string) {
    const [r, a] = await Promise.all([
      fetch(`/api/cases/${id}`),
      fetch(`/api/cases/${id}/analysis`),
    ]);
    const value = await r.json();
    value.analysis = a.ok ? (await a.json()).runs : [];
    setDetail(value);
  }
  useEffect(() => {
    void load();
  }, []);
  async function command(path: string, body: any) {
    setError('');
    const r = await fetch(`/api/cases/${detail.case.id}/${path}`, {
      method: path.includes('checklist') ? 'PUT' : 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    await open(detail.case.id);
    await load();
  }
  const c = detail?.case;
  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {session.role.toUpperCase()} REVIEW · SYNTHETIC DATA
          </p>
          <h1>Assigned case queue</h1>
          <p>{session.displayName}</p>
        </div>
        <button className="button subtle" onClick={onLogout}>
          Sign out
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="detail-grid">
        <section className="panel">
          <h2>Cases</h2>
          {cases.map((x) => (
            <button
              className="button subtle"
              key={x.id}
              onClick={() => void open(x.id)}
            >
              {x.title} · {x.status}
            </button>
          ))}
        </section>
        {c && (
          <section className="panel">
            <h2>{c.title}</h2>
            <p>
              {c.status} · revision {c.revision}
            </p>
            {detail.documents.map((d: any) => (
              <div key={d.version_id}>
                <p>
                  {d.kind} v{d.version} ·{' '}
                  <a href={`/api/cases/${c.id}/documents/${d.version_id}`}>
                    Download
                  </a>
                </p>
                <button
                  className="button subtle"
                  onClick={() =>
                    void command('analysis/request', {
                      versionId: d.version_id,
                    })
                  }
                >
                  Run simulated analysis
                </button>
              </div>
            ))}
            <h3>Simulated analysis</h3>
            <p className="footnote">
              Predefined fixture extraction for demonstration only. It cannot
              approve or reject a case.
            </p>
            {detail.analysis?.map((run: any) => (
              <div className="panel-note" key={run.job_id}>
                <strong>
                  {run.status}
                  {run.historical ? ' · historical version' : ''}
                </strong>
                {run.error && <p>{run.error}</p>}
                {run.summary && (
                  <>
                    <p>{run.summary}</p>
                    <p>Evidence: fixture page {run.source_page}</p>
                    {JSON.parse(run.findings ?? '[]').map((f: any) => (
                      <p key={f.code}>{f.message}</p>
                    ))}
                    {session.role === 'compliance' &&
                      c.status === 'ComplianceReview' &&
                      run.suggested_request && (
                        <button
                          className="button"
                          onClick={() =>
                            void command('compliance/request-changes', {
                              revision: c.revision,
                              message: run.suggested_request,
                            })
                          }
                        >
                          Approve and send suggested request
                        </button>
                      )}
                  </>
                )}
                {run.status === 'failed' && (
                  <button
                    className="button subtle"
                    onClick={() =>
                      void command(`analysis/${run.job_id}/retry`, {})
                    }
                  >
                    Retry analysis
                  </button>
                )}
              </div>
            ))}
            {session.role === 'manager' && c.status === 'Submitted' && (
              <button
                className="button"
                onClick={() =>
                  void command('manager/start', { revision: c.revision })
                }
              >
                Start manager review
              </button>
            )}
            {session.role === 'manager' && c.status === 'ManagerReview' && (
              <>
                <h3>Checklist</h3>
                {checklist.map((item) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={detail.checklist.some(
                        (x: any) => x.item === item && x.checked,
                      )}
                      onChange={(e) =>
                        void command('manager/checklist', {
                          item,
                          checked: e.target.checked,
                        })
                      }
                    />
                    {item.replaceAll('-', ' ')}
                  </label>
                ))}
                <button
                  className="button"
                  onClick={() =>
                    void command('manager/forward', { revision: c.revision })
                  }
                >
                  Forward to compliance
                </button>
              </>
            )}
            {['manager', 'compliance'].includes(session.role) &&
              ['ManagerReview', 'ComplianceReview'].includes(c.status) && (
                <ChangeForm
                  onSend={(message) =>
                    command(`${session.role}/request-changes`, {
                      revision: c.revision,
                      message,
                    })
                  }
                />
              )}
            {session.role === 'compliance' &&
              c.status === 'ComplianceReview' && (
                <>
                  <MessageForm
                    onSend={(body, visibility) =>
                      command('messages', { body, visibility })
                    }
                  />
                  <DecisionForm
                    onSend={(outcome, reason) =>
                      command('compliance/decision', {
                        revision: c.revision,
                        outcome,
                        reason,
                      })
                    }
                  />
                </>
              )}
            <h3>Messages</h3>
            {detail.messages.map((m: any) => (
              <p key={m.id}>
                <strong>{m.visibility}</strong> · {m.body}
              </p>
            ))}
            <h3>Audit</h3>
            {detail.audit.map((a: any, i: number) => (
              <p key={i}>
                {a.action} · {a.detail}
              </p>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
function ChangeForm({ onSend }: { onSend: (s: string) => void }) {
  return (
    <form
      className="local-login"
      onSubmit={(e) => {
        e.preventDefault();
        onSend(String(new FormData(e.currentTarget).get('message')));
      }}
    >
      <textarea
        name="message"
        required
        minLength={3}
        placeholder="Client-visible correction request"
      />
      <button className="button">Request changes</button>
    </form>
  );
}
function MessageForm({ onSend }: { onSend: (b: string, v: string) => void }) {
  return (
    <form
      className="local-login"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSend(String(f.get('body')), String(f.get('visibility')));
      }}
    >
      <textarea name="body" required placeholder="Review note" />
      <select name="visibility">
        <option value="internal">Internal</option>
        <option value="client">Client visible</option>
      </select>
      <button className="button subtle">Add note</button>
    </form>
  );
}
function DecisionForm({ onSend }: { onSend: (o: string, r: string) => void }) {
  return (
    <form
      className="local-login"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSend(String(f.get('outcome')), String(f.get('reason')));
      }}
    >
      <select name="outcome">
        <option>Approved</option>
        <option>Rejected</option>
      </select>
      <textarea
        name="reason"
        required
        minLength={3}
        placeholder="Decision reason"
      />
      <button className="button">Record final decision</button>
    </form>
  );
}
