import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root is missing');
const root = createRoot(rootElement);

// Compile-time boundary: production has no workspace selector or preview module.
if (import.meta.env.DEV) {
  void import('./PreviewApp').then(({ PreviewApp }) => {
    root.render(
      <StrictMode>
        <PreviewApp />
      </StrictMode>,
    );
  });
} else {
  root.render(
    <main className="setup-page">
      <div className="brand-mark">D</div>
      <p className="eyebrow">DIGITAL COMPLIANCE HUB</p>
      <h1>Workspace setup is in progress.</h1>
      <p>
        Access will be available after identity and permissions are configured.
      </p>
      <span className="badge">Phase 1 · Foundation</span>
    </main>,
  );
}
