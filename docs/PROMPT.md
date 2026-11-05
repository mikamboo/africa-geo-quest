# Mission autonome : jeu éducatif « Afrique » (version locale complète)

## 1. Contrat d'autonomie (priorité absolue)

Tu es un ingénieur logiciel senior, spécialisé en jeux web 2D et en produits éducatifs pour
enfants et adolescents. Tu travailles **seul, sans interlocuteur, du début à la fin**.
Personne ne répondra à tes questions pendant l'exécution.

**Ton tour ne se termine que dans l'un de ces deux cas :**

- tous les critères de la section 12 sont satisfaits, avec des preuves à l'appui ;
- tu as rencontré un arrêt légitime (section 3) et il ne reste plus aucun travail possible.

**Règles de conduite :**

- Ne demande jamais de confirmation et ne propose jamais de « continuer ». Enchaîne les jalons sans pause.
- Face à un choix, applique les décisions de la section 4. Sinon, prends l'option la plus simple
  qui respecte les exigences, note-la dans `docs/DECISIONS.md` (décision, raison, alternative écartée) et continue.
- Ne lance pas `/aidlc` et ne crée pas de dossier `aidlc/`. Ce projet n'utilise pas ce workflow :
  `docs/PLAN.md` et les ADR servent de trace.
- Utilise des sous-agents si cela fait gagner du temps sur des tâches indépendantes, comme la rédaction
  et le sourçage des fiches. Tu restes responsable de relire et de vérifier leur résultat.
- Évite les commandes interactives ou sans fin : passe les options non interactives, lance
  les serveurs en arrière-plan et arrête-les après usage.

**Reprise après coupure ou compaction de contexte :** tiens `docs/PROGRESS.md` à jour après chaque
étape notable (jalon courant, fait, reste à faire, prochaine action exacte, commandes de vérification).
Si tu perds le fil, relis `docs/PROMPT.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md` et `git log`, puis reprends
sans rien recommencer.

## 2. Gestion des obstacles

Quand quelque chose échoue :

1. Lis l'erreur et diagnostique la cause réelle. Consulte la documentation à jour
   (`npx ctx7@latest library …`, puis `docs …`).
2. Fais jusqu'à **3 tentatives réellement différentes**.
3. Si cela reste bloqué, adopte une alternative qui respecte toujours l'exigence.
4. Si aucune n'existe, note le point dans `docs/BLOCKERS.md` (exigence, tentatives, erreur exacte,
   ce qu'il faudrait pour le résoudre), puis **passe au travail suivant**. Reviens sur ce point au jalon J9.

**Interdit pour faire passer une vérification au vert :** baisser un seuil, désactiver ou ignorer un test
(`skip`, `only`, `xfail`), ajouter des `eslint-disable` ou `@ts-ignore` sans justification écrite,
utiliser `--no-verify`, écrire un test qui ne vérifie rien, simuler un résultat. Un objectif non atteint
reste affiché comme non atteint.

## 3. Périmètre et limites d'action

**Autorisé sans demander :** tout ce qui se passe dans ce dossier, `git init` et les commits locaux, l'installation
de dépendances du projet avec pnpm, le téléchargement de données et de navigateurs Playwright, la lecture du web.

**Interdit :**

- ajouter un remote git, `git push`, créer un dépôt GitHub ;
- déployer, utiliser le CLI ou le MCP Vercel, créer un projet distant ;
- `sudo`, les installations globales, modifier la configuration du système ou de `~/.claude` ;
- modifier ou supprimer quoi que ce soit hors de ce dossier, sauf dans un répertoire temporaire que tu as créé ;
- saisir ou stocker un identifiant, utiliser un service payant, publier du contenu en ligne.

**Arrêts légitimes (seuls cas) :** une étape indispensable exige une action interdite ci-dessus, ou le réseau est
indisponible alors que les données sources manquent et qu'aucun miroir ne fonctionne. Avant de t'arrêter,
termine tout ce qui peut encore l'être, puis rédige le rapport final (section 13).

## 4. Décisions déjà prises (ne pas les rediscuter)

| Sujet | Décision |
|---|---|
| Public | 8–15 ans |
| Langues | Français (par défaut) et anglais |
| Git | Dépôt **local uniquement**. Commit initial sur `main`, puis tout le travail sur `feat/prototype`. Ne fusionne pas : je relirai. |
| Déploiement | **Hors périmètre** : `vercel.json` et `ci.yml` sont écrits et testés localement, jamais exécutés à distance |
| Licence | **MIT** pour le code ; les données et polices gardent leur licence (voir `ATTRIBUTIONS.md`) |
| Assets | **Générés par code** : personnages et motifs en SVG/spritesheet, sons synthétisés avec WebAudio. Exceptions listées ci-dessous |
| Classement en ligne | Hors périmètre, documenté dans la roadmap |
| Langue du projet | Identifiants et code en anglais ; documentation et messages de commit en français |
| Pays jouables | Les 54 États membres de l'ONU (liste en section 7) |
| Mers et îles | L'océan est traversable : le personnage passe en **pirogue** sur l'eau. C'est ce qui rend les 6 pays insulaires atteignables |
| Sans WebGL / mode accessible | Une même carte **SVG cliquable** (d3-geo) sert de repli sans WebGL et de mode alternatif sans déplacement |

**Seules exceptions à « généré par code »**, toutes en auto-hébergement et listées dans `ATTRIBUTIONS.md` :

- **Drapeaux :** paquet SVG sous licence libre (par ex. `flag-icons`, MIT), car un drapeau inexact serait une erreur pédagogique.
- **Polices :** via `@fontsource/*` (licence OFL). Aucun appel à un CDN ou à Google Fonts.

**Choix laissés à ton jugement :** PixiJS (par défaut) ou Phaser 3, à trancher en moins d'une heure de travail dans un ADR.

## 5. Le jeu à construire

Il s'agit d'un **jeu navigateur original** où un personnage se promène sur la carte de l'Afrique, pour apprendre
les 54 pays, leurs capitales et grandes villes, les fleuves, les lacs, les reliefs et les régions. Conçois un jeu
original : n'imite ni le nom, ni les personnages, ni l'apparence d'un jeu existant.

**Exploration**

- Vue 2D de dessus, caméra qui suit le personnage, zoom fluide.
- Déplacement au clavier (flèches/WASD) et au joystick tactile sur mobile.
- En entrant dans un pays : nom, drapeau, capitale et un fait marquant de une à deux phrases, adapté aux 8–15 ans.
- Villes, fleuves et monuments sont des points d'intérêt à découvrir.
- Vitesse réglée pour qu'une traversée nord-sud complète prenne environ 60 à 90 s.

**Modes de jeu**

- *Exploration libre* : se promener et découvrir, sans pression.
- *Missions* : au moins 3 types, soit « Va à Dakar », « Traverse le fleuve Congo », « Trouve un pays sans accès à
  la mer ». Chronomètre optionnel, désactivé par défaut.
- *Quiz* : questions générées à partir de la progression du joueur.
- *Défi du jour* : même mission pour tous, seed déterministe basé sur la date UTC, score local.

**Niveaux**

- *Explorateur* (8–11 ans) : pays, capitales, grands fleuves, indices visuels.
- *Géographe* (12–15 ans) : villes secondaires, reliefs, régions, frontières.

**Pédagogie :** répétition espacée (Leitner) sur les éléments ratés, difficulté progressive, feedback toujours
positif et explicatif, jamais punitif.

**Progression :** passeport à tampons par pays visité, badges par région (Afrique du Nord, de l'Ouest, centrale,
de l'Est, australe), pourcentage de carte découverte. Les régions suivent les sous-régions M49 de l'ONU, dans un
fichier de données explicite couvrant les 54 pays.

## 6. Protection des mineurs (non négociable)

- Aucune donnée personnelle collectée. Pas de compte, pas d'e-mail, pas de nom réel.
- Profil local : un avatar et un pseudonyme choisi dans une liste générée (ex. « Gazelle rapide »). **Aucune saisie libre.**
- Pas de publicité, d'achat, de cookie de suivi ni de traceur tiers. Aucune requête vers un tiers au runtime.
- Aucun lien externe sans écran d'avertissement.
- Mesure d'audience : uniquement Vercel Web Analytics (sans cookies, agrégé), activée seulement si
  `VITE_ENABLE_ANALYTICS=true`. **Désactivée par défaut**, donc aucune requête ni erreur console en local.
- Page « Parents & enseignants » : ce que le jeu enseigne, données stockées (uniquement sur l'appareil), comment réinitialiser.
- Conformité RGPD et COPPA documentée dans un ADR, présentée comme une analyse à faire valider et non comme un avis juridique.
- Un test e2e vérifie qu'aucune requête ne quitte l'origine pendant une partie et qu'aucun cookie n'est posé.

## 7. Données géographiques

**Pipeline reproductible dans `scripts/data/`** (`pnpm data:build`) :

- Sources : Natural Earth (domaine public) à l'échelle **1:50m**, car la 1:110m omet des petits États insulaires.
  Téléchargement depuis `naciscdn.org`, avec le dépôt GitHub `nvkelso/natural-earth-vector` en miroir.
- Villes : GeoNames (CC BY 4.0) ou Natural Earth populated places.
- Fleuves, lacs, reliefs : Natural Earth.
- Simplification avec mapshaper (dépendance de dev) en préservant les petites formes (`keep-shapes`).
  **Frontières < 500 Ko au total**, chargées à la demande.
- Téléchargements dans un cache ignoré par git, avec manifeste de versions et de sommes SHA-256.
  **Les fichiers générés sont commités**, pour que le build fonctionne sans réseau.
- `unzip` et `ogr2ogr` sont absents de cette machine : utilise mapshaper ou Node pour lire les archives.
- Joins sur `ADM0_A3` ou `ISO_A3_EH` : le champ `ISO_A3` de Natural Earth contient des valeurs `-99`.

**Validation Zod au build et tests d'oracle :**

- Exactement ces 54 codes, chacun avec un polygone non vide et détectable :
  `DZA AGO BEN BWA BFA BDI CPV CMR CAF TCD COM COG COD CIV DJI EGY GNQ ERI SWZ ETH GAB GMB GHA GIN GNB KEN LSO LBR LBY MDG MWI MLI MRT MUS MAR MOZ NAM NER NGA RWA STP SEN SYC SLE SOM ZAF SSD SDN TZA TGO TUN UGA ZMB ZWE`
- Sans accès à la mer, exactement ces 16 :
  `BWA BFA BDI CAF TCD SWZ ETH LSO MWI MLI NER RWA SSD UGA ZMB ZWE`
- Capitales curatées dans un fichier versionné qui prime sur les sources, y compris les cas délicats : Burundi (Gitega),
  Tanzanie (Dodoma), Côte d'Ivoire (Yamoussoukro, Abidjan ville économique), Bénin (Porto-Novo, Cotonou siège du
  gouvernement), Afrique du Sud (Pretoria, Le Cap, Bloemfontein), Eswatini (Mbabane, Lobamba). Vérifie-les à la source.
- Pour chaque pays, un point à l'intérieur (`pointOnFeature`) doit être détecté comme ce pays.
  Les très petits pays (Gambie, Eswatini, Djibouti, États insulaires…) doivent rester atteignables, avec une zone de détection minimale.

**Territoires contestés** (traitement neutre, aligné sur l'ONU, documenté dans un ADR) :

- Somaliland fusionné dans la Somalie.
- Sahara occidental affiché et nommé « territoire non autonome (ONU) », sans statut d'État, non compté dans les 54.
- Mention « frontières indicatives » dans l'interface et sur la page parents.

**Faits pédagogiques** : `data/facts.{fr,en}.json`, un fait par pays et par langue, chacun avec `sourceUrl`, et avec
`reviewStatus: "ai-draft"`. Tu ne peux pas te déclarer relecteur humain. Vérifie chaque fait sur une source fiable (ONU,
UNESCO, Britannica…), évite les sujets choquants pour cet âge, et génère `docs/REVIEW_FACTS.md` pour ma relecture.

`ATTRIBUTIONS.md` liste toutes les licences et sources.

## 8. Stack et architecture

- **Node 22 + pnpm 11**, déjà installés. `corepack` est cassé sur cette machine (chemin Windows dans WSL) :
  ne l'utilise pas, appelle `pnpm` directement. Autorise les scripts de build nécessaires par configuration, sans commande interactive.
- **TypeScript strict**, **Vite**, **React** (menus, HUD, passeport), **PixiJS** (rendu), **d3-geo** (projection adaptée à
  un continent à cheval sur l'équateur, à justifier dans un ADR), **Zustand**, **react-i18next**, **PWA** (`vite-plugin-pwa`),
  **Zod**. Prends les versions stables courantes, sans te fier à ta mémoire.
- **Turf :** importe uniquement les sous-paquets `@turf/*` nécessaires, pas `@turf/turf` en entier.
- **Pas de backend.** Progression en `localStorage`, derrière les interfaces `ProgressRepository` et `ScoreRepository`, pour
  brancher un backend plus tard sans toucher à `core/`. Données versionnées, validées par Zod au chargement ; données corrompues
  détectées et réinitialisées proprement.

**Structure :** `core/` (logique pure), `render/`, `ui/`, `data/`, `i18n/`. Une règle ESLint interdit à `core/` d'importer
PixiJS, React ou le DOM.

**Points d'attention :**

- Détection de pays à 60 FPS : présélection par bounding box et vérification à fréquence réduite.
- « Traverser un fleuve » : intersection du segment de déplacement avec la géométrie du fleuve.
- PixiJS v8 et CSP : vérifie dans la doc (module `pixi.js/unsafe-eval`, workers `blob:`) et garde une CSP sans `unsafe-eval`.
- WebGL en headless : configure Chromium en rendu logiciel (SwiftShader) pour les tests.
- Crochets de test éventuels absents du build de production (test à l'appui). Préfère les `data-testid` et le HUD.

## 9. Direction artistique

- Référence principale : https://www.motowewa.africa (typographie forte, accents de couleur vifs, ton local et fier, noms réels
  non traduits, mobile d'abord). **Inspire-toi de l'esprit sans copier** ni logo, ni texte, ni visuel. **Adapte aux 8–15 ans** : plus
  lumineux, plus chaleureux, plus ludique. Si le site est inaccessible, note-le et continue.
- Palette : ocre, terre rouge, vert savane, bleu fleuve, sable.
- Motifs inspirés du wax, du bogolan et du kente, avec parcimonie et dans l'UI uniquement : compositions géométriques originales,
  sans reproduire de motif existant.
- Carte lisible avant tout : contrastes forts, relief stylisé, frontières nettes.
- 3 à 4 personnages originaux, attachants et variés, sprite animé (marche 4 directions, idle). **Représentation respectueuse, sans
  caricature ni cliché** vestimentaire ou physique.
- Textes courts, police ≥ 16 px, option de police adaptée à la dyslexie.
- Micro-animations (entrée dans un pays, tampon, badge), respect de « réduire les animations ».
- Sons courts et doux, coupables en un clic.
- Noms de lieux en forme officielle, traduction en sous-titre si utile.

**Revue visuelle obligatoire :** à J5 et J7, capture l'écran avec Playwright (390×844, 768×1024, 1440×900), regarde réellement les images
et corrige ce qui est laid, illisible ou cassé. Des tests verts ne suffisent pas. Charge la skill `frontend-design` avant de travailler le style.

## 10. Exigences qualité

- **Outillage :** ESLint (flat config), Prettier, `tsc --noEmit`, Husky + lint-staged, Commitlint (Conventional Commits, compatible avec les
  messages en français et le trailer `Co-Authored-By`).
- **Vitest sur `core/` :** détection du pays, collisions et limites de la carte, passage terre/eau, scoring, Leitner, missions, seed du défi.
  Seuil de couverture ≥ 80 % appliqué dans la configuration. Parcours nominal et au moins 2 cas limites par module.
- **Playwright, desktop et mobile :** « lancer le jeu → entrer dans un pays → réussir une mission », persistance après rechargement,
  changement de langue, mode sans déplacement, repli sans WebGL, données corrompues, hors ligne après le premier chargement, absence
  de violation CSP et d'erreur console.
- **i18n :** test de parité des clés FR/EN et de présence des 54 fiches dans les 2 langues.
- **Accessibilité :** clavier complet, ARIA, contraste AA, « réduire les animations », mode sans déplacement. Test axe-core sur les écrans principaux.
- **Performance :**
  - 60 FPS sur mobile milieu de gamme. Faute d'appareil réel, mesure avec un proxy (Chromium, CPU ralenti ×4, rendu GPU si disponible),
    et signale dans le rapport que **cette mesure n'est pas une vérification sur appareil réel**.
  - LCP < 2,5 s.
  - JS initial < 300 Ko gzip, contrôlé par `scripts/check-bundle.ts` qui fait échouer `verify`. Charge le moteur de rendu et les données géo à la demande.
- **Sécurité :** CSP, HSTS, X-Content-Type-Options, Referrer-Policy dans `vercel.json`, unique source de vérité, réappliqués à `vite preview`
  pour que les tests les couvrent. Aucun secret. `pnpm audit --prod` sans vulnérabilité haute ou critique.
- **Erreurs :** error boundary React, écran de repli sans WebGL. Pas de `TODO` ni de code à moitié fait.

**Commande unique :** `pnpm verify` enchaîne lint → typecheck → tests unitaires avec couverture → validation des données → build → budget bundle → e2e → audit.
`pnpm lighthouse` lance Lighthouse sur le build via le Chromium de Playwright (`CHROME_PATH`), et échoue si un score Performance, Accessibilité ou Bonnes pratiques
est < 90. `.github/workflows/ci.yml` lance les mêmes scripts, pour que le CI distant reproduise le local.

## 11. Jalons

À chaque jalon : `pnpm verify` (sur ce qui existe déjà), commits conventionnels, mise à jour de `docs/PROGRESS.md`, puis **passage immédiat au suivant**.

| Jalon | Contenu | Critère de sortie |
|---|---|---|
| **J0 Socle** | Déplace ce prompt vers `docs/PROMPT.md`, `git init`, commit initial sur `main`, branche `feat/prototype`. Vérifie que `node` et `pnpm` sont bien des binaires Linux (pas `/mnt/c`). Outillage, Hello World, Vitest et Playwright fonctionnels | `pnpm verify` vert sur le squelette |
| **J1 Recherche & plan** | Étudie la référence graphique et 5 à 8 inspirations (jeux de géographie pour enfants, exploration 2D, sites africains) **en 8 lectures de pages maximum**. Écris `docs/RESEARCH.md`, `docs/PLAN.md` (architecture, choix, risques), les ADR | Documents commités, sans question ouverte |
| **J2 Données** | Pipeline complet, validation, oracles de la section 7 | Tests d'oracle verts, budget < 500 Ko respecté |
| **J3 Tranche verticale** | Vraie carte, personnage déplaçable (clavier + tactile), pirogue, caméra, zoom, détection, fiche minimale | E2E « entrer dans un pays » vert sur desktop et mobile |
| **J4 Progression** | Profil, repositories, passeport, badges, % découvert, persistance, niveaux Explorateur et Géographe | E2E de persistance vert, couverture ≥ 80 % |
| **J5 Modes** | 3 types de missions, quiz + Leitner, défi du jour | E2E « réussir une mission » vert, revue visuelle faite |
| **J6 Contenu & i18n** | 54 fiches FR/EN sourcées, villes et points d'intérêt, page Parents & enseignants, écran d'avertissement des liens, `REVIEW_FACTS.md` | Tests de parité et de présence verts |
| **J7 Finition** | Direction artistique, personnages, animations, sons, carte SVG (mode alternatif et repli), accessibilité | Revue visuelle faite, axe-core sans violation sérieuse ou critique |
| **J8 Production locale** | PWA, en-têtes, CSP, erreurs, SEO, Open Graph (1200×630), favicon, performance, `pnpm lighthouse`, `vercel.json`, `ci.yml` | `verify` et `lighthouse` verts |
| **J9 Livrables & audit** | Livrables de la section 12, reprise de `BLOCKERS.md`, audit critique du jeu en jouant vraiment (y compris un pays insulaire et un micro-État) | Vérification finale ci-dessous réussie |

**Vérification finale de J9 :** clone le dépôt dans un répertoire temporaire, lance `pnpm install --frozen-lockfile`, puis `pnpm verify` et `pnpm lighthouse`
dans ce clone. Cela prouve que le projet ne dépend d'aucun fichier non commité. Supprime ensuite ce répertoire.

## 12. Définition de « terminé »

Coche chaque point dans `docs/PROGRESS.md`, avec la preuve (test ou commande) correspondante.

**Fonctionnel**

- [ ] Le personnage se déplace sur toute l'Afrique, au clavier et au tactile, y compris sur l'eau jusqu'aux îles.
- [ ] Les 54 pays sont détectés, avec fiche (nom, drapeau, capitale, fait).
- [ ] Niveaux Explorateur et Géographe jouables.
- [ ] Au moins 3 types de missions, un quiz et le défi du jour fonctionnent.
- [ ] La progression persiste après rechargement ; le jeu est jouable hors ligne après le premier chargement.
- [ ] FR et EN complets.
- [ ] Aucune donnée personnelle collectée (test à l'appui), page Parents & enseignants accessible.

**Technique, sur le build local (`pnpm preview`)**

- [ ] `pnpm verify` vert dans un clone propre, couverture `core/` ≥ 80 %.
- [ ] Lighthouse ≥ 90 en Performance, Accessibilité et Bonnes pratiques, rapport dans `docs/reports/`.
- [ ] `ci.yml` syntaxiquement valide (test ou `actionlint` si disponible sans installation globale) et `vercel.json` validé, sans exécution distante.
- [ ] Historique git propre sur `feat/prototype`, aucun fichier temporaire, arbre de travail vide.

**Livrables**

- [ ] `README.md` : pitch, captures réelles, lancement local, scripts, architecture.
- [ ] `CLAUDE.md` : conventions, commandes, structure, règles pour les agents.
- [ ] `docs/PLAN.md`, `docs/RESEARCH.md`, `docs/adr/`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/REVIEW_FACTS.md`, `ATTRIBUTIONS.md`, `LICENSE` (MIT).
- [ ] `docs/DEPLOY.md` : étapes pour créer plus tard le dépôt GitHub et relier Vercel (preview par PR, production sur `main`).
- [ ] `.env.example`, `.nvmrc`, `.editorconfig`.
- [ ] `docs/ROADMAP.md`, documenté sans être implémenté :
  - **v2 – Classement en ligne :** backend (Supabase ou équivalent), pseudonymes générés uniquement, classement par classe/école via code enseignant, anti-triche côté serveur, conformité mineurs.
  - **v2 – Mode enseignant :** créer une liste de missions, suivre une classe.
  - **v3 :** langues africaines (lingala, swahili, arabe), géographie humaine (langues, monnaies, cultures).

## 13. Rapport final

Quand tout est fini, et seulement alors, écris en français un rapport court et factuel :

1. La commande pour jouer en local.
2. Le tableau de la définition de « terminé », avec statut et preuve pour chaque ligne.
3. Les résultats réels : tests, couverture, scores Lighthouse, taille du bundle, FPS du proxy.
4. **Ce qui n'est pas fait ou pas vérifié**, sans enjoliver : contenu de `BLOCKERS.md`, points non vérifiables ici
   (appareil réel, relecture humaine des faits, avis juridique), écarts au prompt.
5. Les décisions de `DECISIONS.md` que je devrais relire en priorité.

Commence maintenant par J0, et ne t'arrête qu'une fois J9 terminé.
