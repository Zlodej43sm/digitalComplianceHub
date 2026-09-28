import hostedApp from '../../api/app';

// Vite replaces this at compile time. Production cannot enable test-account auth.
const app = import.meta.env.DEV
  ? (await import('./local-identity')).createLocalApp()
  : hostedApp;
export default app;
