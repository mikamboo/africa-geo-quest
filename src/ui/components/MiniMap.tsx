import { useTranslation } from 'react-i18next';
import type { Point } from '../../core/geometry';
import type { GameData } from '../../data/gameData';
import silhouette from '../../data/generated/silhouette.json';

/** Repère permanent : où suis-je sur le continent ? Un clic bascule la vue d'ensemble. */
export function MiniMap({
  data,
  position,
  onToggle,
}: {
  data: GameData;
  position: Point | null;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const { minX, minY, scale, d } = silhouette;
  const { bounds } = data.world;
  const x = (bounds.minX - minX) * scale;
  const y = (bounds.minY - minY) * scale;
  const w = (bounds.maxX - bounds.minX) * scale;
  const h = (bounds.maxY - bounds.minY) * scale;
  return (
    <button
      type="button"
      className="minimap"
      data-testid="minimap"
      aria-label={t('hud.overview')}
      title={t('hud.overview')}
      onClick={onToggle}
    >
      <svg viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true">
        <path d={d} className="minimap__land" />
        {position && (
          <circle
            cx={(position.x - minX) * scale}
            cy={(position.y - minY) * scale}
            r={w * 0.035}
            className="minimap__dot"
          />
        )}
      </svg>
    </button>
  );
}
