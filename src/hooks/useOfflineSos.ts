import { useState, useEffect, useCallback } from 'react';
import {
  OfflineSosPacket,
  SyncedSosSummary,
  SosDispatchInput,
  SosDispatchOutcome,
  SOS_BROADCAST_CHANNEL,
  SOS_QUEUE_EVENT,
  SOS_SYNCED_EVENT,
  getPendingSosPackets,
  getLastSyncedSosSummary,
  saveLastSyncedSosSummary,
  flushOfflineSosQueue,
  sendOrQueueEmergencySos,
  triggerServiceWorkerSosSync,
} from '../services/offlineSosQueue';

export function useOfflineSos() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedPackets, setQueuedPackets] = useState<OfflineSosPacket[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedSummary, setLastSyncedSummary] = useState<SyncedSosSummary | null>(() =>
    getLastSyncedSosSummary()
  );

  const refreshQueue = useCallback(async () => {
    const pending = await getPendingSosPackets();
    setQueuedPackets(pending);
    return pending;
  }, []);

  const retrySyncNow = useCallback(
    async (force = true) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      setIsSyncing(true);
      try {
        // Trigger both SW sync (if active) and direct client fallback flush so it works across all browsers
        await triggerServiceWorkerSosSync();
        await flushOfflineSosQueue(force);
        await refreshQueue();
      } finally {
        setIsSyncing(false);
      }
    },
    [refreshQueue]
  );

  const dispatchSos = useCallback(
    async (input: SosDispatchInput): Promise<SosDispatchOutcome> => {
      const result = await sendOrQueueEmergencySos(input);
      await refreshQueue();
      return result;
    },
    [refreshQueue]
  );

  const dismissSyncedConfirmation = useCallback(() => {
    setLastSyncedSummary(null);
    saveLastSyncedSosSummary(null);
  }, []);

  useEffect(() => {
    refreshQueue();

    const handleOnline = () => {
      setIsOnline(true);
      // Immediately attempt background/fallback flush when connection returns
      retrySyncNow(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueEvent = (e: Event) => {
      const custom = e as CustomEvent<OfflineSosPacket[]>;
      if (Array.isArray(custom.detail)) {
        setQueuedPackets(custom.detail);
      } else {
        refreshQueue();
      }
    };

    const handleSyncedEvent = (e: Event) => {
      const custom = e as CustomEvent<SyncedSosSummary>;
      if (custom.detail) {
        setLastSyncedSummary(custom.detail);
      }
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(SOS_QUEUE_EVENT, handleQueueEvent);
    window.addEventListener(SOS_SYNCED_EVENT, handleSyncedEvent);

    // Listen to Service Worker BroadcastChannel notifications from background sync-sos
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel(SOS_BROADCAST_CHANNEL);
        bc.onmessage = (event) => {
          const msg = event.data;
          if (!msg) return;
          if (msg.type === 'SOS_SYNCED' && msg.packet) {
            const summary: SyncedSosSummary = {
              id: msg.packet.id,
              sosType: msg.packet.sosType || 'critical',
              timestamp: msg.packet.timestamp,
              syncedAt: msg.packet.syncedAt || new Date().toISOString(),
              lat: msg.packet.lat,
              lng: msg.packet.lng,
            };
            saveLastSyncedSosSummary(summary);
            setLastSyncedSummary(summary);
            refreshQueue();
          } else if (msg.type === 'SOS_SYNC_RETRY') {
            refreshQueue();
          }
        };
      } catch {
        bc = null;
      }
    }

    // Listen to Service Worker client.postMessage as secondary channel
    const handleSwMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'SOS_SYNCED' && msg.packet) {
        const summary: SyncedSosSummary = {
          id: msg.packet.id,
          sosType: msg.packet.sosType || 'critical',
          timestamp: msg.packet.timestamp,
          syncedAt: msg.packet.syncedAt || new Date().toISOString(),
          lat: msg.packet.lat,
          lng: msg.packet.lng,
        };
        saveLastSyncedSosSummary(summary);
        setLastSyncedSummary(summary);
        refreshQueue();
      } else if (msg.type === 'SOS_SYNC_RETRY') {
        refreshQueue();
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(SOS_QUEUE_EVENT, handleQueueEvent);
      window.removeEventListener(SOS_SYNCED_EVENT, handleSyncedEvent);
      if (bc) bc.close();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [refreshQueue, retrySyncNow]);

  // Scheduled fallback retry timer when queued packets exist & online (e.g. server hiccup or iOS Safari)
  useEffect(() => {
    if (!isOnline || queuedPackets.length === 0) return;

    const earliestRetryAt = queuedPackets.reduce(
      (min, p) => Math.min(min, p.nextRetryAt || Date.now()),
      Infinity
    );
    const delayMs = Math.max(1500, earliestRetryAt - Date.now());

    const timer = setTimeout(() => {
      retrySyncNow(false);
    }, Math.min(delayMs, 60000));

    return () => clearTimeout(timer);
  }, [isOnline, queuedPackets, retrySyncNow]);

  return {
    isOnline,
    queuedPackets,
    queuedCount: queuedPackets.length,
    isSyncing,
    lastSyncedSummary,
    dispatchSos,
    retrySyncNow,
    dismissSyncedConfirmation,
    refreshQueue,
  };
}
