/** Простой мультипликативный генератор псевдослучайных чисел (глянец: mulberry32) */
export function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Создать сидированный генератор случайных чисел */
export function createSeededRandom(seed: number): () => number {
  return mulberry32(seed);
}

/** Вернуть случайное целое в диапазоне [min, max] */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Вернуть случайное число с плавающей точкой в диапазоне [min, max) */
export function randFloat(rng: () => number, min: number, max: number): number {
  return rng() * (max - min) + min;
}

/** Вернуть случайный элемент массива */
export function randItem<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Вернуть true с заданной вероятностью (0..1) */
export function chance(rng: () => number, probability: number): boolean {
  return rng() < probability;
}
