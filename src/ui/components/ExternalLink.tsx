import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from './Dialog';

/** Aucun lien externe sans écran d'avertissement (section 6). */
interface Props {
  href: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}

export function ExternalLink({ href, children, className = 'link', testId }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        data-testid={testId}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <Dialog
          role="alertdialog"
          labelledBy="external-title"
          describedBy="external-body"
          testId="external-warning"
          onEscape={() => setOpen(false)}
        >
          <h2 id="external-title">{t('external.title')}</h2>
          <p id="external-body">{t('external.body')}</p>
          <p className="dialog__url" data-testid="external-host">
            {new URL(href).hostname}
          </p>
          <div className="dialog__actions">
            <button type="button" className="btn btn--primary" onClick={() => setOpen(false)}>
              {t('external.stay')}
            </button>
            <button
              type="button"
              className="btn"
              data-testid="external-continue"
              onClick={() => {
                window.open(href, '_blank', 'noopener,noreferrer');
                setOpen(false);
              }}
            >
              {t('external.continue')}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
