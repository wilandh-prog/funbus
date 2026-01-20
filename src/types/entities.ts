import type { Zone } from './city';

// Re-export Zone for convenience
export type { Zone };

export interface Waypoint {
  x: number;
  y: number;
}

export interface Stop {
  x: number;
  y: number;
}

export interface Bus {
  x: number;
  y: number;
  currentStopIndex: number;
  passengers: NPC[];
  path: Waypoint[];
  pathIndex: number;
  angle: number;
  stoppedAtStop: boolean;
  stopTimer: number;
  currentSpeed: number;
}

export interface Route {
  stops: Stop[];
  buses: Bus[];
  color: string;
}

export type NPCState = 'walking' | 'waiting' | 'traveling' | 'arrived';

export interface NPC {
  readonly id: string;
  readonly name: string;
  x: number;
  y: number;
  state: NPCState;
  waitTime: number;
  transportStartTime?: number; // When NPC first boarded a bus (for tracking transport time)
  nearestStop: Stop | null;
  atStop: boolean;
  originZone: Zone;
  destinationZone: Zone;
  destinationStop?: Stop;
  finalDestinationStop?: Stop;
  transferCount: number;
  maxTransfersWarned?: boolean;
  // Walking to stop
  walkingPath?: Waypoint[];
  walkingPathIndex?: number;
  // Trip planning
  plannedRoute?: {
    stops: Stop[]; // Sequence of stops to visit
    routes: number[]; // Which route index to take at each stop
    currentStopIndex: number; // Current position in planned route
  };
}

export interface VehicleType {
  sprite: string;
  length: number;
  width: number;
}

export interface TrafficVehicle {
  readonly id: string;
  x: number;
  y: number;
  destinationX: number;
  destinationY: number;
  path: Waypoint[];
  pathIndex: number;
  type: VehicleType;
  angle: number;
  currentSpeed: number;
}
