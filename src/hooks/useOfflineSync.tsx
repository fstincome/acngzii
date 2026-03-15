import { useState, useEffect, useCallback } from "react";
import { getSyncQueueCount } from "@/lib/offline-db";
import { syncToServer, isOnline, type SyncResult } from "@/lib/sync-manager";
import { cacheData } from "@/lib/offline-db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOfflineSync() {
  const [online, setOnline] = useState(isOnline());
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Poll pending count
  useEffect(() => {
    const update = async () => {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cache data from server when online
  const cacheAllData = useCallback(async () => {
    if (!isOnline()) return;
    try {
      const tables = [
        { name: "visitors" as const, query: supabase.from("visitors").select("*") },
        { name: "visits" as const, query: supabase.from("visits").select("*") },
        { name: "programs" as const, query: supabase.from("programs").select("*") },
        { name: "program_participants" as const, query: supabase.from("program_participants").select("*") },
        { name: "program_sessions" as const, query: supabase.from("program_sessions").select("*") },
        { name: "program_attendance" as const, query: supabase.from("program_attendance").select("*") },
      ];
      for (const t of tables) {
        const { data } = await t.query;
        if (data) await cacheData(t.name, data);
      }
    } catch {
      // Silent fail
    }
  }, []);

  // Cache on mount and periodically
  useEffect(() => {
    cacheAllData();
    const interval = setInterval(cacheAllData, 60000); // Every minute
    return () => clearInterval(interval);
  }, [cacheAllData]);

  const handleSync = useCallback(async () => {
    if (!isOnline()) {
      toast.error("Pas de connexion internet");
      return;
    }
    setSyncing(true);
    try {
      const result: SyncResult = await syncToServer();
      if (result.failed === 0) {
        toast.success(`✅ Synchronisation réussie ! ${result.success} opération(s) synchronisée(s).`);
      } else {
        toast.warning(`⚠️ ${result.success} réussie(s), ${result.failed} échouée(s).`);
        result.errors.forEach(e => console.error("Sync error:", e));
      }
      // Refresh cache after sync
      await cacheAllData();
      const count = await getSyncQueueCount();
      setPendingCount(count);
    } catch (err: any) {
      toast.error("Erreur de synchronisation: " + err.message);
    }
    setSyncing(false);
  }, [cacheAllData]);

  return { online, pendingCount, syncing, handleSync };
}
