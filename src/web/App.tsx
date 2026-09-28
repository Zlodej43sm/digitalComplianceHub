import { useEffect, useState } from 'react';
import type { Session } from '../contracts/session';
import type { PreviewCase } from '../../fixtures/scenarios';
import { PreviewApp } from './PreviewApp';

async function read<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  if (
    !response.ok ||
    !response.headers.get('content-type')?.includes('application/json')
  ) {
    throw new Error(
      response.status === 403
        ? 'Your account is not authorized.'
        : response.status >= 500
          ? 'Identity service is unavailable. Check configuration and database setup.'
          : 'Sign in to continue. Your session may have expired.',
    );
  }
  return response.json() as Promise<T>;
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [scenarios, setScenarios] = useState<PreviewCase[]>([]);
  const [message, setMessage] = useState('Checking your session…');
  const [accounts, setAccounts] = useState<
    { id: string; name: string; role: string }[]
  >([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const current = await read<Session>('/api/me');
        const data =
          current.role === 'demo-admin'
            ? { scenarios: [] }
            : await read<{ scenarios: PreviewCase[] }>('/api/workspace');
        if (active) {
          setSession(current);
          setScenarios(data.scenarios);
          setMessage('');
        }
      } catch (error) {
        if (active) {
          setSession(null);
          setScenarios([]);
          setMessage((error as Error).message);
        }
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    void read<typeof accounts>('/api/local/accounts')
      .then((value) => {
        if (active) setAccounts(value);
      })
      .catch(() => {});
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => {
        setSession(null);
        setScenarios([]);
        setMessage('Your session has expired. Sign in again.');
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session]);

  async function localAction(path: string, body = {}) {
    setBusy(true);
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Protection': '1',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok)
        throw new Error('Sign-in action failed. Please try again.');
      window.location.assign('/');
    } catch (error) {
      setMessage((error as Error).message);
      setBusy(false);
    }
  }
  function logout() {
    void localAction('/api/local/logout');
  }
  if (!session)
    return (
      <main className="setup-page">
        <div className="brand-mark">D</div>
        <p className="eyebrow">DIGITAL COMPLIANCE HUB</p>
        <h1>Your demo workspace</h1>
        <p role="status">{message}</p>
        {
          <section className="local-login">
            <h2>Demo account sign-in</h2>
            <p>
              Choose any fictional account to explore the POC. No password or
              Cloudflare login is required.
            </p>
            {accounts.map((account) => (
              <button
                className="button subtle"
                disabled={busy}
                key={account.id}
                onClick={() =>
                  void localAction('/api/local/session', {
                    accountId: account.id,
                  })
                }
              >
                {account.name} · {account.role}
              </button>
            ))}
            {!accounts.length && (
              <p>Seed the demo database to load test accounts.</p>
            )}
          </section>
        }
        <p className="footnote">POC · Synthetic data only</p>
      </main>
    );
  if (session.role === 'demo-admin')
    return (
      <main className="setup-page">
        <p className="eyebrow">DEMO ADMINISTRATION</p>
        <h1>Welcome, {session.displayName}</h1>
        <p>
          Your account has no client-document or compliance-decision
          permissions.
        </p>
        <p>
          Demo reset and administration tools will be added in a later phase.
        </p>
        <button className="button" onClick={logout}>
          Sign out
        </button>
      </main>
    );
  return (
    <PreviewApp session={session} scenarios={scenarios} onLogout={logout} />
  );
}
