# Points bloqués

## 60 FPS sur mobile milieu de gamme : non vérifié

- **Exigence :** section 10, 60 FPS sur mobile milieu de gamme, avec un proxy faute d'appareil réel (Chromium, CPU ×4, rendu GPU si disponible).
- **Tentatives :**
  1. SwiftShader, sans ralentissement puis CPU ×4.
  2. Vulkan matériel avec `--use-angle=vulkan` : Chromium retombe sur `llvmpipe`, qui est aussi un rendu logiciel, malgré la présence de `/dev/dxg` sous WSL2.
  3. Réduction du coût de rendu : pays hors écran masqués, résolution plafonnée sur mobile, anticrénelage coupé sur écran dense.
- **Résultat :** voir `docs/reports/fps-proxy.json`. L'objectif de 60 FPS **n'est pas atteint dans le proxy**, faute de GPU. Le temps de script par image y est mesuré à part : c'est la seule partie mesurable ici qui ne dépend pas du GPU.
- **Pour résoudre :** ouvrir le jeu sur un vrai téléphone de milieu de gamme, ou lancer `pnpm perf` sur une machine dotée d'un GPU exposé à Chromium.

## Actionlint : non exécuté

- **Exigence :** `ci.yml` syntaxiquement valide, « test ou `actionlint` si disponible sans installation globale ».
- **Choix :** `tests/config.test.ts` analyse le YAML et vérifie la structure et les commandes. `actionlint` n'a pas été lancé. Le workflow n'a jamais tourné sur GitHub.
