import { Container, Graphics } from 'pixi.js';
import { CityGeneratorConfig, Palette } from '../types';
import { createSeededRandom, randFloat, randInt, chance } from '../utils/random';
import { hexToNumber } from '../utils/colors';

export class StreetElementsGenerator {
  private config: CityGeneratorConfig;
  private palette: Palette;
  private rng: () => number;

  constructor(config: CityGeneratorConfig, palette: Palette, seed: number) {
    this.config = config;
    this.palette = palette;
    this.rng = createSeededRandom(seed + 4000);
  }

  generate(): Container {
    const container = new Container();
    container.label = 'streetElements';
    const { width, height, density } = this.config;

    const isNight =
      this.config.timeOfDay === ('night' as any) ||
      this.config.timeOfDay === ('sunset' as any);

    // Фонари
    const lampCount = Math.floor(2 + density * 1.2);
    const lampSpacing = width / (lampCount + 1);
    for (let i = 0; i < lampCount; i++) {
      const lx = lampSpacing * (i + 1) + randFloat(this.rng, -30, 30);
      this.drawLamp(container, lx, height * 0.58, isNight);
    }

    // Деревья
    const treeCount = Math.floor(density * 0.8);
    for (let i = 0; i < treeCount; i++) {
      const tx = randFloat(this.rng, 20, width - 20);
      this.drawTree(container, tx, height * 0.58);
    }

    // Набережная - парапет внизу слоя
    this.drawEmbankment(container, width, height);

    // Мост (с вероятностью)
    if (density > 3 && chance(this.rng, Math.min(0.5, density / 20))) {
      this.drawBridge(container, width, height);
    }

    // Оборачиваем элементы для бесшовности
    this.wrapElements(container, width);

    return container;
  }

  private drawLamp(
    container: Container,
    x: number,
    groundY: number,
    isNight: boolean,
  ): void {
    const gfx = new Graphics();
    const lampHeight = randFloat(this.rng, 80, 150);
    const lampY = groundY - lampHeight;

    // Столб
    gfx.rect(x + 8, lampY, 4, lampHeight);
    gfx.fill({ color: 0x2c2c2c });

    // Перекладина
    gfx.rect(x - 4, lampY, 20, 3);
    gfx.fill({ color: 0x2c2c2c });

    // Фонарь
    const lampColor = isNight
      ? hexToNumber(this.palette.streetLampColor)
      : 0x888888;
    gfx.circle(x + 8, lampY - 5, 7);
    gfx.fill({ color: lampColor });

    // Свечение ночью
    if (isNight) {
      const glow = new Graphics();
      glow.circle(x + 8, lampY - 5, 18);
      glow.fill({ color: lampColor, alpha: 0.2 });
      glow.circle(x + 8, lampY - 5, 12);
      glow.fill({ color: lampColor, alpha: 0.3 });
      container.addChild(glow);
    }

    container.addChild(gfx);
  }

  private drawTree(
    container: Container,
    x: number,
    groundY: number,
  ): void {
    const gfx = new Graphics();
    const trunkColor = hexToNumber(this.palette.treeColors.trunk);
    const foliageColor = hexToNumber(this.palette.treeColors.foliage);

    // Ствол
    gfx.rect(x, groundY - 60, 8, 60);
    gfx.fill({ color: trunkColor });
    // Небольшое утолщение внизу
    gfx.rect(x - 2, groundY - 10, 12, 10);
    gfx.fill({ color: trunkColor });

    // Крона
    gfx.circle(x + 4, groundY - 70, randFloat(this.rng, 20, 30));
    gfx.fill({ color: foliageColor });

    container.addChild(gfx);
  }

  private drawEmbankment(
    container: Container,
    width: number,
    height: number,
  ): void {
    const gfx = new Graphics();
    const embankmentY = height * 0.58;
    const blockW = 40;
    const blockH = 20;
    const blocks = Math.ceil(width / blockW);

    for (let i = 0; i < blocks; i++) {
      const bx = i * blockW;
      gfx.rect(bx, embankmentY, blockW - 1, blockH);
      gfx.fill({ color: 0x888c94 });
      // Тумба через одну
      if (i % 3 === 0) {
        const bollard = new Graphics();
        bollard.rect(bx + blockW / 2 - 3, embankmentY - 15, 6, 15);
        bollard.fill({ color: 0x6b6f76 });
        container.addChild(bollard);
      }
    }
    container.addChild(gfx);
  }

  private drawBridge(
    container: Container,
    width: number,
    height: number,
  ): void {
    const gfx = new Graphics();
    const bx = randFloat(this.rng, width * 0.2, width * 0.6);
    const bw = randFloat(this.rng, 60, 150);
    const by = height * 0.55;

    // Арка моста
    gfx.arc(bx + bw / 2, by, bw / 2, Math.PI, 0);
    gfx.stroke({ color: 0x6b6f76, width: 5 });

    // Перила
    gfx.moveTo(bx, by - 5);
    gfx.lineTo(bx + bw, by - 5);
    gfx.stroke({ color: 0x4a4d53, width: 2 });

    // Вертикальные стойки перил
    for (let lx = bx; lx <= bx + bw; lx += 10) {
      gfx.moveTo(lx, by - 5);
      gfx.lineTo(lx, by - 15);
      gfx.stroke({ color: 0x4a4d53, width: 1 });
    }

    container.addChild(gfx);
  }

  private wrapElements(container: Container, tileWidth: number): void {
    const children = [...container.children];
    for (const child of children) {
      const bounds = child.getLocalBounds();
      const childX = bounds.x;
      const childW = bounds.width || 40;
      if (childX + childW > tileWidth) {
        const clone = child.clone();
        if (clone) {
          clone.x = -tileWidth;
          container.addChild(clone);
        }
      }
      if (childX < 0) {
        const clone = child.clone();
        if (clone) {
          clone.x = tileWidth;
          container.addChild(clone);
        }
      }
    }
  }
}
