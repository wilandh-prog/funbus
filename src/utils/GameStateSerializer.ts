/**
 * Game State Serialization Utilities
 *
 * Converts between full GameState and SerializableGameState
 * for localStorage persistence.
 */

import type { GameState } from '../types/game';
import type { SerializableGameState } from '../storage/ProgressionStorage';
import type { GameEngine } from '../core/GameEngine';

/**
 * Serialize game state for storage
 * Strips out transient data (NPCs, traffic, exact bus positions)
 */
export function serializeGameState(state: GameState): SerializableGameState {
  return {
    routes: state.routes.map((route) => ({
      stops: route.stops.map((stop) => ({ x: stop.x, y: stop.y })),
      busCount: route.buses.length,
      color: route.color,
    })),
    activeRouteIndex: state.activeRouteIndex,
    // trafficDensity is dynamic, not saved
    stats: { ...state.stats },
    economics: {
      money: state.economics.money,
      totalIncome: state.economics.totalIncome,
      totalExpenses: state.economics.totalExpenses,
    },
    interactionMode: state.interactionMode,
  };
}

/**
 * Restore game state from saved data
 * Recreates routes and buses, initializes transient data
 */
export function restoreGameState(gameEngine: GameEngine, savedState: SerializableGameState): void {
  const state = gameEngine.getState() as any; // Cast to any for mutation

  // Clear existing routes
  state.routes = [];

  // Restore routes
  savedState.routes.forEach((savedRoute) => {
    // Add route (this creates it with one bus)
    gameEngine.addRoute();
    const route = state.routes[state.routes.length - 1];

    // Set route color
    route.color = savedRoute.color;

    // Add stops
    savedRoute.stops.forEach((stop) => {
      route.stops.push({ x: stop.x, y: stop.y });
    });

    // Adjust bus count
    const currentBusCount = route.buses.length;
    const targetBusCount = savedRoute.busCount;

    // Add more buses if needed
    for (let i = currentBusCount; i < targetBusCount; i++) {
      gameEngine.addBusToRoute(state.routes.length - 1);
    }

    // Remove buses if needed
    for (let i = currentBusCount; i > targetBusCount; i--) {
      gameEngine.removeBusFromRoute(state.routes.length - 1);
    }

    // Reset bus positions to their starting stops
    route.buses.forEach((bus: any, index: number) => {
      if (route.stops.length > 0) {
        const stopIndex = index % route.stops.length;
        const stop = route.stops[stopIndex];
        bus.x = stop.x * 30 + 15;
        bus.y = stop.y * 30 + 15;
        bus.currentStopIndex = stopIndex;
        bus.path = [];
        bus.pathIndex = 0;
        bus.passengers = [];
      }
    });
  });

  // Restore other state
  state.activeRouteIndex = Math.min(savedState.activeRouteIndex, state.routes.length - 1);
  // trafficDensity is now dynamic based on time of day (not restored)
  state.stats = { ...savedState.stats };
  // Ensure totalTransportTime exists (backwards compatibility)
  if (state.stats.totalTransportTime === undefined) {
    state.stats.totalTransportTime = 0;
  }
  // Restore economics (with defaults for old saves)
  if (savedState.economics) {
    state.economics.money = savedState.economics.money;
    state.economics.totalIncome = savedState.economics.totalIncome;
    state.economics.totalExpenses = savedState.economics.totalExpenses;
  }
  state.interactionMode = savedState.interactionMode;

  // Reset transient data
  state.npcs = [];
  state.traffic = [];
  state.time = 0;
  state.timeOfDay = 0.25; // Reset to 6am (morning)
  state.lastSpawnTime = 0;
  state.lastTrafficSpawnTime = 0;
  state.selectedStopIndex = null;

  // Recalculate traffic density based on time of day (now dynamic)
  // Note: This requires access to GameEngine's calculateTrafficDensity, but we'll let the engine recalculate it
  // For now, set to night density (will be updated on first frame)
  state.trafficDensity = 0.2;

  console.log(`Restored game state: ${state.routes.length} routes, ${savedState.stats.tripsCompleted} trips completed`);
}
