import type { GameState } from '../../types/game';
import { ZoneType } from '../../types/city';
import { GRID_SIZE, COLS, ROWS } from '../../config/constants';
import type { SpriteManager } from '../SpriteManager';

/**
 * GridLayer - Renders static grid (roads and zones)
 * KEY OPTIMIZATION: Renders once to offscreen canvas, then blits each frame
 * Reduces from 3,600 draw calls per frame to 1 draw call per frame (360x improvement)
 */
export class GridLayer {
  private offscreenCanvas: OffscreenCanvas;
  private offscreenCtx: OffscreenCanvasRenderingContext2D;
  private isDirty: boolean = true;
  private spriteManager: SpriteManager;

  constructor(spriteManager: SpriteManager) {
    this.spriteManager = spriteManager;
    this.offscreenCanvas = new OffscreenCanvas(COLS * GRID_SIZE, ROWS * GRID_SIZE);
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
  }

  /**
   * Mark layer as dirty (needs re-render)
   */
  markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Render grid to offscreen canvas (only when dirty)
   */
  private renderToOffscreen(state: GameState): void {
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

    // First pass: Draw grass on all empty cells
    const grassSprite = this.spriteManager.get('grass');
    if (grassSprite) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const cellType = state.cityGrid[y][x];
          if (cellType === ZoneType.EMPTY) {
            this.offscreenCtx.drawImage(
              grassSprite,
              x * GRID_SIZE,
              y * GRID_SIZE,
              GRID_SIZE,
              GRID_SIZE
            );
          }
        }
      }
    }

    // Second pass: Randomly place trees on some empty cells
    const tree1Sprite = this.spriteManager.get('tree1');
    const tree2Sprite = this.spriteManager.get('tree2');
    if (tree1Sprite && tree2Sprite) {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const cellType = state.cityGrid[y][x];
          if (cellType === ZoneType.EMPTY) {
            // Use deterministic randomness based on position for consistency
            const seed = x * 1000 + y;
            const pseudo = (seed * 9301 + 49297) % 233280;
            const rand = pseudo / 233280;

            // 15% chance of a tree
            if (rand < 0.15) {
              const treeSprite = (seed % 2 === 0) ? tree1Sprite : tree2Sprite;
              this.offscreenCtx.drawImage(
                treeSprite,
                x * GRID_SIZE,
                y * GRID_SIZE,
                GRID_SIZE,
                GRID_SIZE
              );
            }
          }
        }
      }
    }

    // Third pass: Draw roads with sprites
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cellType = state.cityGrid[y][x];

        if (cellType === ZoneType.ROAD) {
          let roadSprite = 'roadVertical';

          // Determine which road sprite to use
          if (x % 7 === 0 && y % 7 === 0) {
            roadSprite = 'roadIntersection';
          } else if (x % 7 === 0) {
            roadSprite = 'roadVertical';
          } else if (y % 7 === 0) {
            roadSprite = 'roadHorizontal';
          }

          const sprite = this.spriteManager.get(roadSprite);
          if (sprite) {
            this.offscreenCtx.drawImage(
              sprite,
              x * GRID_SIZE,
              y * GRID_SIZE,
              GRID_SIZE,
              GRID_SIZE
            );
          }
        }
      }
    }

    // Draw buildings with sprites
    state.zones.forEach((zone) => {
      if (zone.sprite) {
        const sprite = this.spriteManager.get(zone.sprite);
        if (sprite) {
          const zoneX = zone.x * GRID_SIZE;
          const zoneY = zone.y * GRID_SIZE;
          const zoneW = zone.w * GRID_SIZE;
          const zoneH = zone.h * GRID_SIZE;

          this.offscreenCtx.drawImage(sprite, zoneX, zoneY, zoneW, zoneH);
        }
      }
    });

    this.isDirty = false;
  }

  /**
   * Render layer to main canvas
   * This is called every frame but only re-renders offscreen canvas when dirty
   */
  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (this.isDirty) {
      this.renderToOffscreen(state);
    }

    // Blit the offscreen canvas to the main canvas (1 draw call)
    ctx.drawImage(this.offscreenCanvas as any, 0, 0);
  }
}
