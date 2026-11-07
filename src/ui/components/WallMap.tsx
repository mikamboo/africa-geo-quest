import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { countryByCode, type GameCatalog } from '../../core/catalog';
import type { Locale } from '../../core/types';
import { Dialog } from './Dialog';

interface Atlas {
  width: number;
  height: number;
  countries: Record<string, string>;
}

export const WALL_MAP_POINTS = 25;

/** Activité de la carte murale : situer un pays. Une erreur montre la réponse, sans sanction. */
export function WallMap({
  target,
  catalog,
  onClose,
  onRight,
}: {
  target: string;
  catalog: GameCatalog;
  onClose: () => void;
  onRight: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/geo/atlas.json')
      .then((response) => {
        if (!response.ok) throw new Error(`Atlas indisponible : ${response.status}`);
        return response.json() as Promise<Atlas>;
      })
      .then((loaded) => {
        if (!cancelled) setAtlas(loaded);
      })
      .catch((error: unknown) => {
        console.warn(error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const name = (code: string): string => countryByCode(catalog, code)?.names[locale] ?? code;
  const solved = picked === target;

  function pick(code: string): void {
    if (solved) return;
    setPicked(code);
    if (code === target) onRight();
  }

  return (
    <Dialog labelledBy="wallmap-title" className="dialog--map" testId="wall-map" onEscape={onClose}>
      <h2 id="wallmap-title">{t('room.mapTitle')}</h2>
      <p data-testid="wall-map-ask" data-target={target}>
        {t('room.mapAsk', { name: name(target) })}
      </p>
      {failed && <p>{t('app.loadError')}</p>}
      {atlas && (
        <svg
          className="wallmap"
          viewBox={`-10 -10 ${atlas.width + 20} ${atlas.height + 20}`}
          role="group"
          aria-label={t('svg.label')}
        >
          {Object.entries(atlas.countries).map(([code, d]) => {
            const playable = Boolean(countryByCode(catalog, code));
            const reveal = picked !== null && code === target;
            return (
              <path
                key={code}
                d={d}
                className={`wallmap__country${reveal ? ' is-target' : ''}${picked === code && !solved ? ' is-wrong' : ''}`}
                {...(playable
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      'aria-label': name(code),
                      'data-testid': `wall-${code}`,
                      onClick: () => pick(code),
                      onKeyDown: (event: React.KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          pick(code);
                        }
                      },
                    }
                  : {})}
              />
            );
          })}
        </svg>
      )}
      <p role="status" data-testid="wall-map-result">
        {solved && t('room.mapRight', { points: WALL_MAP_POINTS })}
        {picked && !solved && t('room.mapWrong', { picked: name(picked) })}
      </p>
      <div className="dialog__actions">
        <button type="button" className="btn btn--primary" onClick={onClose}>
          {t('room.close')}
        </button>
      </div>
    </Dialog>
  );
}
