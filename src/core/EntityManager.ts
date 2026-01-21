import type { GameState } from '../types/game';
import type { NPC, TrafficVehicle, VehicleType, Zone } from '../types/entities';
import type { RoadCell } from '../types/city';
import { ZoneType } from '../types/city';
import { GRID_SIZE, COLS, ROWS, NPC_MAX_WAIT_TIME, TRAFFIC_SPEED } from '../config/constants';
import { PathfindingManager } from '../pathfinding/PathfindingManager';
import { SpatialIndex } from '../spatial/SpatialIndex';
import { RoutePlanner } from '../pathfinding/RoutePlanner';
import { NameGenerator } from '../utils/NameGenerator';

// Vehicle types for traffic
const VEHICLE_TYPES: Record<string, VehicleType> = {
  CAR: { sprite: 'car', length: 0.8, width: 0.5 },
  TRUCK: { sprite: 'truck', length: 1.0, width: 0.55 },
  VAN: { sprite: 'van', length: 0.85, width: 0.52 },
};

/**
 * EntityManager - Manages NPC and traffic vehicle lifecycle
 */
export class EntityManager {
  private pathfindingManager: PathfindingManager;
  private spatialIndex: SpatialIndex;
  private routePlanner: RoutePlanner;

  constructor(pathfindingManager: PathfindingManager, spatialIndex: SpatialIndex) {
    this.pathfindingManager = pathfindingManager;
    this.spatialIndex = spatialIndex;
    this.routePlanner = new RoutePlanner();
  }

  /**
   * Create a new NPC
   */
  createNPC(state: GameState): void {
    const residentialZones = state.zones.filter((z) => z.type === ZoneType.RESIDENTIAL);
    const destinationZones = state.zones.filter(
      (z) => z.type === ZoneType.COMMERCIAL || z.type === ZoneType.INDUSTRIAL
    );

    if (residentialZones.length === 0 || destinationZones.length === 0) return;

    const origin = residentialZones[Math.floor(Math.random() * residentialZones.length)];
    const destination = destinationZones[Math.floor(Math.random() * destinationZones.length)];

    // Find nearest stop to the zone center to determine which edge is farthest
    const zoneCenterX = (origin.x + origin.w / 2) * GRID_SIZE;
    const zoneCenterY = (origin.y + origin.h / 2) * GRID_SIZE;

    let nearestStopX = zoneCenterX;
    let nearestStopY = zoneCenterY;

    // Find nearest stop if routes exist
    if (state.routes.length > 0) {
      const nearestStop = this.spatialIndex.findNearestStop(zoneCenterX, zoneCenterY);
      if (nearestStop) {
        nearestStopX = nearestStop.x * GRID_SIZE;
        nearestStopY = nearestStop.y * GRID_SIZE;
      }
    }

    // Find road cells on the perimeter of the zone
    const roadCandidates = [];

    // Check perimeter of zone for road cells
    for (let x = origin.x; x < origin.x + origin.w; x++) {
      // Top edge
      if (origin.y - 1 >= 0 && state.cityGrid[origin.y - 1][x] === ZoneType.ROAD) {
        roadCandidates.push({ x: x * GRID_SIZE, y: (origin.y - 1) * GRID_SIZE });
      }
      // Bottom edge
      if (origin.y + origin.h < ROWS && state.cityGrid[origin.y + origin.h][x] === ZoneType.ROAD) {
        roadCandidates.push({ x: x * GRID_SIZE, y: (origin.y + origin.h) * GRID_SIZE });
      }
    }

    for (let y = origin.y; y < origin.y + origin.h; y++) {
      // Left edge
      if (origin.x - 1 >= 0 && state.cityGrid[y][origin.x - 1] === ZoneType.ROAD) {
        roadCandidates.push({ x: (origin.x - 1) * GRID_SIZE, y: y * GRID_SIZE });
      }
      // Right edge
      if (origin.x + origin.w < COLS && state.cityGrid[y][origin.x + origin.w] === ZoneType.ROAD) {
        roadCandidates.push({ x: (origin.x + origin.w) * GRID_SIZE, y: y * GRID_SIZE });
      }
    }

    let spawnX, spawnY;

    if (roadCandidates.length > 0 && state.routes.length > 0) {
      // Pick road cell farthest from nearest stop
      let farthestRoad = roadCandidates[0];
      let maxDist = 0;

      for (const road of roadCandidates) {
        const dist = Math.sqrt(
          (road.x - nearestStopX) ** 2 + (road.y - nearestStopY) ** 2
        );
        if (dist > maxDist) {
          maxDist = dist;
          farthestRoad = road;
        }
      }

      spawnX = farthestRoad.x;
      spawnY = farthestRoad.y;
    } else if (roadCandidates.length > 0) {
      // Random road edge
      const randomRoad = roadCandidates[Math.floor(Math.random() * roadCandidates.length)];
      spawnX = randomRoad.x;
      spawnY = randomRoad.y;
    } else {
      // Fallback: spawn at zone center (no road access)
      spawnX = (origin.x + origin.w / 2) * GRID_SIZE;
      spawnY = (origin.y + origin.h / 2) * GRID_SIZE;
    }

    // Clamp spawn position to ensure it's within canvas bounds
    const canvasSize = COLS * GRID_SIZE;
    spawnX = Math.max(0, Math.min(spawnX, canvasSize - 1));
    spawnY = Math.max(0, Math.min(spawnY, canvasSize - 1));

    const id = `npc-${Date.now()}-${Math.random()}`;
    const npc: NPC = {
      id,
      name: NameGenerator.generateNPCName(id),
      x: spawnX,
      y: spawnY,
      originZone: origin,
      destinationZone: destination,
      state: 'walking', // Start in walking state
      waitTime: 0,
      nearestStop: null,
      atStop: false,
      transferCount: 0,
      walkingPath: [], // Will be set when nearest stop is found
      walkingPathIndex: 0,
    };

    state.npcs.push(npc);
  }

  /**
   * Create a new traffic vehicle
   */
  /**
   * Select a random road using weighted probability
   */
  private selectWeightedRoad(roads: ReadonlyArray<RoadCell>, cityGrid: ReadonlyArray<ReadonlyArray<ZoneType>>, preferZoneTypes?: ZoneType[]): RoadCell {
    // If zone preference specified, boost weights for roads near those zones
    const adjustedWeights = roads.map(road => {
      let weight = road.trafficWeight || 1.0;

      if (preferZoneTypes && preferZoneTypes.length > 0) {
        // Check adjacent zones
        const adjacentToPreferredZone = this.isRoadAdjacentToZones(road, preferZoneTypes, cityGrid);
        if (adjacentToPreferredZone) {
          weight *= 2.5; // 2.5x weight for roads near preferred zones
        }
      }

      return weight;
    });

    // Calculate total weight
    const totalWeight = adjustedWeights.reduce((sum, w) => sum + w, 0);

    // Random value between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Find the road corresponding to this random value
    for (let i = 0; i < roads.length; i++) {
      random -= adjustedWeights[i];
      if (random <= 0) {
        return roads[i];
      }
    }

    // Fallback (should never reach here)
    return roads[roads.length - 1];
  }

  /**
   * Check if a road is adjacent to any of the specified zone types
   */
  private isRoadAdjacentToZones(road: RoadCell, zoneTypes: ZoneType[], cityGrid: ReadonlyArray<ReadonlyArray<ZoneType>>): boolean {
    const directions = [
      { dx: 0, dy: -1 }, // up
      { dx: 0, dy: 1 },  // down
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: 0 },  // right
    ];

    for (const { dx, dy } of directions) {
      const nx = road.x + dx;
      const ny = road.y + dy;
      if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
        const zoneType = cityGrid[ny][nx];
        if (zoneTypes.includes(zoneType)) {
          return true;
        }
      }
    }

    return false;
  }

  createTrafficVehicle(state: GameState): void {
    if (state.roads.length === 0) return;

    // Determine commute pattern based on time of day
    const hour = state.timeOfDay * 24;
    let startZonePreference: ZoneType[] | undefined;
    let destZonePreference: ZoneType[] | undefined;

    if (hour >= 7 && hour < 9) {
      // Morning rush: residential -> commercial/industrial
      startZonePreference = [ZoneType.RESIDENTIAL];
      destZonePreference = [ZoneType.COMMERCIAL, ZoneType.INDUSTRIAL];
    } else if (hour >= 17 && hour < 19) {
      // Evening rush: commercial/industrial -> residential
      startZonePreference = [ZoneType.COMMERCIAL, ZoneType.INDUSTRIAL];
      destZonePreference = [ZoneType.RESIDENTIAL];
    }

    const startRoad = this.selectWeightedRoad(state.roads, state.cityGrid, startZonePreference);
    const destRoad = this.selectWeightedRoad(state.roads, state.cityGrid, destZonePreference);

    const vehicleTypeKeys = Object.keys(VEHICLE_TYPES);
    const vehicleType = VEHICLE_TYPES[vehicleTypeKeys[Math.floor(Math.random() * vehicleTypeKeys.length)]];

    const vehicle: TrafficVehicle = {
      id: `traffic-${Date.now()}-${Math.random()}`,
      x: startRoad.x * GRID_SIZE,
      y: startRoad.y * GRID_SIZE,
      destinationX: destRoad.x,
      destinationY: destRoad.y,
      path: [],
      pathIndex: 0,
      type: vehicleType,
      angle: 0,
      currentSpeed: TRAFFIC_SPEED,
    };

    // Find path
    vehicle.path = this.pathfindingManager.findPath(
      vehicle.x,
      vehicle.y,
      vehicle.destinationX * GRID_SIZE,
      vehicle.destinationY * GRID_SIZE
    );

    state.traffic.push(vehicle);
  }

  /**
   * Update all NPCs
   */
  updateNPCs(state: GameState, deltaTime: number): void {
    for (let i = state.npcs.length - 1; i >= 0; i--) {
      const npc = state.npcs[i];

      if (npc.state === 'walking') {
        // NPC is walking to the nearest bus stop
        const WALKING_SPEED = 0.5; // Very slow to make walking visible

        // Find nearest stop if not already assigned
        if (!npc.nearestStop && state.routes.length > 0) {
          npc.nearestStop = this.spatialIndex.findNearestStop(npc.x, npc.y);

          // Create walking path to the stop
          if (npc.nearestStop) {
            const stopX = npc.nearestStop.x * GRID_SIZE;
            const stopY = npc.nearestStop.y * GRID_SIZE;

            // Calculate distance to stop
            const distToStop = Math.sqrt(
              (stopX - npc.x) ** 2 + (stopY - npc.y) ** 2
            );

            console.log(`👤 NPC spawned and walking to stop`, {
              spawnPos: { x: Math.round(npc.x), y: Math.round(npc.y) },
              stopPos: { x: stopX, y: stopY },
              distancePixels: Math.round(distToStop),
              distanceGridCells: (distToStop / GRID_SIZE).toFixed(1),
            });

            // Use pathfinding to walk along roads to the stop
            npc.walkingPath = this.pathfindingManager.findPath(
              npc.x,
              npc.y,
              stopX,
              stopY
            );
            npc.walkingPathIndex = 0;

            if (npc.walkingPath.length === 0) {
              console.warn(`⚠️ NPC has no walking path - teleporting to stop`);
              npc.x = stopX;
              npc.y = stopY;
              npc.state = 'waiting';
              npc.atStop = true;
            }
          }
        }

        // Walk along the path
        if (npc.walkingPath && npc.walkingPath.length > 0 && npc.walkingPathIndex !== undefined) {
          if (npc.walkingPathIndex < npc.walkingPath.length) {
            const waypoint = npc.walkingPath[npc.walkingPathIndex];
            const dx = waypoint.x - npc.x;
            const dy = waypoint.y - npc.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < WALKING_SPEED) {
              // Reached waypoint
              npc.x = waypoint.x;
              npc.y = waypoint.y;
              npc.walkingPathIndex++;

              // If reached final waypoint (the stop)
              if (npc.walkingPathIndex >= npc.walkingPath.length) {
                // Arrived at stop - switch to waiting state
                npc.state = 'waiting';
                npc.atStop = true;
                npc.walkingPath = undefined;
                npc.walkingPathIndex = undefined;

                // Plan the trip immediately upon arrival
                if (npc.nearestStop) {
                  const destCenter = this.getDestinationCenter(npc.destinationZone);
                  const finalDestStop = this.spatialIndex.findNearestStop(destCenter.x, destCenter.y);

                  if (finalDestStop) {
                    // Validate destination stop
                    const distToZone = this.distance(
                      finalDestStop.x * GRID_SIZE,
                      finalDestStop.y * GRID_SIZE,
                      destCenter.x,
                      destCenter.y
                    );
                    const maxAcceptableDistance = 8 * GRID_SIZE;

                    if (distToZone <= maxAcceptableDistance) {
                      npc.finalDestinationStop = finalDestStop;

                      // Check if already at destination
                      if (
                        npc.nearestStop.x === finalDestStop.x &&
                        npc.nearestStop.y === finalDestStop.y
                      ) {
                        npc.state = 'arrived';
                        state.stats.tripsCompleted++;
                        state.stats.totalWaitTime += npc.waitTime;
                        // Track transport time (NPC already at destination, so transport time is 0)
                        // Add trip income based on ticket price
                        state.economics.money += state.economics.ticketPrice;
                        state.economics.totalIncome += state.economics.ticketPrice;
                      } else {
                        // Plan the trip
                        const plan = this.routePlanner.planTrip(
                          npc.nearestStop,
                          finalDestStop,
                          state.routes
                        );

                        if (plan) {
                          npc.plannedRoute = {
                            stops: plan.stops,
                            routes: plan.routes,
                            currentStopIndex: 0,
                          };
                          console.log('🗺️ NPC planned route:', {
                            from: { x: npc.nearestStop.x, y: npc.nearestStop.y },
                            to: { x: finalDestStop.x, y: finalDestStop.y },
                            stops: plan.stops.length,
                            transfers: plan.routes.length - 1,
                          });
                        }
                      }
                    }
                  }
                }
              }
            } else {
              // Move toward waypoint
              npc.x += (dx / dist) * WALKING_SPEED;
              npc.y += (dy / dist) * WALKING_SPEED;
            }
          }
        }
      } else if (npc.state === 'waiting') {
        npc.waitTime += deltaTime / 1000;

        // NPCs should already have nearestStop set from walking state
        // But handle edge case where they don't
        if (!npc.nearestStop && state.routes.length > 0) {
          npc.nearestStop = this.spatialIndex.findNearestStop(npc.x, npc.y);
          if (npc.nearestStop) {
            npc.atStop = true;

            // Find destination stop
            const destCenter = this.getDestinationCenter(npc.destinationZone);
            const finalDestStop = this.spatialIndex.findNearestStop(destCenter.x, destCenter.y);

            if (finalDestStop) {
              // CRITICAL: Validate the destination stop is actually close to the destination zone
              const distToZone = this.distance(
                finalDestStop.x * GRID_SIZE,
                finalDestStop.y * GRID_SIZE,
                destCenter.x,
                destCenter.y
              );
              const coverageRadius = 8; // Grid cells
              const maxAcceptableDistance = coverageRadius * GRID_SIZE;

              if (distToZone > maxAcceptableDistance) {
                console.warn(
                  '⚠ NPC destination zone not covered by any stop (zone unreachable)',
                  {
                    destinationZone: npc.destinationZone.type,
                    destinationCenter: {
                      x: destCenter.x / GRID_SIZE,
                      y: destCenter.y / GRID_SIZE,
                    },
                    nearestStop: { x: finalDestStop.x, y: finalDestStop.y },
                    distanceGridCells: (distToZone / GRID_SIZE).toFixed(1),
                    maxAllowed: coverageRadius,
                  }
                );
                // Destination is unreachable - NPC will give up after waiting
                return;
              }

              npc.finalDestinationStop = finalDestStop;

              // Check if we're already at the destination stop
              if (
                npc.nearestStop.x === finalDestStop.x &&
                npc.nearestStop.y === finalDestStop.y
              ) {
                // Already at destination - complete trip immediately
                npc.state = 'arrived';
                state.stats.tripsCompleted++;
                state.stats.totalWaitTime += npc.waitTime;
                // Track transport time (NPC already at destination, so transport time is 0)
                // Add trip income based on ticket price
                state.economics.money += state.economics.ticketPrice;
                state.economics.totalIncome += state.economics.ticketPrice;
                console.log('✓ NPC arrived (already at dest stop)', {
                  stop: { x: npc.nearestStop.x, y: npc.nearestStop.y },
                  waitTime: npc.waitTime.toFixed(1) + 's',
                });
              } else {
                // Plan the trip from origin to destination
                const plan = this.routePlanner.planTrip(
                  npc.nearestStop,
                  finalDestStop,
                  state.routes
                );

                if (plan) {
                  npc.plannedRoute = {
                    stops: plan.stops,
                    routes: plan.routes,
                    currentStopIndex: 0,
                  };
                  console.log(
                    `→ NPC planned trip: ${plan.stops.length} stops, ${plan.totalTransfers} transfers`,
                    {
                      from: { x: npc.nearestStop.x, y: npc.nearestStop.y },
                      to: { x: finalDestStop.x, y: finalDestStop.y },
                      distToDestZone: (distToZone / GRID_SIZE).toFixed(1) + ' cells',
                    }
                  );
                } else {
                  console.warn('⚠ NPC could not plan route to destination', {
                    from: { x: npc.nearestStop.x, y: npc.nearestStop.y },
                    to: { x: finalDestStop.x, y: finalDestStop.y },
                  });
                }
              }
            }
          }
        }

        // Give up if waited too long
        if (npc.waitTime > NPC_MAX_WAIT_TIME) {
          state.npcs.splice(i, 1);
          state.stats.npcsGaveUp++;
        }
      } else if (npc.state === 'arrived') {
        // Remove arrived NPCs
        state.npcs.splice(i, 1);
      }
    }
  }

  /**
   * Update all traffic vehicles with collision avoidance
   */
  updateTraffic(state: GameState): void {
    const DETECTION_DISTANCE = GRID_SIZE * 2.5; // How far ahead to check
    const SAFE_DISTANCE = GRID_SIZE * 1.2; // Minimum safe distance
    const ACCELERATION = 0.3; // Speed change rate
    const MIN_SPEED = 0.5; // Minimum speed when slowing
    const LANE_OFFSET = GRID_SIZE * 0.3; // Keep-right lane offset
    const TURN_SPEED = 0.08; // Angle interpolation speed (radians per frame)
    const WAYPOINT_REACHED_DIST = GRID_SIZE * 0.6; // Distance to consider waypoint reached
    const TURN_SPEED_REDUCTION = 0.35; // Speed multiplier when turning (35% of normal speed)
    const TURN_THRESHOLD = Math.PI / 8; // Angle threshold to consider as a turn (22.5 degrees)

    for (let i = state.traffic.length - 1; i >= 0; i--) {
      const vehicle = state.traffic[i];

      // Generate new path only when current path is complete
      if (vehicle.path.length === 0 || vehicle.pathIndex >= vehicle.path.length) {
        // Improved destination selection for smoother, longer-distance travel
        const MIN_DISTANCE = GRID_SIZE * 15; // Increased from 5 to 15 (450px minimum)

        // Multi-tier destination selection to avoid U-turns
        // Tier 1: Far forward roads (ideal case)
        let forwardRoads = state.roads.filter((road) => {
          const roadX = road.x * GRID_SIZE;
          const roadY = road.y * GRID_SIZE;
          const distToRoad = Math.sqrt(
            (roadX - vehicle.x) ** 2 + (roadY - vehicle.y) ** 2
          );

          if (distToRoad < MIN_DISTANCE) return false;

          const toRoadX = roadX - vehicle.x;
          const toRoadY = roadY - vehicle.y;
          const angleToRoad = Math.atan2(toRoadY, toRoadX);

          let angleDiff = angleToRoad - vehicle.angle;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

          // Accept roads within 90° forward cone
          return Math.abs(angleDiff) < Math.PI / 2;
        });

        // Tier 2: If no far roads, accept closer forward roads
        if (forwardRoads.length === 0) {
          forwardRoads = state.roads.filter((road) => {
            const roadX = road.x * GRID_SIZE;
            const roadY = road.y * GRID_SIZE;
            const distToRoad = Math.sqrt(
              (roadX - vehicle.x) ** 2 + (roadY - vehicle.y) ** 2
            );

            if (distToRoad < GRID_SIZE * 8) return false; // Reduced minimum

            const toRoadX = roadX - vehicle.x;
            const toRoadY = roadY - vehicle.y;
            const angleToRoad = Math.atan2(toRoadY, toRoadX);

            let angleDiff = angleToRoad - vehicle.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Wider cone but still no U-turns
            return Math.abs(angleDiff) < (Math.PI * 2 / 3); // 120° cone
          });
        }

        // Tier 3: Emergency fallback - any road except backward ones
        if (forwardRoads.length === 0) {
          forwardRoads = state.roads.filter((road) => {
            const roadX = road.x * GRID_SIZE;
            const roadY = road.y * GRID_SIZE;
            const toRoadX = roadX - vehicle.x;
            const toRoadY = roadY - vehicle.y;
            const angleToRoad = Math.atan2(toRoadY, toRoadX);

            let angleDiff = angleToRoad - vehicle.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // NEVER allow U-turns (exclude 135° backward cone)
            return Math.abs(angleDiff) < (Math.PI * 3 / 4);
          });
        }

        // Final fallback if somehow still empty
        let candidateRoads = forwardRoads.length > 0 ? forwardRoads : state.roads;

        // Prefer farther destinations for smoother flow (weight by distance)
        if (candidateRoads.length > 10) {
          // Sort by distance and pick from the farther half
          const roadsWithDistance = candidateRoads.map(road => {
            const roadX = road.x * GRID_SIZE;
            const roadY = road.y * GRID_SIZE;
            const dist = Math.sqrt((roadX - vehicle.x) ** 2 + (roadY - vehicle.y) ** 2);
            return { road, dist };
          });

          roadsWithDistance.sort((a, b) => b.dist - a.dist);

          // Pick from top 40% farthest destinations
          const topCount = Math.max(5, Math.floor(roadsWithDistance.length * 0.4));
          const topRoads = roadsWithDistance.slice(0, topCount);
          const selected = topRoads[Math.floor(Math.random() * topRoads.length)];

          vehicle.destinationX = selected.road.x;
          vehicle.destinationY = selected.road.y;
        } else {
          // Fallback for small candidate sets
          const newDestRoad = candidateRoads[Math.floor(Math.random() * candidateRoads.length)];
          vehicle.destinationX = newDestRoad.x;
          vehicle.destinationY = newDestRoad.y;
        }

        vehicle.path = this.pathfindingManager.findPath(
          vehicle.x,
          vehicle.y,
          vehicle.destinationX * GRID_SIZE,
          vehicle.destinationY * GRID_SIZE
        );
        vehicle.pathIndex = 0;
      }

      if (vehicle.pathIndex < vehicle.path.length) {
        const waypoint = vehicle.path[vehicle.pathIndex];

        // Center waypoint on road cell (waypoints are at grid corners, not centers)
        const waypointCenterX = waypoint.x + GRID_SIZE / 2;
        const waypointCenterY = waypoint.y + GRID_SIZE / 2;

        // Calculate lane offset based on path direction (stable, doesn't change with vehicle angle)
        let laneOffsetX = 0;
        let laneOffsetY = 0;

        // Look ahead further in path for more stable direction (reduces jerk at waypoint transitions)
        const lookAheadSteps = Math.min(3, vehicle.path.length - vehicle.pathIndex - 1);
        if (lookAheadSteps > 0) {
          const lookAheadWaypoint = vehicle.path[vehicle.pathIndex + lookAheadSteps];
          const pathDx = lookAheadWaypoint.x - waypoint.x;
          const pathDy = lookAheadWaypoint.y - waypoint.y;
          const pathAngle = Math.atan2(pathDy, pathDx);

          // Offset perpendicular to path direction (90° clockwise for right-side driving)
          const perpAngle = pathAngle + Math.PI / 2;
          laneOffsetX = Math.cos(perpAngle) * LANE_OFFSET;
          laneOffsetY = Math.sin(perpAngle) * LANE_OFFSET;
        }

        // Apply lane offset to waypoint
        const targetX = waypointCenterX + laneOffsetX;
        const targetY = waypointCenterY + laneOffsetY;

        // Calculate direction to target
        const dx = targetX - vehicle.x;
        const dy = targetY - vehicle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Smoothly turn vehicle toward movement direction
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - vehicle.angle;

        // Normalize angle difference to [-π, π]
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Detect turn sharpness and distance to turn
        // Check 1: Current turning angle
        const currentTurnAngle = Math.abs(angleDiff);

        // Check 2: Upcoming turns in path ahead with distance tracking
        let maxTurnAngle = currentTurnAngle;
        let distanceToTurn = 0; // Distance to the sharpest turn

        for (let checkIdx = vehicle.pathIndex; checkIdx < Math.min(vehicle.pathIndex + 3, vehicle.path.length - 1); checkIdx++) {
          const currentWp = vehicle.path[checkIdx];
          const nextWp = vehicle.path[checkIdx + 1];

          if (checkIdx + 2 < vehicle.path.length) {
            const futureWp = vehicle.path[checkIdx + 2];

            // Calculate angle between current->next and next->future segments
            const angle1 = Math.atan2(nextWp.y - currentWp.y, nextWp.x - currentWp.x);
            const angle2 = Math.atan2(futureWp.y - nextWp.y, futureWp.x - nextWp.x);

            let turnAngle = angle2 - angle1;
            // Normalize to [-π, π]
            while (turnAngle > Math.PI) turnAngle -= 2 * Math.PI;
            while (turnAngle < -Math.PI) turnAngle += 2 * Math.PI;

            // Track the sharpest turn and how far away it is
            if (Math.abs(turnAngle) > maxTurnAngle) {
              maxTurnAngle = Math.abs(turnAngle);
              // Calculate distance from vehicle to the turn waypoint
              distanceToTurn = this.distance(vehicle.x, vehicle.y, nextWp.x, nextWp.y);
            }
          }
        }

        // If currently turning, distance is 0
        if (currentTurnAngle === maxTurnAngle) {
          distanceToTurn = 0;
        }

        // Adaptive turn speed: sharper turns rotate faster
        const adaptiveTurnSpeed = TURN_SPEED * (1 + maxTurnAngle / Math.PI);
        vehicle.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), adaptiveTurnSpeed);

        // Check for vehicles ahead (other traffic and buses)
        let closestObstacleDistance = Infinity;

        // Check other traffic vehicles
        for (const other of state.traffic) {
          if (other.id === vehicle.id) continue;

          // Calculate distance
          const distToOther = this.distance(vehicle.x, vehicle.y, other.x, other.y);
          if (distToOther > DETECTION_DISTANCE) continue;

          // Check if vehicles are traveling in same direction (not opposite lanes)
          const angleDiff = Math.abs(vehicle.angle - other.angle);
          const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);

          // If traveling in opposite directions (angle diff ~180°), ignore
          if (normalizedAngleDiff > Math.PI / 2) continue;

          // Check if other vehicle is in front (in direction of travel)
          const toOtherX = other.x - vehicle.x;
          const toOtherY = other.y - vehicle.y;
          const dotProduct = (dx * toOtherX + dy * toOtherY) / (dist > 0 ? dist : 1);

          // If in front (dot product > 0.7 means roughly same direction)
          if (dotProduct > 0.7 * distToOther) {
            closestObstacleDistance = Math.min(closestObstacleDistance, distToOther);
          }
        }

        // Check buses
        for (const route of state.routes) {
          for (const bus of route.buses) {
            const distToBus = this.distance(vehicle.x, vehicle.y, bus.x, bus.y);
            if (distToBus > DETECTION_DISTANCE) continue;

            // Check if traveling in same direction as bus
            const angleDiff = Math.abs(vehicle.angle - bus.angle);
            const normalizedAngleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);

            // If traveling in opposite directions, ignore
            if (normalizedAngleDiff > Math.PI / 2) continue;

            const toBusX = bus.x - vehicle.x;
            const toBusY = bus.y - vehicle.y;
            const dotProduct = (dx * toBusX + dy * toBusY) / (dist > 0 ? dist : 1);

            if (dotProduct > 0.7 * distToBus) {
              closestObstacleDistance = Math.min(closestObstacleDistance, distToBus);
            }
          }
        }

        // Determine base speed with distance-aware turn penalty
        let baseTargetSpeed = TRAFFIC_SPEED;

        // Apply graduated speed reduction only when approaching or in a turn
        if (maxTurnAngle > TURN_THRESHOLD) {
          // Define braking zone (only slow down within this distance)
          const TURN_BRAKE_DISTANCE = GRID_SIZE * 2; // Start slowing 2 grid cells before turn

          // Calculate proximity factor (1.0 = at turn, 0.0 = far away)
          const proximityFactor = distanceToTurn <= TURN_BRAKE_DISTANCE
            ? 1.0 - (distanceToTurn / TURN_BRAKE_DISTANCE)
            : 0.0;

          if (proximityFactor > 0) {
            // Calculate turn severity (0 = gentle, 1 = sharp 90° turn)
            const turnSeverity = Math.min((maxTurnAngle - TURN_THRESHOLD) / (Math.PI / 2 - TURN_THRESHOLD), 1);

            // Graduated reduction: gentle turns = 90% speed, sharp turns = 35% speed
            const minTurnSpeed = TURN_SPEED_REDUCTION; // 0.35 minimum for very sharp turns
            const maxTurnSpeed = 0.90; // 0.90 for gentle turns (only 10% reduction)
            const turnSpeedMultiplier = maxTurnSpeed - (maxTurnSpeed - minTurnSpeed) * turnSeverity;

            // Blend between normal speed and turn speed based on proximity
            baseTargetSpeed = TRAFFIC_SPEED * (1.0 - proximityFactor + proximityFactor * turnSpeedMultiplier);
          }
        }

        // Adjust speed based on obstacles
        if (closestObstacleDistance < SAFE_DISTANCE) {
          // Too close - slow down or stop
          vehicle.currentSpeed = Math.max(MIN_SPEED, vehicle.currentSpeed - ACCELERATION);
        } else if (closestObstacleDistance < DETECTION_DISTANCE) {
          // Medium distance - maintain reduced speed
          const targetSpeed = baseTargetSpeed * (closestObstacleDistance / DETECTION_DISTANCE);
          if (vehicle.currentSpeed > targetSpeed) {
            vehicle.currentSpeed = Math.max(targetSpeed, vehicle.currentSpeed - ACCELERATION);
          } else {
            vehicle.currentSpeed = Math.min(targetSpeed, vehicle.currentSpeed + ACCELERATION);
          }
        } else {
          // Clear ahead - accelerate to target speed (normal or reduced for turns)
          if (vehicle.currentSpeed > baseTargetSpeed) {
            vehicle.currentSpeed = Math.max(baseTargetSpeed, vehicle.currentSpeed - ACCELERATION);
          } else {
            vehicle.currentSpeed = Math.min(baseTargetSpeed, vehicle.currentSpeed + ACCELERATION);
          }
        }

        // Check if close enough to current waypoint to advance
        const distToWaypoint = Math.sqrt(
          (waypointCenterX - vehicle.x) ** 2 + (waypointCenterY - vehicle.y) ** 2
        );

        if (distToWaypoint < WAYPOINT_REACHED_DIST) {
          // Close to waypoint - advance to next
          vehicle.pathIndex++;
        }

        // Move vehicle at current speed toward target
        vehicle.x += (dx / dist) * vehicle.currentSpeed;
        vehicle.y += (dy / dist) * vehicle.currentSpeed;
      }
    }
  }

  /**
   * Get clamped destination center coordinates
   */
  private getDestinationCenter(zone: Zone): { x: number; y: number } {
    // Canvas valid pixels: 0-1799
    // Margin accounts for destination marker (circle radius 3 + stroke 1 = 4px)
    const margin = 5; // Add 1px extra for safety
    const canvasMax = COLS * GRID_SIZE - 1 - margin;
    const canvasMin = margin;

    const centerX = (zone.x + zone.w / 2) * GRID_SIZE;
    const centerY = (zone.y + zone.h / 2) * GRID_SIZE;

    return {
      x: Math.max(canvasMin, Math.min(centerX, canvasMax)),
      y: Math.max(canvasMin, Math.min(centerY, canvasMax)),
    };
  }

  /**
   * Calculate distance between two points
   */
  private distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
