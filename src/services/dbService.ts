import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type Collection = 'checks' | 'clients' | 'transfers' | 'cash_incomes' | 'settings';

export const COLLECTIONS: Collection[] = ['checks', 'clients', 'transfers', 'cash_incomes', 'settings'];

export interface Doc {
  id: string;
  createdAt?: string;
}

export type CollectionsData = Record<Collection, Doc[]>;

// Lo que la nube tiene actualmente: id -> JSON estable del registro
export type RemoteSnapshot = Record<Collection, Map<string, string>>;

export type RemoteChange =
  | { type: 'upsert'; collection: Collection; id: string; data: Doc }
  | { type: 'delete'; collection: Collection; id: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isDbConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isDbConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null;

const TABLE = 'records';
const PAGE_SIZE = 1000;
const WRITE_CHUNK = 500;

const DEVICE_LINKED_KEY = 'chequespro_v3_cloud_linked';

// Indica si este navegador ya fue sincronizado alguna vez con la nube
export const isDeviceLinked = (): boolean => {
  try {
    return localStorage.getItem(DEVICE_LINKED_KEY) === '1';
  } catch {
    return false;
  }
};

export const markDeviceLinked = (linked: boolean) => {
  try {
    if (linked) localStorage.setItem(DEVICE_LINKED_KEY, '1');
    else localStorage.removeItem(DEVICE_LINKED_KEY);
  } catch {
    // ignore
  }
};

/**
 * JSON con llaves ordenadas, para comparar registros sin importar el orden
 * en que Postgres (jsonb) devuelve las propiedades.
 */
export const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${entries.join(',')}}`;
};

export const emptyCollections = (): CollectionsData => ({
  checks: [],
  clients: [],
  transfers: [],
  cash_incomes: [],
  settings: [],
});

export const emptySnapshot = (): RemoteSnapshot => ({
  checks: new Map(),
  clients: new Map(),
  transfers: new Map(),
  cash_incomes: new Map(),
  settings: new Map(),
});

const chunk = <T,>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

const requireClient = (): SupabaseClient => {
  if (!supabase) throw new Error('Base de datos no configurada (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  return supabase;
};

/**
 * Descarga todos los registros de la nube, agrupados por colección
 * (más recientes primero, igual que el orden local).
 */
export const fetchAllRecords = async (): Promise<CollectionsData> => {
  const db = requireClient();
  const result = emptyCollections();

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from(TABLE)
      .select('collection,id,data')
      .order('collection')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const collection = row.collection as Collection;
      if (result[collection]) result[collection].push(row.data as Doc);
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  for (const c of COLLECTIONS) {
    result[c].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }
  return result;
};

/**
 * Envía a la nube solo lo que cambió respecto al snapshot (altas, ediciones y bajas).
 * El snapshot se actualiza únicamente cuando la escritura fue exitosa.
 */
export const pushCollectionChanges = async (
  collection: Collection,
  docs: Doc[],
  snapshot: Map<string, string>
): Promise<number> => {
  const db = requireClient();

  const upserts: { doc: Doc; json: string }[] = [];
  const currentIds = new Set<string>();
  for (const doc of docs) {
    currentIds.add(doc.id);
    const json = stableStringify(doc);
    if (snapshot.get(doc.id) !== json) upserts.push({ doc, json });
  }
  const deletes = [...snapshot.keys()].filter((id) => !currentIds.has(id));

  for (const part of chunk(upserts, WRITE_CHUNK)) {
    const rows = part.map(({ doc, json }) => ({ collection, id: doc.id, data: JSON.parse(json) }));
    const { error } = await db.from(TABLE).upsert(rows, { onConflict: 'collection,id' });
    if (error) throw error;
    part.forEach(({ doc, json }) => snapshot.set(doc.id, json));
  }

  for (const part of chunk(deletes, WRITE_CHUNK)) {
    const { error } = await db.from(TABLE).delete().eq('collection', collection).in('id', part);
    if (error) throw error;
    part.forEach((id) => snapshot.delete(id));
  }

  return upserts.length + deletes.length;
};

/**
 * Escucha en tiempo real los cambios hechos desde cualquier dispositivo.
 */
export const subscribeToRecords = (
  onChange: (change: RemoteChange) => void,
  onStatus: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void
): (() => void) => {
  const db = requireClient();
  const channel = db
    .channel('records-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
      if (payload.eventType === 'DELETE') {
        const old = payload.old as { collection?: Collection; id?: string };
        if (old.collection && old.id) onChange({ type: 'delete', collection: old.collection, id: old.id });
      } else {
        const row = payload.new as { collection: Collection; id: string; data: Doc };
        onChange({ type: 'upsert', collection: row.collection, id: row.id, data: row.data });
      }
    })
    .subscribe((status) => onStatus(status));

  return () => {
    db.removeChannel(channel);
  };
};

export const signInWithPassword = async (email: string, password: string) => {
  const { error } = await requireClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const signOut = async () => {
  await requireClient().auth.signOut();
};
