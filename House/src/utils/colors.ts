import type { Palette } from '../types';
import { mulberry32 } from './math';

const BASE_PALETTE: Palette = {
  wall: 0xd9c8a9,
  wallLight: 0xe8dcc8,
  wallUpper: 0xc4b392,
  rust: 0x8a7e6e,
  rustDark: 0x6e6557,
  basement: 0x7a7060,
  brick: 0x8b3a2a,
  brickLight: 0xa0452a,
  brickDark: 0x732d1b,
  roof: 0x5d7b6a,
  roofHighlight: 0x6b8b78,
  windowFrame: 0x3a3028,
  windowGlass: 0x7ba4b5,
  windowGlassHighlight: 0x8fb8c8,
  iron: 0x2d2d2d,
  ironHighlight: 0x3d3d3d,
  gold: 0xc4a44a,
  door: 0x4a3020,
  snow: 0xf0f4f8,
  // Мостовая и тротуар
  sidewalk: 0xc4b9a8,
  sidewalkJoint: 0x9e9483,
  curb: 0x948878,
  curbLight: 0xa89c8c,
  roadway: 0x8a8278,
  roadwayDark: 0x6e6557,
  roadwayHighlight: 0x9e968c,
};

/**
 * Генерирует палитру на основе seed, слегка варьируя оттенки.
 */
export function getPalette(seed: number): Palette {
  const rng = mulberry32(seed + 1000);
  const varied: Palette = {} as Palette;
  for (const key of Object.keys(BASE_PALETTE) as (keyof Palette)[]) {
    varied[key] = varyColor(BASE_PALETTE[key], rng);
  }
  return varied;
}

/**
 * Слегка меняет цвет: случайный сдвиг ±5% по каждому каналу.
 */
function varyColor(color: number, rng: () => number): number {
  const shift = (rng() - 0.5) * 25; // ±12.5 (5% от 255 ≈ 12.75)
  const r = clamp(((color >> 16) & 0xff) + shift);
  const g = clamp(((color >> 8) & 0xff) + shift);
  const b = clamp((color & 0xff) + shift);
  return (r << 16) | (g << 8) | b;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}


/** Осветлить цвет на factor (0..1) */
export function lighten(color: number, factor: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * factor));
  const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * factor));
  const b = Math.min(255, (color & 0xff) + Math.floor(255 * factor));
  return (r << 16) | (g << 8) | b;
}

/** Затемнить цвет на factor (0..1) */
export function darken(color: number, factor: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - Math.floor(255 * factor));
  const g = Math.max(0, ((color >> 8) & 0xff) - Math.floor(255 * factor));
  const b = Math.max(0, (color & 0xff) - Math.floor(255 * factor));
  return (r << 16) | (g << 8) | b;
}

