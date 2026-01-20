/**
 * TouchHandler - Provides touch support for the game canvas
 * Converts touch events to mouse-equivalent operations and handles
 * mobile-specific interactions like pinch-to-zoom and long-press
 */

export interface TouchHandlerConfig {
  canvas: HTMLCanvasElement;
  onTap: (x: number, y: number, clientX: number, clientY: number) => void;
  onLongPress: (x: number, y: number, clientX: number, clientY: number) => void;
  onDragStart: (x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onPinchZoom: (scale: number, centerX: number, centerY: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  getCamera: () => { x: number; y: number; zoom: number };
}

interface TouchState {
  // Single touch tracking
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  hasMoved: boolean;

  // Multi-touch tracking
  isMultiTouch: boolean;
  initialPinchDistance: number;
  initialZoom: number;
  pinchCenterX: number;
  pinchCenterY: number;
  lastPanX: number;
  lastPanY: number;
}

// Configuration constants
const LONG_PRESS_DURATION = 500; // ms
const TAP_MOVE_THRESHOLD = 10; // pixels - movement allowed for tap
const DRAG_THRESHOLD = 15; // pixels - movement to start drag

export class TouchHandler {
  private config: TouchHandlerConfig;
  private state: TouchState;
  private longPressTimer: number | null = null;
  private lastTouchX = 0;
  private lastTouchY = 0;

  constructor(config: TouchHandlerConfig) {
    this.config = config;
    this.state = this.createInitialState();
    this.attachEventListeners();
  }

  private createInitialState(): TouchState {
    return {
      startX: 0,
      startY: 0,
      startTime: 0,
      currentX: 0,
      currentY: 0,
      isDragging: false,
      hasMoved: false,
      isMultiTouch: false,
      initialPinchDistance: 0,
      initialZoom: 1,
      pinchCenterX: 0,
      pinchCenterY: 0,
      lastPanX: 0,
      lastPanY: 0,
    };
  }

  private attachEventListeners(): void {
    const { canvas } = this.config;

    // Prevent default touch behaviors (scrolling, zooming page)
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
  }

  /**
   * Get canvas coordinates from touch event
   */
  private getTouchCoordinates(touch: Touch): { canvasX: number; canvasY: number; clientX: number; clientY: number } {
    const { canvas } = this.config;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const camera = this.config.getCamera();

    const canvasX = ((touch.clientX - rect.left) * scaleX - camera.x) / camera.zoom;
    const canvasY = ((touch.clientY - rect.top) * scaleY - camera.y) / camera.zoom;

    return {
      canvasX,
      canvasY,
      clientX: touch.clientX,
      clientY: touch.clientY
    };
  }

  /**
   * Calculate distance between two touches
   */
  private getPinchDistance(touches: TouchList): number {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get center point between two touches
   */
  private getPinchCenter(touches: TouchList): { x: number; y: number } {
    if (touches.length < 2) return { x: 0, y: 0 };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  /**
   * Start long press timer
   */
  private startLongPressTimer(x: number, y: number, clientX: number, clientY: number): void {
    this.cancelLongPressTimer();
    this.longPressTimer = window.setTimeout(() => {
      if (!this.state.hasMoved && !this.state.isMultiTouch) {
        // Trigger long press (equivalent to right-click)
        this.config.onLongPress(x, y, clientX, clientY);
        this.state.isDragging = false; // Prevent drag after long press
      }
      this.longPressTimer = null;
    }, LONG_PRESS_DURATION);
  }

  /**
   * Cancel long press timer
   */
  private cancelLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * Handle touch start
   */
  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();

    const touches = e.touches;

    if (touches.length === 1) {
      // Single touch - potential tap, long press, or drag
      const coords = this.getTouchCoordinates(touches[0]);

      this.state.startX = coords.canvasX;
      this.state.startY = coords.canvasY;
      this.state.currentX = coords.canvasX;
      this.state.currentY = coords.canvasY;
      this.state.startTime = Date.now();
      this.state.hasMoved = false;
      this.state.isDragging = false;
      this.state.isMultiTouch = false;

      this.lastTouchX = coords.clientX;
      this.lastTouchY = coords.clientY;

      // Start long press detection
      this.startLongPressTimer(coords.canvasX, coords.canvasY, coords.clientX, coords.clientY);

    } else if (touches.length === 2) {
      // Multi-touch - pinch zoom or two-finger pan
      this.cancelLongPressTimer();
      this.state.isMultiTouch = true;
      this.state.isDragging = false;

      this.state.initialPinchDistance = this.getPinchDistance(touches);
      this.state.initialZoom = this.config.getCamera().zoom;

      const center = this.getPinchCenter(touches);
      this.state.pinchCenterX = center.x;
      this.state.pinchCenterY = center.y;
      this.state.lastPanX = center.x;
      this.state.lastPanY = center.y;
    }
  };

  /**
   * Handle touch move
   */
  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();

    const touches = e.touches;

    if (touches.length === 1 && !this.state.isMultiTouch) {
      // Single touch move
      const coords = this.getTouchCoordinates(touches[0]);
      const dx = coords.canvasX - this.state.startX;
      const dy = coords.canvasY - this.state.startY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      this.state.currentX = coords.canvasX;
      this.state.currentY = coords.canvasY;
      this.lastTouchX = coords.clientX;
      this.lastTouchY = coords.clientY;

      // Check if moved beyond tap threshold
      if (distance > TAP_MOVE_THRESHOLD) {
        this.state.hasMoved = true;
        this.cancelLongPressTimer();
      }

      // Check if should start dragging
      if (distance > DRAG_THRESHOLD && !this.state.isDragging) {
        this.state.isDragging = true;
        this.config.onDragStart(this.state.startX, this.state.startY);
      }

      // Continue drag
      if (this.state.isDragging) {
        this.config.onDragMove(coords.canvasX, coords.canvasY);
      }

    } else if (touches.length === 2) {
      // Pinch zoom
      const currentDistance = this.getPinchDistance(touches);
      const scale = currentDistance / this.state.initialPinchDistance;
      const newZoom = this.state.initialZoom * scale;

      const center = this.getPinchCenter(touches);

      // Calculate pan delta
      const panDeltaX = center.x - this.state.lastPanX;
      const panDeltaY = center.y - this.state.lastPanY;
      this.state.lastPanX = center.x;
      this.state.lastPanY = center.y;

      // Apply pan
      if (Math.abs(panDeltaX) > 1 || Math.abs(panDeltaY) > 1) {
        this.config.onPan(panDeltaX, panDeltaY);
      }

      // Apply zoom
      this.config.onPinchZoom(newZoom, center.x, center.y);
    }
  };

  /**
   * Handle touch end
   */
  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();

    this.cancelLongPressTimer();

    // If there are still touches, handle remaining touches
    if (e.touches.length > 0) {
      // Reset to single touch mode if one finger lifted
      if (e.touches.length === 1 && this.state.isMultiTouch) {
        this.state.isMultiTouch = false;
        const coords = this.getTouchCoordinates(e.touches[0]);
        this.state.startX = coords.canvasX;
        this.state.startY = coords.canvasY;
        this.state.hasMoved = true; // Prevent tap after pinch
      }
      return;
    }

    // All fingers lifted
    const duration = Date.now() - this.state.startTime;

    if (this.state.isDragging) {
      // End drag
      this.config.onDragEnd(this.state.currentX, this.state.currentY);
    } else if (!this.state.hasMoved && !this.state.isMultiTouch && duration < LONG_PRESS_DURATION) {
      // Quick tap (not a long press, not moved)
      this.config.onTap(this.state.startX, this.state.startY, this.lastTouchX, this.lastTouchY);
    }

    // Reset state
    this.state = this.createInitialState();
  };

  /**
   * Handle touch cancel
   */
  private handleTouchCancel = (e: TouchEvent): void => {
    e.preventDefault();
    this.cancelLongPressTimer();

    // Cancel any ongoing drag
    if (this.state.isDragging) {
      this.config.onDragEnd(this.state.currentX, this.state.currentY);
    }

    // Reset state
    this.state = this.createInitialState();
  };

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    const { canvas } = this.config;
    this.cancelLongPressTimer();

    canvas.removeEventListener('touchstart', this.handleTouchStart);
    canvas.removeEventListener('touchmove', this.handleTouchMove);
    canvas.removeEventListener('touchend', this.handleTouchEnd);
    canvas.removeEventListener('touchcancel', this.handleTouchCancel);
  }

  /**
   * Get last touch position (for cursor position tracking)
   */
  public getLastTouchPosition(): { x: number; y: number } {
    return { x: this.lastTouchX, y: this.lastTouchY };
  }
}
