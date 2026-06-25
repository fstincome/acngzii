import { useState } from "react";
import { useAuth, isAdminLike, AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Shield, Trash2, Loader2, Pencil, KeyRound, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  american_center: "American Center",
  american_corner_gitega: "American Corner Gitega",
  coordinator: "Coordinator",
  program_manager: "Program Manager",
  public_relations: "Public Relations",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "destructive",
  american_center: "destructive",
  american_corner_gitega: "default",
  coordinator: "default",
  program_manager: "secondary",
  public_relations: "secondary",
};

const DEPARTMENTS = [
  "Administration",
  "Reception",
  "Education / Programs",
  "Library",
  "IT / Computer Lab",
  "Operations",
  "Communications",
  "Other",
];

interface StaffForm {
  full_name: string;
  email: string;
  password: string;
  role: AppRole;
  phone: string;
  national_id: string;
  job_title: string;
  department: string;
  hire_date: string;
  address: string;
  emergency_contact: string;
  photo: string;
}

const emptyForm = (): StaffForm => ({
  full_name: "",
  email: "",
  password: "",
  role: "program_manager",
  phone: "",
  national_id: "",
  job_title: "",
  department: "",
  hire_date: "",
  address: "",
  emergency_contact: "",
  photo: "",
});

function useUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
      if (pErr) throw pErr;
      const { data: roles, error: rErr } = await supabase.from("user_roles").select("*");
      if (rErr) throw rErr;
      return (profiles || []).map((p: any) => ({
        ...p,
        role: (roles || []).find((r: any) => r.user_id === p.id)?.role as AppRole | undefined,
      }));
    },
  });
}

export default function UserManagement() {
  const { role: currentRole, user: currentUser } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<StaffForm>(emptyForm());
  const [createForm, setCreateForm] = useState<StaffForm>(emptyForm());
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState<any>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
    let pwd = "";
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return pwd;
  };

  if (!isAdminLike(currentRole)) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  const setCreate = <K extends keyof StaffForm>(key: K, value: StaffForm[K]) =>
    setCreateForm((f) => ({ ...f, [key]: value }));
  const setEdit = <K extends keyof StaffForm>(key: K, value: StaffForm[K]) =>
    setEditForm((f) => ({ ...f, [key]: value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        email: createForm.email.trim(),
        password: createForm.password,
        full_name: createForm.full_name.trim(),
        role: createForm.role,
        phone: createForm.phone.trim(),
        national_id: createForm.national_id.trim(),
        job_title: createForm.job_title.trim(),
        department: createForm.department,
        hire_date: createForm.hire_date || null,
        address: createForm.address.trim(),
        emergency_contact: createForm.emergency_contact.trim(),
        photo: createForm.photo.trim(),
      };
      const res = await supabase.functions.invoke("create-user", { body: payload });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: "User created",
        description: `${payload.full_name} added as ${ROLE_LABELS[payload.role as AppRole]}`,
      });
      setCreateOpen(false);
      setCreateForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleEdit = (user: any) => {
    setEditUser(user);
    setEditForm({
      full_name: user.full_name || "",
      email: user.email || "",
      password: "",
      role: (user.role as AppRole) || "program_manager",
      phone: user.phone || "",
      national_id: user.national_id || "",
      job_title: user.job_title || "",
      department: user.department || "",
      hire_date: user.hire_date || "",
      address: user.address || "",
      emergency_contact: user.emergency_contact || "",
      photo: user.photo || "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setUpdating(true);
    try {
      const res = await supabase.functions.invoke("update-user-role", {
        body: {
          user_id: editUser.id,
          full_name: editForm.full_name.trim(),
          role: editForm.role,
          phone: editForm.phone.trim(),
          national_id: editForm.national_id.trim(),
          job_title: editForm.job_title.trim(),
          department: editForm.department,
          hire_date: editForm.hire_date || null,
          address: editForm.address.trim(),
          emergency_contact: editForm.emergency_contact.trim(),
          photo: editForm.photo.trim(),
        },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "User updated", description: `${editForm.full_name} is now ${ROLE_LABELS[editForm.role]}` });
      setEditOpen(false);
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setUpdating(false);
  };

  const handleOpenReset = (user: any) => {
    setResetUser(user);
    setResetPassword(generatePassword());
    setResetOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !resetPassword) return;
    setResetting(true);
    try {
      const res = await supabase.functions.invoke("reset-password", {
        body: { user_id: resetUser.id, new_password: resetPassword },
      });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      setGeneratedCredentials({ email: resetUser.email, password: resetPassword });
      toast({ title: "Password reset", description: `New password generated for ${resetUser.full_name}` });
      setResetOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setResetting(false);
  };

  const copyCredentials = () => {
    if (!generatedCredentials) return;
    navigator.clipboard.writeText(`Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`);
    toast({ title: "Copied!", description: "Credentials copied to clipboard" });
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Delete user ${userName}?`)) return;
    try {
      const res = await supabase.functions.invoke("delete-user", { body: { user_id: userId } });
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "User deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const renderStaffFields = (
    values: StaffForm,
    onChange: <K extends keyof StaffForm>(k: K, v: StaffForm[K]) => void,
    isEdit: boolean,
  ) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-2 sm:col-span-2">
        <Label>Full name *</Label>
        <Input value={values.full_name} onChange={(e) => onChange("full_name", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Email *</Label>
        <Input type="email" value={values.email} onChange={(e) => onChange("email", e.target.value)} required disabled={isEdit} className={isEdit ? "opacity-60" : ""} />
      </div>
      <div className="space-y-2">
        <Label>Phone *</Label>
        <Input value={values.phone} onChange={(e) => onChange("phone", e.target.value)} placeholder="+257 …" required />
      </div>
      {!isEdit && (
        <div className="space-y-2 sm:col-span-2">
          <Label>Password *</Label>
          <div className="flex gap-2">
            <Input type="text" value={values.password} onChange={(e) => onChange("password", e.target.value)} required minLength={6} />
            <Button type="button" variant="outline" size="sm" onClick={() => onChange("password", generatePassword())} className="shrink-0">
              Generate
            </Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label>Role *</Label>
        <Select value={values.role} onValueChange={(v) => onChange("role", v as AppRole)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrator</SelectItem>
            <SelectItem value="american_center">American Center</SelectItem>
            <SelectItem value="american_corner_gitega">American Corner Gitega</SelectItem>
            <SelectItem value="coordinator">Coordinator</SelectItem>
            <SelectItem value="program_manager">Program Manager</SelectItem>
            <SelectItem value="public_relations">Public Relations</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Job title *</Label>
        <Input value={values.job_title} onChange={(e) => onChange("job_title", e.target.value)} placeholder="e.g. Program Coordinator" required />
      </div>
      <div className="space-y-2">
        <Label>Department *</Label>
        <Select value={values.department} onValueChange={(v) => onChange("department", v)}>
          <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Hire date *</Label>
        <Input type="date" value={values.hire_date} onChange={(e) => onChange("hire_date", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>National ID *</Label>
        <Input value={values.national_id} onChange={(e) => onChange("national_id", e.target.value)} required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Address *</Label>
        <Input value={values.address} onChange={(e) => onChange("address", e.target.value)} placeholder="Street, city, country" required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Emergency contact *</Label>
        <Input value={values.emergency_contact} onChange={(e) => onChange("emergency_contact", e.target.value)} placeholder="Name + phone" required />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Photo (optional, max 2MB)</Label>
        <div className="flex items-center gap-3">
          {values.photo && (
            <img
              src={values.photo}
              alt="Staff photo preview"
              className="h-16 w-16 rounded-lg object-cover border border-border"
            />
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                toast({
                  title: "File too large",
                  description: "Photo must be 2MB or less.",
                  variant: "destructive",
                });
                e.target.value = "";
                return;
              }
              const reader = new FileReader();
              reader.onload = () => onChange("photo", String(reader.result || ""));
              reader.readAsDataURL(file);
            }}
          />
          {values.photo && (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange("photo", "")}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2.5">
          <div className="icon-box h-9 w-9">
            <Shield className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          User Management
        </h1>
        <p className="page-subtitle">Create and manage staff accounts and their roles</p>
      </div>

      <div className="mb-6">
        <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setCreateForm(emptyForm()); }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              New staff member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create a staff account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <StaffFields values={createForm} onChange={setCreate} isEdit={false} />
              <Button type="submit" className="w-full" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit staff member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <StaffFields values={editForm} onChange={setEdit} isEdit={true} />
            <Button type="submit" className="w-full" disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {u.role ? (
                      <Badge variant={ROLE_COLORS[u.role as AppRole] as any}>
                        {ROLE_LABELS[u.role as AppRole]}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No role</Badge>
                    )}
                  </TableCell>
                  <TableCell>{u.job_title || "—"}</TableCell>
                  <TableCell>{u.department || "—"}</TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(u)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenReset(u)} title="Reset password">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(u.id, u.full_name)}
                        disabled={u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? "You cannot delete yourself" : "Delete"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={resetOpen} onOpenChange={(v) => { if (!v) { setResetOpen(false); setResetUser(null); setResetPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Input value={resetUser?.full_name || ""} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
              <div className="flex gap-2">
                <Input type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} required minLength={6} />
                <Button type="button" variant="outline" size="sm" onClick={() => setResetPassword(generatePassword())} className="shrink-0">
                  Generate
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={resetting}>
              {resetting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Reset
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!generatedCredentials} onOpenChange={(v) => { if (!v) setGeneratedCredentials(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login credentials</DialogTitle>
          </DialogHeader>
          {generatedCredentials && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Share these credentials with the user:</p>
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 font-mono text-sm">
                <p><span className="text-muted-foreground">Email:</span> {generatedCredentials.email}</p>
                <p><span className="text-muted-foreground">Password:</span> {generatedCredentials.password}</p>
              </div>
              <Button onClick={copyCredentials} className="w-full gap-2">
                <Copy className="h-4 w-4" /> Copy credentials
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
