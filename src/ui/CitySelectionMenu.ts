/**
 * City Selection Menu Component
 *
 * Displays a full-screen menu for selecting which city to play.
 * Shows locked/unlocked status, high scores, and unlock requirements.
 */

import type { CityConfig } from '../config/cities';
import type { ProgressionData } from '../storage/ProgressionStorage';
import { ProgressionStorage } from '../storage/ProgressionStorage';

export interface CitySelectionCallbacks {
  onCitySelected: (cityId: string, startFresh?: boolean) => void;
  onResetProgress: () => void;
}

export class CitySelectionMenu {
  private container: HTMLElement;
  public progression: ProgressionData;

  constructor(
    private cities: CityConfig[],
    progression: ProgressionData,
    private callbacks: CitySelectionCallbacks
  ) {
    this.progression = progression;
    this.container = this.createContainer();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'city-selection-menu';
    container.className = 'city-selection-overlay';
    return container;
  }

  show(): void {
    this.render();
    document.body.appendChild(this.container);
  }

  hide(): void {
    this.container.remove();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="city-selection-panel">
        <h1>🚌 Select a City</h1>
        <div class="city-grid">
          ${this.cities.map((city) => this.renderCityCard(city)).join('')}
        </div>
        <div class="menu-footer">
          <button id="reset-progress-btn" class="danger-btn">Reset All Progress</button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderCityCard(city: CityConfig): string {
    const progress = this.progression.cities[city.id];
    const isUnlocked = this.isCityUnlocked(city);
    const highScore = progress?.highScore || 0;
    const gamesPlayed = progress?.gamesPlayed || 0;
    const hasSavedProgress = ProgressionStorage.hasSavedProgress(this.progression, city.id);

    if (!isUnlocked) {
      return `
        <div class="city-card locked">
          <div class="city-card-header">
            <h3>🔒 ${city.name}</h3>
            <span class="city-difficulty ${city.difficulty}">${city.difficulty || 'medium'}</span>
          </div>
          <p class="city-description">${city.description}</p>
          <div class="unlock-requirement">
            Unlock: Score ${city.unlockScore} in any city
          </div>
        </div>
      `;
    }

    return `
      <div class="city-card unlocked" data-city-id="${city.id}">
        <div class="city-card-header">
          <h3>${city.name}</h3>
          <span class="city-difficulty ${city.difficulty}">${city.difficulty || 'medium'}</span>
        </div>
        <p class="city-description">${city.description}</p>
        <div class="city-stats">
          <div class="city-stat">
            <span class="stat-label">High Score</span>
            <span class="stat-value ${this.getScoreClass(highScore)}">${highScore}</span>
          </div>
          <div class="city-stat">
            <span class="stat-label">Games Played</span>
            <span class="stat-value">${gamesPlayed}</span>
          </div>
        </div>
        ${
          hasSavedProgress
            ? `
          <button class="play-btn continue-btn" data-city-id="${city.id}" data-action="continue">
            ▶ Continue
          </button>
          <button class="play-btn new-game-btn" data-city-id="${city.id}" data-action="new">
            🔄 New Game
          </button>
        `
            : `
          <button class="play-btn" data-city-id="${city.id}" data-action="new">
            ${progress ? 'Play Again' : 'Play Now'}
          </button>
        `
        }
      </div>
    `;
  }

  private isCityUnlocked(city: CityConfig): boolean {
    return ProgressionStorage.isCityUnlocked(this.progression, city.id, city.unlockScore);
  }

  private getScoreClass(score: number): string {
    if (score >= 70) return 'score-excellent';
    if (score >= 40) return 'score-good';
    return 'score-poor';
  }

  private attachEventListeners(): void {
    // Play button clicks
    this.container.querySelectorAll('.play-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const cityId = target.dataset.cityId;
        const action = target.dataset.action;

        if (cityId) {
          const startFresh = action === 'new';

          // If starting fresh and there's saved progress, confirm
          if (startFresh && ProgressionStorage.hasSavedProgress(this.progression, cityId)) {
            if (confirm('Start a new game? Your current progress will be lost.')) {
              ProgressionStorage.clearGameState(this.progression, cityId);
              ProgressionStorage.save(this.progression);
              this.callbacks.onCitySelected(cityId, true);
            }
          } else {
            this.callbacks.onCitySelected(cityId, startFresh);
          }
        }
      });
    });

    // Reset progress button
    const resetBtn = this.container.querySelector('#reset-progress-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure? This will delete all your progress and high scores.')) {
          this.callbacks.onResetProgress();
          this.render(); // Re-render after reset
        }
      });
    }
  }
}
