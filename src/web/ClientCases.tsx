import { useEffect, useState } from 'react';
import type { Session } from '../contracts/session.ts';

const headers = {
  'Content-Type': 'application/json',
  'X-CSRF-Protection': '1',
};
export function ClientCases({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [cases, setCases] = useState<any[]>([]),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState('');
  const load = async () => {
    const r = await fetch('/api/cases');
    const j = await r.json();
    setCases(j.cases ?? []);
  };
  useEffect(() => {
    void load();
  }, []);
  async function open(id: string) {
    const r = await fetch(`/api/cases/${id}`);
    setSelected(await r.json());
  }
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch('/api/cases', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: f.get('title'),
        description: f.get('description'),
        currency: f.get('currency'),
        amountMinor: Math.round(Number(f.get('amount')) * 100),
      }),
    });
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    e.currentTarget.reset();
    await load();
    await open(j.id);
  }
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch(`/api/cases/${selected.case.id}/documents`, {
      method: 'POST',
      headers: { 'X-CSRF-Protection': '1' },
      body: f,
    });
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    await open(selected.case.id);
  }
  async function submit() {
    const r = await fetch(`/api/cases/${selected.case.id}/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ revision: selected.case.revision }),
    });
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    await open(selected.case.id);
    await load();
  }
  return (
    <main className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CLIENT WORKSPACE · SYNTHETIC DATA</p>
          <h1>Cases and documents</h1>
          <p>{session.displayName}</p>
        </div>
        <button className="button subtle" onClick={onLogout}>
          Sign out
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="detail-grid">
        <section className="panel">
          <h2>Create case</h2>
          <form className="local-login" onSubmit={create}>
            <input
              name="title"
              required
              minLength={3}
              placeholder="Case title"
            />
            <textarea name="description" placeholder="Description" />
            <select name="currency">
              <option>EUR</option>
              <option>USD</option>
              <option>UAH</option>
            </select>
            <input
              name="amount"
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
            />
            <button className="button">Create draft</button>
          </form>
          <h2>My cases</h2>
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
        {selected?.case && (
          <section className="panel">
            <h2>{selected.case.title}</h2>
            <p>
              {selected.case.status} · revision {selected.case.revision}
            </p>
            <form className="local-login" onSubmit={upload}>
              <select name="kind">
                <option value="contract">Contract</option>
                <option value="invoice">Invoice</option>
              </select>
              <input
                name="file"
                type="file"
                accept="application/pdf"
                required
              />
              <button className="button">Upload supplied fixture</button>
            </form>
            <h3>Versions</h3>
            {selected.documents.map((d: any) => (
              <p key={d.version_id}>
                {d.kind} v{d.version} ·{' '}
                <a
                  href={`/api/cases/${selected.case.id}/documents/${d.version_id}`}
                >
                  Download
                </a>
              </p>
            ))}
            <button
              className="button"
              disabled={
                !selected.documents.length ||
                selected.case.status === 'Submitted'
              }
              onClick={() => void submit()}
            >
              Submit case
            </button>
            <h3>Audit timeline</h3>
            {selected.audit.map((a: any, i: number) => (
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
