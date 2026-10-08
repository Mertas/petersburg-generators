import { Container, Graphics } from 'pixi.js';
import { CityGeneratorConfig, Palette } from '../types';
import { createSeededRandom, randFloat, randInt } from '../utils/random';
import { hexToNumber } from '../utils/colors';

export class WaterGenerator {
  private config: CityGeneratorConfig;
  private palette: Palette;
  private rng: () => number;

  constructor(config: CityGeneratorConfig, palette: Palette, seed: number) {
    this.config = config;
    this.palette = palette;
    this.rng = createSeededRandom(seed + 5000);
  }

  generate(): Container {
    const container = new Container();
    container.label = 'water';
    const { width, height } = this.config;

    const waterStartY = height * 0.78;
    const waterColor = hexToNumber(this.palette.waterColor);

    // Основная водная полоса
    const water = new Graphics();
    water.rect(0, waterStartY, width, height - waterStartY);
    water.fill({ color: waterColor });
    container.addChild(water);

    // Горизонтальные волнистые линии для имитации ряби
    this.drawRipples(container, width, waterStartY, height);

    // Отражения (упрощённые силуэты)
    this.drawReflections(container, width, waterStartY, height);

    return container;
  }

  private drawRipples(
    container: Container,
    width: number,
    waterStartY: number,
    height: number,
  ): void {
    const gfx = new Graphics();
    const rippleColor = hexToNumber(this.palette.waterReflectionColor);
    const rippleCount = randInt(this.rng, 8, 20);

    for (let i = 0; i < rippleCount; i++) {
      const y = waterStartY + randFloat(this.rng, 20, height - waterStartY - 20);
      const amplitude = randFloat(this.rng, 2, 6);
      const frequency = randFloat(this.rng, 0.01, 0.04);

      gfx.moveTo(0, y);
      for (let x = 0; x <= width; x += 4) {
        const dy = Math.sin(x * frequency + i) * amplitude;
        gfx.lineTo(x, y + dy);
      }
      gfx.stroke({ color: rippleColor, width: 0.8, alpha: 0.4 });
    }
    container.addChild(gfx);
  }

  private drawReflections(
    container: Container,
    width: number,
    waterStartY: number,
    height: number,
  ): void {
    const gfx = new Graphics();
    const reflColor = hexToNumber(this.palette.waterReflectionColor);

    // 3-6 отражений зданий
    const reflCount = randInt(this.rng, 3, 6);
    for (let i = 0; i < reflCount; i++) {
      const rx = randFloat(this.rng, 0, width - 80);
      const rw = randFloat(this.rng, 40, 180);
      const rh = randFloat(this.rng, 20, 60);
      const ry = waterStartY + randFloat(this.rng, 10, 40);

      // Отражение здания (перевёрнуто)
      gfx.rect(rx, ry, rw, rh);
      gfx.fill({ color: reflColor, alpha: 0.2 });

      // Отражение шпиля
      if (rw > 100 && this.rng() > 0.5) {
        gfx.moveTo(rx + rw / 2 - 4, ry);
        gfx.lineTo(rx + rw / 2, ry - rh * 0.5);
        gfx.lineTo(rx + rw / 2 + 4, ry);
        gfx.closePath();
        gfx.fill({ color: reflColor, alpha: 0.15 });
      }
    }

    // Отражения фонарей
    const lampReflCount = randInt(this.rng, 2, 5);
    for (let i = 0; i < lampReflCount; i++) {
      const lx = randFloat(this.rng, 30, width - 30);
      const ly = waterStartY + randFloat(this.rng, 30, 80);
      gfx.rect(lx - 2, ly, 4, 30);
      gfx.fill({ color: reflColor, alpha: 0.15 });
    }

    container.addChild(gfx);
  }
}
