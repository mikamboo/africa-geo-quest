import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-ext-400.css';
import '@fontsource/nunito/latin-ext-700.css';
import './i18n';
import './ui/styles.css';
import { App } from './ui/App';

const container = document.getElementById('root');
if (!container) throw new Error('Élément racine #root introuvable');
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
