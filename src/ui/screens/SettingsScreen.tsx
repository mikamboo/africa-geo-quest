import { useTranslation } from 'react-i18next';
import type { Level } from '../../core/types';
import { useGameStore } from '../store';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const settings = useGameStore((state) => state.settings);
  const level = useGameStore((state) => state.progress.level);
  const updateSettings = useGameStore((state) => state.updateSettings);
  const setLevel = useGameStore((state) => state.setLevel);
  const navigate = useGameStore((state) => state.navigate);

  const toggles = [
    { key: 'muted', label: t('settings.sound'), value: !settings.muted, invert: true },
    { key: 'dyslexia', label: t('settings.dyslexia'), value: settings.dyslexia, invert: false },
    {
      key: 'reduceMotion',
      label: t('settings.reduceMotion'),
      value: settings.reduceMotion,
      invert: false,
    },
    {
      key: 'noMovement',
      label: t('settings.noMovement'),
      value: settings.noMovement,
      invert: false,
    },
  ] as const;

  return (
    <main className="page" data-testid="settings-screen">
      <div className="band" aria-hidden="true" />
      <div className="page__head">
        <h1>{t('settings.title')}</h1>
        <button type="button" className="btn" onClick={() => navigate('home')}>
          {t('common.back')}
        </button>
      </div>
      <section className="panel">
        <label className="field">
          <span>{t('settings.language')}</span>
          <select
            value={settings.locale}
            data-testid="settings-language"
            onChange={(event) => {
              const locale = event.target.value as 'fr' | 'en';
              updateSettings({ locale });
              void i18n.changeLanguage(locale);
            }}
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
      </section>
      <section className="panel">
        <label className="field">
          <span>{t('settings.level')}</span>
          <select
            value={level}
            data-testid="settings-level"
            onChange={(event) => setLevel(event.target.value as Level)}
          >
            <option value="explorer">{t('setup.explorer')}</option>
            <option value="geographer">{t('setup.geographer')}</option>
          </select>
        </label>
      </section>
      <section className="panel">
        {toggles.map(({ key, label, value, invert }) => (
          <label className="toggle" key={key}>
            <input
              type="checkbox"
              checked={value}
              data-testid={`toggle-${key}`}
              onChange={(event) =>
                updateSettings({ [key]: invert ? !event.target.checked : event.target.checked })
              }
            />
            {label}
          </label>
        ))}
        <p className="muted">{t('settings.noMovementHelp')}</p>
      </section>
    </main>
  );
}
