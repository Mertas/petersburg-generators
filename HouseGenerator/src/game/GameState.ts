import { mulberry32, randRange, randInt, pickRandom } from '../utils/math';
import { getSeason, TENANT_NAMES, FLOOR_EXPANSION_COST, MAX_FLOORS } from '../types';
import type { GameState, Tenant, Apartment } from '../types';

let tenantCounter = 0;

function makeId(): string {
  return `t${++tenantCounter}`;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 999) + 1;
}

export function createInitialState(floors: number, axes: number, seed: number): GameState {
  const rng = mulberry32(seed + 1000);

  const apartmentCount = floors * axes;

  const apartments: Apartment[] = [];
  let idx = 0;
  for (let f = 0; f < floors; f++) {
    for (let a = 0; a < axes; a++) {
      apartments.push({
        index: idx,
        floor: f + 1,
        axis: a + 1,
        tenantId: null,
      });
      idx++;
    }
  }

  const state: GameState = {
    turn: 1,
    year: 1850,
    month: 0,
    season: 'winter',
    money: 500,
    reputation: 50,
    condition: 70,
    floors,
    axes,
    apartments,
    tenants: [],
    eventLog: [],
    seed,
  };

  const usedNames = new Set<string>();
  const tenantCount = Math.min(4, apartmentCount);
  for (let i = 0; i < tenantCount; i++) {
    const freeIdx = apartments.findIndex(a => a.tenantId === null);
    if (freeIdx === -1) break;

    let name: string;
    do {
      name = pickRandom(rng, TENANT_NAMES);
    } while (usedNames.has(name));
    usedNames.add(name);

    const tenant: Tenant = {
      id: makeId(),
      name,
      apartmentIndex: freeIdx,
      rent: Math.round(randRange(rng, 30, 50)),
      reliability: randRange(rng, 0.7, 0.9),
      turnsResiding: randInt(rng, 1, 12),
    };

    state.tenants.push(tenant);
    apartments[freeIdx].tenantId = tenant.id;
  }

  return state;
}

export function canExpandFloors(state: GameState): boolean {
  return state.floors < MAX_FLOORS && state.money >= FLOOR_EXPANSION_COST;
}

export function expandFloors(state: GameState): Apartment[] {
  if (!canExpandFloors(state)) return [];

  state.money -= FLOOR_EXPANSION_COST;
  state.floors += 1;
  state.reputation = Math.min(100, state.reputation + 5);

  const newApartments: Apartment[] = [];
  const newFloor = state.floors;
  const startIdx = state.apartments.length;

  for (let a = 0; a < state.axes; a++) {
    const apt: Apartment = {
      index: startIdx + a,
      floor: newFloor,
      axis: a + 1,
      tenantId: null,
    };
    newApartments.push(apt);
  }

  state.apartments.push(...newApartments);

  return newApartments;
}

export function getFreeApartment(state: GameState): number {
  return state.apartments.findIndex(a => a.tenantId === null);
}

export function getFreeApartmentCount(state: GameState): number {
  return state.apartments.filter(a => a.tenantId === null).length;
}

export function clampResources(state: GameState): void {
  state.reputation = Math.max(0, Math.min(100, state.reputation));
  state.condition = Math.max(0, Math.min(100, state.condition));
}

export function isGameOver(state: GameState): string | null {
  if (state.money < -300) return 'Дом описан за долги. Игра окончена.';
  if (state.condition <= 0) return 'Дом признан аварийным. Игра окончена.';
  return null;
}
