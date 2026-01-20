/**
 * CollapsibleSections - Handles collapsible sidebar sections with localStorage persistence
 */

const STORAGE_KEY = 'funbus_collapsed_sections';

interface CollapsedState {
  [sectionId: string]: boolean;
}

/**
 * Load collapsed state from localStorage
 */
function loadCollapsedState(): CollapsedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save collapsed state to localStorage
 */
function saveCollapsedState(state: CollapsedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Toggle a section's collapsed state
 */
function toggleSection(section: HTMLElement, state: CollapsedState): void {
  const sectionId = section.dataset.section;
  if (!sectionId) return;

  const isCollapsed = section.classList.toggle('collapsed');
  state[sectionId] = isCollapsed;
  saveCollapsedState(state);
}

/**
 * Initialize collapsible sidebar sections
 */
export function initCollapsibleSections(): void {
  const state = loadCollapsedState();
  const sections = document.querySelectorAll('.sidebar-section[data-section]');

  sections.forEach((section) => {
    const sectionEl = section as HTMLElement;
    const sectionId = sectionEl.dataset.section;
    const header = sectionEl.querySelector('.sidebar-section-header');

    if (!header || !sectionId) return;

    // Restore collapsed state
    if (state[sectionId]) {
      sectionEl.classList.add('collapsed');
    }

    // Add click handler
    header.addEventListener('click', () => {
      toggleSection(sectionEl, state);
    });

    // Add keyboard support
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', state[sectionId] ? 'false' : 'true');
    header.setAttribute('aria-controls', `${sectionId}-content`);

    const content = sectionEl.querySelector('.sidebar-section-content');
    if (content) {
      content.id = `${sectionId}-content`;
    }

    header.addEventListener('keydown', (e) => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleSection(sectionEl, state);
        header.setAttribute('aria-expanded', sectionEl.classList.contains('collapsed') ? 'false' : 'true');
      }
    });
  });
}

/**
 * Expand all sections (useful for debugging or reset)
 */
export function expandAllSections(): void {
  const sections = document.querySelectorAll('.sidebar-section[data-section]');
  const state: CollapsedState = {};

  sections.forEach((section) => {
    const sectionEl = section as HTMLElement;
    const sectionId = sectionEl.dataset.section;
    sectionEl.classList.remove('collapsed');
    if (sectionId) {
      state[sectionId] = false;
    }

    const header = sectionEl.querySelector('.sidebar-section-header');
    if (header) {
      header.setAttribute('aria-expanded', 'true');
    }
  });

  saveCollapsedState(state);
}

/**
 * Collapse all sections
 */
export function collapseAllSections(): void {
  const sections = document.querySelectorAll('.sidebar-section[data-section]');
  const state: CollapsedState = {};

  sections.forEach((section) => {
    const sectionEl = section as HTMLElement;
    const sectionId = sectionEl.dataset.section;
    sectionEl.classList.add('collapsed');
    if (sectionId) {
      state[sectionId] = true;
    }

    const header = sectionEl.querySelector('.sidebar-section-header');
    if (header) {
      header.setAttribute('aria-expanded', 'false');
    }
  });

  saveCollapsedState(state);
}
