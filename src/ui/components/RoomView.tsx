import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ambientDialogue,
  currentStop,
  hallDialogue,
  stopDialogue,
  storyById,
  wallMapTarget,
} from '../../core/stories';
import type { DialogueGraph } from '../../core/dialogue';
import { createLayout, type RoomSpot, type RoomSpotKind } from '../../core/rooms';
import { createRng, hashString } from '../../core/rng';
import type { Locale, Localized } from '../../core/types';
import { loadFacts } from '../../data/facts';
import type { GameData } from '../../data/gameData';
import type { ActiveRoom } from '../store';
import { useGameStore } from '../store';
import { Dialog } from './Dialog';
import { DialogueBox } from './DialogueBox';
import { ExternalLink } from './ExternalLink';
import { Icon } from './Icon';
import { WALL_MAP_POINTS, WallMap } from './WallMap';

type Panel =
  | { kind: 'talk'; graph: DialogueGraph; look: number; isStop: boolean }
  | { kind: 'board' }
  | { kind: 'map'; target: string };

/**
 * Interface d'un lieu, commune au rendu Pixi et à la carte à cliquer :
 * le joueur marche jusqu'aux personnes, ou choisit dans la liste en mode sans déplacement.
 */
export function RoomView({
  data,
  room,
  near,
  walking,
}: {
  data: GameData;
  room: ActiveRoom;
  near: RoomSpot | null;
  walking: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const leaveRoom = useGameStore((state) => state.leaveRoom);
  const finishStop = useGameStore((state) => state.finishStop);
  const rewardRoomGame = useGameStore((state) => state.rewardRoomGame);
  const storyRun = useGameStore((state) => state.progress.story);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [fact, setFact] = useState<{ fr: string; en: string } | null>(null);
  const [factUrl, setFactUrl] = useState<string | null>(null);
  const [talkedToLead, setTalkedToLead] = useState(false);

  const place = data.world.placeById(room.placeId);
  const placeName = place?.names[locale] ?? room.placeId;
  const story = room.isStoryStop && storyRun ? storyById(data.stories, storyRun.id) : undefined;
  const stop = room.isStoryStop && storyRun ? currentStop(data.stories, storyRun) : undefined;
  const nextStop = story && storyRun ? story.stops[storyRun.stop + 1] : undefined;
  const seed = hashString(room.placeId);
  const layout = useMemo(() => createLayout(room.theme), [room.theme]);

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    Promise.all([loadFacts('fr'), loadFacts('en')])
      .then(([fr, en]) => {
        const frFact = fr[place.country];
        const enFact = en[place.country];
        if (cancelled || !frFact || !enFact) return;
        setFact({ fr: frFact.text, en: enFact.text });
        setFactUrl(frFact.sourceUrl);
      })
      .catch((error: unknown) => console.warn(error));
    return () => {
      cancelled = true;
    };
  }, [place]);

  const guideLook = seed % 6;
  // Seule la langue active est chargée, et elle ne change pas pendant qu'on est dans un lieu.
  const fixed = useCallback(
    (key: string): Localized => {
      const text = t(key);
      return { fr: text, en: text };
    },
    [t],
  );

  const act = useCallback(
    (kind: RoomSpotKind): void => {
      if (!place) return;
      switch (kind) {
        case 'lead':
          if (stop) {
            setPanel({
              kind: 'talk',
              graph: stopDialogue(stop, nextStop),
              look: stop.npc.look,
              isStop: true,
            });
          } else {
            setPanel({
              kind: 'talk',
              graph: hallDialogue(
                createRng(seed + Date.now()),
                data.catalog,
                place,
                fact,
                fixed('room.guide'),
              ),
              look: guideLook,
              isStop: false,
            });
          }
          break;
        case 'extra':
          setPanel({
            kind: 'talk',
            graph: ambientDialogue(fixed('room.visitor'), fixed(`room.extra.${room.theme}`)),
            look: guideLook + 3,
            isStop: false,
          });
          break;
        case 'board':
          setPanel({ kind: 'board' });
          break;
        case 'map':
          setPanel({
            kind: 'map',
            target: wallMapTarget(createRng(seed + Date.now()), data.catalog, place.country),
          });
          break;
        case 'door':
          leaveRoom();
          break;
      }
    },
    [place, stop, nextStop, seed, data.catalog, fact, fixed, guideLook, room.theme, leaveRoom],
  );

  // Touche E ou Entrée : agir sur ce qui est à portée.
  useEffect(() => {
    if (!walking || panel) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'KeyE' && near) act(near.kind);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [walking, panel, near, act]);

  const label = (kind: RoomSpotKind): string => {
    if (kind === 'lead') return t('room.talkTo', { name: stop?.npc.name ?? t('room.guide') });
    if (kind === 'extra') return t('room.talkToExtra');
    if (kind === 'map') return t('room.useMap');
    if (kind === 'board') return t('room.readBoard');
    return t('room.exit');
  };

  const boardText = stop?.note[locale] ?? fact?.[locale] ?? t('room.boardEmpty');
  const boardUrl = stop?.sourceUrl ?? factUrl;

  return (
    <>
      <header className="room-bar" data-testid="room-bar" data-theme={room.theme}>
        <div>
          <p className="room-bar__kind">{t(`room.theme.${room.theme}`)}</p>
          <h2 className="room-bar__name" data-testid="room-name">
            {placeName}
          </h2>
        </div>
        <button
          type="button"
          className="btn btn--small"
          data-testid="room-exit"
          onClick={leaveRoom}
        >
          <Icon name="back" size={18} />
          {t('hud.leave')}
        </button>
      </header>

      {stop && !talkedToLead && !panel && (
        <p className="coach coach--room">{t('room.talkTo', { name: stop.npc.name })}</p>
      )}

      {walking && near && !panel && (
        <button
          type="button"
          className="enter-prompt"
          data-testid="room-prompt"
          data-kind={near.kind}
          onClick={() => act(near.kind)}
        >
          {label(near.kind)}
          <kbd className="enter-prompt__key">E</kbd>
        </button>
      )}

      {!walking && !panel && (
        <nav className="room-list" aria-label={t('room.actions')} data-testid="room-list">
          {layout.spots.map((spot) => (
            <button
              key={`${spot.kind}-${spot.x}`}
              type="button"
              className="btn"
              data-testid={`room-action-${spot.kind}`}
              onClick={() => act(spot.kind)}
            >
              {label(spot.kind)}
            </button>
          ))}
        </nav>
      )}

      {panel?.kind === 'talk' && (
        <DialogueBox
          graph={panel.graph}
          look={panel.look}
          onEnd={(flags) => {
            setPanel(null);
            if (panel.isStop) {
              setTalkedToLead(true);
              finishStop(data.stories, Boolean(flags.firstTry));
            }
          }}
        />
      )}

      {panel?.kind === 'board' && (
        <Dialog labelledBy="board-title" testId="room-board" onEscape={() => setPanel(null)}>
          <h2 id="board-title">{t('room.boardTitle')}</h2>
          <p>{boardText}</p>
          {boardUrl && <ExternalLink href={boardUrl}>{t('card.source')}</ExternalLink>}
          <div className="dialog__actions">
            <button type="button" className="btn btn--primary" onClick={() => setPanel(null)}>
              {t('room.close')}
            </button>
          </div>
        </Dialog>
      )}

      {panel?.kind === 'map' && (
        <WallMap
          target={panel.target}
          catalog={data.catalog}
          onClose={() => setPanel(null)}
          onRight={() =>
            rewardRoomGame(
              WALL_MAP_POINTS,
              'map',
              data.catalog.countries.find((c) => c.code === panel.target)?.names[locale] ?? '',
            )
          }
        />
      )}
    </>
  );
}
