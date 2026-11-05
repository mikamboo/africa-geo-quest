import { z } from 'zod';
import type { Locale } from '../core/types';

export const factSchema = z.object({
  text: z.string().min(20),
  sourceUrl: z.url(),
  reviewStatus: z.literal('ai-draft'),
});
export const factsFileSchema = z.record(z.string().length(3), factSchema);
export type Fact = z.infer<typeof factSchema>;
export type FactsFile = z.infer<typeof factsFileSchema>;

const cache = new Map<Locale, Promise<FactsFile>>();

/** Les fiches se chargent à la demande, langue par langue. */
export function loadFacts(locale: Locale): Promise<FactsFile> {
  let pending = cache.get(locale);
  if (!pending) {
    const file =
      locale === 'fr' ? import('../../data/facts.fr.json') : import('../../data/facts.en.json');
    pending = file.then((module) => factsFileSchema.parse(module.default));
    cache.set(locale, pending);
  }
  return pending;
}
