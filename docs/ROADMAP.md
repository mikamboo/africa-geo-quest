# Feuille de route

Rien de ce qui suit n'est implémenté.

## v2 : classement en ligne

- Backend (Supabase ou équivalent), branché par de nouvelles implémentations de `ProgressRepository` et `ScoreRepository`, sans toucher à `core/`.
- Pseudonymes générés uniquement, toujours sans saisie libre.
- Classement par classe ou par école, via un code enseignant. Pas de classement public mondial.
- Anti-triche côté serveur : validation du temps et du parcours, seed du défi vérifiée, limitation de débit.
- Conformité mineurs : revoir l'ADR 0004 avec un juriste avant tout développement. Un backend change l'analyse RGPD et COPPA : consentement, durée de conservation, sous-traitants, analyse d'impact.

## v2 : mode enseignant

- Créer une liste de missions et la partager par code.
- Suivre une classe : réussite par pays et par thème, sans donnée nominative sur les élèves.

## v3 : contenu

- Langues africaines : lingala, swahili, arabe. L'arabe impose une mise en page de droite à gauche, et chaque langue une relecture par des locuteurs natifs.
- Géographie humaine : langues, monnaies, cultures, avec une attention particulière à la représentation.

## Dette connue

- Faits en statut `ai-draft` : à relire, voir `docs/REVIEW_FACTS.md`.
- Performance à mesurer sur un vrai téléphone.
- Îles éloignées absentes à 1:50m (Praslin, Aldabra) : à ajouter depuis une source plus fine pour les voir sur la carte.
