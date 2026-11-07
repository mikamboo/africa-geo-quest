import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fraunces/latin-900.css';
import '@fontsource/fraunces/latin-ext-900.css';
import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import '@fontsource/atkinson-hyperlegible/latin-ext-400.css';
import '@fontsource/atkinson-hyperlegible/latin-ext-700.css';
import { initI18n } from './i18n';
import './ui/styles.css';
import { App } from './ui/App';

const container = document.getElementById('root');
if (!container) throw new Error('Élément racine #root introuvable');
initI18n()
  .then(() => {
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    container.textContent = 'Tembea could not start. Reload the page. / Recharge la page.';
  });

// Mesure d'audience facultative : ce code disparaît du build tant que le drapeau n'est pas actif.
if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
  void import('./analytics').then(({ startAnalytics }) => startAnalytics());
}
