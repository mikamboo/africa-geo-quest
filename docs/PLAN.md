# Plan

## Le jeu

**Tembea** (« marcher, voyager » en swahili) : un personnage parcourt à pied et en pirogue une vraie carte de l'Afrique pour découvrir ses 54 pays, leurs capitales, ses fleuves et ses reliefs.

## Architecture

```
src/
  core/    logique pure, testée, sans DOM ni moteur (ESLint l'impose)
  data/    chargement et validation des données, repositories localStorage
  render/  PixiJS : carte, caméra, sprites (chargé à la demande)
  ui/      React : menus, HUD, passeport, carte SVG, page parents
  i18n/    react-i18next, FR et EN
data/      données curatées versionnées (capitales, régions, faits, villes)
scripts/   pipeline de données, budget de bundle, Lighthouse
public/    géométries générées, drapeaux
```

Sens des dépendances : `ui` et `render` dépendent de `core` et `data` ; `core` ne dépend de rien. La carte SVG et le moteur Pixi émettent les mêmes événements vers `core` (`visite d'un pays`, `lieu atteint`, `fleuve traversé`), ce qui permet de jouer les mêmes missions dans les deux modes.

## Boucle de jeu

1. `render` lit les entrées, appelle `core.stepMovement` à chaque image.
2. À 10 Hz, `core.WorldModel.locate` calcule le pays, le terrain et les lieux proches, avec présélection par bounding box.
3. Le segment parcouru est testé contre les fleuves (`crossedRivers`).
4. Les événements alimentent le store Zustand, qui met à jour la progression, les missions et le HUD.

## Choix principaux (détails dans `docs/adr/`)

| Sujet                  | Choix                                                  | ADR  |
| ---------------------- | ------------------------------------------------------ | ---- |
| Moteur                 | PixiJS v8                                              | 0001 |
| Projection             | Azimutale équivalente de Lambert centrée sur l'Afrique | 0002 |
| Territoires contestés  | Traitement aligné sur l'ONU                            | 0003 |
| Mineurs, RGPD, COPPA   | Aucune donnée collectée, analyse à valider             | 0004 |
| Couches et persistance | `core/` pur, repositories, Zod                         | 0005 |
| CSP                    | Sans `unsafe-eval`, `vercel.json` source unique        | 0006 |
| Retours des joueurs    | Signalement fermé, issues GitHub, agents planifiés     | 0009 |

## Risques

| Risque                                            | Parade                                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| WebGL absent ou lent en headless                  | SwiftShader pour les tests, carte SVG en repli                                    |
| Micro-États inatteignables à la vitesse de marche | Zone de détection minimale, test d'oracle sur les 54                              |
| Budget géométrie (< 500 Ko) dépassé à 1:50m       | Simplification mapshaper avec `keep-shapes`, budget testé                         |
| Coût de rendu sur mobile                          | Géométrie figée, lignes `pixelLine`, étiquettes selon le zoom, mesure avec CPU ×4 |
| Faits erronés                                     | Sources vérifiées, statut `ai-draft`, `REVIEW_FACTS.md` pour relecture humaine    |
| Représentation des personnages                    | Personnages sobres et variés, sans costume « typique »                            |

## Jalons

Voir `docs/PROMPT.md`, section 11, et l'état dans `docs/PROGRESS.md`.
