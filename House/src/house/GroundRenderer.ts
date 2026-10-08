import { Graphics, Container } from 'pixi.js';
import type { Palette } from '../types';
import { fillRect, strokeRect, hLine, vLine, fillCircle, fillPoly, strokePoly } from '../utils/drawPrimitives';
import { darken, lighten } from '../utils/colors';
import { mulberry32, randInt, pickRandom, randRange } from '../utils/math';

export interface GroundConfig {
  houseWidthPx: number;
  houseY: number;
  seed: number;
  roadHeight?: number;
}

/**
 * Рендерер мостовой, тротуара и поребрика под домом.
 *
 * Слои (сверху вниз):
 *  1. Поребрик — гранитный бордюр с фаской и тенями
 *  2. Тротуар — плиты известняка с декоративным рисунком
 *  3. Мостовая — булыжная / брусчатая / диабазовая шашка
 */
export function renderGround(container: Container, cfg: GroundConfig, palette: Palette): void {
  const g = new Graphics();
  const rng = mulberry32(cfg.seed + 500);
  const { houseWidthPx, houseY } = cfg;

  // Размеры (в пикселях)
  const curbHeight = 7;
  const sidewalkWidth = 22;
  const roadwayExtension = 80;

  const leftX = -roadwayExtension;
  const rightX = houseWidthPx + roadwayExtension;
  const totalWidth = rightX - leftX;

  // 1. Поребрик
  const curbTopY = houseY;
  drawCurb(g, leftX, curbTopY, totalWidth, curbHeight, palette, rng);

  // 2. Тротуар
  const sidewalkTopY = curbTopY + curbHeight;
  const sidewalkH = sidewalkWidth;
  drawSidewalk(g, leftX, sidewalkTopY, totalWidth, sidewalkH, palette, rng);

  // 3. Мостовая
  const roadwayTopY = sidewalkTopY + sidewalkH;
  const roadwayH = cfg.roadHeight ?? 120;
  drawRoadway(g, leftX, roadwayTopY, totalWidth, roadwayH, palette, rng);

  container.addChild(g);
}

// ============================================================================
// Поребрик (гранитный бордюрный камень)
// ============================================================================
function drawCurb(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  rng: () => number
): void {
  // Основное тело поребрика
  fillRect(g, x, y, w, h, palette.curb);
  // Верхняя грань (высветленная)
  fillRect(g, x, y, w, 2, palette.curbLight);
  // Нижняя тень
  fillRect(g, x, y + h - 2, w, 2, darken(palette.curb, 0.25));

  // Вертикальныя швы между гранитными блоками
  const blockW = 28 + Math.floor(rng() * 16); // 28–43 px
  let bx = x;
  while (bx < x + w) {
    const actualW = Math.min(blockW, x + w - bx);
    // Фаска на левом краю блока
    vLine(g, bx, y + 1, y + h - 1, darken(palette.curb, 0.15), 1.2, 0.5);
    // Лёгкая вертикаль по правому краю
    vLine(g, bx + actualW, y, y + h, darken(palette.curb, 0.2), 1.5, 0.6);

    // Верхняя фаска (скос)
    if (actualW > 8) {
      fillPoly(
        g,
        [
          bx + 2, y + 2,
          bx + actualW - 2, y + 2,
          bx + actualW - 4, y + 5,
          bx + 4, y + 5,
        ],
        darken(palette.curbLight, 0.08),
        0.4
      );
    }

    // Мелкая текстура гранита (точки)
    for (let i = 0; i < 3; i++) {
      const dotX = bx + 4 + rng() * (actualW - 8);
      const dotY = y + 2 + rng() * (h - 4);
      fillCircle(g, dotX, dotY, 0.6, palette.curbLight, 0.3 + rng() * 0.2);
    }

    bx += actualW;
  }

  // Горизонтальный поясок (декоративная полоса по верху)
  hLine(g, x, x + w, y + 1, palette.curbLight, 0.8, 0.6);
  hLine(g, x, x + w, y + h - 1, darken(palette.curb, 0.3), 1, 0.5);

  // Тумбы на углах (если есть место)
  const bollardW = 9;
  const bollardH = 14;
  if (w > 60) {
    // Левая тумба
    drawBollard(g, x + 12, y - bollardH, bollardW, bollardH, palette, rng);
    // Правая тумба
    drawBollard(g, x + w - 12 - bollardW, y - bollardH, bollardW, bollardH, palette, rng);
  }
}

/** Гранитная тумба (столбик) */
function drawBollard(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  rng: () => number
): void {
  // Основание
  fillRect(g, x - 1, y + h - 4, w + 2, 4, palette.curb);
  // Тело тумбы
  fillRect(g, x, y, w, h, palette.curbLight);
  // Фаска на углах
  fillPoly(
    g,
    [x, y + 2, x + 2, y, x + w - 2, y, x + w, y + 2, x + w, y + h - 2, x + w - 2, y + h, x + 2, y + h, x, y + h - 2],
    palette.curb,
    0.3
  );
  // Навершие (полукруглое)
  fillCircle(g, x + w / 2, y, w / 2 + 1, palette.curbLight);
  fillCircle(g, x + w / 2, y, w / 2 - 1, palette.curb, 0.5);
  // Шпиль
  fillCircle(g, x + w / 2, y - 2, 2, palette.iron);
  vLine(g, x + w / 2, y - 4, y - 8, palette.iron, 1.2);
}

// ============================================================================
// Тротуар (известняковыя плиты)
// ============================================================================
function drawSidewalk(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  rng: () => number
): void {
  // Фон тротуара (песчаная подушка)
  fillRect(g, x, y, w, h, darken(palette.sidewalk, 0.15));

  // Выбор типа раскладки плит
  const layoutType = pickRandom(rng, ['stretcher', 'random', 'diagonal']);

  // Глубина ряда (высота плиты по Y)
  const rowH = layoutType === 'diagonal' ? 18 : 14 + Math.floor(rng() * 8);
  const jointW = 1.5; // ширина шва

  let cy = y;
  let rowIndex = 0;
  while (cy < y + h) {
    const actualRowH = Math.min(rowH, y + h - cy);
    if (actualRowH < 4) break;

    let cx = x;
    while (cx < x + w) {
      // Ширина плиты
      let slabW: number;
      if (layoutType === 'stretcher') {
        slabW = rowH * 2 + rng() * 6;
      } else if (layoutType === 'diagonal') {
        slabW = rowH * 1.5 + rng() * 4;
      } else {
        slabW = rowH * (1.5 + rng() * 2);
      }
      slabW = Math.min(slabW, x + w - cx);
      if (slabW < 6) break;

      // Плита
      drawSlab(g, cx, cy, slabW, actualRowH, palette, rng);

      // Шов между плитами (вертикальный)
      if (cx + slabW < x + w) {
        vLine(g, cx + slabW, cy, cy + actualRowH, palette.sidewalkJoint, jointW, 0.7);
      }

      cx += slabW + jointW * 0.5;
    }

    // Горизонтальный шов
    if (cy + actualRowH < y + h) {
      hLine(g, x, x + w, cy + actualRowH, palette.sidewalkJoint, jointW, 0.6);
    }

    cy += actualRowH + jointW * 0.5;
    rowIndex++;
  }

  // Краевая обвязка тротуара (гранитная полоса у поребрика)
  fillRect(g, x, y + h - 3, w, 3, palette.curb, 0.4);
  hLine(g, x, x + w, y + h - 3, darken(palette.curb, 0.2), 0.8, 0.5);
}

/** Одна тротуарная плита */
function drawSlab(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  rng: () => number
): void {
  // Основание плиты
  const baseColor = lighten(palette.sidewalk, rng() * 0.06 - 0.03);
  fillRect(g, x + 0.5, y + 0.5, w - 1, h - 1, baseColor);

  // Фаска (верхняя грань)
  fillRect(g, x + 0.5, y + 0.5, w - 1, 1.5, lighten(baseColor, 0.12));
  // Нижняя тень
  fillRect(g, x + 0.5, y + h - 2, w - 1, 1.5, darken(baseColor, 0.1));

  // Мелкая текстура (пятнышки, микротрещины)
  for (let i = 0; i < 4; i++) {
    const dotX = x + 2 + rng() * (w - 4);
    const dotY = y + 2 + rng() * (h - 4);
    fillCircle(g, dotX, dotY, 0.5, darken(baseColor, 0.08), 0.4);
  }

  // Иногда — лёгкая диагональная трещина
  if (rng() < 0.2) {
    g.moveTo(x + w * 0.2, y + h * 0.1)
      .lineTo(x + w * 0.8, y + h * 0.9)
      .stroke({ color: darken(baseColor, 0.15), width: 0.4, alpha: 0.35 });
  }
}

// ============================================================================
// Мостовая (проезжая часть)
// ============================================================================

type RoadwayType = 'cobblestone' | 'sett' | 'diabase';

function drawRoadway(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  rng: () => number
): void {
  // Выбор типа мостовой
  const types: RoadwayType[] = ['cobblestone', 'sett', 'diabase'];
  const roadType = pickRandom(rng, types);

  // Земляное основание
  fillRect(g, x, y, w, h, darken(palette.roadway, 0.2));

  switch (roadType) {
    case 'cobblestone':
      drawCobblestoneRoad(g, x, y, w, h, palette, rng);
      break;
    case 'sett':
      drawSettRoad(g, x, y, w, h, palette, rng);
      break;
    case 'diabase':
      drawDiabaseRoad(g, x, y, w, h, palette, rng);
      break;
  }

  // Водосточный лоток (канавка у тротуара)
  drawGutter(g, x, y, w, palette, rng);
}

/** Булыжная мостовая — круглые/овальные камни разного размера */
function drawCobblestoneRoad(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  rng: () => number
): void {
  const avgR = 7;
  const spacing = avgR * 2.2;
  let row = 0;
  for (let cy = y + avgR; cy < y + h - avgR; cy += spacing * 0.87) {
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    for (let cx = x + offset + avgR; cx < x + w - avgR; cx += spacing) {
      const rx = avgR * (0.7 + rng() * 0.6);  // 0.7–1.3
      const ry = avgR * (0.7 + rng() * 0.6);
      const stoneX = cx + (rng() - 0.5) * spacing * 0.3;
      const stoneY = cy + (rng() - 0.5) * spacing * 0.3;

      // Тень под камнем
      fillCircle(g, stoneX + 1, stoneY + 1, Math.max(rx, ry) + 1, darken(palette.roadway, 0.3), 0.4);

      // Сам камень (эллипс аппроксимируем кругом)
      const stoneColor = lighten(palette.roadway, rng() * 0.15 - 0.05);
      fillCircle(g, stoneX, stoneY, (rx + ry) / 2, stoneColor);

      // Выпуклая верхушка (блик)
      fillCircle(g, stoneX - 1, stoneY - 1, (rx + ry) / 2 * 0.55, lighten(stoneColor, 0.1), 0.5);

      // Ободок камня
      strokeCircle(g, stoneX, stoneY, (rx + ry) / 2, darken(stoneColor, 0.2), 0.6, 0.4);
    }
    row++;
  }
}

/** Брусчатая мостовая — прямоугольные блоки рядами */
function drawSettRoad(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  rng: () => number
): void {
  const settW = 7 + rng() * 4;   // 7–11
  const settH = 5 + rng() * 3;   // 5–8
  const joint = 1.2;
  let row = 0;
  for (let cy = y + joint; cy < y + h - settH; cy += settH + joint) {
    const offset = row % 2 === 0 ? 0 : settW / 2;
    for (let cx = x + offset + joint; cx < x + w - settW; cx += settW + joint) {
      const sx = cx + (rng() - 0.5) * 1.5;
      const sy = cy + (rng() - 0.5) * 1.5;
      const color = lighten(palette.roadway, rng() * 0.12 - 0.06);
      // Блок
      fillRect(g, sx, sy, settW, settH, color);
      // Верхняя грань (свет)
      fillRect(g, sx, sy, settW, 1.5, lighten(color, 0.15), 0.5);
      // Нижняя тень
      fillRect(g, sx, sy + settH - 1.5, settW, 1.5, darken(color, 0.15), 0.5);
      // Левая тень
      fillRect(g, sx, sy, 1.5, settH, darken(color, 0.1), 0.3);
      // Правая светлая грань
      fillRect(g, sx + settW - 1.5, sy, 1.5, settH, lighten(color, 0.08), 0.3);
    }
    row++;
  }
}

/** Диабазовая шашка — мелкие кубики, очень ровная */
function drawDiabaseRoad(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  rng: () => number
): void {
  const cubeSize = 5;
  const joint = 1;
  const totalStep = cubeSize + joint;
  let row = 0;
  for (let cy = y + joint; cy < y + h - cubeSize; cy += totalStep) {
    const offset = row % 2 === 0 ? 0 : totalStep / 2;
    for (let cx = x + offset + joint; cx < x + w - cubeSize; cx += totalStep) {
      const color = lighten(palette.roadway, rng() * 0.1 - 0.05);
      // Кубик
      fillRect(g, cx, cy, cubeSize, cubeSize, color);
      // Верхняя грань (ближе к свету)
      fillRect(g, cx, cy, cubeSize, 1, lighten(color, 0.2), 0.55);
      // Правая грань
      fillRect(g, cx + cubeSize - 1, cy, 1, cubeSize, lighten(color, 0.1), 0.4);
      // Нижняя тень
      fillRect(g, cx, cy + cubeSize - 1, cubeSize, 1, darken(color, 0.25), 0.5);
      // Левая тень
      fillRect(g, cx, cy, 1, cubeSize, darken(color, 0.2), 0.35);
    }
    row++;
  }
}

/** Водосточный лоток (канавка вдоль тротуара) */
function drawGutter(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  palette: Palette,
  rng: () => number
): void {
  const gutterY = y;
  const gutterH = 5;

  // Углубление
  fillRect(g, x, gutterY, w, gutterH, darken(palette.roadway, 0.35));
  // Дно лотка (мокрый камень)
  fillRect(g, x, gutterY + gutterH - 2, w, 2, darken(palette.roadway, 0.15));

  // Решётка водостока (декоративная) — чугунныя полосы поперёк
  const grateSpacing = 18 + rng() * 8;
  for (let gx = x + 4; gx < x + w - 4; gx += grateSpacing) {
    // Рама решётки
    strokeRect(g, gx, gutterY, 8, gutterH, palette.iron, 1.2, 0.6);
    // Прутья
    vLine(g, gx + 2, gutterY + 0.5, gutterY + gutterH - 0.5, palette.iron, 0.8, 0.5);
    vLine(g, gx + 4, gutterY + 0.5, gutterY + gutterH - 0.5, palette.iron, 0.8, 0.5);
    vLine(g, gx + 6, gutterY + 0.5, gutterY + gutterH - 0.5, palette.iron, 0.8, 0.5);
  }

  // Край лотка (бортик)
  hLine(g, x, x + w, gutterY, palette.curb, 1.5, 0.5);
  hLine(g, x, x + w, gutterY + gutterH, palette.curb, 1, 0.4);
}

/** Вспомогательная: обводка круга */
function strokeCircle(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  color: number,
  width: number,
  alpha: number
): void {
  g.circle(cx, cy, r).stroke({ color, width, alpha });
}