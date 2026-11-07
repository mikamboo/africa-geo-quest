import type { TFunction } from 'i18next';
import type { Pseudonym } from '../core/progress';

export function formatPseudonym(t: TFunction, pseudonym: Pseudonym): string {
  return t('pseudo.format', {
    role: t(`pseudo.role.${pseudonym.role}`),
    adjective: t(`pseudo.adj.${pseudonym.adjective}`),
  });
}
