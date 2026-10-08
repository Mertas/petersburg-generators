import { Container, Graphics } from 'pixi.js';
import { CityGeneratorConfig, Palette } from '../types';
import { createSeededRandom, randFloat, randInt } from '../utils/random';
import { hexToNumber } from '../utils/colors';

export class SkyGenerator {
  private config: CityGeneratorConfig;
  private palette: Palette;
  private rng: () => number;

  constructor(config: CityGeneratorConfig, palette: Palette, seed: number) {
    this.config = config;
    this.palette = palette;
    this.rng = createSeededRandom(seed + 1000);
  }

  generate(): Container {
    const { width, height, density } = this.config;
    const container = new Container();
    container.label = 'sky';

    // Небесный градиент
    const sky = new Graphics();
    const topColor = hexToNumber(this.palette.skyGradient[0]);
    const bottomColor = hexToNumber(this.palette.skyGradient[1]);
    // Рисуем градиент вручную полосками
    const steps = 40;
    const skyHeight = height * 0.7;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const rTop = (topColor >> 16) & 0xff;
      const gTop = (topColor >> 8) & 0xff;
      const bTop = topColor & 0xff;
      const rBot = (bottomColor >> 16) & 0xff;
      const gBot = (bottomColor >> 8) & 0xff;
      const bBot = bottomColor & 0xff;
      const r = Math.round(rTop + (rBot - rTop) * t);
      const g = Math.round(gTop + (gBot - gTop) * t);
      const b = Math.round(bTop + (bBot - bTop) * t);
      const color = (r << 16) | (g << 8) | b;
      sky.rect(0, (skyHeight / steps) * i, width, skyHeight / steps + 1);
      sky.fill({ color });
    }
    // Заполняем нижнюю часть неба нижним цветом
    sky.rect(0, skyHeight, width, height - skyHeight);
    sky.fill({ color: bottomColor });
    container.addChild(sky);

    // Облака
    const cloudCount = randInt(this.rng, 3, 3 + Math.floor(density * 0.5));
    for (let i = 0; i < cloudCount; i++) {
      this.drawCloud(container, width, height, i);
    }

    return container;
  }

  private drawCloud(container: Container, tileWidth: number, canvasHeight: number, index: number): void {
    const cloud = new Graphics();
    const cx = randFloat(this.rng, 0, tileWidth);
    const cy = randFloat(this.rng, canvasHeight * 0.05, canvasHeight * 0.35);
    const alpha = randFloat(this.rng, 0.25, 0.6);
    const cloudColor = hexToNumber(this.palette.cloudColor);

    // Рисуем облако как группу эллипсов
    const ellipses = randInt(this.rng, 3, 6);
    for (let i = 0; i < ellipses; i++) {
      const ex = cx + randFloat(this.rng, -40, 40);
      const ey = cy + randFloat(this.rng, -15, 15);
      const rx = randFloat(this.rng, 25, 60);
      const ry = randFloat(this.rng, 12, 30);
      cloud.ellipse(ex, ey, rx, ry);
      cloud.fill({ color: cloudColor, alpha });
    }
    cloud.x = 0;
    cloud.y = 0;
    container.addChild(cloud);

    // Оборачиваем облака для бесшовности
    if (cx + 60 > tileWidth) {
      const wrapCloud = cloud.clone();
      if (wrapCloud) {
        wrapCloud.x = -tileWidth;
        container.addChild(wrapCloud);
      }
    }
    if (cx - 40 < 0) {
      const wrapCloud = cloud.clone();
      if (wrapCloud) {
        wrapCloud.x = tileWidth;
        container.addChild(wrapCloud);
      }
    }
  }
}
