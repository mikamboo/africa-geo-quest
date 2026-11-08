import { describe, expect, it } from 'vitest';
import { settingsSchema } from '../src/data/localRepositories';

describe('réglages', () => {
  it('les règles du jeu sont à afficher par défaut', () => {
    expect(settingsSchema.parse({}).seenRules).toBe(false);
  });

  it('une ancienne sauvegarde sans seenRules reste valide', () => {
    const legacy = settingsSchema.parse({ locale: 'en', seenTutorial: true });
    expect(legacy.seenRules).toBe(false);
    expect(legacy.locale).toBe('en');
  });

  it('conserve seenRules une fois les règles vues', () => {
    expect(settingsSchema.parse({ seenRules: true }).seenRules).toBe(true);
  });
});
