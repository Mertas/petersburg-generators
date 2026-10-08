import { Graphics, Container } from 'pixi.js';
import type { Palette } from '../types';
import { METER_TO_PX } from '../types';
import { fillRect, strokeRect, hLine, vLine, fillCircle, drawRustication, drawDiamondRust } from '../utils/drawPrimitives';
import { darken, lighten } from '../utils/colors';
import { drawWindow, type WindowVariant, type SandrikType } from './WindowFactory';
import { mulberry32, randRange, randInt, pickRandom } from '../utils/math';

export interface FloorConfig {
  /** Позиция этажа в доме (0 = цоколь, 1 = первый, ...) */
  level: number;
  /** Ширина этажа (в пикселях) */
  widthPx: number;
  /** Высота этажа (в пикселях) */
  heightPx: number;
  /** Координаты оконных осей по X (центры) */
  windowAxes: number[];
  /** Ширина оконного проёма (px) */
  windowWidth: number;
  /** Высота оконного проёма (px) */
  windowHeight: number;
  /** Есть ли балконы на этом этаже */
  hasBalcony: boolean;
  /** Это парадный (первый) этаж */
  isPianoNobile: boolean;
  /** Это цоколь */
  isBasement: boolean;
  /** Стиль дома */
  style: 'eclectic';
  /** Seed для рандомизации декора */
  seed: number;
}

export function renderFloor(container: Container, cfg: FloorConfig, palette: Palette): void {
  const g = new Graphics();
  const { level, widthPx, heightPx, windowAxes, windowWidth, windowHeight, hasBalcony } = cfg;

  // --- Стена ---
  const wallColor = cfg.isBasement ? palette.basement : palette.wall;
  fillRect(g, 0, 0, widthPx, heightPx, wallColor);

  // --- Разница в цвете для верхних этажей ---
  if (level > 2 && !cfg.isBasement) {
    fillRect(g, 0, 0, widthPx, heightPx, palette.wallUpper, 0.3);
  }

  // --- Рустовка ---
  if (cfg.isPianoNobile) {
    const rustRows = Math.floor(heightPx / 28);
    drawRustication(g, 0, 0, widthPx, heightPx, rustRows, cfg.windowAxes.length * 2 + 2, palette.rustDark, 1.2);
    // Бриллиантовый руст по углам
    drawDiamondRust(g, 0, 0, 60, heightPx, rustRows, palette.rust, palette.rustDark);
    drawDiamondRust(g, widthPx - 60, 0, 60, heightPx, rustRows, palette.rust, palette.rustDark);
  }

  // Выбираем вариант окна для всего этажа (единый rng)
  const rng = mulberry32(cfg.seed + level * 100);
  const variantPool: WindowVariant[] = ['semicircular', 'rectangular', 'segmental'];
  const sandrikPool: SandrikType[] = ['triangular', 'segmental', 'rectangular', 'none'];

  const floorVariant = cfg.isBasement
    ? 'rectangular' as WindowVariant
    : variantPool[Math.floor(rng() * variantPool.length)];
  const floorSandrik = cfg.isBasement
    ? 'none' as SandrikType
    : sandrikPool[Math.floor(rng() * sandrikPool.length)];
  const floorMullions = cfg.isBasement ? 0 : (rng() > 0.5 ? 1 : 2);

  // --- Окна ---
  for (const axisX of windowAxes) {
    const ww = windowWidth;
    const wh = windowHeight;
    const wx = axisX - ww / 2;
    const wy = (heightPx - wh) / 2;

    const opts = {
      x: wx,
      y: wy,
      width: ww,
      height: wh,
      variant: floorVariant,
      sandrik: floorSandrik,
      hasSill: !cfg.isBasement,
      hasShutters: false,
      hasApron: !cfg.isBasement && level >= 2,
      frameWidth: cfg.isBasement ? 3 : 4,
      mullions: floorMullions,
      transom: cfg.isPianoNobile,
    };
    drawWindow(g, opts, palette);

    // Балкон над окном
    if (hasBalcony && !cfg.isBasement) {
      drawSingleBalcony(g, axisX, heightPx, ww, palette, rng);
    }
  }

  // --- Межэтажная тяга (верхняя граница этажа) ---
  if (!cfg.isBasement) {
    drawFloorCornice(g, 0, heightPx - 6, widthPx, palette, level, 'eclectic');
  }

  container.addChild(g);
}

/**
 * Кирпичный узор: горизонтальные полосы с «тычками» и декоративные ширинки.
 */
function drawBrickPattern(g: Graphics, x: number, y: number, w: number, h: number, palette: Palette): void {
  const brickH = 6;
  const rows = Math.floor(h / brickH);
  for (let row = 0; row < rows; row++) {
    const yy = y + row * brickH;
    const isHeader = row % 5 === 0; // ряд тычков каждые 5 рядов
    if (isHeader) {
      // Ряд мелких вертикальных чёрточек
      for (let bx = x; bx < x + w; bx += brickH) {
        hLine(g, bx, Math.min(bx + brickH * 0.5, x + w), yy, palette.brickLight, 1, 0.3);
      }
    }
    hLine(g, x, x + w, yy + brickH, palette.brickDark, 0.5, 0.15);
  }

  // Ширинки (декоративные углубления)
  for (let sy = y + 12; sy < y + h - 12; sy += 48) {
    fillRect(g, x + 8, sy, 16, 24, palette.brickDark, 0.2);
    strokeRect(g, x + 8, sy, 16, 24, palette.brickLight, 1, 0.4);
    fillRect(g, x + w - 24, sy, 16, 24, palette.brickDark, 0.2);
    strokeRect(g, x + w - 24, sy, 16, 24, palette.brickLight, 1, 0.4);
  }
}

/**
 * Балкон над отдельным окном.
 */
function drawSingleBalcony(
  g: Graphics,
  centerX: number,
  floorH: number,
  windowW: number,
  palette: Palette,
  rng: () => number
): void {
  const balconyY = floorH - 8;
  const halfW = windowW * 0.7;
  const leftX = centerX - halfW;
  const rightX = centerX + halfW;
  const balconyW = rightX - leftX;

  // Плита
  const slabH = 5;
  fillRect(g, leftX - 4, balconyY, balconyW + 8, slabH, palette.rustDark);
  fillRect(g, leftX - 4, balconyY, balconyW + 8, 2, palette.ironHighlight, 0.6);

  // Консоли (2 штуки по краям)
  const consoleW = 6;
  const consoleH = 12;
  for (const cx of [leftX, rightX - consoleW]) {
    fillRect(g, cx, balconyY + slabH, consoleW, consoleH, palette.rustDark);
    // Волюта
    fillCircle(g, cx + consoleW / 2, balconyY + slabH + consoleH, consoleW / 2, palette.rust, 0.5);
  }

  // Решётка
  const railingH = 20;
  const railingY = balconyY - railingH;
  const railColor = palette.iron;

  // Верхний и нижний поручни
  fillRect(g, leftX, railingY, balconyW, 2, railColor);
  fillRect(g, leftX, balconyY - 2, balconyW, 2, railColor);

  // Балясины
  const balusterSpacing = 4;
  for (let bx = leftX; bx <= rightX; bx += balusterSpacing) {
    vLine(g, bx, railingY + 2, balconyY - 2, railColor, 1);
  }

  // Декоративный узор
  const pattern = rng() > 0.5 ? 'meander' : 'wave';
  if (pattern === 'wave') {
    for (let bx = leftX; bx < rightX - 6; bx += 6) {
      const midY = railingY + railingH / 2;
      g.moveTo(bx, midY)
        .quadraticCurveTo(bx + 3, midY - 4, bx + 6, midY)
        .stroke({ color: railColor, width: 1 });
    }
  } else {
    for (let bx = leftX; bx < rightX - 10; bx += 10) {
      const my = railingY + railingH / 2;
      g.moveTo(bx, my)
        .lineTo(bx + 3, my)
        .lineTo(bx + 3, my - 4)
        .lineTo(bx + 7, my - 4)
        .lineTo(bx + 7, my)
        .lineTo(bx + 10, my)
        .stroke({ color: railColor, width: 1 });
    }
  }
}

/**
 * Межэтажный карниз (профилированная тяга).
 */
function drawFloorCornice(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  palette: Palette,
  level: number,
  style: string
): void {
  const lineColor = darken(palette.wall, 0.15);
  hLine(g, x, x + w, y, lineColor, 1);
  hLine(g, x, x + w, y + 2, palette.wallLight, 1, 0.5);
  hLine(g, x, x + w, y + 4, lineColor, 1.5);

  // Сухарики (дентикулы) на верхних этажах
  if (level >= 3 && style !== 'brick') {
    const dentilW = 5;
    const dentilH = 4;
    const spacing = dentilW * 2;
    for (let dx = x + 10; dx < x + w - 10; dx += spacing) {
      fillRect(g, dx, y - dentilH, dentilW, dentilH, darken(palette.wall, 0.2));
    }
  }
}
