import { countryByCode, type GameCatalog } from './catalog';
import type { GameEvent } from './explorer';

export type MissionType = 'go-to-place' | 'cross-river' | 'find-landlocked' | 'find-island';

export interface Mission {
  id: string;
  type: MissionType;
  /** Identifiant du lieu ou du fleuve visé ; vide pour une recherche par propriété. */
  targetId: string;
}

/** Vrai si l'événement accomplit la mission. Sans projection : ce module reste léger à l'accueil. */
export function missionCompletedBy(
  mission: Mission,
  event: GameEvent,
  catalog: GameCatalog,
): boolean {
  switch (mission.type) {
    case 'go-to-place':
      return event.type === 'place-reached' && event.id === mission.targetId;
    case 'cross-river':
      return event.type === 'river-crossed' && event.id === mission.targetId;
    case 'find-landlocked':
      return (
        event.type === 'country-entered' && countryByCode(catalog, event.code)?.landlocked === true
      );
    case 'find-island':
      return (
        event.type === 'country-entered' && countryByCode(catalog, event.code)?.island === true
      );
  }
}
