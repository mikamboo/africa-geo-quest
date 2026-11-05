import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

export const CACHE_DIR = '.cache/ne';
export const MANIFEST_PATH = 'data/sources.manifest.json';

interface Source {
  name: string;
  scale: '50m' | '10m';
  theme: 'cultural' | 'physical';
}

export const SOURCES: Source[] = [
  { name: 'ne_50m_admin_0_countries', scale: '50m', theme: 'cultural' },
  { name: 'ne_50m_rivers_lake_centerlines', scale: '50m', theme: 'physical' },
  { name: 'ne_50m_lakes', scale: '50m', theme: 'physical' },
  { name: 'ne_50m_geography_regions_polys', scale: '50m', theme: 'physical' },
  { name: 'ne_10m_populated_places_simple', scale: '10m', theme: 'cultural' },
];

const SHAPE_EXTENSIONS = ['shp', 'shx', 'dbf', 'prj', 'cpg'];

export interface ManifestEntry {
  name: string;
  url: string;
  version: string;
  sha256: string;
  bytes: number;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url} : HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** Reconstruit un shapefile depuis le miroir GitHub, fichier par fichier, sans archive. */
async function fetchFromMirror(source: Source, directory: string): Promise<void> {
  const base = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/${source.scale}_${source.theme}`;
  for (const extension of SHAPE_EXTENSIONS) {
    const bytes = await fetchBytes(`${base}/${source.name}.${extension}`);
    writeFileSync(join(directory, `${source.name}.${extension}`), bytes);
  }
}

function extractShapefile(zip: Uint8Array, directory: string): string {
  const files = unzipSync(zip);
  let version = 'inconnue';
  for (const [path, content] of Object.entries(files)) {
    const fileName = path.split('/').pop() ?? path;
    if (fileName.endsWith('VERSION.txt')) version = strFromU8(content).trim();
    if (SHAPE_EXTENSIONS.some((extension) => fileName.endsWith(`.${extension}`))) {
      writeFileSync(join(directory, fileName), content);
    }
  }
  return version;
}

/** Télécharge les sources manquantes et retourne le chemin du `.shp` pour chacune. */
export async function ensureSources(): Promise<Record<string, string>> {
  const manifest: ManifestEntry[] = existsSync(MANIFEST_PATH)
    ? (JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as ManifestEntry[])
    : [];
  const paths: Record<string, string> = {};
  const nextManifest: ManifestEntry[] = [];

  for (const source of SOURCES) {
    const url = `https://naciscdn.org/naturalearth/${source.scale}/${source.theme}/${source.name}.zip`;
    const zipPath = join(CACHE_DIR, `${source.name}.zip`);
    const directory = join(CACHE_DIR, 'x', source.name);
    const shp = join(directory, `${source.name}.shp`);
    mkdirSync(dirname(zipPath), { recursive: true });
    const known = manifest.find((entry) => entry.name === source.name);

    if (!existsSync(zipPath)) {
      try {
        writeFileSync(zipPath, await fetchBytes(url));
      } catch (error) {
        console.warn(`Source principale indisponible (${String(error)}), essai du miroir GitHub.`);
        rmSync(directory, { recursive: true, force: true });
        mkdirSync(directory, { recursive: true });
        await fetchFromMirror(source, directory);
        paths[source.name] = shp;
        if (known) nextManifest.push(known);
        continue;
      }
    }

    const zip = new Uint8Array(readFileSync(zipPath));
    const digest = sha256(zip);
    if (known && known.sha256 !== digest) {
      if (!process.argv.includes('--update')) {
        throw new Error(
          `${source.name} : somme SHA-256 différente du manifeste. Relancer avec --update pour accepter la nouvelle version.`,
        );
      }
    }
    mkdirSync(directory, { recursive: true });
    const version = extractShapefile(zip, directory);
    paths[source.name] = shp;
    nextManifest.push({ name: source.name, url, version, sha256: digest, bytes: zip.length });
  }
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`);
  return paths;
}
