import { Graphics } from 'pixi.js';
import type { Palette } from '../types';
import { fillRect, strokeRect, hLine, vLine, fillPoly, fillCircle } from '../utils/drawPrimitives';
import { darken, lighten } from '../utils/colors';
import { mulberry32, randRange, pickRandom } from '../utils/math';

/**
 * Фабрика архитектурного декора.
 * Лепные гирлянды, маскароны, розетки, венки, антаблементы.
 */

/**
 * Лепная гирлянда (свисающая дуга с листьями).
 */
export function drawGarland(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  color: number,
  alpha = 1
): void {
  // Основная дуга
  const sag = w * 0.15;
  g.moveTo(x, y)
    .quadraticCurveTo(x + w / 2, y + sag, x + w, y)
    .stroke({ color, width: 2, alpha });

  // Листья (мелкие штрихи вдоль дуги)
  const steps = Math.floor(w / 4);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lx = x + t * w;
    const ly = y + 4 * t * (1 - t) * sag * 4 / w * w / 4; // параболическая интерполяция
    // Маленький листик
    const angle = (t - 0.5) * 0.5;
    const leafLen = 4;
    g.moveTo(lx, ly)
      .lineTo(lx + Math.cos(angle - 0.8) * leafLen, ly + Math.sin(angle - 0.8) * leafLen)
      .moveTo(lx, ly)
      .lineTo(lx + Math.cos(angle + 0.8) * leafLen, ly + Math.sin(angle + 0.8) * leafLen)
      .stroke({ color, width: 0.8, alpha: alpha * 0.7 });
  }

  // Бантик в центре
  const cx = x + w / 2;
  const cy = y + sag * 0.3;
  fillCircle(g, cx, cy, 3, color, alpha);
  // Ленты банта
  for (const side of [-1, 1]) {
    g.moveTo(cx, cy)
      .quadraticCurveTo(cx + side * 8, cy, cx + side * 12, cy + 6)
      .stroke({ color, width: 1, alpha });
  }
}

/**
 * Маскарон (львиная голова / женская маска) — стилизованно.
 */
export function drawMascaron(
  g: Graphics,
  x: number,
  y: number,
  radius: number,
  color: number
): void {
  // Внешний рельефный круг
  fillCircle(g, x, y, radius, color);
  strokeRect(g, x - radius, y - radius, radius * 2, radius * 2, darken(color, 0.3), 1.5);

  // Стилизованные черты лица
  // Глаза
  const eyeY = y - radius * 0.15;
  const eyeSpacing = radius * 0.35;
  fillCircle(g, x - eyeSpacing, eyeY, radius * 0.15, darken(color, 0.5));
  fillCircle(g, x + eyeSpacing, eyeY, radius * 0.15, darken(color, 0.5));

  // Нос
  vLine(g, x, eyeY + radius * 0.1, y + radius * 0.2, darken(color, 0.4), 1.5);

  // Рот
  g.moveTo(x - radius * 0.3, y + radius * 0.4)
    .quadraticCurveTo(x, y + radius * 0.55, x + radius * 0.3, y + radius * 0.4)
    .stroke({ color: darken(color, 0.4), width: 1 });

  // Брови
  for (const side of [-1, 1]) {
    g.moveTo(x + side * eyeSpacing - side * radius * 0.2, eyeY - radius * 0.3)
      .lineTo(x + side * eyeSpacing + side * radius * 0.2, eyeY - radius * 0.25)
      .stroke({ color: darken(color, 0.5), width: 1.2 });
  }
}

/**
 * Лепная розетка (цветок).
 */
export function drawRosette(
  g: Graphics,
  x: number,
  y: number,
  radius: number,
  color: number
): void {
  const petalCount = 8;
  fillCircle(g, x, y, radius * 0.4, darken(color, 0.15));

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const px = x + Math.cos(angle) * radius * 0.55;
    const py = y + Math.sin(angle) * radius * 0.55;
    fillCircle(g, px, py, radius * 0.3, lighten(color, 0.1), 0.6);
  }

  strokeRect(g, x - radius, y - radius, radius * 2, radius * 2, darken(color, 0.3), 1);
}

/**
 * Венчающий карниз с фризом, архитравом, модульонами и сухариками.
 */
export function drawMainCornice(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  palette: Palette,
  style: string,
  seed: number
): void {
  const rng = mulberry32(seed + 500);
  const totalH = 28;

  // Архитрав (нижняя полоса)
  fillRect(g, x, y + totalH - 8, w, 8, darken(palette.wall, 0.1));
  hLine(g, x, x + w, y + totalH - 8, darken(palette.wall, 0.25), 1.5);

  // Фриз
  const friezeY = y + totalH - 18;
  const friezeH = 10;
  fillRect(g, x, friezeY, w, friezeH, palette.wallLight);

  // Розетки по фризу
  const rosetteSpacing = w / 8;
  for (let rx = x + rosetteSpacing; rx < x + w - 10; rx += rosetteSpacing) {
    drawRosette(g, rx + rng() * 6 - 3, friezeY + friezeH / 2, 4, palette.wallLight);
  }

  // Карнизная плита с модульонами
  const modillionY = y + totalH - 20;
  const modillionH = 7;
  const modillionW = 6;
  const modillionSpacing = 14;

  for (let mx = x + 10; mx < x + w - 10; mx += modillionSpacing) {
    // Консоль модульона
    fillRect(g, mx, modillionY, modillionW, modillionH, palette.rustDark);
    // Капли (гутты)
    for (let gx = mx + 1; gx < mx + modillionW - 1; gx += 2) {
      fillCircle(g, gx, modillionY + modillionH, 1.2, darken(palette.rustDark, 0.3));
    }
  }

  // Сухарики (дентикулы)
  const dentilY = y + totalH - 28;
  const dentilH = 4;
  const dentilW = 4;
  const dentilSpacing = dentilW * 2.2;

  for (let dx = x + 8; dx < x + w - 8; dx += dentilSpacing) {
    fillRect(g, dx, dentilY, dentilW, dentilH, darken(palette.wall, 0.25));
  }

  // Верхняя выступающая плита
  fillRect(g, x - 4, y, w + 8, 4, palette.rustDark);
  hLine(g, x - 4, x + w + 4, y + 4, palette.rust, 1);
}

/**
 * Лепной венок.
 */
export function drawWreath(
  g: Graphics,
  x: number,
  y: number,
  radius: number,
  color: number
): void {
  g.circle(x, y, radius).stroke({ color, width: 2 });
  // Листочки по кругу
  const leafCount = 12;
  for (let i = 0; i < leafCount; i++) {
    const angle = (i / leafCount) * Math.PI * 2;
    const lx = x + Math.cos(angle) * radius;
    const ly = y + Math.sin(angle) * radius;
    const leafAngle = angle + 0.5;
    g.moveTo(lx, ly)
      .lineTo(lx + Math.cos(leafAngle) * 3, ly + Math.sin(leafAngle) * 3)
      .stroke({ color, width: 0.8 });
  }
  // Бант сверху
  const bowY = y - radius;
  fillCircle(g, x, bowY - 2, 3, color, 0.7);
  g.moveTo(x - 5, bowY)
    .quadraticCurveTo(x - 8, bowY - 4, x - 6, bowY - 8)
    .stroke({ color, width: 1 });
  g.moveTo(x + 5, bowY)
    .quadraticCurveTo(x + 8, bowY - 4, x + 6, bowY - 8)
    .stroke({ color, width: 1 });
}

/**
 * Водосточная труба с воронкой.
 */
export function drawDrainpipe(
  g: Graphics,
  x: number,
  topY: number,
  bottomY: number,
  palette: Palette
): void {
  const pipeW = 5;
  // Воронка (раструб сверху)
  fillPoly(
    g,
    [
      x - 3, topY,
      x - 1, topY + 8,
      x + pipeW + 1, topY + 8,
      x + pipeW + 3, topY,
    ],
    palette.iron
  );

  // Труба
  fillRect(g, x, topY + 8, pipeW, bottomY - topY - 8, palette.iron);

  // Хомуты (кольца на трубе)
  for (let cy = topY + 18; cy < bottomY; cy += 30) {
    hLine(g, x - 1, x + pipeW + 1, cy, palette.ironHighlight, 1.5);
  }

  // Отмёт (нижний изгиб)
  fillRect(g, x, bottomY - 4, pipeW + 3, 4, palette.iron);
  strokeRect(g, x, bottomY - 4, pipeW + 3, 4, palette.ironHighlight, 0.8);
}

/**
 * Анкерная связь (металлическая розетка на фасаде).
 */
export function drawAnchorPlate(
  g: Graphics,
  x: number,
  y: number,
  size: number,
  palette: Palette
): void {
  // Диск
  fillCircle(g, x, y, size, palette.iron);
  strokeRect(g, x - size, y - size, size * 2, size * 2, palette.ironHighlight, 1);

  // Буква / цифра (стилизованный «S»)
  g.moveTo(x + size * 0.4, y - size * 0.3)
    .quadraticCurveTo(x - size * 0.5, y - size * 0.5, x - size * 0.3, y)
    .quadraticCurveTo(x + size * 0.5, y + size * 0.5, x + size * 0.3, y + size * 0.4)
    .stroke({ color: palette.gold, width: 0.8 });
}
