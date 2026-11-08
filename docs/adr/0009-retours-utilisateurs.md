# ADR 0009 : retours des joueurs, triés par des agents

**Statut :** accepté. Amende l'ADR 0004 sans en changer le principe : le jeu ne collecte toujours aucune donnée. **Analyse technique à faire valider par une personne qualifiée. Ce n'est pas un avis juridique.**

## Contexte

Le propriétaire veut que le jeu évolue à partir des retours de ses joueurs, et que des agents IA lancés par la CI trient ces retours, les regroupent et rédigent les tickets. Un formulaire classique (texte libre envoyé à un serveur) violerait trois règles : aucune saisie libre, aucun backend, aucune requête vers un tiers au runtime.

## Décision

**Dans le jeu : une contribution guidée, jamais transmise par le jeu.**

- Un bouton « Améliorer Tembea » apparaît sur la carte (icône ampoule en haut), sur la fiche pays, après une réponse au quiz et dans la page « À propos ». Le joueur choisit une catégorie dans une liste fermée, et rien d'autre.
- `src/core/feedback.ts` assemble un rapport à partir de valeurs fermées : catégorie, code pays, identifiant de question, écran, langue, niveau, version. Toute valeur hors liste est refusée.
- Le jeu en tire deux sorties, l'une comme l'autre déclenchée par un clic explicite :
  - un lien GitHub pré-rempli, ouvert par `ExternalLink` derrière l'écran d'avertissement ;
  - un résumé copié dans le presse-papiers, que l'on peut confier à un adulte. Le presse-papiers n'est jamais lu.
- GitHub est réservé aux plus de 13 ans. Le dialogue le dit, et propose la copie aux plus jeunes.

**Sur GitHub : des formulaires, une taxonomie, deux agents.**

- `.github/ISSUE_TEMPLATE/` contient cinq formulaires (fait ou carte, texte ou traduction, difficulté, bug, idée). Ils portent les champs que le jeu pré-remplit, et une case obligatoire « aucune donnée personnelle ». Les issues vierges sont désactivées.
- `.github/labels.yml` décrit la taxonomie : type, priorité, langue, état. Les labels `pays:xxx` sont générés à partir de `data/countries.json`, sans `ESH` (ADR 0003).
- `feedback-triage.yml` tourne toutes les six heures. L'agent étiquette, repère les doublons, compare un fait signalé aux données du dépôt et fixe une priorité. S'il hésite, il passe l'issue à `needs-human`.
- `feedback-digest.yml` tourne chaque semaine. L'agent regroupe les retours triés en tickets `agent-proposed` et publie une synthèse. Un humain valide un ticket en posant `ready`.
- Les consignes des agents vivent dans `.github/agents/*.md`. Elles sont relues comme du code.

## Sécurité

- **Aucun flux réseau nouveau dans le jeu.** Le test e2e « aucune requête hors origine » reste inchangé, et `e2e/feedback.spec.ts` vérifie que la contribution n’en ajoute aucune.
- **Pas de déclencheur `issues: opened`.** Seuls le planificateur et les mainteneurs lancent les agents, jamais l'auteur d'une issue. Le texte des issues n'est jamais interpolé dans le prompt ni dans une expression du workflow.
- **Injection de prompt :** le contenu des issues est déclaré non fiable dans les consignes. Les agents n'ont que `contents: read` et `issues: write`, et une liste fermée de commandes `gh issue …` et `gh label list`. Ils ne peuvent ni fermer, ni pousser, ni ouvrir de PR. Le pire cas est donc du bruit dans les issues, réversible.
- L'action `anthropics/claude-code-action` est épinglée sur un commit. `tests/feedback.test.ts` vérifie les déclencheurs, les permissions, l'épinglage et les outils autorisés.
- **Données personnelles déposées malgré tout sur GitHub :** l'agent les signale en `prio:p0` et `needs-human`, sans les recopier. Un mainteneur masque le contenu.

## Conséquences

- Le propriétaire doit ajouter le secret `ANTHROPIC_API_KEY`. Sans lui, les workflows s'arrêtent proprement avec un avertissement.
- Le dépôt GitHub doit être public pour que les joueurs puissent ouvrir des issues.
- Les contributions passent par un compte GitHub. C'est une barrière pour le grand public, assumée tant qu'il n'y a pas de backend.
- Les agents ne modifient jamais le jeu. Une correction suit le circuit habituel : PR humaine, `pnpm verify`, `reviewStatus: ai-draft` pour les faits.

## Alternatives écartées

- **Formulaire avec texte libre et fonction serveur :** collecte de données, modération, analyse RGPD et COPPA complète. L'ADR 0004 devrait être rouvert.
- **Service de formulaires tiers intégré :** requête vers un tiers au runtime, interdite.
- **Agent déclenché à chaque nouvelle issue :** n'importe quel auteur d'issue pourrait lancer l'agent sur un contenu qu'il contrôle. La planification limite ce risque et le coût.
- **Agents qui ouvrent des PR de correction :** reporté. Le contenu vise des enfants : un humain écrit encore chaque correction.

## À faire valider par un humain

- La mention des 13 ans et la copie pour un adulte.
- Le traitement des issues GitHub au regard du RGPD : c'est GitHub qui les héberge, et l'éditeur les lit.
