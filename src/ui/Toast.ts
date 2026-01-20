/**
 * Toast - Non-intrusive notification system for user feedback
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  icon?: string;
}

interface ToastItem {
  id: number;
  element: HTMLElement;
  timeout: number;
}

// Toast container and active toasts
let container: HTMLElement | null = null;
let toastId = 0;
const activeToasts: ToastItem[] = [];
const MAX_TOASTS = 5;

// Default icons for each type
const DEFAULT_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

// Default durations (ms)
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 2500,
  error: 4000,
  warning: 3500,
  info: 3000,
};

/**
 * Get or create the toast container
 */
function getContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Remove a toast by ID
 */
function removeToast(id: number): void {
  const index = activeToasts.findIndex(t => t.id === id);
  if (index === -1) return;

  const toast = activeToasts[index];
  clearTimeout(toast.timeout);

  toast.element.classList.add('toast-exit');

  setTimeout(() => {
    toast.element.remove();
    activeToasts.splice(index, 1);
  }, 300);
}

/**
 * Show a toast notification
 */
export function showToast(options: ToastOptions): number {
  const {
    message,
    type = 'info',
    duration = DEFAULT_DURATIONS[type],
    icon = DEFAULT_ICONS[type],
  } = options;

  const containerEl = getContainer();

  // Remove oldest toast if at max
  if (activeToasts.length >= MAX_TOASTS) {
    removeToast(activeToasts[0].id);
  }

  // Create toast element
  const id = ++toastId;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  // Icon
  const iconEl = document.createElement('span');
  iconEl.className = 'toast-icon';
  iconEl.textContent = icon;

  // Message
  const messageEl = document.createElement('span');
  messageEl.className = 'toast-message';
  messageEl.textContent = message;

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.addEventListener('click', () => removeToast(id));

  // Assemble
  toast.appendChild(iconEl);
  toast.appendChild(messageEl);
  toast.appendChild(closeBtn);

  // Add to container
  containerEl.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-enter');
  });

  // Auto-remove after duration
  const timeout = window.setTimeout(() => {
    removeToast(id);
  }, duration);

  activeToasts.push({ id, element: toast, timeout });

  return id;
}

/**
 * Convenience functions for different toast types
 */
export function toastSuccess(message: string, icon?: string): number {
  return showToast({ message, type: 'success', icon });
}

export function toastError(message: string, icon?: string): number {
  return showToast({ message, type: 'error', icon });
}

export function toastWarning(message: string, icon?: string): number {
  return showToast({ message, type: 'warning', icon });
}

export function toastInfo(message: string, icon?: string): number {
  return showToast({ message, type: 'info', icon });
}

/**
 * Game-specific toast messages
 */
export const gameToasts = {
  // Route actions
  routeAdded: (routeNum: number) =>
    toastSuccess(`Route ${routeNum} created`, '🚌'),

  routeDeleted: (routeNum: number) =>
    toastInfo(`Route ${routeNum} deleted`, '🗑'),

  maxRoutesReached: () =>
    toastWarning('Maximum 8 routes allowed'),

  // Stop actions
  stopAdded: (count: number) =>
    toastSuccess(`Stop added (${count}/40)`, '📍'),

  stopRemoved: () =>
    toastInfo('Stop removed', '📍'),

  stopDeleted: () =>
    toastInfo('Stop deleted', '🗑'),

  stopMoved: () =>
    toastSuccess('Stop moved', '↔'),

  maxStopsReached: () =>
    toastWarning('Maximum 40 stops per route'),

  stopsCleared: (count: number) =>
    toastInfo(`Cleared ${count} stops`, '🧹'),

  // Bus actions
  busAdded: (count: number) =>
    toastSuccess(`Bus added (${count} total)`, '🚌'),

  busRemoved: (count: number) =>
    toastInfo(`Bus removed (${count} remaining)`, '🚌'),

  maxBusesReached: () =>
    toastWarning('Maximum 10 buses per route'),

  minBusesReached: () =>
    toastWarning('Route needs at least 1 bus'),

  // Money actions
  loanTaken: (amount: number) =>
    toastSuccess(`Borrowed $${amount}`, '💰'),

  loanRepaid: (amount: number) =>
    toastSuccess(`Repaid $${amount}`, '💸'),

  notEnoughMoney: (needed: number) =>
    toastError(`Not enough money (need $${needed})`, '💸'),

  noLoanAvailable: () =>
    toastWarning('No loan capacity available'),

  // Game state
  gamePaused: () =>
    toastInfo('Game paused', '⏸'),

  gameResumed: () =>
    toastInfo('Game resumed', '▶'),

  gameSaved: () =>
    toastSuccess('Progress saved', '💾'),
};

/**
 * Clear all active toasts
 */
export function clearAllToasts(): void {
  [...activeToasts].forEach(toast => removeToast(toast.id));
}
