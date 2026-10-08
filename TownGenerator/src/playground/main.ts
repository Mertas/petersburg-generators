import { Application, Container } from 'pixi.js';
import { CityGenerator } from '../core/index';
import {
  CityGeneratorConfig,
  TimeOfDay,
  ArchitecturalStyle,
  LayerName,
} from '../core/types';
import { createUI } from './ui';

async function init() {
  const app = new Application();
  await app.init({
    width: 960,
    height: 540,
    backgroundColor: 0x000000,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const canvasEl = document.getElementById('pixi-canvas');
  if (canvasEl) {
    canvasEl.replaceWith(app.canvas);
  }

  let currentContainer: Container | null = null;

  function regenerate(config: CityGeneratorConfig) {
    if (currentContainer) {
      app.stage.removeChild(currentContainer);
      currentContainer.destroy({ children: true });
    }
    const scaledConfig = {
      ...config,
      width: 1920,
      height: 1080,
    };
    const generator = new CityGenerator(scaledConfig);
    currentContainer = generator.generate();

    // Масштабируем до размеров canvas
    currentContainer.scale.set(
      app.canvas.width / 1920,
      app.canvas.height / 1080,
    );
    app.stage.addChild(currentContainer);
  }

  const defaultConfig: CityGeneratorConfig = {
    width: 1920,
    height: 1080,
    density: 5,
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
    seed: Math.floor(Math.random() * 1000000),
    cartoonFactor: 1,
    outlineWidth: 3,
  };

  const { getConfig } = createUI(regenerate, defaultConfig);

  regenerate(getConfig());

  // Обработка изменения размера окна
  window.addEventListener('resize', () => {
    app.renderer.resize(960, 540);
    if (currentContainer) {
      currentContainer.scale.set(
        app.canvas.width / 1920,
        app.canvas.height / 1080,
      );
    }
  });
}

init().catch(console.error);
