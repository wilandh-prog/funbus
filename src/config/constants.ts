// Grid and canvas constants
export const GRID_SIZE = 30;
export const COLS = 60;
export const ROWS = 60;
export const CANVAS_WIDTH = COLS * GRID_SIZE;
export const CANVAS_HEIGHT = ROWS * GRID_SIZE;

// Game mechanics constants
export const MAX_STOPS = 40;
export const MAX_ROUTES = 8;
export const BUS_SPEED = 3;
export const TRAFFIC_SPEED = 2;

// NPC constants
export const NPC_MAX_WAIT_TIME = 60; // seconds
export const NPC_SPAWN_INTERVAL = 5000; // milliseconds
export const MAX_SPAWNED_NPCS = 10;

// Traffic constants
export const TRAFFIC_SPAWN_INTERVAL = 100; // milliseconds (faster spawning for more traffic)

// Traffic slowdown effects
export const TRAFFIC_BASE_SPEED_MULTIPLIER = {
  LOW: 1.0,      // 0-0.3 density: No slowdown (night time)
  MEDIUM: 0.85,  // 0.3-0.6 density: 15% slower (daytime)
  HIGH: 0.65,    // 0.6+ density: 35% slower (rush hour)
};
export const CONGESTION_DETECTION_RADIUS = GRID_SIZE * 4; // Check traffic within 4 grid cells
export const CONGESTION_SLOWDOWN_PER_VEHICLE = 0.02; // 2% slower per nearby traffic vehicle
export const MAX_CONGESTION_SLOWDOWN = 0.4; // Maximum 40% slowdown from local congestion

// Traffic spawning weights
export const TRAFFIC_ZONE_WEIGHTS = {
  COMMERCIAL: 3.0,   // Commercial areas have 3x more traffic
  INDUSTRIAL: 2.0,   // Industrial areas have 2x more traffic
  RESIDENTIAL: 1.5,  // Residential areas have 1.5x more traffic
  ROAD: 1.0,         // Base weight for roads with no adjacent zones
  EMPTY: 0.5,        // Low traffic in empty areas
};
export const CENTER_WEIGHT_MULTIPLIER = 1.5; // City center roads get 1.5x multiplier
export const ARTERIAL_WEIGHT_MULTIPLIER = 1.3; // Major intersections get 1.3x multiplier

// Route colors
export const ROUTE_COLORS = [
  '#ff4444', // red
  '#44ff44', // green
  '#4444ff', // blue
  '#ffff44', // yellow
  '#ff44ff', // magenta
  '#44ffff', // cyan
  '#ff8844', // orange
  '#8844ff', // purple
];

// Mobile touch constants
export const MOBILE_STOP_TOUCH_RADIUS = 45; // pixels - touch target radius for stops on mobile

// Performance constants
export const UI_UPDATE_INTERVAL = 100; // 10 Hz (throttled from 60 Hz)
export const PATH_CACHE_SIZE = 500;
export const PATH_CACHE_TTL = 30000; // 30 seconds

// Economics constants
export const STARTING_MONEY = 5000;
export const ROUTE_COST = 500;
export const STOP_COST = 100;
export const BUS_COST = 300;
export const BUS_RUNNING_COST_PER_SECOND = 0.05; // Cost per bus per second
export const DEFAULT_TICKET_PRICE = 1.5; // Default ticket price
export const MAX_TICKET_PRICE = 4; // Maximum ticket price

// Loan system constants
export const LOAN_TO_EQUITY_RATIO = 2.0; // Can borrow up to 2x equity
export const LOAN_INTEREST_RATE = 0.10; // 10% annual interest rate
export const LOAN_INTEREST_PER_DAY = LOAN_INTEREST_RATE / 365; // Daily interest rate

// Depreciation constants (for income statement)
export const BUS_DEPRECIATION_YEARS = 5; // Buses depreciate over 5 years
export const BUS_DEPRECIATION_PER_DAY = BUS_COST / (BUS_DEPRECIATION_YEARS * 365); // Daily depreciation per bus
export const ROUTE_DEPRECIATION_YEARS = 10; // Routes depreciate over 10 years
export const ROUTE_DEPRECIATION_PER_DAY = ROUTE_COST / (ROUTE_DEPRECIATION_YEARS * 365); // Daily depreciation per route
export const STOP_DEPRECIATION_YEARS = 10; // Stops depreciate over 10 years (infrastructure)
export const STOP_DEPRECIATION_PER_DAY = STOP_COST / (STOP_DEPRECIATION_YEARS * 365); // Daily depreciation per stop
