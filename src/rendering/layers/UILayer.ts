import type { GameState } from '../../types/game';
import { ZoneType } from '../../types/city';
import { GRID_SIZE } from '../../config/constants';

/**
 * UILayer - Renders UI overlays (highlights, tooltips)
 */
export class UILayer {
  private hoveredGridX: number = -1;
  private hoveredGridY: number = -1;
  private menuTargetGridX: number = -1;
  private menuTargetGridY: number = -1;
  private dragStartX: number = -1;
  private dragStartY: number = -1;
  private dragCurrentX: number = -1;
  private dragCurrentY: number = -1;
  private dragRouteColor: string = '';
  private isDragging: boolean = false;
  private dragRouteIndex: number = -1;
  private dragStopIndex: number = -1;

  /**
   * Update hover state
   */
  setHoverCell(gridX: number, gridY: number): void {
    this.hoveredGridX = gridX;
    this.hoveredGridY = gridY;
  }

  /**
   * Update menu target cell
   */
  setMenuTargetCell(gridX: number, gridY: number): void {
    this.menuTargetGridX = gridX;
    this.menuTargetGridY = gridY;
  }

  /**
   * Clear menu target
   */
  clearMenuTarget(): void {
    this.menuTargetGridX = -1;
    this.menuTargetGridY = -1;
  }

  /**
   * Set drag preview state
   */
  setDragPreview(startX: number, startY: number, currentX: number, currentY: number, routeColor: string, routeIndex: number, stopIndex: number): void {
    this.dragStartX = startX;
    this.dragStartY = startY;
    this.dragCurrentX = currentX;
    this.dragCurrentY = currentY;
    this.dragRouteColor = routeColor;
    this.dragRouteIndex = routeIndex;
    this.dragStopIndex = stopIndex;
    this.isDragging = true;
  }

  /**
   * Clear drag preview
   */
  clearDragPreview(): void {
    this.isDragging = false;
    this.dragStartX = -1;
    this.dragStartY = -1;
    this.dragCurrentX = -1;
    this.dragCurrentY = -1;
    this.dragRouteColor = '';
    this.dragRouteIndex = -1;
    this.dragStopIndex = -1;
  }

  /**
   * Get drag state for route rendering
   */
  getDragState(): { isDragging: boolean; routeIndex: number; stopIndex: number; currentX: number; currentY: number } {
    return {
      isDragging: this.isDragging,
      routeIndex: this.dragRouteIndex,
      stopIndex: this.dragStopIndex,
      currentX: this.dragCurrentX,
      currentY: this.dragCurrentY,
    };
  }

  render(ctx: CanvasRenderingContext2D, state: GameState): void {
    this.renderHoverHighlight(ctx, state);
    this.renderDragPreview(ctx, state);
    this.renderZoneTooltip(ctx, state);
    this.renderStopTooltip(ctx, state);
  }

  private renderHoverHighlight(ctx: CanvasRenderingContext2D, state: GameState): void {
    let highlightX = -1;
    let highlightY = -1;

    // Priority: menu target cell, then hovered cell
    if (this.menuTargetGridX >= 0 && this.menuTargetGridY >= 0) {
      highlightX = this.menuTargetGridX;
      highlightY = this.menuTargetGridY;
    } else if (this.hoveredGridX >= 0 && this.hoveredGridY >= 0) {
      highlightX = this.hoveredGridX;
      highlightY = this.hoveredGridY;
    }

    if (highlightX >= 0 && highlightY >= 0 && state.routes.length > 0) {
      const cellType = state.cityGrid[highlightY][highlightX];
      if (cellType === ZoneType.ROAD) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillRect(highlightX * GRID_SIZE, highlightY * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(highlightX * GRID_SIZE, highlightY * GRID_SIZE, GRID_SIZE, GRID_SIZE);
      }
    }
  }

  private renderDragPreview(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (!this.isDragging) return;

    const startPixelX = this.dragStartX * GRID_SIZE + GRID_SIZE / 2;
    const startPixelY = this.dragStartY * GRID_SIZE + GRID_SIZE / 2;
    const currentPixelX = this.dragCurrentX * GRID_SIZE + GRID_SIZE / 2;
    const currentPixelY = this.dragCurrentY * GRID_SIZE + GRID_SIZE / 2;

    // Check if current position is valid (road)
    const isValidDrop =
      this.dragCurrentX >= 0 &&
      this.dragCurrentX < state.cityGrid[0].length &&
      this.dragCurrentY >= 0 &&
      this.dragCurrentY < state.cityGrid.length &&
      state.cityGrid[this.dragCurrentY][this.dragCurrentX] === ZoneType.ROAD;

    // Draw line from start to current position
    ctx.save();
    ctx.setLineDash([8, 4]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.dragRouteColor;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(startPixelX, startPixelY);
    ctx.lineTo(currentPixelX, currentPixelY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Draw ghost stop at original position
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = this.dragRouteColor;
    ctx.beginPath();
    ctx.arc(startPixelX, startPixelY, GRID_SIZE * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw preview stop at current position
    if (isValidDrop) {
      // Valid drop location - bright preview
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = this.dragRouteColor;
      ctx.beginPath();
      ctx.arc(currentPixelX, currentPixelY, GRID_SIZE * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Add glow effect
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(currentPixelX, currentPixelY, GRID_SIZE * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // Invalid drop location - red X
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(currentPixelX, currentPixelY, GRID_SIZE * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw X
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      const size = GRID_SIZE * 0.3;
      ctx.beginPath();
      ctx.moveTo(currentPixelX - size, currentPixelY - size);
      ctx.lineTo(currentPixelX + size, currentPixelY + size);
      ctx.moveTo(currentPixelX + size, currentPixelY - size);
      ctx.lineTo(currentPixelX - size, currentPixelY + size);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderZoneTooltip(ctx: CanvasRenderingContext2D, state: GameState): void {
    // Only show tooltip when hovering (not when menu is open)
    if (this.menuTargetGridX >= 0 && this.menuTargetGridY >= 0) return;
    if (this.hoveredGridX < 0 || this.hoveredGridY < 0) return;

    // Find zone at hovered position
    const hoveredZone = state.zones.find(zone => {
      return this.hoveredGridX >= zone.x &&
             this.hoveredGridX < zone.x + zone.w &&
             this.hoveredGridY >= zone.y &&
             this.hoveredGridY < zone.y + zone.h &&
             zone.type !== ZoneType.ROAD;
    });

    if (!hoveredZone || !hoveredZone.name) return;

    // Calculate tooltip position (near hover point)
    const tooltipX = this.hoveredGridX * GRID_SIZE + GRID_SIZE / 2;
    const tooltipY = this.hoveredGridY * GRID_SIZE - 10;

    // Measure text
    ctx.save();
    ctx.font = 'bold 14px sans-serif';
    const textMetrics = ctx.measureText(hoveredZone.name);
    const textWidth = textMetrics.width;
    const padding = 8;
    const tooltipWidth = textWidth + padding * 2;
    const tooltipHeight = 24;

    // Draw tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const roundRadius = 4;

    // Rounded rectangle
    ctx.beginPath();
    ctx.moveTo(tooltipX - tooltipWidth / 2 + roundRadius, tooltipY - tooltipHeight);
    ctx.lineTo(tooltipX + tooltipWidth / 2 - roundRadius, tooltipY - tooltipHeight);
    ctx.arcTo(tooltipX + tooltipWidth / 2, tooltipY - tooltipHeight, tooltipX + tooltipWidth / 2, tooltipY - tooltipHeight + roundRadius, roundRadius);
    ctx.lineTo(tooltipX + tooltipWidth / 2, tooltipY - roundRadius);
    ctx.arcTo(tooltipX + tooltipWidth / 2, tooltipY, tooltipX + tooltipWidth / 2 - roundRadius, tooltipY, roundRadius);
    ctx.lineTo(tooltipX - tooltipWidth / 2 + roundRadius, tooltipY);
    ctx.arcTo(tooltipX - tooltipWidth / 2, tooltipY, tooltipX - tooltipWidth / 2, tooltipY - roundRadius, roundRadius);
    ctx.lineTo(tooltipX - tooltipWidth / 2, tooltipY - tooltipHeight + roundRadius);
    ctx.arcTo(tooltipX - tooltipWidth / 2, tooltipY - tooltipHeight, tooltipX - tooltipWidth / 2 + roundRadius, tooltipY - tooltipHeight, roundRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hoveredZone.name, tooltipX, tooltipY - tooltipHeight / 2);
    ctx.restore();
  }

  private renderStopTooltip(ctx: CanvasRenderingContext2D, state: GameState): void {
    // Only show tooltip when hovering (not when menu is open or dragging)
    if (this.menuTargetGridX >= 0 && this.menuTargetGridY >= 0) return;
    if (this.isDragging) return;
    if (this.hoveredGridX < 0 || this.hoveredGridY < 0) return;

    // Find if there's a stop at this location
    let hoveredStop = null;
    for (const route of state.routes) {
      const stop = route.stops.find(s => s.x === this.hoveredGridX && s.y === this.hoveredGridY);
      if (stop) {
        hoveredStop = stop;
        break;
      }
    }

    if (!hoveredStop) return;

    // Find all waiting NPCs at this stop
    const npcsAtStop = state.npcs.filter(npc =>
      npc.state === 'waiting' &&
      npc.nearestStop &&
      npc.nearestStop.x === hoveredStop.x &&
      npc.nearestStop.y === hoveredStop.y
    );

    if (npcsAtStop.length === 0) return;

    // Calculate tooltip position
    const stopPixelX = this.hoveredGridX * GRID_SIZE + GRID_SIZE / 2;
    const stopPixelY = this.hoveredGridY * GRID_SIZE + GRID_SIZE / 2;

    // Prepare tooltip content
    const lineHeight = 18;
    const padding = 10;
    const headerHeight = 22;
    const maxNPCsToShow = 8; // Limit to prevent huge tooltips
    const npcsToShow = npcsAtStop.slice(0, maxNPCsToShow);
    const hasMore = npcsAtStop.length > maxNPCsToShow;

    ctx.save();
    ctx.font = 'bold 12px sans-serif';

    // Calculate width based on longest text
    let maxWidth = ctx.measureText('Bus Stop').width;
    npcsToShow.forEach(npc => {
      const destName = npc.destinationZone.name || 'Unknown';
      const text = `${npc.name} → ${destName}`;
      const width = ctx.measureText(text).width;
      if (width > maxWidth) maxWidth = width;
    });

    const tooltipWidth = maxWidth + padding * 2 + 30; // Extra space for mood indicator
    const tooltipHeight = headerHeight + (npcsToShow.length * lineHeight) + (hasMore ? lineHeight : 0) + padding;

    // Position tooltip to the right of the stop
    let tooltipX = stopPixelX + 40;
    let tooltipY = stopPixelY - tooltipHeight / 2;

    // Keep tooltip on screen
    const canvasWidth = state.cityGrid[0].length * GRID_SIZE;
    const canvasHeight = state.cityGrid.length * GRID_SIZE;
    if (tooltipX + tooltipWidth > canvasWidth) {
      tooltipX = stopPixelX - tooltipWidth - 40; // Show on left instead
    }
    if (tooltipY < 0) tooltipY = 0;
    if (tooltipY + tooltipHeight > canvasHeight) tooltipY = canvasHeight - tooltipHeight;

    // Draw tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    const roundRadius = 6;

    // Rounded rectangle
    ctx.beginPath();
    ctx.moveTo(tooltipX + roundRadius, tooltipY);
    ctx.lineTo(tooltipX + tooltipWidth - roundRadius, tooltipY);
    ctx.arcTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + roundRadius, roundRadius);
    ctx.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - roundRadius);
    ctx.arcTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - roundRadius, tooltipY + tooltipHeight, roundRadius);
    ctx.lineTo(tooltipX + roundRadius, tooltipY + tooltipHeight);
    ctx.arcTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight - roundRadius, roundRadius);
    ctx.lineTo(tooltipX, tooltipY + roundRadius);
    ctx.arcTo(tooltipX, tooltipY, tooltipX + roundRadius, tooltipY, roundRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw header
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('🚏 Bus Stop', tooltipX + padding, tooltipY + padding);

    // Draw NPCs
    ctx.font = '11px sans-serif';
    let currentY = tooltipY + headerHeight + padding;

    npcsToShow.forEach(npc => {
      const destName = npc.destinationZone.name || 'Unknown';

      // Calculate mood based on wait time
      const maxWaitTime = 60;
      const waitProgress = npc.waitTime / maxWaitTime;
      let moodEmoji = '😊';

      if (waitProgress > 0.8) {
        moodEmoji = '😠';
      } else if (waitProgress > 0.5) {
        moodEmoji = '😟';
      }

      // Determine which route this NPC is waiting for
      let routeIndicator = '?';
      let routeColor = '#888888';

      if (npc.plannedRoute && npc.plannedRoute.routes.length > 0) {
        const currentRouteIndex = npc.plannedRoute.routes[npc.plannedRoute.currentStopIndex];
        if (currentRouteIndex !== undefined && state.routes[currentRouteIndex]) {
          routeIndicator = `${currentRouteIndex + 1}`;
          routeColor = state.routes[currentRouteIndex].color;
        }
      }

      // Draw route indicator badge
      const badgeX = tooltipX + padding + 8;
      const badgeY = currentY + 7;
      const badgeRadius = 8;

      ctx.fillStyle = routeColor;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(routeIndicator, badgeX, badgeY);

      // Draw NPC info
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${npc.name}`, tooltipX + padding + 22, currentY);

      // Draw destination
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(`→ ${destName}`, tooltipX + padding + 22 + ctx.measureText(npc.name).width + 5, currentY);

      // Draw mood emoji
      ctx.font = '14px sans-serif';
      ctx.fillText(moodEmoji, tooltipX + tooltipWidth - padding - 16, currentY - 2);
      ctx.font = '11px sans-serif';

      currentY += lineHeight;
    });

    // Draw "and X more..." if needed
    if (hasMore) {
      ctx.fillStyle = '#888888';
      ctx.font = 'italic 10px sans-serif';
      ctx.fillText(`...and ${npcsAtStop.length - maxNPCsToShow} more`, tooltipX + padding, currentY);
    }

    ctx.restore();
  }
}
