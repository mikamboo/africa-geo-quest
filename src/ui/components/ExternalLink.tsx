import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Aucun lien externe sans écran d'avertissement (section 6). */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const stayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) stayRef.current?.focus();
  }, [open]);
  return (
    <>
      <button type="button" className="link" onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <div className="overlay" data-testid="external-warning">
          <div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="external-title"
            aria-describedby="external-body"
          >
            <h2 id="external-title">{t('external.title')}</h2>
            <p id="external-body">{t('external.body')}</p>
            <p className="dialog__url">{new URL(href).hostname}</p>
            <div className="dialog__actions">
              <button
                ref={stayRef}
                type="button"
                className="btn btn--primary"
                onClick={() => setOpen(false)}
              >
                {t('external.stay')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  window.open(href, '_blank', 'noopener,noreferrer');
                  setOpen(false);
                }}
              >
                {t('external.continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
