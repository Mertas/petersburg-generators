import { Palette, TimeOfDay } from '../types';

/** Палитры для разных времён суток */
export function getPalette(timeOfDay: TimeOfDay): Palette {
  switch (timeOfDay) {
    case TimeOfDay.DAWN:
      return {
        skyGradient: ['#FFB7B2', '#FFDAC1'],
        cloudColor: '#FFFFFF',
        buildingBaseColors: ['#FCE4D6', '#F8D5C4', '#FDEBD0', '#FADBD8', '#E8D5B7'],
        roofColors: ['#8B9A8B', '#7D8B7D', '#9BA89B'],
        domeColors: ['#FFD700', '#DAA520', '#B8860B'],
        windowLightColor: '#FFF5CC',
        waterColor: '#8DB6CE',
        waterReflectionColor: '#A3C6DB',
        streetLampColor: '#FFF5CC',
        treeColors: { trunk: '#6B4226', foliage: '#7D9B5B' },
        outlineColor: '#3B2F2F',
      };
    case TimeOfDay.DAY:
      return {
        skyGradient: ['#87CEEB', '#E0F0FF'],
        cloudColor: '#FFFFFF',
        buildingBaseColors: ['#F5E6CA', '#E8DCC8', '#F0E4D0', '#EEDDCC', '#F2E8D5', '#D4E4D0', '#E0D8C8'],
        roofColors: ['#8B9A8B', '#7D8B7D', '#9BA89B'],
        domeColors: ['#FFD700', '#5B8C5A', '#4A6FA5'],
        windowLightColor: '#FFF5CC',
        waterColor: '#5D8CAE',
        waterReflectionColor: '#7EA3BE',
        streetLampColor: '#FFF5CC',
        treeColors: { trunk: '#6B4226', foliage: '#5B8C4A' },
        outlineColor: '#3B2F2F',
      };
    case TimeOfDay.SUNSET:
      return {
        skyGradient: ['#FF7E67', '#F9A03F'],
        cloudColor: '#FFDAB9',
        buildingBaseColors: ['#E8C7A5', '#D4A882', '#C9956B', '#DDB896', '#C9A87C'],
        roofColors: ['#6B3A3A', '#7D4A4A', '#8B5A5A'],
        domeColors: ['#B87333', '#CD7F32', '#A0522D'],
        windowLightColor: '#FFD700',
        waterColor: '#C97D60',
        waterReflectionColor: '#D4906E',
        streetLampColor: '#FFD700',
        treeColors: { trunk: '#5C3A1E', foliage: '#6B7B3A' },
        outlineColor: '#2F1F1F',
      };
    case TimeOfDay.NIGHT:
      return {
        skyGradient: ['#0B1026', '#1B2A4A'],
        cloudColor: '#2A3A5C',
        buildingBaseColors: ['#2A3040', '#1E2535', '#252D3D', '#222838', '#2C3242'],
        roofColors: ['#1A1F2E', '#202535', '#181D2B'],
        domeColors: ['#3A4A6A', '#2A3A5A', '#4A5A7A'],
        windowLightColor: '#FFD700',
        waterColor: '#1B2A4A',
        waterReflectionColor: '#243358',
        streetLampColor: '#FFD700',
        treeColors: { trunk: '#3A2818', foliage: '#2A3A1E' },
        outlineColor: '#0B1026',
      };
  }
}

/** Затемнить hex-цвет на указанный процент (0..1 — насколько затемнить) */
export function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = 1 - amount;
  const toHex = (c: number) =>
    Math.round(c * factor)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Осветлить hex-цвет */
export function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const factor = 1 + amount;
  const toHex = (c: number) =>
    Math.min(255, Math.round(c * factor))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Конвертировать hex в число (для Pixi.Graphics) */
export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
