import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  labelledBy: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  className?: string;
  onEscape?: () => void;
  testId?: string;
  children: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], select, input, [tabindex]:not([tabindex="-1"])';

/**
 * Fenêtre modale : place le focus dedans, l'y retient, et rend la main à la fermeture.
 * Rendue dans `document.body` : un parent animé (fiche pays) ou une autre fenêtre
 * ne doit pas servir de référence au `position: fixed` du voile.
 */
export function Dialog({
  labelledBy,
  describedBy,
  role = 'dialog',
  className = '',
  onEscape,
  testId,
  children,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => previous?.focus();
  }, []);

  return createPortal(
    <div className="overlay" data-testid={testId}>
      <div
        ref={ref}
        className={`dialog ${className}`}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onKeyDown={(event) => {
          // Les flèches ne doivent pas faire marcher le personnage derrière la fenêtre.
          event.stopPropagation();
          if (event.key === 'Escape') onEscape?.();
          if (event.key !== 'Tab') return;
          const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
          const first = items[0];
          const last = items[items.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
