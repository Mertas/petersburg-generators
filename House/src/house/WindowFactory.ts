import { Graphics } from 'pixi.js';
import type { Palette } from '../types';
import { fillRect, strokeRect, hLine, vLine, fillPoly, strokePoly, fillCircle } from '../utils/drawPrimitives';
import { darken, lighten } from '../utils/colors';

/**
 * Фабрика окон доходного дома XIX века.
 *
 * Каждое окно состоит из:
 *   - наличник (профилированный, с «ушками»)
 *   - ставни (опционально)
 *   - оконный проём со стеклом и бликами
 *   - рама (внешняя + импосты + фрамуга)
 *   - подоконник-отлив
 *   - декоративная филёнка под окном (опционально)
 *   - сандрик (треугольный / лучковый / прямой) с консолями и лепниной
 *   - замковый камень (для арочных проёмов)
 *
 * Сандрик рисуется ПОВЕРХ наличника.
 */

export type WindowVariant = 'semicircular' | 'rectangular' | 'segmental';
export type SandrikType = 'none' | 'triangular' | 'segmental' | 'rectangular';

export interface WindowOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  variant: WindowVariant;
  sandrik: SandrikType;
  hasSill: boolean;
  hasShutters: boolean;
  hasApron: boolean;
  frameWidth: number;
  mullions: number;
  transom: boolean;
}

// ================================================================
// Главная функция отрисовки окна
// ================================================================
export function drawWindow(g: Graphics, opts: WindowOptions, palette: Palette): void {
  const { x, y, width: w, height: h, variant, sandrik, hasSill, hasApron, frameWidth: fw, mullions, transom, hasShutters } = opts;

  // 1. Наличник
  drawCasing(g, x, y, w, h, variant, fw, palette);

  // 2. Ставни (под наличником, по бокам)
  if (hasShutters) {
    drawShutters(g, x, y, w, h, fw, palette);
  }

  // 3. Стекло
  drawGlass(g, x, y, w, h, variant, palette);

  // 4. Рама
  drawFrame(g, x, y, w, h, variant, fw, mullions, transom, palette);

  // 5. Подоконник-отлив
  if (hasSill) {
    drawSill(g, x, y + h, w, fw, palette);
  }

  // 6. Филёнка под окном
  if (hasApron) {
    drawApron(g, x, y, w, h, fw, hasSill, palette);
  }

  // 7. Сандрик (поверх наличника)
  if (sandrik !== 'none') {
    drawSandrik(g, x, y, w, h, sandrik, palette, fw);
  }

  // 8. Замковый камень (для арочных проёмов без сандрика или вместе с ним)
  if (sandrik === 'none' && (variant === 'semicircular' || variant === 'segmental')) {
    drawKeystone(g, x, y, w, variant, palette, fw);
  }
}

// ================================================================
// Стекло
// ================================================================
function drawGlass(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  variant: WindowVariant,
  palette: Palette
): void {
  if (variant === 'semicircular') {
    const archR = w / 2;
    const archCenterY = y + archR;
    g.moveTo(x, archCenterY)
      .lineTo(x, y + h)
      .lineTo(x + w, y + h)
      .lineTo(x + w, archCenterY)
      .arc(x + w / 2, archCenterY, archR, 0, Math.PI, true)
      .closePath()
      .fill({ color: palette.windowGlass });

    // Блик — вертикальная полоса слева
    g.moveTo(x + w * 0.15, y + h * 0.1)
      .lineTo(x + w * 0.28, y + h * 0.1)
      .lineTo(x + w * 0.28, y + h * 0.7)
      .lineTo(x + w * 0.15, y + h * 0.7)
      .closePath()
      .fill({ color: palette.windowGlassHighlight, alpha: 0.2 });

    // Блик на арке (дуга)
    g.moveTo(x + w * 0.2, archCenterY - archR * 0.3)
      .lineTo(x + w * 0.3, archCenterY - archR * 0.1)
      .lineTo(x + w * 0.3, archCenterY + archR * 0.2)
      .lineTo(x + w * 0.2, archCenterY + archR * 0.1)
      .closePath()
      .fill({ color: palette.windowGlassHighlight, alpha: 0.15 });
  } else {
    fillRect(g, x, y, w, h, palette.windowGlass);

    // Два блика: левый вертикальный + диагональный
    // Левый блик
    fillRect(g, x + w * 0.08, y + h * 0.05, w * 0.12, h * 0.65, palette.windowGlassHighlight, 0.2);
    // Диагональный блик (отражение неба)
    g.moveTo(x + w * 0.5, y + h * 0.08)
      .lineTo(x + w * 0.7, y + h * 0.08)
      .lineTo(x + w * 0.55, y + h * 0.45)
      .lineTo(x + w * 0.35, y + h * 0.45)
      .closePath()
      .fill({ color: palette.windowGlassHighlight, alpha: 0.14 });
  }
}

// ================================================================
// Рама: внешняя + импосты + фрамуга
// ================================================================
function drawFrame(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  variant: WindowVariant,
  fw: number,
  mullions: number,
  transom: boolean,
  palette: Palette
): void {
  const frameColor = palette.windowFrame;

  if (variant === 'semicircular') {
    const archR = w / 2;
    const archCenterY = y + archR;
    g.moveTo(x, archCenterY)
      .lineTo(x, y + h)
      .lineTo(x + w, y + h)
      .lineTo(x + w, archCenterY)
      .arc(x + w / 2, archCenterY, archR, 0, Math.PI, true)
      .closePath()
      .stroke({ color: frameColor, width: fw });
  } else if (variant === 'segmental') {
    // Лучковое: верх — пологая дуга
    const archH = h * 0.12;
    const cpx = x + w / 2;
    const cpy = y - archH;
    g.moveTo(x, y + archH * 0.6)
      .quadraticCurveTo(cpx, cpy, x + w, y + archH * 0.6)
      .lineTo(x + w, y + h)
      .lineTo(x, y + h)
      .closePath()
      .stroke({ color: frameColor, width: fw });
  } else {
    strokeRect(g, x, y, w, h, frameColor, fw);
  }

  // Вертикальные импосты
  if (mullions > 0) {
    const cellW = w / (mullions + 1);
    for (let i = 1; i <= mullions; i++) {
      const mx = x + i * cellW;
      if (variant === 'semicircular') {
        // Импост только в прямоугольной части
        const archCenterY = y + w / 2;
        vLine(g, mx, archCenterY, y + h, frameColor, fw * 0.6);
      } else {
        vLine(g, mx, y + 1, y + h - 1, frameColor, fw * 0.6);
      }
    }
  }

  // Горизонтальный импост (фрамуга)
  if (transom) {
    const transomY = y + h * 0.22;
    hLine(g, x + 1, x + w - 1, transomY, frameColor, fw * 0.6);
  }
}

// ================================================================
// Наличник с «ушками»
// ================================================================
function drawCasing(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  variant: WindowVariant,
  fw: number,
  palette: Palette
): void {
  const casingColor = lighten(palette.wall, 0.08);
  const casingW = fw * 1.6;
  const earW = casingW * 1.8;
  const earH = fw * 1.5;

  const left = x - casingW;
  const right = x + w + casingW;
  const top = y;
  const bottom = y + h;

  // Вертикальные тяги наличника
  fillRect(g, left, top - earH, casingW, h + earH * 2, casingColor);
  fillRect(g, right - casingW, top - earH, casingW, h + earH * 2, casingColor);

  // Верхняя тяга
  fillRect(g, left - (earW - casingW), top - casingW, w + earW * 2, casingW, casingColor);

  // «Ушки» — выступы сверху и снизу
  fillRect(g, left - (earW - casingW), top - earH - casingW, earW, earH, casingColor);
  fillRect(g, right - casingW, top - earH - casingW, earW, earH, casingColor);
  fillRect(g, left - (earW - casingW), bottom, earW, earH, casingColor);
  fillRect(g, right - casingW, bottom, earW, earH, casingColor);

  // Обводка наличника
  const strokeCol = darken(palette.wall, 0.18);
  // Левый контур
  strokeRect(g, left, top - earH, casingW, h + earH * 2, strokeCol, 0.8);
  // Правый контур
  strokeRect(g, right - casingW, top - earH, casingW, h + earH * 2, strokeCol, 0.8);

  // Профилировка (параллельная линия внутри)
  hLine(g, left - (earW - casingW), right + (earW - casingW), top - casingW, strokeCol, 0.6);
}

// ================================================================
// Ставни
// ================================================================
function drawShutters(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  fw: number,
  palette: Palette
): void {
  const shutterW = w * 0.38;
  const shutterColor = darken(palette.wall, 0.2);
  const inset = fw * 2.5;

  // Левая ставня
  const sl = x - shutterW + inset;
  fillRect(g, sl, y + 2, shutterW, h - 4, shutterColor);
  strokeRect(g, sl, y + 2, shutterW, h - 4, darken(shutterColor, 0.2), 1.2);
  // Горизонтальные планки
  for (let py = y + 8; py < y + h - 8; py += 7) {
    hLine(g, sl + 2, sl + shutterW - 2, py, darken(shutterColor, 0.15), 0.8);
  }
  // Вертикальная центральная планка
  vLine(g, sl + shutterW / 2, y + 3, y + h - 3, darken(shutterColor, 0.2), 1);

  // Правая ставня
  const sr = x + w - inset;
  fillRect(g, sr, y + 2, shutterW, h - 4, shutterColor);
  strokeRect(g, sr, y + 2, shutterW, h - 4, darken(shutterColor, 0.2), 1.2);
  for (let py = y + 8; py < y + h - 8; py += 7) {
    hLine(g, sr + 2, sr + shutterW - 2, py, darken(shutterColor, 0.15), 0.8);
  }
  vLine(g, sr + shutterW / 2, y + 3, y + h - 3, darken(shutterColor, 0.2), 1);

  // Петли ставень
  for (const sy of [y + h * 0.2, y + h * 0.5, y + h * 0.8]) {
    fillRect(g, x - 3, sy, 3, 2, palette.iron);
    fillRect(g, x + w, sy, 3, 2, palette.iron);
  }
}

// ================================================================
// Подоконник-отлив
// ================================================================
function drawSill(
  g: Graphics,
  x: number, sillY: number, w: number,
  fw: number,
  palette: Palette
): void {
  const extension = fw * 2.5;
  const sillH = fw * 2;
  const left = x - extension;
  const right = x + w + extension;

  // Основная плита
  fillRect(g, left, sillY, right - left, sillH, darken(palette.wall, 0.18));
  // Скат (верхняя грань)
  fillRect(g, left + 1, sillY, right - left - 2, 2, palette.wallLight);
  // Металлический отлив (жестяной)
  fillRect(g, x - fw, sillY + sillH - 2, w + fw * 2, 2, palette.ironHighlight);
  // Капли (выступы снизу)
  for (let dx = left + 6; dx < right - 4; dx += 8) {
    fillCircle(g, dx, sillY + sillH + 1, 1.5, palette.ironHighlight, 0.5);
  }
}

// ================================================================
// Филёнка под окном
// ================================================================
function drawApron(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  fw: number,
  hasSill: boolean,
  palette: Palette
): void {
  const apronY = y + h + (hasSill ? fw * 2 : 0) + 2;
  const apronH = h * 0.18;
  const margin = fw;

  fillRect(g, x + margin, apronY, w - margin * 2, apronH, darken(palette.wall, 0.06));
  strokeRect(g, x + margin, apronY, w - margin * 2, apronH, darken(palette.wall, 0.15), 1);

  // Розетка в центре
  const cx = x + w / 2;
  const cy = apronY + apronH / 2;
  const rr = Math.min(apronH * 0.3, 5);
  fillCircle(g, cx, cy, rr, palette.wallLight, 0.5);
  fillCircle(g, cx, cy, rr * 0.5, lighten(palette.wall, 0.1), 0.6);

  // Маленькие лепестки вокруг розетки
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(angle) * rr * 1.4;
    const py = cy + Math.sin(angle) * rr * 1.4;
    fillCircle(g, px, py, rr * 0.25, palette.wallLight, 0.4);
  }
}

// ================================================================
// Сандрик
// ================================================================
function drawSandrik(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  type: SandrikType,
  palette: Palette,
  fw: number
): void {
  const sandrikH = fw * 5;
  const sandrikY = y - fw * 3 - sandrikH; // верх сандрика
  const extension = fw * 4;
  const x1 = x - extension;
  const x2 = x + w + extension;
  const shelfY = sandrikY + sandrikH - fw; // полочка

  // Полочка
  fillRect(g, x1, shelfY, x2 - x1, fw * 1.3, darken(palette.wall, 0.2));
  hLine(g, x1, x2, shelfY, darken(palette.wall, 0.35), 1.2);

  // Тело сандрика
  switch (type) {
    case 'triangular': {
      const peakY = sandrikY + fw * 0.5;
      // Фронтон
      fillPoly(
        g,
        [x1, shelfY, x + w / 2, peakY, x2, shelfY],
        darken(palette.wall, 0.08)
      );
      strokePoly(
        g,
        [x1, shelfY, x + w / 2, peakY, x2, shelfY],
        darken(palette.wall, 0.3),
        1.2
      );
      // Тимпана (круглое окошко в центре фронтона)
      const timpR = w * 0.08;
      const timpCy = peakY + (shelfY - peakY) * 0.55;
      fillCircle(g, x + w / 2, timpCy, timpR, palette.wallLight, 0.3);
      strokeRect(g, x + w / 2 - timpR, timpCy - timpR, timpR * 2, timpR * 2, darken(palette.wall, 0.25), 0.8);
      // Маленькая розетка в тимпане
      fillCircle(g, x + w / 2, timpCy, timpR * 0.4, palette.wallLight, 0.5);
      break;
    }
    case 'segmental': {
      const archH = sandrikH * 0.55;
      g.moveTo(x1, shelfY)
        .quadraticCurveTo(x + w / 2, sandrikY - archH * 0.2, x2, shelfY)
        .lineTo(x2, shelfY + fw)
        .quadraticCurveTo(x + w / 2, sandrikY - archH * 0.2 + fw, x1, shelfY + fw)
        .closePath()
        .fill({ color: darken(palette.wall, 0.08) });
      // Замковый камень
      const ksW = fw * 2.5;
      const ksH = fw * 3;
      const ksx = x + w / 2 - ksW / 2;
      const ksy = sandrikY - archH * 0.3 - ksH + 4;
      fillRect(g, ksx, ksy, ksW, ksH, palette.rustDark);
      fillPoly(
        g,
        [ksx, ksy, ksx - 1.5, ksy + ksH, ksx + ksW + 1.5, ksy + ksH, ksx + ksW, ksy],
        darken(palette.rustDark, 0.1)
      );
      break;
    }
    case 'rectangular': {
      fillRect(g, x1, sandrikY, x2 - x1, sandrikH - fw, darken(palette.wall, 0.08));
      // Сухарики под полочкой
      const dentilW = 3;
      const dentilH = fw * 1.2;
      for (let dx = x1 + 4; dx < x2 - 4; dx += dentilW * 2.2) {
        fillRect(g, dx, shelfY - dentilH, dentilW, dentilH, darken(palette.wall, 0.25));
      }
      break;
    }
  }

  // Консоли (волюты) по бокам
  drawSandrikConsole(g, x1, sandrikY, fw, sandrikH, palette);
  drawSandrikConsole(g, x2 - fw * 2, sandrikY, fw, sandrikH, palette);
}

/**
 * Консоль сандрика с волютой.
 */
function drawSandrikConsole(
  g: Graphics,
  cx: number, cy: number, fw: number, consoleH: number,
  palette: Palette
): void {
  const consoleW = fw * 2.5;
  fillRect(g, cx, cy, consoleW, consoleH, palette.rustDark);
  // Вертикальный желобок
  vLine(g, cx + consoleW / 2, cy + 4, cy + consoleH - 4, darken(palette.rustDark, 0.3), 0.8);
  // Волюта снизу
  const voluteR = fw * 1.3;
  const voluteCY = cy + consoleH;
  const voluteCX = cx + consoleW / 2;
  g.moveTo(cx + 1, cy + consoleH - 2)
    .quadraticCurveTo(voluteCX - voluteR, voluteCY + voluteR * 0.8, voluteCX, voluteCY + voluteR * 0.3)
    .stroke({ color: palette.rustDark, width: 1.2 });
}

/**
 * Замковый камень для арочных окон без сандрика.
 */
function drawKeystone(
  g: Graphics,
  x: number, y: number, w: number,
  variant: WindowVariant,
  palette: Palette,
  fw: number
): void {
  const ksW = fw * 3;
  const ksH = fw * 3.5;
  const ksx = x + w / 2 - ksW / 2;
  const ksy = y - ksH + 2;

  fillRect(g, ksx, ksy, ksW, ksH, palette.rustDark);
  // Скошенные грани
  fillPoly(
    g,
    [ksx, ksy, ksx - 2, ksy + ksH, ksx + ksW + 2, ksy + ksH, ksx + ksW, ksy],
    darken(palette.rustDark, 0.1)
  );
  // Горизонтальная насечка
  hLine(g, ksx + 1, ksx + ksW - 1, ksy + ksH * 0.4, darken(palette.rustDark, 0.3), 0.8);
}

// ================================================================
// Витринное окно (магазин на первом этаже)
// ================================================================
export function drawShopWindow(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  palette: Palette
): void {
  const pillarW = 6;
  const baseH = 10;

  // Цоколь витрины
  fillRect(g, x - 2, y + h - baseH, w + 4, baseH, palette.rustDark);
  strokeRect(g, x - 2, y + h - baseH, w + 4, baseH, darken(palette.rustDark, 0.3), 1);

  // Стекло
  fillRect(g, x, y, w, h - baseH, palette.windowGlass);

  // Боковые чугунные столбы
  fillRect(g, x, y, pillarW, h - baseH, palette.iron);
  fillRect(g, x + w - pillarW, y, pillarW, h - baseH, palette.iron);

  // Промежуточные импосты (если витрина широкая)
  if (w > 40) {
    const mid = x + w / 2;
    fillRect(g, mid - 2, y, 4, h - baseH, palette.iron);
  }

  // Рама
  strokeRect(g, x, y, w, h - baseH, palette.iron, 2.5);

  // Фрамуга (горизонтальный импост)
  hLine(g, x, x + w, y + (h - baseH) * 0.3, palette.iron, 2);

  // Блик на стекле
  fillRect(g, x + w * 0.1, y + (h - baseH) * 0.05, w * 0.1, h * 0.5, palette.windowGlassHighlight, 0.2);

  // Вывеска над витриной (доска)
  const signH = 12;
  const signY = y - signH - 4;
  fillRect(g, x - pillarW, signY, w + pillarW * 2, signH, darken(palette.wall, 0.2));
  strokeRect(g, x - pillarW, signY, w + pillarW * 2, signH, palette.gold, 1.5);
  // Текст вывески (стилизованные горизонтальные линии)
  hLine(g, x + 4, x + w - 4, signY + signH * 0.4, palette.gold, 0.8, 0.6);
  hLine(g, x + 8, x + w - 8, signY + signH * 0.65, palette.gold, 0.8, 0.4);
}

// ================================================================
// Слуховое окно (дормер) для кровли
// ================================================================
export function drawDormer(
  g: Graphics,
  x: number, y: number, w: number, h: number,
  palette: Palette
): void {
  const roofH = h * 0.45;

  // Боковые стенки
  fillRect(g, x + 2, y + roofH, w - 4, h - roofH, palette.wall);
  strokeRect(g, x + 2, y + roofH, w - 4, h - roofH, darken(palette.wall, 0.2), 1);

  // Треугольный фронтон
  fillPoly(
    g,
    [x - 1, y + roofH, x + w / 2, y - 2, x + w + 1, y + roofH],
    palette.wall
  );
  strokePoly(
    g,
    [x - 1, y + roofH, x + w / 2, y - 2, x + w + 1, y + roofH],
    darken(palette.wall, 0.25),
    1.2
  );

  // Кровля над дормером
  fillPoly(
    g,
    [x - 3, y + roofH, x + w / 2, y - 4, x + w + 3, y + roofH],
    palette.roof
  );
  strokePoly(
    g,
    [x - 3, y + roofH, x + w / 2, y - 4, x + w + 3, y + roofH],
    palette.iron,
    1
  );

  // Окно
  const windowW = w * 0.45;
  const windowH = (h - roofH) * 0.55;
  const wx = x + (w - windowW) / 2;
  const wy = y + roofH + (h - roofH - windowH) / 2;

  fillRect(g, wx, wy, windowW, windowH, palette.windowGlass);
  strokeRect(g, wx, wy, windowW, windowH, palette.windowFrame, 1.5);

  // Вертикальный импост
  vLine(g, wx + windowW / 2, wy, wy + windowH, palette.windowFrame, 1);

  // Крошечный наличник
  strokeRect(g, wx - 2, wy - 2, windowW + 4, windowH + 4, darken(palette.wall, 0.2), 1);

  // Круглое окошко во фронтоне
  const oculusR = w * 0.1;
  const oculusY = y + roofH * 0.6;
  fillCircle(g, x + w / 2, oculusY, oculusR, palette.windowGlass);
  strokeRect(g, x + w / 2 - oculusR, oculusY - oculusR, oculusR * 2, oculusR * 2, palette.windowFrame, 1);
}
