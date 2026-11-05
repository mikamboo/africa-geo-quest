import type { TFunction } from 'i18next';
import { countryByCode, type GameCatalog } from '../core/catalog';
import type { Mission } from '../core/missions';
import type { Locale } from '../core/types';

export function describeMission(
  t: TFunction,
  mission: Mission,
  catalog: GameCatalog,
  locale: Locale,
): { title: string; description: string } {
  switch (mission.type) {
    case 'go-to-place': {
      const place = catalog.places.find((candidate) => candidate.id === mission.targetId);
      const name = place?.names[locale] ?? mission.targetId;
      const country = place ? countryByCode(catalog, place.country)?.names[locale] : '';
      return {
        title: t('mission.goTo', { name }),
        description: t('mission.goToDesc', { kind: t(`kind.${place?.kind ?? 'city'}`), country }),
      };
    }
    case 'cross-river': {
      const river = catalog.rivers.find((candidate) => candidate.id === mission.targetId);
      return {
        title: t('mission.crossRiver', { name: river?.names[locale] ?? mission.targetId }),
        description: t('mission.crossRiverDesc'),
      };
    }
    case 'find-landlocked':
      return { title: t('mission.findLandlocked'), description: t('mission.findLandlockedDesc') };
    case 'find-island':
      return { title: t('mission.findIsland'), description: t('mission.findIslandDesc') };
  }
}
