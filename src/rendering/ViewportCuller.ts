import type { ViewportState, GridBounds } from '../types/game';
import { COLS, ROWS, GRID_SIZE } from '../config/constants';

export class ViewportCuller {
  /**
   * Calculate visible grid bounds based on viewport
   * For now, returns full grid (viewport scrolling not implemented yet)
   */
  calculateVisibleBounds(_viewport: ViewportState): GridBounds {
    // TODO: Implement actual viewport calculation when panning/zooming is added
    return {
      minX: 0,
      minY: 0,
      maxX: COLS,
      maxY: ROWS,
    };
  }

  /**
   * Filter entities by viewport visibility
   */
  getVisibleEntities<T extends { x: number; y: number }>(
    entities: T[],
    viewport: ViewportState
  ): T[] {
    const { minX, minY, maxX, maxY } = viewport.visibleGridBounds;

    return entities.filter((entity) => {
      const gridX = entity.x / GRID_SIZE;
      const gridY = entity.y / GRID_SIZE;
      return gridX >= minX && gridX <= maxX && gridY >= minY && gridY <= maxY;
    });
  }

  /**
   * Check if a point is visible in the viewport
   */
  isPointVisible(x: number, y: number, viewport: ViewportState): boolean {
    const gridX = x / GRID_SIZE;
    const gridY = y / GRID_SIZE;
    const { minX, minY, maxX, maxY } = viewport.visibleGridBounds;
    return gridX >= minX && gridX <= maxX && gridY >= minY && gridY <= maxY;
  }
}
