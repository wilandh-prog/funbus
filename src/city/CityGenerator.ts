import type { Zone, RoadCell } from '../types/city';
import { ZoneType } from '../types/city';
import { COLS, ROWS, TRAFFIC_ZONE_WEIGHTS, CENTER_WEIGHT_MULTIPLIER, ARTERIAL_WEIGHT_MULTIPLIER } from '../config/constants';
import { SeededRandom } from '../utils/SeededRandom';
import { NameGenerator } from '../utils/NameGenerator';

export interface CityData {
  cityGrid: ZoneType[][];
  roads: RoadCell[];
  zones: Zone[];
}

export class CityGenerator {
  private readonly BUILDING_SIZES = [
    { w: 2, h: 2 },
    { w: 3, h: 2 },
    { w: 2, h: 3 },
    { w: 3, h: 3 },
    { w: 4, h: 2 },
    { w: 2, h: 4 },
    { w: 4, h: 3 },
    { w: 3, h: 4 },
  ];

  generate(seed?: number): CityData {
    const cityGrid: ZoneType[][] = [];
    const roads: RoadCell[] = [];
    const zones: Zone[] = [];

    // Create seeded RNG if seed provided, otherwise use Math.random()
    const rng = seed !== undefined ? new SeededRandom(seed) : null;
    const random = () => (rng ? rng.next() : Math.random());
    const randomInt = (min: number, max: number) =>
      rng ? rng.nextInt(min, max) : Math.floor(Math.random() * (max - min) + min);

    // Create empty grid
    for (let y = 0; y < ROWS; y++) {
      cityGrid[y] = [];
      for (let x = 0; x < COLS; x++) {
        cityGrid[y][x] = ZoneType.EMPTY;
      }
    }

    // Create grid road network - roads every 7 cells (1 cell wide)
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (x % 7 === 0 || y % 7 === 0) {
          cityGrid[y][x] = ZoneType.ROAD;
          roads.push({ x, y });
        }
      }
    }

    // Place zones in blocks between roads
    const zoneBlocks: Zone[] = [];
    const gridBlocksY = Math.floor(ROWS / 7);
    const gridBlocksX = Math.floor(COLS / 7);

    // Determine industrial zones (about 15% of blocks)
    const industrialBlocks = this.generateIndustrialBlocks(gridBlocksX, gridBlocksY, random, randomInt);

    // Fill each block with buildings
    for (let gridY = 0; gridY < gridBlocksY; gridY++) {
      for (let gridX = 0; gridX < gridBlocksX; gridX++) {
        const startX = gridX * 7 + 1; // Skip 1-wide road
        const startY = gridY * 7 + 1; // Skip 1-wide road
        const availableW = 6;
        const availableH = 6;

        // Determine zone types for this block
        const blockKey = `${gridX},${gridY}`;
        const isIndustrialBlock = industrialBlocks.has(blockKey);

        const blockZoneTypes = isIndustrialBlock
          ? [ZoneType.INDUSTRIAL]
          : [ZoneType.RESIDENTIAL, ZoneType.COMMERCIAL];

        this.fillBlock(startX, startY, availableW, availableH, blockZoneTypes, zoneBlocks, random, randomInt);
      }
    }

    // Add zones to cityGrid and zones array
    zoneBlocks.forEach((block) => {
      // Clamp zone dimensions to ensure they don't extend beyond grid bounds
      const clampedW = Math.min(block.w, COLS - block.x);
      const clampedH = Math.min(block.h, ROWS - block.y);

      const zone: Zone = {
        ...block,
        w: clampedW,
        h: clampedH,
        name: NameGenerator.generateStreetName(block.x, block.y, block.type)
      };
      zones.push(zone);

      // Fill cityGrid cells with zone type
      for (let dy = 0; dy < zone.h; dy++) {
        for (let dx = 0; dx < zone.w; dx++) {
          const ny = zone.y + dy;
          const nx = zone.x + dx;
          if (ny < ROWS && nx < COLS) {
            cityGrid[ny][nx] = zone.type;
          }
        }
      }
    });

    this.logDiagnostics(zones);

    // Calculate traffic weights for each road
    this.calculateRoadTrafficWeights(roads, cityGrid);

    return { cityGrid, roads, zones };
  }

  /**
   * Calculate traffic weight for each road based on location and nearby zones
   */
  private calculateRoadTrafficWeights(roads: RoadCell[], cityGrid: ZoneType[][]): void {
    const centerX = COLS / 2;
    const centerY = ROWS / 2;
    const maxDistFromCenter = Math.sqrt(centerX * centerX + centerY * centerY);

    roads.forEach(road => {
      let weight = 1.0;

      // Factor 1: Distance from city center (center = more traffic)
      const distFromCenter = Math.sqrt(
        Math.pow(road.x - centerX, 2) + Math.pow(road.y - centerY, 2)
      );
      const centerProximity = 1 - (distFromCenter / maxDistFromCenter);
      weight *= 1 + (centerProximity * (CENTER_WEIGHT_MULTIPLIER - 1));

      // Factor 2: Adjacent zone types (check 4 adjacent cells)
      const adjacentZones: ZoneType[] = [];
      const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 },  // right
      ];

      directions.forEach(({ dx, dy }) => {
        const nx = road.x + dx;
        const ny = road.y + dy;
        if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
          adjacentZones.push(cityGrid[ny][nx]);
        }
      });

      // Apply highest adjacent zone weight
      let maxZoneWeight = TRAFFIC_ZONE_WEIGHTS.ROAD;
      adjacentZones.forEach(zoneType => {
        const zoneWeight = TRAFFIC_ZONE_WEIGHTS[zoneType.toUpperCase() as keyof typeof TRAFFIC_ZONE_WEIGHTS] || TRAFFIC_ZONE_WEIGHTS.ROAD;
        maxZoneWeight = Math.max(maxZoneWeight, zoneWeight);
      });
      weight *= maxZoneWeight;

      // Factor 3: Arterial roads (major intersections at grid crossings)
      const isVerticalArterial = road.x % 14 === 0; // Every other vertical road
      const isHorizontalArterial = road.y % 14 === 0; // Every other horizontal road
      if (isVerticalArterial || isHorizontalArterial) {
        weight *= ARTERIAL_WEIGHT_MULTIPLIER;
      }

      road.trafficWeight = weight;
    });

    // Log traffic weight statistics
    const weights = roads.map(r => r.trafficWeight || 1.0);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    console.log(`🚗 Traffic weights calculated: min=${minWeight.toFixed(2)}, avg=${avgWeight.toFixed(2)}, max=${maxWeight.toFixed(2)}`);
  }

  private generateIndustrialBlocks(
    gridBlocksX: number,
    gridBlocksY: number,
    random: () => number,
    randomInt: (min: number, max: number) => number
  ): Set<string> {
    const industrialBlocks = new Set<string>();
    const numIndustrialBlocks = Math.floor(gridBlocksX * gridBlocksY * 0.15);

    for (let i = 0; i < numIndustrialBlocks; i++) {
      const gridX = randomInt(0, gridBlocksX);
      const gridY = randomInt(0, gridBlocksY);
      const key = `${gridX},${gridY}`;
      industrialBlocks.add(key);

      // Add adjacent blocks for clustering (50% chance for each neighbor)
      if (random() > 0.5 && gridX > 0) {
        industrialBlocks.add(`${gridX - 1},${gridY}`);
      }
      if (random() > 0.5 && gridX < gridBlocksX - 1) {
        industrialBlocks.add(`${gridX + 1},${gridY}`);
      }
      if (random() > 0.5 && gridY > 0) {
        industrialBlocks.add(`${gridX},${gridY - 1}`);
      }
      if (random() > 0.5 && gridY < gridBlocksY - 1) {
        industrialBlocks.add(`${gridX},${gridY + 1}`);
      }
    }

    return industrialBlocks;
  }

  private fillBlock(
    startX: number,
    startY: number,
    availableW: number,
    availableH: number,
    blockZoneTypes: ZoneType[],
    zoneBlocks: Zone[],
    _random: () => number,
    randomInt: (min: number, max: number) => number
  ): void {
    let currentY = startY;

    while (currentY < startY + availableH) {
      let currentX = startX;
      while (currentX < startX + availableW) {
        const remainingW = startX + availableW - currentX;
        const remainingH = startY + availableH - currentY;

        // Pick a random building size that fits
        const validSizes = this.BUILDING_SIZES.filter(
          (s) => s.w <= remainingW && s.h <= remainingH
        );
        if (validSizes.length === 0) break;

        const size = validSizes[randomInt(0, validSizes.length)];
        const zoneType = blockZoneTypes[randomInt(0, blockZoneTypes.length)];

        // Assign sprite based on zone type (randomly select from available variations)
        let sprite = '';
        if (zoneType === ZoneType.RESIDENTIAL) {
          const residentialSprites = ['residential1', 'residential2', 'residential3'];
          sprite = residentialSprites[randomInt(0, residentialSprites.length)];
        } else if (zoneType === ZoneType.COMMERCIAL) {
          const commercialSprites = ['commercial1', 'commercial2', 'commercial3'];
          sprite = commercialSprites[randomInt(0, commercialSprites.length)];
        } else if (zoneType === ZoneType.INDUSTRIAL) {
          const industrialSprites = ['industrial1', 'industrial2'];
          sprite = industrialSprites[randomInt(0, industrialSprites.length)];
        }

        zoneBlocks.push({
          x: currentX,
          y: currentY,
          w: size.w,
          h: size.h,
          type: zoneType,
          sprite: sprite,
        });
        currentX += size.w;
      }
      currentY++;
      // Jump to next complete row
      const rowHeights = zoneBlocks
        .filter((b) => b.y === currentY - 1 && b.x >= startX && b.x < startX + availableW)
        .map((b) => b.h);
      if (rowHeights.length > 0) {
        currentY = currentY - 1 + Math.max(...rowHeights);
      }
    }
  }

  private logDiagnostics(zones: Zone[]): void {
    console.log('=== ZONE BOUNDARY CHECK ===');
    console.log(`Map boundaries: COLS=${COLS}, ROWS=${ROWS}`);
    console.log(`Canvas size: ${COLS * 30}x${ROWS * 30} pixels`);

    let outOfBoundsCount = 0;
    zones.forEach((zone, index) => {
      const maxX = zone.x + zone.w;
      const maxY = zone.y + zone.h;

      if (maxX > COLS || maxY > ROWS) {
        console.warn(`Zone ${index} OUT OF BOUNDS:`, {
          type: zone.type,
          x: zone.x,
          y: zone.y,
          w: zone.w,
          h: zone.h,
          maxX: maxX,
          maxY: maxY,
          exceedsX: maxX > COLS,
          exceedsY: maxY > ROWS,
        });
        outOfBoundsCount++;
      }
    });

    console.log(`Total zones: ${zones.length}`);
    console.log(`Zones out of bounds: ${outOfBoundsCount}`);
  }
}
