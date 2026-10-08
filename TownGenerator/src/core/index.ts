import { Container, RenderTexture, Sprite, Renderer } from 'pixi.js';
import {
  CityGeneratorConfig,
  LayerName,
  TimeOfDay,
  ArchitecturalStyle,
  Palette,
} from './types';
import { getPalette } from './utils/colors';
import { SkyGenerator } from './generators/SkyGenerator';
import { SilhouetteGenerator } from './generators/SilhouetteGenerator';
import { BuildingGenerator } from './generators/BuildingGenerator';
import { StreetElementsGenerator } from './generators/StreetElementsGenerator';
import { WaterGenerator } from './generators/WaterGenerator';
import { ForegroundGenerator } from './generators/ForegroundGenerator';

export class CityGenerator {
  private config: CityGeneratorConfig;
  private palette: Palette;
  private seed: number;
  private skyGen: SkyGenerator;
  private silhouetteGen: SilhouetteGenerator;
  private buildingGen: BuildingGenerator;
  private streetGen: StreetElementsGenerator;
  private waterGen: WaterGenerator;
  private foregroundGen: ForegroundGenerator;

  /** Значения по умолчанию */
  static defaultConfig: Partial<CityGeneratorConfig> = {
    width: 1920,
    height: 1080,
    density: 3,
    timeOfDay: TimeOfDay.DAY,
    architecturalStyle: ArchitecturalStyle.ECLECTIC,
    layers: [
      LayerName.SKY,
      LayerName.DISTANT_SILHOUETTES,
      LayerName.BUILDINGS,
      LayerName.STREET_ELEMENTS,
      LayerName.WATER,
      LayerName.FOREGROUND,
    ],
    cartoonFactor: 1,
    outlineWidth: 3,
  };

  constructor(config: CityGeneratorConfig) {
    this.config = { ...CityGenerator.defaultConfig, ...config } as CityGeneratorConfig;
    this.seed = this.config.seed ?? Date.now();
    this.palette = getPalette(this.config.timeOfDay);

    this.skyGen = new SkyGenerator(this.config, this.palette, this.seed);
    this.silhouetteGen = new SilhouetteGenerator(this.config, this.palette, this.seed);
    this.buildingGen = new BuildingGenerator(this.config, this.palette, this.seed);
    this.streetGen = new StreetElementsGenerator(this.config, this.palette, this.seed);
    this.waterGen = new WaterGenerator(this.config, this.palette, this.seed);
    this.foregroundGen = new ForegroundGenerator(this.config, this.palette, this.seed);
  }

  /** Главный метод генерации — возвращает корневой контейнер со всеми слоями */
  public generate(): Container {
    const rootContainer = new Container();
    rootContainer.label = 'cityRoot';

    const generators: Record<LayerName, () => Container> = {
      [LayerName.SKY]: () => this.skyGen.generate(),
      [LayerName.DISTANT_SILHOUETTES]: () => this.silhouetteGen.generate(),
      [LayerName.BUILDINGS]: () => this.buildingGen.generate(),
      [LayerName.STREET_ELEMENTS]: () => this.streetGen.generate(),
      [LayerName.WATER]: () => this.waterGen.generate(),
      [LayerName.FOREGROUND]: () => this.foregroundGen.generate(),
    };

    for (const layer of this.config.layers) {
      if (generators[layer]) {
        rootContainer.addChild(generators[layer]());
      }
    }

    return rootContainer;
  }

  /** Создать несколько склеенных тайлов для бесконечного скроллинга */
  static generateTileStrip(
    config: CityGeneratorConfig,
    tileCount: number,
  ): Container {
    const strip = new Container();
    for (let i = 0; i < tileCount; i++) {
      const gen = new CityGenerator({ ...config, seed: (config.seed ?? 0) + i });
      const tile = gen.generate();
      tile.x = i * config.width;
      strip.addChild(tile);
    }
    return strip;
  }

  /** Экспорт контейнера в PNG Data URL */
  static async exportToPNG(
    container: Container,
    renderer: Renderer,
  ): Promise<string> {
    const bounds = container.getLocalBounds();
    const renderTexture = RenderTexture.create({
      width: bounds.width,
      height: bounds.height,
    });
    renderer.render({
      container,
      target: renderTexture,
    });
    const canvas = renderer.extract.canvas(renderTexture) as HTMLCanvasElement;
    return canvas.toDataURL('image/png');
  }

  /** Загрузить предустановленную палитру */
  static getPalette(timeOfDay: TimeOfDay): Palette {
    return getPalette(timeOfDay);
  }
}
