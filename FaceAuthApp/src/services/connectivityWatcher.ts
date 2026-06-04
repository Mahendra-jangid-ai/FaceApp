import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncToServer } from './syncService';

type ConnectivityCallback = (isConnected: boolean) => void;

let unsubscribe: (() => void) | null = null;
let wasOffline = true;
const listeners: ConnectivityCallback[] = [];
let autoSyncEnabled = true;
let syncInProgress = false;

export function startWatching(): void {
  if (unsubscribe) return;

  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isConnected = state.isConnected === true;

    // Notify listeners
    for (const cb of listeners) {
      try { cb(isConnected); } catch {}
    }

    // Auto-sync when transitioning from offline to online
    if (isConnected && wasOffline && autoSyncEnabled) {
      triggerAutoSync();
    }

    wasOffline = !isConnected;
  });
}

export function stopWatching(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export function addConnectivityListener(cb: ConnectivityCallback): () => void {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function setAutoSync(enabled: boolean): void {
  autoSyncEnabled = enabled;
}

async function triggerAutoSync(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;
  try {
    await syncToServer();
  } catch {}
  syncInProgress = false;
}

export async function getConnectionInfo(): Promise<{
  isConnected: boolean;
  type: string;
  isWifi: boolean;
}> {
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected === true,
    type: state.type,
    isWifi: state.type === 'wifi',
  };
}
