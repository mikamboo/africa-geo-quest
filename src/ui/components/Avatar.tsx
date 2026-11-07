import { useEffect, useRef } from 'react';
import type { AvatarId } from '../../core/progress';
import { drawCharacter, LOOKS, type CharacterLook } from '../../render/characters';

export function Avatar({
  id,
  look,
  size = 96,
}: {
  id?: AvatarId;
  look?: CharacterLook;
  size?: number;
}) {
  const resolved = look ?? LOOKS[id ?? 'amina'];
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    // Créer un contexte Canvas 2D coûte cher : chaque avatar se dessine dans sa propre tâche.
    const timer = window.setTimeout(() => {
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(canvas.width / 48, canvas.height / 64);
      drawCharacter(ctx, resolved, 'down', 4);
      ctx.restore();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [resolved]);
  return (
    <canvas
      ref={ref}
      className="avatar"
      width={size * 2}
      height={(size * 2 * 64) / 48}
      style={{ width: size, height: (size * 64) / 48 }}
      aria-hidden="true"
    />
  );
}
