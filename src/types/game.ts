import type { CityGrid, RoadCell, Zone } from './city';
import type { NPC, Route, TrafficVehicle } from './entities';

export interface GameStats {
  tripsCompleted: number;
  totalWaitTime: number;
  totalTransportTime: number;
  npcsGaveUp: number;
  busUtilizationSamples: number;
  totalBusUtilization: number;
}

export interface Economics {
  money: number;
  totalIncome: number;
  totalExpenses: number;
  lastIncomeTime: number;
  lastExpenseTime: number;
  loan: number; // Current outstanding loan amount
  lastInterestTime: number; // Last time interest was applied
  // Income statement breakdown (not cash flow)
  busRunningCosts: number; // Operating costs
  loanInterestExpense: number; // Interest expense
  depreciation: number; // Accumulated depreciation (non-cash)
  // Balance sheet items
  totalCapitalInvested: number; // Total invested in buses, routes, stops (at cost)
}

export interface GameState {
  readonly cityGrid: CityGrid;
  readonly roads: ReadonlyArray<RoadCell>;
  readonly zones: ReadonlyArray<Zone>;
  routes: Route[];
  activeRouteIndex: number;
  npcs: NPC[];
  traffic: TrafficVehicle[];
  trafficDensity: number;
  stats: GameStats;
  economics: Economics;
  time: number;
  timeOfDay: number; // 0-1 representing 0-24 hours (0=midnight, 0.5=noon)
  lastSpawnTime: number;
  lastTrafficSpawnTime: number;
  selectedStopIndex: number | null;
  interactionMode: 'menu-based' | 'direct';
  paused: boolean;
  gameOver: boolean;
}

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  zoom: number;
  visibleGridBounds: GridBounds;
}

export interface GridBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
