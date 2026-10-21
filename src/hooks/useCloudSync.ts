import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COLLECTIONS,
  Collection,
  CollectionsData,
  RemoteChange,
  RemoteSnapshot,
  emptySnapshot,
  fetchAllRecords,
  isDbConfigured,
  isDeviceLinked,
  markDeviceLinked,
  pushCollectionChanges,
  stableStringify,
  subscribeToRecords,
} from '../services/dbService';

export type SyncStatus = 'disabled' | 'connecting' | 'synced' | 'saving' | 'offline' | 'error';

interface CloudSyncOptions {
  data: CollectionsData;
  // Reemplaza todo el estado local con lo descargado de la nube
  onRemoteLoad: (data: CollectionsData) => void;
  // Aplica un cambio individual hecho desde otro dispositivo
  onRemoteChange: (change: RemoteChange) => void;
  // Primera vez que este navegador se conecta y tiene registros que la nube no tiene
  confirmUploadLocal: (count: number) => boolean;
}

const SAVE_DEBOUNCE_MS = 400;
const RETRY_MS = 5000;

const buildSnapshot = (data: CollectionsData): RemoteSnapshot => {
  const snap = emptySnapshot();
  for (const c of COLLECTIONS) {
    data[c].forEach((doc) => snap[c].set(doc.id, stableStringify(doc)));
  }
  return snap;
};

/**
 * Mantiene el estado de la app sincronizado con la base de datos:
 * - Al iniciar descarga todo desde la nube.
 * - Cada cambio local se envía (solo los registros modificados).
 * - Los cambios de otros dispositivos llegan en tiempo real.
 */
export const useCloudSync = ({ data, onRemoteLoad, onRemoteChange, confirmUploadLocal }: CloudSyncOptions) => {
  const [status, setStatus] = useState<SyncStatus>(isDbConfigured ? 'connecting' : 'disabled');
  const [hydrated, setHydrated] = useState(false);

  const dataRef = useRef(data);
  dataRef.current = data;

  const callbacksRef = useRef({ onRemoteLoad, onRemoteChange, confirmUploadLocal });
  callbacksRef.current = { onRemoteLoad, onRemoteChange, confirmUploadLocal };

  const snapshotRef = useRef<RemoteSnapshot>(emptySnapshot());
  const readyRef = useRef(false);
  const flushingRef = useRef<Promise<void> | null>(null);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedChangesRef = useRef<RemoteChange[]>([]);

  // ¿Hay diferencias entre el estado local y lo que tiene la nube?
  const isCollectionDirty = (c: Collection): boolean => {
    const snap = snapshotRef.current[c];
    const docs = dataRef.current[c];
    return snap.size !== docs.length || docs.some((doc) => snap.get(doc.id) !== stableStringify(doc));
  };

  const flush = useCallback(async (): Promise<void> => {
    if (!isDbConfigured || !readyRef.current) return;
    if (flushingRef.current) {
      dirtyRef.current = true;
      return flushingRef.current;
    }

    const run = (async () => {
      try {
        let wrote = 0;
        for (const c of COLLECTIONS) {
          if (!isCollectionDirty(c)) continue;
          setStatus('saving');
          wrote += await pushCollectionChanges(c, dataRef.current[c], snapshotRef.current[c]);
        }
        setStatus('synced');
        if (wrote > 0) markDeviceLinked(true);
      } catch (err) {
        console.error('[ChequesPro] Error guardando en la base de datos', err);
        setStatus(navigator.onLine ? 'error' : 'offline');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void flush(), RETRY_MS);
      }
    })();

    flushingRef.current = run;
    await run;
    flushingRef.current = null;
    if (dirtyRef.current) {
      dirtyRef.current = false;
      await flush();
    }
  }, []);

  const applyRemoteChange = useCallback((change: RemoteChange) => {
    const snap = snapshotRef.current[change.collection];
    if (!snap) return;
    if (change.type === 'delete') snap.delete(change.id);
    else snap.set(change.id, stableStringify(change.data));
    callbacksRef.current.onRemoteChange(change);
  }, []);

  // Vuelve a descargar todo (al recuperar conexión o al volver a la pestaña)
  const resync = useCallback(async () => {
    if (!readyRef.current) return;
    try {
      await flush();
      const remote = await fetchAllRecords();
      snapshotRef.current = buildSnapshot(remote);
      callbacksRef.current.onRemoteLoad(remote);
      setStatus('synced');
    } catch (err) {
      console.error('[ChequesPro] Error resincronizando', err);
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }, [flush]);

  // Carga inicial + suscripción en tiempo real
  useEffect(() => {
    if (!isDbConfigured) return;
    let cancelled = false;
    let wasSubscribed = false;

    const unsubscribe = subscribeToRecords(
      (change) => {
        if (readyRef.current) applyRemoteChange(change);
        else queuedChangesRef.current.push(change);
      },
      (channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          if (wasSubscribed) void resync();
          wasSubscribed = true;
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setStatus('offline');
        }
      }
    );

    const load = async () => {
      try {
        const remote = await fetchAllRecords();
        if (cancelled) return;

        const merged: CollectionsData = { ...remote };
        if (!isDeviceLinked()) {
          // Registros que solo existen en este navegador (datos previos a la base de datos)
          const local = dataRef.current;
          let localOnlyCount = 0;
          const localOnly = {} as CollectionsData;
          for (const c of COLLECTIONS) {
            const remoteIds = new Set(remote[c].map((d) => d.id));
            localOnly[c] = local[c].filter((d) => !remoteIds.has(d.id));
            if (c !== 'settings') localOnlyCount += localOnly[c].length;
          }
          const remoteIsEmpty = COLLECTIONS.every((c) => c === 'settings' || remote[c].length === 0);
          const upload =
            localOnlyCount === 0 || remoteIsEmpty || callbacksRef.current.confirmUploadLocal(localOnlyCount);
          if (upload) {
            for (const c of COLLECTIONS) {
              if (c === 'settings' && remote.settings.length > 0) continue;
              merged[c] = [...localOnly[c], ...remote[c]];
            }
          }
        }

        snapshotRef.current = buildSnapshot(remote);
        callbacksRef.current.onRemoteLoad(merged);
        markDeviceLinked(true);
        setHydrated(true);
      } catch (err) {
        console.error('[ChequesPro] Error cargando la base de datos', err);
        if (cancelled) return;
        setStatus(navigator.onLine ? 'error' : 'offline');
        timerRef.current = setTimeout(() => void load(), RETRY_MS);
      }
    };
    void load();

    return () => {
      cancelled = true;
      readyRef.current = false;
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [applyRemoteChange, resync]);

  // Se activa después del render que ya contiene los datos de la nube,
  // así nunca se sube el estado local viejo encima de lo descargado.
  useEffect(() => {
    if (!hydrated) return;
    readyRef.current = true;
    const queued = queuedChangesRef.current;
    queuedChangesRef.current = [];
    queued.forEach(applyRemoteChange);
    void flush();
  }, [hydrated, applyRemoteChange, flush]);

  // Guardar cambios locales (con pequeño retardo para agrupar ediciones rápidas)
  useEffect(() => {
    if (!readyRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
  }, [data.checks, data.clients, data.transfers, data.cash_incomes, data.settings, flush]);

  // Resincronizar al volver a la pestaña o al recuperar internet
  useEffect(() => {
    if (!isDbConfigured) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void resync();
    };
    const onOnline = () => void resync();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [resync]);

  const hasPendingChanges = useCallback(() => COLLECTIONS.some(isCollectionDirty), []);

  // Avisar si se cierra la pestaña con cambios que aún no llegaron a la nube
  useEffect(() => {
    if (!isDbConfigured) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (readyRef.current && hasPendingChanges()) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasPendingChanges]);

  return { status, hydrated, flush, hasPendingChanges };
};
