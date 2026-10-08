import { Container, Graphics } from 'pixi.js';
import { CityGeneratorConfig, Palette } from '../types';
import { createSeededRandom, randFloat, randInt, randItem, chance } from '../utils/random';
import { hexToNumber } from '../utils/colors';

export class SilhouetteGenerator {
  private config: CityGeneratorConfig;
  private palette: Palette;
  private rng: () => number;

  constructor(config: CityGeneratorConfig, palette: Palette, seed: number) {
    this.config = config;
    this.palette = palette;
    this.rng = createSeededRandom(seed + 2000);
  }

  generate(): Container {
    const container = new Container();
    container.label = 'distantSilhouettes';
    const { width, height, density } = this.config;
    const silhouetteAlpha = 0.45;
    // Количество силуэтов: минимум 2, растёт с density
    const count = Math.max(2, 2 + Math.floor(density * 0.8));

    for (let i = 0; i < count; i++) {
      const x = randFloat(this.rng, -20, width);
      const w = randFloat(this.rng, 50, 200);
      const h = randFloat(this.rng, height * 0.1, height * 0.35);
      const yBase = height * 0.58; // предполагаемая линия горизонта
      const colorHex = randItem(this.rng, this.palette.buildingBaseColors);
      const color = hexToNumber(colorHex);

      const gfx = new Graphics();
      // Основной силуэт (здание)
      gfx.rect(x, yBase - h, w, h);
      gfx.fill({ color, alpha: silhouetteAlpha });

      // Иногда добавляем купол или шпиль
      if (w > 100 && chance(this.rng, Math.min(0.4, density / 35))) {
        const domeCx = x + w / 2;
        const domeCy = yBase - h;
        const domeR = w * 0.25;
        gfx.ellipse(domeCx, domeCy, domeR, domeR * 1.2);
        gfx.fill({ color, alpha: silhouetteAlpha * 0.9 });
      } else if (w > 80 && chance(this.rng, Math.min(0.3, density / 40))) {
        const spireCx = x + w / 2;
        const spireBaseY = yBase - h;
        const spireH = h * 0.4;
        gfx.moveTo(spireCx - 5, spireBaseY);
        gfx.lineTo(spireCx, spireBaseY - spireH);
        gfx.lineTo(spireCx + 5, spireBaseY);
        gfx.closePath();
        gfx.fill({ color, alpha: silhouetteAlpha });
      }

      container.addChild(gfx);
      // Бесшовность: если объект выходит за правую границу, дублируем слева
      if (x + w > width) {
        const wrap = gfx.clone();
        if (wrap) {
          wrap.x = -width;
          container.addChild(wrap);
        }
      }
    }

    return container;
  }
}
