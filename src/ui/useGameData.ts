import { useCallback, useEffect, useState } from 'react';
import { loadGameData, type GameData } from '../data/gameData';

export function useGameData(): { data: GameData | null; failed: boolean; retry: () => void } {
  const [data, setData] = useState<GameData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadGameData()
      .then((loaded) => {
        if (!cancelled) setData(loaded);
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((value) => value + 1);
  }, []);
  return { data, failed, retry };
}
