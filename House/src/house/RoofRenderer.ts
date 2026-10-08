import { Graphics, Container } from 'pixi.js';
import type { Palette, RoofType } from '../types';
import { fillRect, strokeRect, hLine, vLine, fillPoly, strokePoly, fillCircle } from '../utils/drawPrimitives';
import { darken, lighten } from '../utils/colors';
import { drawDormer } from './WindowFactory';
import { mulberry32, randInt } from '../utils/math';

export interface RoofConfig {
  widthPx: number;
  /** Высота кровли от карниза до конька (px) */
  heightPx: number;
  /** Тип кровли */
  type: RoofType;
  /** Количество слуховых окон */
  dormersCount: number;
  /** Количество дымовых труб */
  chimneysCount: number;
  /** Есть ли парапет / балюстрада */
  hasParapet: boolean;
  /** Есть ли флагшток */
  hasFlagpole: boolean;
  seed: number;
}

export function renderRoof(container: Container, cfg: RoofConfig, palette: Palette): void {
  const g = new Graphics();
  const { widthPx, heightPx, type } = cfg;
  const rng = mulberry32(cfg.seed + 700);

  // --- Расчитываем край крыши ---
  let ridgeY: number;
  switch (type) {
    case 'gable':
      ridgeY = 0;
      break;
    case 'hipped':
      ridgeY = heightPx * 0.22;
      break;
    case 'mansard':
      ridgeY = heightPx * 0.08;
      break;
  }

  // --- Дымовые трубы (под основной кровлей, чтобы не пересекались со слуховыми окнами)---
  if (cfg.chimneysCount > 0) {
    const chimneyXs = getChimneyXPositions(widthPx, cfg.chimneysCount, rng);
    for (const cx of chimneyXs) {
      const baseY = getRoofY(cx, type, ridgeY, heightPx, widthPx) + 5; // смещаем чуть ниже, чтобы не было видно края трубы
      drawChimney(g, cx, baseY, 14, heightPx, palette, rng);
    }
  }

  // --- Основная кровля ---
  switch (type) {
    case 'gable':
      drawGableRoof(g, 0, 0, widthPx, heightPx, palette);
      break;
    case 'hipped':
      drawHippedRoof(g, 0, 0, widthPx, heightPx, palette);
      break;
    case 'mansard':
      drawMansardRoof(g, 0, 0, widthPx, heightPx, palette);
      break;
  }

  // --- Подшивка карниза (снизу) ---
  const overhang = 8;
  fillRect(g, -overhang, heightPx - 1, widthPx + overhang * 2, 3, darken(palette.wall, 0.2));
  fillRect(g, -overhang, heightPx - 1, widthPx + overhang * 2, 1, palette.wallLight, 0.3);

  // --- Снежные наносы на карнизе ---
  drawSnowDrifts(g, widthPx, heightPx, overhang, palette, rng);

  // --- Слуховые окна ---
  if (cfg.dormersCount > 0) {
    const spacing = widthPx / (cfg.dormersCount + 1);
    for (let i = 0; i < cfg.dormersCount; i++) {
      const dx = spacing * (i + 1) - 18;
      const dy = ridgeY + heightPx * 0.15;
      drawDormer(g, dx, dy, 36, 32, palette);
    }
  }

  

  // --- Парапет / балюстрада ---
  if (cfg.hasParapet) {
    drawParapet(g, ridgeY, 0, widthPx, palette);
  }

  // --- Флагшток ---
  if (cfg.hasFlagpole) {
    drawFlagpole(g, widthPx / 2, ridgeY, heightPx * 0.4, palette, rng);
  }

  // --- Водосточные желоба по краям ---
  drawGutter(g, -overhang, heightPx - 3, overhang, palette);
  drawGutter(g, widthPx, heightPx - 3, overhang, palette);

  container.addChild(g);
}

// ================================================================
// Двускатная кровля
// ================================================================
function drawGableRoof(g: Graphics, x: number, y: number, w: number, h: number, palette: Palette): void {
  const overhang = 8;

  // Основной треугольник
  fillPoly(
    g,
    [
      x - overhang, y + h,
      x + w / 2, y,
      x + w + overhang, y + h,
    ],
    palette.roof
  );

  // Более светлая полоса вдоль конька
  fillPoly(
    g,
    [
      x + w * 0.4, y + 6,
      x + w / 2, y,
      x + w * 0.6, y + 6,
    ],
    palette.roofHighlight,
    0.3
  );

  // Фальцы (горизонтальные полосы с учётом ската)
  for (let fy = y + 8; fy < y + h; fy += 6) {
    const t = (fy - y) / h;
    const leftX = x + t * w / 2 - overhang * (1 - t);
    const rightX = x + w - t * w / 2 + overhang * (1 - t);
    hLine(g, leftX, rightX, fy, palette.roofHighlight, 0.6, 0.12);
  }

  // Конёк
  fillRect(g, x + w / 2 - 15, y - 2, 30, 5, palette.ironHighlight);
  strokeRect(g, x + w / 2 - 15, y - 2, 30, 5, darken(palette.iron, 0.3), 1);
}

// ================================================================
// Вальмовая (четырёхскатная) кровля — вид спереди
// ================================================================
function drawHippedRoof(g: Graphics, x: number, y: number, w: number, h: number, palette: Palette): void {
  const overhang = 8;
  const ridgeLeft = x + w * 0.25;
  const ridgeRight = x + w * 0.75;
  const ridgeY = y + h * 0.22;

  // Левый скат (треугольник: край -> начало конька)
  fillPoly(
    g,
    [
      x - overhang, y + h,
      ridgeLeft, ridgeY,
      x + w * 0.05, y + h,
    ],
    darken(palette.roof, 0.06)
  );

  // Центральный (передний) скат
  fillPoly(
    g,
    [
      x + w * 0.05, y + h,
      ridgeLeft, ridgeY,
      ridgeRight, ridgeY,
      x + w * 0.95, y + h,
    ],
    palette.roof
  );

  // Правый скат (треугольник: конец конька -> край)
  fillPoly(
    g,
    [
      x + w * 0.95, y + h,
      ridgeRight, ridgeY,
      x + w + overhang, y + h,
    ],
    darken(palette.roof, 0.06)
  );

  // Фальцы — только по переднему скату
  for (let fy = ridgeY + 6; fy < y + h; fy += 5) {
    const t = (fy - ridgeY) / (y + h - ridgeY);
    const leftX = ridgeLeft + t * (ridgeLeft - (x + w * 0.05));
    const rightX = ridgeRight - t * (ridgeRight - (x + w * 0.95));
    hLine(g, leftX, rightX, fy, palette.roofHighlight, 0.5, 0.1);
  }

  // Фальцы левого ската (короткие наклонные)
  for (let fy = ridgeY + 6; fy < y + h; fy += 5) {
    const t = (fy - ridgeY) / (y + h - ridgeY);
    const lx = (x - overhang) + t * (ridgeLeft - (x - overhang));
    hLine(g, x - overhang + t * 2, lx, fy, palette.roofHighlight, 0.4, 0.07);
  }

  // Конёк
  fillRect(g, ridgeLeft - 2, ridgeY - 3, ridgeRight - ridgeLeft + 4, 5, palette.ironHighlight);
  strokeRect(g, ridgeLeft - 2, ridgeY - 3, ridgeRight - ridgeLeft + 4, 5, darken(palette.iron, 0.3), 1);

  // Торцевые заглушки конька
  strokeRect(g, ridgeLeft - 3, ridgeY - 2, 6, 4, palette.iron, 1);
  strokeRect(g, ridgeRight - 3, ridgeY - 2, 6, 4, palette.iron, 1);
}

// ================================================================
// Мансардная кровля — с переломом
// ================================================================
function drawMansardRoof(g: Graphics, x: number, y: number, w: number, h: number, palette: Palette): void {
  const overhang = 6;
  const breakY = y + h * 0.52;
  const breakInset = w * 0.10;
  const ridgeY = y + h * 0.08;
  const ridgeLeft = x + w * 0.30;
  const ridgeRight = x + w * 0.70;

  // Левый нижний скат (треугольник)
  fillPoly(
    g,
    [
      x - overhang, y + h,
      x + breakInset, breakY,
      x + w * 0.05, y + h,
    ],
    darken(palette.roof, 0.10)
  );

  // Нижний передний скат
  fillPoly(
    g,
    [
      x + w * 0.05, y + h,
      x + breakInset, breakY,
      x + w - breakInset, breakY,
      x + w * 0.95, y + h,
    ],
    darken(palette.roof, 0.08)
  );

  // Правый нижний скат
  fillPoly(
    g,
    [
      x + w * 0.95, y + h,
      x + w - breakInset, breakY,
      x + w + overhang, y + h,
    ],
    darken(palette.roof, 0.10)
  );

  // Верхний пологий скат
  fillPoly(
    g,
    [
      x + breakInset, breakY,
      ridgeLeft, ridgeY,
      ridgeRight, ridgeY,
      x + w - breakInset, breakY,
    ],
    palette.roof
  );

  // Фальцы на нижнем скате
  for (let fy = breakY + 6; fy < y + h; fy += 5) {
    const t = (fy - breakY) / (y + h - breakY);
    const leftX = x + breakInset + t * (breakInset - w * 0.05);
    const rightX = x + w - breakInset - t * (breakInset - w * 0.05);
    hLine(g, leftX, rightX, fy, palette.roofHighlight, 0.4, 0.08);
  }

  // Линия перелома
  hLine(g, x + breakInset - 2, x + w - breakInset + 2, breakY, palette.ironHighlight, 1.5, 0.5);
  hLine(g, x + breakInset - 2, x + w - breakInset + 2, breakY + 1, darken(palette.roof, 0.3), 0.8);
}

// ================================================================
// Дымовая труба
// ================================================================
function drawChimney(
  g: Graphics,
  x: number,
  topY: number,
  w: number,
  roofH: number,
  palette: Palette,
  rng: () => number
): void {
  // Вариативность размеров
  const h = roofH * (0.42 + rng() * 0.15);
  const wVar = w * (0.85 + rng() * 0.3);
  const y = topY - h;

  // Тело трубы с чередующимися рядами кирпича
  fillRect(g, x, y, wVar, h, palette.brick);
  // Горизонтальные швы
  const brickRowH = 5 + rng() * 3;
  for (let sy = y + 4; sy < y + h; sy += brickRowH) {
    hLine(g, x, x + wVar, sy, palette.brickDark, 0.6, 0.25);
  }

  // Декоративные пояски (1 или 2)
  const beltCount = rng() > 0.5 ? 1 : 2;
  for (let b = 0; b < beltCount; b++) {
    const beltY = y + h * (0.2 + b * 0.35);
    fillRect(g, x - 1, beltY, wVar + 2, 3, lighten(palette.brick, 0.15));
    hLine(g, x - 1, x + wVar + 1, beltY, palette.brickDark, 0.5, 0.2);
  }

  // Карниз трубы (вариативный)
  const corniceW = 2 + rng() * 3;
  fillRect(g, x - corniceW, y + 2, wVar + corniceW * 2, 3, palette.rustDark);
  fillRect(g, x - corniceW + 1, y, wVar + corniceW * 2 - 2, 3, palette.rustDark);

  // Колпак (флюгарка) — форма зависит от rng
  const capH = 5 + rng() * 5;
  if (rng() > 0.4) {
    // Треугольный
    fillPoly(
      g,
      [
        x - 2, y,
        x + wVar / 2, y - capH,
        x + wVar + 2, y,
      ],
      palette.iron
    );
  } else {
    // Прямоугольный с навершием
    fillRect(g, x - 1, y - capH, wVar + 2, capH, palette.iron);
    fillRect(g, x + wVar * 0.3, y - capH - 2, wVar * 0.4, 2, palette.iron);
  }

  // Шпиль
  const spireH = 6 + rng() * 8;
  vLine(g, x + wVar / 2, y - capH, y - capH - spireH, palette.iron, 1.2);

  // Флюгер (флажок) — не всегда
  if (rng() > 0.3) {
    const flagY = y - capH - spireH + 2;
    const flagW = 6 + rng() * 8;
    fillPoly(
      g,
      [
        x + wVar / 2, flagY - 3,
        x + wVar / 2 + flagW, flagY - 1,
        x + wVar / 2, flagY + 2,
      ],
      palette.iron
    );
    // Прорезь в флюгере
    hLine(g, x + wVar / 2 + 2, x + wVar / 2 + flagW - 3, flagY - 1, palette.roofHighlight, 0.5, 0.3);
  }
}

// ================================================================
// Парапет с балюстрадой
// ================================================================
function drawParapet(g: Graphics, x: number, y: number, w: number, palette: Palette): void {
  const parapetH = 14;

  // Основание парапета
  fillRect(g, x + 4, y - 2, w - 8, 3, palette.rustDark);
  hLine(g, x + 4, x + w - 4, y - 2, palette.wallLight, 0.5, 0.4);

  // Тумбы
  const tumbaW = 10;
  const tumbaH = parapetH;
  for (let tx = x + 6; tx < x + w - 6; tx += tumbaW * 3.5) {
    if (tx + tumbaW > x + w - 6) break;
    fillRect(g, tx, y - tumbaH, tumbaW, tumbaH, palette.rust);
    strokeRect(g, tx, y - tumbaH, tumbaW, tumbaH, darken(palette.rust, 0.25), 1);
    // Филенка на тумбе
    fillRect(g, tx + 2, y - tumbaH + 3, tumbaW - 4, tumbaH - 8, darken(palette.rust, 0.1));
    strokeRect(g, tx + 2, y - tumbaH + 3, tumbaW - 4, tumbaH - 8, darken(palette.rust, 0.3), 0.8);
  }

  // Балясины
  for (let bx = x + tumbaW + 8; bx < x + w - tumbaW - 8; bx += 5) {
    fillRect(g, bx, y - parapetH + 4, 2.5, parapetH - 8, palette.rust);
    // Утолщение в середине
    fillCircle(g, bx + 1.2, y - parapetH / 2, 2, palette.rust, 0.7);
  }

  // Верхний поручень
  fillRect(g, x + 4, y - parapetH, w - 8, 3, palette.rustDark);
  hLine(g, x + 4, x + w - 4, y - parapetH, palette.wallLight, 0.5, 0.4);
  hLine(g, x + 4, x + w - 4, y - parapetH + 2, darken(palette.rust, 0.2), 0.6);
}

// ================================================================
// Флагшток / флюгер
// ================================================================
function drawFlagpole(g: Graphics, x: number, y: number, h: number, palette: Palette, rng: () => number): void {
  // Основание
  const baseW = 5 + rng() * 4;
  fillRect(g, x - baseW / 2, y + 2, baseW, 3, palette.iron);
  fillRect(g, x - baseW / 2 - 1, y, baseW + 2, 2, palette.iron);

  // Шпиль
  const poleTop = y - h;
  vLine(g, x, y - 4, poleTop, palette.gold, 2);
  vLine(g, x + 1, y - 5, poleTop, lighten(palette.gold, 0.2), 0.5, 0.3);

  // Выбор типа навершия
  const ornamentType = rng() < 0.3 ? 'spire' : (rng() < 0.6 ? 'flag' : 'vane');

  if (ornamentType === 'flag') {
    // Флаг (стилизованный Андреевский или простой)
    const flagX = x + 1;
    const flagY = poleTop + h * 0.1;
    const flagW = 12 + rng() * 8;
    const flagH = 6 + rng() * 4;
    fillRect(g, flagX, flagY, flagW, flagH, 0xf0f4f8, 0.9);
    strokeRect(g, flagX, flagY, flagW, flagH, 0x3a3028, 0.5, 0.4);
    // Крест на флаге (только если не простой)
    if (rng() > 0.4) {
      hLine(g, flagX, flagX + flagW, flagY + flagH / 2, 0x1a3a5c, 1.2, 0.4);
      vLine(g, flagX + flagW / 2, flagY, flagY + flagH, 0x1a3a5c, 1.2, 0.4);
    }
  } else if (ornamentType === 'vane') {
    // Флюгер-стрелка
    const vaneY = poleTop + 8;
    // Стрелка
    fillPoly(
      g,
      [
        x, vaneY - 5,
        x + (rng() > 0.5 ? 1 : -1) * (12 + rng() * 8), vaneY,
        x, vaneY + 5,
      ],
      palette.iron
    );
    // Противовес
    fillPoly(
      g,
      [
        x, vaneY - 5,
        x - (rng() > 0.5 ? 1 : -1) * 6, vaneY,
        x, vaneY + 5,
      ],
      palette.iron
    );
    // Центральный штырёк
    fillCircle(g, x, vaneY, 2, palette.gold);
  } else {
    // Просто шар
    fillCircle(g, x, poleTop, 4, palette.gold);
    fillCircle(g, x - 1, poleTop - 1, 1.5, palette.gold, 0.5);
  }

  // Шар на самом верху (если не spire и не flag)
  if (ornamentType !== 'spire') {
    fillCircle(g, x, poleTop, 3 + rng() * 2, palette.gold);
  }
}

// ================================================================
// Снежные наносы на карнизе
// ================================================================
function drawSnowDrifts(
  g: Graphics,
  w: number,
  roofBaseY: number,
  overhang: number,
  palette: Palette,
  rng: () => number
): void {
  const snowY = roofBaseY + 1;
  const segments = Math.floor(w / 8);
  const pts: number[] = [];

  // Левая граница
  pts.push(-overhang, snowY + 3);
  for (let i = 0; i <= segments; i++) {
    const sx = -overhang + (i / segments) * (w + overhang * 2);
    const sy = snowY + (Math.sin(i * 1.8 + rng() * 3) * 2 + 2);
    pts.push(sx, sy);
  }
  // Правая граница
  pts.push(w + overhang, snowY + 3);

  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) {
    g.lineTo(pts[i], pts[i + 1]);
  }
  g.lineTo(w + overhang, snowY - 2)
    .lineTo(-overhang, snowY - 2)
    .closePath()
    .fill({ color: palette.snow, alpha: 0.7 });
}

// ================================================================
// Водосточный желоб
// ================================================================
function drawGutter(
  g: Graphics,
  x: number,
  y: number,
  width: number,
  palette: Palette
): void {
  fillRect(g, x, y, width, 2, palette.iron);
  vLine(g, x + width / 2, y, y + 4, palette.iron, 1.5);
}

// ================================================================
// Распределение труб по X
// ================================================================
function getChimneyXPositions(
  roofW: number,
  count: number,
  rng: () => number
): number[] {
  const positions: number[] = [];
  const offset = roofW * 0.15;
  if (count === 1) {
    const cx = roofW / 2 + (rng() > 0.5 ? 1 : -1) * (roofW * 0.1 + rng() * roofW * 0.15);
    positions.push(cx);
  } else {
    const cx1 = offset + rng() * roofW * 0.08;
    const cx2 = roofW - offset - rng() * roofW * 0.08;
    positions.push(cx1, cx2);
  }
  return positions;
}

/** Вычислить Y-координату верха ската в точке cx для разных типов крыш */
function getRoofY(
  cx: number,
  type: RoofType,
  ridgeY: number,
  heightPx: number,
  widthPx: number
): number {
  if (type === 'gable') {
    // Треугольник: высота падает линейно от центра
    const dx = Math.abs(cx - widthPx / 2) / (widthPx / 2);
    return ridgeY + dx * heightPx;
  } else if (type === 'hipped') {
    if (cx < widthPx * 0.25 || cx > widthPx * 0.75) {
      // На боковом скате — труба не видна, даём среднее значение
      return ridgeY + heightPx * 0.3;
    } else {
      // Плоский центральный скат
      return ridgeY;
    }
  } else { // mansard
    if (cx < widthPx * 0.30 || cx > widthPx * 0.70) {
      return ridgeY + heightPx * 0.15;
    }
    return ridgeY;
  }
}
