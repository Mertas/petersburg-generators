import type { GameState, LogEntry, GameEventDef, EventResult } from '../types';
import { getSeason } from '../types';
import { collectRent } from './EconomyManager';
import { calculateExpenses } from './EconomyManager';
import { triggerEvent } from './EventSystem';
import { clampResources, isGameOver } from './GameState';

export interface TurnResult {
  income: number;
  expenses: number;
  event: GameEventDef | null;
  eventResult: EventResult | null;
  logEntries: LogEntry[];
  gameOver: string | null;
}

export function processTurnPhases(state: GameState): TurnResult {
  const logEntries: LogEntry[] = [];

  // Фаза 1: Сбор квартплаты
  const incomeResult = collectRent(state);
  state.money += incomeResult.totalIncome;
  logEntries.push(...incomeResult.log);

  // Фаза 2: Расходы
  const expenseResult = calculateExpenses();
  state.money -= expenseResult.total;
  const expenseLog = expenseResult.log.map(e => ({ ...e, turn: state.turn }));
  logEntries.push(...expenseLog);

  // Фаза 3: Событие
  const event = triggerEvent(state);
  let eventResult: EventResult | null = null;
  if (event) {
    if (!event.requiresInput) {
      eventResult = event.apply(state);
      logEntries.push({
        turn: state.turn,
        text: eventResult.message,
        type: 'event',
      });
      if (eventResult.moneyDelta) {
        state.money += eventResult.moneyDelta;
      }
    }
    // Если событие требует ввода — оно будет обработано позже через EventModal
  }

  // Фаза 4: Износ
  if (state.condition < 60) {
    state.condition = Math.max(0, state.condition - 1);
    logEntries.push({
      turn: state.turn,
      text: 'Дом ветшает (–1 состояние)',
      type: 'system',
    });
  }

  // Фаза 5: Продвижение времени
  state.month++;
  if (state.month >= 12) {
    state.month = 0;
    state.year++;
  }
  state.season = getSeason(state.month);

  clampResources(state);
  const gameOver = isGameOver(state);

  return {
    income: incomeResult.totalIncome,
    expenses: expenseResult.total,
    event,
    eventResult,
    logEntries,
    gameOver,
  };
}

export function applyEventChoice(state: GameState, event: GameEventDef, choice: string): EventResult {
  const result = event.apply(state, choice);
  state.money += result.moneyDelta;
  state.reputation = Math.max(0, Math.min(100, state.reputation + result.reputationDelta));
  state.condition = Math.max(0, Math.min(100, state.condition + result.conditionDelta));

  if (result.tenantChange) {
    if (result.tenantChange.type === 'remove' && result.tenantChange.tenantId) {
      const idx = state.tenants.findIndex(t => t.id === result.tenantChange!.tenantId);
      if (idx !== -1) {
        const t = state.tenants[idx];
        state.apartments[t.apartmentIndex].tenantId = null;
        state.tenants.splice(idx, 1);
      }
    }
    if (result.tenantChange.type === 'add' && result.tenantChange.tenant) {
      const tenant = result.tenantChange.tenant;
      state.tenants.push(tenant);
      state.apartments[tenant.apartmentIndex].tenantId = tenant.id;
    }
  }

  clampResources(state);
  return result;
}
