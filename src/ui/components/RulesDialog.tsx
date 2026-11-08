import { useTranslation } from 'react-i18next';
import { Dialog } from './Dialog';

const RULE_KEYS = ['walk', 'discover', 'missions', 'stamps', 'levels'] as const;

/** Règles du jeu, en cinq points : affichées au premier lancement, rouvrables depuis les réglages. */
export function RulesDialog({
  onClose,
  onAll,
}: {
  onClose: () => void;
  /** Ouvre l'écran des règles complètes. */
  onAll: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog labelledBy="rules-title" className="dialog--rules" testId="rules" onEscape={onClose}>
      <h2 id="rules-title">{t('rules.title')}</h2>
      <ol className="rules__list">
        {RULE_KEYS.map((key) => (
          <li key={key}>{t(`rules.${key}`)}</li>
        ))}
      </ol>
      <div className="dialog__actions">
        <button
          type="button"
          className="btn btn--primary"
          data-testid="rules-close"
          onClick={onClose}
        >
          {t('rules.ok')}
        </button>
        <button type="button" className="btn" data-testid="rules-all" onClick={onAll}>
          {t('rules.all')}
        </button>
      </div>
    </Dialog>
  );
}
