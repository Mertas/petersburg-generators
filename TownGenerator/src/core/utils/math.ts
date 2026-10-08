/** Ограничить значение между min и max */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Линейная интерполяция */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Преобразовать значение с логарифмической шкалы в линейную (для density) */
export function logToLinear(logVal: number, minOut = 1, maxOut = 50): number {
  // logVal ожидается в [0, 1]
  const logMin = Math.log(minOut);
  const logMax = Math.log(maxOut);
  return Math.exp(logMin + (logMax - logMin) * logVal);
}

/** Преобразовать линейное значение в логарифмическое (для слайдера) */
export function linearToLog(linVal: number, minIn = 1, maxIn = 50): number {
  const logMin = Math.log(minIn);
  const logMax = Math.log(maxIn);
  return (Math.log(linVal) - logMin) / (logMax - logMin);
}
