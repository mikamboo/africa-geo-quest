import { useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  buildReport,
  categoriesFor,
  reportFields,
  toIssueUrl,
  type FeedbackCategory,
  type FeedbackContext,
  type FeedbackReport,
} from '../../core/feedback';
import type { Locale } from '../../core/types';
import { useGameStore } from '../store';
import { Dialog } from './Dialog';
import { ExternalLink } from './ExternalLink';
import { Icon } from './Icon';

/** Ce que l'écran sait de son contexte ; langue, niveau et version sont ajoutés ici. */
export type FeedbackTarget = Pick<FeedbackContext, 'screen' | 'country' | 'questionId'>;

/** Résumé lisible à faire publier par un adulte : uniquement les valeurs fermées du rapport. */
function plainSummary(t: TFunction, report: FeedbackReport, url: string): string {
  const lines = reportFields(report).map(([field, value]) => {
    const shown = field === 'category' ? t(`feedback.category.${value}`) : value;
    return `${t(`feedback.field.${field}`)} : ${shown}`;
  });
  return [t('feedback.summaryTitle'), ...lines, '', t('feedback.summaryLink'), url].join('\n');
}

function FeedbackDialog({ target, onClose }: { target: FeedbackTarget; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const level = useGameStore((state) => state.progress.level);
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  const context: FeedbackContext = useMemo(
    () => ({ ...target, locale: i18n.language as Locale, level, appVersion: __APP_VERSION__ }),
    [target, i18n.language, level],
  );

  // Les valeurs viennent de listes fermées : un échec ici est un bug, signalé en console.
  const built = useMemo(() => {
    if (!category) return null;
    try {
      const report = buildReport(context, category);
      return { report, url: toIssueUrl(report) };
    } catch (error) {
      console.error(error);
      return null;
    }
  }, [context, category]);

  return (
    <Dialog
      labelledBy="feedback-title"
      describedBy="feedback-intro"
      className="dialog--feedback"
      testId="feedback-dialog"
      onEscape={onClose}
    >
      <h2 id="feedback-title">{t('feedback.title')}</h2>
      <p id="feedback-intro">{t('feedback.intro')}</p>
      <div className="feedback-choices" role="group" aria-label={t('feedback.choose')}>
        {categoriesFor(target.screen).map((option) => (
          <button
            key={option}
            type="button"
            className={`feedback-choice${category === option ? ' is-active' : ''}`}
            aria-pressed={category === option}
            data-testid={`feedback-${option}`}
            onClick={() => {
              setCategory(option);
              setCopied('idle');
            }}
          >
            {t(`feedback.category.${option}`)}
          </button>
        ))}
      </div>
      {category && !built && (
        <p role="alert" data-testid="feedback-error">
          {t('feedback.error')}
        </p>
      )}
      {built && (
        <div className="feedback-send" data-testid="feedback-send">
          <p className="muted">{t('feedback.privacy')}</p>
          <div className="dialog__actions">
            <ExternalLink href={built.url} className="btn btn--primary" testId="feedback-github">
              {t('feedback.github')}
            </ExternalLink>
            <button
              type="button"
              className="btn"
              data-testid="feedback-copy"
              onClick={() => {
                navigator.clipboard
                  .writeText(plainSummary(t, built.report, built.url))
                  .then(() => setCopied('done'))
                  .catch(() => setCopied('failed'));
              }}
            >
              {t('feedback.copy')}
            </button>
          </div>
          <p className="muted" role="status" data-testid="feedback-copy-status">
            {copied === 'done' && t('feedback.copied')}
            {copied === 'failed' && t('feedback.copyFailed')}
          </p>
          <p className="muted">{t('feedback.young')}</p>
        </div>
      )}
      <div className="dialog__actions">
        <button type="button" className="btn" data-testid="feedback-close" onClick={onClose}>
          {t('feedback.close')}
        </button>
      </div>
    </Dialog>
  );
}

/**
 * Bouton « Améliorer Tembea » : ouvre la contribution guidée, sans saisie libre ni envoi par le jeu.
 * `variant="icon"` affiche une ampoule seule, avec le libellé en nom accessible et en infobulle.
 */
export function FeedbackButton({
  target,
  className = 'btn btn--small',
  variant = 'text',
  testId = 'feedback-open',
  onOpenChange,
}: {
  target: FeedbackTarget;
  className?: string;
  variant?: 'text' | 'icon';
  testId?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toggle = (next: boolean): void => {
    setOpen(next);
    onOpenChange?.(next);
  };
  const label = t('feedback.open');
  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          className="icon-btn"
          data-testid={testId}
          aria-label={label}
          title={label}
          onClick={() => toggle(true)}
        >
          <Icon name="idea" />
        </button>
      ) : (
        <button
          type="button"
          className={className}
          data-testid={testId}
          onClick={() => toggle(true)}
        >
          {label}
        </button>
      )}
      {open && <FeedbackDialog target={target} onClose={() => toggle(false)} />}
    </>
  );
}
