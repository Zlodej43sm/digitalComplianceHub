import { useEffect, useState } from 'react';
import type { Session } from '../contracts/session';
import type { PreviewCase } from '../../fixtures/scenarios';
import { PreviewApp } from './PreviewApp';
import { ClientCases } from './ClientCases';
import { ReviewWorkspace } from './ReviewWorkspace';
import { useI18n } from './i18n';

async function read<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: 'no-store' });
  if (
    !response.ok ||
    !response.headers.get('content-type')?.includes('application/json')
  ) {
    throw new Error(String(response.status));
  }
  return response.json() as Promise<T>;
}

export function App() {
  const { language, setLanguage, t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [scenarios, setScenarios] = useState<PreviewCase[]>([]);
  const [message, setMessage] = useState(t('sessionChecking'));
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
          const status = Number((error as Error).message);
          setSession(null);
          setScenarios([]);
          setMessage(status === 403 ? t('unauthorized') : status >= 500 ? t('serviceUnavailable') : t('signInRequired'));
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
  }, [t]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(
      () => {
        setSession(null);
        setScenarios([]);
        setMessage(t('sessionExpired'));
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [session, t]);

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
        throw new Error(t('actionFailed'));
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
        <h1>{t('workspaceTitle')}</h1>
        <p role="status">{message}</p>
        <label className="language-control">{t('language')}<select aria-label={t('language')} value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'uk')}><option value="en">{t('english')}</option><option value="uk">{t('ukrainian')}</option></select></label>
        {
          <section className="local-login">
            <h2>{t('demoSignIn')}</h2>
            <p>{t('demoSignInHelp')}</p>
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
                {account.name} · {t(account.role === 'client' ? 'roleClient' : account.role === 'manager' ? 'roleManager' : account.role === 'compliance' ? 'roleCompliance' : 'roleAdmin')}
              </button>
            ))}
            {!accounts.length && (
              <p>{t('seedAccounts')}</p>
            )}
          </section>
        }
        <p className="footnote">{t('synthetic')}</p>
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
          {t('signOut')}
        </button>
      </main>
    );
  if (session.role === 'client')
    return <ClientCases session={session} onLogout={logout} />;
  if (session.role === 'manager' || session.role === 'compliance')
    return <ReviewWorkspace session={session} onLogout={logout} />;
  return (
    <PreviewApp session={session} scenarios={scenarios} onLogout={logout} />
  );
}
