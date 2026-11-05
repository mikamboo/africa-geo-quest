import type { TFunction } from 'i18next';
import type { Pseudonym } from '../core/progress';

export function formatPseudonym(t: TFunction, pseudonym: Pseudonym): string {
  const gender = t(`pseudo.gender.${pseudonym.animal}`);
  return t('pseudo.format', {
    animal: t(`pseudo.animal.${pseudonym.animal}`),
    adjective: t(`pseudo.adj.${pseudonym.adjective}.${gender}`),
  });
}
