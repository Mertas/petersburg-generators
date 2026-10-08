import { Container, Graphics } from 'pixi.js';
import { CityGeneratorConfig, Palette } from '../types';
import { createSeededRandom, randFloat, randInt } from '../utils/random';
import { hexToNumber } from '../utils/colors';

export class ForegroundGenerator {
  private config: CityGeneratorConfig;
  private palette: Palette;
  private rng: () => number;

  constructor(config: CityGeneratorConfig, palette: Palette, seed: number) {
    this.config = config;
    this.palette = palette;
    this.rng = createSeededRandom(seed + 6000);
  }

  generate(): Container {
    const container = new Container();
    container.label = 'foreground';
    const { width, height } = this.config;

    // Ближние элементы: кусты, камни, тумбы на переднем плане
    const elementsCount = randInt(this.rng, 3, 8);
    for (let i = 0; i < elementsCount; i++) {
      const ex = randFloat(this.rng, 0, width);
      const ey = height * 0.85 + randFloat(this.rng, 0, height * 0.1);
      const type = this.rng() > 0.5 ? 'bush' : 'bollard';

      if (type === 'bush') {
        this.drawBush(container, ex, ey);
      } else {
        this.drawBollard(container, ex, ey);
      }
    }

    // Оборачиваем для бесшовности
    const children = [...container.children];
    for (const child of children) {
      const bounds = child.getLocalBounds();
      if (bounds.x + bounds.width > width) {
        const clone = child.clone();
        if (clone) {
          clone.x = -width;
          container.addChild(clone);
        }
      }
      if (bounds.x < 0) {
        const clone = child.clone();
        if (clone) {
          clone.x = width;
          container.addChild(clone);
        }
      }
    }

    return container;
  }

  private drawBush(container: Container, x: number, y: number): void {
    const gfx = new Graphics();
    const foliageColor = hexToNumber(this.palette.treeColors.foliage);
    const bushSize = randFloat(this.rng, 12, 25);
    // Несколько кругов для куста
    const clusterCount = randInt(this.rng, 3, 5);
    for (let i = 0; i < clusterCount; i++) {
      const cx = x + randFloat(this.rng, -bushSize * 0.4, bushSize * 0.4);
      const cy = y + randFloat(this.rng, -bushSize * 0.3, bushSize * 0.3);
      const cr = bushSize * randFloat(this.rng, 0.5, 0.9);
      gfx.circle(cx, cy, cr);
      gfx.fill({ color: foliageColor, alpha: 0.9 });
    }
    container.addChild(gfx);
  }

  private drawBollard(container: Container, x: number, y: number): void {
    const gfx = new Graphics();
    // Гранитная тумба
    gfx.rect(x, y - 25, 8, 25);
    gfx.fill({ color: 0x7a7d84 });
    // Верхняя часть
    gfx.rect(x - 2, y - 28, 12, 6);
    gfx.fill({ color: 0x8a8d94 });
    container.addChild(gfx);
  }
}
