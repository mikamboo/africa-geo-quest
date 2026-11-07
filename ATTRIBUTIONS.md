# Attributions et licences

Le **code** de ce dépôt est sous licence MIT (voir `LICENSE`). Les données et les polices gardent leur propre licence.

## Données géographiques

| Source                                                                                                | Usage                                         | Licence        |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------- |
| [Natural Earth](https://www.naturalearthdata.com/) 1:50m : pays, fleuves, lacs, régions géographiques | Frontières, hydrographie, reliefs, silhouette | Domaine public |
| [Natural Earth](https://www.naturalearthdata.com/) 1:10m : populated places                           | Villes secondaires                            | Domaine public |

Versions et sommes SHA-256 : `data/sources.manifest.json`. Les géométries sont simplifiées avec mapshaper, et certaines sont modifiées (voir l'ADR 0003) : Somaliland fusionné dans la Somalie, Sahara occidental découpé au parallèle 27°40' N.

Fichiers curatés dans ce dépôt, sous licence MIT avec le code : `data/countries.json`, `data/capitals.json`, `data/hydrography.json`, `data/relief.json`.

Les sous-régions de `data/countries.json` suivent la classification M49 de la Division de statistique des Nations unies.

## Contenu pédagogique

| Fichier                                    | Sources                                                                                                                            | Statut                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `data/facts.fr.json`, `data/facts.en.json` | UNESCO (`whc.unesco.org`, `ich.unesco.org`, `www.unesco.org`) et Encyclopædia Britannica. L'URL de chaque fait est dans le fichier | `ai-draft`, rédigé par une IA, relecture humaine à faire |
| `data/capitals.json`                       | Britannica pour les cas délicats ; Le Monde pour la Guinée équatoriale                                                             | Curaté                                                   |
| `data/pois.json`                           | Wikipédia anglaise (CC BY-SA 4.0) et UNESCO, pour les coordonnées et les faits. Les phrases sont reformulées                       | L'URL de chaque lieu est dans le fichier                 |

Les reportages (`data/stories.json`) s'appuient sur UNESCO, Britannica, Nobel Prize, SARAO, Banque mondiale, World Athletics, CAF, FESPACO et ACC ; une étape cite Wikipédia. L'URL de chaque source est dans le fichier. Les personnages sont fictifs.

## Drapeaux

[flag-icons](https://github.com/lipis/flag-icons) (MIT), 54 fichiers SVG auto-hébergés dans `public/flags/`.

## Polices

Auto-hébergées via Fontsource, sans appel à un CDN. Toutes sous licence SIL Open Font License 1.1.

| Police                | Paquet                              | Usage           |
| --------------------- | ----------------------------------- | --------------- |
| Fraunces              | `@fontsource/fraunces`              | Titres          |
| Atkinson Hyperlegible | `@fontsource/atkinson-hyperlegible` | Texte           |
| OpenDyslexic          | `@fontsource/opendyslexic`          | Option dyslexie |

## Bibliothèques

Dépendances d'exécution : React, react-i18next, i18next, PixiJS, d3-geo, Zustand, Zod, topojson-client (MIT, BSD ou ISC selon le paquet, voir `node_modules/<paquet>/LICENSE`). `@vercel/analytics` n'est chargé que si `VITE_ENABLE_ANALYTICS=true`.

## Générés par code

Personnages, pirogue, motifs, icônes, image Open Graph et sons (WebAudio) sont générés par le code de ce dépôt.
