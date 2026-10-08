export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export const MONTH_NAMES: Record<number, string> = {
  0: 'Январь', 1: 'Февраль', 2: 'Март', 3: 'Апрель',
  4: 'Май', 5: 'Июнь', 6: 'Июль', 7: 'Август',
  8: 'Сентябрь', 9: 'Октябрь', 10: 'Ноябрь', 11: 'Декабрь',
};

export function getSeason(month: number): Season {
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'autumn';
}

export interface Tenant {
  id: string;
  name: string;
  apartmentIndex: number;
  rent: number;
  reliability: number;
  turnsResiding: number;
}

export interface Apartment {
  index: number;
  floor: number;
  axis: number;
  tenantId: string | null;
}

export interface EventChoice {
  id: string;
  label: string;
  hint?: string;
}

export interface EventResult {
  message: string;
  moneyDelta: number;
  reputationDelta: number;
  conditionDelta: number;
  tenantChange?: { type: 'add' | 'remove'; tenant?: Tenant; tenantId?: string };
}

export interface GameEventDef {
  id: string;
  title: string;
  description: string;
  precondition?: (state: GameState) => boolean;
  requiresInput: boolean;
  choices?: EventChoice[];
  apply: (state: GameState, choice?: string) => EventResult;
}

export interface GameState {
  turn: number;
  year: number;
  month: number;
  season: Season;
  money: number;
  reputation: number;
  condition: number;
  floors: number;
  axes: number;
  apartments: Apartment[];
  tenants: Tenant[];
  eventLog: LogEntry[];
  seed: number;
}

export const FLOOR_EXPANSION_COST = 2000;
export const MAX_FLOORS = 5;
export const MIN_FLOORS = 3;

export interface LogEntry {
  turn: number;
  text: string;
  type: 'income' | 'expense' | 'event' | 'system';
}

export const TENANT_NAMES: string[] = [
  'Иван Петров', 'Пётр Сидоров', 'Семён Кузнецов', 'Николай Смирнов',
  'Алексей Иванов', 'Дмитрий Попов', 'Василий Соколов', 'Михаил Лебедев',
  'Григорий Козлов', 'Андрей Новиков', 'Павел Морозов', 'Сергей Волков',
  'Фёдор Соловьёв', 'Александр Васильев', 'Константин Зайцев',
  'Владимир Павлов', 'Борис Голубев', 'Илья Орлов', 'Тимофей Антонов',
  'Степан Макаров',
];
