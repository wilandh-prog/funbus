import './styles/main.css';
import './styles/game.css';
import './styles/panels.css';
import './styles/city-selection.css';

import { GameEngine } from './core/GameEngine';
import { Renderer } from './rendering/Renderer';
import { StatsCalculator } from './ui/StatsCalculator';
import { GRID_SIZE, COLS, ROWS, MOBILE_STOP_TOUCH_RADIUS } from './config/constants';
import { CitySelectionMenu } from './ui/CitySelectionMenu';
import { ProgressionStorage, type ProgressionData } from './storage/ProgressionStorage';
import { CITIES } from './config/cities';
import { serializeGameState, restoreGameState } from './utils/GameStateSerializer';
import { TouchHandler } from './utils/TouchHandler';
import { confirmDelete, confirmClear } from './ui/ConfirmDialog';
import { initCollapsibleSections } from './ui/CollapsibleSections';
import { gameToasts } from './ui/Toast';
import { startTutorial, shouldShowTutorial, resetTutorial } from './ui/Tutorial';

const MAX_STOPS = 40;

/**
 * Main application entry point
 */
async function main() {
  console.log('🚌 Bus Simulator starting...');

  // Load progression data
  const progression = ProgressionStorage.load();
  console.log('✓ Progression loaded');

  // Show city selection menu
  showCitySelectionMenu(progression);
}

/**
 * Show city selection menu
 */
function showCitySelectionMenu(progression: ProgressionData) {
  const menu = new CitySelectionMenu(CITIES, progression, {
    onCitySelected: (cityId, startFresh = false) => {
      menu.hide();
      startGame(cityId, progression, startFresh);
    },
    onResetProgress: () => {
      ProgressionStorage.clear();
      const newProgression = ProgressionStorage.load();
      menu.progression = newProgression;
    },
  });

  menu.show();
  console.log('✓ City selection menu shown');
}

/**
 * Sync UI controls with current game state
 */
function syncUIWithGameState(gameEngine: GameEngine) {
  const state = gameEngine.getState();

  // Update canvas class for direct mode
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    if (state.interactionMode === 'direct') {
      canvas.classList.add('direct-mode');
    } else {
      canvas.classList.remove('direct-mode');
    }
  }
}

/**
 * Start the game with selected city
 */
async function startGame(cityId: string, progression: ProgressionData, startFresh: boolean = false) {
  console.log(`Starting game with city: ${cityId}${startFresh ? ' (fresh start)' : ''}`);

  // Get canvas element
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Initialize renderer
  const renderer = new Renderer(canvas);
  console.log('Loading sprites...');
  await renderer.loadSprites();
  console.log('✓ Sprites loaded');

  // Initialize game engine WITH CITY ID
  const gameEngine = new GameEngine(cityId);
  console.log('✓ Game engine initialized');

  // Initialize stats calculator
  const statsCalculator = new StatsCalculator();

  // Check for saved state and restore, or create fresh game
  const savedState = !startFresh ? ProgressionStorage.getSavedGameState(progression, cityId) : null;
  if (savedState) {
    console.log('Restoring saved game state...');
    restoreGameState(gameEngine, savedState);
  } else {
    console.log('Starting fresh game...');
    // Create initial route
    gameEngine.addRoute();
  }

  // Sync UI controls with restored game state
  syncUIWithGameState(gameEngine);

  // Set up UI event handlers WITH RETURN TO MENU CALLBACK
  const uiHandlers = setupUIHandlers(gameEngine, renderer, statsCalculator, {
    onReturnToMenu: () => {
      // Calculate final score
      const state = gameEngine.getState();
      const score = statsCalculator.calculateScore(state);
      console.log(`Final score: ${score}`);

      // Save progression before showing old data
      const oldData = { ...progression };

      // Save current game state
      const currentState = serializeGameState(state);
      ProgressionStorage.saveGameState(progression, cityId, currentState);

      // Update high score
      const isNewHighScore = ProgressionStorage.updateHighScore(progression, cityId, score);
      ProgressionStorage.save(progression);

      // Check for newly unlocked cities
      const newlyUnlocked = ProgressionStorage.getNewlyUnlockedCities(oldData, progression, CITIES);

      // Stop game
      gameEngine.stop();

      // Show notifications
      if (isNewHighScore) {
        setTimeout(() => {
          alert(`🎉 New High Score: ${score}!`);
        }, 100);
      }

      if (newlyUnlocked.length > 0) {
        setTimeout(() => {
          const cityNames = newlyUnlocked.map((c) => c.name).join(', ');
          alert(`🔓 New Cities Unlocked: ${cityNames}!`);
        }, isNewHighScore ? 300 : 100);
      }

      // Return to menu
      setTimeout(() => {
        showCitySelectionMenu(progression);
      }, (isNewHighScore ? 300 : 0) + (newlyUnlocked.length > 0 ? 300 : 0) + 100);
    },
  });

  // Start game loop
  gameEngine.start(() => {
    const state = gameEngine.getState();
    uiHandlers.update(); // Update edge panning
    const camera = uiHandlers.getCamera();
    renderer.render(state, camera);
    updateUI(gameEngine, statsCalculator); // Update UI every frame
  });

  console.log('✓ Game started!');

  // Show tutorial for first-time users (after a short delay to let the game render)
  if (shouldShowTutorial()) {
    setTimeout(() => {
      // Pause the game during tutorial
      if (!gameEngine.isPaused()) {
        gameEngine.togglePause();
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
          pauseBtn.textContent = '▶ Play';
          pauseBtn.classList.add('paused');
        }
      }
      startTutorial(() => {
        // Resume game after tutorial
        if (gameEngine.isPaused()) {
          gameEngine.togglePause();
          const pauseBtn = document.getElementById('pause-btn');
          if (pauseBtn) {
            pauseBtn.textContent = '⏸ Pause';
            pauseBtn.classList.remove('paused');
          }
        }
      });
    }, 500);
  }
}

// Track last cursor position for money spent indicator
let lastCursorX = 0;
let lastCursorY = 0;

// Update cursor position on mouse move
document.addEventListener('mousemove', (e) => {
  lastCursorX = e.clientX;
  lastCursorY = e.clientY;
});

/**
 * Show visual feedback when money is spent
 */
function showMoneySpent(amount: number) {
  // Create floating text element
  const floatingText = document.createElement('div');
  floatingText.className = 'money-spent-indicator';
  floatingText.textContent = `-$${amount}`;

  // Position it at cursor location (or center of screen if no cursor tracked)
  floatingText.style.position = 'fixed';
  floatingText.style.left = `${lastCursorX || window.innerWidth / 2}px`;
  floatingText.style.top = `${lastCursorY || window.innerHeight / 2}px`;
  floatingText.style.zIndex = '10000';

  document.body.appendChild(floatingText);

  // Trigger animation
  requestAnimationFrame(() => {
    floatingText.classList.add('animate');
  });

  // Remove after animation
  setTimeout(() => {
    floatingText.remove();
  }, 1000);
}

/**
 * Update UI stats
 */
function updateUI(gameEngine: GameEngine, statsCalculator: StatsCalculator) {
  const state = gameEngine.getState();
  const activeRoute = state.routes[state.activeRouteIndex];
  const activeStops = activeRoute ? activeRoute.stops.length : 0;
  const activeBuses = activeRoute ? activeRoute.buses.length : 0;

  // Active route stats
  document.getElementById('stopsCount')!.textContent = `${activeStops} / ${MAX_STOPS}`;
  document.getElementById('busCount')!.textContent = activeBuses.toString();

  // Active route efficiency
  const activeRouteEfficiency = activeRoute ? statsCalculator.calculateSingleRouteEfficiency(activeRoute) : 0;
  document.getElementById('activeRouteEfficiency')!.textContent = Math.round(activeRouteEfficiency * 100) + '%';

  // Total network stats
  const waitingNPCs = state.npcs.filter((n) => n.state === 'waiting').length;
  const travelingNPCs = state.npcs.filter((n) => n.state === 'traveling').length;
  document.getElementById('npcCount')!.textContent = `${waitingNPCs} / ${travelingNPCs}`;
  document.getElementById('tripsCount')!.textContent = state.stats.tripsCompleted.toString();

  const avgWaitTime =
    state.stats.tripsCompleted > 0
      ? (state.stats.totalWaitTime / state.stats.tripsCompleted).toFixed(1)
      : '0';
  document.getElementById('avgWaitTime')!.textContent = avgWaitTime + 's';

  const avgTransportTime =
    state.stats.tripsCompleted > 0
      ? (state.stats.totalTransportTime / state.stats.tripsCompleted).toFixed(1)
      : '0';
  document.getElementById('avgTransportTime')!.textContent = avgTransportTime + 's';

  document.getElementById('gaveUpCount')!.textContent = state.stats.npcsGaveUp.toString();

  // Update coverage
  const coverage = statsCalculator.calculateCoverage(state);
  document.getElementById('coverage')!.textContent = Math.round(coverage * 100) + '%';

  // Update route efficiency
  const efficiency = statsCalculator.calculateRouteEfficiency(state);
  document.getElementById('routeEfficiency')!.textContent = Math.round(efficiency * 100) + '%';

  // Update score
  const score = statsCalculator.calculateScore(state);
  document.getElementById('overallScore')!.textContent = score.toString();

  // Update time of day
  const hours = Math.floor(state.timeOfDay * 24);
  const minutes = Math.floor((state.timeOfDay * 24 * 60) % 60);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  document.getElementById('timeOfDay')!.textContent = timeString;

  // Update traffic level display
  const trafficLevel = document.getElementById('trafficLevel');
  if (trafficLevel) {
    const density = state.trafficDensity;
    let levelText = '';
    let levelColor = '';

    if (density >= 0.8) {
      levelText = 'Heavy Traffic';
      levelColor = '#f87171'; // red
    } else if (density >= 0.6) {
      levelText = 'Moderate Traffic';
      levelColor = '#fbbf24'; // yellow
    } else if (density >= 0.4) {
      levelText = 'Normal Traffic';
      levelColor = '#4ade80'; // green
    } else {
      levelText = 'Light Traffic';
      levelColor = '#60a5fa'; // blue
    }

    trafficLevel.textContent = levelText;
    trafficLevel.style.color = levelColor;
  }

  // Update top bar money with visual feedback for money spent
  const currentMoney = Math.floor(state.economics.money);
  const topBarMoneyElement = document.getElementById('topBarMoney')!;
  const previousMoney = parseInt(topBarMoneyElement.textContent?.replace('$', '') || '0');

  topBarMoneyElement.textContent = '$' + currentMoney.toString();

  // Color code based on money level
  if (currentMoney < 1000) {
    topBarMoneyElement.style.color = '#f87171'; // Red - danger
  } else if (currentMoney < 3000) {
    topBarMoneyElement.style.color = '#fbbf24'; // Yellow - warning
  } else {
    topBarMoneyElement.style.color = '#4ade80'; // Green - good
  }

  // Show floating text when money is spent (only for significant purchases, not small running costs)
  if (currentMoney < previousMoney) {
    const amountSpent = previousMoney - currentMoney;
    if (amountSpent >= 10) { // Only show for purchases $10 or more
      showMoneySpent(amountSpent);
    }
  }

  // Update detailed Income Statement (P&L)
  document.getElementById('ticketIncome')!.textContent = '$' + Math.floor(state.economics.totalIncome).toString();
  document.getElementById('totalIncome')!.textContent = '$' + Math.floor(state.economics.totalIncome).toString();

  document.getElementById('busRunningCost')!.textContent = '$' + Math.floor(state.economics.busRunningCosts).toString();
  document.getElementById('depreciation')!.textContent = '$' + Math.floor(state.economics.depreciation).toString();
  document.getElementById('interestExpense')!.textContent = '$' + Math.floor(state.economics.loanInterestExpense).toString();
  document.getElementById('totalExpenses')!.textContent = '$' + Math.floor(state.economics.totalExpenses).toString();

  const netProfit = state.economics.totalIncome - state.economics.totalExpenses;
  const netProfitElement = document.getElementById('netProfit')!;
  netProfitElement.textContent = '$' + Math.floor(netProfit).toString();
  netProfitElement.style.color = netProfit >= 0 ? '#4ade80' : '#f87171';

  // Update balance sheet info
  const bookValue = state.economics.totalCapitalInvested - state.economics.depreciation;
  const bookValueElement = document.getElementById('bookValue')!;
  bookValueElement.textContent = '$' + Math.floor(bookValue).toString();
  bookValueElement.style.color = bookValue > 0 ? '#4ade80' : '#888';

  const equity = gameEngine.getEquity();
  const equityElement = document.getElementById('equity')!;
  equityElement.textContent = '$' + Math.floor(equity).toString();
  if (equity > 3000) {
    equityElement.style.color = '#4ade80'; // Green - strong
  } else if (equity > 0) {
    equityElement.style.color = '#fbbf24'; // Yellow - weak
  } else {
    equityElement.style.color = '#f87171'; // Red - negative equity!
  }

  // Update loan info
  const loanBalanceElement = document.getElementById('loanBalance')!;
  loanBalanceElement.textContent = '$' + Math.floor(state.economics.loan).toString();
  loanBalanceElement.style.color = state.economics.loan > 0 ? '#f87171' : '#888';

  const availableLoanElement = document.getElementById('availableLoan')!;
  const availableLoan = gameEngine.getAvailableLoan();
  availableLoanElement.textContent = '$' + Math.floor(availableLoan).toString();
  availableLoanElement.style.color = availableLoan > 0 ? '#4ade80' : '#888';

  // Update score color based on quality
  const scoreElement = document.getElementById('overallScore')!;
  if (score >= 70) {
    scoreElement.style.color = '#4ade80'; // green
  } else if (score >= 40) {
    scoreElement.style.color = '#fbbf24'; // yellow
  } else {
    scoreElement.style.color = '#f87171'; // red
  }

  // Update loan button states
  const borrowBtn = document.getElementById('borrowBtn') as HTMLButtonElement | null;
  const repayBtn = document.getElementById('repayBtn') as HTMLButtonElement | null;

  if (borrowBtn && repayBtn) {
    const availableLoan = gameEngine.getAvailableLoan();
    borrowBtn.disabled = availableLoan < 500;
    repayBtn.disabled = state.economics.loan < 500 || state.economics.money < 500;
  }
}

/**
 * Set up UI event handlers
 */
interface UICallbacks {
  onReturnToMenu?: () => void;
}

function setupUIHandlers(
  gameEngine: GameEngine,
  renderer: Renderer,
  statsCalculator: StatsCalculator,
  callbacks?: UICallbacks
) {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

  // Mini menu state
  const miniMenu = document.getElementById('miniMenu')!;
  const selectStopBtn = document.getElementById('selectStopBtn')!;
  const addStopBtn = document.getElementById('addStopBtn')!;
  const moveStopBtn = document.getElementById('moveStopBtn')!;
  const deleteStopBtn = document.getElementById('deleteStopBtn')!;

  let currentMenuGridX = -1;
  let currentMenuGridY = -1;
  let isHoveringMenu = false;

  // Drag state for Option 2 (direct mode)
  let dragState: {
    active: boolean;
    stopIndex: number | null;
    routeIndex: number | null;
    startX: number;
    startY: number;
    currentGridX: number;
    currentGridY: number;
    justFinishedDrag: boolean;
    hasMoved: boolean;
  } = {
    active: false,
    stopIndex: null,
    routeIndex: null,
    startX: -1,
    startY: -1,
    currentGridX: -1,
    currentGridY: -1,
    justFinishedDrag: false,
    hasMoved: false,
  };

  // Camera state for panning and zooming
  let camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
  };

  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3.0;
  const ZOOM_STEP = 0.15;

  // Panning state
  let panState: {
    active: boolean;
    startX: number;
    startY: number;
    startCameraX: number;
    startCameraY: number;
  } = {
    active: false,
    startX: 0,
    startY: 0,
    startCameraX: 0,
    startCameraY: 0,
  };

  // Edge panning state
  const EDGE_PAN_THRESHOLD = 50; // pixels from edge to trigger panning
  const EDGE_PAN_SPEED = 8; // pixels per frame
  let edgePanVelocity = { x: 0, y: 0 };
  let lastMousePos = { x: 0, y: 0 };
  let isScrollingUI = false;

  /**
   * Helper function to convert mouse coordinates to canvas coordinates
   */
  function getCanvasCoordinates(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = ((e.clientX - rect.left) * scaleX - camera.x) / camera.zoom;
    const y = ((e.clientY - rect.top) * scaleY - camera.y) / camera.zoom;
    return { x, y };
  }

  /**
   * Update mini menu position and button states
   */
  function updateMiniMenu(clientX: number, clientY: number, gridX: number, gridY: number) {
    const state = gameEngine.getState();
    currentMenuGridX = gridX;
    currentMenuGridY = gridY;
    renderer.getUILayer().setMenuTargetCell(gridX, gridY);

    const activeRoute = state.routes[state.activeRouteIndex];

    // Check if stop exists at this position in active route
    const stopExists = activeRoute.stops.some((s) => s.x === gridX && s.y === gridY);
    const stopIndexAtLocation = activeRoute.stops.findIndex(
      (s) => s.x === gridX && s.y === gridY
    );

    // Check if a stop is currently selected
    const stopSelected = state.selectedStopIndex !== null && state.selectedStopIndex !== -1;
    const selectedStop = stopSelected ? activeRoute.stops[state.selectedStopIndex] : null;
    const hoveringSelectedStop = selectedStop && selectedStop.x === gridX && selectedStop.y === gridY;
    const isStopAlreadySelected = stopIndexAtLocation === state.selectedStopIndex;

    // Update button states and visibility
    (selectStopBtn as HTMLButtonElement).disabled = !stopExists || isStopAlreadySelected;
    selectStopBtn.style.display = stopExists ? 'block' : 'none';
    if (isStopAlreadySelected) {
      selectStopBtn.textContent = '◉ Selected';
    } else {
      selectStopBtn.textContent = '◉ Select Stop';
    }

    (addStopBtn as HTMLButtonElement).disabled =
      stopExists || activeRoute.stops.length >= MAX_STOPS;
    addStopBtn.style.display = stopExists ? 'none' : 'block';

    (moveStopBtn as HTMLButtonElement).disabled =
      !stopSelected || hoveringSelectedStop || stopExists;
    moveStopBtn.style.display = stopSelected && !hoveringSelectedStop ? 'block' : 'none';

    (deleteStopBtn as HTMLButtonElement).disabled = !stopExists;
    deleteStopBtn.style.display = stopExists ? 'block' : 'none';

    // Position menu near cursor
    const offsetX = 15;
    const offsetY = 15;
    let menuX = clientX + offsetX;
    let menuY = clientY + offsetY;

    // Keep menu in viewport
    const menuRect = miniMenu.getBoundingClientRect();
    if (menuX + menuRect.width > window.innerWidth) {
      menuX = clientX - menuRect.width - offsetX;
    }
    if (menuY + menuRect.height > window.innerHeight) {
      menuY = clientY - menuRect.height - offsetY;
    }

    miniMenu.style.left = menuX + 'px';
    miniMenu.style.top = menuY + 'px';
    miniMenu.style.display = 'block';
  }

  /**
   * Hide mini menu
   */
  function hideMiniMenu() {
    // Don't hide if user is hovering over the menu
    if (isHoveringMenu) return;

    miniMenu.style.display = 'none';
    currentMenuGridX = -1;
    currentMenuGridY = -1;
    renderer.getUILayer().setMenuTargetCell(-1, -1);
  }

  /**
   * Update route tabs UI
   */
  function updateRouteTabs() {
    const state = gameEngine.getState();
    const tabsContainer = document.getElementById('routeTabs')!;
    tabsContainer.innerHTML = '';

    state.routes.forEach((route, index) => {
      const tab = document.createElement('button');
      const isActive = index === state.activeRouteIndex;

      tab.textContent = `${isActive ? '▶ ' : ''}Route ${index + 1} (${route.stops.length})`;
      tab.style.padding = isActive ? '8px 12px' : '6px 10px';
      tab.style.background = isActive ? route.color : '#3a3a3a';
      tab.style.color = '#fff';
      tab.style.border = isActive ? `2px solid #ffffff` : `2px solid ${route.color}`;
      tab.style.cursor = 'pointer';
      tab.style.fontFamily = "'Courier New', monospace";
      tab.style.fontSize = isActive ? '11px' : '10px';
      tab.style.borderRadius = '4px';
      tab.style.fontWeight = isActive ? 'bold' : 'normal';
      tab.style.boxShadow = isActive ? '0 0 12px ' + route.color : 'none';
      tab.style.transform = isActive ? 'scale(1.05)' : 'scale(1)';
      tab.style.transition = 'all 0.2s ease';
      tab.style.position = 'relative';
      tab.style.zIndex = isActive ? '10' : '1';

      tab.addEventListener('click', () => {
        gameEngine.setActiveRoute(index);
        updateRouteTabs();
        updateStopList();
        updateBusCount();
      });

      tabsContainer.appendChild(tab);
    });
  }

  /**
   * Update delete stop button state based on selection
   */
  function updateDeleteStopButton() {
    const state = gameEngine.getState();
    const hasSelectedStop = state.selectedStopIndex !== null && state.selectedStopIndex !== -1;
    const hasRoute = state.routes.length > 0;

    const deleteStopTopBtn = document.getElementById('deleteStopTopBtn') as HTMLButtonElement;
    if (deleteStopTopBtn) {
      deleteStopTopBtn.disabled = !hasSelectedStop || !hasRoute;
      if (hasSelectedStop && hasRoute) {
        const stopNum = state.selectedStopIndex + 1;
        deleteStopTopBtn.textContent = `Delete Stop ${stopNum}`;
      } else {
        deleteStopTopBtn.textContent = 'Delete Stop';
      }
    }
  }

  /**
   * Update stop list UI
   */
  function updateStopList() {
    const state = gameEngine.getState();
    const stopListContainer = document.getElementById('stopList')!;
    const stopCountDisplay = document.getElementById('stopCountDisplay')!;
    const clearAllBtn = document.getElementById('clearAllBtn') as HTMLButtonElement;

    if (state.routes.length === 0) {
      stopListContainer.innerHTML =
        '<div style="color: #888; font-size: 12px; padding: 10px;">No route selected</div>';
      stopCountDisplay.textContent = '0 / 40';
      clearAllBtn.disabled = true;
      return;
    }

    const activeRoute = state.routes[state.activeRouteIndex];
    stopCountDisplay.textContent = `${activeRoute.stops.length} / ${MAX_STOPS}`;
    clearAllBtn.disabled = activeRoute.stops.length === 0;

    if (activeRoute.stops.length === 0) {
      stopListContainer.innerHTML =
        '<div style="color: #888; font-size: 12px; padding: 10px;">No stops added yet. Click on roads to add stops.</div>';
      return;
    }

    stopListContainer.innerHTML = '';
    stopListContainer.style.display = 'flex';
    stopListContainer.style.flexDirection = 'column';
    stopListContainer.style.gap = '5px';
    stopListContainer.style.maxHeight = '200px';
    stopListContainer.style.overflowY = 'auto';
    stopListContainer.style.marginBottom = '10px';

    activeRoute.stops.forEach((stop, index) => {
      const stopItem = document.createElement('div');
      stopItem.className =
        'stop-item' + (index === state.selectedStopIndex ? ' selected' : '');

      const stopInfo = document.createElement('div');
      stopInfo.className = 'stop-item-info';

      const stopNumber = document.createElement('span');
      stopNumber.className = 'stop-number';
      stopNumber.textContent = `Stop ${index + 1}`;

      const stopCoords = document.createElement('span');
      stopCoords.className = 'stop-coords';
      stopCoords.textContent = `(${stop.x}, ${stop.y})`;

      stopInfo.appendChild(stopNumber);
      stopInfo.appendChild(stopCoords);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'stop-delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeStop(index);
      });

      stopItem.appendChild(stopInfo);
      stopItem.appendChild(deleteBtn);

      // Click to select/deselect stop
      stopItem.addEventListener('click', () => {
        gameEngine.setActiveRoute(state.activeRouteIndex);
        if (state.selectedStopIndex === index) {
          // Deselect
          const newState = gameEngine.getState();
          (newState as any).selectedStopIndex = null;
        } else {
          // Select
          const newState = gameEngine.getState();
          (newState as any).selectedStopIndex = index;
        }
        updateStopList();
      });

      stopListContainer.appendChild(stopItem);
    });

    // Update delete stop button state
    updateDeleteStopButton();
  }

  /**
   * Remove a specific stop
   */
  function removeStop(stopIndex: number) {
    const state = gameEngine.getState();
    if (state.routes.length === 0) return;

    const activeRoute = state.routes[state.activeRouteIndex];
    activeRoute.stops.splice(stopIndex, 1);

    // Adjust selectedStopIndex if needed
    if (state.selectedStopIndex === stopIndex) {
      (state as any).selectedStopIndex = null;
    } else if (
      state.selectedStopIndex !== null &&
      state.selectedStopIndex > stopIndex
    ) {
      (state as any).selectedStopIndex--;
    }

    // Reset bus paths
    activeRoute.buses.forEach((bus) => {
      bus.path = [];
      bus.pathIndex = 0;

      // Adjust currentStopIndex if needed
      if (activeRoute.stops.length === 0) {
        bus.currentStopIndex = 0;
      } else if (bus.currentStopIndex >= activeRoute.stops.length) {
        bus.currentStopIndex = 0;
      }
    });

    // Update NPC nearest stops
    state.npcs.forEach((npc) => {
      if (npc.state === 'waiting') {
        npc.nearestStop = null;
        npc.atStop = false;
      }
    });

    gameEngine.updateSpatialIndex();
    updateRouteTabs();
    updateStopList();
  }

  /**
   * Clear all stops from active route
   */
  function clearAllStops() {
    const state = gameEngine.getState();
    if (state.routes.length === 0) return;

    const activeRoute = state.routes[state.activeRouteIndex];

    // Return all passengers from all buses back to waiting
    activeRoute.buses.forEach((bus) => {
      if (bus.passengers.length > 0) {
        bus.passengers.forEach((passenger) => {
          passenger.state = 'waiting';
          passenger.waitTime = 0;
          passenger.nearestStop = null;
          passenger.atStop = false;
          passenger.destinationStop = undefined;
          passenger.finalDestinationStop = undefined;
        });
        bus.passengers = [];
      }
    });

    activeRoute.stops = [];
    (state as any).selectedStopIndex = null;

    // Reset all buses
    activeRoute.buses.forEach((bus) => {
      bus.path = [];
      bus.pathIndex = 0;
      bus.currentStopIndex = 0;
    });

    // Update NPC nearest stops
    state.npcs.forEach((npc) => {
      if (npc.state === 'waiting') {
        npc.nearestStop = null;
        npc.atStop = false;
      }
    });

    gameEngine.updateSpatialIndex();
    updateRouteTabs();
    updateStopList();
  }

  /**
   * Handle click in direct interaction mode (Option 2)
   */
  function handleDirectModeClick(gridX: number, gridY: number) {
    const state = gameEngine.getState();
    const activeRoute = state.routes[state.activeRouteIndex];

    // Hide mini menu when clicking anywhere on canvas
    isHoveringMenu = false;
    hideMiniMenu();

    // Check if the active route already has a stop here
    const activeRouteStopIndex = activeRoute.stops.findIndex(
      (s) => s.x === gridX && s.y === gridY
    );

    // If the active route already has a stop here, just select it
    if (activeRouteStopIndex !== -1) {
      // Only select if we didn't just drag
      if (!dragState.justFinishedDrag) {
        (state as any).selectedStopIndex = activeRouteStopIndex;
        updateStopList();
      }
      dragState.justFinishedDrag = false;
      return;
    }

    // Clicking on location - clear the drag flag
    dragState.justFinishedDrag = false;

    // Add new stop
    if (activeRoute.stops.length < MAX_STOPS) {
      const success = gameEngine.addStopToRoute(state.activeRouteIndex, gridX, gridY);
      if (!success) {
        gameToasts.notEnoughMoney(100);
        return;
      }

      // Initialize first bus position if first stop (centered on grid)
      if (activeRoute.stops.length === 1 && activeRoute.buses.length > 0) {
        activeRoute.buses[0].x = gridX * GRID_SIZE + GRID_SIZE / 2;
        activeRoute.buses[0].y = gridY * GRID_SIZE + GRID_SIZE / 2;
      }

      // Reset all bus paths
      activeRoute.buses.forEach((bus) => {
        bus.path = [];
        bus.pathIndex = 0;
      });

      gameEngine.updateSpatialIndex();
      updateRouteTabs();
      updateStopList();

      gameToasts.stopAdded(activeRoute.stops.length);
    } else {
      gameToasts.maxStopsReached();
    }
  }

  /**
   * Show menu for selecting which route to interact with when multiple routes have stops at location
   */
  function showMultiRouteConflictMenu(
    clientX: number,
    clientY: number,
    _gridX: number,
    _gridY: number,
    conflictingStops: Array<{ routeIndex: number; route: any; stopIndex: number }>
  ) {
    const state = gameEngine.getState();

    // Create temporary menu container
    let conflictMenu = document.getElementById('routeConflictMenu') as HTMLDivElement;
    if (!conflictMenu) {
      conflictMenu = document.createElement('div');
      conflictMenu.id = 'routeConflictMenu';
      conflictMenu.className = 'conflict-menu';
      document.body.appendChild(conflictMenu);
    }

    // Clear previous content
    conflictMenu.innerHTML = '';

    // Add header
    const header = document.createElement('div');
    header.className = 'conflict-menu-header';
    header.textContent = 'Multiple routes at this location:';
    conflictMenu.appendChild(header);

    // Add button for each route
    conflictingStops.forEach(({ routeIndex, route, stopIndex }) => {
      const btn = document.createElement('button');
      btn.className = 'conflict-route-btn';
      btn.style.borderLeftColor = route.color;
      btn.textContent = `Route ${routeIndex + 1} - Stop ${stopIndex + 1}`;

      btn.addEventListener('click', () => {
        // Switch to this route and select the stop
        gameEngine.setActiveRoute(routeIndex);
        (state as any).selectedStopIndex = stopIndex;
        updateRouteTabs();
        updateStopList();
        conflictMenu.style.display = 'none';
        console.log(`Selected route ${routeIndex + 1}, stop ${stopIndex + 1}`);
      });

      conflictMenu.appendChild(btn);
    });

    // Add cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'conflict-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      conflictMenu.style.display = 'none';
    });
    conflictMenu.appendChild(cancelBtn);

    // Position menu
    const offsetX = 15;
    const offsetY = 15;
    let menuX = clientX + offsetX;
    let menuY = clientY + offsetY;

    // Keep menu in viewport
    const menuRect = conflictMenu.getBoundingClientRect();
    if (menuX + menuRect.width > window.innerWidth) {
      menuX = clientX - menuRect.width - offsetX;
    }
    if (menuY + menuRect.height > window.innerHeight) {
      menuY = clientY - menuRect.height - offsetY;
    }

    conflictMenu.style.left = menuX + 'px';
    conflictMenu.style.top = menuY + 'px';
    conflictMenu.style.display = 'block';
  }

  /**
   * Handle right-click in direct interaction mode - show menu on stops only
   */
  function handleDirectModeRightClick(
    clientX: number,
    clientY: number,
    gridX: number,
    gridY: number
  ) {
    const state = gameEngine.getState();

    // Find all stops at this location across all routes
    const stopsAtLocation = state.routes
      .map((route, routeIndex) => ({
        routeIndex,
        route,
        stopIndex: route.stops.findIndex((s) => s.x === gridX && s.y === gridY),
      }))
      .filter((result) => result.stopIndex !== -1);

    if (stopsAtLocation.length === 0) {
      // No stop here - don't show menu
      return;
    }

    if (stopsAtLocation.length === 1) {
      // Single stop - show delete menu for it
      const { routeIndex, stopIndex } = stopsAtLocation[0];
      gameEngine.setActiveRoute(routeIndex);
      (state as any).selectedStopIndex = stopIndex;
      updateRouteTabs();
      updateStopList();

      // Show simplified menu with only delete option
      currentMenuGridX = gridX;
      currentMenuGridY = gridY;
      renderer.getUILayer().setMenuTargetCell(gridX, gridY);

      // Hide all buttons except delete
      selectStopBtn.style.display = 'none';
      addStopBtn.style.display = 'none';
      moveStopBtn.style.display = 'none';
      deleteStopBtn.style.display = 'block';
      (deleteStopBtn as HTMLButtonElement).disabled = false;

      // Position menu
      const offsetX = 15;
      const offsetY = 15;
      let menuX = clientX + offsetX;
      let menuY = clientY + offsetY;

      const menuRect = miniMenu.getBoundingClientRect();
      if (menuX + menuRect.width > window.innerWidth) {
        menuX = clientX - menuRect.width - offsetX;
      }
      if (menuY + menuRect.height > window.innerHeight) {
        menuY = clientY - menuRect.height - offsetY;
      }

      miniMenu.style.left = menuX + 'px';
      miniMenu.style.top = menuY + 'px';
      miniMenu.style.display = 'block';
    } else {
      // Multiple stops - show conflict resolution menu
      showMultiRouteConflictMenu(clientX, clientY, gridX, gridY, stopsAtLocation);
    }
  }

  // Return to menu button
  const returnToMenuBtn = document.getElementById('return-to-menu-btn');
  if (returnToMenuBtn && callbacks?.onReturnToMenu) {
    // Remove any existing listeners by cloning the button
    const newReturnBtn = returnToMenuBtn.cloneNode(true) as HTMLElement;
    returnToMenuBtn.parentNode?.replaceChild(newReturnBtn, returnToMenuBtn);

    // Add fresh event listener
    newReturnBtn.addEventListener('click', () => {
      callbacks.onReturnToMenu!();
    });
  }

  // Add Route button
  const addRouteBtn = document.getElementById('addRouteBtn')!;
  addRouteBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (state.routes.length >= 8) {
      gameToasts.maxRoutesReached();
      return;
    }

    const success = gameEngine.addRoute();
    if (success) {
      // Select the newly added route
      const newRouteIndex = gameEngine.getState().routes.length - 1;
      gameEngine.setActiveRoute(newRouteIndex);
      gameToasts.routeAdded(newRouteIndex + 1);
    }
    updateRouteTabs();
    updateStopList();
    updateBusCount();
  });

  // Delete Route button
  const deleteRouteBtn = document.getElementById('deleteRouteBtn')!;
  deleteRouteBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (state.routes.length === 0) return;

    const activeRoute = state.routes[state.activeRouteIndex];
    const routeNumber = state.activeRouteIndex + 1;
    const stopCount = activeRoute.stops.length;
    const busCount = activeRoute.buses.length;

    confirmDelete(
      `Route ${routeNumber}`,
      `This will permanently delete Route ${routeNumber} with ${stopCount} stop${stopCount !== 1 ? 's' : ''} and ${busCount} bus${busCount !== 1 ? 'es' : ''}.`,
      () => {
        gameEngine.deleteRoute();
        updateRouteTabs();
        updateStopList();
        updateBusCount();
        updateDeleteStopButton();
        gameToasts.routeDeleted(routeNumber);
      }
    );
  });

  // Delete Stop button (top bar)
  const deleteStopTopBtn = document.getElementById('deleteStopTopBtn') as HTMLButtonElement;

  if (deleteStopTopBtn) {
    deleteStopTopBtn.addEventListener('click', () => {
      const state = gameEngine.getState();
      if (state.selectedStopIndex === null || state.selectedStopIndex === -1) return;
      if (state.routes.length === 0) return;

      const stopIndex = state.selectedStopIndex;
      removeStop(stopIndex);
      updateDeleteStopButton();
      gameToasts.stopDeleted();
    });
  }

  // Pause button
  const pauseBtn = document.getElementById('pause-btn')!;
  function updatePauseButton() {
    const isPaused = gameEngine.isPaused();
    pauseBtn.textContent = isPaused ? '▶ Play' : '⏸ Pause';
    pauseBtn.classList.toggle('paused', isPaused);
  }

  pauseBtn.addEventListener('click', () => {
    gameEngine.togglePause();
    updatePauseButton();
    if (gameEngine.isPaused()) {
      gameToasts.gamePaused();
    } else {
      gameToasts.gameResumed();
    }
  });

  // Keyboard shortcut for pause (Space bar)
  document.addEventListener('keydown', (e) => {
    // Only toggle pause if not typing in an input field
    if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault(); // Prevent page scroll
      gameEngine.togglePause();
      updatePauseButton();
      if (gameEngine.isPaused()) {
        gameToasts.gamePaused();
      } else {
        gameToasts.gameResumed();
      }
    }
  });

  // Visual aids checkboxes
  const showCoverageRadiusCheckbox = document.getElementById('showCoverageRadius') as HTMLInputElement;
  const showBusSpeedCheckbox = document.getElementById('showBusSpeed') as HTMLInputElement;

  showCoverageRadiusCheckbox.addEventListener('change', () => {
    renderer.getRouteLayer().showCoverageRadius = showCoverageRadiusCheckbox.checked;
  });

  showBusSpeedCheckbox.addEventListener('change', () => {
    renderer.getEntityLayer().showBusSpeed = showBusSpeedCheckbox.checked;
  });

  // Loan controls
  const borrowBtn = document.getElementById('borrowBtn') as HTMLButtonElement;
  const repayBtn = document.getElementById('repayBtn') as HTMLButtonElement;

  borrowBtn.addEventListener('click', () => {
    const availableLoan = gameEngine.getAvailableLoan();
    if (availableLoan < 500) {
      gameToasts.noLoanAvailable();
      return;
    }

    const success = gameEngine.takeLoan(500);
    if (success) {
      updateUI(gameEngine, statsCalculator);
      gameToasts.loanTaken(500);
    }
  });

  repayBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (state.economics.money < 500) {
      gameToasts.notEnoughMoney(500);
      return;
    }

    const success = gameEngine.repayLoan(500);
    if (success) {
      updateUI(gameEngine, statsCalculator);
      gameToasts.loanRepaid(500);
    }
  });

  /**
   * Update bus count display (top bar)
   */
  function updateBusCount() {
    const state = gameEngine.getState();
    const busCountDisplay = document.getElementById('topBarBusCount')!;
    const addBusBtn = document.getElementById('addBusBtn') as HTMLButtonElement;
    const removeBusBtn = document.getElementById('removeBusBtn') as HTMLButtonElement;

    if (state.routes.length === 0) {
      busCountDisplay.textContent = 'Buses: 0';
      addBusBtn.disabled = true;
      removeBusBtn.disabled = true;
      return;
    }

    const activeRoute = state.routes[state.activeRouteIndex];
    const busCount = activeRoute.buses.length;

    busCountDisplay.textContent = `Buses: ${busCount}`;
    addBusBtn.disabled = busCount >= 10;
    removeBusBtn.disabled = busCount <= 1;
  }

  // Add Bus button
  const addBusBtn = document.getElementById('addBusBtn')!;
  addBusBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (state.routes.length > 0) {
      const activeRoute = state.routes[state.activeRouteIndex];
      if (activeRoute.buses.length >= 10) {
        gameToasts.maxBusesReached();
        return;
      }

      gameEngine.addBusToRoute(state.activeRouteIndex);
      updateBusCount();
      gameToasts.busAdded(activeRoute.buses.length);
    }
  });

  // Remove Bus button
  const removeBusBtn = document.getElementById('removeBusBtn')!;
  removeBusBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (state.routes.length > 0) {
      const activeRoute = state.routes[state.activeRouteIndex];
      if (activeRoute.buses.length <= 1) {
        gameToasts.minBusesReached();
        return;
      }

      gameEngine.removeBusFromRoute(state.activeRouteIndex);
      updateBusCount();
      gameToasts.busRemoved(activeRoute.buses.length);
    }
  });

  // Clear All Stops button
  const clearAllBtn = document.getElementById('clearAllBtn')!;
  clearAllBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (state.routes.length === 0) return;

    const activeRoute = state.routes[state.activeRouteIndex];
    if (activeRoute.stops.length === 0) return;

    const routeNumber = state.activeRouteIndex + 1;
    const stopCount = activeRoute.stops.length;

    confirmClear(
      `All Stops`,
      `This will remove all ${stopCount} stop${stopCount !== 1 ? 's' : ''} from Route ${routeNumber}. Buses will stop operating until new stops are added.`,
      () => {
        clearAllStops();
        gameToasts.stopsCleared(stopCount);
      }
    );
  });

  // Canvas click - mode-aware behavior
  canvas.addEventListener('click', (e) => {
    const state = gameEngine.getState();
    if (state.routes.length === 0) return;

    const coords = getCanvasCoordinates(e);
    const x = coords.x;
    const y = coords.y;

    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);

    // Check if clicking on a road
    if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
      if (state.cityGrid[gridY][gridX] === 'road') {
        // Mode-based behavior
        if (state.interactionMode === 'direct') {
          // Option 2: Direct stop creation
          handleDirectModeClick(gridX, gridY);
        } else {
          // Option 1: Show menu (existing behavior)
          updateMiniMenu(e.clientX, e.clientY, gridX, gridY);
        }
      } else {
        // Hide menu if clicking on non-road
        isHoveringMenu = false;
        hideMiniMenu();
      }
    } else {
      // Hide menu if clicking outside grid
      isHoveringMenu = false;
      hideMiniMenu();
    }
  });

  // Canvas right-click - mode-aware behavior
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const state = gameEngine.getState();
    if (state.routes.length === 0) return;

    const coords = getCanvasCoordinates(e);
    const x = coords.x;
    const y = coords.y;

    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);

    // Check if clicking on a road
    if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
      if (state.cityGrid[gridY][gridX] === 'road') {
        // Mode-based behavior
        if (state.interactionMode === 'direct') {
          // Option 2: Menu only on stops
          handleDirectModeRightClick(e.clientX, e.clientY, gridX, gridY);
        } else {
          // Option 1: Show menu (existing behavior)
          updateMiniMenu(e.clientX, e.clientY, gridX, gridY);
        }
      } else {
        // Hide menu if clicking on non-road
        isHoveringMenu = false;
        hideMiniMenu();
      }
    } else {
      // Hide menu if clicking outside grid
      isHoveringMenu = false;
      hideMiniMenu();
    }
  });

  // Mini menu button handlers
  selectStopBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (currentMenuGridX >= 0 && currentMenuGridY >= 0 && state.routes.length > 0) {
      const activeRoute = state.routes[state.activeRouteIndex];
      const stopIndex = activeRoute.stops.findIndex(
        (s) => s.x === currentMenuGridX && s.y === currentMenuGridY
      );

      if (stopIndex !== -1) {
        // Toggle selection
        if (state.selectedStopIndex === stopIndex) {
          (state as any).selectedStopIndex = null; // Deselect
        } else {
          (state as any).selectedStopIndex = stopIndex; // Select
        }
        updateStopList();

        // Hide menu after action
        isHoveringMenu = false;
        hideMiniMenu();
      }
    }
  });

  addStopBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (currentMenuGridX >= 0 && currentMenuGridY >= 0 && state.routes.length > 0) {
      const activeRoute = state.routes[state.activeRouteIndex];

      if (activeRoute.stops.length < MAX_STOPS) {
        // Add new stop
        const success = gameEngine.addStopToRoute(state.activeRouteIndex, currentMenuGridX, currentMenuGridY);
        if (!success) {
          console.warn('Failed to add stop - not enough money');
          hideMiniMenu();
          return;
        }

        // Initialize first bus position if first stop (centered on grid)
        if (activeRoute.stops.length === 1 && activeRoute.buses.length > 0) {
          activeRoute.buses[0].x = currentMenuGridX * GRID_SIZE + GRID_SIZE / 2;
          activeRoute.buses[0].y = currentMenuGridY * GRID_SIZE + GRID_SIZE / 2;
        }

        // Reset all bus paths when stops change
        activeRoute.buses.forEach((bus) => {
          bus.path = [];
          bus.pathIndex = 0;
        });

        gameEngine.updateSpatialIndex();
        updateRouteTabs();
        updateStopList();

        // Hide menu after action
        isHoveringMenu = false;
        hideMiniMenu();
      }
    }
  });

  moveStopBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (
      currentMenuGridX >= 0 &&
      currentMenuGridY >= 0 &&
      state.routes.length > 0 &&
      state.selectedStopIndex !== null &&
      state.selectedStopIndex !== -1
    ) {
      const activeRoute = state.routes[state.activeRouteIndex];

      // Move selected stop to new location
      activeRoute.stops[state.selectedStopIndex].x = currentMenuGridX;
      activeRoute.stops[state.selectedStopIndex].y = currentMenuGridY;
      (state as any).selectedStopIndex = null; // Deselect after moving

      // Reset all bus paths when stops change
      activeRoute.buses.forEach((bus) => {
        bus.path = [];
        bus.pathIndex = 0;
      });

      // Update NPC nearest stops
      state.npcs.forEach((npc) => {
        if (npc.state === 'waiting') {
          npc.nearestStop = null;
          npc.atStop = false;
        }
      });

      gameEngine.updateSpatialIndex();
      updateRouteTabs();
      updateStopList();

      // Hide menu after action
      isHoveringMenu = false;
      hideMiniMenu();
    }
  });

  deleteStopBtn.addEventListener('click', () => {
    const state = gameEngine.getState();
    if (currentMenuGridX >= 0 && currentMenuGridY >= 0 && state.routes.length > 0) {
      const activeRoute = state.routes[state.activeRouteIndex];

      // Find and remove stop at this location
      const stopIndex = activeRoute.stops.findIndex(
        (s) => s.x === currentMenuGridX && s.y === currentMenuGridY
      );

      if (stopIndex !== -1) {
        removeStop(stopIndex);

        // Hide menu after action
        isHoveringMenu = false;
        hideMiniMenu();
      }
    }
  });

  // Keep menu open when hovering over it
  miniMenu.addEventListener('mouseenter', () => {
    isHoveringMenu = true;
  });
  miniMenu.addEventListener('mouseleave', () => {
    isHoveringMenu = false;
  });

  // Canvas mousedown - initiate drag or pan
  canvas.addEventListener('mousedown', (e) => {
    // Middle button (button 1) or Space+Left Click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      panState.active = true;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      panState.startX = (e.clientX - rect.left) * scaleX;
      panState.startY = (e.clientY - rect.top) * scaleY;
      panState.startCameraX = camera.x;
      panState.startCameraY = camera.y;
      canvas.style.cursor = 'grabbing';
      return;
    }

    const state = gameEngine.getState();
    if (state.routes.length === 0) return;
    if (state.interactionMode !== 'direct') return;
    if (e.button !== 0) return; // Only left button for stop dragging

    const coords = getCanvasCoordinates(e);
    const gridX = Math.floor(coords.x / GRID_SIZE);
    const gridY = Math.floor(coords.y / GRID_SIZE);

    // First, check if the ACTIVE route has a stop here (for dragging)
    const activeRoute = state.routes[state.activeRouteIndex];
    const activeRouteStopIndex = activeRoute.stops.findIndex(
      (s) => s.x === gridX && s.y === gridY
    );

    if (activeRouteStopIndex !== -1) {
      // Prepare for potential drag on active route's stop
      dragState.active = true;
      dragState.stopIndex = activeRouteStopIndex;
      dragState.routeIndex = state.activeRouteIndex;
      dragState.startX = gridX;
      dragState.startY = gridY;
      dragState.currentGridX = gridX;
      dragState.currentGridY = gridY;
      dragState.hasMoved = false;

      // Select the stop (already on active route)
      (state as any).selectedStopIndex = activeRouteStopIndex;
      updateStopList();

      console.log(`Mousedown on stop ${activeRouteStopIndex} from active route ${state.activeRouteIndex}`);
    }
  });

  // Stop panning when mouse leaves the browser window
  document.addEventListener('mouseleave', () => {
    edgePanVelocity.x = 0;
    edgePanVelocity.y = 0;
  });

  // Global mouse move for edge panning
  document.addEventListener('mousemove', (e) => {
    // Store mouse position for edge panning (viewport coordinates)
    lastMousePos.x = e.clientX;
    lastMousePos.y = e.clientY;

    // Calculate edge panning velocity based on viewport edges
    edgePanVelocity.x = 0;
    edgePanVelocity.y = 0;

    // Disable edge panning on mobile/touch devices (use pan buttons instead)
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice) {
      return;
    }

    // Don't pan if over UI elements
    if (isScrollingUI) {
      return;
    }

    // Check if cursor is over the actual map area (accounting for camera offset)
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);

      // Calculate map bounds with camera offset
      const mapWidth = COLS * GRID_SIZE;
      const mapHeight = ROWS * GRID_SIZE;
      const mapLeft = camera.x;
      const mapRight = camera.x + mapWidth;
      const mapTop = camera.y;
      const mapBottom = camera.y + mapHeight;

      // Check if cursor is outside the map bounds
      const isOutsideMap = canvasX < mapLeft || canvasX > mapRight ||
                           canvasY < mapTop || canvasY > mapBottom;

      if (isOutsideMap) {
        return; // Don't pan if cursor is outside the map
      }
    }

    // Define UI boundaries
    const LEFT_SIDEBAR_WIDTH = 200;
    const TOP_BAR_HEIGHT = 60;

    // Left edge panning: Only in the border frame between sidebar and game area
    const atLeftBorder = lastMousePos.x >= LEFT_SIDEBAR_WIDTH &&
                        lastMousePos.x < LEFT_SIDEBAR_WIDTH + EDGE_PAN_THRESHOLD &&
                        lastMousePos.y >= TOP_BAR_HEIGHT;

    // Top edge panning: Only in the border frame between top bar and game area
    const atTopBorder = lastMousePos.y >= TOP_BAR_HEIGHT &&
                       lastMousePos.y < TOP_BAR_HEIGHT + EDGE_PAN_THRESHOLD &&
                       lastMousePos.x >= LEFT_SIDEBAR_WIDTH;

    // Right edge panning: Standard viewport edge
    const atRightEdge = lastMousePos.x > window.innerWidth - EDGE_PAN_THRESHOLD;

    // Bottom edge panning: Standard viewport edge
    const atBottomEdge = lastMousePos.y > window.innerHeight - EDGE_PAN_THRESHOLD;

    // Apply panning
    if (atLeftBorder) {
      edgePanVelocity.x = EDGE_PAN_SPEED;
    } else if (atRightEdge) {
      edgePanVelocity.x = -EDGE_PAN_SPEED;
    }

    if (atTopBorder) {
      edgePanVelocity.y = EDGE_PAN_SPEED;
    } else if (atBottomEdge) {
      edgePanVelocity.y = -EDGE_PAN_SPEED;
    }
  });

  // Detect when user is scrolling the left sidebar
  const leftSidebar = document.getElementById('left-sidebar');
  if (leftSidebar) {
    leftSidebar.addEventListener('mouseenter', () => {
      isScrollingUI = true;
    });
    leftSidebar.addEventListener('mouseleave', () => {
      isScrollingUI = false;
    });
  }

  // Help button toggle
  const helpBtn = document.getElementById('toggle-help-btn');
  const helpPanel = document.getElementById('help-panel');
  const closeHelpBtn = document.getElementById('close-help-btn');

  if (helpBtn && helpPanel) {
    helpBtn.addEventListener('click', () => {
      helpPanel.style.display = 'block';
    });
  }

  if (closeHelpBtn && helpPanel) {
    closeHelpBtn.addEventListener('click', () => {
      helpPanel.style.display = 'none';
    });
  }

  // Show Tutorial button
  const showTutorialBtn = document.getElementById('show-tutorial-btn');
  if (showTutorialBtn) {
    showTutorialBtn.addEventListener('click', () => {
      // Reset tutorial so it can be shown again
      resetTutorial();
      // Pause the game during tutorial
      if (!gameEngine.isPaused()) {
        gameEngine.togglePause();
        pauseBtn.textContent = '▶ Play';
        pauseBtn.classList.add('paused');
      }
      startTutorial(() => {
        // Resume game after tutorial
        if (gameEngine.isPaused()) {
          gameEngine.togglePause();
          pauseBtn.textContent = '⏸ Pause';
          pauseBtn.classList.remove('paused');
        }
      });
    });
  }

  // Mouse move - for grid highlighting and drag tracking
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();

    // Handle manual panning
    if (panState.active) {
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;

      camera.x = panState.startCameraX + (currentX - panState.startX);
      camera.y = panState.startCameraY + (currentY - panState.startY);
      return;
    }

    const coords = getCanvasCoordinates(e);
    const gridX = Math.floor(coords.x / GRID_SIZE);
    const gridY = Math.floor(coords.y / GRID_SIZE);

    if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
      renderer.getUILayer().setHoverCell(gridX, gridY);

      const state = gameEngine.getState();

      // Update drag state current position and visual preview
      if (dragState.active) {
        dragState.currentGridX = gridX;
        dragState.currentGridY = gridY;

        // Check if mouse has moved to a different grid cell
        if (!dragState.hasMoved && (gridX !== dragState.startX || gridY !== dragState.startY)) {
          // User has moved to a different cell - this is a real drag
          dragState.hasMoved = true;
          dragState.justFinishedDrag = true;
          console.log('Drag movement detected');
        }

        // Only show visual preview if we've actually moved
        if (dragState.hasMoved) {
          const route = state.routes[dragState.routeIndex!];
          renderer.getUILayer().setDragPreview(
            dragState.startX,
            dragState.startY,
            gridX,
            gridY,
            route.color,
            dragState.routeIndex!,
            dragState.stopIndex!
          );
        }
      }

      // Update cursor in direct mode
      if (state.interactionMode === 'direct' && state.routes.length > 0) {
        const activeRoute = state.routes[state.activeRouteIndex];
        const cellType = state.cityGrid[gridY][gridX];

        // Check if there's a stop from the active route at this location
        const hasActiveRouteStop = activeRoute.stops.some(
          (s) => s.x === gridX && s.y === gridY
        );

        if (cellType === 'road') {
          if (hasActiveRouteStop) {
            // Can drag this stop
            canvas.classList.remove('can-add-stop');
            if (!dragState.active) {
              canvas.classList.add('can-drag');
            }
          } else {
            // Can add a stop here
            canvas.classList.remove('can-drag');
            if (!dragState.active) {
              canvas.classList.add('can-add-stop');
            }
          }
        } else {
          // Not a road - remove both classes
          canvas.classList.remove('can-add-stop', 'can-drag');
        }
      } else {
        // Not in direct mode - remove classes
        canvas.classList.remove('can-add-stop', 'can-drag');
      }
    } else {
      renderer.getUILayer().setHoverCell(-1, -1);
      canvas.classList.remove('can-add-stop', 'can-drag');
    }
  });

  // Canvas mouseup - complete drag or pan
  canvas.addEventListener('mouseup', (e) => {
    // End panning
    if (panState.active) {
      panState.active = false;
      canvas.style.cursor = '';
      return;
    }

    if (!dragState.active) return;

    // Only process as a drag if the mouse actually moved
    if (dragState.hasMoved) {
      const state = gameEngine.getState();
      const coords = getCanvasCoordinates(e);
      const gridX = Math.floor(coords.x / GRID_SIZE);
      const gridY = Math.floor(coords.y / GRID_SIZE);

      // Validate drop location
      if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
        if (state.cityGrid[gridY][gridX] === 'road') {
          // Check if dropping on same location
          if (gridX === dragState.startX && gridY === dragState.startY) {
            console.log('Dropped on same location - no change');
          } else {
            // Check if the same route already has a stop at drop location
            const currentRoute = state.routes[dragState.routeIndex!];
            const sameRouteStopExists = currentRoute.stops.some(
              (s, idx) => s.x === gridX && s.y === gridY && idx !== dragState.stopIndex
            );

            if (sameRouteStopExists) {
              // Can't drop on same route's existing stop
              console.log('This route already has a stop at this location');
            } else {
              // Valid drop - move the stop (allow overlapping with other routes)
              const route = state.routes[dragState.routeIndex!];
              route.stops[dragState.stopIndex!].x = gridX;
              route.stops[dragState.stopIndex!].y = gridY;

              // Reset all bus paths
              route.buses.forEach((bus) => {
                bus.path = [];
                bus.pathIndex = 0;
              });

              // Update NPC nearest stops
              state.npcs.forEach((npc) => {
                if (npc.state === 'waiting') {
                  npc.nearestStop = null;
                  npc.atStop = false;
                }
              });

              gameEngine.updateSpatialIndex();
              updateRouteTabs();
              updateStopList();

              console.log(`Moved stop to (${gridX}, ${gridY})`);
            }
          }
        }
      }
    } else {
      // No movement - this was just a click to select
      console.log('Click without drag - stop already selected');
    }

    // Clear drag state and visual preview
    dragState.active = false;
    dragState.stopIndex = null;
    dragState.routeIndex = null;
    dragState.hasMoved = false;
    canvas.classList.remove('dragging');
    renderer.getUILayer().clearDragPreview();
  });

  canvas.addEventListener('mouseleave', () => {
    renderer.getUILayer().setHoverCell(-1, -1);
    canvas.classList.remove('can-add-stop', 'can-drag', 'dragging');

    // Stop edge panning
    edgePanVelocity.x = 0;
    edgePanVelocity.y = 0;

    // Cancel panning if mouse leaves canvas
    if (panState.active) {
      panState.active = false;
      canvas.style.cursor = '';
    }

    // Cancel drag if mouse leaves canvas
    if (dragState.active) {
      console.log('Drag cancelled - mouse left canvas');
      dragState.active = false;
      dragState.stopIndex = null;
      dragState.routeIndex = null;
      dragState.justFinishedDrag = false;
      dragState.hasMoved = false;
      renderer.getUILayer().clearDragPreview();
    }
  });

  // Escape key to close menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      isHoveringMenu = false;
      hideMiniMenu();
    }
  });

  // Traffic density is now dynamic based on time of day (no slider needed)

  // Panel toggle
  const toggleBtn = document.getElementById('toggle-panel-btn')!;
  const panel = document.getElementById('control-panel')!;

  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      toggleBtn.classList.toggle('panel-open');
    });
  }

  // Initialize UI
  updateRouteTabs();
  updateStopList();
  updateBusCount();

  console.log('✓ UI handlers attached (click roads to add stops!)');

  // Function to update camera based on edge panning
  function updateEdgePanning() {
    camera.x += edgePanVelocity.x;
    camera.y += edgePanVelocity.y;
  }

  /**
   * Update zoom level display
   */
  function updateZoomLevel() {
    const zoomLevel = document.getElementById('zoom-level')!;
    zoomLevel.textContent = `${Math.round(camera.zoom * 100)}%`;

    const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
    const zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;

    zoomInBtn.disabled = camera.zoom >= MAX_ZOOM;
    zoomOutBtn.disabled = camera.zoom <= MIN_ZOOM;
  }

  /**
   * Set zoom level (clamped to min/max)
   */
  function setZoom(newZoom: number, mouseX?: number, mouseY?: number) {
    const oldZoom = camera.zoom;
    camera.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    // Zoom towards mouse position if provided
    if (mouseX !== undefined && mouseY !== undefined) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = (mouseX - rect.left) * scaleX;
      const canvasY = (mouseY - rect.top) * scaleY;

      // Adjust camera position to zoom towards mouse
      const zoomRatio = camera.zoom / oldZoom;
      camera.x = canvasX - (canvasX - camera.x) * zoomRatio;
      camera.y = canvasY - (canvasY - camera.y) * zoomRatio;
    }

    updateZoomLevel();
  }

  // Zoom button handlers
  const zoomInBtn = document.getElementById('zoom-in-btn')!;
  const zoomOutBtn = document.getElementById('zoom-out-btn')!;
  const zoomResetBtn = document.getElementById('zoom-reset-btn')!;

  zoomInBtn.addEventListener('click', () => {
    setZoom(camera.zoom + ZOOM_STEP);
  });

  zoomOutBtn.addEventListener('click', () => {
    setZoom(camera.zoom - ZOOM_STEP);
  });

  zoomResetBtn.addEventListener('click', () => {
    setZoom(1.0);
  });

  // Pan button handlers (for mobile)
  const PAN_AMOUNT = 100; // pixels to pan per click
  const panUpBtn = document.getElementById('pan-up-btn');
  const panDownBtn = document.getElementById('pan-down-btn');
  const panLeftBtn = document.getElementById('pan-left-btn');
  const panRightBtn = document.getElementById('pan-right-btn');
  const panCenterBtn = document.getElementById('pan-center-btn');

  if (panUpBtn) {
    panUpBtn.addEventListener('click', () => {
      camera.y += PAN_AMOUNT;
    });
  }
  if (panDownBtn) {
    panDownBtn.addEventListener('click', () => {
      camera.y -= PAN_AMOUNT;
    });
  }
  if (panLeftBtn) {
    panLeftBtn.addEventListener('click', () => {
      camera.x += PAN_AMOUNT;
    });
  }
  if (panRightBtn) {
    panRightBtn.addEventListener('click', () => {
      camera.x -= PAN_AMOUNT;
    });
  }
  if (panCenterBtn) {
    panCenterBtn.addEventListener('click', () => {
      // Center the camera on the map
      const mapWidth = COLS * GRID_SIZE;
      const mapHeight = ROWS * GRID_SIZE;
      const canvasRect = canvas.getBoundingClientRect();
      camera.x = (canvasRect.width - mapWidth * camera.zoom) / 2;
      camera.y = (canvasRect.height - mapHeight * camera.zoom) / 2;
    });
  }

  // Mouse wheel zoom handler
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(camera.zoom + zoomDelta, e.clientX, e.clientY);
  }, { passive: false });

  // Initialize zoom level display
  updateZoomLevel();

  // Prevent touch events on UI controls from affecting the canvas
  // Note: top-bar only uses stopPropagation (not preventDefault) to allow scrolling route tabs
  const uiControlsWithPreventDefault = [
    document.getElementById('zoom-controls'),
    document.getElementById('pan-controls'),
    document.getElementById('sidebarToggle'),
  ];

  const uiControlsScrollable = [
    document.getElementById('top-bar'),
  ];

  uiControlsWithPreventDefault.forEach((control) => {
    if (control) {
      control.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      }, { passive: true });
      control.addEventListener('touchmove', (e) => {
        e.stopPropagation();
        e.preventDefault();
      }, { passive: false });
      control.addEventListener('touchend', (e) => {
        e.stopPropagation();
      }, { passive: true });
    }
  });

  // For scrollable UI controls, only stop propagation (allow default scroll behavior)
  uiControlsScrollable.forEach((control) => {
    if (control) {
      control.addEventListener('touchstart', (e) => {
        e.stopPropagation();
      }, { passive: true });
      control.addEventListener('touchmove', (e) => {
        e.stopPropagation();
      }, { passive: true });
      control.addEventListener('touchend', (e) => {
        e.stopPropagation();
      }, { passive: true });
    }
  });

  // Extra protection for zoom controls - they seem more problematic
  const zoomControls = document.getElementById('zoom-controls');
  if (zoomControls) {
    // Block all touch events from reaching the canvas
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((eventType) => {
      zoomControls.addEventListener(eventType, (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, { capture: true, passive: true });
    });
  }

  // ============================================
  // TOUCH SUPPORT
  // ============================================

  // Detect touch device
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

  /**
   * Find the nearest stop to a canvas position within a given radius.
   * Returns { gridX, gridY, stopIndex } or null if no stop found.
   */
  function findNearestStopInRadius(
    canvasX: number,
    canvasY: number,
    radius: number,
    routeIndex?: number
  ): { gridX: number; gridY: number; stopIndex: number } | null {
    const state = gameEngine.getState();
    const route = state.routes[routeIndex ?? state.activeRouteIndex];
    if (!route) return null;

    let nearest: { gridX: number; gridY: number; stopIndex: number; dist: number } | null = null;

    for (let i = 0; i < route.stops.length; i++) {
      const stop = route.stops[i];
      // Calculate center of stop's grid cell in canvas coordinates
      const stopCenterX = stop.x * GRID_SIZE + GRID_SIZE / 2;
      const stopCenterY = stop.y * GRID_SIZE + GRID_SIZE / 2;

      const dx = canvasX - stopCenterX;
      const dy = canvasY - stopCenterY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius && (nearest === null || dist < nearest.dist)) {
        nearest = { gridX: stop.x, gridY: stop.y, stopIndex: i, dist };
      }
    }

    return nearest ? { gridX: nearest.gridX, gridY: nearest.gridY, stopIndex: nearest.stopIndex } : null;
  }

  /**
   * Find the nearest stop across all routes within a given radius.
   * Returns array of { routeIndex, stopIndex, gridX, gridY } sorted by distance.
   */
  function findNearestStopsAcrossRoutes(
    canvasX: number,
    canvasY: number,
    radius: number
  ): Array<{ routeIndex: number; stopIndex: number; gridX: number; gridY: number; dist: number }> {
    const state = gameEngine.getState();
    const results: Array<{ routeIndex: number; stopIndex: number; gridX: number; gridY: number; dist: number }> = [];

    for (let r = 0; r < state.routes.length; r++) {
      const route = state.routes[r];
      for (let i = 0; i < route.stops.length; i++) {
        const stop = route.stops[i];
        const stopCenterX = stop.x * GRID_SIZE + GRID_SIZE / 2;
        const stopCenterY = stop.y * GRID_SIZE + GRID_SIZE / 2;

        const dx = canvasX - stopCenterX;
        const dy = canvasY - stopCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          results.push({ routeIndex: r, stopIndex: i, gridX: stop.x, gridY: stop.y, dist });
        }
      }
    }

    return results.sort((a, b) => a.dist - b.dist);
  }

  // Initialize touch handler for mobile support
  const touchHandler = new TouchHandler({
    canvas,
    getCamera: () => camera,

    // Tap - equivalent to click
    onTap: (canvasX, canvasY, clientX, clientY) => {
      const state = gameEngine.getState();
      if (state.routes.length === 0) return;

      let gridX = Math.floor(canvasX / GRID_SIZE);
      let gridY = Math.floor(canvasY / GRID_SIZE);

      // Update cursor position for money indicator
      lastCursorX = clientX;
      lastCursorY = clientY;

      // On touch devices, snap to nearest stop if within touch radius
      if (isTouchDevice && state.interactionMode === 'direct') {
        const nearestStop = findNearestStopInRadius(canvasX, canvasY, MOBILE_STOP_TOUCH_RADIUS);
        if (nearestStop) {
          gridX = nearestStop.gridX;
          gridY = nearestStop.gridY;
        }
      }

      if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
        if (state.cityGrid[gridY][gridX] === 'road') {
          if (state.interactionMode === 'direct') {
            handleDirectModeClick(gridX, gridY);
          } else {
            updateMiniMenu(clientX, clientY, gridX, gridY);
          }
        } else {
          isHoveringMenu = false;
          hideMiniMenu();
        }
      }
    },

    // Long press - equivalent to right-click (for deletion)
    onLongPress: (canvasX, canvasY, clientX, clientY) => {
      const state = gameEngine.getState();
      if (state.routes.length === 0) return;

      let gridX = Math.floor(canvasX / GRID_SIZE);
      let gridY = Math.floor(canvasY / GRID_SIZE);

      // On touch devices, snap to nearest stop across all routes if within touch radius
      if (isTouchDevice && state.interactionMode === 'direct') {
        const nearestStops = findNearestStopsAcrossRoutes(canvasX, canvasY, MOBILE_STOP_TOUCH_RADIUS);
        if (nearestStops.length > 0) {
          gridX = nearestStops[0].gridX;
          gridY = nearestStops[0].gridY;
        }
      }

      if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
        if (state.cityGrid[gridY][gridX] === 'road') {
          if (state.interactionMode === 'direct') {
            // Show delete menu on long press (same as right-click)
            handleDirectModeRightClick(clientX, clientY, gridX, gridY);
            // Vibrate for haptic feedback if available
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          } else {
            updateMiniMenu(clientX, clientY, gridX, gridY);
          }
        }
      }
    },

    // Drag start
    onDragStart: (canvasX, canvasY) => {
      const state = gameEngine.getState();
      if (state.routes.length === 0) return;
      if (state.interactionMode !== 'direct') return;

      let gridX = Math.floor(canvasX / GRID_SIZE);
      let gridY = Math.floor(canvasY / GRID_SIZE);
      let stopIndex = -1;

      // On touch devices, snap to nearest stop if within touch radius
      if (isTouchDevice) {
        const nearestStop = findNearestStopInRadius(canvasX, canvasY, MOBILE_STOP_TOUCH_RADIUS);
        if (nearestStop) {
          gridX = nearestStop.gridX;
          gridY = nearestStop.gridY;
          stopIndex = nearestStop.stopIndex;
        }
      }

      // Check if the active route has a stop here (for non-touch or if no snap happened)
      if (stopIndex === -1) {
        const activeRoute = state.routes[state.activeRouteIndex];
        stopIndex = activeRoute.stops.findIndex(
          (s) => s.x === gridX && s.y === gridY
        );
      }

      if (stopIndex !== -1) {
        // Start dragging this stop
        dragState.active = true;
        dragState.stopIndex = stopIndex;
        dragState.routeIndex = state.activeRouteIndex;
        dragState.startX = gridX;
        dragState.startY = gridY;
        dragState.currentGridX = gridX;
        dragState.currentGridY = gridY;
        dragState.hasMoved = false;

        // Select the stop
        (state as any).selectedStopIndex = stopIndex;
        updateStopList();
      }
    },

    // Drag move
    onDragMove: (canvasX, canvasY) => {
      if (!dragState.active) return;

      const state = gameEngine.getState();
      const gridX = Math.floor(canvasX / GRID_SIZE);
      const gridY = Math.floor(canvasY / GRID_SIZE);

      if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
        dragState.currentGridX = gridX;
        dragState.currentGridY = gridY;

        // Check if moved to different cell
        if (!dragState.hasMoved && (gridX !== dragState.startX || gridY !== dragState.startY)) {
          dragState.hasMoved = true;
          dragState.justFinishedDrag = true;
        }

        // Show visual preview
        if (dragState.hasMoved) {
          const route = state.routes[dragState.routeIndex!];
          renderer.getUILayer().setDragPreview(
            dragState.startX,
            dragState.startY,
            gridX,
            gridY,
            route.color,
            dragState.routeIndex!,
            dragState.stopIndex!
          );
        }
      }
    },

    // Drag end
    onDragEnd: (canvasX, canvasY) => {
      if (!dragState.active) return;

      if (dragState.hasMoved) {
        const state = gameEngine.getState();
        const gridX = Math.floor(canvasX / GRID_SIZE);
        const gridY = Math.floor(canvasY / GRID_SIZE);

        // Validate drop location
        if (gridX >= 0 && gridX < COLS && gridY >= 0 && gridY < ROWS) {
          if (state.cityGrid[gridY][gridX] === 'road') {
            if (gridX !== dragState.startX || gridY !== dragState.startY) {
              // Check if same route already has a stop at drop location
              const currentRoute = state.routes[dragState.routeIndex!];
              const sameRouteStopExists = currentRoute.stops.some(
                (s, idx) => s.x === gridX && s.y === gridY && idx !== dragState.stopIndex
              );

              if (!sameRouteStopExists) {
                // Valid drop - move the stop
                const route = state.routes[dragState.routeIndex!];
                route.stops[dragState.stopIndex!].x = gridX;
                route.stops[dragState.stopIndex!].y = gridY;

                // Reset all bus paths
                route.buses.forEach((bus) => {
                  bus.path = [];
                  bus.pathIndex = 0;
                });

                // Update NPC nearest stops
                state.npcs.forEach((npc) => {
                  if (npc.state === 'waiting') {
                    npc.nearestStop = null;
                    npc.atStop = false;
                  }
                });

                gameEngine.updateSpatialIndex();
                updateRouteTabs();
                updateStopList();

                // Haptic feedback on successful drop
                if (navigator.vibrate) {
                  navigator.vibrate(30);
                }
              }
            }
          }
        }
      }

      // Clear drag state
      dragState.active = false;
      dragState.stopIndex = null;
      dragState.routeIndex = null;
      dragState.hasMoved = false;
      renderer.getUILayer().clearDragPreview();
    },

    // Pinch zoom
    onPinchZoom: (newZoom, centerX, centerY) => {
      setZoom(newZoom, centerX, centerY);
    },

    // Two-finger pan
    onPan: (deltaX, deltaY) => {
      camera.x += deltaX;
      camera.y += deltaY;
    },
  });

  // Track touch position for money spent indicator
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      lastCursorX = e.touches[0].clientX;
      lastCursorY = e.touches[0].clientY;
    }
  }, { passive: true });

  // Initialize collapsible sidebar sections
  initCollapsibleSections();

  // Mobile sidebar toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle && leftSidebar) {
    sidebarToggle.addEventListener('click', () => {
      leftSidebar.classList.toggle('open');
      sidebarToggle.textContent = leftSidebar.classList.contains('open') ? '✕' : '☰';
    });

    // Close sidebar when tapping outside on mobile
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (window.innerWidth <= 768 &&
          leftSidebar.classList.contains('open') &&
          !leftSidebar.contains(target) &&
          target !== sidebarToggle) {
        leftSidebar.classList.remove('open');
        sidebarToggle.textContent = '☰';
      }
    });
  }

  // Return camera getter, update function, and touch handler for cleanup
  return {
    getCamera: () => camera,
    update: updateEdgePanning,
    destroyTouchHandler: () => touchHandler.destroy(),
  };
}

// Start the application
main().catch((error) => {
  console.error('Failed to start application:', error);
});
