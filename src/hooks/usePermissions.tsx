import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdminLike } from "@/hooks/useAuth";

export type AppModule = "visitors" | "programs" | "statistics" | "scanner" | "library";
export type PermissionAction = "view" | "create" | "update" | "delete";

export interface PermissionRow {
  module: AppModule;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

const ACTION_COL: Record<PermissionAction, keyof PermissionRow> = {
  view: "can_view",
  create: "can_create",
  update: "can_update",
  delete: "can_delete",
};

export function usePermissions() {
  const { user, role } = useAuth();
  const adminLike = isAdminLike(role);

  const { data, isLoading } = useQuery({
    queryKey: ["my-permissions", user?.id, role],
    enabled: !!user && !!role && !adminLike,
    queryFn: async () => {
      const [rolePerms, userPerms] = await Promise.all([
        (supabase as any).from("role_permissions").select("*").eq("role", role),
        (supabase as any).from("user_permissions").select("*").eq("user_id", user!.id),
      ]);

      const byModule = new Map<AppModule, PermissionRow>();
      (rolePerms.data || []).forEach((r: any) => byModule.set(r.module, r));
      (userPerms.data || []).forEach((r: any) => byModule.set(r.module, r)); // overrides
      return byModule;
    },
  });

  const can = (module: AppModule, action: PermissionAction): boolean => {
    if (adminLike) return true;
    if (!data) return false;
    const row = data.get(module);
    if (!row) return false;
    return Boolean(row[ACTION_COL[action]]);
  };

  return { can, isLoading, adminLike };
}
