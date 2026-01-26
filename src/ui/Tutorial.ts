/**
 * Tutorial system for onboarding new players
 * Shows step-by-step instructions with UI element highlighting
 */

interface TutorialStep {
  title: string;
  content: string;
  targetSelector?: string; // Element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform when showing step
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Bus Route Tycoon!',
    content: 'Build efficient bus routes to transport NPCs around the city. This tutorial will show you the basics.',
    position: 'center',
  },
  {
    title: 'The City Map',
    content: 'This is your city. Different colored zones represent residential (green), commercial (blue), and industrial (yellow) areas. NPCs travel between these zones.',
    targetSelector: '#gameCanvas',
    position: 'left',
  },
  {
    title: 'Build Mode vs Pan Mode',
    content: 'Press B or click this button to toggle between modes. Build Mode (🛠 icon) lets you add/edit stops. Pan Mode (👆 icon) lets you explore the map without accidentally adding stops.',
    targetSelector: '#mode-toggle-btn',
    position: 'bottom',
  },
  {
    title: 'Adding Bus Stops',
    content: 'In Build Mode, click on any road (gray lines) to add a bus stop. Stops are shown as colored circles. Your bus will travel between stops in order.',
    targetSelector: '#gameCanvas',
    position: 'left',
  },
  {
    title: 'Route Controls',
    content: 'Use these buttons to manage your routes. You can add up to 8 different routes, each with its own color.',
    targetSelector: '#routeControls',
    position: 'bottom',
  },
  {
    title: 'Managing Buses',
    content: 'Add or remove buses on your active route. More buses = faster service, but higher costs!',
    targetSelector: '.bus-controls',
    position: 'bottom',
  },
  {
    title: 'Statistics Panel',
    content: 'Track your performance here. Happiness (0-100) measures how well you\'re serving NPCs. Higher is better!',
    targetSelector: '[data-section="statistics"]',
    position: 'right',
  },
  {
    title: 'Coverage Radius',
    content: 'Green dashed circles show each stop\'s service area. NPCs within this radius will use your bus service.',
    targetSelector: '#showCoverageRadius',
    position: 'right',
  },
  {
    title: 'Pause the Game',
    content: 'Press Space or click the Pause button to pause the game. Plan your routes without time pressure!',
    targetSelector: '#pause-btn',
    position: 'bottom',
  },
  {
    title: 'Managing Stops',
    content: 'In Build Mode: Right-click (or long-press on mobile) to delete a stop. Drag stops to move them to a new location on the road.',
    targetSelector: '#gameCanvas',
    position: 'left',
  },
  {
    title: 'Ticket Pricing',
    content: 'Set your ticket price here. Higher prices = more income but fewer riders. Lower prices = more riders but less profit. Find the sweet spot!',
    targetSelector: '#ticketPriceSlider',
    position: 'right',
  },
  {
    title: 'Profit & Loss',
    content: 'Keep an eye on your finances! Earn money from ticket sales, but watch out for bus operating costs and loan interest.',
    targetSelector: '[data-section="statistics"]',
    position: 'right',
  },
  {
    title: 'You\'re Ready!',
    content: 'Start by switching to Build Mode (press B), then add 3-4 stops on roads near residential and commercial zones. Good luck building your bus empire!',
    position: 'center',
  },
];

const STORAGE_KEY = 'funbus_tutorial_completed';

export class Tutorial {
  private overlay: HTMLElement | null = null;
  private currentStep = 0;
  private isActive = false;
  private onComplete?: () => void;

  constructor() {
    this.createOverlay();
  }

  private createOverlay(): void {
    // Create tutorial overlay container
    this.overlay = document.createElement('div');
    this.overlay.id = 'tutorial-overlay';
    this.overlay.innerHTML = `
      <div class="tutorial-highlight-mask"></div>
      <div class="tutorial-dialog">
        <div class="tutorial-header">
          <span class="tutorial-step-indicator"></span>
          <button class="tutorial-skip-btn">Skip Tutorial</button>
        </div>
        <h3 class="tutorial-title"></h3>
        <p class="tutorial-content"></p>
        <div class="tutorial-footer">
          <button class="tutorial-prev-btn">← Previous</button>
          <button class="tutorial-next-btn">Next →</button>
        </div>
      </div>
      <div class="tutorial-pointer"></div>
    `;
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);

    // Bind events
    const skipBtn = this.overlay.querySelector('.tutorial-skip-btn');
    const prevBtn = this.overlay.querySelector('.tutorial-prev-btn');
    const nextBtn = this.overlay.querySelector('.tutorial-next-btn');

    skipBtn?.addEventListener('click', () => this.complete());
    prevBtn?.addEventListener('click', () => this.prevStep());
    nextBtn?.addEventListener('click', () => this.nextStep());

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (this.isActive && e.key === 'Escape') {
        this.complete();
      }
    });
  }

  /**
   * Check if tutorial should be shown (first visit)
   */
  shouldShow(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  }

  /**
   * Start the tutorial
   */
  start(onComplete?: () => void): void {
    this.onComplete = onComplete;
    this.currentStep = 0;
    this.isActive = true;

    if (this.overlay) {
      this.overlay.style.display = 'flex';
    }

    this.showStep(0);
  }

  /**
   * Show a specific step
   */
  private showStep(index: number): void {
    if (!this.overlay || index < 0 || index >= TUTORIAL_STEPS.length) return;

    const step = TUTORIAL_STEPS[index];

    // Update step indicator
    const indicator = this.overlay.querySelector('.tutorial-step-indicator');
    if (indicator) {
      indicator.textContent = `${index + 1} / ${TUTORIAL_STEPS.length}`;
    }

    // Update title and content
    const title = this.overlay.querySelector('.tutorial-title');
    const content = this.overlay.querySelector('.tutorial-content');
    if (title) title.textContent = step.title;
    if (content) content.textContent = step.content;

    // Update buttons
    const prevBtn = this.overlay.querySelector('.tutorial-prev-btn') as HTMLButtonElement;
    const nextBtn = this.overlay.querySelector('.tutorial-next-btn') as HTMLButtonElement;

    if (prevBtn) {
      prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
    }

    if (nextBtn) {
      nextBtn.textContent = index === TUTORIAL_STEPS.length - 1 ? 'Finish ✓' : 'Next →';
    }

    // Clear previous highlight
    this.clearHighlight();

    // Handle positioning and highlighting
    const dialog = this.overlay.querySelector('.tutorial-dialog') as HTMLElement;
    const pointer = this.overlay.querySelector('.tutorial-pointer') as HTMLElement;
    const mask = this.overlay.querySelector('.tutorial-highlight-mask') as HTMLElement;

    if (step.targetSelector) {
      const target = document.querySelector(step.targetSelector) as HTMLElement;

      if (target) {
        // Position the highlight mask
        const rect = target.getBoundingClientRect();
        const padding = 8;

        // Create clip path to highlight the target element
        mask.style.clipPath = `polygon(
          0% 0%, 0% 100%,
          ${rect.left - padding}px 100%,
          ${rect.left - padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.top - padding}px,
          ${rect.right + padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px ${rect.bottom + padding}px,
          ${rect.left - padding}px 100%,
          100% 100%, 100% 0%
        )`;
        mask.style.display = 'block';

        // Position dialog based on specified position
        this.positionDialog(dialog, pointer, rect, step.position || 'bottom');
        pointer.style.display = 'block';
      } else {
        // Target not found, show centered
        this.centerDialog(dialog);
        mask.style.display = 'none';
        pointer.style.display = 'none';
      }
    } else {
      // No target, show centered
      this.centerDialog(dialog);
      mask.style.display = 'none';
      pointer.style.display = 'none';
    }

    // Execute step action if defined
    if (step.action) {
      step.action();
    }
  }

  private positionDialog(
    dialog: HTMLElement,
    pointer: HTMLElement,
    targetRect: DOMRect,
    position: string
  ): void {
    const dialogWidth = 350;
    const dialogHeight = dialog.offsetHeight || 200;
    const margin = 20;
    const pointerSize = 12;

    dialog.classList.remove('position-top', 'position-bottom', 'position-left', 'position-right', 'position-center');
    dialog.classList.add(`position-${position}`);

    let left: number, top: number;
    let pointerLeft: number, pointerTop: number;
    let pointerRotation = 0;

    switch (position) {
      case 'top':
        left = targetRect.left + targetRect.width / 2 - dialogWidth / 2;
        top = targetRect.top - dialogHeight - margin - pointerSize;
        pointerLeft = targetRect.left + targetRect.width / 2 - pointerSize / 2;
        pointerTop = targetRect.top - margin - pointerSize;
        pointerRotation = 180;
        break;
      case 'bottom':
        left = targetRect.left + targetRect.width / 2 - dialogWidth / 2;
        top = targetRect.bottom + margin + pointerSize;
        pointerLeft = targetRect.left + targetRect.width / 2 - pointerSize / 2;
        pointerTop = targetRect.bottom + margin - pointerSize / 2;
        pointerRotation = 0;
        break;
      case 'left':
        left = targetRect.left - dialogWidth - margin - pointerSize;
        top = targetRect.top + targetRect.height / 2 - dialogHeight / 2;
        pointerLeft = targetRect.left - margin - pointerSize;
        pointerTop = targetRect.top + targetRect.height / 2 - pointerSize / 2;
        pointerRotation = 90;
        break;
      case 'right':
        left = targetRect.right + margin + pointerSize;
        top = targetRect.top + targetRect.height / 2 - dialogHeight / 2;
        pointerLeft = targetRect.right + margin - pointerSize / 2;
        pointerTop = targetRect.top + targetRect.height / 2 - pointerSize / 2;
        pointerRotation = -90;
        break;
      default:
        this.centerDialog(dialog);
        pointer.style.display = 'none';
        return;
    }

    // Keep dialog within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    left = Math.max(margin, Math.min(left, viewportWidth - dialogWidth - margin));
    top = Math.max(margin, Math.min(top, viewportHeight - dialogHeight - margin));

    dialog.style.position = 'fixed';
    dialog.style.left = `${left}px`;
    dialog.style.top = `${top}px`;
    dialog.style.transform = 'none';

    pointer.style.left = `${pointerLeft}px`;
    pointer.style.top = `${pointerTop}px`;
    pointer.style.transform = `rotate(${pointerRotation}deg)`;
  }

  private centerDialog(dialog: HTMLElement): void {
    dialog.classList.add('position-center');
    dialog.style.position = 'fixed';
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
  }

  private clearHighlight(): void {
    const mask = this.overlay?.querySelector('.tutorial-highlight-mask') as HTMLElement;
    if (mask) {
      mask.style.clipPath = '';
    }
  }

  private nextStep(): void {
    if (this.currentStep < TUTORIAL_STEPS.length - 1) {
      this.currentStep++;
      this.showStep(this.currentStep);
    } else {
      this.complete();
    }
  }

  private prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.showStep(this.currentStep);
    }
  }

  /**
   * Complete and close the tutorial
   */
  complete(): void {
    this.isActive = false;
    this.clearHighlight();

    if (this.overlay) {
      this.overlay.style.display = 'none';
    }

    // Mark as completed
    localStorage.setItem(STORAGE_KEY, 'true');

    if (this.onComplete) {
      this.onComplete();
    }
  }

  /**
   * Reset tutorial (for showing again)
   */
  static reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Destroy the tutorial instance
   */
  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

// Singleton instance
let tutorialInstance: Tutorial | null = null;

export function getTutorial(): Tutorial {
  if (!tutorialInstance) {
    tutorialInstance = new Tutorial();
  }
  return tutorialInstance;
}

export function startTutorial(onComplete?: () => void): void {
  getTutorial().start(onComplete);
}

export function shouldShowTutorial(): boolean {
  return getTutorial().shouldShow();
}

export function resetTutorial(): void {
  Tutorial.reset();
}
