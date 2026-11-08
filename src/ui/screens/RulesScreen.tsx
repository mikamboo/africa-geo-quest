import { useTranslation } from 'react-i18next';
import { RULE_SECTIONS } from '../../core/rules';
import { useGameStore } from '../store';

/** Toutes les règles du jeu : le contenu vient de `core/rules.ts`, donc des constantes du jeu. */
export function RulesScreen() {
  const { t } = useTranslation();
  const navigate = useGameStore((state) => state.navigate);
  return (
    <main className="page page--narrow" data-testid="rules-screen">
      <div className="band" aria-hidden="true" />
      <div className="page__head">
        <h1>{t('rules.menu')}</h1>
        <button type="button" className="btn" onClick={() => navigate('home')}>
          {t('rules.back')}
        </button>
      </div>
      <p>{t('rules.intro')}</p>
      <nav aria-label={t('rules.contents')}>
        <ul className="rules__toc">
          {RULE_SECTIONS.map(({ id }) => (
            <li key={id}>
              <a className="btn btn--small" href={`#rules-${id}`}>
                {t(`rules.sections.${id}.title`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {RULE_SECTIONS.map(({ id, params }) => (
        <section
          key={id}
          id={`rules-${id}`}
          className="panel rules__section"
          data-testid={`rules-section-${id}`}
        >
          <h2>{t(`rules.sections.${id}.title`)}</h2>
          <p>{t(`rules.sections.${id}.body`, params)}</p>
        </section>
      ))}
    </main>
  );
}
