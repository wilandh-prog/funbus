import type { GameState } from '../types/game';
import { ROUTE_COLORS, TRAFFIC_SPAWN_INTERVAL, MAX_ROUTES, STARTING_MONEY, ROUTE_COST, STOP_COST, BUS_COST, BUS_RUNNING_COST_PER_SECOND, LOAN_TO_EQUITY_RATIO, LOAN_INTEREST_PER_DAY, BUS_DEPRECIATION_PER_DAY, ROUTE_DEPRECIATION_PER_DAY, STOP_DEPRECIATION_PER_DAY, DEFAULT_TICKET_PRICE, MAX_TICKET_PRICE } from '../config/constants';
import { CityGenerator } from '../city/CityGenerator';
import { PathfindingManager } from '../pathfinding/PathfindingManager';
import { SpatialIndex } from '../spatial/SpatialIndex';
import { EntityManager } from './EntityManager';
import { RouteManager } from './RouteManager';
import { getCityById } from '../config/cities';
import { StatsCalculator } from '../ui/StatsCalculator';

export type BankruptcyCallback = (event: 'forced_loan' | 'game_over', amount?: number) => void;

export class GameEngine {
  private state: GameState;
  private pathfindingManager: PathfindingManager;
  private spatialIndex: SpatialIndex;
  private entityManager: EntityManager;
  private routeManager: RouteManager;
  private statsCalculator: StatsCalculator;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private cityId: string;
  private bankruptcyCallback: BankruptcyCallback | null = null;

  constructor(cityId: string) {
    // Get city configuration
    const cityConfig = getCityById(cityId);
    if (!cityConfig) {
      throw new Error(`City not found: ${cityId}`);
    }

    // Initialize city with seed
    const cityGenerator = new CityGenerator();
    const cityData = cityGenerator.generate(cityConfig.seed);

    // Store city ID
    this.cityId = cityId;

    // Initialize pathfinding and spatial index
    this.pathfindingManager = new PathfindingManager(cityData.cityGrid);
    this.spatialIndex = new SpatialIndex();

    // Initialize managers
    this.entityManager = new EntityManager(this.pathfindingManager, this.spatialIndex);
    this.routeManager = new RouteManager(this.pathfindingManager, this.spatialIndex);
    this.statsCalculator = new StatsCalculator();

    // Initialize game state
    this.state = {
      cityGrid: cityData.cityGrid,
      roads: cityData.roads,
      zones: cityData.zones,
      routes: [],
      activeRouteIndex: 0,
      npcs: [],
      traffic: [],
      trafficDensity: 0.2, // Will be updated dynamically based on time of day
      stats: {
        tripsCompleted: 0,
        totalWaitTime: 0,
        totalTransportTime: 0,
        npcsGaveUp: 0,
        busUtilizationSamples: 0,
        totalBusUtilization: 0,
      },
      economics: {
        money: STARTING_MONEY,
        totalIncome: 0,
        totalExpenses: 0,
        lastIncomeTime: 0,
        lastExpenseTime: 0,
        loan: 0,
        lastInterestTime: 0,
        busRunningCosts: 0,
        loanInterestExpense: 0,
        depreciation: 0,
        totalCapitalInvested: 0,
        ticketPrice: DEFAULT_TICKET_PRICE,
      },
      time: 0,
      timeOfDay: 0.25, // Start at 6am (morning)
      lastSpawnTime: 0,
      lastTrafficSpawnTime: 0,
      selectedStopIndex: null,
      interactionMode: 'direct',
      paused: false,
      gameOver: false,
    };

    // Initialize traffic density based on starting time
    this.state.trafficDensity = this.calculateTrafficDensity(this.state.timeOfDay);
    console.log(`🎮 Game initialized at 06:00 with traffic density: ${Math.round(this.state.trafficDensity * 100)}%`);
  }

  /**
   * Get current game state (read-only access)
   */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Get the city ID for this game
   */
  getCityId(): string {
    return this.cityId;
  }

  /**
   * Start the game loop
   */
  start(renderCallback: () => void): void {
    const gameLoop = (timestamp: number) => {
      const deltaTime = timestamp - this.lastTime;
      this.lastTime = timestamp;

      // Only update game state if not paused
      // Ignore large gaps (e.g., tab switching)
      if (!this.state.paused && deltaTime < 100) {
        this.update(deltaTime);
      }

      renderCallback();

      this.animationFrameId = requestAnimationFrame(gameLoop);
    };

    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Toggle pause state
   */
  togglePause(): void {
    this.state.paused = !this.state.paused;
    console.log(`⏸️ Game ${this.state.paused ? 'PAUSED' : 'RESUMED'}`);
  }

  /**
   * Set pause state
   */
  setPaused(paused: boolean): void {
    this.state.paused = paused;
    console.log(`⏸️ Game ${this.state.paused ? 'PAUSED' : 'RESUMED'}`);
  }

  /**
   * Check if game is paused
   */
  isPaused(): boolean {
    return this.state.paused;
  }

  /**
   * Calculate traffic density based on time of day
   * High traffic during rush hours, low at night
   */
  private calculateTrafficDensity(timeOfDay: number): number {
    // timeOfDay: 0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm
    const hour = timeOfDay * 24;

    // Morning rush hour (7am-9am): High traffic
    if (hour >= 7 && hour < 9) {
      const progress = (hour - 7) / 2; // 0 to 1
      return 0.5 + Math.sin(progress * Math.PI) * 0.4; // Peaks at ~0.9 at 8am
    }
    // Evening rush hour (17:00-19:00): High traffic
    else if (hour >= 17 && hour < 19) {
      const progress = (hour - 17) / 2; // 0 to 1
      return 0.5 + Math.sin(progress * Math.PI) * 0.4; // Peaks at ~0.9 at 6pm
    }
    // Daytime (9am-5pm): Medium traffic
    else if (hour >= 9 && hour < 17) {
      return 0.5;
    }
    // Night (9pm-6am): Low traffic
    else if (hour >= 21 || hour < 6) {
      return 0.2;
    }
    // Transition periods: Gradual change
    else if (hour >= 6 && hour < 7) {
      // 6am-7am: Rising from night to rush hour
      const progress = hour - 6;
      return 0.2 + progress * 0.3; // 0.2 to 0.5
    }
    else if (hour >= 9 && hour < 10) {
      // 9am-10am: Falling from rush hour to day
      const progress = hour - 9;
      return 0.9 - progress * 0.4; // 0.9 to 0.5
    }
    else if (hour >= 19 && hour < 21) {
      // 7pm-9pm: Falling from rush hour to night
      const progress = (hour - 19) / 2;
      return 0.9 - progress * 0.7; // 0.9 to 0.2
    }

    return 0.5; // Default medium traffic
  }

  /**
   * Main update loop
   */
  private update(deltaTime: number): void {
    this.state.time += deltaTime;

    // Update time of day (2.5 minute day cycle = 150000ms)
    const dayDuration = 150000; // milliseconds for a full day
    const oldTimeOfDay = this.state.timeOfDay;
    this.state.timeOfDay = (this.state.timeOfDay + deltaTime / dayDuration) % 1.0;

    // Apply daily accounting when a day passes (timeOfDay wraps from 0.99... to 0.0...)
    if (oldTimeOfDay > this.state.timeOfDay) {
      this.applyDailyAccounting();
    }

    // Update traffic density based on time of day
    const oldDensity = this.state.trafficDensity;
    this.state.trafficDensity = this.calculateTrafficDensity(this.state.timeOfDay);

    // Log significant changes in traffic density (for debugging)
    if (Math.abs(this.state.trafficDensity - oldDensity) > 0.05) {
      const hour = Math.floor(this.state.timeOfDay * 24);
      const minute = Math.floor((this.state.timeOfDay * 24 * 60) % 60);
      console.log(`🚗 Traffic density changed: ${Math.round(oldDensity * 100)}% → ${Math.round(this.state.trafficDensity * 100)}% at ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }

    // Calculate current score to determine dynamic NPC limit and spawn rate
    const currentScore = this.statsCalculator.calculateScore(this.state);
    // Scale from 10 NPCs at score 0 to 40 NPCs at score 100
    const baseMaxNPCs = Math.floor(10 + (currentScore / 100) * 30);
    // Scale spawn interval: 5s at score 0, down to 2s at score 100 (faster spawning at higher scores)
    const baseSpawnInterval = 5000 - (currentScore / 100) * 3000;

    // Calculate spawn multiplier based on ticket price
    // $0 = 3x, $1.5 = 1x, $4 = 0.2x
    const ticketPrice = this.state.economics.ticketPrice;
    let priceSpawnMultiplier: number;
    if (ticketPrice <= DEFAULT_TICKET_PRICE) {
      // From 3x at $0 to 1x at default price
      priceSpawnMultiplier = 3 - (ticketPrice / DEFAULT_TICKET_PRICE) * 2;
    } else {
      // From 1x at default to 0.2x at max price
      const priceRange = MAX_TICKET_PRICE - DEFAULT_TICKET_PRICE;
      priceSpawnMultiplier = Math.max(0.2, 1 - (ticketPrice - DEFAULT_TICKET_PRICE) / priceRange * 0.8);
    }

    // Apply price multiplier to NPC limits and spawn rate
    const dynamicMaxNPCs = Math.floor(baseMaxNPCs * priceSpawnMultiplier);
    const dynamicSpawnInterval = priceSpawnMultiplier > 0 ? baseSpawnInterval / priceSpawnMultiplier : Infinity;

    // Spawn NPCs periodically with score-based limit and rate (affected by ticket price)
    if (
      priceSpawnMultiplier > 0 &&
      this.state.time - this.state.lastSpawnTime > dynamicSpawnInterval &&
      this.state.npcs.length < dynamicMaxNPCs
    ) {
      this.entityManager.createNPC(this.state);
      this.state.lastSpawnTime = this.state.time;
    }

    // Manage traffic vehicles based on dynamic density
    const maxTraffic = Math.floor(200 * this.state.trafficDensity);

    // Remove excess traffic vehicles if density decreased
    while (this.state.traffic.length > maxTraffic) {
      this.state.traffic.pop();
    }

    // Spawn new traffic vehicles if needed
    if (
      this.state.time - this.state.lastTrafficSpawnTime > TRAFFIC_SPAWN_INTERVAL &&
      this.state.traffic.length < maxTraffic &&
      this.state.trafficDensity > 0
    ) {
      this.entityManager.createTrafficVehicle(this.state);
      this.state.lastTrafficSpawnTime = this.state.time;
    }

    // Update NPCs
    this.entityManager.updateNPCs(this.state, deltaTime);

    // Update traffic
    this.entityManager.updateTraffic(this.state);

    // Update buses
    this.routeManager.updateBuses(this.state, deltaTime);

    // Calculate bus running costs
    const totalBuses = this.state.routes.reduce((sum, route) => sum + route.buses.length, 0);
    const runningCost = totalBuses * BUS_RUNNING_COST_PER_SECOND * (deltaTime / 1000);
    this.state.economics.money -= runningCost;
    this.state.economics.totalExpenses += runningCost;
    this.state.economics.busRunningCosts += runningCost;

    // Check for bankruptcy after running costs
    this.checkBankruptcy();
  }

  /**
   * Add a new route
   */
  addRoute(): boolean {
    if (this.state.routes.length >= MAX_ROUTES) {
      console.warn(`Maximum ${MAX_ROUTES} routes allowed`);
      return false;
    }

    // Check if player can afford route + initial bus
    const totalCost = ROUTE_COST + BUS_COST;
    if (this.state.economics.money < totalCost) {
      console.warn(`Not enough money to create route. Need $${totalCost}, have $${this.state.economics.money}`);
      return false;
    }

    // Deduct cost (cash payment, not an expense on income statement - will be depreciated)
    this.state.economics.money -= totalCost;
    this.state.economics.totalCapitalInvested += totalCost;

    const colorIndex = this.state.routes.length % ROUTE_COLORS.length;
    this.state.routes.push({
      stops: [],
      buses: [{
        x: 0,
        y: 0,
        currentStopIndex: 0,
        passengers: [],
        path: [],
        pathIndex: 0,
        angle: 0,
        stoppedAtStop: false,
        stopTimer: 0,
        currentSpeed: 0,
      }],
      color: ROUTE_COLORS[colorIndex],
    });

    // Rebuild spatial index
    this.updateSpatialIndex();
    return true;
  }

  /**
   * Add a bus to a route
   */
  addBusToRoute(routeIndex: number): boolean {
    if (routeIndex < 0 || routeIndex >= this.state.routes.length) return false;

    const route = this.state.routes[routeIndex];

    if (route.buses.length >= 10) {
      console.warn('Maximum 10 buses per route');
      return false;
    }

    // Check if player can afford bus
    if (this.state.economics.money < BUS_COST) {
      console.warn(`Not enough money to buy bus. Need $${BUS_COST}, have $${this.state.economics.money}`);
      return false;
    }

    // Deduct cost (cash payment, not an expense on income statement - will be depreciated)
    this.state.economics.money -= BUS_COST;
    this.state.economics.totalCapitalInvested += BUS_COST;

    // Distribute buses evenly along the route to prevent bunching
    const busCount = route.buses.length;
    const stopCount = route.stops.length;

    // Calculate which stop to start the new bus at
    let startStopIndex = 0;
    if (stopCount > 0) {
      // Distribute evenly: if we have 4 stops and adding 2nd bus, start at stop 2
      startStopIndex = Math.floor((busCount * stopCount) / (busCount + 1));
      if (startStopIndex >= stopCount) startStopIndex = stopCount - 1;
    }

    const startStop = route.stops[startStopIndex];

    // Create new bus at calculated stop
    const newBus = {
      x: startStop ? startStop.x * 30 + 15 : 0,
      y: startStop ? startStop.y * 30 + 15 : 0,
      currentStopIndex: startStopIndex,
      passengers: [],
      path: [],
      pathIndex: 0,
      angle: 0,
      stoppedAtStop: false,
      stopTimer: 0,
      currentSpeed: 0,
    };

    route.buses.push(newBus);
    console.log(`Added bus to route ${routeIndex + 1} at stop ${startStopIndex + 1}. Total buses: ${route.buses.length}`);
    return true;
  }

  /**
   * Remove a bus from a route
   */
  removeBusFromRoute(routeIndex: number): void {
    if (routeIndex < 0 || routeIndex >= this.state.routes.length) return;

    const route = this.state.routes[routeIndex];

    if (route.buses.length <= 1) {
      console.warn('Cannot remove last bus from route');
      return;
    }

    // Return passengers to waiting state
    const removedBus = route.buses.pop();
    if (removedBus && removedBus.passengers.length > 0) {
      removedBus.passengers.forEach((passenger) => {
        passenger.state = 'waiting';
        passenger.waitTime = 0;
        passenger.nearestStop = null;
        passenger.atStop = false;
        passenger.destinationStop = undefined;
        passenger.finalDestinationStop = undefined;
      });
    }

    console.log(`Removed bus from route ${routeIndex + 1}. Total buses: ${route.buses.length}`);
  }

  /**
   * Delete current active route
   */
  deleteRoute(): void {
    if (this.state.routes.length === 0) return;

    this.state.routes.splice(this.state.activeRouteIndex, 1);

    // Adjust active route index
    if (this.state.activeRouteIndex >= this.state.routes.length && this.state.routes.length > 0) {
      this.state.activeRouteIndex = this.state.routes.length - 1;
    }

    this.state.selectedStopIndex = null;

    // Rebuild spatial index
    this.updateSpatialIndex();
  }

  /**
   * Add a stop to a route with cost check
   */
  addStopToRoute(routeIndex: number, x: number, y: number): boolean {
    if (routeIndex < 0 || routeIndex >= this.state.routes.length) return false;

    const route = this.state.routes[routeIndex];

    // Check if player can afford stop
    if (this.state.economics.money < STOP_COST) {
      console.warn(`Not enough money to add stop. Need $${STOP_COST}, have $${this.state.economics.money}`);
      return false;
    }

    // Deduct cost (cash payment for stop infrastructure - will be depreciated)
    this.state.economics.money -= STOP_COST;
    this.state.economics.totalCapitalInvested += STOP_COST;

    // Add stop
    route.stops.push({ x, y });

    // Rebuild spatial index
    this.updateSpatialIndex();

    return true;
  }

  /**
   * Update spatial index (call after route changes)
   */
  updateSpatialIndex(): void {
    this.spatialIndex.rebuildIndex(this.state.routes);
  }

  /**
   * Set active route index
   */
  setActiveRoute(index: number): void {
    if (index >= 0 && index < this.state.routes.length) {
      this.state.activeRouteIndex = index;
      this.state.selectedStopIndex = null;
    }
  }

  /**
   * Apply daily accounting (interest and depreciation)
   */
  private applyDailyAccounting(): void {
    // Apply loan interest (cash expense)
    if (this.state.economics.loan > 0) {
      const interest = this.state.economics.loan * LOAN_INTEREST_PER_DAY;
      this.state.economics.loan += interest;
      this.state.economics.money -= interest; // Interest reduces cash
      this.state.economics.totalExpenses += interest;
      this.state.economics.loanInterestExpense += interest;
      console.log(`💰 Daily loan interest: $${Math.round(interest)} (Total loan: $${Math.round(this.state.economics.loan)})`);

      // Check for bankruptcy after interest
      this.checkBankruptcy();
    }

    // Calculate depreciation (non-cash expense for income statement)
    const totalBuses = this.state.routes.reduce((sum, route) => sum + route.buses.length, 0);
    const totalRoutes = this.state.routes.length;
    const totalStops = this.state.routes.reduce((sum, route) => sum + route.stops.length, 0);

    const dailyBusDepreciation = totalBuses * BUS_DEPRECIATION_PER_DAY;
    const dailyRouteDepreciation = totalRoutes * ROUTE_DEPRECIATION_PER_DAY;
    const dailyStopDepreciation = totalStops * STOP_DEPRECIATION_PER_DAY;
    const totalDepreciation = dailyBusDepreciation + dailyRouteDepreciation + dailyStopDepreciation;

    if (totalDepreciation > 0) {
      this.state.economics.depreciation += totalDepreciation;
      this.state.economics.totalExpenses += totalDepreciation;
      console.log(`📉 Daily depreciation: $${Math.round(totalDepreciation)} (${totalBuses} buses, ${totalRoutes} routes, ${totalStops} stops)`);
    }
  }

  /**
   * Calculate equity (assets - liabilities)
   */
  getEquity(): number {
    // Assets = Cash + (Capital Invested - Accumulated Depreciation)
    const bookValue = this.state.economics.totalCapitalInvested - this.state.economics.depreciation;
    const totalAssets = this.state.economics.money + bookValue;

    // Equity = Assets - Liabilities
    const equity = totalAssets - this.state.economics.loan;

    return Math.max(0, equity); // Equity can't be negative for loan calculation
  }

  /**
   * Calculate maximum loan based on equity (2x equity)
   */
  getMaxLoan(): number {
    const equity = this.getEquity();
    return equity * LOAN_TO_EQUITY_RATIO;
  }

  /**
   * Get available loan amount (max loan minus current loan)
   */
  getAvailableLoan(): number {
    return Math.max(0, this.getMaxLoan() - this.state.economics.loan);
  }

  /**
   * Take out a loan
   */
  takeLoan(amount: number): boolean {
    const available = this.getAvailableLoan();

    if (amount <= 0) {
      console.warn('Loan amount must be positive');
      return false;
    }

    if (amount > available) {
      const equity = this.getEquity();
      console.warn(`Cannot borrow $${amount}. Maximum available: $${available} (based on equity: $${Math.round(equity)})`);
      return false;
    }

    this.state.economics.loan += amount;
    this.state.economics.money += amount;
    console.log(`✓ Borrowed $${amount}. Total loan: $${Math.round(this.state.economics.loan)}`);
    return true;
  }

  /**
   * Repay loan
   */
  repayLoan(amount: number): boolean {
    if (amount <= 0) {
      console.warn('Repayment amount must be positive');
      return false;
    }

    if (amount > this.state.economics.money) {
      console.warn(`Not enough money to repay $${amount}. Current money: $${Math.round(this.state.economics.money)}`);
      return false;
    }

    if (amount > this.state.economics.loan) {
      console.warn(`Repayment amount ($${amount}) exceeds loan amount ($${Math.round(this.state.economics.loan)})`);
      return false;
    }

    this.state.economics.loan -= amount;
    this.state.economics.money -= amount;
    console.log(`✓ Repaid $${amount}. Remaining loan: $${Math.round(this.state.economics.loan)}`);
    return true;
  }

  /**
   * Set callback for bankruptcy events (forced loans and game over)
   */
  onBankruptcy(callback: BankruptcyCallback): void {
    this.bankruptcyCallback = callback;
  }

  /**
   * Set ticket price (affects income per trip and NPC spawn rate)
   */
  setTicketPrice(price: number): void {
    this.state.economics.ticketPrice = Math.max(0, Math.min(MAX_TICKET_PRICE, price));
  }

  /**
   * Check if player is bankrupt and handle forced loans or game over
   */
  private checkBankruptcy(): void {
    if (this.state.gameOver) return;
    if (this.state.economics.money >= 0) return;

    const deficit = Math.abs(this.state.economics.money);
    const available = this.getAvailableLoan();

    if (available >= deficit) {
      // Take forced loan to cover deficit (round up to nearest 100 for buffer)
      const loanAmount = Math.ceil(deficit / 100) * 100;
      const actualLoan = Math.min(loanAmount, available);

      this.state.economics.loan += actualLoan;
      this.state.economics.money += actualLoan;

      console.log(`⚠️ Forced loan: $${actualLoan} (deficit: $${deficit.toFixed(2)})`);

      if (this.bankruptcyCallback) {
        this.bankruptcyCallback('forced_loan', actualLoan);
      }
    } else {
      // Game over - can't cover deficit
      this.state.gameOver = true;
      this.state.paused = true;

      console.log(`💀 BANKRUPT! Deficit: $${deficit.toFixed(2)}, Available loan: $${available.toFixed(2)}`);

      if (this.bankruptcyCallback) {
        this.bankruptcyCallback('game_over', deficit);
      }
    }
  }

  /**
   * Get pathfinding manager
   */
  getPathfindingManager(): PathfindingManager {
    return this.pathfindingManager;
  }

  /**
   * Get spatial index
   */
  getSpatialIndex(): SpatialIndex {
    return this.spatialIndex;
  }
}
