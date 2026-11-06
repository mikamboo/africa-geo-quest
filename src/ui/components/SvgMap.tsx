import { useMemo, useState } from 'react';
import type { Position } from 'geojson';
import { useTranslation } from 'react-i18next';
import type { GameEvent } from '../../core/explorer';
import { project } from '../../core/projection';
import { NON_STATE_TERRITORY, type Level, type Locale } from '../../core/types';
import { COUNTRIES, type GameData } from '../../data/gameData';

interface Props {
  data: GameData;
  level: Level;
  current: string | null;
  stamped: Record<string, string>;
  onEvents: (events: GameEvent[]) => void;
}

const ZOOM_STEP = 0.72;

/** Tracés plans : mêmes coordonnées que le moteur, sans le découpage sphérique de `geoPath`. */
function lineToPath(line: Position[], close = false): string {
  const points = line.map((position) => {
    const { x, y } = project(position[0]!, position[1]!);
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `M${points.join('L')}${close ? 'Z' : ''}`;
}

function polygonsToPath(polygons: Position[][][]): string {
  return polygons.map((rings) => rings.map((ring) => lineToPath(ring, true)).join('')).join('');
}

/** Même carte pour le repli sans WebGL et le mode sans déplacement : mêmes événements que Pixi. */
export function SvgMap({ data, level, current, stamped, onEvents }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { bounds } = data.world;
  const fullWidth = bounds.maxX - bounds.minX;
  const fullHeight = bounds.maxY - bounds.minY;
  const [view, setView] = useState({
    x: bounds.minX,
    y: bounds.minY,
    w: fullWidth,
    h: fullHeight,
  });

  const paths = useMemo(
    () => ({
      countries: data.countries.map((country) => ({
        code: country.code,
        d: polygonsToPath(country.polygons),
      })),
      context: polygonsToPath(data.context),
      lakes: data.hydro.lakes.map((lake) => ({ id: lake.id, d: polygonsToPath(lake.polygons) })),
      rivers: data.hydro.rivers
        .filter((river) => level !== 'explorer' || river.level === 'explorer')
        .map((river) => ({
          id: river.id,
          name: river.names[locale],
          d: river.lines.map((line) => lineToPath(line)).join(''),
        })),
    }),
    [data, level, locale],
  );

  const meta = useMemo(() => new Map(COUNTRIES.map((c) => [c.code, c])), []);
  const places = useMemo(
    () =>
      data.places
        .filter((place) => level !== 'explorer' || place.level === 'explorer')
        .map((place) => ({ ...place, point: project(place.lon, place.lat) })),
    [data.places, level],
  );

  /** Petits pays : un disque cliquable pour rester atteignables au doigt. */
  const smallTargets = useMemo(
    () =>
      data.countries
        .filter((country) => data.world.hitRadiusOf(country.code) > 0)
        .map((country) => {
          const capital = data.places.find(
            (p) => p.country === country.code && p.kind === 'capital',
          );
          return capital ? { code: country.code, point: project(capital.lon, capital.lat) } : null;
        })
        .filter((entry) => entry !== null),
    [data],
  );

  function enter(code: string): void {
    if (code === current) {
      onEvents([{ type: 'country-entered', code, from: code, explicit: true }]);
      return;
    }
    const events: GameEvent[] = [];
    if (current) events.push({ type: 'country-left', code: current });
    events.push({ type: 'country-entered', code, from: current, explicit: true });
    onEvents(events);
  }

  function keyActivate(event: React.KeyboardEvent, action: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  function zoom(factor: number): void {
    setView((previous) => {
      const w = Math.min(fullWidth, previous.w * factor);
      const h = Math.min(fullHeight, previous.h * factor);
      return {
        x: Math.max(bounds.minX, previous.x + (previous.w - w) / 2),
        y: Math.max(bounds.minY, previous.y + (previous.h - h) / 2),
        w,
        h,
      };
    });
  }

  function pan(dx: number, dy: number): void {
    setView((previous) => ({
      ...previous,
      x: Math.max(bounds.minX, Math.min(bounds.maxX - previous.w, previous.x + dx * previous.w)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY - previous.h, previous.y + dy * previous.h)),
    }));
  }

  const unit = view.w / 800;

  return (
    <div className="svgmap" data-testid="svg-map">
      <div className="svgmap__tools">
        <label className="field">
          <span>{t('svg.chooseCountry')}</span>
          <select
            data-testid="svg-country-select"
            value=""
            onChange={(event) => {
              if (event.target.value) enter(event.target.value);
            }}
          >
            <option value="">{t('svg.choose')}</option>
            {[...COUNTRIES]
              .sort((a, b) => a.names[locale].localeCompare(b.names[locale], locale))
              .map((country) => (
                <option key={country.code} value={country.code}>
                  {country.names[locale]}
                </option>
              ))}
          </select>
        </label>
        <div className="svgmap__zoom">
          <button
            type="button"
            className="icon-btn"
            onClick={() => zoom(ZOOM_STEP)}
            aria-label={t('hud.zoomIn')}
          >
            +
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => zoom(1 / ZOOM_STEP)}
            aria-label={t('hud.zoomOut')}
          >
            −
          </button>
          <button type="button" className="icon-btn" onClick={() => pan(0, -0.2)} aria-label="↑">
            ↑
          </button>
          <button type="button" className="icon-btn" onClick={() => pan(0, 0.2)} aria-label="↓">
            ↓
          </button>
          <button type="button" className="icon-btn" onClick={() => pan(-0.2, 0)} aria-label="←">
            ←
          </button>
          <button type="button" className="icon-btn" onClick={() => pan(0.2, 0)} aria-label="→">
            →
          </button>
        </div>
      </div>
      <svg
        className="svgmap__svg"
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="group"
        aria-label={t('svg.label')}
      >
        <path d={paths.context} className="svgmap__context" fillRule="evenodd" />
        {paths.countries.map(({ code, d }) => {
          const country = meta.get(code);
          const isStamped = Boolean(stamped[code]);
          const label =
            code === NON_STATE_TERRITORY
              ? t('svg.nonState')
              : t('svg.country', { name: country?.names[locale] ?? code });
          return (
            <path
              key={code}
              d={d}
              fillRule="evenodd"
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={current === code}
              data-code={code}
              data-testid={`svg-country-${code}`}
              strokeWidth={unit * 1.2}
              className={`svgmap__country svgmap__country--${country?.region ?? 'none'}${isStamped ? ' is-stamped' : ''}${current === code ? ' is-current' : ''}`}
              onClick={() => enter(code)}
              onKeyDown={(event) => keyActivate(event, () => enter(code))}
            />
          );
        })}
        {paths.lakes.map((lake) => (
          <path key={lake.id} d={lake.d} className="svgmap__lake" />
        ))}
        {smallTargets.map((target) => (
          <circle
            key={target.code}
            cx={target.point.x}
            cy={target.point.y}
            r={unit * 9}
            className="svgmap__hit"
            aria-hidden="true"
            data-testid={`svg-hit-${target.code}`}
            onClick={() => enter(target.code)}
          />
        ))}
        {paths.rivers.map((river) => (
          <g key={river.id}>
            <path d={river.d} className="svgmap__river" strokeWidth={unit * 2.2} />
            <path
              d={river.d}
              className="svgmap__river-hit"
              strokeWidth={unit * 12}
              role="button"
              tabIndex={0}
              aria-label={t('svg.river', { name: river.name })}
              data-testid={`svg-river-${river.id}`}
              onClick={() => onEvents([{ type: 'river-crossed', id: river.id }])}
              onKeyDown={(event) =>
                keyActivate(event, () => onEvents([{ type: 'river-crossed', id: river.id }]))
              }
            />
          </g>
        ))}
        {places.map((place) => {
          const name = place.names[locale];
          const activate = (): void => {
            onEvents([{ type: 'place-reached', id: place.id }]);
          };
          return (
            <circle
              key={place.id}
              cx={place.point.x}
              cy={place.point.y}
              r={unit * (place.kind === 'capital' ? 3.6 : 2.6)}
              strokeWidth={unit * 1}
              className={`svgmap__place svgmap__place--${place.kind}`}
              role="button"
              tabIndex={0}
              aria-label={
                place.kind === 'capital' ? t('svg.capital', { name }) : t('svg.city', { name })
              }
              data-testid={`svg-place-${place.id}`}
              onClick={activate}
              onKeyDown={(event) => keyActivate(event, activate)}
            >
              <title>{name}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
