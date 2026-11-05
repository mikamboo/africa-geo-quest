import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { joystick } from '../input';

const RADIUS = 52;

/** Joystick tactile : écrit directement dans l'état d'entrée lu par la boucle de jeu. */
export function Joystick() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);

  function move(event: ReactPointerEvent<HTMLDivElement>): void {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    const clamp = length > RADIUS ? RADIUS / length : 1;
    const x = dx * clamp;
    const y = dy * clamp;
    setOffset({ x, y });
    // Petite zone morte pour ne pas dériver quand le doigt est posé.
    joystick.x = Math.abs(x) < 6 ? 0 : x / RADIUS;
    joystick.y = Math.abs(y) < 6 ? 0 : y / RADIUS;
  }

  function release(): void {
    activePointer.current = null;
    setOffset({ x: 0, y: 0 });
    joystick.x = 0;
    joystick.y = 0;
  }

  return (
    <div
      ref={baseRef}
      className="joystick"
      data-testid="joystick"
      aria-hidden="true"
      onPointerDown={(event) => {
        activePointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (activePointer.current === event.pointerId) move(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="joystick__knob"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      />
    </div>
  );
}
