import type { Waypoint } from '../types/entities';
import { PATH_CACHE_SIZE } from '../config/constants';

interface CacheEntry {
  path: Waypoint[];
  timestamp: number;
}

export class PathCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;

  constructor(maxSize: number = PATH_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  generateKey(startX: number, startY: number, endX: number, endY: number): string {
    return `${startX},${startY}->${endX},${endY}`;
  }

  get(key: string): Waypoint[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // LRU: Move to end by deleting and re-adding
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.path;
  }

  set(key: string, path: Waypoint[]): void {
    // If at capacity, remove oldest (first entry)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      path,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}
