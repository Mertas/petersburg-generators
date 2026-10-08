import { Container, Graphics } from 'pixi.js';
import {
  CityGeneratorConfig,
  Palette,
  BuildingData,
  RoofType,
  DecorationType,
} from '../types';
import { createSeededRandom, randFloat, randInt, randItem, chance } from '../utils/random';
import { hexToNumber, darkenColor, lightenColor } from '../utils/colors';

export class BuildingGenerator {
  private config: CityGeneratorConfig;
  private palette: Palette;
  private rng: () => number;

  constructor(config: CityGeneratorConfig, palette: Palette, seed: number) {
    this.config = config;
    this.palette = palette;
    this.rng = createSeededRandom(seed + 3000);
  }

  generate(): Container {
    const container = new Container();
    container.label = 'buildings';
    const { width, height, density } = this.config;
    const buildings = this.planBuildings(width, height, density);

    for (const bld of buildings) {
      this.drawFacade(container, bld, height);
      this.drawRoof(container, bld, height);
      this.drawWindows(container, bld, height);
      if (bld.hasColumns) this.drawColumns(container, bld, height);
      if (bld.hasErker) this.drawErker(container, bld, height);
      if (bld.hasBalcony) this.drawBalconies(container, bld, height);
      if (bld.hasDome) this.drawDome(container, bld, height);
      if (bld.hasSpire) this.drawSpire(container, bld, height);
      for (const deco of bld.decorations) {
        this.drawDecoration(container, bld, deco, height);
      }
      this.applyOutline(container, bld, height);
    }

    // Бесшовность
    this.wrapBuildings(container, buildings, width);

    return container;
  }

  private planBuildings(tileWidth: number, canvasHeight: number, density: number): BuildingData[] {
    const buildings: BuildingData[] = [];
    const N = Math.max(2, Math.floor(4 + density * 2.5));
    const gapWidth = Math.max(8, 60 / density);

    // Разбиваем ширину на N участков со случайной шириной
    const totalGap = gapWidth * (N + 1);
    const available = tileWidth - totalGap;
    const widths: number[] = [];
    for (let i = 0; i < N; i++) {
      widths.push(randFloat(this.rng, 80, Math.max(120, Math.min(400, available / N * 1.5))));
    }
    const sumW = widths.reduce((a, b) => a + b, 0);
    const scale = available / sumW;
    for (let i = 0; i < N; i++) {
      widths[i] = Math.round(widths[i] * scale);
    }

    let currentX = gapWidth;
    const usedColors: string[] = [];

    for (let i = 0; i < N; i++) {
      const w = widths[i];
      const minHeight = canvasHeight * 0.35;
      const maxHeight = canvasHeight * 0.75;
      const baseHeight = randFloat(this.rng, minHeight, maxHeight);

      // Выбор цвета, не совпадающего с предыдущим
      let color: string;
      do {
        color = randItem(this.rng, this.palette.buildingBaseColors);
      } while (usedColors[usedColors.length - 1] === color && this.palette.buildingBaseColors.length > 1);
      usedColors.push(color);

      const roofType = this.selectRoofType();
      const roofHeight = baseHeight * randFloat(this.rng, 0.08, 0.35);
      const roofColor = randItem(this.rng, this.palette.roofColors);

      const windowRows = Math.max(2, Math.floor(baseHeight / (50 - Math.min(density, 30))));
      const windowsPerRow = Math.max(1, Math.floor(w / (70 - Math.min(density * 0.5, 50))));

      const hasColumns = w > 180 && chance(this.rng, Math.min(0.8, density / 8));
      const hasErker = w > 140 && chance(this.rng, Math.min(0.7, density / 15));
      const hasBalcony = density > 3 && chance(this.rng, Math.min(0.6, density / 10));
      const hasDome = w > 170 && chance(this.rng, Math.min(0.6, Math.max(0.05, density / 25)));
      const hasSpire = !hasDome && density > 4 && chance(this.rng, Math.min(0.5, Math.max(0, (density - 2) / 20)));

      const decorations: DecorationType[] = [];
      const corniceCount = Math.max(1, Math.floor(windowRows / 2) + Math.floor(density / 3));
      for (let c = 0; c < corniceCount; c++) {
        decorations.push(DecorationType.CORNICE);
      }
      if (density > 5 && chance(this.rng, 0.3)) decorations.push(DecorationType.ARCH);
      if (density > 7 && chance(this.rng, 0.25)) decorations.push(DecorationType.PILASTER);
      if (density > 10 && chance(this.rng, 0.15)) decorations.push(DecorationType.RUSTICATION);

      buildings.push({
        x: currentX,
        width: w,
        height: baseHeight + (hasDome || hasSpire ? roofHeight : 0),
        baseHeight,
        roofType,
        roofHeight: hasDome || hasSpire ? roofHeight : roofHeight * 0.6,
        color,
        roofColor,
        windowRows,
        windowsPerRow,
        hasColumns,
        hasBalcony,
        hasErker,
        hasSpire,
        hasDome,
        decorations,
      });

      currentX += w + gapWidth;
    }

    return buildings;
  }

  private selectRoofType(): RoofType {
    const types = [
      RoofType.FLAT,
      RoofType.TRIANGULAR,
      RoofType.MANSARD,
      RoofType.STEPPED,
    ];
    return randItem(this.rng, types);
  }

  private drawFacade(container: Container, bld: BuildingData, canvasHeight: number): void {
    const y = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const colorNum = hexToNumber(bld.color);
    gfx.rect(bld.x, y, bld.width, bld.baseHeight);
    gfx.fill({ color: colorNum });

    // Лёгкий градиент: затемняем нижнюю часть
    const darken = new Graphics();
    darken.rect(bld.x, y + bld.baseHeight * 0.75, bld.width, bld.baseHeight * 0.25);
    darken.fill({ color: 0x000000, alpha: 0.08 });
    container.addChild(gfx);
    container.addChild(darken);
  }

  private drawRoof(container: Container, bld: BuildingData, canvasHeight: number): void {
    const y = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const roofColor = hexToNumber(bld.roofColor);
    const cx = bld.x + bld.width / 2;

    switch (bld.roofType) {
      case RoofType.TRIANGULAR: {
        const rh = bld.roofHeight;
        gfx.moveTo(bld.x - 2, y);
        gfx.lineTo(cx, y - rh);
        gfx.lineTo(bld.x + bld.width + 2, y);
        gfx.closePath();
        gfx.fill({ color: roofColor });
        break;
      }
      case RoofType.FLAT: {
        gfx.rect(bld.x, y - bld.roofHeight, bld.width, bld.roofHeight);
        gfx.fill({ color: roofColor });
        // Карниз
        gfx.rect(bld.x - 4, y, bld.width + 8, 6);
        gfx.fill({ color: roofColor });
        break;
      }
      case RoofType.MANSARD: {
        const rh = bld.roofHeight;
        gfx.moveTo(bld.x, y);
        gfx.lineTo(bld.x, y - rh * 0.6);
        gfx.lineTo(bld.x + bld.width * 0.15, y - rh);
        gfx.lineTo(bld.x + bld.width * 0.85, y - rh);
        gfx.lineTo(bld.x + bld.width, y - rh * 0.6);
        gfx.lineTo(bld.x + bld.width, y);
        gfx.closePath();
        gfx.fill({ color: roofColor });
        break;
      }
      case RoofType.STEPPED: {
        const rh = bld.roofHeight;
        const steps = 3;
        for (let s = 0; s < steps; s++) {
          const sx = bld.x + s * (bld.width / steps);
          const sw = bld.width / steps;
          const sh = rh * (1 - s * 0.3);
          gfx.rect(sx, y - sh, sw - 1, sh);
          gfx.fill({ color: roofColor });
        }
        break;
      }
      default: {
        gfx.rect(bld.x, y - bld.roofHeight, bld.width, bld.roofHeight);
        gfx.fill({ color: roofColor });
      }
    }
    container.addChild(gfx);
  }

  private drawWindows(container: Container, bld: BuildingData, canvasHeight: number): void {
    const baseY = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const isNight =
      this.config.timeOfDay === ('night' as any) ||
      this.config.timeOfDay === ('sunset' as any);
    const windowLight = hexToNumber(this.palette.windowLightColor);
    const winW = bld.width / (bld.windowsPerRow + 1) - 8;
    const winH = bld.baseHeight / (bld.windowRows + 1) - 8;

    for (let row = 0; row < bld.windowRows; row++) {
      for (let col = 0; col < bld.windowsPerRow; col++) {
        const wx =
          bld.x +
          (bld.width / (bld.windowsPerRow + 1)) * (col + 1) -
          winW / 2;
        const wy = baseY + (bld.baseHeight / (bld.windowRows + 1)) * (row + 1) - winH / 2;
        // Закруглённые окна
        gfx.roundRect(wx, wy, winW, winH, 3);
        if (isNight && chance(this.rng, row < bld.windowRows * 0.6 ? 0.7 : 0.4)) {
          gfx.fill({ color: windowLight });
          // Свечение
          const glow = new Graphics();
          glow.ellipse(wx + winW / 2, wy + winH / 2, winW * 0.7, winH * 0.7);
          glow.fill({ color: windowLight, alpha: 0.25 });
          container.addChild(glow);
        } else {
          gfx.fill({ color: 0x1a1a2e, alpha: 0.7 });
        }
      }
    }
    container.addChild(gfx);
  }

  private drawColumns(container: Container, bld: BuildingData, canvasHeight: number): void {
    const baseY = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const colCount = randInt(this.rng, 2, Math.min(4, Math.floor(bld.width / 50)));
    const colW = Math.min(12, bld.width / (colCount * 4));
    const spacing = (bld.width - colW * colCount) / (colCount + 1);
    const colColor = hexToNumber(lightenColor(bld.color, 0.1));

    for (let i = 0; i < colCount; i++) {
      const cx = bld.x + spacing + i * (colW + spacing);
      // Ствол колонны
      gfx.rect(cx, baseY, colW, bld.baseHeight);
      gfx.fill({ color: colColor });
      // Капитель
      gfx.rect(cx - 3, baseY, colW + 6, 8);
      gfx.fill({ color: hexToNumber(lightenColor(bld.color, 0.2)) });
      // База
      gfx.rect(cx - 2, baseY + bld.baseHeight - 6, colW + 4, 6);
      gfx.fill({ color: hexToNumber(darkenColor(bld.color, 0.15)) });
    }
    container.addChild(gfx);
  }

  private drawErker(container: Container, bld: BuildingData, canvasHeight: number): void {
    const baseY = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const erkerW = bld.width * 0.3;
    const erkerX = bld.x + (bld.width - erkerW) / 2;
    const erkerColor = hexToNumber(lightenColor(bld.color, 0.08));
    gfx.rect(erkerX, baseY, erkerW, bld.baseHeight);
    gfx.fill({ color: erkerColor });
    // Маленькая крыша эркера
    const erkerRoofH = bld.roofHeight * 0.4;
    gfx.moveTo(erkerX, baseY);
    gfx.lineTo(erkerX + erkerW / 2, baseY - erkerRoofH);
    gfx.lineTo(erkerX + erkerW, baseY);
    gfx.closePath();
    gfx.fill({ color: hexToNumber(bld.roofColor) });
    container.addChild(gfx);
  }

  private drawBalconies(container: Container, bld: BuildingData, canvasHeight: number): void {
    const baseY = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const n = Math.floor(this.config.density / 4);
    for (let i = 0; i < n; i++) {
      const by = baseY + (bld.baseHeight / (n + 1)) * (i + 1);
      const bw = bld.width * 0.25;
      const bx = bld.x + randFloat(this.rng, 0, bld.width - bw);
      gfx.rect(bx, by, bw, 4);
      gfx.fill({ color: hexToNumber(bld.roofColor) });
      // Решётка
      for (
        let r = bx + 4;
        r < bx + bw - 4;
        r += randInt(this.rng, 3, 6)
      ) {
        gfx.moveTo(r, by);
        gfx.lineTo(r, by + 10);
        gfx.stroke({ color: hexToNumber(bld.roofColor), width: 0.5 });
      }
    }
    container.addChild(gfx);
  }

  private drawDome(container: Container, bld: BuildingData, canvasHeight: number): void {
    const baseY = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const domeColor = hexToNumber(randItem(this.rng, this.palette.domeColors));
    const cx = bld.x + bld.width / 2;
    const cy = baseY - bld.roofHeight * 0.5;
    const rx = bld.width * 0.2;
    const ry = bld.roofHeight * 0.9;
    // Луковичный купол: эллипс + треугольник
    gfx.ellipse(cx, cy, rx, ry);
    gfx.fill({ color: domeColor });
    // Шпиль сверху
    gfx.moveTo(cx - 3, cy - ry);
    gfx.lineTo(cx, cy - ry - bld.roofHeight * 0.4);
    gfx.lineTo(cx + 3, cy - ry);
    gfx.closePath();
    gfx.fill({ color: domeColor });
    container.addChild(gfx);
  }

  private drawSpire(container: Container, bld: BuildingData, canvasHeight: number): void {
    const baseY = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const cx = bld.x + bld.width / 2;
    const spireH = bld.roofHeight * 1.2;
    const spireColor = hexToNumber(randItem(this.rng, ['#C0C0C0', '#DAA520', '#B8B8B8']));
    gfx.moveTo(cx - 4, baseY);
    gfx.lineTo(cx, baseY - spireH);
    gfx.lineTo(cx + 4, baseY);
    gfx.closePath();
    gfx.fill({ color: spireColor });
    container.addChild(gfx);
  }

  private drawDecoration(
    container: Container,
    bld: BuildingData,
    deco: DecorationType,
    canvasHeight: number,
  ): void {
    const baseY = canvasHeight * 0.58 - bld.baseHeight;
    const gfx = new Graphics();
    const decoColor = hexToNumber(lightenColor(bld.color, 0.12));

    switch (deco) {
      case DecorationType.CORNICE: {
        const step = bld.baseHeight / (bld.decorations.length + 1);
        const cy = baseY + step;
        gfx.rect(bld.x, cy, bld.width, 6);
        gfx.fill({ color: decoColor });
        break;
      }
      case DecorationType.ARCH: {
        // Арка над центральным окном
        const cx = bld.x + bld.width / 2;
        gfx.arc(cx, baseY + 30, 25, Math.PI, 0);
        gfx.stroke({ color: decoColor, width: 2 });
        break;
      }
      case DecorationType.PILASTER: {
        gfx.rect(bld.x + 5, baseY, 8, bld.baseHeight);
        gfx.fill({ color: decoColor });
        gfx.rect(bld.x + bld.width - 13, baseY, 8, bld.baseHeight);
        gfx.fill({ color: decoColor });
        break;
      }
      case DecorationType.RUSTICATION: {
        // Горизонтальные линии первого этажа
        for (let i = 0; i < 5; i++) {
          gfx.rect(
            bld.x,
            baseY + bld.baseHeight * 0.7 + i * 10,
            bld.width,
            3,
          );
          gfx.fill({ color: decoColor, alpha: 0.4 });
        }
        break;
      }
    }
    container.addChild(gfx);
  }

  private applyOutline(
    container: Container,
    bld: BuildingData,
    canvasHeight: number,
  ): void {
    const baseY = canvasHeight * 0.58 - bld.baseHeight;
    const outlineW = this.config.outlineWidth || 3;
    const gfx = new Graphics();
    gfx.rect(bld.x, baseY, bld.width, bld.baseHeight);
    gfx.stroke({
      color: hexToNumber(this.palette.outlineColor),
      width: outlineW,
    });
    container.addChild(gfx);
  }

  private wrapBuildings(
    container: Container,
    buildings: BuildingData[],
    tileWidth: number,
  ): void {
    // Клонируем здания, выходящие за правый край
    const childrenToWrap = [...container.children];
    for (const child of childrenToWrap) {
      const bounds = child.getLocalBounds();
      if (bounds.x + bounds.width > tileWidth) {
        const clone = child.clone();
        if (clone) {
          clone.x = -tileWidth;
          container.addChild(clone);
        }
      }
    }
  }
}
