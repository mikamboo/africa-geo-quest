import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BOX_INTERVALS_DAYS, MAX_BOX } from './leitner';
import { HOME_MODE_RULES, MODE_RULES, RULE_SECTION_IDS, RULE_SECTIONS } from './rules';
import { MISSION_BASE_POINTS, STAMP_POINTS } from './scoring';

const ids = RULE_SECTIONS.map((section) => section.id);

describe('sections de règles', () => {
  it('liste chaque section une fois, dans l’ordre déclaré', () => {
    expect(ids).toEqual([...RULE_SECTION_IDS]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('chaque mode renvoie à une section qui existe', () => {
    for (const section of [...Object.values(MODE_RULES), ...Object.values(HOME_MODE_RULES)]) {
      expect(ids).toContain(section);
    }
  });

  it('chaque bouton de mode de l’accueil a ses règles', () => {
    const home = readFileSync(new URL('../ui/screens/HomeScreen.tsx', import.meta.url), 'utf8');
    const modes = [...home.matchAll(/data-testid="mode-([a-z]+)"/g)].map((match) => match[1]);
    expect(modes.length).toBeGreaterThan(0);
    for (const mode of modes) expect(Object.keys(HOME_MODE_RULES)).toContain(mode);
  });

  it('reprend les barèmes du jeu, sans les recopier', () => {
    const params = (id: string) => RULE_SECTIONS.find((section) => section.id === id)?.params;
    expect(params('missions')?.points).toBe(MISSION_BASE_POINTS);
    expect(params('explore')?.stampPoints).toBe(STAMP_POINTS);
    expect(params('quiz')?.boxes).toBe(MAX_BOX);
    expect(params('quiz')?.maxDays).toBe(Math.max(...BOX_INTERVALS_DAYS));
  });
});
