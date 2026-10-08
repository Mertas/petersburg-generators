import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { HouseConfig, RoofType } from 'house';
import { DEFAULT_CONFIG, METER_TO_PX } from 'house';
import { generateHouse } from 'house';
import type { GameState, GameEventDef } from './types';
import { getSeason, FLOOR_EXPANSION_COST, MAX_FLOORS } from './types';
import { createInitialState, isGameOver, getFreeApartmentCount, canExpandFloors, expandFloors, randomSeed } from './game/GameState';
import { processTurnPhases, applyEventChoice } from './game/GameLoop';
import { createGameUI } from './ui/GameUI';
import { createEventModal } from './ui/EventModal';

// ============================================================
// Инициализация Pixi.js приложения
// ============================================================

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

let worldContainer: Container;
let app: Application;

let navScale = 1;
let navOffsetX = 0;
let navOffsetY = 0;
const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetX = 0;
let dragStartOffsetY = 0;

async function initApp(): Promise<Application> {
  app = new Application();
  await app.init({
    width: canvasWidth,
    height: canvasHeight,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
  });

  const container = document.getElementById('canvas-container');
  if (container) {
    container.appendChild(app.canvas);
  } else {
    document.body.appendChild(app.canvas);
  }

  worldContainer = new Container();
  app.stage.addChild(worldContainer);

  setupNavigation(app);
  window.addEventListener('resize', onResize);

  return app;
}

let resizeTimeout: number;

function onResize(): void {
  clearTimeout(resizeTimeout);
  resizeTimeout = window.setTimeout(() => {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    app.renderer.resize(canvasWidth, canvasHeight);
    if (currentConfig && currentState) {
      reRenderHouse(currentConfig, currentState);
    }
  }, 150);
}

function setupNavigation(app: Application): void {
  const canvas = app.canvas;

  canvas.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - navOffsetX) / navScale;
    const worldY = (mouseY - navOffsetY) / navScale;

    const zoomFactor = 1.08;
    const delta = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, navScale * delta));

    navOffsetX = mouseX - worldX * newScale;
    navOffsetY = mouseY - worldY * newScale;
    navScale = newScale;

    applyTransform();
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e: PointerEvent) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartOffsetX = navOffsetX;
    dragStartOffsetY = navOffsetY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    navOffsetX = dragStartOffsetX + dx;
    navOffsetY = dragStartOffsetY + dy;
    applyTransform();
  });

  canvas.addEventListener('pointerup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.addEventListener('pointerleave', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
  });

  canvas.style.cursor = 'grab';

  (window as any).__resetNavigation = () => {
    navScale = 1;
    navOffsetX = 0;
    navOffsetY = 0;
    applyTransform();
  };
}

function applyTransform(): void {
  worldContainer.scale.set(navScale);
  worldContainer.x = navOffsetX;
  worldContainer.y = navOffsetY;
}

// ============================================================
// Рендер дома + игра
// ============================================================

let currentHouse: Container | null = null;
let currentConfig: Partial<HouseConfig> | null = null;
let currentState: GameState | null = null;

let gameUI: ReturnType<typeof createGameUI> | null = null;
let eventModal: ReturnType<typeof createEventModal> | null = null;
let pendingEvent: GameEventDef | null = null;

let bubbleContainer: Container | null = null;

function buildConfig(state: GameState): HouseConfig {
  const floorHeightsM: number[] = [2.5];
  switch (state.floors) {
    case 1:
      floorHeightsM.push(3.6);
      break;
    case 2:
      floorHeightsM.push(3.8, 3.4);
      break;
    case 3:
      floorHeightsM.push(3.8, 3.4, 3.0);
      break;
    case 4:
      floorHeightsM.push(4.0, 3.6, 3.2, 2.9);
      break;
    case 5:
    default:
      floorHeightsM.push(4.2, 3.8, 3.4, 3.1, 2.8);
      break;
  }

  const widthM = state.axes >= 7 ? 25 : 20;

  return {
    style: 'eclectic',
    floors: state.floors,
    axes: state.axes,
    widthM,
    floorHeightsM,
    roofType: 'hipped' as RoofType,
    seed: state.seed,
    balconyFloors: state.floors >= 4 ? [2] : state.floors >= 3 ? [2] : [],
    hasAttic: false,
  };
}

function reRenderHouse(config: Partial<HouseConfig>, state: GameState): void {
  if (currentHouse) {
    worldContainer.removeChild(currentHouse);
    currentHouse.destroy({ children: true });
  }
  if (bubbleContainer) {
    worldContainer.removeChild(bubbleContainer);
    bubbleContainer.destroy({ children: true });
  }
  if (worldContainer.children.length > 0) {
    worldContainer.removeChildAt(0);
  }

  currentHouse = generateHouse(config);
  if (!currentHouse) return;

  const bounds = currentHouse.getLocalBounds();
  const scaleX = (canvasWidth * 0.85) / bounds.width;
  const scaleY = (canvasHeight * 0.9) / bounds.height;
  const scale = Math.min(scaleX, scaleY);

  currentHouse.scale.set(scale);
  currentHouse.x = canvasWidth / 2 - (bounds.width * scale) / 2 - bounds.x * scale;
  currentHouse.y = canvasHeight * 0.95 - bounds.height * scale - bounds.y * scale;

  const bg = new Graphics();
  bg.rect(-5000, -5000, canvasWidth + 10000, canvasHeight + 10000).fill({ color: 0xc5d0d9 });
  bg.rect(-5000, -5000, canvasWidth + 10000, canvasHeight * 0.3 + 5000).fill({ color: 0xb0bec5, alpha: 0.5 });

  worldContainer.addChild(bg);
  worldContainer.addChild(currentHouse);

  // Баблы жильцов
  bubbleContainer = new Container();
  renderTenantBubbles(bubbleContainer, state, config as HouseConfig);
  worldContainer.addChild(bubbleContainer);

  navScale = 1;
  navOffsetX = 0;
  navOffsetY = 0;
  applyTransform();

  updateHouseInfo(state);
}

// ============================================================
// Баблы жильцов у окон
// ============================================================

function renderTenantBubbles(container: Container, state: GameState, config: HouseConfig): void {
  const houseW = config.widthM * METER_TO_PX;
  const axes = config.axes;
  const axleSpacing = houseW / (axes + 1);
  const floorHeightsM = config.floorHeightsM;

  for (const tenant of state.tenants) {
    const apt = state.apartments[tenant.apartmentIndex];
    if (!apt) continue;

    const axisX = axleSpacing * apt.axis;
    const rf = apt.floor - 1;

    let sumBefore = 0;
    for (let i = 0; i <= rf; i++) {
      sumBefore += floorHeightsM[i] || 2.5;
    }
    const currentFloorH = floorHeightsM[rf + 1] || 3.0;
    const windowCenterY = -(sumBefore + currentFloorH / 2) * METER_TO_PX;

    const bubble = createBubble(tenant.name);
    bubble.x = axisX;
    bubble.y = windowCenterY - 18;
    container.addChild(bubble);
  }
}

function createBubble(name: string): Container {
  const bubble = new Container();

  const style = new TextStyle({
    fontFamily: 'Inter, sans-serif',
    fontSize: 9,
    fill: '#e4e4ec',
    fontWeight: '500',
    align: 'center',
  });

  const text = new Text({ text: name, style });
  text.anchor.set(0.5, 0.5);

  const padX = 6;
  const padY = 3;
  const bw = text.width + padX * 2;
  const bh = text.height + padY * 2;

  const bg = new Graphics();
  bg.roundRect(-bw / 2, -bh / 2, bw, bh, 4);
  bg.fill({ color: 0x1a1a24, alpha: 0.82 });
  bg.roundRect(-bw / 2, -bh / 2, bw, bh, 4);
  bg.stroke({ color: 0xc9a96e, width: 1, alpha: 0.5 });

  // Хвостик вниз
  bg.moveTo(-3, bh / 2);
  bg.lineTo(0, bh / 2 + 5);
  bg.lineTo(3, bh / 2);
  bg.fill({ color: 0x1a1a24, alpha: 0.82 });

  bubble.addChild(bg);
  bubble.addChild(text);

  return bubble;
}

function updateHouseInfo(state: GameState): void {
  const floorsEl = document.getElementById('info-floors');
  const aptsEl = document.getElementById('info-apts');
  const tenantsEl = document.getElementById('info-tenants');
  if (floorsEl) floorsEl.textContent = `Этажей: ${state.floors}`;
  if (aptsEl) aptsEl.textContent = `Квартир: ${state.apartments.length}`;
  if (tenantsEl) tenantsEl.textContent = `Жильцов: ${state.tenants.length} (своб.: ${getFreeApartmentCount(state)})`;
}

function updateExpandButton(state: GameState): void {
  const expandBtn = document.getElementById('expand-btn') as HTMLButtonElement | null;
  if (!expandBtn) return;
  if (state.floors >= MAX_FLOORS) {
    expandBtn.disabled = true;
    expandBtn.textContent = '🏗 Этажей: макс.';
  } else if (state.money < FLOOR_EXPANSION_COST) {
    expandBtn.disabled = true;
    expandBtn.textContent = `🏗 Надстроить (${FLOOR_EXPANSION_COST} ₽)`;
  } else {
    expandBtn.disabled = false;
    expandBtn.textContent = `🏗 Надстроить этаж (${FLOOR_EXPANSION_COST} ₽)`;
  }
}

function doExpandFloors(): void {
  if (!currentState || !currentConfig) return;

  if (!canExpandFloors(currentState)) return;

  expandFloors(currentState);

  currentState.eventLog.push({
    turn: currentState.turn,
    text: `Надстроен ${currentState.floors}-й этаж! +${currentState.axes} квартир.`,
    type: 'system',
  });

  currentConfig = buildConfig(currentState);
  reRenderHouse(currentConfig, currentState);

  if (gameUI) {
    gameUI.updateResources(currentState);
    gameUI.updateLog(currentState.eventLog);
  }
  updateExpandButton(currentState);
}

// ============================================================
// Экспорт в PNG
// ============================================================

async function exportPNG(): Promise<void> {
  if (!currentHouse) return;

  const savedScale = navScale;
  const savedX = navOffsetX;
  const savedY = navOffsetY;

  navScale = 1;
  navOffsetX = 0;
  navOffsetY = 0;
  applyTransform();

  if (bubbleContainer) {
    bubbleContainer.visible = false;
  }

  const bg = worldContainer.children[0];
  worldContainer.removeChild(bg);

  app.renderer.render(app.stage);

  const exportCanvas = app.renderer.extract.canvas(app.stage);

  if (bubbleContainer) {
    bubbleContainer.visible = true;
  }
  if (bg) worldContainer.addChildAt(bg, 0);
  navScale = savedScale;
  navOffsetX = savedX;
  navOffsetY = savedY;
  applyTransform();

  const dataUrl = (exportCanvas as HTMLCanvasElement).toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `petersburg-house-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}

// ============================================================
// Игровой цикл
// ============================================================

function executeTurn(): void {
  if (!currentState || !gameUI) return;

  const gameOver = isGameOver(currentState);
  if (gameOver) {
    gameUI.showGameOver(gameOver);
    return;
  }

  gameUI.setTurnEnabled(false);

  const result = processTurnPhases(currentState);

  if (!currentState) return;

  currentState.turn++;

  currentState.eventLog.push(...result.logEntries);
  gameUI.updateLog(currentState.eventLog);

  gameUI.updateResources(currentState);
  updateHouseInfo(currentState);
  updateExpandButton(currentState);

  if (result.event && result.event.requiresInput) {
    pendingEvent = result.event;
    const desc = buildEventDescription(result.event, currentState);
    eventModal!.show(result.event, desc, (choice) => {
      if (!currentState) return;

      const eventRes = applyEventChoice(currentState, result.event!, choice);
      currentState.eventLog.push({
        turn: currentState.turn,
        text: eventRes.message,
        type: 'event',
      });

      refreshBubbles();

      gameUI!.updateLog(currentState.eventLog);
      gameUI!.updateResources(currentState);
      updateHouseInfo(currentState);

      pendingEvent = null;
      eventModal!.hide();

      finishTurn();
    });
  } else {
    if (result.eventResult?.tenantChange) {
      refreshBubbles();
    }
    finishTurn();
  }
}

function refreshBubbles(): void {
  if (!currentState || !currentConfig) return;
  if (bubbleContainer) {
    worldContainer.removeChild(bubbleContainer);
    bubbleContainer.destroy({ children: true });
  }
  bubbleContainer = new Container();
  renderTenantBubbles(bubbleContainer, currentState, currentConfig as HouseConfig);
  worldContainer.addChild(bubbleContainer);
}

function finishTurn(): void {
  if (!currentState || !gameUI) return;

  const gameOver = isGameOver(currentState);
  if (gameOver) {
    gameUI.showGameOver(gameOver);
    return;
  }

  gameUI.setTurnEnabled(true);
  updateExpandButton(currentState);
}

function buildEventDescription(event: GameEventDef, state: GameState): string {
  let desc = event.description;
  if (state.tenants.length > 0) {
    const randomTenant = state.tenants[Math.floor(Math.random() * state.tenants.length)];
    desc = desc.replace('{name}', randomTenant.name);
    desc = desc.replace('{apt}', String(randomTenant.apartmentIndex + 1));
  }
  return desc;
}

// ============================================================
// Запуск
// ============================================================

function startNewGame(): void {
  const seed = randomSeed();
  const floors = 3;
  const axes = 5;

  currentState = createInitialState(floors, axes, seed);
  currentConfig = buildConfig(currentState);

  reRenderHouse(currentConfig, currentState);

  if (gameUI) {
    gameUI.updateResources(currentState);
    gameUI.updateLog(currentState.eventLog);
    gameUI.setTurnEnabled(true);
    updateHouseInfo(currentState);
    updateExpandButton(currentState);
  }
}

async function main(): Promise<void> {
  await initApp();

  gameUI = createGameUI();
  eventModal = createEventModal();

  gameUI.setTurnCallback(() => {
    executeTurn();
  });

  startNewGame();

  // Кнопка расширения
  const expandBtn = document.getElementById('expand-btn');
  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      doExpandFloors();
    });
  }

  // Кнопка экспорта
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportPNG();
    });
  }

  // Горячия клавиши
  document.addEventListener('keydown', (e) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      exportPNG();
    }
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
      (window as any).__resetNavigation();
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      executeTurn();
    }
  });
}

main().catch(console.error);
