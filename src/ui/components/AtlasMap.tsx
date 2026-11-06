import { useEffect, useState } from 'react';
import { COUNTRIES_META } from '../../data/countriesMeta';
import silhouette from '../../data/generated/silhouette.json';

interface Atlas {
  width: number;
  height: number;
  countries: Record<string, string>;
}

const REGION_BY_CODE = new Map(COUNTRIES_META.map((country) => [country.code, country.region]));

/** L'atlas du joueur : chaque pays visité prend sa couleur. Sans progression, la carte entière sert d'affiche. */
export function AtlasMap({
  stamps,
  preview = false,
}: {
  stamps: Record<string, string>;
  preview?: boolean;
}) {
  const [atlas, setAtlas] = useState<Atlas | null>(null);

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
      // La silhouette reste affichée : l'accueil n'a pas besoin de l'atlas pour fonctionner.
      .catch((error: unknown) => console.warn(error));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!atlas) {
    return (
      <svg
        className="atlas"
        viewBox={`-10 -10 ${silhouette.width + 20} ${silhouette.height + 20}`}
        aria-hidden="true"
      >
        <path d={silhouette.d} className="atlas__ghost" />
      </svg>
    );
  }
  return (
    <svg
      className="atlas"
      viewBox={`-10 -10 ${atlas.width + 20} ${atlas.height + 20}`}
      aria-hidden="true"
      data-testid="atlas-map"
    >
      {Object.entries(atlas.countries).map(([code, d]) => {
        const region = REGION_BY_CODE.get(code) ?? 'none';
        const lit = preview || Boolean(stamps[code]);
        return (
          <path
            key={code}
            d={d}
            data-code={code}
            data-lit={lit}
            className={`atlas__country svgmap__country--${region}${lit ? ' is-stamped' : ''}`}
          />
        );
      })}
    </svg>
  );
}
