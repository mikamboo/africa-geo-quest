import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateMissions } from '../../core/missions';
import { project } from '../../core/projection';
import { createRng } from '../../core/rng';
import type { Locale } from '../../core/types';
import { describeMission } from '../missionText';
import { useGameStore } from '../store';
import { useGameData } from '../useGameData';

export function MissionsScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data, failed, retry } = useGameData();
  const progress = useGameStore((state) => state.progress);
  const timer = useGameStore((state) => state.settings.timer);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const navigate = useGameStore((state) => state.navigate);
  const startMission = useGameStore((state) => state.startMission);

  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const missions = useMemo(() => {
    if (!data) return [];
    return generateMissions(createRng(seed), data.catalog, {
      level: progress.level,
      from: progress.lastPosition ?? project(18.56, 4.39),
      missionsCompleted: progress.missionsCompleted,
      discoveredPlaces: progress.discoveredPlaces,
      crossedRivers: progress.crossedRivers,
    });
    // Tirage figé à l'ouverture de l'écran : la liste ne change pas sous les yeux du joueur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <main className="page" data-testid="missions-screen">
      <div className="band" aria-hidden="true" />
      <div className="page__head">
        <h1>{t('mission.title')}</h1>
        <button type="button" className="btn" onClick={() => navigate('home')}>
          {t('common.back')}
        </button>
      </div>
      <p>{t('mission.intro')}</p>
      {failed && (
        <p>
          {t('app.loadError')}{' '}
          <button type="button" className="btn btn--small" onClick={retry}>
            {t('app.retry')}
          </button>
        </p>
      )}
      {!data && !failed && <p>{t('app.loading')}</p>}
      <div className="mission-list">
        {data &&
          missions.map((mission) => {
            const text = describeMission(t, mission, data.catalog, locale);
            return (
              <article
                key={mission.id}
                className="mission-card"
                data-testid={`mission-${mission.type}`}
              >
                <div>
                  <h2>{text.title}</h2>
                  <p>{text.description}</p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => startMission(mission)}
                >
                  {t('mission.start')}
                </button>
              </article>
            );
          })}
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={timer}
          data-testid="timer-toggle"
          onChange={(event) => updateSettings({ timer: event.target.checked })}
        />
        {t('mission.timer')}
      </label>
    </main>
  );
}
