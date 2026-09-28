import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import type { PreviewCase } from '../../fixtures/scenarios';
import type { Session } from '../contracts/session';
import { statusLabels } from '../domain/case';
import type { WorkspaceRole } from '../domain/case';
import type { HealthResponse } from '../contracts/health';

const workspaces = {
  client: {
    name: 'Client',
    title: 'Your document workspace',
    subtitle:
      'A clear view of your document packages, progress, and next steps.',
    queue: 'My cases',
    initials: 'ND',
    person: 'Northstar Demo Ltd',
    label: 'Corporate client',
    icon: FolderOpen,
  },
  manager: {
    name: 'Manager',
    title: 'Keep every case moving',
    subtitle:
      'Review document packages and guide clients through the next step.',
    queue: 'Client cases',
    initials: 'AM',
    person: 'Alex Morgan',
    label: 'Relationship manager · fictional',
    icon: ListChecks,
  },
  compliance: {
    name: 'Compliance',
    title: 'Review with the full picture',
    subtitle:
      'Bring documents, findings, and review decisions together in one place.',
    queue: 'Review queue',
    initials: 'JT',
    person: 'Jamie Taylor',
    label: 'Compliance officer · fictional',
    icon: ShieldCheck,
  },
};

function getRoute(role: WorkspaceRole, scenarios: PreviewCase[]) {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const isRoot = parts.length === 0;
  const section = parts[2] ?? 'cases';
  const selected =
    section === 'cases'
      ? scenarios.find((item) => item.id === parts[3])
      : undefined;
  const invalid =
    !isRoot &&
    (parts[0] !== 'workspace' ||
      parts[1] !== role ||
      !['cases', 'workflow', 'guide'].includes(section) ||
      parts.length > 4 ||
      (parts.length === 4 && !selected));
  return { role, section, selected, invalid };
}

export function PreviewApp({
  session,
  scenarios,
  onLogout,
}: {
  session: Session;
  scenarios: PreviewCase[];
  onLogout: () => void;
}) {
  const role = session.role as WorkspaceRole;
  const { section, selected, invalid } = getRoute(role, scenarios);
  const workspace = workspaces[role];
  const base = `/workspace/${role}`;
  const [search, setSearch] = useState('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>(
    'checking',
  );
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/health', { signal: controller.signal })
      .then(async (response) => {
        const result: Partial<HealthResponse> = await response.json();
        setApiStatus(
          response.ok &&
            result.status === 'ok' &&
            result.service === 'digital-compliance-hub'
            ? 'online'
            : 'offline',
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setApiStatus('offline');
      });
    return () => controller.abort();
  }, []);
  const visibleCases = scenarios.filter((item) =>
    `${item.id} ${item.title} ${item.scenario}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Digital Compliance Hub home">
          <span className="brand-mark">
            <FileCheck2 size={24} />
          </span>
          <span>
            compliance
            <span className="brand-secondary">
              hub<span className="brand-dot">.</span>
            </span>
          </span>
        </a>
        <div className="bank-label">
          <span className="bank-monogram">N</span>
          <div>
            Northstar Demo Bank<small>Fictional institution</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          <a
            className={section === 'cases' ? 'nav-link active' : 'nav-link'}
            href={`${base}/cases`}
          >
            <LayoutDashboard size={18} />
            {workspace.queue}
            <span className="nav-count">{scenarios.length}</span>
          </a>
          <a
            className={section === 'workflow' ? 'nav-link active' : 'nav-link'}
            href={`${base}/workflow`}
          >
            <Workflow size={18} />
            Review process
          </a>
          <a
            className={section === 'guide' ? 'nav-link active' : 'nav-link'}
            href={`${base}/guide`}
          >
            <CircleHelp size={18} />
            Demo guide
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <LockKeyhole size={18} />
            <div>
              Built around trust<small>Synthetic documents only</small>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">
              {session.displayName
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </span>
            <div>
              {session.displayName}
              <small>
                {session.organizations.map((org) => org.name).join(', ') ||
                  workspace.label}
              </small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <ChevronRight size={14} />
            <strong>{workspace.name}</strong>
          </div>
          <div className="preview-controls">
            <span className="preview-pill">
              <span />
              {session.mode === 'local'
                ? 'Local test session'
                : 'Verified session'}
            </span>
            <button className="button subtle" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </header>
        <main id="main" className="content">
          <div className="demo-banner">
            <span>
              <Sparkles size={16} />
              <strong>Demo — synthetic data</strong>
              <span className="banner-detail">
                Explore the workspace with fictional cases.
              </span>
            </span>
            <span className="foundation-label">Phase 2 / Identity</span>
          </div>
          {invalid ? (
            <section className="empty-state panel">
              <h1>Page not found</h1>
              <p>This page is unavailable in your workspace.</p>
              <a href={`${base}/cases`} className="button">
                Back to cases <ArrowRight size={16} />
              </a>
            </section>
          ) : selected ? (
            <>
              <a className="back-link" href={`${base}/cases`}>
                <ArrowLeft size={16} />
                Back to {workspace.queue.toLowerCase()}
              </a>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{selected.id} · SCENARIO PREVIEW</p>
                  <h1>{selected.title}</h1>
                  <p>
                    {selected.company} · {selected.amount}
                  </p>
                </div>
                <span className={`status status-${selected.status}`}>
                  {statusLabels[selected.status]}
                </span>
              </div>
              <div className="detail-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Document package</h2>
                    <span className="muted">Outline only</span>
                  </div>
                  <div className="document-list">
                    {selected.documents.map((document) => (
                      <div className="document-row" key={document}>
                        <span className="file-icon">
                          <FileText size={21} />
                        </span>
                        <div>
                          <strong>{document}</strong>
                          <small>Synthetic fixture planned for Phase 3</small>
                        </div>
                        <ArrowDownToLine size={18} className="muted" />
                      </div>
                    ))}
                  </div>
                  <div className="panel-note">
                    Uploads and downloads become available in Phase 3.
                  </div>
                </section>
                <section className="panel detail-summary">
                  <p className="eyebrow">NEXT STEP</p>
                  <h2>{selected.nextAction}</h2>
                  <p>{selected.note}</p>
                  <div className="outcome">
                    <Check size={18} />
                    <p>{selected.expectedOutcome}</p>
                  </div>
                </section>
              </div>
              <section className="scope-note">
                <LockKeyhole size={18} />
                <p>
                  This is a read-only scenario outline. No case has been
                  submitted, reviewed, or approved. Review actions arrive in
                  Phase 4.
                </p>
              </section>
            </>
          ) : section === 'workflow' ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ONE CONNECTED PROCESS</p>
                  <h1>From documents to a decision.</h1>
                  <p>Every stage has a clear owner and a visible next step.</p>
                </div>
              </div>
              <section className="panel process-list">
                {[
                  [
                    '01',
                    'Client prepares a case',
                    'Draft → Submitted',
                    'Add case details and at least one supplied document. A missing contract can be identified during manager review.',
                  ],
                  [
                    '02',
                    'Manager checks the package',
                    'Submitted → ManagerReview',
                    'Check completeness and request any missing documents, or forward the case to compliance.',
                  ],
                  [
                    '03',
                    'Compliance reviews the evidence',
                    'ManagerReview → ComplianceReview',
                    'Review the exact document versions, record internal findings, and publish any correction request.',
                  ],
                  [
                    '04',
                    'Client responds when needed',
                    'AwaitingClient → ManagerReview',
                    'Upload the corrected version and resubmit. The manager rechecks before returning the case to compliance.',
                  ],
                  [
                    '05',
                    'Officer records the decision',
                    'ComplianceReview → Approved / Rejected',
                    'Record a human decision and its reason. The reviewed versions and history remain preserved.',
                  ],
                ].map(([number, title, states, description]) => (
                  <article className="process-step" key={number}>
                    <span className="step-number">{number}</span>
                    <div>
                      <h2>{title}</h2>
                      <p>{description}</p>
                      <span className="state-path">{states}</span>
                    </div>
                  </article>
                ))}
              </section>
              <p className="footnote">
                Planned workflow. State changes will be implemented in Phases
                3–4. Approval concerns document review, not payment execution.
              </p>
            </>
          ) : section === 'guide' ? (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">A SMALL, FOCUSED PROOF OF CONCEPT</p>
                  <h1>Explore your workspace.</h1>
                  <p>
                    Three workspaces. Three scenarios. One shared review
                    process.
                  </p>
                </div>
              </div>
              <div className="guide-grid">
                <section className="panel guide-card">
                  <span className="feature-icon">
                    <LayoutDashboard />
                  </span>
                  <h2>What works today</h2>
                  <p>
                    Sign in with your assigned role, search authorized examples,
                    and open scenario outlines within your organization access.
                  </p>
                  <a href={`${base}/cases`} className="text-link">
                    Explore cases <ArrowRight size={16} />
                  </a>
                </section>
                <section className="panel guide-card">
                  <span className="feature-icon">
                    <ShieldCheck />
                  </span>
                  <h2>What comes next</h2>
                  <p>
                    Phase 3 adds stored cases and files. Phase 4 connects the
                    complete review journey.
                  </p>
                  <a href={`${base}/workflow`} className="text-link">
                    See the review process <ArrowRight size={16} />
                  </a>
                </section>
                <section className="panel guide-card">
                  <span className="feature-icon">
                    <FileText />
                  </span>
                  <h2>All data is fictional</h2>
                  <p>
                    These records illustrate complete, missing-document, and
                    amount-mismatch scenarios. No banking documents or personal
                    customer data are accepted.
                  </p>
                </section>
              </div>
              <section className="scope-note">
                <LockKeyhole size={18} />
                <p>
                  Your role and organization access come from server records.
                  Test-account sign-in is available only during development;
                  hosted access requires Cloudflare Access and an invited
                  account.
                </p>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">
                    {workspace.name.toUpperCase()} WORKSPACE
                  </p>
                  <h1>{workspace.title}</h1>
                  <p>{workspace.subtitle}</p>
                </div>
                <a className="button subtle" href={`${base}/workflow`}>
                  How review works <ArrowUpRight size={17} />
                </a>
              </div>
              <section
                className="overview-grid"
                aria-label="Demo scenario overview"
              >
                <div className="overview-card">
                  <span className="overview-icon">
                    <FolderOpen size={21} />
                  </span>
                  <div>
                    <span className="metric">
                      {String(scenarios.length).padStart(2, '0')}
                    </span>
                    <span className="metric-label">Example cases</span>
                  </div>
                  <span className="metric-note">Read-only fixtures</span>
                </div>
                <div className="overview-card">
                  <span className="overview-icon amber">
                    <FileText size={21} />
                  </span>
                  <div>
                    <span className="metric">
                      {scenarios.length ? '01' : '00'}
                    </span>
                    <span className="metric-label">Correction scenario</span>
                  </div>
                  <span className="metric-note">Missing contract</span>
                </div>
                <div className="overview-card">
                  <span className="overview-icon blue">
                    <ShieldCheck size={21} />
                  </span>
                  <div>
                    <span className="metric">
                      {scenarios.length ? '01' : '00'}
                    </span>
                    <span className="metric-label">Review scenario</span>
                  </div>
                  <span className="metric-note">Amount mismatch</span>
                </div>
              </section>
              <section className="panel cases-panel">
                <div className="panel-heading">
                  <div>
                    <h2>{workspace.queue}</h2>
                    <p>Fictional packages for exploring the review journey.</p>
                  </div>
                  <label className="search">
                    <Search size={17} />
                    <input
                      aria-label="Search example cases"
                      placeholder="Search cases…"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>CASE / DOCUMENT PACKAGE</th>
                        <th>SCENARIO</th>
                        <th>EXAMPLE STATUS</th>
                        <th>AMOUNT</th>
                        <th>
                          <span className="sr-only">Open</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCases.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <a
                              className="case-link"
                              href={`${base}/cases/${item.id}`}
                            >
                              <span className="file-icon">
                                <FileText size={21} />
                              </span>
                              <span>
                                <strong>{item.title}</strong>
                                <small>
                                  {item.id} <span>·</span> {item.company}
                                </small>
                              </span>
                            </a>
                          </td>
                          <td>
                            <span className="scenario-name">
                              {item.scenario}
                            </span>
                          </td>
                          <td>
                            <span className={`status status-${item.status}`}>
                              {statusLabels[item.status]}
                            </span>
                          </td>
                          <td className="amount">{item.amount}</td>
                          <td>
                            <a
                              className="open-case"
                              href={`${base}/cases/${item.id}`}
                              aria-label={`Open ${item.id}`}
                            >
                              <ChevronRight size={18} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visibleCases.length === 0 && (
                    <div className="empty-state">
                      <Search size={24} />
                      <h3>No matching examples</h3>
                      <p>Try a case number, title, or scenario name.</p>
                      <button
                        className="button subtle"
                        onClick={() => setSearch('')}
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    {visibleCases.length} of {scenarios.length} example cases
                  </span>
                  <span>Illustrative statuses · no live activity</span>
                </div>
              </section>
              <section className="journey-panel">
                <div>
                  <span className="eyebrow">A CLEAR PATH FOR EVERY CASE</span>
                  <h2>
                    Less back-and-forth.
                    <br />
                    More shared understanding.
                  </h2>
                  <p>
                    One place to prepare, review, and follow a document package.
                  </p>
                  <a href={`${base}/workflow`} className="text-link">
                    Explore the review process <ArrowRight size={16} />
                  </a>
                </div>
                <div className="journey-stages">
                  {[
                    ['01', 'Client', 'Prepare & submit', FolderOpen],
                    ['02', 'Manager', 'Check & coordinate', ListChecks],
                    ['03', 'Compliance', 'Review & decide', ShieldCheck],
                  ].map(([number, title, description, Icon]) => {
                    const StageIcon = Icon as typeof FolderOpen;
                    return (
                      <div className="journey-stage" key={String(number)}>
                        <div className="stage-top">
                          <StageIcon size={22} />
                          <span>{String(number)}</span>
                        </div>
                        <strong>{String(title)}</strong>
                        <small>{String(description)}</small>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>
              Digital Compliance Hub <span className="footer-divider">/</span>{' '}
              Identity & access POC
            </span>
            <span className={`api-state ${apiStatus}`}>
              <span />
              {apiStatus === 'online'
                ? 'API connected'
                : apiStatus === 'offline'
                  ? 'API unavailable'
                  : 'Checking API…'}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
