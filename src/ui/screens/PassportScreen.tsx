import { useTranslation } from 'react-i18next';
import { REGIONS, type GameCatalog } from '../../core/catalog';
import { discoveredPercent, regionProgress } from '../../core/progress';
import type { Locale } from '../../core/types';
import { COUNTRIES } from '../../data/gameData';
import { useGameStore } from '../store';

const BASIC_CATALOG: GameCatalog = { countries: COUNTRIES, places: [], rivers: [], neighbors: {} };

export function PassportScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const progress = useGameStore((state) => state.progress);
  const navigate = useGameStore((state) => state.navigate);
  const percent = discoveredPercent(progress, BASIC_CATALOG);
  const regions = regionProgress(progress, BASIC_CATALOG);
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <main className="page" data-testid="passport-screen">
      <div className="band" aria-hidden="true" />
      <div className="page__head">
        <h1>{t('passport.title')}</h1>
        <button type="button" className="btn" onClick={() => navigate('home')}>
          {t('common.back')}
        </button>
      </div>
      <section className="panel">
        <p data-testid="passport-percent" data-percent={percent}>
          <strong>{t('passport.percent', { percent })}</strong>
        </p>
        <div
          className="meter"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('passport.percent', { percent })}
        >
          <div className="meter__fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="passport-summary">
          <span>{t('passport.places', { count: progress.discoveredPlaces.length })}</span>
          <span>{t('passport.rivers', { count: progress.crossedRivers.length })}</span>
          <span>{t('passport.missions', { count: progress.missionsCompleted })}</span>
          <span>{t('passport.points', { count: progress.points })}</span>
        </div>
      </section>
      <section className="panel">
        <h2>{t('passport.badges')}</h2>
        <div className="badges">
          {regions.map((entry) => (
            <div
              key={entry.region}
              className={`badge${entry.complete ? ' is-earned' : ''}`}
              data-testid={`badge-${entry.region}`}
              data-earned={entry.complete}
            >
              <span className="badge__seal" aria-hidden="true">
                {entry.complete ? '★' : `${entry.visited}/${entry.total}`}
              </span>
              <span>{t(`region.${entry.region}`)}</span>
              <span className="sr-only">
                {entry.complete
                  ? t('passport.earned')
                  : t('passport.badgeProgress', { visited: entry.visited, total: entry.total })}
              </span>
            </div>
          ))}
        </div>
      </section>
      {REGIONS.map((region) => (
        <section key={region} className="stamps-region">
          <h2>{t(`region.${region}`)}</h2>
          <div className="stamps">
            {COUNTRIES.filter((country) => country.region === region)
              .sort((a, b) => a.names[locale].localeCompare(b.names[locale], locale))
              .map((country) => {
                const date = progress.stamps[country.code];
                return (
                  <article
                    key={country.code}
                    className={`stamp ${date ? 'is-done' : 'is-empty'}`}
                    data-testid={`stamp-${country.code}`}
                    data-stamped={Boolean(date)}
                  >
                    <img
                      src={`/flags/${country.iso2}.svg`}
                      alt=""
                      width="54"
                      height="40"
                      loading="lazy"
                    />
                    <span>{country.names[locale]}</span>
                    <span className={date ? 'stamp__date' : 'muted'}>
                      {date
                        ? t('passport.stamped', { date: dateFormat.format(new Date(date)) })
                        : t('passport.notYet')}
                    </span>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
    </main>
  );
}
