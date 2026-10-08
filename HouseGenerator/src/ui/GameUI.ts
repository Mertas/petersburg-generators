import type { GameState, LogEntry } from '../types';
import { MONTH_NAMES } from '../types';

export interface GameUI {
  updateResources: (state: GameState) => void;
  updateLog: (entries: LogEntry[]) => void;
  setTurnEnabled: (enabled: boolean) => void;
  setTurnCallback: (cb: () => void) => void;
  showGameOver: (message: string) => void;
  destroy: () => void;
}

export function createGameUI(): GameUI {
  // Ресурсы
  const moneyEl = document.getElementById('resource-money');
  const repEl = document.getElementById('resource-reputation');
  const condEl = document.getElementById('resource-condition');
  const condBarEl = document.getElementById('condition-bar') as HTMLDivElement | null;

  // Заголовок
  const turnEl = document.getElementById('turn-display');

  // Журнал
  const logEl = document.getElementById('event-log');

  // Кнопка
  const turnBtn = document.getElementById('game-turn-btn') as HTMLButtonElement | null;
  const turnBtnText = document.getElementById('turn-btn-text');

  let turnCallback: (() => void) | null = null;

  if (turnBtn && turnBtnText) {
    turnBtn.addEventListener('click', () => {
      if (turnCallback) turnCallback();
    });
  }

  function updateResources(state: GameState): void {
    if (moneyEl) {
      moneyEl.textContent = `${state.money} ₽`;
      moneyEl.className = state.money < 0 ? 'resource-value negative' : 'resource-value';
    }
    if (repEl) repEl.textContent = String(state.reputation);
    if (condEl) condEl.textContent = String(state.condition);
    if (condBarEl) {
      condBarEl.style.width = `${state.condition}%`;
      if (state.condition > 60) condBarEl.style.background = '#5a9e6f';
      else if (state.condition > 30) condBarEl.style.background = '#c9a96e';
      else condBarEl.style.background = '#c44b4b';
    }
    if (turnEl) {
      const monthName = MONTH_NAMES[state.month] || '';
      turnEl.textContent = `${monthName} ${state.year} г. · Ход ${state.turn}`;
    }
  }

  function updateLog(entries: LogEntry[]): void {
    if (!logEl) return;
    const recent = entries.slice(-8);
    logEl.innerHTML = recent.map(e => {
      const cls = `log-entry log-${e.type}`;
      return `<div class="${cls}"><span class="log-turn">Х.${e.turn}</span> ${escapeHtml(e.text)}</div>`;
    }).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setTurnEnabled(enabled: boolean): void {
    if (turnBtn && turnBtnText) {
      turnBtn.disabled = !enabled;
      turnBtnText.textContent = enabled ? 'СЛЕДУЮЩИЙ ХОД' : '...';
      turnBtn.className = enabled ? 'turn-btn active' : 'turn-btn disabled';
    }
  }

  function setTurnCallback(cb: () => void): void {
    turnCallback = cb;
  }

  function showGameOver(message: string): void {
    if (turnBtn && turnBtnText) {
      turnBtn.disabled = true;
      turnBtn.className = 'turn-btn gameover';
      turnBtnText.textContent = message;
    }
  }

  function destroy(): void {
    turnCallback = null;
  }

  return { updateResources, updateLog, setTurnEnabled, setTurnCallback, showGameOver, destroy };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
