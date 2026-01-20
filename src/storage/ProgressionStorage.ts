/**
 * Progression Storage System
 *
 * Manages player progression data using localStorage.
 * Tracks high scores, unlocked cities, and play statistics.
 */

import type { CityConfig } from '../config/cities';

export interface SerializableGameState {
  routes: Array<{
    stops: Array<{ x: number; y: number }>;
    busCount: number;
    color: string;
  }>;
  activeRouteIndex: number;
  trafficDensity?: number; // Optional - now dynamic based on time of day
  stats: {
    tripsCompleted: number;
    totalWaitTime: number;
    totalTransportTime?: number;
    npcsGaveUp: number;
    busUtilizationSamples: number;
    totalBusUtilization: number;
  };
  economics?: {
    money: number;
    totalIncome: number;
    totalExpenses: number;
  };
  interactionMode: 'menu-based' | 'direct';
}

export interface CityProgress {
  cityId: string;
  highScore: number;
  lastPlayed: number; // timestamp
  gamesPlayed: number;
  savedState?: SerializableGameState; // Optional saved game state
}

export interface ProgressionData {
  version: number; // for future migrations
  cities: Record<string, CityProgress>;
  lastPlayedCityId: string | null;
}

const STORAGE_KEY = 'funbus_progression';
const STORAGE_VERSION = 1;

export class ProgressionStorage {
  /**
   * Load progression data from localStorage
   * Returns default data if not found or corrupted
   */
  static load(): ProgressionData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return ProgressionStorage.createDefault();
      }

      const data = JSON.parse(raw) as ProgressionData;

      // Version migration (future-proofing)
      if (data.version !== STORAGE_VERSION) {
        console.warn('Progression data version mismatch, resetting');
        return ProgressionStorage.createDefault();
      }

      return data;
    } catch (error) {
      console.error('Failed to load progression:', error);
      return ProgressionStorage.createDefault();
    }
  }

  /**
   * Save progression data to localStorage
   */
  static save(data: ProgressionData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save progression:', error);
    }
  }

  /**
   * Create default progression data
   */
  private static createDefault(): ProgressionData {
    return {
      version: STORAGE_VERSION,
      cities: {},
      lastPlayedCityId: null,
    };
  }

  /**
   * Update high score for a city (only if better)
   * Returns true if a new high score was set
   */
  static updateHighScore(data: ProgressionData, cityId: string, score: number): boolean {
    const cityProgress = data.cities[cityId] || {
      cityId,
      highScore: 0,
      lastPlayed: 0,
      gamesPlayed: 0,
    };

    const isNewHighScore = score > cityProgress.highScore;

    if (isNewHighScore) {
      cityProgress.highScore = score;
    }

    cityProgress.lastPlayed = Date.now();
    cityProgress.gamesPlayed++;

    data.cities[cityId] = cityProgress;
    data.lastPlayedCityId = cityId;

    return isNewHighScore;
  }

  /**
   * Check if a city is unlocked
   * A city is unlocked if:
   * - It has unlockScore of 0 (starter city), OR
   * - ANY city has a high score >= the required unlock score
   */
  static isCityUnlocked(data: ProgressionData, _cityId: string, requiredScore: number): boolean {
    if (requiredScore === 0) return true; // Always unlocked

    // Check if ANY city has reached the unlock score
    return Object.values(data.cities).some((progress) => progress.highScore >= requiredScore);
  }

  /**
   * Get all unlocked cities from a list of city configs
   */
  static getUnlockedCities(data: ProgressionData, allCities: CityConfig[]): CityConfig[] {
    return allCities.filter((city) =>
      ProgressionStorage.isCityUnlocked(data, city.id, city.unlockScore)
    );
  }

  /**
   * Get cities that were just unlocked by achieving a new score
   * Returns newly unlocked cities, if any
   */
  static getNewlyUnlockedCities(
    oldData: ProgressionData,
    newData: ProgressionData,
    allCities: CityConfig[]
  ): CityConfig[] {
    return allCities.filter((city) => {
      const wasUnlocked = ProgressionStorage.isCityUnlocked(oldData, city.id, city.unlockScore);
      const isNowUnlocked = ProgressionStorage.isCityUnlocked(newData, city.id, city.unlockScore);
      return !wasUnlocked && isNowUnlocked;
    });
  }

  /**
   * Save game state for a city
   */
  static saveGameState(data: ProgressionData, cityId: string, gameState: SerializableGameState): void {
    const cityProgress = data.cities[cityId] || {
      cityId,
      highScore: 0,
      lastPlayed: Date.now(),
      gamesPlayed: 0,
    };

    cityProgress.savedState = gameState;
    cityProgress.lastPlayed = Date.now();
    data.cities[cityId] = cityProgress;
    data.lastPlayedCityId = cityId;
  }

  /**
   * Get saved game state for a city
   */
  static getSavedGameState(data: ProgressionData, cityId: string): SerializableGameState | null {
    const cityProgress = data.cities[cityId];
    return cityProgress?.savedState || null;
  }

  /**
   * Clear saved game state for a city (start fresh)
   */
  static clearGameState(data: ProgressionData, cityId: string): void {
    const cityProgress = data.cities[cityId];
    if (cityProgress) {
      delete cityProgress.savedState;
    }
  }

  /**
   * Check if a city has saved progress
   */
  static hasSavedProgress(data: ProgressionData, cityId: string): boolean {
    const cityProgress = data.cities[cityId];
    return !!(cityProgress?.savedState);
  }

  /**
   * Clear all progression (reset to default)
   */
  static clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
