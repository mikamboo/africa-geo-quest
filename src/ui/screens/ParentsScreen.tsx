import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FEEDBACK_REPO } from '../../core/feedback';
import { ExternalLink } from '../components/ExternalLink';
import { FeedbackButton } from '../components/Feedback';
import { useGameStore } from '../store';

export function ParentsScreen() {
  const { t } = useTranslation();
  const navigate = useGameStore((state) => state.navigate);
  const resetAll = useGameStore((state) => state.resetAll);
  const [confirming, setConfirming] = useState(false);
  return (
    <main className="page" data-testid="parents-screen">
      <div className="band" aria-hidden="true" />
      <div className="page__head">
        <h1>{t('parents.title')}</h1>
        <button type="button" className="btn" onClick={() => navigate('home')}>
          {t('common.back')}
        </button>
      </div>
      {(['teach', 'data', 'accuracy', 'borders', 'access'] as const).map((section) => (
        <section className="panel" key={section}>
          <h2>{t(`parents.${section}Title`)}</h2>
          <p>{t(`parents.${section}`)}</p>
        </section>
      ))}
      <section className="panel">
        <h2>{t('parents.sourcesTitle')}</h2>
        <p>{t('parents.sources')}</p>
        <ExternalLink href="https://www.naturalearthdata.com/">
          {t('parents.naturalEarth')}
        </ExternalLink>
      </section>
      <section className="panel" data-testid="parents-contribute">
        <h2>{t('parents.contributeTitle')}</h2>
        <p>{t('parents.contribute')}</p>
        <div className="card__actions">
          <FeedbackButton target={{ screen: 'parents' }} className="btn" />
          <ExternalLink href={`https://github.com/${FEEDBACK_REPO}/issues`}>
            {t('parents.contributeLink')}
          </ExternalLink>
        </div>
      </section>
      <section className="panel">
        <h2>{t('parents.resetTitle')}</h2>
        <p>{t('parents.resetText')}</p>
        {confirming ? (
          <div className="dialog__actions">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="reset-confirm"
              onClick={resetAll}
            >
              {t('parents.resetConfirm')}
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              {t('parents.resetCancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn"
            data-testid="reset"
            onClick={() => setConfirming(true)}
          >
            {t('parents.reset')}
          </button>
        )}
      </section>
      <p className="muted">{t('parents.legal')}</p>
    </main>
  );
}
