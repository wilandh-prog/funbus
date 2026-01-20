import type { Waypoint } from '../types/entities';
import type { CityGrid } from '../types/city';
import { ZoneType } from '../types/city';
import { GRID_SIZE, COLS, ROWS } from '../config/constants';
import { PathCache } from './PathCache';

export class PathfindingManager {
  private cache: PathCache;
  private cityGrid: CityGrid;

  constructor(cityGrid: CityGrid) {
    this.cache = new PathCache();
    this.cityGrid = cityGrid;
  }

  /**
   * Find a path from start to end coordinates using BFS on roads
   */
  findPath(startX: number, startY: number, endX: number, endY: number): Waypoint[] {
    // Check cache first
    const cacheKey = this.cache.generateKey(startX, startY, endX, endY);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Perform BFS pathfinding
    const path = this.bfsPathfinding(startX, startY, endX, endY);

    // Cache the result
    this.cache.set(cacheKey, path);

    return path;
  }

  /**
   * BFS pathfinding algorithm on road network
   */
  private bfsPathfinding(startX: number, startY: number, endX: number, endY: number): Waypoint[] {
    const startGridX = Math.round(startX / GRID_SIZE);
    const startGridY = Math.round(startY / GRID_SIZE);
    const endGridX = Math.round(endX / GRID_SIZE);
    const endGridY = Math.round(endY / GRID_SIZE);

    // If start and end are the same, return immediately
    if (startGridX === endGridX && startGridY === endGridY) {
      return [{ x: endX, y: endY }];
    }

    const queue: Array<{ x: number; y: number; path: Array<{ x: number; y: number }> }> = [
      { x: startGridX, y: startGridY, path: [] },
    ];
    const visited = new Set<string>();
    visited.add(`${startGridX},${startGridY}`);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.x === endGridX && current.y === endGridY) {
        // Convert grid coordinates to pixel coordinates
        const waypoints = current.path.map((p) => ({
          x: p.x * GRID_SIZE,
          y: p.y * GRID_SIZE,
        }));
        waypoints.push({ x: endX, y: endY });
        return waypoints;
      }

      // Check 4 directions (up, right, down, left)
      const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: 1, dy: 0 }, // right
        { dx: 0, dy: 1 }, // down
        { dx: -1, dy: 0 }, // left
      ];

      for (const dir of directions) {
        const newX = current.x + dir.dx;
        const newY = current.y + dir.dy;
        const key = `${newX},${newY}`;

        if (
          newX >= 0 &&
          newX < COLS &&
          newY >= 0 &&
          newY < ROWS &&
          !visited.has(key) &&
          this.cityGrid[newY][newX] === ZoneType.ROAD
        ) {
          visited.add(key);
          queue.push({
            x: newX,
            y: newY,
            path: [...current.path, { x: newX, y: newY }],
          });
        }
      }
    }

    // No path found, return direct line to destination
    return [{ x: endX, y: endY }];
  }

  /**
   * Update the city grid reference (e.g., if city regenerates)
   */
  updateCityGrid(cityGrid: CityGrid): void {
    this.cityGrid = cityGrid;
    this.cache.clear(); // Clear cache when grid changes
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear the path cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}
