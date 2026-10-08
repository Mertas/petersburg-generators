import type { GameState, LogEntry } from '../types';

export interface IncomeResult {
  totalIncome: number;
  log: LogEntry[];
}

export function collectRent(state: GameState): IncomeResult {
  const log: LogEntry[] = [];
  let total = 0;

  for (const tenant of state.tenants) {
    const roll = Math.random();
    if (roll <= tenant.reliability) {
      total += tenant.rent;
      tenant.turnsResiding++;
    } else {
      log.push({
        turn: state.turn,
        text: `${tenant.name} не заплатил (${tenant.rent} ₽)`,
        type: 'expense',
      });
    }
  }

  if (total > 0) {
    log.unshift({
      turn: state.turn,
      text: `Собрано квартплаты: +${total} ₽`,
      type: 'income',
    });
  }

  return { totalIncome: total, log };
}

export function calculateExpenses(): { total: number; log: LogEntry[] } {
  const maintenance = 15;
  const janitor = 10;
  const total = maintenance + janitor;

  return {
    total,
    log: [{
      turn: 0,
      text: `Расходы: содержание ${maintenance} ₽ + дворник ${janitor} ₽ = –${total} ₽`,
      type: 'expense',
    }],
  };
}
