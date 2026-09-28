import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { I18nProvider } from './i18n';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Application root is missing');
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <I18nProvider><App /></I18nProvider>
  </StrictMode>,
);
