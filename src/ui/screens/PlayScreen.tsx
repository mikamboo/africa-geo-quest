import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { countryByCode } from '../../core/catalog';
import type { GameEvent } from '../../core/explorer';
import type { Point } from '../../core/geometry';
import { missionHint, type Mission } from '../../core/missions';
import type { RoomSpot } from '../../core/rooms';
import { currentStop, defaultRoomFor, storyById } from '../../core/stories';
import { project, unproject } from '../../core/projection';
import { hashString } from '../../core/rng';
import { NON_STATE_TERRITORY, type Locale } from '../../core/types';
import type { GameData } from '../../data/gameData';
import type { GameRendererHandle } from '../../render/GameRenderer';
import { RoomView } from '../components/RoomView';
import { CountryCard } from '../components/CountryCard';
import { Dialog } from '../components/Dialog';
import { Joystick } from '../components/Joystick';
import { Icon } from '../components/Icon';
import { MiniMap } from '../components/MiniMap';
import { listenKeyboard, readInput, readSpeedFactor, setSprintToggled } from '../input';
import { useGameStore } from '../store';
import { useGameData } from '../useGameData';
import { describeMission } from '../missionText';

const SvgMap = lazy(() =>
  import('../components/SvgMap').then((module) => ({ default: module.SvgMap })),
);

const DEFAULT_START: [number, number] = [18.56, 4.39]; // Bangui, près du centre du continent.

function useReducedMotionPreference(forced: boolean): boolean {
  const [system, setSystem] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent): void => setSystem(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return forced || system;
}

function MissionBanner({
  data,
  mission,
  position,
}: {
  data: GameData;
  mission: Mission;
  position: Point | null;
}) {
  const { t, i18n } = useTranslation();
  const currentCountry = useGameStore((state) => state.currentCountry);
  const finish = useGameStore((state) => state.finishMissionResult);
  const level = useGameStore((state) => state.progress.level);
  const mode = useGameStore((state) => state.mode);
  const hintUsed = useGameStore((state) => state.hintUsed);
  const revealHint = useGameStore((state) => state.revealHint);
  const timed = useGameStore((state) => state.settings.timer || state.mode === 'daily');
  const locale = i18n.language as Locale;
  const hint = useMemo(
    () =>
      position
        ? missionHint(
            mission,
            position,
            data.catalog,
            { nearestRiverPoint: (id, from) => data.world.nearestRiverPoint(id, from) },
            currentCountry,
          )
        : null,
    [mission, position, data, currentCountry],
  );
  const text = describeMission(t, mission, data.catalog, locale);
  // Au niveau Expert, la boussole se demande : réussir sans elle rapporte un bonus.
  const compassHidden = level === 'expert' && !hintUsed && mode !== 'daily';
  return (
    <section
      className="mission-banner"
      data-testid="mission-banner"
      data-mission={mission.id}
      aria-label={text.title}
    >
      <div>
        <p className="mission-banner__title">{text.title}</p>
        {!hint && position && <p className="mission-banner__hint">{t('mission.hintNone')}</p>}
        {hint && compassHidden && (
          <button
            type="button"
            className="link link--light"
            data-testid="ask-hint"
            onClick={revealHint}
          >
            {t('mission.askHint')}
          </button>
        )}
        {hint && !compassHidden && (
          <p
            className="mission-banner__hint"
            data-testid="mission-hint"
            data-compass={hint.compass}
          >
            {t('mission.hint', {
              distance: hint.distanceKm,
              direction: t(`mission.compass.${hint.compass}`),
            })}
          </p>
        )}
      </div>
      {timed && <Stopwatch />}
      <button
        type="button"
        className="card__close card__close--light"
        aria-label={t('mission.cancel')}
        onClick={finish}
      >
        <Icon name="close" />
      </button>
    </section>
  );
}

/** Chronomètre visible : uniquement si le joueur l'a activé, et pour le défi du jour. */
function Stopwatch() {
  const { t } = useTranslation();
  const startedAt = useGameStore((state) => state.missionStartedAt);
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.round((now - startedAt) / 1000));
  return (
    <p className="mission-banner__hint" data-testid="mission-timer">
      {t('mission.time', { seconds })}
    </p>
  );
}

/** Fin de reportage : la couverture du magazine, le moment fort de la partie. */
function Publication({ data }: { data: GameData }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const publication = useGameStore((state) => state.publication);
  const close = useGameStore((state) => state.closePublication);
  const navigate = useGameStore((state) => state.navigate);
  const story = publication ? storyById(data.stories, publication) : undefined;
  if (!story) return null;
  return (
    <Dialog
      labelledBy="cover-title"
      className="dialog--cover"
      testId="publication"
      onEscape={close}
    >
      <article className="cover">
        <p className="cover__mast">{t('stories.magazine')}</p>
        <h2 id="cover-title" className="cover__title">
          {story.title[locale]}
        </h2>
        <ul className="cover__places">
          {story.stops.map((stop) => (
            <li key={stop.placeId}>{data.world.placeById(stop.placeId)?.names[locale]}</li>
          ))}
        </ul>
      </article>
      <p className="dialog__points">{t('stories.publishedTitle')}</p>
      <p>{story.outro[locale]}</p>
      <div className="dialog__actions">
        <button type="button" className="btn btn--primary" onClick={close}>
          {t('stories.publish')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            close();
            navigate('stories');
          }}
        >
          {t('stories.more')}
        </button>
      </div>
    </Dialog>
  );
}

/** Rappel de l'étape en cours : l'indice reste visible pendant le voyage. */
function StoryBanner({ data, position }: { data: GameData; position: Point | null }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const run = useGameStore((state) => state.progress.story);
  const level = useGameStore((state) => state.progress.level);
  const hintUsed = useGameStore((state) => state.hintUsed);
  const revealHint = useGameStore((state) => state.revealHint);
  const story = run ? storyById(data.stories, run.id) : undefined;
  const stop = run ? currentStop(data.stories, run) : undefined;
  const hint = useMemo(
    () =>
      position && stop
        ? missionHint(
            { id: 'story', type: 'go-to-place', targetId: stop.placeId },
            position,
            data.catalog,
            { nearestRiverPoint: () => null },
          )
        : null,
    [position, stop, data],
  );
  if (!run || !story || !stop) return null;
  const compassHidden = level === 'expert' && !hintUsed;
  return (
    <section className="mission-banner" data-testid="story-banner" data-target={stop.placeId}>
      <div>
        <p className="mission-banner__kicker">
          {story.title[locale]} ·{' '}
          {t('stories.bannerStop', { current: run.stop + 1, total: story.stops.length })}
        </p>
        <p className="mission-banner__title mission-banner__title--clue" data-testid="story-clue">
          {stop.clue[locale]}
        </p>
        {hint && compassHidden && (
          <button
            type="button"
            className="link link--light"
            data-testid="ask-hint"
            onClick={revealHint}
          >
            {t('mission.askHint')}
          </button>
        )}
        {hint && !compassHidden && (
          <p
            className="mission-banner__hint"
            data-testid="mission-hint"
            data-compass={hint.compass}
          >
            {hint.distanceKm < 55
              ? t('stories.arrived')
              : t('mission.hint', {
                  distance: hint.distanceKm,
                  direction: t(`mission.compass.${hint.compass}`),
                })}
          </p>
        )}
      </div>
    </section>
  );
}

function MissionSuccess() {
  const { t } = useTranslation();
  const [shared, setShared] = useState<'idle' | 'done' | 'failed'>('idle');
  const result = useGameStore((state) => state.missionResult);
  const finish = useGameStore((state) => state.finishMissionResult);
  const navigate = useGameStore((state) => state.navigate);
  const timer = useGameStore((state) => state.settings.timer);
  const mode = useGameStore((state) => state.mode);
  if (!result) return null;
  return (
    <Dialog
      labelledBy="win-title"
      className="dialog--win"
      testId="mission-success"
      onEscape={finish}
    >
      <span className="win-stamp" aria-hidden="true">
        ★
      </span>
      <h2 id="win-title">{t('mission.successTitle')}</h2>
      <p className="dialog__points">{t('mission.points', { points: result.points })}</p>
      {(timer || mode === 'daily') && <p>{t('mission.time', { seconds: result.seconds })}</p>}
      {result.daily && <p>{t('mission.dailyScore', { score: result.daily.score })}</p>}
      {result.daily && (
        <button
          type="button"
          className="link"
          data-testid="share-daily"
          onClick={() => {
            const text = t('mission.shareText', {
              date: result.daily?.dateKey,
              score: result.daily?.score,
              seconds: result.daily?.seconds,
            });
            navigator.clipboard
              .writeText(text)
              .then(() => setShared('done'))
              .catch(() => setShared('failed'));
          }}
        >
          {shared === 'done'
            ? t('mission.shared')
            : shared === 'failed'
              ? t('mission.shareFailed')
              : t('mission.share')}
        </button>
      )}
      <div className="dialog__actions">
        <button type="button" className="btn btn--primary" onClick={finish}>
          {t('mission.continue')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            finish();
            navigate('missions');
          }}
        >
          {t('mission.another')}
        </button>
      </div>
    </Dialog>
  );
}

function Toasts({ data }: { data: GameData }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const toasts = useGameStore((state) => state.toasts);
  const dismiss = useGameStore((state) => state.dismissToast);
  useEffect(() => {
    if (toasts.length === 0) return;
    const first = toasts[0]!;
    const hasBlurb = first.kind === 'place' && Boolean(data.world.placeById(first.subject)?.blurb);
    const timer = window.setTimeout(() => dismiss(first.id), hasBlurb ? 9000 : 3800);
    return () => window.clearTimeout(timer);
  }, [toasts, dismiss, data]);
  return (
    <div className="toasts" data-testid="toasts">
      {toasts.map((toast) => {
        const place = toast.kind === 'place' ? data.world.placeById(toast.subject) : undefined;
        const name =
          toast.kind === 'place'
            ? place?.names[locale]
            : toast.kind === 'river'
              ? data.hydro.rivers.find((river) => river.id === toast.subject)?.names[locale]
              : toast.kind === 'lake'
                ? data.hydro.lakes.find((lake) => lake.id === toast.subject)?.names[locale]
                : toast.kind === 'badge'
                  ? t(`region.${toast.subject}`)
                  : toast.subject;
        return (
          <div key={toast.id} className={`toast toast--${toast.kind}`} data-testid="toast">
            <p>{t(`toast.${toast.kind}`, { name: name ?? toast.subject })}</p>
            {place?.blurb && <p className="toast__blurb">{place.blurb[locale]}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function PlayScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data, failed, retry } = useGameData();
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GameRendererHandle | null>(null);

  const settings = useGameStore((state) => state.settings);
  const progress = useGameStore((state) => state.progress);
  const mission = useGameStore((state) => state.mission);
  const mode = useGameStore((state) => state.mode);
  const card = useGameStore((state) => state.card);
  const currentCountry = useGameStore((state) => state.currentCountry);
  const position = useGameStore((state) => state.position);
  const terrain = useGameStore((state) => state.terrain);
  const usingFallback = useGameStore((state) => state.usingFallback);
  const startOverride = useGameStore((state) => state.startOverride);
  const navigate = useGameStore((state) => state.navigate);
  const handleEvents = useGameStore((state) => state.handleEvents);
  const updatePosition = useGameStore((state) => state.updatePosition);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const setFallback = useGameStore((state) => state.setFallback);
  const openCard = useGameStore((state) => state.openCard);
  const room = useGameStore((state) => state.room);
  const enterRoomAction = useGameStore((state) => state.enterRoom);
  const tappedPlace = useGameStore((state) => state.tappedPlace);
  const storyRun = progress.story;
  const [nearSpot, setNearSpot] = useState<RoomSpot | null>(null);
  const [sceneCard, setSceneCard] = useState(0);

  const [sprinting, setSprinting] = useState(false);
  const reducedMotion = useReducedMotionPreference(settings.reduceMotion);
  const useSvg = settings.noMovement || usingFallback;
  const level = progress.level;
  const avatar = progress.profile?.avatar ?? 'amina';

  const onEvents = useCallback(
    (events: GameEvent[]) => {
      if (data) handleEvents(events, data.catalog);
    },
    [data, handleEvents],
  );

  // Le moteur se crée une fois par partie : ses réglages évoluent ensuite par ses méthodes.
  const startRef = useRef({
    stamped: new Set(Object.keys(progress.stamps)),
    discovered: new Set(progress.discoveredPlaces),
    reducedMotion,
    start: startOverride ?? progress.lastPosition ?? project(...DEFAULT_START),
    locale,
  });

  useEffect(() => {
    if (!data || useSvg || !hostRef.current) return;
    let cancelled = false;
    let handle: GameRendererHandle | null = null;
    const host = hostRef.current;
    const initial = startRef.current;
    import('../../render/GameRenderer')
      .then(({ createGameRenderer }) =>
        createGameRenderer({
          host,
          data,
          start: initial.start,
          avatar,
          level,
          locale: initial.locale,
          stamped: initial.stamped,
          discovered: initial.discovered,
          reducedMotion: initial.reducedMotion,
          getInput: readInput,
          getSpeedFactor: readSpeedFactor,
          onEvents: (events) => handleEvents(events, data.catalog),
          onPosition: (point, currentTerrain) => updatePosition(point, currentTerrain),
        }),
      )
      .then((created) => {
        if (cancelled) {
          created.destroy();
          return;
        }
        handle = created;
        handleRef.current = created;
        // Le lieu de départ ne doit pas réussir la mission à lui seul.
        handleEvents(created.initialEvents(), data.catalog, { skipMissions: true });
      })
      .catch((error: unknown) => {
        console.warn('Rendu WebGL indisponible, passage à la carte SVG.', error);
        if (!cancelled) setFallback(true);
      });
    return () => {
      cancelled = true;
      handle?.destroy();
      handleRef.current = null;
    };
  }, [data, useSvg, avatar, level, handleEvents, updatePosition, setFallback]);

  useEffect(() => {
    if (useSvg) return undefined;
    return listenKeyboard(
      (factor) => handleRef.current?.zoomBy(factor),
      () => handleRef.current?.toggleOverview(),
    );
  }, [useSvg]);

  useEffect(() => {
    handleRef.current?.setStamped(new Set(Object.keys(progress.stamps)));
  }, [progress.stamps]);
  useEffect(() => {
    handleRef.current?.setDiscovered(new Set(progress.discoveredPlaces));
  }, [progress.discoveredPlaces]);
  useEffect(() => {
    handleRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  // Indices visuels réservés au niveau Premiers pas.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle || !data) return;
    const isExplorer = level === 'explorer';
    const storyTarget =
      !mission && progress.story ? currentStop(data.stories, progress.story) : undefined;
    const targetId =
      mission?.type === 'go-to-place' ? mission.targetId : (storyTarget?.placeId ?? null);
    const place = targetId ? data.world.placeById(targetId) : undefined;
    handle.setTarget(isExplorer && place ? { x: place.x, y: place.y } : null);
    const highlight =
      isExplorer && mission?.type === 'find-landlocked'
        ? data.catalog.countries.filter((c) => c.landlocked).map((c) => c.code)
        : isExplorer && mission?.type === 'find-island'
          ? data.catalog.countries.filter((c) => c.island).map((c) => c.code)
          : [];
    handle.setHighlight(highlight);
  }, [mission, level, data, position === null, progress.story, room]); // eslint-disable-line react-hooks/exhaustive-deps -- `position === null` relance l'effet quand le moteur vient de démarrer.

  // La bulle d'aide disparaît dès que le joueur a compris : au premier vrai déplacement.
  const firstPosition = useRef<Point | null>(null);
  useEffect(() => {
    if (!position || settings.seenTutorial) return;
    firstPosition.current ??= position;
    const moved = Math.hypot(
      position.x - firstPosition.current.x,
      position.y - firstPosition.current.y,
    );
    if (moved > 30) updateSettings({ seenTutorial: true });
  }, [position, settings.seenTutorial, updateSettings]);

  const stopTarget = data && storyRun ? currentStop(data.stories, storyRun) : undefined;

  // Le lieu où l'on peut entrer : le plus proche à portée, ou celui touché sur la carte.
  const enterable = useMemo(() => {
    if (!data || room) return null;
    if (useSvg) return tappedPlace ? (data.world.placeById(tappedPlace) ?? null) : null;
    if (!position) return null;
    const near = data.world.placesNear(position, level);
    // L'étape du reportage passe avant une ville voisine (Kinshasa et Brazzaville se touchent).
    const storyPlace = near.find((candidate) => candidate.id === stopTarget?.placeId);
    if (storyPlace) return storyPlace;
    near.sort(
      (a, b) =>
        Math.hypot(a.x - position.x, a.y - position.y) -
        Math.hypot(b.x - position.x, b.y - position.y),
    );
    return near[0] ?? null;
  }, [data, room, useSvg, tappedPlace, position, level, stopTarget]);

  const enterPlace = useCallback(() => {
    if (!enterable) return;
    const isStoryStop = stopTarget?.placeId === enterable.id;
    const theme = isStoryStop && stopTarget ? stopTarget.room : defaultRoomFor(enterable);
    enterRoomAction({ placeId: enterable.id, theme, isStoryStop });
    setSceneCard((value) => value + 1);
  }, [enterable, stopTarget, enterRoomAction]);

  // Le moteur change de scène quand le joueur entre ou sort : la carte disparaît vraiment.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    if (!room) {
      handle.exitRoom();
      return;
    }
    const look = hashString(room.placeId);
    handle.enterRoom({
      theme: room.theme,
      leadLook: room.isStoryStop && stopTarget ? stopTarget.npc.look : look % 6,
      extraLook: (look + 3) % 6,
      accent: 0xb5381f,
      onNear: setNearSpot,
    });
    // L'étape change à la fin de la conversation : la scène reste en place jusqu'à la sortie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  useEffect(() => {
    if (room || !enterable) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'KeyE') enterPlace();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [room, enterable, enterPlace]);

  const percent = useMemo(() => {
    if (!data) return 0;
    const visited = data.catalog.countries.filter((c) => progress.stamps[c.code]).length;
    return Math.round((visited / 54) * 100);
  }, [data, progress.stamps]);

  if (failed) {
    return (
      <main className="page page--narrow">
        <p>{t('app.loadError')}</p>
        <button type="button" className="btn btn--primary" onClick={retry}>
          {t('app.retry')}
        </button>
      </main>
    );
  }

  const coords = position ? unproject(position) : null;
  const inHud = currentCountry;
  const countryName =
    inHud === NON_STATE_TERRITORY
      ? locale === 'fr'
        ? 'Sahara occidental'
        : 'Western Sahara'
      : inHud && data
        ? countryByCode(data.catalog, inHud)?.names[locale]
        : null;
  const place =
    countryName ??
    (useSvg ? t('hud.pickCountry') : terrain === 'water' ? t('hud.ocean') : t('hud.outside'));

  return (
    <main
      className={`play ${useSvg ? 'play--svg' : ''}${room ? ' play--room' : ''}`}
      data-testid="play-screen"
      data-mode={mode}
    >
      <h1 className="sr-only">Tembea</h1>
      {!useSvg && <div ref={hostRef} className="play__stage" data-testid="game-stage" />}
      {useSvg && data && !room && (
        <Suspense fallback={<p className="play__loading">{t('app.loading')}</p>}>
          {usingFallback && !settings.noMovement && (
            <p className="notice" data-testid="webgl-fallback">
              {t('svg.fallback')}
            </p>
          )}
          <SvgMap
            data={data}
            level={level}
            current={currentCountry}
            stamped={progress.stamps}
            onEvents={onEvents}
          />
        </Suspense>
      )}
      {!data && <p className="play__loading">{t('app.loading')}</p>}

      {sceneCard > 0 && room && (
        <div className="scene-card" key={sceneCard} aria-hidden="true">
          <p>{t(`room.theme.${room.theme}`)}</p>
          <strong>{data?.world.placeById(room.placeId)?.names[locale]}</strong>
        </div>
      )}

      {data && room && <RoomView data={data} room={room} near={nearSpot} walking={!useSvg} />}

      {!room && (
        <header className="hud">
          <button
            type="button"
            className="btn btn--small"
            data-testid="hud-menu"
            onClick={() => navigate('home')}
          >
            {t('hud.menu')}
          </button>
          <button
            type="button"
            className="hud__place"
            data-testid="hud-country"
            data-code={currentCountry ?? ''}
            disabled={!currentCountry}
            aria-label={`${place}. ${t('hud.showCard')}`}
            onClick={() => currentCountry && openCard(currentCountry)}
          >
            {place}
          </button>
          <p
            className="hud__stat"
            data-testid="hud-percent"
            data-stamps={Object.keys(progress.stamps).length}
          >
            {t('hud.travelled', { percent })}
          </p>
          <button
            type="button"
            className="icon-btn"
            data-testid="sound-toggle"
            aria-pressed={settings.muted}
            aria-label={settings.muted ? t('hud.soundOff') : t('hud.soundOn')}
            onClick={() => updateSettings({ muted: !settings.muted })}
          >
            <Icon name={settings.muted ? 'soundOff' : 'soundOn'} />
          </button>
        </header>
      )}

      <p className="sr-only" aria-live="polite" data-testid="live-region">
        {countryName ? t('hud.entered', { name: countryName }) : ''}
      </p>

      <div className="play__panels">
        {!room && data && mission && (
          <MissionBanner data={data} mission={mission} position={position} />
        )}
        {!room && data && !mission && storyRun && <StoryBanner data={data} position={position} />}
        {!room && data && card && <CountryCard code={card} catalog={data.catalog} />}
        {data && <Toasts data={data} />}
      </div>
      <MissionSuccess />
      {data && <Publication data={data} />}

      {!room && enterable && (
        <button
          type="button"
          className="enter-prompt"
          data-testid="enter-place"
          onClick={enterPlace}
        >
          {t('hud.enter', { name: enterable.names[locale] })}
          <kbd className="enter-prompt__key">E</kbd>
        </button>
      )}

      {!useSvg && (
        <>
          {!room && (
            <div className="zoom-controls">
              <button
                type="button"
                className="icon-btn"
                aria-label={t('hud.zoomIn')}
                onClick={() => handleRef.current?.zoomBy(1.3)}
              >
                <Icon name="plus" />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('hud.zoomOut')}
                onClick={() => handleRef.current?.zoomBy(0.77)}
              >
                <Icon name="minus" />
              </button>
              <button
                type="button"
                className={`icon-btn${sprinting ? ' is-active' : ''}`}
                data-testid="sprint-toggle"
                aria-pressed={sprinting}
                aria-label={t('hud.sprint')}
                title={t('hud.sprint')}
                onClick={() => {
                  setSprintToggled(!sprinting);
                  setSprinting(!sprinting);
                }}
              >
                <Icon name="fast" />
              </button>
            </div>
          )}
          <Joystick />
          {!room && data && (
            <MiniMap
              data={data}
              position={position}
              onToggle={() => handleRef.current?.toggleOverview()}
            />
          )}
          {!room && !settings.seenTutorial && (
            <p className="coach" data-testid="tutorial">
              <span className="coach__keys">{t('hud.tutorialKeys')}</span>
              <span className="coach__touch">{t('hud.tutorialTouch')}</span>
            </p>
          )}
          {!room && (
            <footer className="hud-foot">
              <span data-testid="hud-terrain" data-terrain={terrain}>
                {terrain === 'water' ? t('hud.onWater') : t('hud.onLand')}
              </span>
              {coords && (
                <span
                  data-testid="hud-position"
                  data-lat={coords.lat.toFixed(2)}
                  data-lon={coords.lon.toFixed(2)}
                >
                  {Math.abs(coords.lat).toFixed(1)}° {coords.lat >= 0 ? 'N' : 'S'} ·{' '}
                  {Math.abs(coords.lon).toFixed(1)}° {coords.lon >= 0 ? 'E' : 'O'}
                </span>
              )}
              <span className="hud-foot__legal">{t('hud.borders')}</span>
            </footer>
          )}
        </>
      )}
    </main>
  );
}
