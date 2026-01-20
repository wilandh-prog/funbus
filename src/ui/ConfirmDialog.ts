/**
 * ConfirmDialog - Reusable confirmation dialog for destructive actions
 */

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel?: () => void;
}

let activeDialog: HTMLElement | null = null;

/**
 * Show a confirmation dialog
 */
export function showConfirmDialog(options: ConfirmDialogOptions): void {
  // Remove any existing dialog
  hideConfirmDialog();

  const {
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmStyle = 'danger',
    onConfirm,
    onCancel,
  } = options;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'confirm-dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'confirm-dialog-title');

  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';

  // Title
  const titleEl = document.createElement('h3');
  titleEl.id = 'confirm-dialog-title';
  titleEl.className = 'confirm-dialog-title';
  titleEl.textContent = title;

  // Message
  const messageEl = document.createElement('p');
  messageEl.className = 'confirm-dialog-message';
  messageEl.textContent = message;

  // Buttons container
  const buttonsEl = document.createElement('div');
  buttonsEl.className = 'confirm-dialog-buttons';

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'confirm-dialog-btn cancel';
  cancelBtn.textContent = cancelText;
  cancelBtn.addEventListener('click', () => {
    hideConfirmDialog();
    onCancel?.();
  });

  // Confirm button
  const confirmBtn = document.createElement('button');
  confirmBtn.className = `confirm-dialog-btn confirm ${confirmStyle}`;
  confirmBtn.textContent = confirmText;
  confirmBtn.addEventListener('click', () => {
    hideConfirmDialog();
    onConfirm();
  });

  // Assemble dialog
  buttonsEl.appendChild(cancelBtn);
  buttonsEl.appendChild(confirmBtn);
  dialog.appendChild(titleEl);
  dialog.appendChild(messageEl);
  dialog.appendChild(buttonsEl);
  overlay.appendChild(dialog);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideConfirmDialog();
      onCancel?.();
    }
  });

  // Close on Escape key
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      hideConfirmDialog();
      onCancel?.();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Add to DOM and animate in
  document.body.appendChild(overlay);
  activeDialog = overlay;

  // Focus confirm button for keyboard accessibility
  requestAnimationFrame(() => {
    confirmBtn.focus();
  });
}

/**
 * Hide the active confirmation dialog
 */
export function hideConfirmDialog(): void {
  if (activeDialog) {
    activeDialog.classList.add('hiding');
    setTimeout(() => {
      activeDialog?.remove();
      activeDialog = null;
    }, 200);
  }
}

/**
 * Convenience function for delete confirmations
 */
export function confirmDelete(
  itemName: string,
  details: string,
  onConfirm: () => void
): void {
  showConfirmDialog({
    title: `Delete ${itemName}?`,
    message: details,
    confirmText: 'Delete',
    cancelText: 'Keep',
    confirmStyle: 'danger',
    onConfirm,
  });
}

/**
 * Convenience function for clear/reset confirmations
 */
export function confirmClear(
  itemName: string,
  details: string,
  onConfirm: () => void
): void {
  showConfirmDialog({
    title: `Clear ${itemName}?`,
    message: details,
    confirmText: 'Clear All',
    cancelText: 'Cancel',
    confirmStyle: 'warning',
    onConfirm,
  });
}
