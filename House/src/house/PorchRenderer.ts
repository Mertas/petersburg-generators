import { Graphics, Container } from 'pixi.js';
import type { Palette } from '../types';
import { fillRect, strokeRect, hLine, vLine, fillPoly, strokePoly, fillCircle } from '../utils/drawPrimitives';
import { darken, lighten } from '../utils/colors';
import { mulberry32 } from '../utils/math';

/**
 * Рендерер парадного входа петербургского доходного дома XIX века.
 *
 * Композиция (сверху вниз):
 *   - архивольт / лучковая перемычка над порталом
 *   - полуциркульная фрамуга с радиальной расстекловкой
 *   - двустворчатая филёнчатая дверь (ручки ТОЛЬКО у центра, по одной на створку)
 *   - козырёк на ажурных чугунных кронштейнах (крепится К СТЕНЕ над архивольтом)
 *   - пилястры по бокам портала
 *   - табличка с номером дома
 *   - площадка перед дверью
 *   - ступени (3–5) с расходящимися боковыми стенками
 *   - фонари-бра НА СТЕНЕ снаружи портала
 *   - петли дверей
 */

export interface PorchConfig {
  centerX: number;
  groundY: number;
  doorWidth: number;
  doorHeight: number;
  style: string;
  hasTransom: boolean;
  hasLanterns: boolean;
  seed: number;
}

export function renderPorch(container: Container, cfg: PorchConfig, palette: Palette): void {
  const g = new Graphics();
  const { centerX, groundY, doorWidth, doorHeight, hasTransom, hasLanterns } = cfg;
  const rng = mulberry32(cfg.seed + 200);
  const halfDW = doorWidth / 2;
  const doorLeft = centerX - halfDW;
  const doorTopY = groundY - doorHeight;
  const transomH = hasTransom ? doorHeight * 0.32 : 0;
  const totalDoorH = doorHeight + transomH;
  const totalTopY = groundY - totalDoorH;

  // -----------------------------------------------------------
  // Пилястры по бокам портала
  // -----------------------------------------------------------
  const pilasterW = 9;
  const portalExtra = pilasterW + 6;
  const portalX = doorLeft - portalExtra;
  const portalW = doorWidth + portalExtra * 2;
  const portalY = totalTopY - 10;
  const portalH = totalDoorH + 10;

  // Левая пилястра
  drawPilaster(g, portalX, portalY, pilasterW, portalH, palette, 'eclectic');
  // Правая пилястра
  drawPilaster(g, portalX + portalW - pilasterW, portalY, pilasterW, portalH, palette, 'eclectic');

  // -----------------------------------------------------------
  // Ниша портала (углубление между пилястрами)
  // -----------------------------------------------------------
  const nicheX = portalX + pilasterW;
  const nicheW = portalW - pilasterW * 2;
  fillRect(g, nicheX, portalY, nicheW, portalH, darken(palette.wall, 0.08));

  // -----------------------------------------------------------
  // Архивольт (полуциркульная арка над порталом)
  // -----------------------------------------------------------
  const archR = nicheW / 2;
  const archCenterY = totalTopY; // центр арки на уровне верха двери
  g.moveTo(nicheX, archCenterY)
    .arc(centerX, archCenterY, archR, Math.PI, 0, true)
    .stroke({ color: darken(palette.wall, 0.25), width: 3 });

  // Замковый камень
  const ksW = 8;
  const ksH = 9;
  const ksX = centerX - ksW / 2;
  const ksY = archCenterY - archR - ksH + 3;
  fillRect(g, ksX, ksY, ksW, ksH, palette.rustDark);
  fillPoly(
    g,
    [ksX, ksY, ksX - 1.5, ksY + ksH, ksX + ksW + 1.5, ksY + ksH, ksX + ksW, ksY],
    darken(palette.rustDark, 0.1)
  );

  // -----------------------------------------------------------
  // Дверь — две створки
  // -----------------------------------------------------------
  // Ручки: у левой створки — справа, у правой — слева (ОБЕ у центра)
  drawDoorLeaf(g, doorLeft, totalTopY, halfDW, totalDoorH, palette, 'left');
  drawDoorLeaf(g, centerX, totalTopY, halfDW, totalDoorH, palette, 'right');

  // Центральный притвор (вертикальная щель между створками)
  vLine(g, centerX, totalTopY + 2, groundY - 2, darken(palette.door, 0.3), 1.5);

  // Петли (на внешних краях обеих створок)
  drawHinges(g, doorLeft, totalTopY, totalDoorH, palette, 'left');
  drawHinges(g, centerX + halfDW, totalTopY, totalDoorH, palette, 'right');

  // -----------------------------------------------------------
  // Фрамуга
  // -----------------------------------------------------------
  if (hasTransom) {
    const transomBottomY = totalTopY;
    const transomTopY = transomBottomY - transomH;

    // Полуциркульная фрамуга
    const archR = halfDW;
    const archCenterY = transomBottomY;
    g.moveTo(doorLeft, transomBottomY)
      .arc(centerX, archCenterY, archR, Math.PI, 0, true)
      .lineTo(doorLeft, transomBottomY)
      .closePath()
      .fill({ color: palette.windowGlass });

    // Радиальная расстекловка
    const rayCount = 9;
    for (let i = 0; i <= rayCount; i++) {
      const angle = Math.PI - (i / rayCount) * Math.PI;
      const rx = centerX + Math.cos(angle) * archR;
      const ry = archCenterY - Math.sin(angle) * archR;
      g.moveTo(centerX, archCenterY).lineTo(rx, ry)
        .stroke({ color: palette.windowFrame, width: 1.2 });
    }

    // Обводка арки
    g.moveTo(doorLeft, transomBottomY)
      .arc(centerX, archCenterY, archR, Math.PI, 0, true)
      .stroke({ color: palette.windowFrame, width: 2 });

    // Блик на стекле
    fillRect(g, doorLeft + halfDW * 0.3, transomBottomY - transomH * 0.7, halfDW * 0.3, transomH * 0.5, palette.windowGlassHighlight, 0.25);
  }

  // -----------------------------------------------------------
  // Табличка с номером дома (над дверью, под фрамугой)
  // -----------------------------------------------------------
  const plaqueW = doorWidth * 0.5;
  const plaqueH = 8;
  const plaqueX = centerX - plaqueW / 2;
  const plaqueY = totalTopY + 2;
  fillRect(g, plaqueX, plaqueY, plaqueW, plaqueH, palette.wallLight);
  strokeRect(g, plaqueX, plaqueY, plaqueW, plaqueH, darken(palette.wall, 0.3), 1);
  // Номер (стилизованный)
  const houseNum = Math.floor(rng() * 90 + 10);
  // Рисуем цифры упрощённо — две вертикальные полоски
  const digitW = plaqueW / 6;
  vLine(g, plaqueX + plaqueW * 0.3, plaqueY + 1.5, plaqueY + plaqueH - 1.5, palette.gold, 1.5);
  vLine(g, plaqueX + plaqueW * 0.7, plaqueY + 1.5, plaqueY + plaqueH - 1.5, palette.gold, 1.5);
  hLine(g, plaqueX + plaqueW * 0.25, plaqueX + plaqueW * 0.75, plaqueY + plaqueH / 2, palette.gold, 1);

  // -----------------------------------------------------------
  // Козырёк на кронштейнах (крепится К СТЕНЕ над архивольтом)
  // -----------------------------------------------------------
  const canopyWidth = portalW + 16;
  const canopyY = portalY - 10; // над вершиной архивольта
  drawCanopy(g, centerX + 8, canopyY, canopyWidth, portalX, portalX + portalW, portalY, palette, 'eclectic');

  // -----------------------------------------------------------
  // Площадка + ступени
  // -----------------------------------------------------------
  const landingW = doorWidth + 16;
  const landingY = groundY;
  drawSteps(g, centerX, landingY, landingW, 4, palette, rng);

  // -----------------------------------------------------------
  // Фонари-бра НА СТЕНЕ снаружи портала
  // -----------------------------------------------------------
  if (hasLanterns) {
    const lanternY = totalTopY + totalDoorH * 0.35;
    // Левый фонарь — на стене левее пилястры
    drawWallLantern(g, portalX - 10, lanternY, palette, 'left');
    // Правый фонарь — на стене правее пилястры
    drawWallLantern(g, portalX + portalW + 10, lanternY, palette, 'right');
  }

  container.addChild(g);
}

// ================================================================
// Пилястра (вертикальный выступ с базой и капителью)
// ================================================================
function drawPilaster(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  style: string
): void {
  // Тело пилястры
  fillRect(g, x, y, w, h, lighten(palette.wall, 0.06));

  // Каннелюры (вертикальные желобки)
  for (let cx = x + 2; cx < x + w - 1; cx += 2.5) {
    vLine(g, cx, y + 12, y + h - 12, darken(palette.wall, 0.15), 0.6);
  }

  // База
  fillRect(g, x - 2, y + h - 10, w + 4, 5, palette.rustDark);
  fillRect(g, x - 3, y + h - 5, w + 6, 5, palette.rustDark);

  // Капитель
  fillRect(g, x - 2, y + 4, w + 4, 5, palette.rustDark);
  fillRect(g, x - 3, y, w + 6, 4, palette.rustDark);


}

// ================================================================
// Створка двери
// ================================================================
function drawDoorLeaf(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: Palette,
  side: 'left' | 'right'
): void {
  // Основа
  fillRect(g, x, y, w, h, palette.door);

  const panelMargin = 3;
  const panelInset = 2;
  const doorColor = palette.door;

  // Верхняя филёнка (квадратная)
  const upperY = y + h * 0.07;
  const upperH = h * 0.28;
  fillRect(g, x + panelMargin, upperY, w - panelMargin * 2, upperH, lighten(doorColor, 0.12));
  strokeRect(g, x + panelMargin + panelInset, upperY + panelInset, w - (panelMargin + panelInset) * 2, upperH - panelInset * 2, darken(doorColor, 0.25), 1);

  // Средняя горизонтальная перемычка
  const midY = y + h * 0.40;
  fillRect(g, x + 2, midY, w - 4, h * 0.06, darken(doorColor, 0.1));

  // Нижняя филёнка (вытянутая)
  const lowerY = y + h * 0.50;
  const lowerH = h * 0.44;
  fillRect(g, x + panelMargin, lowerY, w - panelMargin * 2, lowerH, lighten(doorColor, 0.12));
  strokeRect(g, x + panelMargin + panelInset, lowerY + panelInset, w - (panelMargin + panelInset) * 2, lowerH - panelInset * 2, darken(doorColor, 0.25), 1);

  // Ручка — строго у центральной перемычки, со стороны притвора
  // Левая створка: ручка справа (+w), правая створка: ручка слева (+0)
  const handleX = side === 'left' ? x + w - 3 : x + 3;
  const handleY = midY + h * 0.03;
  // Основание ручки (круглая розетка)
  fillCircle(g, handleX, handleY, 3, palette.gold);
  fillCircle(g, handleX, handleY, 1.8, lighten(palette.gold, 0.3));
  // Сама ручка (горизонтальная скоба)
  const handleOutX = side === 'left' ? handleX + 5 : handleX - 5;
  g.moveTo(handleX, handleY).lineTo(handleOutX, handleY - 1).stroke({ color: palette.gold, width: 1.5 });
  g.moveTo(handleX, handleY).lineTo(handleOutX, handleY + 1).stroke({ color: palette.gold, width: 1.5 });

  // Замочная скважина (под ручкой)
  fillCircle(g, handleX, handleY + 5, 1.2, darken(palette.gold, 0.4));
}

// ================================================================
// Дверные петли
// ================================================================
function drawHinges(
  g: Graphics,
  edgeX: number,
  doorTopY: number,
  doorH: number,
  palette: Palette,
  side: 'left' | 'right'
): void {
  const hingeW = side === 'left' ? 4 : -4;
  const hingeH = 5;
  const positions = [doorH * 0.12, doorH * 0.85];
  for (const offset of positions) {
    const hy = doorTopY + offset;
    fillRect(g, edgeX, hy, hingeW, hingeH, palette.iron);
    // Заклёпки
    fillCircle(g, edgeX + hingeW / 2, hy + 1.5, 1, palette.ironHighlight);
    fillCircle(g, edgeX + hingeW / 2, hy + 3.5, 1, palette.ironHighlight);
  }
}

// ================================================================
// Козырёк на ажурных чугунных кронштейнах
// ================================================================
function drawCanopy(
  g: Graphics,
  centerX: number,
  y: number,
  width: number,
  wallLeft: number,
  wallRight: number,
  wallTopY: number,
  palette: Palette,
  style: string
): void {
  const halfW = width / 2;
  const x = centerX - halfW;
  const canopyH = 5;
  const bracketDrop = 16; // насколько кронштейн опускается вниз по стене

  // Кровельное покрытие козырька (металлический лист)
  fillRect(g, x, y, width, canopyH, palette.iron);
  // Фальцы на покрытии
  for (let fx = x + 2; fx < x + width - 2; fx += 6) {
    vLine(g, fx, y, y + canopyH, palette.ironHighlight, 0.6, 0.35);
  }
  // Передняя кромка (выступающая)
  fillRect(g, x - 2, y + canopyH - 2, width + 4, 3, palette.iron);
  hLine(g, x - 2, x + width + 2, y + canopyH - 2, palette.ironHighlight, 0.8, 0.5);

  // Кронштейны — 2 штуки, ближе к краям
  const bracketPositions = [x + width * 0.18, x + width * 0.82];
  for (const bx of bracketPositions) {
    // Верхнее крепление козырька
    fillRect(g, bx - 2, y - 3, 4, 3, palette.iron);

    // Основной стержень: от козырька вниз-внутрь к стене
    const bottomX = bx - 8; // уходит к стене
    const bottomY = y + canopyH + bracketDrop;
    g.moveTo(bx, y + canopyH)
      .lineTo(bottomX, bottomY)
      .stroke({ color: palette.iron, width: 2.5 });

    // Упор в стену (пятка кронштейна)
    fillRect(g, bottomX - 3, bottomY - 2, 6, 4, palette.iron);

    // Ажурный завиток снизу
    g.moveTo(bx - 2, y + canopyH + bracketDrop * 0.3)
      .quadraticCurveTo(bx + 5, y + canopyH + bracketDrop * 0.5, bx - 1, y + canopyH + bracketDrop * 0.75)
      .stroke({ color: palette.iron, width: 1.2 });

    // Второй завиток (верхний)
    g.moveTo(bx - 4, y + canopyH + bracketDrop * 0.15)
      .quadraticCurveTo(bx + 3, y + canopyH + bracketDrop * 0.3, bx - 3, y + canopyH + bracketDrop * 0.5)
      .stroke({ color: palette.iron, width: 1 });

    // Маленький цветок/розетка в точке изгиба
    fillCircle(g, bx - 3, y + canopyH + bracketDrop * 0.5, 2, palette.iron);
  }

  // Декоративная решётка по верху козырька
  if (style === 'eclectic' || style === 'neoclassical') {
    for (let rx = x + 4; rx < x + width - 4; rx += 5) {
      g.moveTo(rx, y - 1.5).lineTo(rx + 2.5, y - 4.5).lineTo(rx + 5, y - 1.5)
        .stroke({ color: palette.iron, width: 0.8 });
    }
  }
}

// ================================================================
// Ступени с площадкой
// ================================================================
function drawSteps(
  g: Graphics,
  centerX: number,
  topY: number,
  landingW: number,
  count: number,
  palette: Palette,
  rng: () => number
): void {
  const stepH = 4;
  const stepWInc = 8;

  for (let i = 0; i < count; i++) {
    const stepY = topY + i * stepH;
    const stepW = landingW + i * stepWInc;
    const stepX = centerX - stepW / 2;

    fillRect(g, stepX, stepY, stepW, stepH, darken(palette.basement, 0.08 + i * 0.04));
    strokeRect(g, stepX, stepY, stepW, stepH, darken(palette.basement, 0.25), 0.6);
  }

  // Боковые стенки
  const bottomStepW = landingW + (count - 1) * stepWInc;
  const bottomStepX = centerX - bottomStepW / 2;
  const stileW = 6;
  const stileH = count * stepH;

  // Левая стенка
  fillRect(g, bottomStepX - stileW, topY, stileW, stileH, palette.basement);
  strokeRect(g, bottomStepX - stileW, topY, stileW, stileH, darken(palette.basement, 0.3), 1);
  // Правая стенка
  fillRect(g, bottomStepX + bottomStepW, topY, stileW, stileH, palette.basement);
  strokeRect(g, bottomStepX + bottomStepW, topY, stileW, stileH, darken(palette.basement, 0.3), 1);

  // Завершение стенок (гранитный блок сверху)
  fillRect(g, bottomStepX - stileW - 1, topY - 2, stileW + 2, 2, palette.rust);
  fillRect(g, bottomStepX + bottomStepW - 1, topY - 2, stileW + 2, 2, palette.rust);
}

// ================================================================
// Настенный фонарь-бра
// ================================================================
function drawWallLantern(
  g: Graphics,
  x: number,
  y: number,
  palette: Palette,
  side: 'left' | 'right'
): void {
  const bracketW = side === 'left' ? -8 : 8;
  const bracketH = 5;
  const lanternH = 14;
  const lanternW = 6;
  const endX = x + bracketW;

  // Кронштейн от стены
  fillRect(g, Math.min(x, endX), y - 1, Math.abs(bracketW), 3, palette.iron);
  // Декоративный завиток кронштейна
  const midX = x + bracketW / 2;
  g.moveTo(x, y).quadraticCurveTo(midX, y - 4, endX, y - 1)
    .stroke({ color: palette.iron, width: 1.2 });

  // Нижняя часть фонаря (основание)
  fillPoly(
    g,
    [
      endX - lanternW / 2, y,
      endX + lanternW / 2, y,
      endX + lanternW / 2 + 1, y + 3,
      endX - lanternW / 2 - 1, y + 3,
    ],
    palette.iron
  );

  // Стеклянный колпак
  const glassY = y - lanternH;
  fillRect(g, endX - lanternW / 2, glassY, lanternW, lanternH, palette.windowGlass, 0.65);
  strokeRect(g, endX - lanternW / 2, glassY, lanternW, lanternH, palette.iron, 1.2);

  // Верхушка фонаря (конус)
  fillPoly(
    g,
    [
      endX - lanternW / 2, glassY,
      endX + lanternW / 2, glassY,
      endX, glassY - 4,
    ],
    palette.iron
  );

  // Шпиль на верхушке
  vLine(g, endX, glassY - 4, glassY - 8, palette.iron, 1);

  // Рёбра жёсткости на стекле (диагональные)
  g.moveTo(endX - lanternW / 2, glassY + lanternH * 0.3)
    .lineTo(endX + lanternW / 2, glassY + lanternH * 0.7)
    .stroke({ color: palette.iron, width: 0.6, alpha: 0.6 });
  g.moveTo(endX + lanternW / 2, glassY + lanternH * 0.3)
    .lineTo(endX - lanternW / 2, glassY + lanternH * 0.7)
    .stroke({ color: palette.iron, width: 0.6, alpha: 0.6 });

  // «Свечение» внутри
  fillRect(g, endX - lanternW / 2 + 1.5, glassY + lanternH * 0.25, lanternW - 3, lanternH * 0.5, palette.gold, 0.18);
}
