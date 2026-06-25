import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdminLike, AppRole } from "@/hooks/useAuth";
import type { AppModule } from "@/hooks/usePermissions";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Search, RotateCcw, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MODULES: { key: AppModule; label: string }[] = [
  { key: "visitors", label: "Members / Visitors" },
  { key: "programs", label: "Programs & Attendance" },
  { key: "statistics", label: "Statistics" },
  { key: "scanner", label: "QR Scanner" },
  { key: "library", label: "Library (books & loans)" },
];

const ROLES: { key: AppRole; label: string; systemFull?: boolean }[] = [
  { key: "admin", label: "Administrator", systemFull: true },
  { key: "american_center", label: "American Center", systemFull: true },
  { key: "american_corner_gitega", label: "American Corner Gitega" },
  { key: "coordinator", label: "Coordinator" },
  { key: "program_manager", label: "Program Manager" },
  { key: "public_relations", label: "Public Relations" },
];

const ACTIONS = ["can_view", "can_create", "can_update", "can_delete"] as const;
const ACTION_LABELS: Record<typeof ACTIONS[number], string> = {
  can_view: "View",
  can_create: "Create",
  can_update: "Update",
  can_delete: "Delete",
};

type PermRow = {
  module: AppModule;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
};

const emptyPerm = (module: AppModule): PermRow => ({
  module, can_view: false, can_create: false, can_update: false, can_delete: false,
});

export default function AccessControl() {
  const { role } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  if (!isAdminLike(role)) {
    return <div className="p-12 text-center text-muted-foreground">Access denied</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight">Access Control</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage CRUD permissions per role and per user. Admin & National Coordinator always have full access.
        </p>
      </div>

      <Tabs defaultValue="role">
        <TabsList>
          <TabsTrigger value="role">By Role</TabsTrigger>
          <TabsTrigger value="user">By User (override)</TabsTrigger>
        </TabsList>
        <TabsContent value="role" className="mt-6">
          <RolePermissionsPanel toast={toast} qc={qc} />
        </TabsContent>
        <TabsContent value="user" className="mt-6">
          <UserPermissionsPanel toast={toast} qc={qc} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- Role panel ----------
function RolePermissionsPanel({ toast, qc }: any) {
  const [selectedRole, setSelectedRole] = useState<AppRole>("coordinator");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("role_permissions").select("*");
      if (error) throw error;
      return data as any[];
    },
  });

  const [savingKey, setSavingKey] = useState<string | null>(null);

  const lookup = useMemo(() => {
    const m = new Map<string, PermRow>();
    rows.forEach((r: any) => m.set(`${r.role}:${r.module}`, r));
    return m;
  }, [rows]);

  const roleDef = ROLES.find(r => r.key === selectedRole)!;
  const locked = !!roleDef.systemFull;

  const persist = async (role: AppRole, module: AppModule, patch: Partial<PermRow>) => {
    const key = `${role}:${module}`;
    setSavingKey(key);
    const current = lookup.get(key) || emptyPerm(module);
    const next = { ...current, ...patch, role, module };
    const { error } = await (supabase as any)
      .from("role_permissions")
      .upsert(next, { onConflict: "role,module" });
    setSavingKey(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["role-permissions"] });
  };

  const applyAllToRole = async (value: boolean) => {
    for (const mod of MODULES) {
      await persist(selectedRole, mod.key, {
        can_view: value, can_create: value, can_update: value, can_delete: value,
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 max-w-sm">
            <label className="text-sm font-medium mb-1.5 block">Role</label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}{r.systemFull ? " (System — full access)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!locked ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => applyAllToRole(true)}>
                <CheckCheck className="h-3 w-3 mr-1" /> Grant all
              </Button>
              <Button variant="outline" size="sm" onClick={() => applyAllToRole(false)}>
                Revoke all
              </Button>
            </div>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />System role — always full access
            </Badge>
          )}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[260px]">Module</TableHead>
              {ACTIONS.map(a => <TableHead key={a} className="text-center w-[100px]">{ACTION_LABELS[a]}</TableHead>)}
              <TableHead className="text-right w-[140px]">Quick</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MODULES.map(mod => {
              const row = lookup.get(`${selectedRole}:${mod.key}`) || emptyPerm(mod.key);
              const key = `${selectedRole}:${mod.key}`;
              const saving = savingKey === key;
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">{mod.label}</TableCell>
                  {ACTIONS.map(a => (
                    <TableCell key={a} className="text-center">
                      <Checkbox
                        checked={locked ? true : Boolean((row as any)[a])}
                        disabled={locked || saving}
                        onCheckedChange={(v) => persist(selectedRole, mod.key, { [a]: Boolean(v) } as any)}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    {!locked && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => persist(selectedRole, mod.key, {
                          can_view: true, can_create: true, can_update: true, can_delete: true,
                        })}
                      >
                        <CheckCheck className="h-3 w-3 mr-1" /> Full
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ---------- User panel ----------
function UserPermissionsPanel({ toast, qc }: any) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: users = [] } = useQuery({
    queryKey: ["access-users"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      return (profiles || []).map((p: any) => ({
        ...p,
        role: (roles || []).find((r: any) => r.user_id === p.id)?.role,
      }));
    },
  });

  const filtered = users.filter((u: any) =>
    !search ||
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = users.find((u: any) => u.id === selectedUserId);

  const { data: rolePerms = [] } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("role_permissions").select("*");
      return data || [];
    },
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["user-permissions", selectedUserId],
    enabled: !!selectedUserId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("user_permissions").select("*").eq("user_id", selectedUserId);
      return data || [];
    },
  });

  const adminLike = selectedUser && (selectedUser.role === "admin" || selectedUser.role === "american_center");

  const resolve = (module: AppModule): { row: PermRow; isOverride: boolean } => {
    const override = overrides.find((o: any) => o.module === module);
    if (override) return { row: override, isOverride: true };
    const fromRole = rolePerms.find((r: any) => r.role === selectedUser?.role && r.module === module);
    return { row: fromRole || emptyPerm(module), isOverride: false };
  };

  const setOverride = async (module: AppModule, patch: Partial<PermRow>) => {
    const current = resolve(module).row;
    const next = { ...current, ...patch, user_id: selectedUserId, module };
    delete (next as any).id;
    delete (next as any).created_at;
    delete (next as any).updated_at;
    const { error } = await (supabase as any)
      .from("user_permissions")
      .upsert(next, { onConflict: "user_id,module" });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["user-permissions", selectedUserId] });
  };

  const clearOverride = async (module: AppModule) => {
    const { error } = await (supabase as any)
      .from("user_permissions").delete().eq("user_id", selectedUserId).eq("module", module);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["user-permissions", selectedUserId] });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <Card className="p-4">
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-8" />
        </div>
        <div className="space-y-1 max-h-[520px] overflow-y-auto">
          {filtered.map((u: any) => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                selectedUserId === u.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              <div className="font-medium truncate">{u.full_name || u.email}</div>
              <div className="text-xs text-muted-foreground truncate">{u.role || "no role"}</div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground p-3">No users.</p>}
        </div>
      </Card>

      <Card className="p-6">
        {!selectedUser ? (
          <div className="text-center text-muted-foreground py-12">Select a user to manage their permissions.</div>
        ) : adminLike ? (
          <div className="text-center py-8">
            <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="font-serif text-xl">{selectedUser.full_name || selectedUser.email}</h3>
            <p className="text-muted-foreground mt-2">This user is {selectedUser.role.replace("_", " ")} and always has full access.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="font-serif text-xl">{selectedUser.full_name || selectedUser.email}</h3>
              <p className="text-sm text-muted-foreground">Role: {selectedUser.role || "—"} · Overrides take precedence over role defaults.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  {ACTIONS.map(a => <TableHead key={a} className="text-center w-[90px]">{ACTION_LABELS[a]}</TableHead>)}
                  <TableHead className="text-right">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map(mod => {
                  const { row, isOverride } = resolve(mod.key);
                  return (
                    <TableRow key={mod.key}>
                      <TableCell className="font-medium">{mod.label}</TableCell>
                      {ACTIONS.map(a => (
                        <TableCell key={a} className="text-center">
                          <Checkbox
                            checked={Boolean((row as any)[a])}
                            onCheckedChange={(v) => setOverride(mod.key, { [a]: Boolean(v) } as any)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        {isOverride ? (
                          <Button size="sm" variant="ghost" onClick={() => clearOverride(mod.key)}>
                            <RotateCcw className="h-3 w-3 mr-1" /> Use role default
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs">role default</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </Card>
    </div>
  );
}
