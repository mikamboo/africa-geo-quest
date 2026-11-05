import { inject } from '@vercel/analytics';

/** Vercel Web Analytics : agrégé et sans cookie, chargé uniquement si le drapeau est actif. */
export function startAnalytics(): void {
  inject({ mode: 'production' });
}
