import { readFileSync, writeFileSync } from 'node:fs';
import { factsFileSchema } from '../../src/data/facts';
import { countriesSchema } from '../../src/data/schemas';

/** Génère la fiche de relecture humaine des faits. */
const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const countries = countriesSchema.parse(read('data/countries.json'));
const fr = factsFileSchema.parse(read('data/facts.fr.json'));
const en = factsFileSchema.parse(read('data/facts.en.json'));
const quotes = read('data/facts.quotes.json') as Record<string, string>;

const lines = [
  '# Relecture des faits',
  '',
  'Document généré par `pnpm data:review`. Tous les faits portent le statut `ai-draft` : ils ont été rédigés et vérifiés sur la source par une IA, **aucun humain ne les a encore relus**.',
  '',
  'Pour chaque pays : le fait en français, en anglais, la source, et la citation relevée sur cette page. Une case cochée vaut relecture.',
  '',
];
for (const country of [...countries].sort((a, b) => a.names.fr.localeCompare(b.names.fr, 'fr'))) {
  const code = country.code;
  lines.push(
    `## ${country.names.fr} (${code})`,
    '',
    `- [ ] FR : ${fr[code]?.text}`,
    `- [ ] EN : ${en[code]?.text}`,
    `- Source : ${fr[code]?.sourceUrl}`,
    `- Citation : « ${quotes[code]} »`,
    '',
  );
}
const pois = read('data/pois.json') as {
  id: string;
  names: { fr: string; en: string };
  blurb: { fr: string; en: string };
  sourceUrl: string;
}[];
lines.push(
  '# Points d’intérêt',
  '',
  'Phrases et coordonnées vérifiées sur la source indiquée, principalement Wikipédia anglaise. Elles attendent aussi une relecture humaine.',
  '',
);
for (const poi of pois) {
  lines.push(
    `## ${poi.names.fr}`,
    '',
    `- [ ] FR : ${poi.blurb.fr}`,
    `- [ ] EN : ${poi.blurb.en}`,
    `- Source : ${poi.sourceUrl}`,
    '',
  );
}
const stories = read('data/stories.json') as {
  title: { fr: string };
  stops: {
    placeId: string;
    clue: { fr: string; en: string };
    lines: { fr: string; en: string }[];
    note: { fr: string };
    sourceUrl: string;
    quote?: string;
  }[];
}[];
lines.push(
  '# Reportages',
  '',
  'Personnages fictifs, faits réels. À relire comme les fiches pays.',
  '',
);
for (const story of stories) {
  lines.push(`## ${story.title.fr}`, '');
  for (const stop of story.stops) {
    lines.push(
      `### ${stop.placeId}`,
      '',
      `- [ ] Indice : ${stop.clue.fr} / ${stop.clue.en}`,
      ...stop.lines.map((line) => `- [ ] ${line.fr} / ${line.en}`),
      `- Source : ${stop.sourceUrl}`,
      `- Citation : « ${stop.quote ?? ''} »`,
      '',
    );
  }
}
writeFileSync('docs/REVIEW_FACTS.md', lines.join('\n'));
console.log('docs/REVIEW_FACTS.md généré.');
