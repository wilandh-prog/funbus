import type { GameState } from '../../types/game';
import { ZoneType } from '../../types/city';
import { GRID_SIZE, BUS_SPEED } from '../../config/constants';
import type { SpriteManager } from '../SpriteManager';

/**
 * EntityLayer - Renders dynamic entities (NPCs, buses, traffic)
 */
export class EntityLayer {
  private spriteManager: SpriteManager;
  public showBusSpeed: boolean = true;

  constructor(spriteManager: SpriteManager) {
    this.spriteManager = spriteManager;
  }

  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    // Draw NPCs
    this.renderNPCs(ctx, state);

    // Draw traffic vehicles
    this.renderTraffic(ctx, state);

    // Draw buses
    this.renderBuses(ctx, state);
  }

  private renderNPCs(ctx: CanvasRenderingContext2D, state: GameState): void {
    const npcSprite = this.spriteManager.get('npc');

    state.npcs.forEach((npc) => {
      // Render NPCs when walking OR waiting (not when traveling on bus or arrived)
      if ((npc.state === 'walking' || npc.state === 'waiting') && npcSprite) {
        ctx.drawImage(npcSprite, npc.x - 6, npc.y - 6, 12, 12);

        // Draw NPC name above the sprite
        if (npc.name) {
          ctx.save();
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          const textMetrics = ctx.measureText(npc.name);
          const textWidth = textMetrics.width;
          const textHeight = 10;
          const nameY = npc.y - 10;

          // Semi-transparent background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(
            npc.x - textWidth / 2 - 2,
            nameY - textHeight,
            textWidth + 4,
            textHeight + 2
          );

          // Draw name text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(npc.name, npc.x, nameY);
          ctx.restore();
        }

        // Draw destination line for walking NPCs
        if (npc.state === 'walking' && npc.nearestStop) {
          const stopX = npc.nearestStop.x * GRID_SIZE;
          const stopY = npc.nearestStop.y * GRID_SIZE;

          ctx.strokeStyle = '#44ff44';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(npc.x, npc.y);
          ctx.lineTo(stopX, stopY);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Draw wait progress circle for waiting NPCs
        if (npc.state === 'waiting' && npc.waitTime > 0) {
          const maxWaitTime = 60;
          const progress = Math.min(npc.waitTime / maxWaitTime, 1);

          ctx.strokeStyle = progress > 0.8 ? '#ff4444' : progress > 0.5 ? '#ffaa44' : '#44ff44';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(npc.x, npc.y, 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
          ctx.stroke();
        }

        // Draw destination zone line for waiting NPCs
        if (npc.state === 'waiting' && npc.destinationZone) {
          const centerX = (npc.destinationZone.x + npc.destinationZone.w / 2) * GRID_SIZE;
          const centerY = (npc.destinationZone.y + npc.destinationZone.h / 2) * GRID_SIZE;

          ctx.strokeStyle =
            npc.destinationZone.type === ZoneType.COMMERCIAL ? '#4a9bd1' : '#9b5a23';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(npc.x, npc.y);
          ctx.lineTo(centerX, centerY);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    });
  }

  private renderTraffic(ctx: CanvasRenderingContext2D, state: GameState): void {
    state.traffic.forEach((vehicle) => {
      const sprite = this.spriteManager.get(vehicle.type.sprite);
      if (!sprite) return;

      ctx.save();
      ctx.translate(vehicle.x, vehicle.y);
      ctx.rotate(vehicle.angle);

      const vehicleLength = vehicle.type.length * GRID_SIZE;
      const vehicleWidth = vehicle.type.width * GRID_SIZE;

      ctx.drawImage(sprite, -vehicleLength / 2, -vehicleWidth / 2, vehicleLength, vehicleWidth);
      ctx.restore();
    });
  }

  private renderBuses(ctx: CanvasRenderingContext2D, state: GameState): void {
    const busSprite = this.spriteManager.get('bus');
    if (!busSprite) return;

    state.routes.forEach((route) => {
      if (route.stops.length === 0) return;

      route.buses.forEach((bus) => {
        // Draw speed indicator ring (if enabled)
        if (this.showBusSpeed && !bus.stoppedAtStop) {
          const speedPercent = (bus.currentSpeed / BUS_SPEED) * 100;
          let speedColor: string;

          if (speedPercent >= 90) {
            speedColor = 'rgba(74, 222, 128, 0.8)'; // Green - full speed
          } else if (speedPercent >= 65) {
            speedColor = 'rgba(250, 204, 21, 0.8)'; // Yellow - medium-high speed
          } else if (speedPercent >= 40) {
            speedColor = 'rgba(251, 146, 60, 0.8)'; // Orange - low speed
          } else {
            speedColor = 'rgba(239, 68, 68, 0.8)'; // Red - very low speed
          }

          ctx.strokeStyle = speedColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(bus.x, bus.y, GRID_SIZE * 0.75, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw stop indicator if bus is stopped
        if (bus.stoppedAtStop) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(bus.x, bus.y, GRID_SIZE * 0.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = route.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(bus.x, bus.y, GRID_SIZE * 0.8, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw bus
        ctx.save();
        ctx.translate(bus.x, bus.y);
        ctx.rotate(bus.angle);

        const busLength = GRID_SIZE * 1.2;
        const busWidth = GRID_SIZE * 0.67;
        ctx.drawImage(busSprite, -busLength / 2, -busWidth / 2, busLength, busWidth);
        ctx.restore();

        // Draw passenger count badge
        if (bus.passengers.length > 0) {
          ctx.fillStyle = route.color;
          ctx.beginPath();
          ctx.arc(bus.x + 12, bus.y - 8, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(bus.passengers.length), bus.x + 12, bus.y - 8);
        }
      });
    });
  }
}
