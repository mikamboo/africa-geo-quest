import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  advanceDialogue,
  chooseDialogue,
  currentNode,
  startDialogue,
  type DialogueGraph,
  type DialogueState,
} from '../../core/dialogue';
import type { Locale } from '../../core/types';
import { NPC_LOOKS } from '../../render/characters';
import { playSound } from '../sound';
import { Avatar } from './Avatar';

/** Boîte de dialogue en bas d'écran : portrait, réplique, réponses, au clavier comme au doigt. */
export function DialogueBox({
  graph,
  look,
  onEnd,
}: {
  graph: DialogueGraph;
  look: number;
  onEnd: (flags: Record<string, boolean>) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const [state, setState] = useState<DialogueState>(() => startDialogue(graph));
  const firstButton = useRef<HTMLButtonElement>(null);
  const node = useMemo(() => currentNode(graph, state), [graph, state]);
  const portrait = NPC_LOOKS[look % NPC_LOOKS.length]!;

  useEffect(() => {
    firstButton.current?.focus();
  }, [node]);

  function advance(): void {
    playSound('tap');
    const next = advanceDialogue(graph, state);
    if (next.finished) onEnd(next.flags);
    else setState(next);
  }

  function choose(index: number): void {
    const next = chooseDialogue(graph, state, index);
    const choice = node.choices?.[index];
    if (choice?.set?.firstTry) playSound('success');
    else playSound('gentle');
    setState(next);
  }

  return (
    <section
      className="talk"
      role="dialog"
      aria-modal="false"
      aria-label={node.speaker?.[locale] ?? t('room.talk')}
      data-testid="dialogue"
      data-node={state.current}
      onKeyDown={(event) => {
        event.stopPropagation();
        const index = Number(event.key) - 1;
        if (node.choices?.[index]) choose(index);
      }}
    >
      <Avatar look={portrait} size={72} />
      <div className="talk__body">
        {node.speaker && <p className="talk__speaker">{node.speaker[locale]}</p>}
        <p className="talk__text" key={state.current} data-testid="dialogue-text">
          {node.text[locale]}
        </p>
        {node.choices?.length ? (
          <div className="talk__choices">
            {node.choices.map((choice, index) => (
              <button
                key={choice.text[locale]}
                ref={index === 0 ? firstButton : undefined}
                type="button"
                className="btn talk__choice"
                data-testid="dialogue-choice"
                data-correct={choice.set?.firstTry ? 'true' : undefined}
                onClick={() => choose(index)}
              >
                {choice.text[locale]}
              </button>
            ))}
          </div>
        ) : (
          <button
            ref={firstButton}
            type="button"
            className="btn btn--primary"
            data-testid="dialogue-next"
            onClick={advance}
          >
            {node.end ? t('room.close') : t('room.continue')}
          </button>
        )}
      </div>
    </section>
  );
}
