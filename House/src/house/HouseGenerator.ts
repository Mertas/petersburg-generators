import { Container, Graphics } from 'pixi.js';
import type { HouseConfig, Palette } from '../types';
import { METER_TO_PX, DEFAULT_CONFIG } from '../types';
import { getPalette } from '../utils/colors';
import { fillRect, hLine } from '../utils/drawPrimitives';
import { mulberry32 } from '../utils/math';
import { renderFloor, type FloorConfig } from './FloorRenderer';
import { renderRoof, type RoofConfig } from './RoofRenderer';
import { drawMainCornice, drawDrainpipe, drawAnchorPlate } from './DecorFactory';
import { renderPorch } from './PorchRenderer';
import { renderGround } from './GroundRenderer';


export interface GenerateOptions {
  skipGround?: boolean;
}

/**
 * Главный генератор дома.
 * Принимает конфигурацию, возвращает Pixi.Container с полностью собранным домом.
 */
export function generateHouse(config?: Partial<HouseConfig>, options?: GenerateOptions): Container {
  const cfg: HouseConfig = { ...DEFAULT_CONFIG, ...config };
  const palette = getPalette(cfg.seed);
  const rng = mulberry32(cfg.seed);
  const houseW = cfg.widthM * METER_TO_PX;
  const axes = cfg.axes;

  // Рассчитываем межосевое расстояние и координаты оконных осей
  const axleSpacing = houseW / (axes + 1);
  const windowAxes: number[] = [];
  for (let i = 1; i <= axes; i++) {
    windowAxes.push(axleSpacing * i);
  }

  // Разбираем высоты этажей: [0] = цоколь, [1] = 1-й этаж, [2] = 2-й, ...
  const floorHeightsM = cfg.floorHeightsM;
  const totalFloors = cfg.floors + 1; // + цоколь
  while (floorHeightsM.length < totalFloors) {
    // Добавляем высоты по убывающей, если не хватает
    const lastH = floorHeightsM[floorHeightsM.length - 1] || 3.0;
    floorHeightsM.push(Math.max(2.5, lastH - 0.3));
  }

  const houseContainer = new Container();

  // --- Отрисовка этажей снизу вверх ---
  let currentY = 0; // координата Y внизу цоколя (земля)

  for (let level = 0; level < totalFloors; level++) {
    const floorHM = floorHeightsM[level];
    const floorHPx = floorHM * METER_TO_PX;
    const floorY = currentY - floorHPx;

    // Конфигурация этажа
    const floorConfig: FloorConfig = {
      level,
      widthPx: houseW,
      heightPx: floorHPx,
      windowAxes,
      windowWidth: level === 0 ? 18 : 24,
      windowHeight: level === 0
        ? floorHPx * 0.4
        : floorHPx * 0.55,
      hasBalcony: cfg.balconyFloors.includes(level),
      isPianoNobile: level === 1,
      isBasement: level === 0,
      style: 'eclectic',
      seed: cfg.seed + level * 10,
    };

    const floorContainer = new Container();
    floorContainer.y = floorY;
    renderFloor(floorContainer, floorConfig, palette);
    houseContainer.addChild(floorContainer);

    currentY = floorY;
  }

  // Венчающий карниз
  const corniceContainer = new Container();
  corniceContainer.y = currentY - 28;
  const corniceG = new Graphics();
  drawMainCornice(corniceG, 0, 0, houseW, palette, 'eclectic', cfg.seed);
  corniceContainer.addChild(corniceG);
  houseContainer.addChild(corniceContainer);
  currentY = corniceContainer.y;

  // --- Кровля ---
  const roofHPx = (cfg.roofType === 'mansard' ? 5.5 : 4.5) * METER_TO_PX;
  const roofConfig: RoofConfig = {
    widthPx: houseW,
    heightPx: roofHPx,
    type: cfg.roofType,
    dormersCount: axes >= 5 ? 3 : 2,
    chimneysCount: cfg.floors <= 3 ? 1 : 2,
    hasParapet: false,
    hasFlagpole: rng() > 0.5,
    seed: cfg.seed + 300,
  };

  const roofContainer = new Container();
  roofContainer.y = currentY - roofHPx;
  renderRoof(roofContainer, roofConfig, palette);
  houseContainer.addChild(roofContainer);

  // --- Водосточные трубы (от желоба вниз) ---
  const drainContainer = new Container();
  const drainG = new Graphics();
  const gutterY = roofContainer.y + roofHPx - 4;
  const houseBottom = 0;
  // Левая труба
  drawDrainpipe(drainG, 14, gutterY, houseBottom, palette);
  // Правая труба
  drawDrainpipe(drainG, houseW - 19, gutterY, houseBottom, palette);
  drainContainer.addChild(drainG);
  houseContainer.addChild(drainContainer);

  // --- Анкерные связи ---
  const anchorContainer = new Container();
  const anchorG = new Graphics();
  for (let level = 1; level < totalFloors; level++) {
    const floorMidY = -(floorHeightsM.slice(0, level).reduce((a, b) => a + b, 0) * METER_TO_PX
      + floorHeightsM[level] * METER_TO_PX / 2);
    // По две анкерные связи на этаж (по краям)
    drawAnchorPlate(anchorG, 10, floorMidY, 4, palette);
    drawAnchorPlate(anchorG, houseW - 10, floorMidY, 4, palette);
  }
  anchorContainer.addChild(anchorG);
  houseContainer.addChild(anchorContainer);

  // --- Парадный вход ---
  const porchContainer = new Container();
  const doorAxle = windowAxes[Math.floor(axes / 2)]; // центральная ось
  const porchConfig = {
    centerX: doorAxle,
    groundY: 0,
    doorWidth: 30,
    doorHeight: floorHeightsM[1] * METER_TO_PX * 0.75,
    style: 'eclectic' as const,
    hasTransom: true,
    hasLanterns: true,
    seed: cfg.seed + 200,
  };
  renderPorch(porchContainer, porchConfig, palette);
  houseContainer.addChild(porchContainer);

  // --- Мостовая, тротуар, поребрик ---
  if (!options?.skipGround) {
    const groundContainer = new Container();
    renderGround(groundContainer, {
      houseWidthPx: houseW,
      houseY: 0,
      seed: cfg.seed,
    }, palette);
    houseContainer.addChild(groundContainer);
  }

  return houseContainer;
}

