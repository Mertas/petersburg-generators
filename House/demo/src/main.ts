import { Application, Container, Graphics } from 'pixi.js';
import { generateHouse, renderGround, getPalette, METER_TO_PX } from 'house';
import type { HouseConfig, RoofType, Palette } from 'house';

const GRID_ROWS = 10;
const GRID_COLS = 10;
const ALLEY_WIDTH = 80;
const CURB = 7;
const SIDEWALK = 22;
const GROUND_TOP = CURB + SIDEWALK; // 29 — поребрик + тротуар над дорогой
const ALLEY_AFTER = [3, 7];
const ALLEY_PAD = 60;             // полоса светлого булыжника
const MIN_RH = 40;                // минимальная высота дороги

// Не-дорожная часть блока (зазор + верхний тротуар + нижний тротуар + булыжник)
const ALLEY_FIXED = CURB + SIDEWALK + SIDEWALK + ALLEY_PAD; // 7+22+22+60 = 111

const ROOF_TYPES: RoofType[] = ['hipped', 'gable', 'mansard'];

// ============================================================
// Навигация
// ============================================================

let navScale = 1;
let navOffsetX = 0;
let navOffsetY = 0;
const MIN_SCALE = 0.08;
const MAX_SCALE = 3;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;

function setupNavigation(app: Application, world: Container): void {
  const canvas = app.canvas;

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - navOffsetX) / navScale;
    const worldY = (mouseY - navOffsetY) / navScale;
    const zoomFactor = 1.08;
    const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
    navScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, navScale * delta));
    navOffsetX = mouseX - worldX * navScale;
    navOffsetY = mouseY - worldY * navScale;
    applyTransform(world);
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartOffsetX = navOffsetX;
    dragStartOffsetY = navOffsetY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return;
    navOffsetX = dragStartOffsetX + (e.clientX - dragStartX);
    navOffsetY = dragStartOffsetY + (e.clientY - dragStartY);
    applyTransform(world);
  });

  const endDrag = () => { isDragging = false; canvas.style.cursor = 'grab'; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  canvas.style.cursor = 'grab';

  document.addEventListener('keydown', (e) => {
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      navScale = 1;
      navOffsetX = 0;
      navOffsetY = 0;
      applyTransform(world);
    }
  });
}

function applyTransform(world: Container): void {
  world.scale.set(navScale);
  world.x = navOffsetX;
  world.y = navOffsetY;
}

// ============================================================
// Утилиты
// ============================================================

function isAlley(col: number): boolean { return ALLEY_AFTER.includes(col); }

function colWidth(col: number): number { return 15 + ((col * 7 + 3) % 11); }

function makeConfig(row: number, col: number, wM: number): HouseConfig {
  const seed = row * GRID_COLS + col + 1;
  const floors = 3 + (seed % 3);
  const fl: number[] = [2.5];
  if (floors === 3) fl.push(3.8, 3.4, 3.0);
  else if (floors === 4) fl.push(4.0, 3.6, 3.2, 2.9);
  else fl.push(4.2, 3.8, 3.4, 3.1, 2.8);
  return {
    style: 'eclectic', floors, axes: wM > 20 ? 7 : 5, widthM: wM,
    floorHeightsM: fl, roofType: ROOF_TYPES[seed % ROOF_TYPES.length],
    seed, balconyFloors: floors >= 4 ? [2] : floors >= 3 ? [2] : [],
    hasAttic: false,
  };
}

function seeded(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function dark(c: number, f: number): number {
  const r = Math.max(0, ((c >> 16) & 0xff) * (1 - f)) | 0;
  const g = Math.max(0, ((c >> 8) & 0xff) * (1 - f)) | 0;
  const b = Math.max(0, (c & 0xff) * (1 - f)) | 0;
  return (r << 16) | (g << 8) | b;
}

function lit(c: number, f: number): number {
  const r = Math.min(255, ((c >> 16) & 0xff) + ((255 - ((c >> 16) & 0xff)) * f)) | 0;
  const g = Math.min(255, ((c >> 8) & 0xff) + ((255 - ((c >> 8) & 0xff)) * f)) | 0;
  const b = Math.min(255, (c & 0xff) + ((255 - (c & 0xff)) * f)) | 0;
  return (r << 16) | (g << 8) | b;
}

function drawAlleyStones(g: Graphics, x: number, w: number, y0: number, y1: number, rng: () => number, baseClr: number): void {
  const avgR = 4;
  const sp = avgR * 2.2;
  let rr = 0;
  for (let cy = y0 + avgR; cy < y1 - avgR; cy += sp * 0.87) {
    const off = rr % 2 === 0 ? 0 : sp / 2;
    for (let cx = x + off + avgR; cx < x + w - avgR; cx += sp) {
      const rx = avgR * (0.7 + rng() * 0.6);
      const ry = avgR * (0.7 + rng() * 0.6);
      const sx = cx + (rng() - 0.5) * sp * 0.3;
      const sy = cy + (rng() - 0.5) * sp * 0.3;

      g.circle(sx + 0.8, sy + 0.8, Math.max(rx, ry) + 0.8);
      g.fill({ color: dark(baseClr, 0.35), alpha: 0.35 });

      const sc = lit(baseClr, rng() * 0.12 - 0.04);
      const sr = (rx + ry) / 2;
      g.circle(sx, sy, sr);
      g.fill({ color: sc });

      g.circle(sx - 0.6, sy - 0.6, sr * 0.5);
      g.fill({ color: lit(sc, 0.08), alpha: 0.45 });

      g.circle(sx, sy, sr);
      g.stroke({ color: dark(sc, 0.15), width: 0.5, alpha: 0.35 });
    }
    rr++;
  }
}

// ============================================================
// Главная
// ============================================================

async function main(): Promise<void> {
  const app = new Application();
  await app.init({
    width: window.innerWidth, height: window.innerHeight,
    backgroundAlpha: 0, antialias: true,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
  });

  const c = document.getElementById('canvas-container');
  if (c) c.appendChild(app.canvas);
  else document.body.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);
  setupNavigation(app, world);

  // Фон
  const bg = new Graphics();
  const H = 30000;
  bg.rect(-H, -H, window.innerWidth + H * 2, window.innerHeight + H * 2);
  bg.fill({ color: 0xc5d0d9 });
  bg.rect(-H, -H, window.innerWidth + H * 2, window.innerHeight * 0.3 + H);
  bg.fill({ color: 0xb0bec5, alpha: 0.5 });
  world.addChild(bg);

  const pal: Palette = getPalette(42);

  // Ширины колонок
  const colWpx: number[] = [];
  for (let col = 0; col < GRID_COLS; col++) colWpx.push(isAlley(col) ? ALLEY_WIDTH : colWidth(col) * METER_TO_PX);
  const colX: number[] = [];
  let cxr = 0;
  for (let i = 0; i < GRID_COLS; i++) { colX.push(cxr); cxr += colWpx[i]; }
  const totalW = cxr;

  // Генерируем дома + высоты рядов
  const allHouses: (Container | null)[][] = [];
  const rowHeights: number[] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    const rowH: (Container | null)[] = [];
    let maxH = 0;
    for (let col = 0; col < GRID_COLS; col++) {
      // Первый ряд — без переулков, заполняем домами все колонки
      if (isAlley(col) && row > 0) { rowH.push(null); continue; }
      const wM = colWidth(col);
      const house = generateHouse(makeConfig(row, col, wM), { skipGround: true });
      rowH.push(house);
      maxH = Math.max(maxH, house.getLocalBounds().height);
    }
    allHouses.push(rowH);
    rowHeights.push(maxH || 500);
  }

  // Интервалы: минимум ALLEY_FIXED + MIN_RH, и ≥ высоты домов
  const spacing: number[] = [];
  for (let row = 0; row < GRID_ROWS; row++) spacing.push(Math.max(ALLEY_FIXED + MIN_RH, rowHeights[row]));

  // Y-позиции рядов
  const baseY: number[] = [];
  let yc = 0;
  for (let row = 0; row < GRID_ROWS; row++) { baseY.push(yc); yc += spacing[row]; }

  // ==========================================
  // Фаза 1: Дороги (renderGround)
  // ==========================================

  for (let row = 0; row < GRID_ROWS; row++) {
    const roadH = spacing[row] - GROUND_TOP; // дорога на всю высоту пролёта
    const gc = new Container();
    renderGround(gc, { houseWidthPx: totalW, houseY: baseY[row], seed: row * 113 + 500, roadHeight: roadH }, pal);
    world.addChild(gc);
  }

  // ==========================================
  // Фаза 2: Переулки поверх дорог (сегментированные)
  // ==========================================

  const alleyBase = lit(pal.roadway, 0.22);

  {
    const alleyG = new Graphics();

    for (const ac of ALLEY_AFTER) {
      const ax = colX[ac];
      const aw = colX[ac + 1] ? colX[ac + 1] - ax : ALLEY_WIDTH;

      for (let row = 0; row < GRID_ROWS; row++) {
        const by = baseY[row];
        const sp = spacing[row];
        const cc = lit(pal.curb, 0.15);
        const sc = lit(pal.sidewalk, 0.12);

        // --- Прозрачный зазор 7px (виден поребрик основной дороги) ---
        // Только уголки-въезды и вертикальные линии поребрика

        // Левый уголок
        alleyG.moveTo(ax, by).lineTo(ax + 10, by).lineTo(ax, by + CURB).closePath();
        alleyG.fill({ color: cc });
        // Правый уголок
        alleyG.moveTo(ax + aw, by).lineTo(ax + aw - 10, by).lineTo(ax + aw, by + CURB).closePath();
        alleyG.fill({ color: cc });

        // --- Верхний тротуар (22px) ---
        const upperSwY = by + CURB;
        alleyG.rect(ax + 2, upperSwY, aw - 4, SIDEWALK);
        alleyG.fill({ color: sc });
        // Вертикальный поребрик вдоль верхнего тротуара
        alleyG.rect(ax, upperSwY, 2, SIDEWALK);
        alleyG.fill({ color: cc });
        alleyG.rect(ax + aw - 2, upperSwY, 2, SIDEWALK);
        alleyG.fill({ color: cc });

        // --- Мостовая: прозрачно (renderGround виден) ---

        // --- Нижний тротуар (22px) в рамках мостовой ---
        const lowerSwY = by + sp - ALLEY_PAD - SIDEWALK;
        alleyG.rect(ax + 2, lowerSwY, aw - 4, SIDEWALK);
        alleyG.fill({ color: sc });
        // Вертикальный поребрик вдоль нижнего тротуара
        alleyG.rect(ax, lowerSwY, 2, SIDEWALK);
        alleyG.fill({ color: cc });
        alleyG.rect(ax + aw - 2, lowerSwY, 2, SIDEWALK);
        alleyG.fill({ color: cc });

        // --- Светлый булыжник (ALLEY_PAD) ---
        const padY = by + sp - ALLEY_PAD;
        alleyG.rect(ax + 2, padY, aw - 4, ALLEY_PAD);
        alleyG.fill({ color: lit(alleyBase, 0.12) });
        drawAlleyStones(alleyG, ax + 2, aw - 4, padY, padY + ALLEY_PAD,
          seeded(ac * 1000 + row * 77 + 999), lit(alleyBase, 0.12));
      }
    }

    world.addChild(alleyG);
  }

  // ==========================================
  // Дома: дальние → ближние
  // ==========================================
  for (let row = GRID_ROWS - 1; row >= 0; row--) {
    for (let col = 0; col < GRID_COLS; col++) {
      const house = allHouses[row][col];
      if (!house) continue;
      house.x = colX[col];
      house.y = baseY[row];
      world.addChild(house);
    }
  }

  // Начальный вид
  const totalH = yc + spacing[GRID_ROWS - 1];
  navScale = 0.14;
  navOffsetX = window.innerWidth / 2 - (totalW * navScale) / 2;
  navOffsetY = window.innerHeight / 2 - (totalH * navScale) / 2;
  applyTransform(world);

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
  });
}

main().catch(console.error);
