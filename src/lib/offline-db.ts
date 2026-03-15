import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// ---- Schema ----

export interface SyncQueueItem {
  id: string;
  table: string;
  action: "insert" | "update" | "delete";
  data: Record<string, any>;
  created_at: string;
}

interface GSSOfflineDB extends DBSchema {
  visitors: {
    key: string;
    value: Record<string, any>;
    indexes: { "by-visitor-id": string };
  };
  visits: {
    key: string;
    value: Record<string, any>;
    indexes: { "by-visitor-id": string };
  };
  program_participants: {
    key: string;
    value: Record<string, any>;
    indexes: { "by-program-id": string };
  };
  program_attendance: {
    key: string;
    value: Record<string, any>;
    indexes: { "by-session-id": string };
  };
  programs: {
    key: string;
    value: Record<string, any>;
  };
  program_sessions: {
    key: string;
    value: Record<string, any>;
    indexes: { "by-program-id": string };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: { "by-created": string };
  };
}

let dbInstance: IDBPDatabase<GSSOfflineDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<GSSOfflineDB>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<GSSOfflineDB>("gss-offline", 1, {
    upgrade(db) {
      // Visitors
      const visitors = db.createObjectStore("visitors", { keyPath: "id" });
      visitors.createIndex("by-visitor-id", "visitor_id");

      // Visits
      const visits = db.createObjectStore("visits", { keyPath: "id" });
      visits.createIndex("by-visitor-id", "visitor_id");

      // Programs
      db.createObjectStore("programs", { keyPath: "id" });

      // Program participants
      const pp = db.createObjectStore("program_participants", { keyPath: "id" });
      pp.createIndex("by-program-id", "program_id");

      // Program sessions
      const ps = db.createObjectStore("program_sessions", { keyPath: "id" });
      ps.createIndex("by-program-id", "program_id");

      // Program attendance
      const pa = db.createObjectStore("program_attendance", { keyPath: "id" });
      pa.createIndex("by-session-id", "session_id");

      // Sync queue
      const sq = db.createObjectStore("sync_queue", { keyPath: "id" });
      sq.createIndex("by-created", "created_at");
    },
  });
  return dbInstance;
}

// ---- Cache operations ----

export async function cacheData(table: keyof Omit<GSSOfflineDB, "sync_queue">, data: Record<string, any>[]) {
  const db = await getDB();
  const tx = db.transaction(table, "readwrite");
  // Clear existing and re-populate
  await tx.store.clear();
  for (const item of data) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function getCachedData(table: keyof Omit<GSSOfflineDB, "sync_queue">): Promise<Record<string, any>[]> {
  const db = await getDB();
  return db.getAll(table);
}

// ---- Sync Queue operations ----

export async function addToSyncQueue(item: Omit<SyncQueueItem, "id" | "created_at">) {
  const db = await getDB();
  const entry: SyncQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  await db.put("sync_queue", entry);
  // Also update local cache
  const storeName = item.table as keyof Omit<GSSOfflineDB, "sync_queue">;
  if (item.action === "insert" || item.action === "update") {
    const localDb = await getDB();
    await localDb.put(storeName, item.data);
  } else if (item.action === "delete" && item.data.id) {
    const localDb = await getDB();
    await localDb.delete(storeName, item.data.id);
  }
  return entry;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("sync_queue", "by-created");
}

export async function clearSyncQueue() {
  const db = await getDB();
  await db.clear("sync_queue");
}

export async function removeSyncQueueItem(id: string) {
  const db = await getDB();
  await db.delete("sync_queue", id);
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count("sync_queue");
}
