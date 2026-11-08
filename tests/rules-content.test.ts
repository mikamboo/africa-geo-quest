import { describe, expect, it } from 'vitest';
import { RULE_SECTIONS } from '../src/core/rules';
import en from '../src/i18n/en.json';
import fr from '../src/i18n/fr.json';

type Sections = Record<string, { title?: string; body?: string }>;

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1] as string);

describe.each([
  ['fr', fr.rules.sections as Sections],
  ['en', en.rules.sections as Sections],
])('textes des règles (%s)', (_locale, sections) => {
  it('couvre exactement les sections déclarées', () => {
    expect(Object.keys(sections).sort()).toEqual(RULE_SECTIONS.map(({ id }) => id).sort());
  });

  for (const { id, params } of RULE_SECTIONS) {
    it(`« ${id} » a un titre et un texte non vides`, () => {
      expect(sections[id]?.title?.trim()).toBeTruthy();
      expect(sections[id]?.body?.trim()).toBeTruthy();
    });

    it(`« ${id} » utilise chaque paramètre, et seulement ceux-là`, () => {
      const used = [...new Set(placeholders(sections[id]?.body ?? ''))].sort();
      expect(used).toEqual(Object.keys(params).sort());
    });
  }
});
