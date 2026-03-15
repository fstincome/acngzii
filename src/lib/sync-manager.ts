import { supabase } from "@/integrations/supabase/client";
import { getSyncQueue, removeSyncQueueItem, type SyncQueueItem } from "./offline-db";

export interface SyncResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export async function syncToServer(): Promise<SyncResult> {
  const queue = await getSyncQueue();
  const result: SyncResult = { total: queue.length, success: 0, failed: 0, errors: [] };

  if (queue.length === 0) return result;

  for (const item of queue) {
    try {
      await processSyncItem(item);
      await removeSyncQueueItem(item.id);
      result.success++;
    } catch (err: any) {
      result.failed++;
      result.errors.push(`${item.table}/${item.action}: ${err.message}`);
    }
  }

  return result;
}

async function processSyncItem(item: SyncQueueItem) {
  const { table, action, data } = item;
  const validTables = ["visitors", "visits", "programs", "program_participants", "program_sessions", "program_attendance"];
  
  if (!validTables.includes(table)) {
    throw new Error(`Table non supportée: ${table}`);
  }

  switch (action) {
    case "insert": {
      const { error } = await supabase.from(table as any).insert(data);
      if (error) throw error;
      break;
    }
    case "update": {
      const { id, ...updates } = data;
      const { error } = await supabase.from(table as any).update(updates).eq("id", id);
      if (error) throw error;
      break;
    }
    case "delete": {
      const { error } = await supabase.from(table as any).delete().eq("id", data.id);
      if (error) throw error;
      break;
    }
  }
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}
