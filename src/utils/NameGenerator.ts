/**
 * NameGenerator - Procedural name generation for NPCs and city blocks
 */

// First names for NPCs
const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Skylar', 'Dakota', 'River', 'Sage', 'Phoenix', 'Rowan', 'Finley', 'Blake',
  'Charlie', 'Parker', 'Peyton', 'Cameron', 'Drew', 'Hayden', 'Jasper', 'Kai',
  'Logan', 'Mason', 'Noah', 'Oliver', 'Liam', 'Ethan', 'Aiden', 'Lucas',
  'Emma', 'Olivia', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Luna', 'Ella', 'Madison', 'Scarlett',
  'Victoria', 'Aria', 'Grace', 'Chloe', 'Camila', 'Penelope', 'Layla', 'Riley',
];

// Last names for NPCs
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Hall', 'Allen', 'King',
  'Wright', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Carter', 'Mitchell',
  'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins',
  'Stewart', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy',
];

// Street name prefixes
const STREET_PREFIXES = [
  'Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Birch', 'Willow', 'Ash',
  'Cherry', 'Walnut', 'Spruce', 'Cypress', 'Magnolia', 'Poplar', 'Hickory', 'Redwood',
  'Park', 'Lake', 'River', 'Hill', 'Valley', 'Mountain', 'Forest', 'Meadow',
  'Garden', 'Spring', 'Summer', 'Winter', 'Autumn', 'Sunset', 'Sunrise', 'Moonlight',
  'Star', 'Horizon', 'Vista', 'Ridge', 'Brook', 'Creek', 'Bridge', 'Harbor',
  'Bay', 'Shore', 'Coast', 'Cliff', 'Canyon', 'Mesa', 'Prairie', 'Plains',
  'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth',
  'North', 'South', 'East', 'West', 'Central', 'Main', 'Market', 'Union',
];

// Street name suffixes
const STREET_SUFFIXES = [
  'Street', 'Avenue', 'Boulevard', 'Road', 'Drive', 'Lane', 'Way', 'Court',
  'Place', 'Terrace', 'Circle', 'Park', 'Square', 'Plaza', 'Trail', 'Path',
];

// Block type descriptors
const RESIDENTIAL_DESCRIPTORS = [
  'Heights', 'Gardens', 'Village', 'Manor', 'Estates', 'Park', 'Hills', 'Grove',
  'Meadows', 'Glen', 'Woods', 'Pines', 'Oaks', 'Plaza', 'Terrace', 'Vista',
];

const COMMERCIAL_DESCRIPTORS = [
  'Plaza', 'Center', 'Square', 'Market', 'Mall', 'District', 'Quarter', 'Exchange',
  'Hub', 'Commons', 'Galleria', 'Arcade', 'Promenade', 'Emporium', 'Bazaar', 'Row',
];

const INDUSTRIAL_DESCRIPTORS = [
  'Works', 'Mills', 'Factory', 'Plant', 'Foundry', 'Yards', 'Terminal', 'Depot',
  'Warehouse', 'Forge', 'Docks', 'Port', 'Shipyard', 'Refinery', 'Complex', 'Zone',
];

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  pick<T>(array: T[]): T {
    return array[this.nextInt(array.length)];
  }
}

export class NameGenerator {
  private static npcNameCache = new Map<string, string>();
  private static blockNameCache = new Map<string, string>();

  /**
   * Generate a random NPC name
   */
  static generateNPCName(id: string): string {
    // Check cache first
    if (this.npcNameCache.has(id)) {
      return this.npcNameCache.get(id)!;
    }

    // Use ID as seed for consistent names
    const seed = this.stringToSeed(id);
    const rng = new SeededRandom(seed);

    const firstName = rng.pick(FIRST_NAMES);
    const lastName = rng.pick(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;

    // Cache the name
    this.npcNameCache.set(id, fullName);
    return fullName;
  }

  /**
   * Generate a street name for a city block
   */
  static generateStreetName(x: number, y: number, zoneType: string): string {
    const key = `${x},${y},${zoneType}`;

    // Check cache first
    if (this.blockNameCache.has(key)) {
      return this.blockNameCache.get(key)!;
    }

    // Use position as seed for consistent names
    const seed = x * 1000 + y * 13 + this.stringToSeed(zoneType);
    const rng = new SeededRandom(seed);

    let name: string;

    if (zoneType === 'residential') {
      const prefix = rng.pick(STREET_PREFIXES);
      const descriptor = rng.pick(RESIDENTIAL_DESCRIPTORS);
      name = `${prefix} ${descriptor}`;
    } else if (zoneType === 'commercial') {
      const prefix = rng.pick(STREET_PREFIXES);
      const descriptor = rng.pick(COMMERCIAL_DESCRIPTORS);
      name = `${prefix} ${descriptor}`;
    } else if (zoneType === 'industrial') {
      const prefix = rng.pick(STREET_PREFIXES);
      const descriptor = rng.pick(INDUSTRIAL_DESCRIPTORS);
      name = `${prefix} ${descriptor}`;
    } else {
      // Road or other - just use street naming
      const prefix = rng.pick(STREET_PREFIXES);
      const suffix = rng.pick(STREET_SUFFIXES);
      name = `${prefix} ${suffix}`;
    }

    // Cache the name
    this.blockNameCache.set(key, name);
    return name;
  }

  /**
   * Convert string to numeric seed
   */
  private static stringToSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Clear the name caches (useful for testing or memory management)
   */
  static clearCache(): void {
    this.npcNameCache.clear();
    this.blockNameCache.clear();
  }
}
