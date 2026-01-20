import type { Stop, Route } from '../types/entities';
import { GRID_SIZE, COLS, ROWS } from '../config/constants';

/**
 * SpatialIndex - Optimizes nearest-stop lookups
 * Reduces O(n×m) nested loop to O(1) average case using grid-based spatial hashing
 * Expected performance improvement: 100-1000x faster
 */
export class SpatialIndex {
  private stopsByGridCell = new Map<string, Stop[]>();

  /**
   * Rebuild the spatial index from current routes
   */
  rebuildIndex(routes: Route[]): void {
    this.stopsByGridCell.clear();

    routes.forEach((route) => {
      route.stops.forEach((stop) => {
        const key = `${stop.x},${stop.y}`;
        const stops = this.stopsByGridCell.get(key) || [];
        stops.push(stop);
        this.stopsByGridCell.set(key, stops);
      });
    });
  }

  /**
   * Find nearest stop to pixel coordinates (optimized)
   */
  findNearestStop(pixelX: number, pixelY: number): Stop | null {
    // Bounds check
    const canvasSize = COLS * GRID_SIZE;
    if (pixelX < 0 || pixelY < 0 || pixelX >= canvasSize || pixelY >= canvasSize) {
      console.warn('findNearestStop called with out-of-bounds coordinates:', {
        x: pixelX,
        y: pixelY,
        canvasSize,
        gridX: pixelX / GRID_SIZE,
        gridY: pixelY / GRID_SIZE,
      });
      return null;
    }

    const gridX = Math.round(pixelX / GRID_SIZE);
    const gridY = Math.round(pixelY / GRID_SIZE);

    // Spiral search outward from grid position
    // Search up to max distance: sqrt(COLS^2 + ROWS^2) = sqrt(60^2 + 60^2) ≈ 85
    const maxRadius = Math.ceil(Math.sqrt(COLS * COLS + ROWS * ROWS));
    for (let radius = 0; radius < maxRadius; radius++) {
      const stops = this.getStopsInRadius(gridX, gridY, radius);
      if (stops.length > 0) {
        return this.findClosest(stops, pixelX, pixelY);
      }
    }

    return null;
  }

  /**
   * Get all stops within a radius (in grid cells) of a position
   */
  private getStopsInRadius(centerX: number, centerY: number, radius: number): Stop[] {
    const stops: Stop[] = [];

    if (radius === 0) {
      const key = `${centerX},${centerY}`;
      const cellStops = this.stopsByGridCell.get(key);
      if (cellStops) {
        stops.push(...cellStops);
      }
      return stops;
    }

    // Check perimeter of square with given radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only check perimeter (not interior)
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const x = centerX + dx;
          const y = centerY + dy;

          if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
            const key = `${x},${y}`;
            const cellStops = this.stopsByGridCell.get(key);
            if (cellStops) {
              stops.push(...cellStops);
            }
          }
        }
      }
    }

    return stops;
  }

  /**
   * Find closest stop to pixel coordinates from a list of candidates
   */
  private findClosest(stops: Stop[], pixelX: number, pixelY: number): Stop | null {
    let nearest: Stop | null = null;
    let minDist = Infinity;

    stops.forEach((stop) => {
      const dist = this.distance(pixelX, pixelY, stop.x * GRID_SIZE, stop.y * GRID_SIZE);
      if (dist < minDist) {
        minDist = dist;
        nearest = stop;
      }
    });

    return nearest;
  }

  /**
   * Calculate Euclidean distance
   */
  private distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.stopsByGridCell.clear();
  }
}
