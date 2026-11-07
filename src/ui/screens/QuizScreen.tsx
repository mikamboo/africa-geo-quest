import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { capitalsOf, countryByCode, type GameCatalog } from '../../core/catalog';
import { dayNumber } from '../../core/leitner';
import { generateQuiz, type QuizQuestion } from '../../core/quiz';
import { createRng } from '../../core/rng';
import type { Locale } from '../../core/types';
import { FeedbackButton } from '../components/Feedback';
import { countryShape } from '../countryShape';
import { useGameStore } from '../store';
import { useGameData } from '../useGameData';

function countryName(catalog: GameCatalog, code: string, locale: Locale): string {
  return countryByCode(catalog, code)?.names[locale] ?? code;
}

function capitalName(catalog: GameCatalog, code: string, locale: Locale): string {
  return capitalsOf(catalog, code)[0]?.names[locale] ?? code;
}

function placeName(catalog: GameCatalog, id: string, locale: Locale): string {
  return catalog.places.find((place) => place.id === id)?.names[locale] ?? id;
}

function promptOf(
  t: TFunction,
  question: QuizQuestion,
  catalog: GameCatalog,
  locale: Locale,
): string {
  const country = countryName(catalog, question.subject, locale);
  switch (question.kind) {
    case 'capital-of':
      return t('quiz.capitalOf', { country });
    case 'country-of-capital':
      return t('quiz.countryOfCapital', {
        capital: capitalName(catalog, question.subject, locale),
      });
    case 'flag-of':
      return t('quiz.flagOf');
    case 'shape-of':
      return t('quiz.shapeOf');
    case 'region-of':
      return t('quiz.regionOf', { country });
    case 'city-in':
      return t('quiz.cityIn', { place: placeName(catalog, question.subject, locale) });
    case 'borders':
      return t('quiz.borders', { country });
    case 'landlocked':
      return t('quiz.landlocked');
  }
}

function optionLabel(
  t: TFunction,
  question: QuizQuestion,
  option: string,
  catalog: GameCatalog,
  locale: Locale,
): string {
  if (question.kind === 'capital-of') return placeName(catalog, option, locale);
  if (question.kind === 'region-of') return t(`region.${option}`);
  return countryName(catalog, option, locale);
}

function explanationOf(
  t: TFunction,
  question: QuizQuestion,
  catalog: GameCatalog,
  locale: Locale,
): string {
  const country = countryName(catalog, question.subject, locale);
  if (question.kind === 'capital-of') {
    return t('quiz.explainCapital', {
      country,
      capital: placeName(catalog, question.answer, locale),
    });
  }
  if (question.kind === 'region-of') {
    return t('quiz.explainRegion', { country, region: t(`region.${question.answer}`) });
  }
  return t('quiz.explainCountry', { country: countryName(catalog, question.answer, locale) });
}

export function QuizScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const { data, failed, retry } = useGameData();
  const progress = useGameStore((state) => state.progress);
  const answerQuiz = useGameStore((state) => state.answerQuiz);
  const navigate = useGameStore((state) => state.navigate);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);

  const questions = useMemo(() => {
    if (!data) return [];
    return generateQuiz(createRng(seed + round), data.catalog, progress, dayNumber(new Date()));
    // Le quiz est figé pour la manche en cours : y répondre ne doit pas le régénérer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, round]);

  const back = (
    <button type="button" className="btn" onClick={() => navigate('home')}>
      {t('common.back')}
    </button>
  );

  const question = questions[index];
  const shape = useMemo(
    () => (data && question?.kind === 'shape-of' ? countryShape(data, question.subject) : null),
    [data, question],
  );

  const answer = useCallback(
    (option: string) => {
      if (!question || !data || picked !== null) return;
      setPicked(option);
      const isRight = option === question.answer;
      if (isRight) setCorrect((value) => value + 1);
      else setMissed((list) => [...list, explanationOf(t, question, data.catalog, locale)]);
      answerQuiz(question.itemId, isRight);
    },
    [question, data, picked, answerQuiz, t, locale],
  );

  // Clavier : les chiffres répondent, et le focus passe sur « Question suivante ».
  useEffect(() => {
    if (picked !== null) nextRef.current?.focus();
  }, [picked]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const option = question?.options[Number(event.key) - 1];
      if (option) answer(option);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [question, answer]);
  const finished = data !== null && index >= questions.length && questions.length > 0;

  return (
    <main className="page" data-testid="quiz-screen">
      <div className="band" aria-hidden="true" />
      <div className="page__head">
        <h1>{t('quiz.title')}</h1>
        {back}
      </div>
      {failed && (
        <p>
          {t('app.loadError')}{' '}
          <button type="button" className="btn btn--small" onClick={retry}>
            {t('app.retry')}
          </button>
        </p>
      )}
      {!data && !failed && <p>{t('app.loading')}</p>}
      {data && questions.length === 0 && <p>{t('quiz.empty')}</p>}
      {data && question && (
        <section className="panel" data-testid="quiz-question" data-item={question.itemId}>
          <p className="muted">
            {t('quiz.progress', { current: index + 1, total: questions.length })}
          </p>
          <div
            className="meter meter--thin"
            role="progressbar"
            aria-valuenow={index}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-label={t('quiz.progress', { current: index + 1, total: questions.length })}
          >
            <div
              className="meter__fill"
              style={{ width: `${(index / questions.length) * 100}%` }}
            />
          </div>
          <h2 className="quiz-question">{promptOf(t, question, data.catalog, locale)}</h2>
          {question.kind === 'flag-of' && (
            <img
              className="quiz-flag"
              src={`/flags/${countryByCode(data.catalog, question.subject)?.iso2}.svg`}
              alt={t('quiz.flagOf')}
              width="240"
              height="180"
            />
          )}
          {question.kind === 'shape-of' && shape && (
            <svg
              className="quiz-shape"
              viewBox={shape.viewBox}
              role="img"
              aria-label={t('quiz.shapeAlt')}
              data-testid="quiz-shape"
            >
              <path d={shape.d} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          <div className="quiz-options">
            {question.options.map((option, optionIndex) => {
              const isAnswer = picked !== null && option === question.answer;
              const isPicked = picked === option;
              return (
                <button
                  key={option}
                  type="button"
                  className={`quiz-option${isAnswer ? ' is-answer' : ''}${isPicked ? ' is-picked' : ''}`}
                  disabled={picked !== null}
                  data-testid="quiz-option"
                  data-correct={option === question.answer ? 'true' : undefined}
                  onClick={() => answer(option)}
                >
                  <kbd className="quiz-key" aria-hidden="true">
                    {optionIndex + 1}
                  </kbd>
                  {optionLabel(t, question, option, data.catalog, locale)}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="quiz-feedback" role="status" data-testid="quiz-feedback">
              <strong>{picked === question.answer ? t('quiz.right') : t('quiz.almost')}</strong>
              <p>{explanationOf(t, question, data.catalog, locale)}</p>
              {picked !== question.answer && <p>{t('quiz.again')}</p>}
              <FeedbackButton target={{ screen: 'quiz', questionId: question.itemId }} />
            </div>
          )}
          {picked !== null && (
            <button
              ref={nextRef}
              type="button"
              className="btn btn--primary"
              data-testid="quiz-next"
              onClick={() => {
                setPicked(null);
                setIndex(index + 1);
              }}
            >
              {index + 1 < questions.length ? t('quiz.next') : t('quiz.finish')}
            </button>
          )}
        </section>
      )}
      {finished && (
        <section className="panel" data-testid="quiz-done">
          <h2>{t('quiz.done')}</h2>
          <p data-testid="quiz-score">{t('quiz.score', { correct, total: questions.length })}</p>
          {missed.length > 0 ? (
            <>
              <h3 className="quiz-recap__title">{t('quiz.recapTitle')}</h3>
              <ul className="quiz-recap" data-testid="quiz-recap">
                {missed.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p>{t('quiz.encouragement')}</p>
            </>
          ) : (
            <p>{t('quiz.recapClean')}</p>
          )}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setRound(round + 1);
              setIndex(0);
              setCorrect(0);
              setMissed([]);
            }}
          >
            {t('quiz.replay')}
          </button>
        </section>
      )}
    </main>
  );
}
