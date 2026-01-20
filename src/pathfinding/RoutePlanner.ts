import type { Route, Stop } from '../types/entities';

/**
 * Transfer plan for an NPC trip
 */
export interface TransferPlan {
  stops: Stop[]; // Sequence of stops to visit
  routes: number[]; // Which route index to take at each stop
  totalTransfers: number; // Number of transfers needed
}

/**
 * RoutePlanner - Finds optimal multi-route paths using BFS across bus network
 */
export class RoutePlanner {
  /**
   * Plan a trip from origin stop to destination stop using available routes
   * Uses BFS to find path with minimum transfers
   */
  planTrip(
    originStop: Stop,
    destinationStop: Stop,
    allRoutes: Route[]
  ): TransferPlan | null {
    // Check if origin equals destination
    if (originStop.x === destinationStop.x && originStop.y === destinationStop.y) {
      return {
        stops: [originStop],
        routes: [],
        totalTransfers: 0,
      };
    }

    // Build adjacency graph: stop -> list of (nextStop, routeIndex) pairs
    const graph = this.buildStopGraph(allRoutes);

    // BFS to find shortest path
    const queue: Array<{
      stop: Stop;
      path: Stop[];
      routePath: number[];
    }> = [];

    const visited = new Set<string>();
    const startKey = `${originStop.x},${originStop.y}`;

    queue.push({
      stop: originStop,
      path: [originStop],
      routePath: [],
    });
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentKey = `${current.stop.x},${current.stop.y}`;

      // Check if reached destination
      if (
        current.stop.x === destinationStop.x &&
        current.stop.y === destinationStop.y
      ) {
        return {
          stops: current.path,
          routes: current.routePath,
          totalTransfers: current.routePath.length - 1, // Number of route changes
        };
      }

      // Explore all connected stops
      const connections = graph.get(currentKey) || [];
      for (const { nextStop, routeIndex } of connections) {
        const nextKey = `${nextStop.x},${nextStop.y}`;

        if (!visited.has(nextKey)) {
          visited.add(nextKey);
          queue.push({
            stop: nextStop,
            path: [...current.path, nextStop],
            routePath: [...current.routePath, routeIndex],
          });
        }
      }
    }

    // No path found
    return null;
  }

  /**
   * Build graph of stop connections
   * Returns: Map<stopKey, Array<{nextStop, routeIndex}>>
   */
  private buildStopGraph(
    allRoutes: Route[]
  ): Map<string, Array<{ nextStop: Stop; routeIndex: number }>> {
    const graph = new Map<string, Array<{ nextStop: Stop; routeIndex: number }>>();

    allRoutes.forEach((route, routeIndex) => {
      // For each stop on this route, it connects to all other stops on the same route
      route.stops.forEach((stop, i) => {
        const stopKey = `${stop.x},${stop.y}`;
        const connections = graph.get(stopKey) || [];

        // Add connections to all other stops on this route
        route.stops.forEach((otherStop, j) => {
          if (i !== j) {
            // Avoid duplicate connections
            const alreadyConnected = connections.some(
              (c) =>
                c.nextStop.x === otherStop.x &&
                c.nextStop.y === otherStop.y &&
                c.routeIndex === routeIndex
            );

            if (!alreadyConnected) {
              connections.push({
                nextStop: otherStop,
                routeIndex: routeIndex,
              });
            }
          }
        });

        graph.set(stopKey, connections);
      });
    });

    return graph;
  }

  /**
   * Get the next stop in a planned route
   */
  getNextStop(plan: TransferPlan, currentStopIndex: number): Stop | null {
    if (currentStopIndex + 1 < plan.stops.length) {
      return plan.stops[currentStopIndex + 1];
    }
    return null;
  }

  /**
   * Get the route to take at current stop
   */
  getRouteAtStop(plan: TransferPlan, currentStopIndex: number): number | null {
    if (currentStopIndex < plan.routes.length) {
      return plan.routes[currentStopIndex];
    }
    return null;
  }
}
