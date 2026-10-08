import {
  CityGeneratorConfig,
  TimeOfDay,
  ArchitecturalStyle,
  LayerName,
} from '../core/types';

interface UIReturn {
  getConfig: () => CityGeneratorConfig;
}

export function createUI(
  onRegenerate: (config: CityGeneratorConfig) => void,
  initialConfig: CityGeneratorConfig,
): UIReturn {
  const panel = document.getElementById('ui-container');
  if (!panel) throw new Error('UI container not found');

  let currentConfig = { ...initialConfig };

  // Создаём элементы управления
  const controls: HTMLElement[] = [];

  // Density (логарифмический слайдер)
  controls.push(
    createSlider('Density', 1, 100, currentConfig.density, 1, (val) => {
      currentConfig.density = val;
    }),
  );

  // Seed
  controls.push(
    createNumberInput('Seed', currentConfig.seed ?? 0, (val) => {
      currentConfig.seed = val;
    }),
  );

  // Time of Day
  controls.push(
    createSelect(
      'Time of Day',
      [
        { value: TimeOfDay.DAWN, label: 'Рассвет' },
        { value: TimeOfDay.DAY, label: 'День' },
        { value: TimeOfDay.SUNSET, label: 'Закат' },
        { value: TimeOfDay.NIGHT, label: 'Ночь' },
      ],
      currentConfig.timeOfDay,
      (val) => {
        currentConfig.timeOfDay = val as TimeOfDay;
      },
    ),
  );

  // Architectural Style
  controls.push(
    createSelect(
      'Стиль',
      [
        { value: ArchitecturalStyle.CLASSICISM, label: 'Классицизм' },
        { value: ArchitecturalStyle.EMPIRE, label: 'Ампир' },
        { value: ArchitecturalStyle.ECLECTIC, label: 'Эклектика' },
      ],
      currentConfig.architecturalStyle,
      (val) => {
        currentConfig.architecturalStyle = val as ArchitecturalStyle;
      },
    ),
  );

  // Cartoon Factor
  controls.push(
    createSlider('Мультяшность', 0, 2, currentConfig.cartoonFactor ?? 1, 0.1, (val) => {
      currentConfig.cartoonFactor = val;
    }),
  );

  // Outline Width
  controls.push(
    createSlider('Контур (px)', 0, 10, currentConfig.outlineWidth ?? 3, 0.5, (val) => {
      currentConfig.outlineWidth = val;
    }),
  );

  // Layers (checkboxes)
  const layerGroup = document.createElement('div');
  layerGroup.className = 'control-group checkbox-group';
  const layerLabel = document.createElement('label');
  layerLabel.textContent = 'Слои:';
  layerGroup.appendChild(layerLabel);

  const layerNames = [
    { key: LayerName.SKY, label: 'Небо' },
    { key: LayerName.DISTANT_SILHOUETTES, label: 'Силуэты' },
    { key: LayerName.BUILDINGS, label: 'Здания' },
    { key: LayerName.STREET_ELEMENTS, label: 'Улица' },
    { key: LayerName.WATER, label: 'Вода' },
    { key: LayerName.FOREGROUND, label: 'Передний план' },
  ];

  for (const layer of layerNames) {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = currentConfig.layers.includes(layer.key);
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!currentConfig.layers.includes(layer.key)) {
          currentConfig.layers.push(layer.key);
        }
      } else {
        currentConfig.layers = currentConfig.layers.filter((l) => l !== layer.key);
      }
    });
    const span = document.createElement('span');
    span.textContent = layer.label;
    const wrapper = document.createElement('span');
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '4px';
    wrapper.appendChild(cb);
    wrapper.appendChild(span);
    layerGroup.appendChild(wrapper);
  }
  controls.push(layerGroup);

  // Generate Button
  const btnGroup = document.createElement('div');
  btnGroup.className = 'control-group';
  const generateBtn = document.createElement('button');
  generateBtn.textContent = 'Сгенерировать';
  generateBtn.addEventListener('click', () => {
    // Новый seed для рандомизации
    if (!initialConfig.seed) {
      currentConfig.seed = Math.floor(Math.random() * 1000000);
    }
    onRegenerate({ ...currentConfig });
  });
  btnGroup.appendChild(generateBtn);

  // Export PNG Button
  const exportBtn = document.createElement('button');
  exportBtn.textContent = 'Экспорт PNG';
  exportBtn.style.marginLeft = '10px';
  exportBtn.addEventListener('click', () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'spb-city-tile.png';
      a.click();
    }
  });
  btnGroup.appendChild(exportBtn);
  controls.push(btnGroup);

  // Добавляем все контролы на панель
  for (const ctrl of controls) {
    panel.appendChild(ctrl);
  }

  return {
    getConfig: () => ({ ...currentConfig }),
  };
}

function createSlider(
  label: string,
  min: number,
  max: number,
  value: number,
  step: number,
  onChange: (val: number) => void,
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'control-group';

  const lbl = document.createElement('label');
  lbl.textContent = label + ':';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);

  const display = document.createElement('span');
  display.className = 'value-display';
  display.textContent = String(value);

  slider.addEventListener('input', () => {
    const val = parseFloat(slider.value);
    display.textContent = String(val);
    onChange(val);
  });

  group.appendChild(lbl);
  group.appendChild(slider);
  group.appendChild(display);
  return group;
}

function createNumberInput(
  label: string,
  value: number,
  onChange: (val: number) => void,
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'control-group';

  const lbl = document.createElement('label');
  lbl.textContent = label + ':';

  const input = document.createElement('input');
  input.type = 'number';
  input.value = String(value);
  input.style.width = '100px';

  input.addEventListener('input', () => {
    onChange(parseInt(input.value) || 0);
  });

  group.appendChild(lbl);
  group.appendChild(input);
  return group;
}

function createSelect(
  label: string,
  options: { value: string; label: string }[],
  value: string,
  onChange: (val: string) => void,
): HTMLElement {
  const group = document.createElement('div');
  group.className = 'control-group';

  const lbl = document.createElement('label');
  lbl.textContent = label + ':';

  const select = document.createElement('select');
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    if (opt.value === value) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', () => {
    onChange(select.value);
  });

  group.appendChild(lbl);
  group.appendChild(select);
  return group;
}
