import type { Facing } from '../core/movement';
import type { AvatarId } from '../core/progress';

/**
 * Personnages dessinés par code, sur Canvas 2D et sans PixiJS, pour servir aussi au menu.
 * Tenues du quotidien, sac à dos d'explorateur : ni costume « typique » ni trait caricatural.
 */
export interface CharacterLook {
  skin: string;
  skinShade: string;
  hair: string;
  shirt: string;
  shirtShade: string;
  bottom: string;
  shoes: string;
  pack: string;
  hairStyle: 'puffs' | 'short' | 'braids' | 'curls';
}

export const LOOKS: Record<AvatarId, CharacterLook> = {
  amina: {
    skin: '#7A4A2B',
    skinShade: '#643A20',
    hair: '#221510',
    shirt: '#F2B632',
    shirtShade: '#D4971B',
    bottom: '#2F6B6F',
    shoes: '#F7F0E0',
    pack: '#B5381F',
    hairStyle: 'puffs',
  },
  kofi: {
    skin: '#5A3420',
    skinShade: '#472717',
    hair: '#17100C',
    shirt: '#C8452A',
    shirtShade: '#A5361F',
    bottom: '#23374D',
    shoes: '#E9A820',
    pack: '#3E7A34',
    hairStyle: 'short',
  },
  zola: {
    skin: '#94603A',
    skinShade: '#7C4E2D',
    hair: '#2C1A12',
    shirt: '#2E86A8',
    shirtShade: '#226C89',
    bottom: '#E6B24A',
    shoes: '#FFF6E3',
    pack: '#6A3B7C',
    hairStyle: 'braids',
  },
  idir: {
    skin: '#B9835A',
    skinShade: '#9E6D48',
    hair: '#3A2418',
    shirt: '#4F8A3A',
    shirtShade: '#3E7030',
    bottom: '#6B4A2F',
    shoes: '#F2B632',
    pack: '#E07A2F',
    hairStyle: 'curls',
  },
};

export const CELL_WIDTH = 96;
export const CELL_HEIGHT = 128;
export const DIRECTIONS: Facing[] = ['down', 'left', 'right', 'up'];
/** 4 images de marche puis 2 images de repos. */
export const FRAMES_PER_DIRECTION = 6;

function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  look: CharacterLook,
  facing: Facing,
  headY: number,
): void {
  const c = look.hair;
  const side = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  switch (look.hairStyle) {
    case 'puffs':
      if (facing !== 'up') {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(24 - side * 4, headY - 3, 16.5, Math.PI, 2 * Math.PI);
        ctx.fill();
      } else {
        circle(ctx, 24, headY, 16.5, c);
      }
      circle(ctx, side === 1 ? 11 : 9, headY - 15, 8, c);
      circle(ctx, side === -1 ? 37 : 39, headY - 15, 8, c);
      break;
    case 'short':
      if (facing === 'up') {
        circle(ctx, 24, headY, 16, c);
      } else {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(24 - side * 3, headY - 2, 16.5, Math.PI * 1.02, Math.PI * 1.98);
        ctx.closePath();
        ctx.fill();
      }
      break;
    case 'braids': {
      if (facing === 'up') circle(ctx, 24, headY, 16.5, c);
      else {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(24 - side * 3, headY - 3, 16.5, Math.PI, 2 * Math.PI);
        ctx.fill();
      }
      const strands =
        facing === 'up' ? [12, 18, 24, 30, 36] : side === 0 ? [8, 40] : [24 - side * 15];
      for (const x of strands) {
        rounded(ctx, x - 2.5, headY - 2, 5, 25, 2.5, c);
        circle(ctx, x, headY + 24, 3, '#E9A820');
      }
      break;
    }
    case 'curls': {
      const bumps =
        facing === 'up'
          ? [
              [12, -8],
              [20, -14],
              [28, -14],
              [36, -8],
              [14, 2],
              [24, -2],
              [34, 2],
              [24, 8],
            ]
          : [
              [10, -6],
              [16, -13],
              [24, -16],
              [32, -13],
              [38, -6],
            ];
      for (const [x, y] of bumps) circle(ctx, x! - side * 3, headY + y!, 7.5, c);
      break;
    }
  }
}

function drawFace(ctx: CanvasRenderingContext2D, facing: Facing, headY: number): void {
  if (facing === 'up') return;
  const white = '#FFF9EE';
  const ink = '#1B110C';
  const eyes = facing === 'down' ? [17, 31] : facing === 'left' ? [14] : [34];
  for (const x of eyes) {
    circle(ctx, x, headY + 2, 4, white);
    circle(ctx, x + (facing === 'left' ? -1 : facing === 'right' ? 1 : 0), headY + 2.4, 2.4, ink);
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const mouthX = facing === 'down' ? 24 : facing === 'left' ? 15 : 33;
  ctx.arc(mouthX, headY + 7, 3.2, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

/** Dessine une image dans une cellule logique de 48×64 (mise à l'échelle par l'appelant). */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  look: CharacterLook,
  facing: Facing,
  frame: number,
): void {
  // Marge haute pour les coiffures volumineuses : le dessin tient dans la cellule.
  ctx.save();
  ctx.translate(3.6, 9.6);
  ctx.scale(0.85, 0.85);
  const walking = frame < 4;
  const swing = walking ? [5, 0, -5, 0][frame]! : 0;
  const bob = walking ? [0, -1.5, 0, -1.5][frame]! : frame === 5 ? 0.8 : 0;
  const headY = 18 + bob;
  const side = facing === 'left' || facing === 'right';
  const dir = facing === 'left' ? -1 : 1;

  // Ombre portée.
  ctx.fillStyle = 'rgba(42, 26, 18, 0.22)';
  ctx.beginPath();
  ctx.ellipse(24, 60, 13, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jambes et chaussures.
  const legs = side
    ? [
        { x: 24 + swing * dir, front: true },
        { x: 24 - swing * dir, front: false },
      ]
    : [
        { x: 17, offset: swing, front: true },
        { x: 31, offset: -swing, front: true },
      ];
  for (const leg of legs) {
    const offset = 'offset' in leg ? (leg.offset ?? 0) : 0;
    const length = 11 - Math.abs(offset) * 0.4;
    rounded(ctx, leg.x - 4, 44 + bob, 8, length, 3, leg.front ? look.skin : look.skinShade);
    rounded(ctx, leg.x - 5, 40 + bob, 10, 8, 3, look.bottom);
    rounded(
      ctx,
      leg.x - 5 + (side ? dir * 1.5 : 0),
      53 + bob - Math.abs(offset) * 0.4,
      10,
      6,
      3,
      look.shoes,
    );
  }

  // Sac à dos derrière le corps, sauf de dos.
  if (facing !== 'up') {
    if (side) rounded(ctx, 24 - dir * 15, 27 + bob, 10, 15, 4, look.pack);
  }

  // Bras arrière.
  if (side) rounded(ctx, 24 - 3 - swing * dir * 0.8, 29 + bob, 6, 14, 3, look.skinShade);

  // Torse.
  rounded(ctx, 13, 27 + bob, 22, 19, 7, look.shirt);
  rounded(ctx, 13, 40 + bob, 22, 6, 3, look.shirtShade);

  if (facing === 'up') {
    rounded(ctx, 15, 27 + bob, 18, 17, 6, look.pack);
    rounded(ctx, 19, 31 + bob, 10, 6, 2, look.shirtShade);
  } else if (!side) {
    // Bretelles du sac, de face.
    rounded(ctx, 15, 27 + bob, 3, 13, 1.5, look.pack);
    rounded(ctx, 30, 27 + bob, 3, 13, 1.5, look.pack);
  }

  // Bras avant.
  if (side) {
    rounded(ctx, 24 - 3 + swing * dir * 0.8, 29 + bob, 6, 14, 3, look.skin);
  } else {
    rounded(ctx, 8, 29 + bob - swing * 0.3, 6, 14, 3, look.skin);
    rounded(ctx, 34, 29 + bob + swing * 0.3, 6, 14, 3, look.skin);
  }

  // Tête : les cheveux de derrière d'abord pour certaines coiffures, puis le visage.
  circle(ctx, 24, headY, 15, look.skin);
  drawHair(ctx, look, facing, headY);
  drawFace(ctx, facing, headY);
  ctx.restore();
}

/** Planche complète : une ligne par direction, 6 colonnes. */
export function createSpriteSheet(look: CharacterLook): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CELL_WIDTH * FRAMES_PER_DIRECTION;
  canvas.height = CELL_HEIGHT * DIRECTIONS.length;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponible');
  DIRECTIONS.forEach((facing, row) => {
    for (let frame = 0; frame < FRAMES_PER_DIRECTION; frame += 1) {
      ctx.save();
      ctx.translate(frame * CELL_WIDTH, row * CELL_HEIGHT);
      ctx.scale(2, 2);
      drawCharacter(ctx, look, facing, frame);
      ctx.restore();
    }
  });
  return canvas;
}
