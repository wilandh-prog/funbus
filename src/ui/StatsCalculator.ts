import type { GameState } from '../types/game';
import { GRID_SIZE } from '../config/constants';

/**
 * StatsCalculator - Calculates coverage and score metrics
 */
export class StatsCalculator {
  private lastCoverageLogTime = 0;

  /**
   * Calculate service coverage (what % of zones are near a bus stop)
   */
  calculateCoverage(state: GameState): number {
    if (state.zones.length === 0) return 0;

    const coverageRadius = 4; // Grid cells (stricter coverage requirement)
    let coveredZones = 0;
    const uncoveredByType = { residential: 0, commercial: 0, industrial: 0 };

    for (const zone of state.zones) {
      const zoneCenterX = zone.x + zone.w / 2;
      const zoneCenterY = zone.y + zone.h / 2;

      // Check if any bus stop across all routes is within range
      let covered = false;
      let minDist = Infinity;
      for (const route of state.routes) {
        for (const stop of route.stops) {
          const dx = stop.x - zoneCenterX;
          const dy = stop.y - zoneCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist) minDist = dist;

          if (dist <= coverageRadius) {
            covered = true;
            break;
          }
        }
        if (covered) break;
      }

      if (covered) {
        coveredZones++;
      } else {
        if (zone.type === 'residential' || zone.type === 'commercial' || zone.type === 'industrial') {
          uncoveredByType[zone.type]++;
        }
      }
    }

    // DIAGNOSTIC: Log coverage details (throttled to once per 5 seconds)
    const now = Date.now();
    if (now - this.lastCoverageLogTime > 5000) {
      this.lastCoverageLogTime = now;
      const totalStops = state.routes.reduce((sum, route) => sum + route.stops.length, 0);
      console.log('=== COVERAGE DIAGNOSTIC ===');
      console.log(
        `Coverage radius: ${coverageRadius} grid cells (${coverageRadius * GRID_SIZE} pixels)`
      );
      console.log(`Total zones: ${state.zones.length}`);
      console.log(
        `Covered zones: ${coveredZones} (${Math.round((coveredZones / state.zones.length) * 100)}%)`
      );
      console.log(`Uncovered zones: ${state.zones.length - coveredZones}`);
      console.log(`  - Residential: ${uncoveredByType.residential}`);
      console.log(`  - Commercial: ${uncoveredByType.commercial}`);
      console.log(`  - Industrial: ${uncoveredByType.industrial}`);
      console.log(`Total stops across all routes: ${totalStops}`);
      console.log(`Routes: ${state.routes.length}`);
      console.log('=========================');
    }

    return coveredZones / state.zones.length;
  }

  /**
   * Calculate efficiency for a single route (0-1)
   */
  calculateSingleRouteEfficiency(route: any): number {
    if (route.stops.length < 2) return 0;

    let routeScore = 0;
    let factors = 0;

    // 1. Stop spacing (0-1): Penalize stops that are too close together
    const minDesiredSpacing = 4; // grid cells (stricter)
    const optimalMinSpacing = 5; // grid cells
    const optimalMaxSpacing = 8; // grid cells (tighter range)
    const maxDesiredSpacing = 12; // grid cells
    let spacingScore = 0;
    let spacingCount = 0;

    for (let i = 0; i < route.stops.length; i++) {
      const stop1 = route.stops[i];
      const stop2 = route.stops[(i + 1) % route.stops.length];
      const dx = stop2.x - stop1.x;
      const dy = stop2.y - stop1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDesiredSpacing) {
        spacingScore += 0.2; // Too close - very poor score
      } else if (dist >= optimalMinSpacing && dist <= optimalMaxSpacing) {
        spacingScore += 1.0; // Perfect spacing
      } else if (dist < optimalMinSpacing) {
        spacingScore += 0.5; // Slightly too close
      } else if (dist <= maxDesiredSpacing) {
        spacingScore += 0.6; // Acceptable but far
      } else {
        spacingScore += 0.3; // Too far - poor score
      }
      spacingCount++;
    }

    if (spacingCount > 0) {
      routeScore += spacingScore / spacingCount;
      factors++;
    }

    // 2. Route length (0-1): Optimal number of stops
    const optimalMinStops = 6;
    const optimalMaxStops = 10;
    const minStops = 4;
    const maxStops = 15;

    let lengthScore = 0;
    if (route.stops.length < minStops) {
      lengthScore = route.stops.length / minStops * 0.3; // Too short - very poor
    } else if (route.stops.length >= optimalMinStops && route.stops.length <= optimalMaxStops) {
      lengthScore = 1.0; // Optimal range
    } else if (route.stops.length < optimalMinStops) {
      // Between minStops and optimalMinStops
      const range = optimalMinStops - minStops;
      const position = route.stops.length - minStops;
      lengthScore = 0.3 + (position / range) * 0.7; // 0.3 to 1.0
    } else if (route.stops.length <= maxStops) {
      // Between optimalMaxStops and maxStops
      const range = maxStops - optimalMaxStops;
      const position = route.stops.length - optimalMaxStops;
      lengthScore = 1.0 - (position / range) * 0.7; // 1.0 to 0.3
    } else {
      lengthScore = 0.2; // Too long - very poor
    }

    routeScore += lengthScore;
    factors++;

    // 3. Bus to stop ratio (0-1): Enough buses for the route
    const optimalBusesNeeded = Math.max(1, Math.ceil(route.stops.length / 5)); // 1 bus per 5 stops (stricter)
    const busRatio = route.buses.length / optimalBusesNeeded;

    let busScore = 0;
    if (busRatio >= 1.0) {
      busScore = 1.0; // Enough buses
    } else if (busRatio >= 0.8) {
      busScore = 0.7; // Slightly under-served
    } else if (busRatio >= 0.6) {
      busScore = 0.4; // Under-served
    } else {
      busScore = 0.2; // Very under-served
    }

    routeScore += busScore;
    factors++;

    // 4. Route compactness (0-1): Routes should be somewhat compact, not sprawling
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const stop of route.stops) {
      minX = Math.min(minX, stop.x);
      maxX = Math.max(maxX, stop.x);
      minY = Math.min(minY, stop.y);
      maxY = Math.max(maxY, stop.y);
    }
    const routeWidth = maxX - minX + 1;
    const routeHeight = maxY - minY + 1;
    const routeArea = routeWidth * routeHeight;
    const stopsPerArea = route.stops.length / Math.max(1, routeArea);

    // Stricter density requirements: 0.03-0.08 stops per grid cell squared
    let compactnessScore = 0;
    if (stopsPerArea > 0.12) {
      compactnessScore = 0.3; // Too dense - poor
    } else if (stopsPerArea >= 0.08) {
      compactnessScore = 0.6; // Slightly too dense
    } else if (stopsPerArea >= 0.03) {
      compactnessScore = 1.0; // Good density
    } else if (stopsPerArea >= 0.015) {
      // Between 0.015 and 0.03 - getting sparse
      compactnessScore = 0.5 + (stopsPerArea - 0.015) / (0.03 - 0.015) * 0.5;
    } else {
      compactnessScore = Math.max(0.2, stopsPerArea / 0.015 * 0.5); // Too sparse - poor
    }

    routeScore += compactnessScore;
    factors++;

    // Return average of all factors
    return factors > 0 ? routeScore / factors : 0;
  }

  /**
   * Calculate route efficiency (0-1) - average across all routes
   * Measures how well-designed the routes are
   */
  calculateRouteEfficiency(state: GameState): number {
    if (state.routes.length === 0) return 0;

    let totalEfficiency = 0;
    let validRoutes = 0;

    for (const route of state.routes) {
      const efficiency = this.calculateSingleRouteEfficiency(route);
      if (efficiency > 0) {
        totalEfficiency += efficiency;
        validRoutes++;
      }
    }

    return validRoutes > 0 ? totalEfficiency / validRoutes : 0;
  }

  /**
   * Calculate overall score (0-100)
   * Focused on NPC happiness: success rate, wait time, transport time, and service coverage
   */
  calculateScore(state: GameState): number {
    const totalNPCs = state.stats.tripsCompleted + state.stats.npcsGaveUp;
    if (totalNPCs === 0) return 0;

    // Success rate (0-30 points): did NPCs reach their destination?
    // NPCs are happy if they get where they want to go
    const successRate = state.stats.tripsCompleted / totalNPCs;
    const successScore = successRate * 30;

    // Wait time score (0-30 points): how long did NPCs wait at stops?
    // NPCs get angry when waiting too long
    // Perfect score at 0s wait, 0 points at 60s wait
    const avgWaitTime =
      state.stats.tripsCompleted > 0
        ? state.stats.totalWaitTime / state.stats.tripsCompleted
        : 60;
    const waitScore = Math.max(0, (1 - avgWaitTime / 60) * 30);

    // Transport time score (0-20 points): how long did the journey take?
    // Fast transport makes NPCs happy
    // Perfect score at 0s transport, 0 points at 120s transport (2 minutes)
    const avgTransportTime =
      state.stats.tripsCompleted > 0
        ? state.stats.totalTransportTime / state.stats.tripsCompleted
        : 120;
    const transportScore = Math.max(0, (1 - avgTransportTime / 120) * 20);

    // Coverage score (0-20 points): can NPCs reach their destinations?
    // If zones aren't served, NPCs can't complete trips at all
    const coverage = this.calculateCoverage(state);
    const coverageScore = coverage * 20;

    const rawScore = successScore + waitScore + transportScore + coverageScore;

    // Apply smoothing: require minimum number of trips for score confidence
    // 0-20 trips: scale score progressively from 0% to 100%
    const minTripsForFullScore = 20;
    const smoothingFactor = Math.min(1, totalNPCs / minTripsForFullScore);

    return Math.round(rawScore * smoothingFactor);
  }
}
