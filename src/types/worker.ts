import type { Waypoint } from './entities';
import type { ZoneType } from './city';

export interface PathfindingRequest {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  cityGrid: ZoneType[][];
}

export interface PathfindingResponse {
  id: string;
  path: Waypoint[];
  success: boolean;
}

export type WorkerMessage =
  | { type: 'PATHFIND_REQUEST'; payload: PathfindingRequest }
  | { type: 'PATHFIND_RESPONSE'; payload: PathfindingResponse };
