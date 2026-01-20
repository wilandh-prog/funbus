/**
 * City Configuration System
 *
 * Defines metadata for all cities in the game, including seeds for
 * reproducible procedural generation and unlock requirements.
 */

export interface CityConfig {
  id: string;
  name: string;
  seed: number;
  unlockScore: number;
  description: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * All available cities
 * Seeds are carefully selected to produce varied city layouts
 */
export const CITIES: CityConfig[] = [
  {
    id: 'springfield',
    name: 'Springfield',
    seed: 12345,
    unlockScore: 0, // Always unlocked (starter city)
    description: 'A simple starting city with regular blocks and balanced zones',
    difficulty: 'easy',
  },
  {
    id: 'riverside',
    name: 'Riverside',
    seed: 67890,
    unlockScore: 60,
    description: 'A riverside city with unique industrial clustering patterns',
    difficulty: 'medium',
  },
  {
    id: 'metropolis',
    name: 'Metropolis',
    seed: 24680,
    unlockScore: 60,
    description: 'A dense metropolitan area with complex commercial zones',
    difficulty: 'medium',
  },
  {
    id: 'oceanview',
    name: 'Ocean View',
    seed: 13579,
    unlockScore: 60,
    description: 'A coastal city with scattered zones and challenging layouts',
    difficulty: 'hard',
  },
];

/**
 * Get city configuration by ID
 */
export function getCityById(id: string): CityConfig | undefined {
  return CITIES.find((c) => c.id === id);
}

/**
 * Get the default (starter) city
 */
export function getDefaultCity(): CityConfig {
  return CITIES[0]; // Springfield is always first
}
