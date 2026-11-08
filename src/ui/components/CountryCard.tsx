import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { capitalsOf, countryByCode, type GameCatalog } from '../../core/catalog';
import type { Locale } from '../../core/types';
import { NON_STATE_TERRITORY } from '../../core/types';
import { loadFacts, type Fact } from '../../data/facts';
import { useGameStore } from '../store';
import { ExternalLink } from './ExternalLink';
import { FeedbackButton } from './Feedback';
import { Icon } from './Icon';

const AUTO_CLOSE_MS = 16_000;

export function CountryCard({ code, catalog }: { code: string; catalog: GameCatalog }) {
  const { t, i18n } = useTranslation();
  const closeCard = useGameStore((state) => state.closeCard);
  const stampDate = useGameStore((state) => state.progress.stamps[code]);
  const locale = i18n.language as Locale;
  const [fact, setFact] = useState<Fact | null>(null);
  // Pendant une contribution, la fiche ne doit pas se refermer sous les doigts du joueur.
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadFacts(locale)
      .then((facts) => {
        if (!cancelled) setFact(facts[code] ?? null);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      cancelled = true;
    };
  }, [code, locale]);

  useEffect(() => {
    if (reporting) return;
    const timer = window.setTimeout(closeCard, AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [code, closeCard, reporting]);

  const country = countryByCode(catalog, code);
  const isFresh = stampDate !== undefined;

  if (code === NON_STATE_TERRITORY || !country) {
    return (
      <aside className="card card--neutral" data-testid="country-card" data-code={code}>
        <button
          type="button"
          className="card__close"
          onClick={closeCard}
          aria-label={t('card.close')}
        >
          <Icon name="close" />
        </button>
        <h2 className="card__name" data-testid="card-name">
          {locale === 'fr' ? 'Sahara occidental' : 'Western Sahara'}
        </h2>
        <p className="card__sub">{t('card.nonState')}</p>
        <p>{t('card.nonStateText')}</p>
      </aside>
    );
  }

  const capitals = capitalsOf(catalog, code);
  const isMany = capitals.length > 1;
  const former = catalog.places.filter(
    (place) => place.country === code && place.role === 'former',
  );
  return (
    <aside className="card" data-testid="country-card" data-code={code} key={code}>
      <button
        type="button"
        className="card__close"
        onClick={closeCard}
        aria-label={t('card.close')}
      >
        <Icon name="close" />
      </button>
      <div className="card__head">
        <img
          className="card__flag"
          src={`/flags/${country.iso2}.svg`}
          alt={t('card.flagOf', { name: country.names[locale] })}
          width="84"
          height="63"
          data-testid="card-flag"
        />
        <div>
          <h2 className="card__name" data-testid="card-name">
            {country.names[locale]}
          </h2>
          <p className="card__sub">{t(`region.${country.region}`)}</p>
        </div>
        {isFresh && <span className="card__stamp" aria-hidden="true" />}
      </div>
      <p className="card__capital" data-testid="card-capital">
        <strong>{isMany ? t('card.capitals') : t('card.capital')} : </strong>
        {capitals
          .map((place) => {
            const role = place.role ? t(`card.role.${place.role}`) : '';
            return role ? `${place.names[locale]} (${role})` : place.names[locale];
          })
          .join(', ')}
        {former.length > 0 &&
          ` · ${former.map((p) => `${p.names[locale]} (${t('card.role.former')})`).join(', ')}`}
      </p>
      {fact && (
        <p className="card__fact" data-testid="card-fact">
          {fact.text}
        </p>
      )}
      <div className="card__actions">
        {fact && <ExternalLink href={fact.sourceUrl}>{t('card.source')}</ExternalLink>}
        <FeedbackButton
          target={{ screen: 'country-card', country: code }}
          onOpenChange={setReporting}
        />
      </div>
    </aside>
  );
}
