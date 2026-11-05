import { useTranslation } from 'react-i18next';
import { utcDateKey } from '../../core/dates';
import { AVATAR_IDS } from '../../core/progress';
import silhouette from '../../data/generated/silhouette.json';
import { Avatar } from '../components/Avatar';
import { formatPseudonym } from '../format';
import { useGameStore } from '../store';

/** Motif géométrique original, réservé à l'interface : chevrons et points, sans reprendre de motif existant. */
function Poster() {
  const { width, height, d } = silhouette;
  return (
    <svg
      className="poster__map"
      viewBox={`-20 -20 ${width + 40} ${height + 40}`}
      aria-hidden="true"
    >
      <defs>
        <pattern id="poster-motif" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M0 22 L16 8 L32 22 L48 8 L64 22" className="poster__chevron" />
          <path d="M0 50 L16 36 L32 50 L48 36 L64 50" className="poster__chevron" />
          <circle cx="16" cy="24" r="3" className="poster__dot" />
          <circle cx="48" cy="52" r="3" className="poster__dot" />
        </pattern>
      </defs>
      <path d={d} className="poster__shadow" transform="translate(14 16)" />
      <path d={d} className="poster__land" />
      <path d={d} fill="url(#poster-motif)" />
      <path
        d={`M${width * 0.32} ${height * 0.14} C ${width * 0.2} ${height * 0.34}, ${width * 0.62} ${height * 0.38}, ${width * 0.5} ${height * 0.58} S ${width * 0.52} ${height * 0.8}, ${width * 0.5} ${height * 0.9}`}
        className="poster__trail"
      />
      <circle cx={width * 0.32} cy={height * 0.14} r="14" className="poster__pin" />
      <circle cx={width * 0.5} cy={height * 0.9} r="14" className="poster__pin" />
    </svg>
  );
}

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const progress = useGameStore((state) => state.progress);
  const recovered = useGameStore((state) => state.recovered);
  const dailyScores = useGameStore((state) => state.dailyScores);
  const settings = useGameStore((state) => state.settings);
  const navigate = useGameStore((state) => state.navigate);
  const startFree = useGameStore((state) => state.startFree);
  const startDaily = useGameStore((state) => state.startDaily);
  const dismissRecovered = useGameStore((state) => state.dismissRecovered);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const { profile } = progress;
  const best = dailyScores.find((entry) => entry.dateKey === utcDateKey(new Date()));

  function switchLocale(locale: 'fr' | 'en'): void {
    updateSettings({ locale });
    void i18n.changeLanguage(locale);
  }

  return (
    <main className={`home${profile ? '' : ' home--new'}`} data-testid="home-screen">
      <div className="band" aria-hidden="true" />
      <div className="home__top">
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
      {recovered && (
        <div className="notice" role="status" data-testid="recovered-notice">
          <span>{t('home.recovered')}</span>
          <button type="button" className="btn btn--small" onClick={dismissRecovered}>
            {t('home.ok')}
          </button>
        </div>
      )}
      <section className="poster">
        <div className="poster__text">
          <h1 className="poster__title" data-testid="app-title">
            Tembea
          </h1>
          <p className="poster__tagline">{t('app.tagline')}</p>
          {profile ? (
            <p className="poster__hello" data-testid="profile-name">
              <Avatar id={profile.avatar} size={48} />
              <span>{t('home.hello', { name: formatPseudonym(t, profile.pseudonym) })}</span>
            </p>
          ) : (
            <>
              <div className="poster__crew" aria-hidden="true">
                {AVATAR_IDS.map((id) => (
                  <Avatar key={id} id={id} size={62} />
                ))}
              </div>
              <button
                type="button"
                className="btn btn--primary btn--large"
                data-testid="start"
                onClick={() => navigate('setup')}
              >
                {t('home.start')}
              </button>
            </>
          )}
        </div>
        <Poster />
      </section>
      {profile && (
        <>
          <nav className="modes" aria-label={t('home.explore')}>
            <button
              type="button"
              className="mode mode--explore"
              data-testid="mode-explore"
              onClick={startFree}
            >
              <strong>{t('home.explore')}</strong>
              <span>{t('home.exploreDesc')}</span>
            </button>
            <button
              type="button"
              className="mode mode--missions"
              data-testid="mode-missions"
              onClick={() => navigate('missions')}
            >
              <strong>{t('home.missions')}</strong>
              <span>{t('home.missionsDesc')}</span>
            </button>
            <button
              type="button"
              className="mode mode--quiz"
              data-testid="mode-quiz"
              onClick={() => navigate('quiz')}
            >
              <strong>{t('home.quiz')}</strong>
              <span>{t('home.quizDesc')}</span>
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
              <span>{best ? t('home.dailyBest', { score: best.score }) : t('home.dailyDesc')}</span>
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
