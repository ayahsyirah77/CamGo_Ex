import {
  computePredictiveRouteTravelTime,
  fetchTomTomPredictiveRoute,
  getTomTomApiKey,
} from '../../services/tomtomTrafficService';

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      sinLon *
      sinLon;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Predictive Routing & Multi-Stop Sequence Optimizer
 *
 * Combines TomTom predictive routing (`computeTravelTimeFor=all`, `departAt`)
 * with Cameron Highlands time-of-day / day-of-week historical speed fallbacks.
 */
export class RouteOptimizer {
  /**
   * Predictive ETA Calculation (returns estimated seconds)
   * Uses TomTom predictive routing when configured, gracefully falling back
   * to highland spatial-temporal historical speed profiles when probes are sparse.
   */
  async getPredictiveETA(
    origin: [number, number],
    destination: [number, number],
    options: {
      baseDurationSecs?: number;
      coordinates?: [number, number][];
      departAt?: Date;
    } = {}
  ): Promise<number> {
    const departAt = options.departAt || new Date();
    const coords =
      options.coordinates && options.coordinates.length > 0
        ? options.coordinates
        : [origin, destination];

    const fallbackBaseSecs =
      options.baseDurationSecs && options.baseDurationSecs > 0
        ? options.baseDurationSecs
        : Math.max(180, Math.round((haversineKm(origin, destination) / 36) * 3600));

    // If caller supplied route geometry/base duration, compute fast deterministic adjustment
    if (options.baseDurationSecs && options.coordinates) {
      const prediction = computePredictiveRouteTravelTime(
        coords,
        options.baseDurationSecs,
        departAt
      );
      return prediction.adjustedDurationSecs;
    }

    // Otherwise check TomTom predictive routing API if key is configured
    const apiKey = getTomTomApiKey();
    if (apiKey) {
      const predictiveRoute = await fetchTomTomPredictiveRoute(
        { lat: origin[0], lng: origin[1], name: 'Origin' },
        { lat: destination[0], lng: destination[1], name: 'Destination' },
        apiKey,
        { departAt }
      );
      if (predictiveRoute) {
        return Math.max(60, predictiveRoute.aiAdjustedMins * 60);
      }
    }

    const fallbackPrediction = computePredictiveRouteTravelTime(
      coords,
      fallbackBaseSecs,
      departAt
    );
    return fallbackPrediction.adjustedDurationSecs;
  }

  /**
   * Multi-Stop Optimization (Nearest Neighbor VRP heuristic using real geo-distance)
   */
  optimizeSequence<T extends { lat: number; lng: number }>(waypoints: T[]): T[] {
    if (waypoints.length <= 2) return waypoints;

    const optimized: T[] = [waypoints[0]];
    const unvisited = waypoints.slice(1);

    while (unvisited.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearestIdx = 0;
      let minDist = haversineKm([current.lat, current.lng], [unvisited[0].lat, unvisited[0].lng]);

      for (let i = 1; i < unvisited.length; i++) {
        const dist = haversineKm([current.lat, current.lng], [unvisited[i].lat, unvisited[i].lng]);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }

      const [next] = unvisited.splice(nearestIdx, 1);
      optimized.push(next);
    }

    return optimized;
  }
}
