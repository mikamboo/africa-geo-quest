import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AVATAR_IDS, type AvatarId } from '../../core/progress';
import { generatePseudonyms } from '../../core/pseudonyms';
import { createRng } from '../../core/rng';
import type { Level } from '../../core/types';
import { Avatar } from '../components/Avatar';
import { formatPseudonym } from '../format';
import { useGameStore } from '../store';

export function SetupScreen() {
  const { t } = useTranslation();
  const createProfile = useGameStore((state) => state.createProfile);
  const navigate = useGameStore((state) => state.navigate);
  const [avatar, setAvatar] = useState<AvatarId>('amina');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const names = generatePseudonyms(createRng(seed), 4);
  const [nameIndex, setNameIndex] = useState(0);
  const [level, setLevel] = useState<Level>('explorer');

  return (
    <main className="page" data-testid="setup-screen">
      <div className="band" aria-hidden="true" />
      <h1>{t('setup.title')}</h1>
      <fieldset className="choices">
        <legend>{t('setup.avatar')}</legend>
        <div className="avatars">
          {AVATAR_IDS.map((id) => (
            <label key={id} className={`choice choice--avatar${avatar === id ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="avatar"
                className="sr-only"
                checked={avatar === id}
                data-testid={`avatar-${id}`}
                onChange={() => setAvatar(id)}
              />
              <Avatar id={id} size={78} />
              <span>{t(`avatar.${id}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="choices">
        <legend>{t('setup.pseudonym')}</legend>
        <div className="names">
          {names.map((name, index) => (
            <label
              key={`${name.role}-${name.adjective}`}
              className={`choice${nameIndex === index ? ' is-active' : ''}`}
            >
              <input
                type="radio"
                name="pseudonym"
                className="sr-only"
                checked={nameIndex === index}
                data-testid={`pseudonym-${index}`}
                onChange={() => setNameIndex(index)}
              />
              <span>{formatPseudonym(t, name)}</span>
            </label>
          ))}
        </div>
        <button type="button" className="btn btn--small" onClick={() => setSeed(seed + 1)}>
          {t('setup.others')}
        </button>
      </fieldset>
      <fieldset className="choices">
        <legend>{t('setup.level')}</legend>
        <div className="levels">
          {(['explorer', 'geographer', 'expert'] as const).map((id) => (
            <label key={id} className={`choice choice--level${level === id ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="level"
                className="sr-only"
                checked={level === id}
                data-testid={`level-${id}`}
                onChange={() => setLevel(id)}
              />
              <strong>{t(`setup.${id}`)}</strong>
              <span>{t(`setup.${id}Desc`)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="muted">{t('setup.privacy')}</p>
      <button
        type="button"
        className="btn btn--primary btn--large"
        data-testid="setup-go"
        onClick={() => {
          createProfile({ avatar, pseudonym: names[nameIndex]! }, level);
          navigate('home');
        }}
      >
        {t('setup.go')}
      </button>
    </main>
  );
}
