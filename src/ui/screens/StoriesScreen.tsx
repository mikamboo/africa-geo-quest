import { useTranslation } from 'react-i18next';
import { noteId, storyById } from '../../core/stories';
import type { Locale } from '../../core/types';
import { useGameStore } from '../store';
import { useGameData } from '../useGameData';

export function StoriesScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data, failed, retry } = useGameData();
  const progress = useGameStore((state) => state.progress);
  const navigate = useGameStore((state) => state.navigate);
  const startStory = useGameStore((state) => state.startStory);
  const resumeStory = useGameStore((state) => state.resumeStory);
  const abandonStory = useGameStore((state) => state.abandonStory);

  const notes = data
    ? progress.notes.flatMap((id) => {
        const [storyId, index] = id.split(':') as [string, string];
        const story = storyById(data.stories, storyId);
        const stop = story?.stops[Number(index)];
        return story && stop && noteId(storyId, Number(index)) === id
          ? [{ id, title: story.title[locale], note: stop.note[locale] }]
          : [];
      })
    : [];

  return (
    <main className="page" data-testid="stories-screen">
      <div className="band" aria-hidden="true" />
      <div className="page__head">
        <h1>{t('stories.title')}</h1>
        <button type="button" className="btn" onClick={() => navigate('home')}>
          {t('common.back')}
        </button>
      </div>
      <p>{t('stories.intro')}</p>
      {failed && (
        <p>
          {t('app.loadError')}{' '}
          <button type="button" className="btn btn--small" onClick={retry}>
            {t('app.retry')}
          </button>
        </p>
      )}
      {!data && !failed && <p>{t('app.loading')}</p>}
      <div className="story-list">
        {data?.stories.map((story) => {
          const running = progress.story?.id === story.id;
          const done = progress.storiesDone.includes(story.id);
          return (
            <article
              key={story.id}
              className={`story-card story-card--${story.theme}${done ? ' is-done' : ''}`}
              data-testid={`story-${story.id}`}
            >
              <div>
                <p className="story-card__kicker">
                  {running
                    ? t('stories.inProgress')
                    : done
                      ? t('stories.published')
                      : t('stories.stops', { count: story.stops.length })}
                </p>
                <h2>{story.title[locale]}</h2>
                <p>{story.intro[locale]}</p>
              </div>
              <div className="story-card__actions">
                {running ? (
                  <>
                    <button type="button" className="btn btn--primary" onClick={resumeStory}>
                      {t('stories.resume')}
                    </button>
                    <button type="button" className="link" onClick={abandonStory}>
                      {t('stories.abandon')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={done ? 'btn' : 'btn btn--primary'}
                    data-testid={`story-start-${story.id}`}
                    onClick={() => startStory(story.id)}
                  >
                    {done ? t('stories.replay') : t('stories.start')}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <section className="panel" data-testid="notebook">
        <h2>{t('stories.notebook')}</h2>
        {notes.length === 0 ? (
          <p className="muted">{t('stories.emptyNotebook')}</p>
        ) : (
          <ul className="notebook">
            {notes.map((note) => (
              <li key={note.id}>
                <strong>{note.title}</strong> · {note.note}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
