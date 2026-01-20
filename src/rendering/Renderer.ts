import type { GameState } from '../types/game';
import { SpriteManager } from './SpriteManager';
import { GridLayer } from './layers/GridLayer';
import { RouteLayer } from './layers/RouteLayer';
import { EntityLayer } from './layers/EntityLayer';
import { UILayer } from './layers/UILayer';

/**
 * Renderer - Orchestrates multi-layer canvas rendering
 * Implements optimized layer-based rendering for maximum performance
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private spriteManager: SpriteManager;

  // Rendering layers
  private gridLayer: GridLayer;
  private routeLayer: RouteLayer;
  private entityLayer: EntityLayer;
  private uiLayer: UILayer;

  private spritesLoaded: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.spriteManager = new SpriteManager();

    // Initialize layers
    this.gridLayer = new GridLayer(this.spriteManager);
    this.uiLayer = new UILayer();
    this.routeLayer = new RouteLayer(this.spriteManager, this.uiLayer);
    this.entityLayer = new EntityLayer(this.spriteManager);
  }

  /**
   * Load all sprites asynchronously
   */
  async loadSprites(): Promise<void> {
    await this.spriteManager.loadAll();
    this.spritesLoaded = true;
    this.gridLayer.markDirty(); // Mark grid for initial render
  }

  /**
   * Get UI layer for external updates
   */
  getUILayer(): UILayer {
    return this.uiLayer;
  }

  /**
   * Get Route layer for external updates
   */
  getRouteLayer(): RouteLayer {
    return this.routeLayer;
  }

  /**
   * Get Entity layer for external updates
   */
  getEntityLayer(): EntityLayer {
    return this.entityLayer;
  }

  /**
   * Mark grid layer as dirty (needs re-render)
   */
  markGridDirty(): void {
    this.gridLayer.markDirty();
  }

  /**
   * Main render function
   */
  render(state: GameState, camera = { x: 0, y: 0, zoom: 1.0 }): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Clip rendering to canvas bounds
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.clip();

    // Show loading screen if sprites not loaded
    if (!this.spritesLoaded) {
      this.renderLoadingScreen();
      this.ctx.restore();
      return;
    }

    // Apply camera transform (translate then scale)
    this.ctx.translate(camera.x, camera.y);
    this.ctx.scale(camera.zoom, camera.zoom);

    // Render layers in order (bottom to top)
    this.gridLayer.render(this.ctx, state); // Static grid (roads & zones)
    this.routeLayer.render(this.ctx, state); // Route lines & stops
    this.entityLayer.render(this.ctx, state); // NPCs, buses, traffic
    this.uiLayer.render(this.ctx, state); // Highlights & overlays

    // Apply day/night overlay
    this.renderDayNightOverlay(this.ctx, state.timeOfDay);

    this.ctx.restore();
  }

  /**
   * Render day/night cycle overlay
   */
  private renderDayNightOverlay(ctx: CanvasRenderingContext2D, timeOfDay: number): void {
    // timeOfDay: 0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm, 1.0 = midnight

    let overlayColor: string;
    let overlayAlpha: number;

    // Calculate time phase
    if (timeOfDay < 0.25) {
      // Night to Dawn (0:00 - 6:00)
      const progress = timeOfDay / 0.25; // 0 to 1
      overlayColor = '#0a0a2e'; // Deep blue-black
      overlayAlpha = 0.5 - progress * 0.35; // 0.5 to 0.15 (getting brighter)
    } else if (timeOfDay < 0.35) {
      // Dawn (6:00 - 8:24)
      const progress = (timeOfDay - 0.25) / 0.10; // 0 to 1
      overlayColor = '#ff8844'; // Orange dawn
      overlayAlpha = 0.15 - progress * 0.15; // 0.15 to 0 (dawn glow fades)
    } else if (timeOfDay < 0.65) {
      // Day (8:24 - 15:36) - no overlay
      overlayColor = '#ffffff';
      overlayAlpha = 0;
    } else if (timeOfDay < 0.75) {
      // Dusk (15:36 - 18:00)
      const progress = (timeOfDay - 0.65) / 0.10; // 0 to 1
      overlayColor = '#ff6622'; // Red-orange dusk
      overlayAlpha = progress * 0.2; // 0 to 0.2 (dusk glow appears)
    } else {
      // Evening to Night (18:00 - 24:00)
      const progress = (timeOfDay - 0.75) / 0.25; // 0 to 1
      overlayColor = '#0a0a2e'; // Deep blue-black
      overlayAlpha = 0.2 + progress * 0.3; // 0.2 to 0.5 (getting darker)
    }

    if (overlayAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = overlayAlpha;
      ctx.fillStyle = overlayColor;
      ctx.fillRect(0, 0, this.canvas.width / ctx.getTransform().a, this.canvas.height / ctx.getTransform().d);
      ctx.restore();
    }
  }

  /**
   * Render loading screen
   */
  private renderLoadingScreen(): void {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 32px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Loading sprites...', this.canvas.width / 2, this.canvas.height / 2);
  }
}
