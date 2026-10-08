import { pickRandom } from '../utils/math';
import { mulberry32, randRange, randInt } from '../utils/math';
import { TENANT_NAMES } from '../types';
import type { GameEventDef, GameState, Tenant } from '../types';
import { getFreeApartment } from './GameState';

let tenantCounter = 100;

function makeId(): string {
  return `t${++tenantCounter}`;
}

export const EVENT_DEFS: GameEventDef[] = [
  // 1. Новый жилец
  {
    id: 'NEW_TENANT',
    title: 'Новый жилец',
    description: 'В парадную дверь постучали. На пороге стоит господин приличного вида:\n«Желаю снять квартиру в вашем доходном доме. Плачу 40 рублей в месяц».',
    precondition: (state) => getFreeApartment(state) !== -1,
    requiresInput: true,
    choices: [
      { id: 'accept', label: 'Принять', hint: 'Жилец заселится, +40 ₽/ход' },
      { id: 'reject', label: 'Отвергнуть', hint: '–1 репутация' },
    ],
    apply: (state, choice) => {
      if (choice === 'accept') {
        const aptIdx = getFreeApartment(state);
        if (aptIdx === -1) {
          return { message: 'Нет свободных квартир.', moneyDelta: 0, reputationDelta: 0, conditionDelta: 0 };
        }
        const rng = mulberry32(state.turn * 7 + aptIdx + state.seed);
        const name = pickRandom(rng, TENANT_NAMES);
        const rent = Math.round(randRange(rng, 30, 50));
        const tenant: Tenant = {
          id: makeId(),
          name,
          apartmentIndex: aptIdx,
          rent,
          reliability: randRange(rng, 0.7, 0.9),
          turnsResiding: 0,
        };
        state.tenants.push(tenant);
        state.apartments[aptIdx].tenantId = tenant.id;
        return { message: `${name} заселился в квартиру №${aptIdx + 1}. Плата: ${rent} ₽/мес.`, moneyDelta: 0, reputationDelta: 1, conditionDelta: 0, tenantChange: { type: 'add', tenant } };
      }
      state.reputation = Math.max(0, state.reputation - 1);
      return { message: 'Вы отказали. Жилец ушёл, недовольный.', moneyDelta: 0, reputationDelta: -1, conditionDelta: 0 };
    },
  },

  // 2. Неуплата
  {
    id: 'RENT_DEFAULT',
    title: 'Неуплата',
    description: 'Жилец {name} из квартиры №{apt} явился с повинной:\n«Батюшка, не прогневайся — нынче нечем платить. Через месяц непременно отдам».',
    precondition: (state) => state.tenants.length > 0,
    requiresInput: false,
    apply: (state) => {
      const idx = Math.floor(Math.random() * state.tenants.length);
      const tenant = state.tenants[idx];
      const aptNum = tenant.apartmentIndex + 1;
      const desc = `Жилец ${tenant.name} из квартиры №${aptNum} не заплатил в этом месяце.`;
      state.money -= tenant.rent;
      return { message: desc, moneyDelta: -tenant.rent, reputationDelta: -2, conditionDelta: 0 };
    },
  },

  // 3. Мелкий ремонт
  {
    id: 'MINOR_REPAIR',
    title: 'Мелкий ремонт',
    description: 'Дворник докладывает: штукатурка в парадной облупилась, половица на третьем этаже скрипит невыносимо. Надо бы починить — 40 рублей.',
    precondition: (state) => state.money >= 0,
    requiresInput: true,
    choices: [
      { id: 'repair', label: 'Починить (40 ₽)', hint: '+5 состояние, +2 репутация' },
      { id: 'ignore', label: 'Отложить', hint: '–4 состояние, –3 репутация' },
    ],
    apply: (state, choice) => {
      if (choice === 'repair') {
        state.money -= 40;
        state.condition = Math.min(100, state.condition + 5);
        state.reputation = Math.min(100, state.reputation + 2);
        return { message: 'Ремонт выполнен. Дом снова в порядке.', moneyDelta: -40, reputationDelta: 2, conditionDelta: 5 };
      }
      state.condition = Math.max(0, state.condition - 4);
      state.reputation = Math.max(0, state.reputation - 3);
      return { message: 'Ремонт отложен. Жильцы недовольны.', moneyDelta: 0, reputationDelta: -3, conditionDelta: -4 };
    },
  },

  // 4. Жилец съезжает
  {
    id: 'TENANT_LEAVES',
    title: 'Жилец съезжает',
    description: '{name} из квартиры №{apt} объявил, что съезжает. Не сошлись характером с соседями.',
    precondition: (state) => state.tenants.length > 0,
    requiresInput: false,
    apply: (state) => {
      const idx = Math.floor(Math.random() * state.tenants.length);
      const tenant = state.tenants[idx];
      const aptNum = tenant.apartmentIndex + 1;
      state.apartments[tenant.apartmentIndex].tenantId = null;
      state.tenants.splice(idx, 1);
      return { message: `${tenant.name} съехал из квартиры №${aptNum}.`, moneyDelta: 0, reputationDelta: -2, conditionDelta: 0, tenantChange: { type: 'remove', tenantId: tenant.id } };
    },
  },

  // 5. Заклад
  {
    id: 'FOUND_STASH',
    title: 'Заклад',
    description: 'При уборке пустующей квартиры за отставшей половицей обнаружен свёрток. В нём — ассигнации. Видно, прежний жилец припрятал на чёрный день, да забыл.',
    precondition: (state) => state.apartments.some(a => a.tenantId === null),
    requiresInput: false,
    apply: (state) => {
      const amount = Math.floor(Math.random() * 41) + 60;
      state.money += amount;
      return { message: `Найдено ${amount} ₽ в пустующей квартире.`, moneyDelta: amount, reputationDelta: 1, conditionDelta: 0 };
    },
  },
];
