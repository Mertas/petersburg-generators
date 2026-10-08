// Время суток — определяет глобальное освещение и палитру
export enum TimeOfDay {
  DAWN = 'dawn',
  DAY = 'day',
  SUNSET = 'sunset',
  NIGHT = 'night',
}

// Архитектурный стиль
export enum ArchitecturalStyle {
  CLASSICISM = 'classicism',
  EMPIRE = 'empire',
  ECLECTIC = 'eclectic',
}

// Именованные слои фона
export enum LayerName {
  SKY = 'sky',
  DISTANT_SILHOUETTES = 'distantSilhouettes',
  BUILDINGS = 'buildings',
  STREET_ELEMENTS = 'streetElements',
  WATER = 'water',
  FOREGROUND = 'foreground',
}

// Типы крыш
export enum RoofType {
  FLAT = 'flat',
  TRIANGULAR = 'triangular',
  DOME = 'dome',
  SPIRE = 'spire',
  MANSARD = 'mansard',
  STEPPED = 'stepped',
}

// Декоративные элементы
export enum DecorationType {
  CORNICE = 'cornice',
  PILASTER = 'pilaster',
  ARCH = 'arch',
  RUSTICATION = 'rustication',
  ATTIC = 'attic',
  BAS_RELIEF = 'basRelief',
  GARLAND = 'garland',
}

// Конфигурация генератора города
export interface CityGeneratorConfig {
  width: number;
  height: number;
  density: number;
  timeOfDay: TimeOfDay;
  architecturalStyle: ArchitecturalStyle;
  layers: LayerName[];
  seed?: number;
  cartoonFactor?: number;
  outlineWidth?: number;
}

// Отдельное здание в ряду
export interface BuildingData {
  x: number;
  width: number;
  height: number;
  baseHeight: number;
  roofType: RoofType;
  roofHeight: number;
  color: string;
  roofColor: string;
  windowRows: number;
  windowsPerRow: number;
  hasColumns: boolean;
  hasBalcony: boolean;
  hasErker: boolean;
  hasSpire: boolean;
  hasDome: boolean;
  decorations: DecorationType[];
}

// Конфигурация палитры
export interface Palette {
  skyGradient: [string, string];
  cloudColor: string;
  buildingBaseColors: string[];
  roofColors: string[];
  domeColors: string[];
  windowLightColor: string;
  waterColor: string;
  waterReflectionColor: string;
  streetLampColor: string;
  treeColors: { trunk: string; foliage: string };
  outlineColor: string;
}