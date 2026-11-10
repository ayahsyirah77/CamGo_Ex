/**
 * Live Telemetry Anomaly Detector
 * 
 * Monitors real-time coordinate streams to identify safety issues or operational delays.
 */
export class TelemetryMonitor {
  private userStates: Map<string, any[]> = new Map();

  /**
   * Processes a single telemetry packet from a user device.
   * Packet: { userId, lat, lng, speed, timestamp }
   */
  async processPacket(packet: any) {
    const history = this.userStates.get(packet.userId) || [];
    history.push(packet);
    
    // Keep last 10 points for window analysis
    if (history.length > 10) history.shift();
    this.userStates.set(packet.userId, history);

    return this.detectAnomalies(packet.userId, history);
  }

  /**
   * Core Anomaly Detection Logic
   */
  private detectAnomalies(userId: string, history: any[]) {
    if (history.length < 2) return null;

    const latest = history[history.length - 1];
    const latestTime = latest.timestamp ? new Date(latest.timestamp).getTime() : Date.now();

    // Find continuous stationary period from the end where speed <= 1
    let stationaryStartTime = latestTime;
    for (let i = history.length - 1; i >= 0; i--) {
      const p = history[i];
      const pSpeed = p.speed !== null && p.speed !== undefined ? p.speed : 0;
      if (pSpeed <= 1) {
        stationaryStartTime = p.timestamp ? new Date(p.timestamp).getTime() : latestTime;
      } else {
        break;
      }
    }

    const stationaryDurationMs = latestTime - stationaryStartTime;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    // Only trigger alert if user has been stationary for more than 5 minutes (300,000 ms)
    if (stationaryDurationMs >= FIVE_MINUTES_MS && !this.isNearPOI(latest.lat, latest.lng)) {
      return { type: "UNEXPECTED_STOP", userId, severity: "high", message: "User stationary for > 5 mins in transit." };
    }

    // 2. Off-Route Deviation (Operational Alert)
    // Requires cross-referencing against the planned polyline
    
    return null;
  }

  private isNearPOI(lat: number, lng: number): boolean {
    // Spatial index check
    return false;
  }
}
