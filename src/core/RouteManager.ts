import type { GameState } from '../types/game';
import type { Route, Stop, Bus } from '../types/entities';
import {
  GRID_SIZE,
  BUS_SPEED,
  TRAFFIC_BASE_SPEED_MULTIPLIER,
  CONGESTION_DETECTION_RADIUS,
  CONGESTION_SLOWDOWN_PER_VEHICLE,
  MAX_CONGESTION_SLOWDOWN
} from '../config/constants';
import { PathfindingManager } from '../pathfinding/PathfindingManager';
import { SpatialIndex } from '../spatial/SpatialIndex';

const MAX_TRANSFERS = 5; // Increased to allow more complex routes
const BUS_CAPACITY = 10;
const STOP_DURATION = 1500; // 1.5 seconds in milliseconds (reduced from 3s)

/**
 * RouteManager - Manages bus movement and passenger boarding/dropoff
 */
export class RouteManager {
  private pathfindingManager: PathfindingManager;
  private spatialIndex: SpatialIndex;

  constructor(pathfindingManager: PathfindingManager, spatialIndex: SpatialIndex) {
    this.pathfindingManager = pathfindingManager;
    this.spatialIndex = spatialIndex;
  }

  /**
   * Calculate global traffic density speed multiplier
   */
  private getTrafficDensityMultiplier(trafficDensity: number): number {
    if (trafficDensity < 0.3) {
      return TRAFFIC_BASE_SPEED_MULTIPLIER.LOW;
    } else if (trafficDensity < 0.6) {
      return TRAFFIC_BASE_SPEED_MULTIPLIER.MEDIUM;
    } else {
      return TRAFFIC_BASE_SPEED_MULTIPLIER.HIGH;
    }
  }

  /**
   * Calculate local congestion slowdown based on nearby traffic
   */
  private getLocalCongestionMultiplier(bus: Bus, state: GameState): number {
    let nearbyTrafficCount = 0;

    // Count traffic vehicles within detection radius
    state.traffic.forEach(vehicle => {
      const distance = Math.sqrt(
        (vehicle.x - bus.x) ** 2 + (vehicle.y - bus.y) ** 2
      );
      if (distance < CONGESTION_DETECTION_RADIUS) {
        nearbyTrafficCount++;
      }
    });

    // Calculate slowdown (more traffic = slower)
    const congestionSlowdown = Math.min(
      nearbyTrafficCount * CONGESTION_SLOWDOWN_PER_VEHICLE,
      MAX_CONGESTION_SLOWDOWN
    );

    return 1.0 - congestionSlowdown;
  }

  /**
   * Update all buses
   */
  updateBuses(state: GameState, deltaTime: number): void {
    state.routes.forEach((route) => {
      route.buses.forEach((bus) => {
        if (route.stops.length > 0) {
          // If bus is stopped at a stop, wait for stop duration
          if (bus.stoppedAtStop) {
            bus.stopTimer += deltaTime;

            // Continue aligning angle while stopped
            const currentStop = route.stops[bus.currentStopIndex];

            // Calculate desired angle based on next stop direction
            const nextStopIndex = (bus.currentStopIndex + 1) % route.stops.length;
            const nextStop = route.stops[nextStopIndex];
            const desiredAngle = Math.atan2(
              (nextStop.y - currentStop.y) * GRID_SIZE,
              (nextStop.x - currentStop.x) * GRID_SIZE
            );

            // Smooth rotation toward desired angle
            let angleDiff = desiredAngle - bus.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            const TURN_SPEED = 0.08;
            if (Math.abs(angleDiff) > 0.01) {
              bus.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), TURN_SPEED);
            }

            // After stop duration, handle boarding/exiting and move to next stop
            if (bus.stopTimer >= STOP_DURATION) {
              this.handleBusAtStop(route, bus, state);

              // Reset stop state
              bus.stoppedAtStop = false;
              bus.stopTimer = 0;

              // Move to next stop
              bus.currentStopIndex = (bus.currentStopIndex + 1) % route.stops.length;
            }
            return; // Don't move while stopped
          }

          // If no path or path completed, get path to next stop
          if (bus.path.length === 0 || bus.pathIndex >= bus.path.length) {
            const currentStop = route.stops[bus.currentStopIndex];
            const targetX = currentStop.x * GRID_SIZE;
            const targetY = currentStop.y * GRID_SIZE;

            bus.path = this.pathfindingManager.findPath(bus.x, bus.y, targetX, targetY);
            bus.pathIndex = 0;
          }

          // Follow current path with collision avoidance
          if (bus.path.length > 0 && bus.pathIndex < bus.path.length) {
            const waypoint = bus.path[bus.pathIndex];

            // Add lane offset (keep-right) like traffic vehicles
            const LANE_OFFSET = GRID_SIZE * 0.3;
            const TURN_SPEED = 0.08;
            const WAYPOINT_REACHED_DIST = GRID_SIZE * 0.6;

            // Center waypoint on road cell
            const waypointCenterX = waypoint.x + GRID_SIZE / 2;
            const waypointCenterY = waypoint.y + GRID_SIZE / 2;

            // Calculate lane offset based on path direction
            let laneOffsetX = 0;
            let laneOffsetY = 0;

            // Look ahead in path for stable direction
            const lookAheadSteps = Math.min(3, bus.path.length - bus.pathIndex - 1);
            if (lookAheadSteps > 0) {
              const lookAheadWaypoint = bus.path[bus.pathIndex + lookAheadSteps];
              const pathDx = lookAheadWaypoint.x - waypoint.x;
              const pathDy = lookAheadWaypoint.y - waypoint.y;
              const pathAngle = Math.atan2(pathDy, pathDx);

              // Offset perpendicular to path direction (90° clockwise for right-side)
              const perpAngle = pathAngle + Math.PI / 2;
              laneOffsetX = Math.cos(perpAngle) * LANE_OFFSET;
              laneOffsetY = Math.sin(perpAngle) * LANE_OFFSET;
            }

            // Apply lane offset to waypoint
            const targetX = waypointCenterX + laneOffsetX;
            const targetY = waypointCenterY + laneOffsetY;

            const dx = targetX - bus.x;
            const dy = targetY - bus.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Smoothly rotate bus toward movement direction
            const targetAngle = Math.atan2(dy, dx);
            let angleDiff = targetAngle - bus.angle;

            // Normalize angle difference to [-π, π]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Interpolate angle smoothly
            bus.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), TURN_SPEED);

            // Collision avoidance
            const DETECTION_DISTANCE = GRID_SIZE * 2.5;
            const SAFE_DISTANCE = GRID_SIZE * 1.2;
            const ACCELERATION = 0.3;
            const MIN_SPEED = 0.5;
            let closestObstacleDistance = Infinity;

            // Check other buses
            state.routes.forEach((otherRoute) => {
              otherRoute.buses.forEach((otherBus) => {
                if (otherBus === bus) return;

                const distToOther = Math.sqrt(
                  (otherBus.x - bus.x) ** 2 + (otherBus.y - bus.y) ** 2
                );
                if (distToOther > DETECTION_DISTANCE) return;

                const toOtherX = otherBus.x - bus.x;
                const toOtherY = otherBus.y - bus.y;
                const dotProduct = (dx * toOtherX + dy * toOtherY) / (dist > 0 ? dist : 1);

                if (dotProduct > 0.7 * distToOther) {
                  closestObstacleDistance = Math.min(closestObstacleDistance, distToOther);
                }
              });
            });

            // Check traffic vehicles
            state.traffic.forEach((vehicle) => {
              const distToVehicle = Math.sqrt(
                (vehicle.x - bus.x) ** 2 + (vehicle.y - bus.y) ** 2
              );
              if (distToVehicle > DETECTION_DISTANCE) return;

              const toVehicleX = vehicle.x - bus.x;
              const toVehicleY = vehicle.y - bus.y;
              const dotProduct = (dx * toVehicleX + dy * toVehicleY) / (dist > 0 ? dist : 1);

              if (dotProduct > 0.7 * distToVehicle) {
                closestObstacleDistance = Math.min(closestObstacleDistance, distToVehicle);
              }
            });

            // Calculate distance to final stop for smooth deceleration
            const currentStop = route.stops[bus.currentStopIndex];
            const stopX = currentStop.x * GRID_SIZE + GRID_SIZE / 2;
            const stopY = currentStop.y * GRID_SIZE + GRID_SIZE / 2;
            const distToStop = Math.sqrt(
              (stopX - bus.x) ** 2 + (stopY - bus.y) ** 2
            );

            // Approaching stop - gradual slowdown zone
            const STOP_APPROACH_DISTANCE = GRID_SIZE * 3; // Start slowing 3 grid cells before stop
            const STOP_SPEED = 0.8; // Very slow speed when at stop

            // Calculate effective bus speed with traffic effects
            const trafficDensityMultiplier = this.getTrafficDensityMultiplier(state.trafficDensity);
            const localCongestionMultiplier = this.getLocalCongestionMultiplier(bus, state);
            const effectiveBusSpeed = BUS_SPEED * trafficDensityMultiplier * localCongestionMultiplier;

            // Determine target speed based on obstacles and stop proximity
            let targetSpeed = effectiveBusSpeed;

            // Priority 1: Collision avoidance
            if (closestObstacleDistance < SAFE_DISTANCE) {
              targetSpeed = MIN_SPEED;
            } else if (closestObstacleDistance < DETECTION_DISTANCE) {
              targetSpeed = effectiveBusSpeed * (closestObstacleDistance / DETECTION_DISTANCE);
            }

            // Priority 2: Slow down when approaching stop
            if (distToStop < STOP_APPROACH_DISTANCE) {
              const stopProximity = distToStop / STOP_APPROACH_DISTANCE;
              const stopTargetSpeed = STOP_SPEED + (effectiveBusSpeed - STOP_SPEED) * stopProximity;
              targetSpeed = Math.min(targetSpeed, stopTargetSpeed);
            }

            // Smooth speed adjustment
            if (bus.currentSpeed > targetSpeed) {
              bus.currentSpeed = Math.max(targetSpeed, bus.currentSpeed - ACCELERATION);
            } else {
              bus.currentSpeed = Math.min(targetSpeed, bus.currentSpeed + ACCELERATION);
            }

            // Check if close enough to waypoint to advance
            const distToWaypoint = Math.sqrt(
              (waypointCenterX - bus.x) ** 2 + (waypointCenterY - bus.y) ** 2
            );

            if (distToWaypoint < WAYPOINT_REACHED_DIST) {
              // Close to waypoint - advance to next
              bus.pathIndex++;

              // If reached final waypoint (the stop)
              if (bus.pathIndex >= bus.path.length) {
                // Mark as stopped at current position (no position snap)
                bus.stoppedAtStop = true;
                bus.stopTimer = 0;
              }
            } else {
              // Move at current speed toward target
              bus.x += (dx / dist) * bus.currentSpeed;
              bus.y += (dy / dist) * bus.currentSpeed;
            }
          }
        }
      });
    });
  }

  /**
   * Handle bus at stop - passenger boarding and dropoff
   */
  private handleBusAtStop(route: Route, bus: Bus, state: GameState): void {
    const currentStop = route.stops[bus.currentStopIndex];

    // Sample bus utilization (10 passenger capacity)
    state.stats.totalBusUtilization += bus.passengers.length / BUS_CAPACITY;
    state.stats.busUtilizationSamples++;

    // Drop off passengers whose destination is this stop
    for (let i = bus.passengers.length - 1; i >= 0; i--) {
      const passenger = bus.passengers[i];

      // Use the stored destination stop (set when passenger boarded)
      let destStop = passenger.destinationStop || null;
      if (!destStop) {
        const destCenter = this.getDestinationCenter(passenger.destinationZone);
        const foundStop = this.spatialIndex.findNearestStop(destCenter.x, destCenter.y);
        if (foundStop) {
          passenger.destinationStop = foundStop;
          destStop = foundStop;
        }
      }

      // Compare by coordinates, not object reference
      if (destStop && destStop.x === currentStop.x && destStop.y === currentStop.y) {
        bus.passengers.splice(i, 1);

        // Check if this is the final destination or an intermediate stop
        if (!passenger.finalDestinationStop) {
          console.error('⚠ BUG: NPC has no finalDestinationStop!', {
            currentStop: { x: currentStop.x, y: currentStop.y },
            destinationZone: passenger.destinationZone,
            hasPlannedRoute: !!passenger.plannedRoute,
          });
          // Fallback: recalculate final destination
          const destCenter = this.getDestinationCenter(passenger.destinationZone);
          const recalculated = this.spatialIndex.findNearestStop(destCenter.x, destCenter.y);
          if (recalculated) {
            passenger.finalDestinationStop = recalculated;
          } else {
            // No stop available - can't continue
            console.error('⚠ No stop available for destination zone');
            continue;
          }
        }

        // Double-check we have a final destination
        if (!passenger.finalDestinationStop) {
          console.error('⚠ Still no finalDestinationStop after fallback');
          continue;
        }

        const finalDestStop = passenger.finalDestinationStop;
        const isFinalDestination =
          finalDestStop.x === currentStop.x && finalDestStop.y === currentStop.y;

        if (isFinalDestination) {
          // Verify we're actually close to the destination zone
          const destCenter = this.getDestinationCenter(passenger.destinationZone);
          const distToZone = this.distance(
            currentStop.x * GRID_SIZE,
            currentStop.y * GRID_SIZE,
            destCenter.x,
            destCenter.y
          );
          const maxAcceptableDistance = 8 * GRID_SIZE; // 8 grid cells

          if (distToZone > maxAcceptableDistance) {
            console.error('⚠ BUG: NPC marked as arrived but far from destination!', {
              currentStop: { x: currentStop.x, y: currentStop.y },
              destinationZoneCenter: { x: destCenter.x / GRID_SIZE, y: destCenter.y / GRID_SIZE },
              distanceGridCells: (distToZone / GRID_SIZE).toFixed(1),
              transferCount: passenger.transferCount,
            });
            // Don't mark as arrived - treat as transfer instead
            passenger.state = 'waiting';
            passenger.x = currentStop.x * GRID_SIZE;
            passenger.y = currentStop.y * GRID_SIZE;
            passenger.nearestStop = currentStop;
            passenger.atStop = true;
            passenger.transferCount = (passenger.transferCount || 0) + 1;
            passenger.plannedRoute = undefined; // Clear bad plan, will replan
          } else {
            // Legitimately arrived
            passenger.state = 'arrived';
            state.stats.tripsCompleted++;
            state.stats.totalWaitTime += passenger.waitTime;
            // Track transport time
            if (passenger.transportStartTime) {
              const transportTime = (state.time - passenger.transportStartTime) / 1000; // Convert to seconds
              state.stats.totalTransportTime += transportTime;
            }
            // Add trip income based on ticket price
            state.economics.money += state.economics.ticketPrice;
            state.economics.totalIncome += state.economics.ticketPrice;
            console.log('✓ NPC arrived at final destination', {
              stop: { x: currentStop.x, y: currentStop.y },
              totalWaitTime: passenger.waitTime.toFixed(1) + 's',
              distToZone: (distToZone / GRID_SIZE).toFixed(1) + ' cells',
            });
          }
        } else {
          // Intermediate stop - go back to waiting for next connection
          passenger.state = 'waiting';
          passenger.x = currentStop.x * GRID_SIZE;
          passenger.y = currentStop.y * GRID_SIZE;
          passenger.nearestStop = currentStop;
          passenger.atStop = true;
          passenger.transferCount = (passenger.transferCount || 0) + 1;

          // Advance plan if using planned route
          if (passenger.plannedRoute) {
            passenger.plannedRoute.currentStopIndex++;
            console.log('→ NPC transferring (planned route)', {
              currentStop: { x: currentStop.x, y: currentStop.y },
              finalDest: { x: finalDestStop.x, y: finalDestStop.y },
              transferNumber: passenger.transferCount,
              progressInPlan: `${passenger.plannedRoute.currentStopIndex}/${passenger.plannedRoute.stops.length}`,
              waitTimeSoFar: passenger.waitTime.toFixed(1) + 's',
            });
          } else {
            console.log('→ NPC transferring at intermediate stop', {
              currentStop: { x: currentStop.x, y: currentStop.y },
              finalDest: { x: finalDestStop.x, y: finalDestStop.y },
              transferNumber: passenger.transferCount,
              waitTimeSoFar: passenger.waitTime.toFixed(1) + 's',
            });
          }
        }
      }
    }

    // Pick up waiting NPCs at this stop
    state.npcs.forEach((npc) => {
      if (
        npc.state === 'waiting' &&
        npc.atStop &&
        npc.nearestStop &&
        npc.nearestStop.x === currentStop.x &&
        npc.nearestStop.y === currentStop.y &&
        bus.passengers.length < BUS_CAPACITY
      ) {
        // Check if NPC has made too many transfers
        if ((npc.transferCount || 0) >= MAX_TRANSFERS) {
          if (npc.waitTime > 10 && !npc.maxTransfersWarned) {
            npc.maxTransfersWarned = true;
            console.warn(
              `⚠ NPC reached ${MAX_TRANSFERS} transfer limit - destination unreachable`,
              {
                currentStop: { x: npc.nearestStop.x, y: npc.nearestStop.y },
                transferCount: npc.transferCount,
                waitTime: npc.waitTime.toFixed(1) + 's',
              }
            );
          }
          return; // Don't allow more boarding
        }

        // NEW INTELLIGENT BOARDING: Use planned route if available
        if (npc.plannedRoute && npc.finalDestinationStop) {
          const plan = npc.plannedRoute;
          const currentPlanStop = plan.stops[plan.currentStopIndex];

          // Verify we're at the correct stop in the plan
          if (
            currentPlanStop.x !== currentStop.x ||
            currentPlanStop.y !== currentStop.y
          ) {
            // NPC is not at the expected stop in their plan - replan or use fallback
            console.warn('⚠ NPC not at expected stop in plan', {
              expected: { x: currentPlanStop.x, y: currentPlanStop.y },
              actual: { x: currentStop.x, y: currentStop.y },
            });
            return;
          }

          // Check if this is the route we need to take
          const routeIndexInState = state.routes.indexOf(route);
          const neededRouteIndex = plan.routes[plan.currentStopIndex];

          if (routeIndexInState === neededRouteIndex) {
            // This is the correct bus! Board it
            const nextStopIndex = plan.currentStopIndex + 1;
            if (nextStopIndex < plan.stops.length) {
              const nextStop = plan.stops[nextStopIndex];
              npc.destinationStop = nextStop;
              npc.finalDestinationStop = plan.stops[plan.stops.length - 1];
              bus.passengers.push(npc);
              npc.state = 'traveling';
              npc.atStop = false;
              // Track when NPC first boards a bus (only set once per trip)
              if (!npc.transportStartTime) {
                npc.transportStartTime = state.time;
              }

              const isFinalStop = nextStopIndex === plan.stops.length - 1;
              console.log(
                `→ NPC boarding (planned route, ${isFinalStop ? 'FINAL' : 'TRANSFER'})`,
                {
                  from: { x: currentStop.x, y: currentStop.y },
                  to: { x: nextStop.x, y: nextStop.y },
                  routeIndex: routeIndexInState,
                  progressInPlan: `${plan.currentStopIndex + 1}/${plan.stops.length}`,
                  transfersSoFar: npc.transferCount || 0,
                }
              );
            }
          } else {
            // Wrong bus - wait for the correct one
            // (Don't log to avoid spam)
          }
        } else {
          // FALLBACK: Old greedy logic for NPCs without planned routes
          const destCenter = this.getDestinationCenter(npc.destinationZone);
          const finalDestStop = this.spatialIndex.findNearestStop(destCenter.x, destCenter.y);

          if (!finalDestStop) return;

          // CRITICAL: Validate destination stop is actually close to destination zone
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
              '⚠ NPC (fallback) destination zone not covered (unreachable)',
              {
                nearestStop: { x: finalDestStop.x, y: finalDestStop.y },
                distanceGridCells: (distToZone / GRID_SIZE).toFixed(1),
              }
            );
            return; // Don't board - destination unreachable
          }

          const currentDist = this.distance(
            currentStop.x * GRID_SIZE,
            currentStop.y * GRID_SIZE,
            finalDestStop.x * GRID_SIZE,
            finalDestStop.y * GRID_SIZE
          );

          const routeHasDestination = route.stops.some(
            (stop) => stop.x === finalDestStop.x && stop.y === finalDestStop.y
          );

          if (
            routeHasDestination &&
            !(finalDestStop.x === currentStop.x && finalDestStop.y === currentStop.y)
          ) {
            npc.destinationStop = finalDestStop;
            npc.finalDestinationStop = finalDestStop;
            bus.passengers.push(npc);
            npc.state = 'traveling';
            npc.atStop = false;
            // Track when NPC first boards a bus (only set once per trip)
            if (!npc.transportStartTime) {
              npc.transportStartTime = state.time;
            }
            console.log('→ NPC boarding (FALLBACK: DIRECT to final destination)', {
              from: { x: currentStop.x, y: currentStop.y },
              to: { x: finalDestStop.x, y: finalDestStop.y },
              transfersSoFar: npc.transferCount || 0,
            });
          } else {
            let closestStop: Stop | null = null;
            let closestDist = currentDist;

            route.stops.forEach((stop) => {
              if (stop.x === currentStop.x && stop.y === currentStop.y) return;

              const distToFinal = this.distance(
                stop.x * GRID_SIZE,
                stop.y * GRID_SIZE,
                finalDestStop.x * GRID_SIZE,
                finalDestStop.y * GRID_SIZE
              );

              if (distToFinal < closestDist) {
                closestDist = distToFinal;
                closestStop = stop;
              }
            });

            if (closestStop) {
              const transferStop: Stop = closestStop;
              npc.destinationStop = transferStop;
              npc.finalDestinationStop = finalDestStop;
              bus.passengers.push(npc);
              npc.state = 'traveling';
              npc.atStop = false;
              // Track when NPC first boards a bus (only set once per trip)
              if (!npc.transportStartTime) {
                npc.transportStartTime = state.time;
              }
              console.log('→ NPC boarding (FALLBACK: TRANSFER needed)', {
                from: { x: currentStop.x, y: currentStop.y },
                transferAt: { x: transferStop.x, y: transferStop.y },
                finalDest: { x: finalDestStop.x, y: finalDestStop.y },
                transfersSoFar: npc.transferCount || 0,
              });
            }
          }
        }
      }
    });
  }

  /**
   * Get clamped destination center coordinates
   */
  private getDestinationCenter(zone: { x: number; y: number; w: number; h: number }): {
    x: number;
    y: number;
  } {
    const margin = 5;
    const canvasMax = GRID_SIZE * 60 - 1 - margin;
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
