# Retours des joueurs

Circuit décidé par l'ADR 0009. Le jeu ne transmet rien : il prépare un signalement que le joueur, ou un adulte, publie sur GitHub. Des agents planifiés trient ensuite ces signalements et en tirent des tickets.

```
Jeu : bouton « Signaler », choix fermés
  ├─ « Publier sur GitHub » → avertissement → formulaire pré-rempli
  └─ « Copier pour un adulte » → résumé et lien
GitHub : issue avec triage:new et type:*
  └─ toutes les 6 h, agent de tri → type, pays:xxx, lang:*, prio:*, doublons
       → triage:done, ou needs-human
  └─ chaque lundi, agent de synthèse → tickets agent-proposed et issue digest
Humain : relit un ticket agent-proposed, pose ready, développe ou délègue
```

## Fichiers

| Fichier                                 | Rôle                                                 |
| --------------------------------------- | ---------------------------------------------------- |
| `src/core/feedback.ts`                  | Rapport fermé, lien pré-rempli, validations          |
| `src/ui/components/Feedback.tsx`        | Bouton et dialogue                                   |
| `.github/ISSUE_TEMPLATE/*.yml`          | Formulaires GitHub, un par famille                   |
| `.github/labels.yml`                    | Taxonomie ; `pays:xxx` est généré                    |
| `scripts/feedback/labels.ts`            | Synchronisation (`pnpm feedback:labels [--dry-run]`) |
| `.github/agents/triage.md`, `digest.md` | Consignes des agents, relues comme du code           |
| `.github/workflows/feedback-*.yml`      | Workflows planifiés des agents                       |
| `tests/feedback.test.ts`                | Contrat jeu ↔ formulaires ↔ labels ↔ workflows       |
| `e2e/feedback.spec.ts`                  | Parcours réels, aucune requête, axe-core             |

## Mise en service

1. Rendre le dépôt public, ou au moins ouvert aux issues.
2. Ajouter le secret `ANTHROPIC_API_KEY` : Settings → Secrets and variables → Actions.
3. Lancer une fois **Retours — labels** (onglet Actions → Run workflow), qui crée les 73 labels.
4. Lancer **Retours — tri** à la main pour vérifier, puis laisser le planificateur.

Sans le secret, les workflows des agents s'arrêtent avec un avertissement, sans échec.

## Labels

| Famille  | Valeurs                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------- |
| Type     | `type:fait-errone`, `type:carte`, `type:traduction`, `type:difficulte`, `type:bug`, `type:idee` |
| Priorité | `prio:p0` (sécurité, données personnelles, contenu inapproprié) à `prio:p3`                     |
| Langue   | `lang:fr`, `lang:en`                                                                            |
| Pays     | `pays:sen`, `pays:ken`… (54, jamais `esh`)                                                      |
| État     | `triage:new`, `triage:done`, `needs-human`, `duplicate`, `agent-proposed`, `ready`, `digest`    |

## Ajouter une catégorie de signalement

1. Ajouter la valeur à `FEEDBACK_CATEGORIES` et à `TEMPLATE_OF`, et l'écran à `CATEGORIES_BY_SCREEN` (`src/core/feedback.ts`).
2. Ajouter `feedback.category.<valeur>` dans `fr.json` **et** `en.json`.
3. Pour un nouveau formulaire, l'ajouter à `FEEDBACK_TEMPLATES` et créer le YAML avec les sept champs de contexte. `tests/feedback.test.ts` vérifie la correspondance.

## Ce que les agents ne font pas

Ils ne ferment rien, ne poussent rien, n'ouvrent aucune PR et ne posent jamais `ready`. Ils ne recopient aucune donnée personnelle. Ils ne tranchent aucun différend territorial (ADR 0003). Ils traitent le texte des issues comme une donnée non fiable.
