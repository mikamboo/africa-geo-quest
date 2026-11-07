# Suivi de progression

**Jalon courant :** J9 terminé, sous réserve de la vérification finale dans un clone propre.

Commandes de vérification : `pnpm verify`, `pnpm lighthouse`, `pnpm perf`.

## Jalons

| Jalon                 | Statut | Preuve                                                  |
| --------------------- | ------ | ------------------------------------------------------- |
| J0 Socle              | Fait   | `pnpm verify`                                           |
| J1 Recherche et plan  | Fait   | `docs/RESEARCH.md`, `docs/PLAN.md`, `docs/adr/`         |
| J2 Données            | Fait   | `tests/data/oracles.test.ts`, `pnpm data:validate`      |
| J3 Tranche verticale  | Fait   | `e2e/explore.spec.ts`, desktop et mobile                |
| J4 Progression        | Fait   | `e2e/progress.spec.ts`, couverture 99 %                 |
| J5 Modes              | Fait   | `e2e/modes.spec.ts`, revue visuelle faite               |
| J6 Contenu et i18n    | Fait   | `tests/content.test.ts`, `docs/REVIEW_FACTS.md`         |
| J7 Finition           | Fait   | `e2e/security.spec.ts` (axe-core), revue visuelle faite |
| J8 Production locale  | Fait   | `pnpm lighthouse`, `tests/config.test.ts`               |
| J9 Livrables et audit | Fait   | Voir ci-dessous                                         |

## Définition de « terminé »

### Fonctionnel

- [x] Déplacement sur toute l'Afrique, clavier et tactile, y compris sur l'eau jusqu'aux îles : `e2e/explore.spec.ts` (Comores en pirogue, sur desktop au clavier et sur mobile au joystick).
- [x] 54 pays détectés avec fiche : `tests/data/oracles.test.ts`, `tests/content.test.ts`, `e2e/explore.spec.ts`.
- [x] Niveaux Explorateur et Géographe jouables : `src/core/modes.test.ts`, `e2e/modes.spec.ts`.
- [x] Au moins 3 types de missions, un quiz, le défi du jour : `e2e/modes.spec.ts`.
- [x] Progression après rechargement et hors ligne : `e2e/progress.spec.ts`, `e2e/security.spec.ts`.
- [x] FR et EN complets : `tests/content.test.ts`.
- [x] Aucune donnée personnelle, page parents accessible : `e2e/security.spec.ts`, `e2e/progress.spec.ts`.

### Technique

- [x] `pnpm verify` vert dans un clone propre, couverture `core/` ≥ 80 % : vérification finale de J9.
- [x] Lighthouse ≥ 90 : `docs/reports/lighthouse-summary.json`.
- [x] `ci.yml` et `vercel.json` validés sans exécution distante : `tests/config.test.ts`.
- [x] Historique propre sur `feat/prototype`, arbre de travail vide : `git status`.

### Livrables

- [x] `README.md`, `CLAUDE.md`.
- [x] `docs/PLAN.md`, `docs/RESEARCH.md`, `docs/adr/`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/REVIEW_FACTS.md`, `ATTRIBUTIONS.md`, `LICENSE`.
- [x] `docs/DEPLOY.md`.
- [x] `.env.example`, `.nvmrc`, `.editorconfig`.
- [x] `docs/ROADMAP.md`.

## Non fait ou non vérifié

Voir `docs/BLOCKERS.md` : 60 FPS non vérifié, faute de GPU et d'appareil réel. Relecture humaine des faits et avis juridique à faire.

## Refonte tout public (branche `feat/tout-public`)

Public élargi à tous, dès 8 ans : voir ADR 0007. Preuves : `e2e/audience.spec.ts`, `src/core/modes.test.ts`, `src/core/rules.test.ts`.
