import { create } from 'zustand';
import { countryByCode, type GameCatalog } from '../core/catalog';
import type { DailyChallenge } from '../core/daily';
import { utcDateKey } from '../core/dates';
import type { GameEvent } from '../core/explorer';
import type { Point } from '../core/geometry';
import { dayNumber, reviewCard } from '../core/leitner';
import { missionCompletedBy, type Mission } from '../core/missionRules';
import {
  createInitialProgress,
  discoverPlace,
  earnedBadges,
  recordRiver,
  stampCountry,
  type Profile,
  type ProgressData,
} from '../core/progress';
import type { DailyScore } from '../core/repositories';
import { dailyScore, missionPoints, PLACE_POINTS, quizPoints, STAMP_POINTS } from '../core/scoring';
import { NON_STATE_TERRITORY, type Level, type Terrain } from '../core/types';
import {
  clearSettings,
  loadSettings,
  LocalProgressRepository,
  LocalScoreRepository,
  saveSettings,
  type Settings,
} from '../data/localRepositories';
import { playSound, setMuted } from './sound';

export type Screen =
  'home' | 'setup' | 'play' | 'missions' | 'quiz' | 'passport' | 'parents' | 'settings';

export type PlayMode = 'free' | 'mission' | 'daily';

export interface MissionResult {
  points: number;
  seconds: number;
  daily: DailyScore | null;
}

export interface Toast {
  id: number;
  kind: 'place' | 'river' | 'lake' | 'badge';
  subject: string;
}

const progressRepository = new LocalProgressRepository();
const scoreRepository = new LocalScoreRepository();
const initial = progressRepository.load();
const initialSettings = loadSettings();
setMuted(initialSettings.muted);

let toastId = 0;

interface GameStore {
  screen: Screen;
  progress: ProgressData;
  recovered: boolean;
  settings: Settings;
  dailyScores: DailyScore[];

  mode: PlayMode;
  mission: Mission | null;
  missionStartedAt: number;
  missionResult: MissionResult | null;
  daily: DailyChallenge | null;
  startOverride: Point | null;

  currentCountry: string | null;
  card: string | null;
  terrain: Terrain;
  position: Point | null;
  toasts: Toast[];
  usingFallback: boolean;

  navigate: (screen: Screen) => void;
  dismissRecovered: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  createProfile: (profile: Profile, level: Level) => void;
  setLevel: (level: Level) => void;
  startFree: () => void;
  startMission: (mission: Mission) => void;
  startDaily: (daily: DailyChallenge) => void;
  finishMissionResult: () => void;
  handleEvents: (
    events: GameEvent[],
    catalog: GameCatalog,
    options?: { skipMissions?: boolean },
  ) => void;
  closeCard: () => void;
  openCard: (code: string) => void;
  setFallback: (value: boolean) => void;
  dismissToast: (id: number) => void;
  updatePosition: (position: Point, terrain: Terrain) => void;
  answerQuiz: (itemId: string, correct: boolean) => void;
  resetAll: () => void;
}

function persist(progress: ProgressData): ProgressData {
  progressRepository.save(progress);
  return progress;
}

function todayStamp(): string {
  return utcDateKey(new Date());
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'home',
  progress: initial.value,
  recovered: initial.recovered,
  settings: initialSettings,
  dailyScores: scoreRepository.loadDailyScores(),
  mode: 'free',
  mission: null,
  missionStartedAt: 0,
  missionResult: null,
  daily: null,
  startOverride: null,
  currentCountry: null,
  card: null,
  terrain: 'land',
  position: null,
  toasts: [],
  usingFallback: false,

  navigate: (screen) => {
    if (screen !== 'play') {
      const { position, progress } = get();
      if (position) set({ progress: persist({ ...progress, lastPosition: position }) });
    }
    set({ screen, card: null });
  },
  dismissRecovered: () => set({ recovered: false }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveSettings(settings);
    setMuted(settings.muted);
    set({ settings });
  },
  createProfile: (profile, level) => {
    set({ progress: persist({ ...get().progress, profile, level }) });
  },
  setLevel: (level) => {
    set({ progress: persist({ ...get().progress, level }) });
  },
  startFree: () =>
    set({
      screen: 'play',
      mode: 'free',
      mission: null,
      missionResult: null,
      daily: null,
      startOverride: null,
      card: null,
      currentCountry: null,
    }),
  startMission: (mission) =>
    set({
      screen: 'play',
      mode: 'mission',
      mission,
      missionResult: null,
      missionStartedAt: Date.now(),
      daily: null,
      startOverride: null,
      card: null,
      currentCountry: null,
    }),
  startDaily: (daily) => {
    set({
      screen: 'play',
      mode: 'daily',
      mission: daily.mission,
      daily,
      missionResult: null,
      missionStartedAt: Date.now(),
      startOverride: daily.start,
      card: null,
      currentCountry: null,
    });
  },
  finishMissionResult: () => set({ missionResult: null, mission: null, mode: 'free', daily: null }),
  handleEvents: (events, catalog, options) => {
    let { progress, currentCountry, card, terrain, missionResult, toasts } = get();
    const { mode, mission, missionStartedAt, settings, daily } = get();
    let dailyScores = get().dailyScores;
    let changed = false;

    for (const event of events) {
      switch (event.type) {
        case 'country-entered': {
          currentCountry = event.code;
          card = event.code;
          if (event.code !== NON_STATE_TERRITORY && !progress.stamps[event.code]) {
            progress = stampCountry(progress, event.code, todayStamp());
            progress = { ...progress, points: progress.points + STAMP_POINTS };
            changed = true;
            playSound('stamp');
            const region = countryByCode(catalog, event.code)?.region;
            if (region && earnedBadges(progress, catalog).includes(region)) {
              toastId += 1;
              toasts = [...toasts.slice(-2), { id: toastId, kind: 'badge', subject: region }];
              playSound('success');
            }
          } else {
            playSound('enter');
          }
          break;
        }
        case 'country-left':
          if (currentCountry === event.code) currentCountry = null;
          break;
        case 'terrain-changed':
          terrain = event.terrain;
          break;
        case 'lake-entered':
          toastId += 1;
          toasts = [...toasts.slice(-2), { id: toastId, kind: 'lake', subject: event.id }];
          break;
        case 'place-reached':
          if (!progress.discoveredPlaces.includes(event.id)) {
            progress = discoverPlace(progress, event.id);
            progress = { ...progress, points: progress.points + PLACE_POINTS };
            changed = true;
            toastId += 1;
            toasts = [...toasts.slice(-2), { id: toastId, kind: 'place', subject: event.id }];
          }
          break;
        case 'river-crossed':
          if (!progress.crossedRivers.includes(event.id)) {
            progress = recordRiver(progress, event.id);
            changed = true;
            toastId += 1;
            toasts = [...toasts.slice(-2), { id: toastId, kind: 'river', subject: event.id }];
          }
          break;
      }
      if (
        !options?.skipMissions &&
        mission &&
        !missionResult &&
        missionCompletedBy(mission, event, catalog)
      ) {
        const seconds = Math.max(0, Math.round((Date.now() - missionStartedAt) / 1000));
        let points = missionPoints(seconds, settings.timer);
        let dailyEntry: DailyScore | null = null;
        if (mode === 'daily' && daily) {
          points = dailyScore(seconds);
          dailyEntry = scoreRepository.recordDaily({
            dateKey: daily.dateKey,
            score: points,
            seconds,
          });
          dailyScores = scoreRepository.loadDailyScores();
        }
        progress = {
          ...progress,
          points: progress.points + points,
          missionsCompleted: progress.missionsCompleted + 1,
        };
        changed = true;
        missionResult = { points, seconds, daily: dailyEntry };
        playSound('success');
      }
    }
    if (changed) persist(progress);
    set({ progress, currentCountry, card, terrain, mission, missionResult, toasts, dailyScores });
  },
  closeCard: () => set({ card: null }),
  openCard: (code) => set({ card: code }),
  setFallback: (value) => set({ usingFallback: value }),
  dismissToast: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
  updatePosition: (position, terrain) => set({ position, terrain }),
  answerQuiz: (itemId, correct) => {
    const { progress } = get();
    playSound(correct ? 'success' : 'gentle');
    set({
      progress: persist({
        ...progress,
        leitner: reviewCard(progress.leitner, itemId, correct, dayNumber(new Date())),
        quizAnswered: progress.quizAnswered + 1,
        quizCorrect: progress.quizCorrect + (correct ? 1 : 0),
        points: progress.points + quizPoints(correct),
      }),
    });
  },
  resetAll: () => {
    progressRepository.clear();
    scoreRepository.clear();
    clearSettings();
    const settings = loadSettings();
    setMuted(settings.muted);
    set({
      progress: createInitialProgress(),
      settings,
      dailyScores: [],
      screen: 'home',
      position: null,
      recovered: false,
    });
  },
}));
