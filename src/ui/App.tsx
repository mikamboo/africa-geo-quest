import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HomeScreen } from './screens/HomeScreen';
import { SetupScreen } from './screens/SetupScreen';
import { useGameStore } from './store';

const PlayScreen = lazy(() =>
  import('./screens/PlayScreen').then((module) => ({ default: module.PlayScreen })),
);
const MissionsScreen = lazy(() =>
  import('./screens/MissionsScreen').then((module) => ({ default: module.MissionsScreen })),
);
const QuizScreen = lazy(() =>
  import('./screens/QuizScreen').then((module) => ({ default: module.QuizScreen })),
);
const PassportScreen = lazy(() =>
  import('./screens/PassportScreen').then((module) => ({ default: module.PassportScreen })),
);
const ParentsScreen = lazy(() =>
  import('./screens/ParentsScreen').then((module) => ({ default: module.ParentsScreen })),
);
const StoriesScreen = lazy(() =>
  import('./screens/StoriesScreen').then((module) => ({ default: module.StoriesScreen })),
);
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((module) => ({ default: module.SettingsScreen })),
);

function Screen() {
  const screen = useGameStore((state) => state.screen);
  switch (screen) {
    case 'home':
      return <HomeScreen />;
    case 'setup':
      return <SetupScreen />;
    case 'play':
      return <PlayScreen />;
    case 'missions':
      return <MissionsScreen />;
    case 'quiz':
      return <QuizScreen />;
    case 'passport':
      return <PassportScreen />;
    case 'parents':
      return <ParentsScreen />;
    case 'stories':
      return <StoriesScreen />;
    case 'settings':
      return <SettingsScreen />;
  }
}

export function App() {
  const { t, i18n } = useTranslation();
  const dyslexia = useGameStore((state) => state.settings.dyslexia);
  const reduceMotion = useGameStore((state) => state.settings.reduceMotion);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.title =
      i18n.language === 'fr' ? 'Tembea · Marche l’Afrique' : 'Tembea · Walk across Africa';
  }, [i18n.language]);

  useEffect(() => {
    document.documentElement.classList.toggle('dyslexia', dyslexia);
    if (dyslexia) void import('@fontsource/opendyslexic/400.css');
    if (dyslexia) void import('@fontsource/opendyslexic/700.css');
  }, [dyslexia]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<p className="play__loading">{t('app.loading')}</p>}>
        <Screen />
      </Suspense>
    </ErrorBoundary>
  );
}
