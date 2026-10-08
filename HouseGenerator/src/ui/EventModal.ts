import type { GameEventDef, EventChoice } from '../types';

export function createEventModal(): {
  overlay: HTMLDivElement;
  show: (event: GameEventDef, desc: string, onChoice: (choiceId: string) => void) => void;
  hide: () => void;
} {
  const overlay = document.createElement('div');
  overlay.className = 'event-overlay';

  const card = document.createElement('div');
  card.className = 'event-card';

  const icon = document.createElement('div');
  icon.className = 'event-icon';
  icon.textContent = '\u25C8';

  const title = document.createElement('div');
  title.className = 'event-title';

  const desc = document.createElement('div');
  desc.className = 'event-desc';

  const choices = document.createElement('div');
  choices.className = 'event-choices';

  card.appendChild(icon);
  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(choices);
  overlay.appendChild(card);

  let currentCallback: ((choiceId: string) => void) | null = null;

  function show(event: GameEventDef, descriptionText: string, onChoice: (choiceId: string) => void): void {
    title.textContent = event.title;
    desc.textContent = descriptionText;

    choices.innerHTML = '';
    if (event.choices) {
      for (const choice of event.choices) {
        const btn = document.createElement('button');
        btn.className = 'event-choice-btn';
        btn.textContent = choice.label;
        btn.title = choice.hint || '';
        btn.addEventListener('click', () => {
          if (currentCallback) {
            currentCallback(choice.id);
          }
        });
        choices.appendChild(btn);
      }
    }

    currentCallback = onChoice;
    overlay.classList.add('visible');
  }

  function hide(): void {
    overlay.classList.remove('visible');
    currentCallback = null;
  }

  // Click outside card does nothing (must choose)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      // do nothing - must pick a choice
    }
  });

  document.body.appendChild(overlay);

  return { overlay, show, hide };
}
