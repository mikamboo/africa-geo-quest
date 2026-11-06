/** Le score récompense sans jamais retirer de points : il n'y a pas de pénalité. */
export const MISSION_BASE_POINTS = 100;
export const QUIZ_POINTS_PER_CORRECT = 20;
export const QUIZ_POINTS_PER_ATTEMPT = 5;
export const STAMP_POINTS = 10;
/** Niveau Expert : réussir sans demander la boussole rapporte plus, sans rien retirer à personne. */
export const UNAIDED_BONUS = 50;
export const PLACE_POINTS = 5;

/** Bonus de rapidité : uniquement si le chronomètre est activé, plafonné à 100 points. */
export function missionPoints(elapsedSeconds: number, timed: boolean, unaided = false): number {
  const aidBonus = unaided ? UNAIDED_BONUS : 0;
  if (!timed) return MISSION_BASE_POINTS + aidBonus;
  const bonus = Math.max(0, Math.round(100 - elapsedSeconds));
  return MISSION_BASE_POINTS + bonus + aidBonus;
}

export function quizPoints(correct: boolean): number {
  return correct ? QUIZ_POINTS_PER_CORRECT : QUIZ_POINTS_PER_ATTEMPT;
}

/** Score du défi du jour : plus la mission est rapide, plus il est haut, avec un plancher. */
export function dailyScore(elapsedSeconds: number): number {
  return Math.max(100, Math.round(1000 - elapsedSeconds * 5));
}
