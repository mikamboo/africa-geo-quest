import { useEffect, useRef } from 'react';
import type { AvatarId } from '../../core/progress';
import { drawCharacter, LOOKS } from '../../render/characters';

export function Avatar({ id, size = 96 }: { id: AvatarId; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(canvas.width / 48, canvas.height / 64);
    drawCharacter(ctx, LOOKS[id], 'down', 4);
    ctx.restore();
  }, [id]);
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
