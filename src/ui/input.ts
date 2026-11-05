import type { InputVector } from '../core/movement';

/** État partagé entre le clavier, le joystick et la boucle de jeu, hors du cycle React. */
export const joystick: InputVector = { x: 0, y: 0 };

const pressed = new Set<string>();

const AXES: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function readInput(): InputVector {
  let x = joystick.x;
  let y = joystick.y;
  for (const code of pressed) {
    const axis = AXES[code];
    if (axis) {
      x += axis[0];
      y += axis[1];
    }
  }
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
}

function isTextTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLSelectElement || target instanceof HTMLInputElement;
}

/** Écoute le clavier pendant la partie. Retourne la fonction de nettoyage. */
export function listenKeyboard(onZoom: (factor: number) => void): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (isTextTarget(event.target)) return;
    if (AXES[event.code]) {
      pressed.add(event.code);
      event.preventDefault();
    } else if (event.key === '+' || event.key === '=') {
      onZoom(1.25);
    } else if (event.key === '-') {
      onZoom(0.8);
    }
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    pressed.delete(event.code);
  };
  const clear = (): void => pressed.clear();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', clear);
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', clear);
    clear();
    joystick.x = 0;
    joystick.y = 0;
  };
}
