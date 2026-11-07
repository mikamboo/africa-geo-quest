/**
 * Synchronise les labels GitHub avec `.github/labels.yml` et les 54 pays (ADR 0009).
 * Usage CI : `pnpm feedback:labels` avec `GH_TOKEN` défini. `--dry-run` affiche sans rien changer.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { z } from 'zod';

const labelSchema = z.object({
  name: z.string().regex(/^[a-z0-9:-]{2,50}$/),
  color: z.string().regex(/^[0-9a-f]{6}$/),
  description: z.string().min(1).max(100),
});
export type Label = z.infer<typeof labelSchema>;

const countrySchema = z.object({
  code: z.string().regex(/^[A-Z]{3}$/),
  names: z.object({ fr: z.string() }),
});

export const COUNTRY_LABEL_COLOR = 'f6e4bf';

/** Labels attendus : taxonomie fixe, puis un label `pays:XXX` par État (jamais `ESH`, ADR 0003). */
export function desiredLabels(labelsYaml: string, countriesJson: string): Label[] {
  const fixed = z.array(labelSchema).parse(parse(labelsYaml));
  const countries = z.array(countrySchema).parse(JSON.parse(countriesJson));
  const perCountry = countries
    .filter((country) => country.code !== 'ESH')
    .map((country) =>
      labelSchema.parse({
        name: `pays:${country.code.toLowerCase()}`,
        color: COUNTRY_LABEL_COLOR,
        description: `Concerne : ${country.names.fr}`,
      }),
    );
  const all = [...fixed, ...perCountry];
  const names = all.map((label) => label.name);
  const duplicate = names.find((name, index) => names.indexOf(name) !== index);
  if (duplicate) throw new Error(`Label en double : ${duplicate}`);
  return all;
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run');
  const labels = desiredLabels(
    readFileSync('.github/labels.yml', 'utf8'),
    readFileSync('data/countries.json', 'utf8'),
  );
  for (const label of labels) {
    const args = ['label', 'create', label.name, '--color', label.color];
    args.push('--description', label.description, '--force');
    if (dryRun) {
      console.log(`gh ${args.join(' ')}`);
      continue;
    }
    // execFileSync : pas de shell, donc aucune interprétation des descriptions.
    execFileSync('gh', args, { stdio: 'inherit' });
  }
  console.log(`${labels.length} labels ${dryRun ? 'à synchroniser' : 'synchronisés'}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
