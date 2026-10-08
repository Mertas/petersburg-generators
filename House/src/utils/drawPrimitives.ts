import { Graphics } from 'pixi.js';

/**
 * Залитый прямоугольник с опциональной обводкой.
 */
export function fillRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  alpha = 1
): void {
  g.rect(x, y, w, h).fill({ color, alpha });
}

/**
 * Прямоугольник с обводкой.
 */
export function strokeRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  lineWidth = 1,
  alpha = 1
): void {
  g.rect(x, y, w, h).stroke({ color, width: lineWidth, alpha });
}

/**
 * Горизонтальная линия.
 */
export function hLine(
  g: Graphics,
  x1: number,
  x2: number,
  y: number,
  color: number,
  lineWidth = 1,
  alpha = 1
): void {
  g.moveTo(x1, y).lineTo(x2, y).stroke({ color, width: lineWidth, alpha });
}

/**
 * Вертикальная линия.
 */
export function vLine(
  g: Graphics,
  x: number,
  y1: number,
  y2: number,
  color: number,
  lineWidth = 1,
  alpha = 1
): void {
  g.moveTo(x, y1).lineTo(x, y2).stroke({ color, width: lineWidth, alpha });
}

/**
 * Полигон с заливкой.
 */
export function fillPoly(
  g: Graphics,
  points: number[],
  color: number,
  alpha = 1
): void {
  g.poly(points).fill({ color, alpha });
}

/**
 * Полигон с обводкой.
 */
export function strokePoly(
  g: Graphics,
  points: number[],
  color: number,
  lineWidth = 1,
  alpha = 1
): void {
  g.poly(points).stroke({ color, width: lineWidth, alpha });
}

/**
 * Окружность с заливкой.
 */
export function fillCircle(
  g: Graphics,
  cx: number,
  cy: number,
  r: number,
  color: number,
  alpha = 1
): void {
  g.circle(cx, cy, r).fill({ color, alpha });
}

/**
 * Рустовка — имитация каменной кладки горизонтальными и вертикальными линиями.
 */
export function drawRustication(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  rows: number,
  cols: number,
  lineColor: number,
  lineWidth = 1
): void {
  const rowH = h / rows;
  // Горизонтальные линии
  for (let i = 0; i <= rows; i++) {
    const yy = y + i * rowH;
    if (i > 0 && i < rows) {
      hLine(g, x, x + w, yy, lineColor, lineWidth, 0.3);
    }
  }
  // Вертикальные линии со смещением (кирпичная перевязка)
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : w / cols / 2;
    for (let col = 0; col <= cols; col++) {
      const xx = x + offset + col * (w / cols);
      if (xx > x && xx < x + w) {
        vLine(g, xx, y + row * rowH, y + (row + 1) * rowH, lineColor, lineWidth, 0.3);
      }
    }
  }
}

/**
 * Бриллиантовый руст по углам — ромбовидные вставки.
 */
export function drawDiamondRust(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  rows: number,
  color: number,
  lineColor: number
): void {
  const rowH = h / rows;
  for (let row = 0; row < rows; row++) {
    const yy = y + row * rowH;
    const diamondW = rowH * 0.7;
    const cx = x + w - diamondW / 2;
    const cy = yy + rowH / 2;
    fillPoly(
      g,
      [
        cx, cy - diamondW / 2,
        cx + diamondW / 2, cy,
        cx, cy + diamondW / 2,
        cx - diamondW / 2, cy,
      ],
      color,
      0.4
    );
    strokePoly(
      g,
      [
        cx, cy - diamondW / 2,
        cx + diamondW / 2, cy,
        cx, cy + diamondW / 2,
        cx - diamondW / 2, cy,
      ],
      lineColor,
      0.5
    );
  }
}
