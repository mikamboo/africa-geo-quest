# Tembea : règles pour les agents

Jeu de géographie sur l'Afrique pour tous, dès 8 ans (ADR 0007). Les mineurs restent un public à part entière : la section « Mineurs » s'applique à tout le monde. Le code est en anglais ; la documentation et les messages de commit sont en français.

Ce projet n'utilise pas `/aidlc` : `docs/PLAN.md` et `docs/adr/` servent de trace.

## Commandes

| Commande           | Rôle                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`         | Serveur de développement, sans les en-têtes de sécurité                                                                       |
| `pnpm verify`      | Lint, types, tests et couverture, données, build, budget, e2e, audit. À lancer avant tout commit de jalon. Plus de 10 minutes |
| `pnpm lighthouse`  | Scores ≥ 90 et LCP < 2,5 s, sur le build. Rapports dans `docs/reports/`                                                       |
| `pnpm perf`        | Proxy FPS, ce n'est pas une mesure sur appareil réel                                                                          |
| `pnpm data:build`  | Régénère `public/geo`, `public/flags` et la silhouette. Télécharge au besoin dans `.cache/`                                   |
| `pnpm data:review` | Régénère `docs/REVIEW_FACTS.md` après une modification des faits                                                              |
| `pnpm assets`      | Régénère les icônes et l'image Open Graph                                                                                     |
| `pnpm screenshots` | Captures réelles du build dans `docs/screenshots/` (lancer `pnpm build` avant)                                                |

`corepack` est cassé sur la machine d'origine : appeler `pnpm` directement.

## Structure

```
src/core/    logique pure, sans DOM ni moteur, couverture ≥ 80 %
src/data/    chargement, schémas Zod, repositories localStorage
src/render/  PixiJS, chargé à la demande
src/ui/      React : écrans, HUD, carte SVG, store Zustand
src/i18n/    fr.json et en.json, mêmes clés
data/        données curatées, faits, manifeste des sources
scripts/     pipeline de données, budget, Lighthouse, FPS, captures
e2e/         Playwright, desktop et mobile
tests/       oracles de données, contenu, configuration
```

## Règles

- `core/` n'importe ni PixiJS, ni React, ni le DOM. ESLint l'impose.
- Pixi et la carte SVG émettent les mêmes `GameEvent`. Toute règle de jeu va dans `core/`, jamais dans `render/` ni `ui/`.
- Seuls `data/countries.json` et `data/capitals.json` font foi pour les 54 pays et leurs capitales. Ne pas réintroduire `ISO_A3` : Natural Earth y met `-99`, on joint sur `ISO_A3_EH`.
- Les territoires contestés suivent l'ADR 0003. Le code `ESH` n'est pas un État : pas de tampon, de drapeau ni de question.
- Ne jamais passer `reviewStatus` à autre chose que `ai-draft` : un agent n'est pas un relecteur humain.
- Toute chaîne visible va dans `fr.json` **et** `en.json`. Police ≥ 16 px.
- Toute évolution d'une règle de jeu (mode, barème, niveau) met à jour `src/core/rules.ts` et les textes `rules.*` de `fr.json` et `en.json` dans le même commit. Les barèmes se lisent dans les constantes de `core/`, jamais recopiés dans un texte. `src/core/rules.test.ts` et `tests/rules-content.test.ts` échouent sinon.
- Texte des faits : positif, adapté à l'âge, 200 caractères maximum, source lue pour de vrai.

## Mineurs (non négociable)

Aucune donnée personnelle, aucune saisie libre, aucun cookie, aucune requête vers un tiers au runtime, aucun lien externe sans `ExternalLink`. L'analytics reste derrière `VITE_ENABLE_ANALYTICS`. Toute fonction en ligne rouvre l'ADR 0004.

## Sécurité

`vercel.json` est l'unique source des en-têtes : `vite preview` les relit. La CSP reste sans `unsafe-eval` : garder l'import `pixi.js/unsafe-eval` en tête de `GameRenderer.ts`.

## Qualité

Interdit pour passer au vert : baisser un seuil, `skip` ou `only`, `--no-verify`, test vide, `eslint-disable` ou `@ts-ignore` sans justification écrite.

Après tout changement visuel : `pnpm build && pnpm screenshots`, et regarder réellement les images aux trois tailles. Des tests verts ne suffisent pas : c'est ainsi qu'a été trouvée une carte SVG sans aucun pays.

## Contenu

`docs/CHARTE_EDITORIALE.md` s'impose à tout texte : ni animalisation, ni réduction à la nature, ni vocabulaire colonial. `tests/content.test.ts` en vérifie une partie.

## Git

Commits conventionnels en français. Pas de remote ni de déploiement sans demande explicite. `aidlc/` est créé par des hooks de la machine et exclu par `.git/info/exclude` : ne pas le committer.
