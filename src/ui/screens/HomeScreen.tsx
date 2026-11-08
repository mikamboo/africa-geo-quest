import { useTranslation } from 'react-i18next';
import { REGIONS } from '../../core/catalog';
import { dailyStreak, utcDateKey } from '../../core/dates';
import { dayNumber, dueItems } from '../../core/leitner';
import { AVATAR_IDS } from '../../core/progress';
import { COUNTRIES_META } from '../../data/countriesMeta';
import { AtlasMap } from '../components/AtlasMap';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { RulesDialog } from '../components/RulesDialog';
import { switchLocale as applyLocale } from '../../i18n';
import { formatPseudonym } from '../format';
import { useGameStore } from '../store';

/** Région la plus proche de son badge : un objectif concret pour la prochaine partie. */
function nextBadge(stamps: Record<string, string>) {
  const entries = REGIONS.map((region) => {
    const members = COUNTRIES_META.filter((country) => country.region === region);
    const visited = members.filter((country) => stamps[country.code]).length;
    return { region, visited, total: members.length, left: members.length - visited };
  }).filter((entry) => entry.left > 0);
  return entries.sort((a, b) => a.left - b.left)[0] ?? null;
}

export function HomeScreen() {
  const { t } = useTranslation();
  const progress = useGameStore((state) => state.progress);
  const recovered = useGameStore((state) => state.recovered);
  const dailyScores = useGameStore((state) => state.dailyScores);
  const settings = useGameStore((state) => state.settings);
  const navigate = useGameStore((state) => state.navigate);
  const startFree = useGameStore((state) => state.startFree);
  const startDaily = useGameStore((state) => state.startDaily);
  const dismissRecovered = useGameStore((state) => state.dismissRecovered);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const { profile, stamps } = progress;

  const now = new Date();
  const best = dailyScores.find((entry) => entry.dateKey === utcDateKey(now));
  const streak = dailyStreak(
    dailyScores.map((entry) => entry.dateKey),
    now,
  );
  const reviews = dueItems(progress.leitner, dayNumber(now)).length;
  const visited = COUNTRIES_META.filter((country) => stamps[country.code]).length;
  const percent = Math.round((visited / COUNTRIES_META.length) * 100);
  const badge = nextBadge(stamps);

  function switchLocale(locale: 'fr' | 'en'): void {
    updateSettings({ locale });
    void applyLocale(locale);
  }

  const dailyMeta = [
    best ? t('home.dailyBest', { score: best.score }) : null,
    streak > 0 ? t('home.streak', { count: streak }) : null,
  ].filter(Boolean);

  return (
    <main className={`home${profile ? '' : ' home--new'}`} data-testid="home-screen">
      <div className="band" aria-hidden="true" />
      <div className="home__top">
        {profile && (
          <p className="chip" data-testid="profile-name">
            <Avatar id={profile.avatar} size={30} />
            <span>{formatPseudonym(t, profile.pseudonym)}</span>
          </p>
        )}
        <div className="lang" role="group" aria-label={t('settings.language')}>
          {(['fr', 'en'] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              className={`lang__btn${settings.locale === locale ? ' is-active' : ''}`}
              aria-pressed={settings.locale === locale}
              data-testid={`lang-${locale}`}
              onClick={() => switchLocale(locale)}
            >
              {locale.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {!settings.seenRules && <RulesDialog onClose={() => updateSettings({ seenRules: true })} />}
      {recovered && (
        <div className="notice" role="status" data-testid="recovered-notice">
          <span>{t('home.recovered')}</span>
          <button type="button" className="btn btn--small" onClick={dismissRecovered}>
            {t('home.ok')}
          </button>
        </div>
      )}
      <section className="hero">
        <div className="hero__text">
          <h1
            className={`hero__title${profile ? ' hero__title--small' : ''}`}
            data-testid="app-title"
          >
            Tembea
          </h1>
          {!profile && (
            <>
              <p className="hero__tagline">{t('app.tagline')}</p>
              <p className="hero__sub">{t('app.audience')}</p>
              <button
                type="button"
                className="btn btn--primary btn--large"
                data-testid="start"
                onClick={() => navigate('setup')}
              >
                {t('home.start')}
              </button>
              <div className="hero__crew" aria-hidden="true">
                {AVATAR_IDS.map((id) => (
                  <Avatar key={id} id={id} size={48} />
                ))}
              </div>
            </>
          )}
          {profile && (
            <>
              <p className="stat" data-testid="home-progress" data-percent={percent}>
                <span className="stat__value">{percent} %</span>
                <span className="stat__label">{t('home.travelled')}</span>
              </p>
              <div className="meter" aria-hidden="true">
                <div className="meter__fill" style={{ width: `${percent}%` }} />
              </div>
              <p className="hero__sub">
                {t('home.stamps', { count: visited })}
                {badge &&
                  ` · ${t('home.nextBadge', {
                    region: t(`region.${badge.region}`),
                    visited: badge.visited,
                    total: badge.total,
                  })}`}
              </p>
              <button
                type="button"
                className="cta"
                data-testid="mode-stories"
                onClick={() => navigate('stories')}
              >
                <span>
                  <strong>{t('home.stories')}</strong>
                  <span className="cta__desc">
                    {progress.story ? t('home.storiesResume') : t('home.storiesDesc')}
                  </span>
                </span>
                <Icon name="chevron" />
              </button>
            </>
          )}
        </div>
        <AtlasMap stamps={stamps} preview={!profile} />
      </section>
      {profile && (
        <>
          <nav className="modes" aria-label={t('home.modes')}>
            <button
              type="button"
              className="mode mode--explore"
              data-testid="mode-explore"
              onClick={startFree}
            >
              <strong>{t('home.explore')}</strong>
              <span>{t('home.exploreDesc')}</span>
              <span className="mode__meta">
                {t('passport.places', { count: progress.discoveredPlaces.length })}
              </span>
            </button>
            <button
              type="button"
              className="mode mode--missions"
              data-testid="mode-missions"
              onClick={() => navigate('missions')}
            >
              <strong>{t('home.missions')}</strong>
              <span>{t('home.missionsDesc')}</span>
              <span className="mode__meta">
                {t('home.missionsDone', { count: progress.missionsCompleted })}
              </span>
            </button>
            <button
              type="button"
              className="mode mode--quiz"
              data-testid="mode-quiz"
              onClick={() => navigate('quiz')}
            >
              <strong>{t('home.quiz')}</strong>
              <span>{t('home.quizDesc')}</span>
              <span className="mode__meta" data-testid="reviews-due" data-count={reviews}>
                {reviews > 0 ? t('home.reviews', { count: reviews }) : t('home.noReviews')}
              </span>
            </button>
            <button
              type="button"
              className="mode mode--daily"
              data-testid="mode-daily"
              onClick={() => {
                void Promise.all([import('../../data/gameData'), import('../../core/daily')]).then(
                  async ([{ loadGameData }, { dailyChallenge }]) => {
                    const data = await loadGameData();
                    startDaily(dailyChallenge(utcDateKey(new Date()), data.catalog));
                  },
                );
              }}
            >
              <strong>{t('home.daily')}</strong>
              <span>{t('home.dailyDesc')}</span>
              <span className="mode__meta" data-testid="daily-meta">
                {dailyMeta.length > 0 ? dailyMeta.join(' · ') : t('home.dailyNew')}
              </span>
            </button>
          </nav>
          <div className="home__links">
            <button
              type="button"
              className="btn"
              data-testid="open-passport"
              onClick={() => navigate('passport')}
            >
              {t('home.passport')}
            </button>
            <button
              type="button"
              className="btn"
              data-testid="open-settings"
              onClick={() => navigate('settings')}
            >
              {t('home.settings')}
            </button>
          </div>
        </>
      )}
      <footer className="home__foot">
        <button
          type="button"
          className="link"
          data-testid="open-parents"
          onClick={() => navigate('parents')}
        >
          {t('home.parents')}
        </button>
        <span>{t('hud.borders')}</span>
      </footer>
    </main>
  );
}
