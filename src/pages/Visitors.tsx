import { useState } from "react";
import { useVisitors, useVisits, useUpdateVisitor, ROOM_LABELS } from "@/lib/supabase-store";
import type { Visitor, RoomType } from "@/lib/supabase-store";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { Search, User, ChevronRight, ArrowLeft, Calendar, Phone, MapPin, Briefcase, CreditCard, Pencil, Save, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import MembershipCard from "@/components/MembershipCard";
import { toast } from "sonner";

function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/40 px-4 py-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-medium text-foreground capitalize truncate">{value}</p>
      </div>
    </div>
  );
}

export default function Visitors() {
  const { data: visitors = [], isLoading } = useVisitors();
  const { data: allVisits = [] } = useVisits();
  const updateVisitor = useUpdateVisitor();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Visitor | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const filtered = visitors.filter(
    (v) =>
      v.full_name.toLowerCase().includes(search.toLowerCase()) ||
      v.visitor_id.toLowerCase().includes(search.toLowerCase()) ||
      v.phone.includes(search)
  );

  if (selected) {
    const visits = allVisits
      .filter((v) => v.visitor_id === selected.visitor_id)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const genderLabel = selected.gender === "male" ? "Homme" : selected.gender === "female" ? "Femme" : "Autre";

    const startEdit = () => {
      setEditForm({
        full_name: selected.full_name,
        gender: selected.gender,
        date_of_birth: selected.date_of_birth || "",
        phone: selected.phone,
        email: selected.email || "",
        neighborhood: selected.neighborhood,
        occupation: selected.occupation,
        photo: selected.photo || "",
      });
      setEditing(true);
    };

    const saveEdit = async () => {
      try {
        await updateVisitor.mutateAsync({
          visitor_id: selected.visitor_id,
          updates: {
            full_name: editForm.full_name,
            gender: editForm.gender || "other",
            date_of_birth: editForm.date_of_birth || null,
            phone: editForm.phone || "—",
            email: editForm.email || null,
            neighborhood: editForm.neighborhood || "—",
            occupation: editForm.occupation || "—",
            photo: editForm.photo || null,
          },
        });
        setSelected({
          ...selected,
          full_name: editForm.full_name,
          gender: editForm.gender as Visitor["gender"],
          date_of_birth: editForm.date_of_birth || null,
          phone: editForm.phone || "—",
          email: editForm.email || null,
          neighborhood: editForm.neighborhood || "—",
          occupation: editForm.occupation || "—",
          photo: editForm.photo || null,
        });
        setEditing(false);
        toast.success("Visiteur mis à jour avec succès");
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    };

    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="gap-2 rounded-xl" onClick={() => { setSelected(null); setEditing(false); }}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <div className="ml-auto flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4" /> Annuler
                </Button>
                <Button className="gap-2 rounded-xl" onClick={saveEdit} disabled={updateVisitor.isPending}>
                  <Save className="h-4 w-4" /> {updateVisitor.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="gap-2 rounded-xl" onClick={startEdit}>
                  <Pencil className="h-4 w-4" /> Modifier
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-xl">
                      <CreditCard className="h-4 w-4" /> Carte
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Carte de membre</DialogTitle></DialogHeader>
                    <MembershipCard fullName={selected.full_name} visitorId={selected.visitor_id} />
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
        {editing ? (
          <div className="rounded-2xl border border-border/50 bg-card p-7 shadow-sm space-y-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Modifier les informations</h3>
            <p className="text-xs text-muted-foreground -mt-3 mb-2">L'ID ({selected.visitor_id}) et le QR code ne peuvent pas être modifiés.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-foreground text-xs">Nom complet <span className="text-destructive">*</span></Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Genre</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                  <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Homme</SelectItem>
                    <SelectItem value="female">Femme</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Date de naissance</Label>
                <Input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Téléphone</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Email</Label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Quartier / Commune</Label>
                <Input value={editForm.neighborhood} onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-foreground text-xs">Profession</Label>
                <Input value={editForm.occupation} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} className="rounded-xl h-10" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-foreground text-xs">Lien photo passport</Label>
                <Input value={editForm.photo} onChange={(e) => setEditForm({ ...editForm, photo: e.target.value })} placeholder="https://lh3.googleusercontent.com/d/..." className="rounded-xl h-10" />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-7 shadow-sm">
            <div className="flex items-start gap-4">
              {selected.photo ? (
                <img src={selected.photo} alt={selected.full_name} className="h-16 w-16 rounded-2xl object-cover shrink-0" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl shrink-0" style={{ background: "var(--gradient-primary)" }}>
                  <User className="h-8 w-8 text-primary-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground">{selected.full_name}</h2>
                <p className="font-mono text-sm font-semibold text-primary">{selected.visitor_id}</p>
              </div>
              <div className="rounded-xl border border-border/30 bg-background p-2">
                <QRCodeSVG value={selected.visitor_id} size={64} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <Detail icon={Phone} label="Téléphone" value={selected.phone} />
              <Detail icon={Briefcase} label="Profession" value={selected.occupation} />
              <Detail icon={MapPin} label="Quartier" value={selected.neighborhood} />
              <Detail icon={Calendar} label="Genre" value={genderLabel} />
              <Detail icon={Calendar} label="Date de naissance" value={selected.date_of_birth || "—"} />
              <Detail icon={Calendar} label="Inscrit le" value={selected.registration_date} />
              {selected.photo && (
                <div className="col-span-2 flex items-start gap-3 rounded-xl bg-muted/40 px-4 py-3">
                  <Image className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Photo</p>
                    <a href={selected.photo} target="_blank" rel="noopener" className="text-sm font-medium text-primary truncate block hover:underline">Voir la photo</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border/50 bg-card p-7 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Historique des visites
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {visits.length}
            </span>
          </h3>
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune visite enregistrée.</p>
          ) : (
            <div className="space-y-1.5">
              {visits.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${v.action === "check_in" ? "bg-success" : "bg-muted-foreground"}`} />
                    <span className="text-foreground font-medium">
                      {v.action === "check_in" ? "Entrée" : "Sortie"}{" "}
                      {ROOM_LABELS[v.room as RoomType] || v.room}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.timestamp).toLocaleDateString("fr-FR")} {new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Visiteurs</h1>
          <p className="page-subtitle">{visitors.length} membres inscrits</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-11 rounded-xl h-11"
          placeholder="Rechercher par nom, ID ou téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v)}
              className="flex w-full items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 text-left transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{v.full_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-mono font-semibold text-primary">{v.visitor_id}</span>
                  <span className="mx-1.5 text-border">·</span>
                  {v.occupation}
                  <span className="mx-1.5 text-border">·</span>
                  {v.neighborhood}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun visiteur trouvé.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
