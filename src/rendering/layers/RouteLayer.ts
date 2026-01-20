import type { GameState } from '../../types/game';
import { GRID_SIZE } from '../../config/constants';
import type { SpriteManager } from '../SpriteManager';
import type { UILayer } from './UILayer';

/**
 * RouteLayer - Renders route lines and bus stops
 */
export class RouteLayer {
  private spriteManager: SpriteManager;
  private uiLayer: UILayer;
  public showCoverageRadius: boolean = true;

  constructor(spriteManager: SpriteManager, uiLayer: UILayer) {
    this.spriteManager = spriteManager;
    this.uiLayer = uiLayer;
  }

  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    // Draw coverage radius circles (if enabled)
    if (this.showCoverageRadius) {
      const coverageRadius = 4 * GRID_SIZE; // 4 grid cells in pixels
      const coverageCirclesDrawn = new Set<string>();

      state.routes.forEach((route) => {
        route.stops.forEach((stop) => {
          const key = `${stop.x},${stop.y}`;
          if (!coverageCirclesDrawn.has(key)) {
            coverageCirclesDrawn.add(key);
            const centerX = stop.x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = stop.y * GRID_SIZE + GRID_SIZE / 2;

            // Draw subtle coverage radius circle
            ctx.save();
            ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)'; // Green with transparency
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed line
            ctx.beginPath();
            ctx.arc(centerX, centerY, coverageRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash
            ctx.restore();
          }
        });
      });
    }

    // Draw bus stop shelters (before route markers)
    const busStopsDrawn = new Set<string>();
    state.routes.forEach((route) => {
      route.stops.forEach((stop) => {
        const key = `${stop.x},${stop.y}`;
        if (!busStopsDrawn.has(key)) {
          const sprite = this.spriteManager.get('busStop');
          if (sprite) {
            busStopsDrawn.add(key);
            const centerX = stop.x * GRID_SIZE + GRID_SIZE / 2;
            const centerY = stop.y * GRID_SIZE + GRID_SIZE / 2;
            const stopWidth = GRID_SIZE * 0.8;
            const stopHeight = GRID_SIZE;

            ctx.drawImage(
              sprite,
              centerX - stopWidth / 2,
              centerY - stopHeight / 2,
              stopWidth,
              stopHeight
            );
          }
        }
      });
    });

    // Draw all routes
    state.routes.forEach((route, routeIndex) => {
      const isActiveRoute = routeIndex === state.activeRouteIndex;

      // Check if we're dragging a stop from this route
      const dragState = this.uiLayer.getDragState();
      const isDraggingThisRoute = dragState.isDragging && dragState.routeIndex === routeIndex;

      // Draw bus route lines
      if (route.stops.length > 1) {
        ctx.strokeStyle = route.color + (isActiveRoute ? 'DD' : '44');
        ctx.lineWidth = isActiveRoute ? 5 : 2;
        ctx.setLineDash(isActiveRoute ? [12, 6] : [8, 8]);
        ctx.beginPath();

        // Use modified stops if dragging
        const stopsToRender = isDraggingThisRoute
          ? route.stops.map((stop, idx) => {
              if (idx === dragState.stopIndex) {
                return { x: dragState.currentX, y: dragState.currentY };
              }
              return stop;
            })
          : route.stops;

        stopsToRender.forEach((stop, i) => {
          const x = stop.x * GRID_SIZE + GRID_SIZE / 2;
          const y = stop.y * GRID_SIZE + GRID_SIZE / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        // Close the loop
        ctx.lineTo(
          stopsToRender[0].x * GRID_SIZE + GRID_SIZE / 2,
          stopsToRender[0].y * GRID_SIZE + GRID_SIZE / 2
        );
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Collect stop info for later rendering
    });

    // Group stops by location to identify shared stops
    const stopsByLocation = new Map<string, Array<{
      routeIndex: number;
      stopIndex: number;
      color: string;
      isActive: boolean;
      isSelected: boolean;
    }>>();

    state.routes.forEach((route, routeIndex) => {
      const isActiveRoute = routeIndex === state.activeRouteIndex;
      route.stops.forEach((stop, stopIndex) => {
        const key = `${stop.x},${stop.y}`;
        if (!stopsByLocation.has(key)) {
          stopsByLocation.set(key, []);
        }
        const isSelected = isActiveRoute && stopIndex === state.selectedStopIndex;
        stopsByLocation.get(key)!.push({
          routeIndex,
          stopIndex,
          color: route.color,
          isActive: isActiveRoute,
          isSelected,
        });
      });
    });

    // Render stops with multiple colors for shared locations
    stopsByLocation.forEach((routeStops, locationKey) => {
      const [x, y] = locationKey.split(',').map(Number);
      const centerX = x * GRID_SIZE + GRID_SIZE / 2;
      const centerY = y * GRID_SIZE + GRID_SIZE / 2;

      // Check if any route is active or selected
      const hasActiveRoute = routeStops.some(rs => rs.isActive);
      const hasSelectedStop = routeStops.some(rs => rs.isSelected);
      const stopRadius = hasActiveRoute ? GRID_SIZE * 0.55 : GRID_SIZE * 0.4;

      // Draw white glow for active route stops
      if (hasActiveRoute) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, stopRadius + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Highlight selected stop
      if (hasSelectedStop) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, stopRadius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw concentric rings for multiple routes
      if (routeStops.length > 1) {
        const ringThickness = stopRadius / routeStops.length;

        // Draw from outside to inside
        routeStops.forEach((routeStop, index) => {
          const outerRadius = stopRadius - (index * ringThickness);
          const innerRadius = outerRadius - ringThickness;

          ctx.fillStyle = routeStop.color;
          ctx.beginPath();
          ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
          ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2, true);
          ctx.fill();
        });

        // White border for active route stops
        if (hasActiveRoute) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, stopRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // Single route - draw solid circle
        const routeStop = routeStops[0];

        // White border for active route stops
        if (routeStop.isActive) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, stopRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = routeStop.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, stopRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw stop number (from active route if present, otherwise first route)
      const activeStop = routeStops.find(rs => rs.isActive) || routeStops[0];
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(GRID_SIZE * (hasActiveRoute ? 0.65 : 0.5))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(activeStop.stopIndex + 1), centerX, centerY);
    });
  }
}
