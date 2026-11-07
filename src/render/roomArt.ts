import type { Graphics } from 'pixi.js';
import type { RoomLayout, RoomTheme } from '../core/rooms';
import { INK, PAPER } from './palette';

export const ROOM_TILE = 56;

interface RoomStyle {
  floor: number;
  floorAlt: number;
  wall: number;
  wood: number;
}

/** Chaque genre de lieu a sa lumière : on sent le changement de contexte dès l'entrée. */
const STYLES: Record<RoomTheme, RoomStyle> = {
  hall: { floor: 0xe9dcc2, floorAlt: 0xe2d3b5, wall: 0x7c4a33, wood: 0x8a5a36 },
  newsroom: { floor: 0xd9dee2, floorAlt: 0xcfd5da, wall: 0x2f4a5c, wood: 0x6f7a84 },
  studio: { floor: 0x3a3347, floorAlt: 0x332d40, wall: 0x241f30, wood: 0x57506c },
  cinema: { floor: 0x4a2230, floorAlt: 0x401c29, wall: 0x220d14, wood: 0x7a2e3a },
  library: { floor: 0xc9a77a, floorAlt: 0xbf9c6e, wall: 0x4e3524, wood: 0x6a452c },
  lab: { floor: 0xe6ecea, floorAlt: 0xdbe3e0, wall: 0x2c5a56, wood: 0x8fa3a0 },
  gallery: { floor: 0xf2ece0, floorAlt: 0xebe4d6, wall: 0x8a8378, wood: 0xcfc6b6 },
  stadium: { floor: 0xcfd2cc, floorAlt: 0xc6c9c2, wall: 0x37474f, wood: 0x607d8b },
};

function drawFurniture(g: Graphics, code: string, x: number, y: number, style: RoomStyle): void {
  const t = ROOM_TILE;
  switch (code) {
    case 'T': // Bureau et écran.
      g.rect(x + 3, y + 8, t - 6, t - 16).fill(style.wood);
      g.rect(x + 16, y + 14, 24, 16).fill(INK);
      g.rect(x + 18, y + 16, 20, 12).fill(0x6dbbd8);
      break;
    case 'C': // Vitrine, table ou rangée de sièges selon le lieu.
      g.roundRect(x + 5, y + 8, t - 10, t - 16, 6).fill(style.wood);
      g.rect(x + 12, y + 16, t - 24, 6).fill({ color: PAPER, alpha: 0.5 });
      break;
    case 'S': {
      // Rayonnages : le dos de chaque livre apporte de la couleur.
      g.rect(x + 2, y + 2, t - 4, t - 4).fill(style.wood);
      const colors = [0xb5381f, 0xf0b03a, 0x1e6f8f, 0x3f6a1f, PAPER];
      for (let row = 0; row < 3; row += 1) {
        for (let book = 0; book < 6; book += 1) {
          g.rect(x + 6 + book * 7, y + 7 + row * 15, 5, 12).fill(colors[(book + row * 2) % 5]!);
        }
      }
      break;
    }
    case 'K': // Écran ou console.
      g.rect(x + 2, y + 6, t - 4, t - 14).fill(INK);
      g.rect(x + 6, y + 10, t - 12, t - 22).fill(0x2e6e8e);
      g.rect(x + 10, y + 16, t - 24, 3).fill(PAPER);
      break;
    case 'P': // Enceintes ou imprimante 3D.
      g.roundRect(x + 8, y + 4, t - 16, t - 8, 6).fill(INK);
      g.circle(x + t / 2, y + t / 2 + 6, 10).fill(0x57506c);
      g.circle(x + t / 2, y + 16, 5).fill(0x57506c);
      break;
    case 'G': // Pelouse d'entraînement.
      g.rect(x, y, t, t).fill(0x5f9148);
      if ((x / t + y / t) % 2 === 0) g.rect(x, y, t, t).fill({ color: 0xffffff, alpha: 0.06 });
      break;
  }
}

/** Dessine le plan en grille : sol, murs, mobilier, porte, carte murale et panneau. */
export function drawRoom(g: Graphics, layout: RoomLayout, accent: number): void {
  const t = ROOM_TILE;
  const style = STYLES[layout.theme];
  layout.rows.forEach((row, rowIndex) => {
    [...row].forEach((code, column) => {
      const x = column * t;
      const y = rowIndex * t;
      const isWall =
        code === '#' ||
        ((code === 'M' || code === 'N') &&
          (rowIndex === 0 || column === 0 || column === row.length - 1));
      if (isWall) {
        g.rect(x, y, t, t).fill(style.wall);
        // Plinthe : donne un peu de profondeur au mur du haut.
        if (rowIndex === 0) g.rect(x, y + t - 8, t, 8).fill({ color: 0x000000, alpha: 0.25 });
      } else {
        g.rect(x, y, t, t).fill((column + rowIndex) % 2 === 0 ? style.floor : style.floorAlt);
      }
      drawFurniture(g, code, x, y, style);
    });
  });
  // Seconde passe : portes et décor mural, pour qu'une case voisine ne les recouvre pas.
  layout.rows.forEach((row, rowIndex) => {
    [...row].forEach((code, column) => {
      const x = column * t;
      const y = rowIndex * t;
      if (code === 'D') {
        g.rect(x, y, t, t).fill(accent);
        g.rect(x + 4, y + t - 6, t - 8, 3).fill({ color: PAPER, alpha: 0.8 });
      }
      // Une carte sur deux cases n'est dessinée qu'une fois, sur toute sa largeur.
      if (code === 'M' && row[column - 1] !== 'M') {
        const wide = row[column + 1] === 'M' ? t * 2 : t;
        g.rect(x + 4, y + 8, wide - 8, t - 18)
          .fill(PAPER)
          .stroke({ color: INK, width: 2 });
        const cx = x + wide / 2;
        g.poly([
          cx - 13,
          y + 13,
          cx + 9,
          y + 15,
          cx + 12,
          y + 22,
          cx + 3,
          y + 26,
          cx + 1,
          y + 34,
          cx - 5,
          y + 34,
          cx - 8,
          y + 26,
          cx - 14,
          y + 21,
        ]).fill(accent);
      }
      if (code === 'N') {
        g.rect(x + 8, y + 8, t - 16, t - 18)
          .fill(accent)
          .stroke({ color: INK, width: 2 });
        g.rect(x + 14, y + 14, t - 28, 3).fill(PAPER);
        g.rect(x + 14, y + 22, t - 28, 3).fill(PAPER);
      }
    });
  });
  g.rect(0, 0, layout.width * t, layout.height * t).stroke({ color: INK, width: 3 });
}
